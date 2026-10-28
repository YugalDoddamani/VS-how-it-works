/**
 * lib-canvas.mjs - the host setup every Node-side renderer needs: fonts, the
 * twelve figure drawings, and the bitmap props.
 *
 * The browser preview and the Node renderer must agree about what is on screen,
 * so they must agree about what assets exist. Keeping the loading here means a
 * new pose or prop is picked up by the stills tool, the film tool and any future
 * exporter at once, instead of in whichever one somebody remembered.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const FPS = 30;
export const W = 1080;
export const H = 1920;

const FONT_FILES = [
  'inter-latin-400-normal.woff2',
  'inter-latin-500-normal.woff2',
  'inter-latin-600-normal.woff2',
  'inter-latin-700-normal.woff2',
  'source-serif-4-latin-400-normal.woff2',
  'ibm-plex-mono-latin-500-normal.woff2',
];

/**
 * Register everything the stage needs and hand back the canvas factory.
 * @param {string} root project root (how-it-works-studio)
 */
export async function setupStage(root) {
  const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');

  for (const file of FONT_FILES) {
    const full = path.join(root, 'assets/fonts', file);
    if (fs.existsSync(full)) GlobalFonts.registerFromPath(full);
  }

  const { setPoses } = await import(path.join(root, 'src/stage/reel/nao.js'));
  const { setWorldAssets } = await import(path.join(root, 'src/stage/reel/worlds.js'));

  const poseDir = path.join(root, 'assets/nao/poses');
  const manifestFile = path.join(poseDir, 'poses.json');
  if (!fs.existsSync(manifestFile)) {
    throw new Error('no poses — run: python3 tools/build-nao-poses.py');
  }
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  const images = {};
  for (const pose of manifest.poses) {
    const file = path.join(poseDir, pose.file);
    if (fs.existsSync(file)) images[pose.name] = await loadImage(file);
  }
  setPoses({ manifest, images });

  const shoeFile = path.join(root, 'assets/world/shoe.png');
  if (fs.existsSync(shoeFile)) setWorldAssets({ shoe: await loadImage(shoeFile) });

  return { createCanvas, loadImage, poses: Object.keys(images).length };
}
