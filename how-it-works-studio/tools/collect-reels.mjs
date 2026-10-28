#!/usr/bin/env node
/**
 * collect-reels.mjs - put every finished film in one folder.
 *
 * A delivered film lives next to the project that made it:
 *
 *   series/<series>/episodes/<id>/output/<id>.mp4
 *   series/<series>/reels/<id>/output/<id>.mp4
 *
 * That is right for the build, and wrong for a reviewer. "Where is the video"
 * should not mean opening five project folders, so every exported film is also
 * copied to the repo-root `final-reels/` folder, flat, with its subtitles and
 * key-frame sheet beside it, plus a README index that says what each file is.
 *
 * The copy is the deliverable; the project output folder stays the source of
 * truth. Re-running the script refreshes the folder and rewrites the index.
 *
 * Usage:
 *   node tools/collect-reels.mjs            copy everything, rewrite the index
 *   node tools/collect-reels.mjs --check    exit 1 if the folder is out of date
 *   node tools/collect-reels.mjs --list     print the index, copy nothing
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.resolve(ROOT, '..', 'final-reels');

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const LIST = args.includes('--list');

/** ffprobe if the environment has it; the index says "unknown" if it does not. */
function probe(file) {
  let bin = 'ffprobe';
  try {
    bin = require('@ffprobe-installer/ffprobe').path;
  } catch {
    /* fall back to the PATH */
  }
  const res = spawnSync(bin, [
    '-v', 'error',
    '-show_entries', 'format=duration,size',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ], { encoding: 'utf8' });
  if (res.status !== 0) return { seconds: null, bytes: fs.statSync(file).size };
  const [duration, size] = String(res.stdout).trim().split('\n').map(Number);
  return { seconds: Number.isFinite(duration) ? duration : null, bytes: size || fs.statSync(file).size };
}

/** Every delivered film in the repo, newest commit order not implied - sorted by id. */
function films() {
  const found = [];
  const seriesDir = path.join(ROOT, 'series');
  if (!fs.existsSync(seriesDir)) return found;
  for (const series of fs.readdirSync(seriesDir)) {
    for (const kind of ['episodes', 'reels']) {
      const dir = path.join(seriesDir, series, kind);
      if (!fs.existsSync(dir)) continue;
      for (const id of fs.readdirSync(dir)) {
        const out = path.join(dir, id, 'output');
        if (!fs.existsSync(out)) continue;
        for (const file of fs.readdirSync(out)) {
          if (!file.endsWith('.mp4')) continue;
          const base = file.replace(/\.mp4$/, '');
          found.push({
            series,
            kind: kind === 'episodes' ? 'episode' : 'reel',
            id,
            name: base,
            mp4: path.join(out, file),
            srt: path.join(out, `${base}.srt`),
            frames: path.join(out, 'key-frames.jpg'),
          });
        }
      }
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

const mmss = (s) => (s == null ? '—' : `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`);
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

function readTitle(film) {
  // The episode/reel README (or the reel's script) carries the human title on
  // its first heading line.
  for (const file of ['README.md', 'readme.md', 'script.md']) {
    const p = path.join(ROOT, 'series', film.series, `${film.kind === 'episode' ? 'episodes' : 'reels'}`, film.id, file);
    if (!fs.existsSync(p)) continue;
    const line = fs.readFileSync(p, 'utf8').split('\n').find((l) => l.startsWith('# '));
    if (line) return line.replace(/^#\s*/, '').trim();
  }
  return film.name;
}

function index(found) {
  const rows = found.map((f) => {
    const { seconds } = probe(f.mp4);
    return `| [${f.name}.mp4](${f.name}.mp4) | ${readTitle(f)} | ${f.series} · ${f.kind} | ${mmss(seconds)} | ${mb(fs.statSync(f.mp4).size)} | \`${path.relative(ROOT, f.mp4)}\` |`;
  });
  return `# Final reels

Every finished film, in one folder. Open a file and watch it; nothing here needs
to be built first.

This folder is generated - the film next to its project is the source of truth.
Collect or refresh it with:

    cd how-it-works-studio
    npm run reels:collect

| Film | Title | Project | Length | Size | Source |
| --- | --- | --- | --- | --- | --- |
${rows.join('\n')}

Each film is accompanied by its subtitle track (\`.srt\`) and a key-frame sheet
(\`-key-frames.jpg\`) so a review can start without pressing play.

## Why this folder exists

A render is a build artefact: it lives in \`series/<series>/<kind>/<id>/output/\`
and can be regenerated. A *delivery* is not. The one place a reviewer looks is
the repo root, so the films are copied here as well, and \`npm run reels:collect
-- --check\` fails when a new film has not been added.
`;
}

const found = films();
if (!found.length) {
  console.error('no films found under series/*/{episodes,reels}/*/output/*.mp4');
  process.exit(1);
}

if (LIST) {
  console.log(index(found));
  process.exit(0);
}

if (CHECK) {
  const problems = [];
  if (!fs.existsSync(OUT)) problems.push(`missing folder ${OUT}`);
  for (const f of found) {
    const copy = path.join(OUT, `${f.name}.mp4`);
    if (!fs.existsSync(copy)) problems.push(`${f.name}.mp4 not collected`);
    else if (fs.statSync(copy).size !== fs.statSync(f.mp4).size) problems.push(`${f.name}.mp4 is stale`);
  }
  if (problems.length) {
    console.error(problems.map((p) => `  ${p}`).join('\n'));
    console.error('\nrun: npm run reels:collect');
    process.exit(1);
  }
  console.log(`final-reels: ${found.length} film(s) up to date`);
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });
for (const f of found) {
  const copy = (src, dest) => {
    if (!fs.existsSync(src)) return;
    fs.copyFileSync(src, dest);
  };
  copy(f.mp4, path.join(OUT, `${f.name}.mp4`));
  copy(f.srt, path.join(OUT, `${f.name}.srt`));
  copy(f.frames, path.join(OUT, `${f.name}-key-frames.jpg`));
}
fs.writeFileSync(path.join(OUT, 'README.md'), index(found));
console.log(`final-reels: ${found.length} film(s) → ${OUT}`);
for (const f of found) console.log(`  ${f.name}.mp4`);
