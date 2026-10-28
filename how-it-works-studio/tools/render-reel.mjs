#!/usr/bin/env node
/**
 * render-reel.mjs - render a compiled reel to stills and/or an MP4, in Node.
 *
 * No browser: the stage draws onto a Skia canvas (@napi-rs/canvas) driven by the
 * same drawFrame() the preview uses, and ffmpeg encodes the frames as they are
 * produced. That keeps "the preview" and "the film" from being two different
 * renderers, which is the usual way a pipeline starts lying.
 *
 * Usage:
 *   node tools/render-reel.mjs --reel r03 --stills 0,240,700 --out /tmp/stills
 *   node tools/render-reel.mjs --reel r03 --all --out /tmp/stills
 *   node tools/render-reel.mjs --reel r03 --mp4 series/.../output/r03.mp4
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const { drawFrame } = await import(path.join(ROOT, 'src/stage/reel/render.js'));
const { setSprites, setLayerFactory, VISEME_NAMES } = await import(path.join(ROOT, 'src/stage/reel/nao.js'));

const FPS = 30;
const W = 1080;
const H = 1920;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

// ---------------------------------------------------------------------------
// fonts + sprites
// ---------------------------------------------------------------------------

function registerFonts() {
  const dir = path.join(ROOT, 'preview/fonts');
  const fonts = [
    'inter-latin-400-normal.woff2',
    'inter-latin-500-normal.woff2',
    'inter-latin-600-normal.woff2',
    'inter-latin-700-normal.woff2',
    'source-serif-4-latin-400-normal.woff2',
    'ibm-plex-mono-latin-500-normal.woff2',
  ];
  for (const f of fonts) {
    const file = path.join(dir, f);
    if (fs.existsSync(file)) GlobalFonts.registerFromPath(file);
  }
}

async function registerSprites() {
  const dir = path.join(ROOT, 'assets/nao/heads');
  const map = {};
  for (const name of VISEME_NAMES) {
    const file = path.join(dir, `${name}.png`);
    if (fs.existsSync(file)) map[name] = await loadImage(file);
  }
  setSprites(map);
  return Object.keys(map).length;
}

// ---------------------------------------------------------------------------
// reel lookup
// ---------------------------------------------------------------------------

function findReel(id) {
  const seriesDir = path.join(ROOT, 'series');
  for (const series of fs.readdirSync(seriesDir)) {
    const reels = path.join(seriesDir, series, 'reels');
    if (!fs.existsSync(reels)) continue;
    for (const slug of fs.readdirSync(reels)) {
      if (slug.startsWith(id)) {
        return {
          series,
          slug,
          json: path.join(reels, slug, 'reel.json'),
          dir: path.join(reels, slug),
        };
      }
    }
  }
  throw new Error(`no reel starting with "${id}"`);
}

function ffmpegPath() {
  try {
    return require('@ffmpeg-installer/ffmpeg').path;
  } catch {
    return 'ffmpeg';
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const reelId = (arg('reel', 'r03') || 'r03').toLowerCase();
  const found = findReel(reelId);
  if (!fs.existsSync(found.json)) {
    throw new Error(`not compiled: ${path.relative(ROOT, found.json)} — run node tools/compile-reel.mjs ${reelId}`);
  }
  const reel = JSON.parse(fs.readFileSync(found.json, 'utf8'));

  registerFonts();
  setLayerFactory((w, h) => createCanvas(w, h));
  const spriteCount = await registerSprites();
  if (spriteCount < 12) console.warn(`  ! only ${spriteCount}/12 sprites — run python3 tools/build-nao-sprites.py`);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const stills = arg('stills', null);
  const all = has('all');
  const mp4 = arg('mp4', null);
  const outDir = path.resolve(arg('out', '/tmp/reel-stills'));
  const quality = Number(arg('quality', 88));
  const crf = String(arg('crf', '18'));

  if (!stills && !all && !mp4) {
    console.log('nothing to do: pass --stills a,b,c, --all or --mp4 <path>');
    return;
  }

  const frames = all
    ? Array.from({ length: reel.frames }, (_, i) => i)
    : String(stills || '').split(',').map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n));

  // ---- encoder ------------------------------------------------------------
  let encoder = null;
  if (mp4) {
    const out = path.resolve(mp4);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    encoder = spawn(
      ffmpegPath(),
      [
        '-y', '-hide_banner', '-loglevel', 'error',
        '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf,
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        out,
      ],
      { stdio: ['pipe', 'inherit', 'inherit'] }
    );
    encoder.on('error', (err) => console.error('ffmpeg:', err.message));
  }

  fs.mkdirSync(outDir, { recursive: true });
  const started = Date.now();
  let done = 0;

  for (const frame of frames) {
    drawFrame(ctx, reel, frame);

    if (encoder) {
      const jpg = canvas.toBuffer('image/jpeg', quality);
      if (!encoder.stdin.write(jpg)) {
        await new Promise((r) => encoder.stdin.once('drain', r));
      }
    }
    if (stills) {
      fs.writeFileSync(
        path.join(outDir, `${reel.id}-f${String(frame).padStart(5, '0')}.jpg`),
        canvas.toBuffer('image/jpeg', quality)
      );
    }
    done++;
    if (done % 60 === 0) {
      const rate = done / ((Date.now() - started) / 1000);
      process.stdout.write(`  ${done}/${frames.length}  ${rate.toFixed(1)} fps\n`);
    }
  }

  if (encoder) {
    encoder.stdin.end();
    await new Promise((resolve, reject) => {
      encoder.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
    });
  }

  const secs = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${done} frames in ${secs}s`);
  if (stills) console.log(`stills → ${outDir}`);
  if (mp4) {
    const size = fs.statSync(path.resolve(mp4)).size;
    console.log(`mp4    → ${path.relative(ROOT, path.resolve(mp4))}  ${(size / 1024 / 1024).toFixed(1)} MB`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
