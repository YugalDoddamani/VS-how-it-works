#!/usr/bin/env node
/**
 * compile-reel.mjs - turn a reel `script.md` into `reel.json`.
 *
 * The script is the authored source: a 9-column shot table plus prose. This
 * compiler is the only thing that reads it, and it produces the one artefact the
 * renderer is allowed to see. Same idea as the episode compiler: the stage knows
 * nothing about markdown, and a typo fails here, before a single frame is drawn.
 *
 * Usage:
 *   node tools/compile-reel.mjs                        # every reel
 *   node tools/compile-reel.mjs r03                    # one reel, by id prefix
 *   node tools/compile-reel.mjs --check                # compile, write nothing
 *
 * Output: series/<series>/reels/<slug>/reel.json (git-ignored; regenerate it)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LipSync = require(path.join(ROOT, 'src/stage/rig/lipsync.js'));

const FPS = 30;
const SHOT_CODES = new Set([
  'ISO-WIDE', 'TOP-DOWN', 'MCU', 'CU', 'ECU', 'INSERT',
  'CORNER', 'SPLIT', 'OTS', 'POV', 'RECAP',
]);

/**
 * Background text -> world painter id. Ordered: the first rule whose needle
 * appears in the shot's Background cell wins. This keeps the script readable
 * ("Iso shelf, one tagged box") while the renderer gets a stable id.
 */
const WORLD_RULES = [
  ['bright bedroom', 'pov_phone'],
  ['feed scroll', 'feed_ad'],
  ['shelf macro', 'note_open'],
  ['two sites, one box', 'shelf_two'],
  ['iso shelf', 'shelf_one'],
  ['box stamp', 'stamp'],
  ['two sites, one line', 'link'],
  ['note macro', 'note_number'],
  ['incognito', 'incognito'],
  ['spec card', 'spec_card'],
  ['brave blocks', 'browsers'],
  ['icon macro', 'app_icon'],
  ['settings iso', 'settings'],
  ['settings macro', 'toggle'],
  ['iso world, flat', 'flat_grid'],
  ['dimmed', 'recap'],
  ['bright room', 'bokeh'],
  ['cold street', 'bokeh'],
  ['warehouse', 'bokeh'],
  ['office', 'bokeh'],
  ['living room', 'bokeh'],
];

/** Words that earn the accent colour in a caption. */
const EMPHASIS_WORDS = new Set([
  'not', 'never', 'one', 'two', 'three', 'number', 'name', 'cookie', 'note',
  'switch', 'tracker', 'third-party', 'incognito', 'every', 'same', 'free',
]);

function worldFor(bg) {
  const hay = String(bg).toLowerCase();
  for (const [needle, world] of WORLD_RULES) if (hay.includes(needle)) return world;
  return 'bokeh';
}

function placementFor(nao) {
  const v = String(nao).trim();
  if (/corner-bl/i.test(v)) return 'corner-bl';
  if (/corner-br/i.test(v)) return 'corner-br';
  if (/right-38/i.test(v)) return 'split-right';
  if (/left-third/i.test(v)) return 'left';
  if (/^center/i.test(v)) return 'center';
  if (/absent/i.test(v)) return 'absent';
  if (/hand/i.test(v)) return 'hands';
  return 'off';
}

/** Split a shot cell: `**CODE** · lens — framing`. */
function parseShotCell(cell) {
  const m = cell.match(/^\*\*(.+?)\*\*\s*·\s*(.+?)\s*—\s*(.*)$/);
  if (!m) return null;
  return { code: m[1].trim(), lens: m[2].trim(), framing: m[3].trim() };
}

