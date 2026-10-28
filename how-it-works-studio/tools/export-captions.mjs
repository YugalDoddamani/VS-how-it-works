#!/usr/bin/env node
/**
 * export-captions.mjs - write the film's captions as a sidecar subtitle file.
 *
 * The caption is burned into the picture (docs/04: it is the most important
 * object on screen, and no platform's auto-captions will render it the way the
 * film was designed). This export exists for the other two jobs:
 *
 *   - the platform's own caption track, for people watching muted on a train
 *   - search, because a film with a caption file is a film that can be read
 *
 * One cue per shot, because a shot *is* a line in this format. Emphasis words are
 * upper-cased, which is the closest SRT gets to the accent tint. Two lines per
 * cue maximum: SRT does not wrap, so an over-long cue is a cue the platform will
 * break wherever it likes.
 *
 * Usage:
 *   node tools/export-captions.mjs --reel 0102          # writes output/<slug>.srt
 *   node tools/export-captions.mjs --reel 0102 --stdout # print instead
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { findCompiled } from './lookup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

function timecode(frames, fps) {
  const total = frames / fps;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

const normal = (w) => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');

/** Break a cue at the word boundary nearest the middle, at most 42 chars a line. */
function twoLines(text, max = 42) {
  if (text.length <= max) return text;
  const words = text.split(' ');
  let best = 0;
  let bestScore = Infinity;
  let line = '';
  for (let i = 0; i < words.length - 1; i++) {
    line = line ? `${line} ${words[i]}` : words[i];
    const rest = words.slice(i + 1).join(' ');
    if (line.length > max || rest.length > max) continue;
    const score = Math.abs(line.length - rest.length);
    if (score < bestScore) {
      bestScore = score;
      best = i;
    }
  }
  if (!best) return text;
  return `${words.slice(0, best + 1).join(' ')}\n${words.slice(best + 1).join(' ')}`;
}

const reelId = arg('reel', '0102');
const { reel, dir } = findCompiled(ROOT, reelId);

// emphasis words get shouted, because SRT has no colour
const lines = [];
const out = [];
// a beat's line is held across its shots, so consecutive identical captions are
// one cue, not three
let open = null;
for (const shot of reel.shots) {
  const text = String(shot.caption?.text || shot.vo || '');
  if (open && open.text === text) {
    open.end = shot.end;
    continue;
  }
  if (open) lines.push(open);
  open = { start: shot.start, end: shot.end, text, emphasis: shot.caption?.emphasis || [] };
}
if (open) lines.push(open);

lines.forEach((cue, i) => {
  const hot = new Set((cue.emphasis || []).map(normal));
  const text = cue.text.replace(/\b([A-Za-z][A-Za-z'-]*)\b/g, (word) =>
    hot.has(normal(word)) ? word.toUpperCase() : word
  );
  out.push(`${i + 1}\n${timecode(cue.start, reel.fps)} --> ${timecode(cue.end, reel.fps)}\n${twoLines(text)}\n`);
});

const srt = out.join('\n');

if (has('stdout')) {
  process.stdout.write(srt);
} else {
  const outDir = path.join(dir, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${reel.slug}.srt`);
  fs.writeFileSync(file, srt);
  console.log(`srt    → ${path.relative(ROOT, file)}  ${lines.length} cues`);
}
