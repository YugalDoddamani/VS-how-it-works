#!/usr/bin/env node
/**
 * contact-sheet.mjs - render a film's key frames into one still image.
 *
 * A film is judged in a second and a half, and nobody watches 78 seconds to
 * check whether a cut lands. Twelve evenly spaced frames, tiled, are enough to
 * see the rhythm, the character, the caption lengths and whether any shot is
 * empty - which is exactly what goes wrong.
 *
 * Usage:
 *   node tools/contact-sheet.mjs --reel 0102                       # default 12 frames
 *   node tools/contact-sheet.mjs --reel 0102 --count 16 --out x.jpg
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { setupStage, W, H } from './lib-canvas.mjs';
import { findCompiled } from './lookup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}

const { drawFrame } = await import(path.join(ROOT, 'src/stage/reel/render.js'));

const reelId = arg('reel', '0102');
const count = Math.max(1, Number(arg('count', 12)));
const cols = Math.max(1, Number(arg('cols', 4)));
const cellW = Math.round(Number(arg('cell', 270)));
const cellH = Math.round((cellW * H) / W);

const { reel, dir } = findCompiled(ROOT, reelId);
const outFile = path.resolve(arg('out', path.join(dir, 'output', 'key-frames.jpg')));
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const { createCanvas } = await setupStage(ROOT);
const frameCanvas = createCanvas(W, H);
const ctx = frameCanvas.getContext('2d');

const rows = Math.ceil(count / cols);
const sheet = createCanvas(cellW * cols, cellH * rows + 34 * rows);
const sctx = sheet.getContext('2d');
sctx.fillStyle = '#FBF7F0';
sctx.fillRect(0, 0, sheet.width, sheet.height);

for (let i = 0; i < count; i++) {
  const frame = Math.round(((i + 0.5) / count) * (reel.frames - 1));
  const shot = drawFrame(ctx, reel, frame);
  const x = (i % cols) * cellW;
  const y = Math.floor(i / cols) * (cellH + 34);
  sctx.drawImage(frameCanvas, x, y, cellW, cellH);

  const t = (frame / reel.fps).toFixed(1);
  sctx.save();
  sctx.beginPath();
  sctx.rect(x, y, cellW, cellH + 34);
  sctx.clip();
  sctx.fillStyle = '#241F2B';
  sctx.font = '600 16px "Inter", sans-serif';
  sctx.textAlign = 'left';
  sctx.fillText(`${t}s · shot ${shot.n} · ${shot.code}`, x + 6, y + cellH + 23);
  sctx.restore();
}

fs.writeFileSync(outFile, sheet.toBuffer('image/jpeg', 88));
console.log(`sheet  → ${path.relative(ROOT, outFile)}  ${count} frames`);
