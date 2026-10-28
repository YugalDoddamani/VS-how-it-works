#!/usr/bin/env node
/**
 * export-captions.mjs - write the reel's captions as a sidecar subtitle file.
 *
 * The caption is burned into the picture (docs/04: it is the most important
 * object on screen, and no platform's auto-captions will render it the way the
 * reel was designed). This export exists for the other two jobs:
 *
 *   - the platform's own caption track, for people watching muted on a train
 *   - search, because a reel with a caption file is a reel that can be read
 *
 * One cue per shot, because a shot *is* a line in this format. Emphasis words
 * are upper-cased, which is the closest SRT gets to the accent tint.
 *
 * Usage:
 *   node tools/export-captions.mjs --reel r03            # writes output/<slug>.srt
 *   node tools/export-captions.mjs --reel r03 --stdout   # print instead
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

function findReel(id) {
  for (const series of fs.readdirSync(path.join(ROOT, 'series'))) {
    const reels = path.join(ROOT, 'series', series, 'reels');
    if (!fs.existsSync(reels)) continue;
    for (const slug of fs.readdirSync(reels)) {
      const dir = path.join(reels, slug);
      const file = path.join(dir, 'reel.json');
      if (!fs.existsSync(file)) continue;
      const reel = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (reel.id.toLowerCase() === id.toLowerCase()) return { reel, dir };
    }
  }
  throw new Error(`no compiled reel ${id} — run node tools/compile-reel.mjs ${id}`);
}

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

const reelId = arg('reel', 'r03');
const { reel, dir } = findReel(reelId);

// emphasis words get shouted, because SRT has no colour
const lines = [];
reel.shots.forEach((shot, i) => {
  const hot = new Set((shot.caption?.emphasis || []).map(normal));
  const text = String(shot.vo || '').replace(/\b([A-Za-z][A-Za-z'-]*)\b/g, (word) =>
    hot.has(normal(word)) ? word.toUpperCase() : word
  );
  lines.push(
    `${i + 1}\n${timecode(shot.start, reel.fps)} --> ${timecode(shot.end, reel.fps)}\n${text}\n`
  );
});

const srt = lines.join('\n');

if (has('stdout')) {
  process.stdout.write(srt);
} else {
  const outDir = path.join(dir, 'output');
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, `${reel.slug}.srt`);
  fs.writeFileSync(file, srt);
  console.log(`srt    → ${path.relative(ROOT, file)}  ${reel.shots.length} cues`);
}
