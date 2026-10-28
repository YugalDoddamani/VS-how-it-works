#!/usr/bin/env node
/**
 * compile-episode.mjs - turn an episode's beats into `episode.json`.
 *
 * Reels are authored as a shot table in markdown, one row per shot. Episodes are
 * authored one level up, in the content sheet: a row per *beat*, with the beat
 * type, the narration, the camera note, the expression and the transition. A
 * beat is 3-10 seconds, which is far too long for a cut-driven channel, so this
 * compiler does the editorial work the sheet deliberately leaves out:
 *
 *   beat  ->  1-4 shots   (split by beat type, with the frames divided exactly)
 *   line  ->  1-4 captions (split at punctuation, never mid-phrase)
 *   expression -> pose   (the sheet's vocabulary onto the twelve drawings)
 *
 * Its output has the same shape as a compiled reel, so the stage, the renderer,
 * the mixer and the caption exporter do not know the difference.
 *
 * Usage:
 *   node tools/compile-episode.mjs            # every episode
 *   node tools/compile-episode.mjs 0102       # one, by id prefix
 *   node tools/compile-episode.mjs --check    # compile, write nothing
 *
 * Input:  content/csv/episodes.csv, content/csv/beats.csv
 * Output: series/<series>/episodes/<slug>/episode.json  (git-ignored)
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LipSync = require(path.join(ROOT, 'src/stage/rig/lipsync.js'));

const FPS = 30;
const CSV = path.join(ROOT, 'content/csv');

// ---------------------------------------------------------------------------
// the editorial rules
// ---------------------------------------------------------------------------

/**
 * How a beat type becomes shots. `codes` are the shot grammar from docs/12;
 * `her` says whether she is in the frame; the rest is the world the shot sits in
 * until the beat says otherwise.
 *
 * Long beats get more shots - that is the whole job here. A 10 s step-by-step
 * beat cut as one shot is four seconds of a still image.
 */
const BEAT_PLAN = {
  hook: {
    // the first frame is the one that has to hold a thumb still: she is a little
    // tighter here than anywhere else, and the graphic is already finished
    codes: ['CU', 'INSERT'],
    placements: ['corner-br', 'off'],
  },
  title: {
    codes: ['TITLE'],
    placements: ['absent'],
  },
  explain: {
    codes: ['MCU', 'INSERT', 'INSERT'],
    placements: ['corner-bl', 'off', 'off'],
  },
  analogy: {
    codes: ['MCU', 'INSERT', 'INSERT', 'INSERT'],
    placements: ['corner-br', 'off', 'off', 'off'],
  },
  'step-by-step': {
    codes: ['INSERT', 'INSERT', 'MCU', 'INSERT'],
    placements: ['off', 'off', 'corner-bl', 'off'],
  },
  'myth-check': {
    codes: ['MCU', 'INSERT', 'INSERT'],
    placements: ['corner-br', 'off', 'off'],
  },
  recap: {
    codes: ['INSERT', 'MCU'],
    placements: ['off', 'corner-bl'],
  },
  outro: {
    codes: ['CU'],
    placements: ['corner-bl'],
  },
};

/**
 * Which workshop world a beat is drawn in.
 *
 * The sheet says what the beat is *about* in prose, and prose is not an id. This
 * table is the one editorial judgement the compiler cannot make on its own, so
 * it is written down, per episode, keyed by beat number.
 */
const EPISODE_WORLDS = {
  '0102': {
    1: 'ep_checklist',
    2: 'ep_title',
    3: 'ep_steps',
    4: 'ep_rules',
    5: 'ep_rules_broken',
    6: 'ep_pile',
    7: 'ep_loop',
    8: 'ep_loop',
    9: 'ep_gate',
    10: 'ep_gate',
    11: 'ep_loop',
    12: 'ep_outro',
  },
};

/** The sheet's expression vocabulary, onto the twelve drawings. */
const POSE_BY_EXPRESSION = {
  surprised: 'openhands',
  confident: 'presenting',
  neutral: 'neutral',
  focused: 'pointing',
  confused: 'thinking',
  thinking: 'thinking',
  emphatic: 'onefinger',
  skeptical: 'skeptical',
  angry: 'nope',
  relieved: 'warm',
  wink: 'fingerheart',
  happy: 'warm',
};

