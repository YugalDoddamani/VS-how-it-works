/**
 * lookup.mjs - find a compiled picture by id, whether it is a reel or an episode.
 *
 * Reels and episodes are authored differently (a shot table vs. the beat sheet)
 * and compiled by different tools, but by the time they reach the stage they are
 * the same object: `{ frames, fps, shots: [...] }`. Everything downstream -
 * renderer, mixer, caption exporter, tests - should therefore only need one
 * lookup, and it should not care which folder the thing came from.
 *
 * Reels win a tie: ids do not collide today, but r03 is a shorthand and 0102 is
 * a prefix, and the shorthand should keep working.
 */

import fs from 'node:fs';
import path from 'node:path';

/**
 * @param {string} root project root (how-it-works-studio)
 * @param {string} id   reel id ("r03"), episode id ("0102") or a slug prefix
 * @returns {{reel:object, dir:string, file:string, kind:'reel'|'episode', series:string, slug:string}}
 */
export function findCompiled(root, id) {
  const wanted = String(id).toLowerCase().replace(/^'+/, '');
  const seriesDir = path.join(root, 'series');

  for (const kind of ['reels', 'episodes']) {
    for (const series of fs.readdirSync(seriesDir)) {
      const base = path.join(seriesDir, series, kind);
      if (!fs.existsSync(base)) continue;
      for (const slug of fs.readdirSync(base)) {
        const dir = path.join(base, slug);
        if (!fs.statSync(dir).isDirectory()) continue;
        const file = path.join(dir, kind === 'reels' ? 'reel.json' : 'episode.json');
        if (!fs.existsSync(file)) continue;
        const reel = JSON.parse(fs.readFileSync(file, 'utf8'));
        const rid = String(reel.id).toLowerCase().replace(/^'+/, '');
        if (rid === wanted || slug.toLowerCase().startsWith(wanted)) {
          return { reel, dir, file, kind: kind === 'reels' ? 'reel' : 'episode', series, slug };
        }
      }
    }
  }

  const compiler = /^\d/.test(wanted) ? 'compile-episode' : 'compile-reel';
  throw new Error(
    `nothing compiled for "${id}" — run: node tools/${compiler}.mjs ${wanted}`
  );
}
