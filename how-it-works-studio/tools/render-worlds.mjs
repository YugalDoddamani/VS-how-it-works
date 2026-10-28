#!/usr/bin/env node
/**
 * render-worlds.mjs - draw one background painter, alone, at chosen moments.
 *
 * A painter is the part of the frame that carries the explanation, and it is the
 * part that goes wrong quietly: a card that is still empty when the shot starts,
 * text that sits under her head, an object that never lands. Judging that from a
 * finished reel means hunting a frame; judging it here means looking at the
 * painter itself.
 *
 * It builds a one-shot reel around the painter and runs the real drawFrame(), so
 * what it shows is what the film will show - caption card and all.
 *
 * Usage:
 *   node tools/render-worlds.mjs ep_loop ep_gate --out /tmp/worlds
 *   node tools/render-worlds.mjs ep_gate --variant gate_fail --t 0.3,0.9
 *   node tools/render-worlds.mjs --list
 *
 * Options:
 *   --t 0,0.25,0.6      fractions of the shot to draw (default 0.05,0.5,0.95)
 *   --placement center  where she stands; default 'off' (world only)
 *   --variant X         pass a variant through to the painter
 *   --focus X           pass focus (ep_loop highlights one station)
 *   --text "..."        the shot's heading text
 *   --items "a;b;c"     the shot's board items
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { setupStage, W, H, FPS } from './lib-canvas.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const { drawFrame } = await import(path.join(ROOT, 'src/stage/reel/render.js'));
const { EPISODE_PAINTERS } = await import(path.join(ROOT, 'src/stage/reel/worlds-episode.js'));

const known = Object.keys(EPISODE_PAINTERS);
const wanted = process.argv
  .slice(2)
  .filter((a, i, all) => !a.startsWith('--') && !String(all[i - 1] || '').startsWith('--'));

if (has('list') || !wanted.length) {
  console.log(known.join('\n'));
  process.exit(has('list') ? 0 : 1);
}

const outDir = path.resolve(arg('out', '/tmp/worlds'));
const ts = String(arg('t', '0.05,0.5,0.95')).split(',').map(Number).filter((n) => !Number.isNaN(n));
const frames = 90;

const { createCanvas } = await setupStage(ROOT);
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
fs.mkdirSync(outDir, { recursive: true });

for (const world of wanted) {
  if (!known.includes(world)) throw new Error(`unknown painter "${world}" — try --list`);
  const reel = {
    id: 'W',
    seconds: frames / FPS,
    frames,
    fps: FPS,
    shots: [
      {
        n: 2,
        start: 0,
        frames,
        end: frames,
        code: 'INSERT',
        lens: '100mm',
        placement: arg('placement', 'off'),
        world,
        pose: arg('pose', null),
        text: arg('text', ''),
        items: String(arg('items', '')).split(';').map((s) => s.trim()).filter(Boolean),
        variant: arg('variant', undefined),
        focus: arg('focus', undefined),
        footnote: arg('footnote', undefined),
        transition: 'cut',
        vo: arg('vo', ''),
        caption: { text: arg('vo', ''), emphasis: [] },
        mouth: null,
      },
    ],
  };

  for (const t of ts) {
    const frame = Math.min(frames - 1, Math.round(t * frames));
    drawFrame(ctx, reel, frame);
    const file = path.join(outDir, `${world}${reel.shots[0].variant ? `-${reel.shots[0].variant}` : ''}-t${String(t).replace('.', '')}.jpg`);
    fs.writeFileSync(file, canvas.toBuffer('image/jpeg', 88));
    console.log(`  ${path.relative(process.cwd(), file)}`);
  }
}