/** Beat type -> pose, for the shots where the sheet has no expression. */
const POSE_BY_BEAT = {
  hook: 'skeptical',
  title: 'presenting',
  explain: 'explaining',
  analogy: 'thinking',
  'step-by-step': 'onefinger',
  'myth-check': 'deadpan',
  recap: 'openhands',
  outro: 'fingerheart',
};

/** Only one transition per reel is allowed to be anything but a cut; episodes
 *  are calmer, so a wipe is allowed to repeat, and it renders as the whip. */
const TRANSITIONS = { wipe: 'whip', fade: 'cut', none: 'cut', cut: 'cut' };

/** The sheet's sfx names onto the cue set in assets/sfx. */
const SFX = { 'pop-soft': 'pop', whoosh: 'whoosh' };

const EMPHASIS_WORDS = new Set([
  'not', 'never', 'one', 'two', 'three', 'four', 'loop', 'check', 'goal',
  'tools', 'rules', 'model', 'automation', 'vibes', 'genius', 'robot', 'same',
]);

// ---------------------------------------------------------------------------
// csv
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.length === header.length && r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i].trim()])));
}

const readCsv = (name) => parseCsv(fs.readFileSync(path.join(CSV, name), 'utf8'));

// ---------------------------------------------------------------------------
// text -> captions
// ---------------------------------------------------------------------------

/**
 * Split a line into `n` caption chunks at natural boundaries.
 *
 * Preference order: sentence ends, then commas/semicolons, then "and/but/so",
 * and only then a plain word boundary. A caption that breaks mid-phrase reads
 * as a typo, so the splitter spends effort to avoid it.
 */
function splitCaption(text, n) {
  const line = String(text || '').trim();
  if (n <= 1 || !line) return [line];

  const sentences = line.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) || [line];
  const out = [...sentences];

  // more pieces than shots: merge the two shortest neighbours until it fits
  while (out.length > n) {
    let best = 0;
    for (let i = 0; i < out.length - 1; i++) {
      if (out[i].length + out[i + 1].length < out[best].length + out[best + 1].length) best = i;
    }
    out.splice(best, 2, `${out[best]} ${out[best + 1]}`);
  }

  // fewer pieces than shots: split the longest at the boundary nearest its middle,
  // preferring a comma, then a conjunction, and only then plain whitespace
  while (out.length < n) {
    let idx = 0;
    for (let i = 0; i < out.length; i++) if (out[i].length > out[idx].length) idx = i;
    const piece = out[idx];
    const mid = piece.length / 2;
    const marks = [
      ...[...piece.matchAll(/[,;:]\s/g)].map((m) => m.index + 1),
      ...[...piece.matchAll(/\s(and|but|so|then|because)\s/gi)].map((m) => m.index),
    ].filter((i) => i > 8 && i < piece.length - 8);

    let cutAt;
    if (marks.length) {
      cutAt = marks.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
    } else {
      const space = piece.indexOf(' ', Math.floor(mid));
      cutAt = space > 0 ? space : -1;
    }
    if (cutAt <= 0) break;

    const head = piece.slice(0, cutAt).trim().replace(/[,;:]$/, '');
    const tail = piece.slice(cutAt).trim().replace(/^(and|but|so|then|because)\s+/i, '');
    if (!head || !tail) break;
    out.splice(idx, 1, head, tail);
  }

  return out;
}

