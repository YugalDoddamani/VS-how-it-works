#!/usr/bin/env node
/**
 * shoot-frames.mjs - screenshot frames of a compiled reel with a headless browser.
 *
 * Two jobs:
 *   1. Stills for review ("show me shot 12").
 *   2. The frame source for an MP4 (see render-reel.mjs), which is just this
 *      loop with an encoder bolted on the end.
 *
 * The page it loads (preview/frame.html) runs the same renderer as the player, so
 * a still is never a mock-up of the video: it *is* the video.
 *
 * Usage:
 *   node tools/shoot-frames.mjs --reel r03 --frames 0,240,700 --out /tmp/stills
 *   node tools/shoot-frames.mjs --reel r03 --all --out /tmp/all   (every frame)
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

const reelId = (arg('reel', 'r03') || 'r03').toLowerCase();
const outDir = path.resolve(arg('out', '/tmp/stills'));
const port = Number(arg('port', process.env.PORT || 4173));
const url = arg('url', `http://127.0.0.1:${port}`);
const quality = Number(arg('quality', 82));

function findReel(id) {
  const seriesDir = path.join(ROOT, 'series');
  for (const series of fs.readdirSync(seriesDir)) {
    const reels = path.join(seriesDir, series, 'reels');
    if (!fs.existsSync(reels)) continue;
    for (const slug of fs.readdirSync(reels)) {
      if (slug.startsWith(id)) {
        const json = path.join(reels, slug, 'reel.json');
        return { series, slug, json };
      }
    }
  }
  throw new Error(`no reel starting with "${id}"`);
}

async function main() {
  const { slug, json } = findReel(reelId);
  if (!fs.existsSync(json)) throw new Error(`not compiled: ${path.relative(ROOT, json)}`);
  const reel = JSON.parse(fs.readFileSync(json, 'utf8'));

  const frames = has('all')
    ? Array.from({ length: reel.frames }, (_, i) => i)
    : String(arg('frames', '0')).split(',').map((n) => Number(n.trim())).filter((n) => !Number.isNaN(n));

  fs.mkdirSync(outDir, { recursive: true });

  const chromium = require('@sparticuz/chromium');
  const { chromium: playwright } = require('playwright-core');
  const executablePath = await chromium.default.executablePath();
  const browser = await playwright.launch({
    executablePath,
    args: [...chromium.default.args, '--font-render-hinting=none'],
    headless: true,
  });

  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const reelPath = `/series/${reel.seriesSlug}/reels/${slug}/`;
  const base = `${url}/preview/frame.html?reel=${encodeURIComponent(reelPath)}`;

  const started = Date.now();
  let written = 0;

  for (const frame of frames) {
    await page.goto(`${base}&frame=${frame}`, { waitUntil: 'load' });
    await page.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 20000 });
    const status = await page.evaluate(() => window.__frame);
    if (!status || !status.ok) throw new Error(`frame ${frame}: ${status && status.error}`);

    const dataUrl = await page.evaluate((q) => {
      const canvas = document.getElementById('c');
      return canvas.toDataURL('image/jpeg', q / 100);
    }, quality);
    const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
    fs.writeFileSync(path.join(outDir, `f${String(frame).padStart(5, '0')}.jpg`), buf);
    written++;
    if (written % 25 === 0 || frames.length <= 12) {
      const rate = written / ((Date.now() - started) / 1000);
      process.stdout.write(`  ${written}/${frames.length} frames  ${rate.toFixed(1)}/s\n`);
    }
  }

  await browser.close();
  console.log(`\n${written} frame(s) → ${outDir}  in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