function emphasisFor(text) {
  const hits = [];
  for (const raw of text.split(/\s+/)) {
    const word = raw.toLowerCase().replace(/[^a-z0-9'-]/g, '');
    if (EMPHASIS_WORDS.has(word) && !hits.includes(word)) hits.push(word);
    if (hits.length === 2) break;
  }
  return hits;
}

function parseScript(text, file) {
  const lines = text.split(/\r?\n/);

  const meta = {};
  for (const line of lines) {
    const m = line.match(/^\|\s*([A-Za-z ]+?)\s*\|\s*(.+?)\s*\|\s*$/);
    if (!m) continue;
    const key = m[1].trim();
    if (['Series', 'Length', 'Shots', 'Outfit', 'Cut rate', 'Transitions', 'Status'].includes(key)) {
      meta[key] = m[2];
    }
  }

  const title = (lines[0] || '').replace(/^#\s*/, '').replace(/^R\d+\s*—\s*/, '').trim();
  const question = (lines.find((l) => l.startsWith('> ')) || '').replace(/^>\s*/, '').trim();

  const lengthMatch = (meta.Length || '').match(/\*\*([\d.]+) s\*\* · (\d+) frames/);
  if (!lengthMatch) throw new Error(`${file}: cannot read the Length row`);
  const seconds = Number(lengthMatch[1]);
  const totalFrames = Number(lengthMatch[2]);
  if (Math.abs(totalFrames / FPS - seconds) > 0.05) {
    throw new Error(`${file}: ${seconds}s does not match ${totalFrames} frames at ${FPS} fps`);
  }

  const outfitMatch = (meta.Outfit || '').match(/`([a-z-]+)`/);

  // "whip into 4 ..." -> { 4: 'whip' }. Only one transition per reel is allowed
  // to be anything other than a hard cut, and the docs say so.
  const transitions = {};
  const tr = (meta.Transitions || '').match(/(whip|match cut|snap zoom|dip)\s+into\s+(\d+)/i);
  if (tr) transitions[Number(tr[2])] = tr[1].toLowerCase().replace(' ', '-');

  // --- shot table -----------------------------------------------------------
  const headerAt = lines.findIndex((l) => l.startsWith('| # | In | Out |'));
  if (headerAt < 0) throw new Error(`${file}: no shot table`);
  const shots = [];
  let cursor = 0;
  for (let i = headerAt + 2; i < lines.length && lines[i].startsWith('|'); i++) {
    const cells = lines[i].replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.length !== 9 || !/^\d+$/.test(cells[0])) continue;
    const [n, tin, tout, durCell, shotCell, nao, bg, graphic, vo] = cells;
    const shot = parseShotCell(shotCell);
    if (!shot) throw new Error(`${file}: shot ${n} has no '**CODE** · lens — framing' cell`);
    if (!SHOT_CODES.has(shot.code)) throw new Error(`${file}: shot ${n}: unknown code ${shot.code}`);

    const frames = Math.round(parseFloat(durCell) * FPS);
    const start = cursor;
    cursor += frames;

    const code = shot.code;
    // A mouth that is only ever a third of a frame is worse than no mouth.
    const mouthMode = code === 'CU' || code === 'MCU' || code === 'ECU' ? 'talking-head' : 'mid';
    const speakFrames = Math.max(2, frames - 8);
    const schedule = LipSync.buildSchedule(vo, speakFrames, {
      mode: mouthMode,
      fps: FPS,
      emphasis: emphasisFor(vo),
    });

    shots.push({
      n: Number(n),
      transition: transitions[Number(n)] || 'cut',
      start,
      frames,
      end: start + frames,
      code,
      lens: shot.lens,
      framing: shot.framing,
      placement: placementFor(nao),
      world: worldFor(bg),
      bg,
      graphic,
      vo,
      caption: {
        text: vo,
        emphasis: emphasisFor(vo),
        in: 0,
        out: frames,
      },
      mouth: {
        // Voice starts 2 frames in and finishes 6 frames early, per docs/12.
        offset: 2,
        schedule: schedule.frames,
      },
    });
  }

  if (!shots.length) throw new Error(`${file}: shot table is empty`);
  if (!meta.Transitions) throw new Error(`${file}: no Transitions row (add 'hard cuts only' if there are none)`);
  if (cursor !== totalFrames) {
    throw new Error(`${file}: shots total ${cursor} frames, header says ${totalFrames}`);
  }

  // The sign-off is the only shot that is allowed a smile by default: it is the
  // frame the viewer leaves on, and a flat stare there reads as cold.
  shots.forEach((shot, i) => {
    shot.mood = i === shots.length - 1 ? 'smile' : 'neutral';
  });

  return {
    title,
    question,
    series: (meta.Series || '').replace(/\*\*/g, '').trim(),
    seconds,
    frames: totalFrames,
    fps: FPS,
    shotCount: shots.length,
    outfit: outfitMatch ? outfitMatch[1] : '',
    averageShot: +(totalFrames / FPS / shots.length).toFixed(2),
    shots,
  };
}

function seriesSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function findReels(only) {
  const seriesDir = path.join(ROOT, 'series');
  const out = [];
  for (const series of fs.readdirSync(seriesDir)) {
    const reels = path.join(seriesDir, series, 'reels');
    if (!fs.existsSync(reels)) continue;
    for (const slug of fs.readdirSync(reels)) {
      const script = path.join(reels, slug, 'script.md');
      if (!fs.existsSync(script)) continue;
      if (only && !slug.startsWith(only)) continue;
      out.push({ series, slug, script });
    }
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

function main() {
  const args = process.argv.slice(2);
  const check = args.includes('--check');
  const only = args.find((a) => !a.startsWith('--'));

  const reels = findReels(only);
  if (!reels.length) {
    console.error(`no reels matched ${only || '(all)'}`);
    return 1;
  }

  let failed = 0;
  for (const { series, slug, script } of reels) {
    const raw = fs.readFileSync(script, 'utf8');
    let reel;
    try {
      reel = parseScript(raw, path.relative(ROOT, script));
    } catch (err) {
      console.error(`  ✗ ${slug}: ${err.message}`);
      failed++;
      continue;
    }

    const model = {
      id: slug.slice(0, 3).toUpperCase(),
      slug,
      seriesSlug: series,
      ...reel,
      source: {
        script: path.relative(ROOT, script),
        sha256: crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16),
      },
      compiledBy: 'tools/compile-reel.mjs',
    };

    if (!check) {
      fs.writeFileSync(path.join(path.dirname(script), 'reel.json'), `${JSON.stringify(model, null, 2)}\n`);
    }
    console.log(
      `  ${check ? 'ok' : '→'}  ${model.id}  ${reel.seconds.toFixed(1)}s  ` +
      `${reel.frames} frames  ${reel.shotCount} shots  ${model.series}`
    );
  }

  if (failed) {
    console.error(`\n${failed} reel(s) failed to compile.`);
    return 1;
  }
  console.log(`\n${reels.length} reel(s) ${check ? 'validated' : 'compiled'}.`);
  return 0;
}

process.exit(main());