function emphasisFor(text) {
  const hits = [];
  for (const raw of String(text).split(/\s+/)) {
    const word = raw.toLowerCase().replace(/[^a-z0-9'-]/g, '');
    if (EMPHASIS_WORDS.has(word) && !hits.includes(word)) hits.push(word);
    if (hits.length === 2) break;
  }
  return hits;
}

// ---------------------------------------------------------------------------
// compile
// ---------------------------------------------------------------------------

function framesFor(beat, n) {
  const total = Math.round(Number(beat.duration_s) * FPS);
  const base = Math.floor(total / n);
  const out = new Array(n).fill(base);
  for (let i = 0; i < total - base * n; i++) out[i] += 1;   // front-load the remainder
  return out;
}

function shotsForBeat(beat, reel) {
  const type = beat.beat_type;
  const plan = BEAT_PLAN[type] || BEAT_PLAN.explain;
  const n = plan.codes.length;
  const frames = framesFor(beat, n);
  const world = (EPISODE_WORLDS[reel.id] || {})[beat.beat_no] || 'ep_title';
  // one line per *beat*, not per shot.
  //
  // Splitting the narration across the cuts of a beat looks like an edit and
  // reads like a typo: "Automation just means" ... "steps a machine". The line
  // is a sentence; it stays whole and holds for the beat, which is also what the
  // reading check in script.md measures.
  const captions = new Array(n).fill(String(beat.narration || '').trim());
  const items = String(beat.board_items || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  const pose = POSE_BY_EXPRESSION[beat.expression] || POSE_BY_BEAT[type] || 'explaining';

  return plan.codes.map((code, i) => ({
    beat: Number(beat.beat_no),
    beatType: type,
    code,
    lens: code === 'CU' ? '85mm' : code === 'INSERT' ? '100mm' : '50mm',
    // for the step-by-step beat each shot is one station of the loop, and the
    // painter puts the parcel on that station
    focus: type === 'step-by-step'
      ? ['goal', 'tools', 'check', 'again'][i] || undefined
      : beat.beat_no === '8'
        ? 'tools'
        : undefined,
    framing: beat.camera || beat.beat_type,
    placement: plan.placements[i],
    world,
    // only the shots where she is on screen carry her
    pose: plan.placements[i] === 'off' || plan.placements[i] === 'absent'
      ? null
      : (i === plan.placements.length - 1 ? pose : pose),
    transition: i === 0 ? (TRANSITIONS[beat.transition] || 'cut') : 'cut',
    sfx: i === 0 ? (SFX[beat.sfx] || null) : null,
    frames: frames[i],
    caption: captions[i] || beat.on_screen_text || '',
    vo: captions[i] || '',
    text: beat.on_screen_text || '',
    items,
    emphasis: String(beat.emphasis || '')
      .split(';')
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean),
    expression: beat.expression || '',
    gesture: beat.gesture || '',
  }));
}

const cleanId = (v) => String(v).replace(/^'+/, '').trim();

function compileEpisode(rawEpisode, allBeats) {
  const episode = { ...rawEpisode, episode_id: cleanId(rawEpisode.episode_id) };
  const beats = allBeats
    .filter((b) => cleanId(b.episode_id) === episode.episode_id)
    .sort((a, b) => Number(a.beat_no) - Number(b.beat_no));
  if (!beats.length) throw new Error(`${episode.episode_id}: no beats`);

  const series = episode.series;
  const seriesSlug = slugify(series);
  const dir = path.join(ROOT, 'series', seriesSlug, 'episodes', episode.slug);
  const scriptFile = path.join(dir, 'script.md');
  if (!fs.existsSync(scriptFile)) throw new Error(`${episode.episode_id}: no script.md at ${dir}`);

  const seconds = Number(episode.target_seconds);
  const frames = Math.round(seconds * FPS);
  const reel = { id: episode.episode_id, slug: episode.slug };

  const shots = [];
  let cursor = 0;
  let n = 0;
  for (const beat of beats) {
    for (const shot of shotsForBeat(beat, reel)) {
      n += 1;
      const start = cursor;
      cursor += shot.frames;
      const emphasis = [
        ...shot.emphasis.filter((w) => shot.caption.toLowerCase().includes(w)),
        ...emphasisFor(shot.caption),
      ].filter((w, i, all) => all.indexOf(w) === i).slice(0, 2);
      const mouth = shot.placement === 'off' || shot.placement === 'absent'
        ? null
        : {
          offset: 2,
          schedule: LipSync.buildSchedule(shot.vo, Math.max(2, shot.frames - 8), {
            mode: shot.code === 'CU' || shot.code === 'MCU' ? 'talking-head' : 'mid',
            fps: FPS,
            emphasis: [
              ...shot.emphasis.filter((w) => new RegExp(`\\b${w}`, 'i').test(shot.vo)),
              ...emphasisFor(shot.vo),
            ].filter((w, i, all) => all.indexOf(w) === i).slice(0, 2),
          }).frames,
        };
      // A mouth schedule from the line the shot is speaking. There is no mouth
      // to draw - the rig moves her whole body - so this is really a rhythm
      // track: it is what makes the nods land on the stressed words.
      const voice = {
        offset: 3,
        schedule: LipSync.buildSchedule(shot.caption, Math.max(2, shot.frames - 8), {
          mode: 'mid',
          fps: FPS,
          emphasis: emphasis,
        }).frames,
      };

      shots.push({
        n,
        beat: shot.beat,
        beatType: shot.beatType,
        transition: shot.transition,
        start,
        frames: shot.frames,
        end: start + shot.frames,
        code: shot.code,
        lens: shot.lens,
        framing: shot.framing,
        placement: shot.placement,
        pose: shot.pose,
        world: shot.world,
        text: shot.text,
        items: shot.items,
        variant: shot.world === 'ep_gate' && shot.beat === 10 ? 'gate_fail' : undefined,
        focus: shot.focus,
        footnote: shot.world === 'ep_loop' && shot.beat === 8 ? 'the model is one part of it' : undefined,
        vo: shot.vo,
        mouth: voice,
        caption: {
          text: shot.caption,
          emphasis: [
            ...shot.emphasis.filter((w) => shot.caption.toLowerCase().includes(w)),
            ...emphasisFor(shot.caption),
          ].filter((w, i, all) => all.indexOf(w) === i).slice(0, 2),
          in: 0,
          out: shot.frames,
        },
        mouth,
        mood: 'neutral',
      });
    }
  }

  if (cursor !== frames) {
    throw new Error(
      `${episode.episode_id}: beats total ${cursor} frames, header says ${frames} (${seconds}s)`
    );
  }

  const last = shots[shots.length - 1];
  last.mood = 'smile';

  return {
    id: episode.episode_id,
    kind: 'episode',
    slug: episode.slug,
    title: episode.title,
    question: episode.question,
    series,
    seriesSlug,
    level: episode.level,
    seconds,
    frames,
    fps: FPS,
    shotCount: shots.length,
    beatCount: beats.length,
    averageShot: Number((seconds / shots.length).toFixed(2)),
    walkaway: episode.answer_oneliner,
    shots,
    source: {
      script: path.relative(ROOT, scriptFile),
      csv: 'content/csv/beats.csv',
    },
    compiledBy: 'tools/compile-episode.mjs',
  };
}

function slugify(text) {
  return String(text).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const wanted = args.find((a) => !a.startsWith('--'));

  const episodes = readCsv('episodes.csv').map((e) => ({ ...e, episode_id: cleanId(e.episode_id) }));
  const beats = readCsv('beats.csv').map((b) => ({ ...b, episode_id: cleanId(b.episode_id) }));
  let compiled = 0;

  for (const episode of episodes) {
    if (wanted && !episode.episode_id.startsWith(wanted) && !episode.slug.includes(wanted)) continue;
    const reel = compileEpisode(episode, beats);
    const dir = path.join(ROOT, 'series', reel.seriesSlug, 'episodes', reel.slug);
    if (!check) fs.writeFileSync(path.join(dir, 'episode.json'), `${JSON.stringify(reel, null, 2)}\n`);
    console.log(
      `  ${check ? 'ok ' : '→  '} ${reel.id}  ${reel.seconds.toFixed(1)}s  ${reel.frames} frames  ` +
      `${reel.beatCount} beats · ${reel.shotCount} shots  ${reel.series}`
    );
    compiled += 1;
  }

  if (!compiled) throw new Error(`no episode matched ${wanted || '(all)'}`);
  console.log(`\n${compiled} episode(s) ${check ? 'validated' : 'compiled'}.`);
}

main();
