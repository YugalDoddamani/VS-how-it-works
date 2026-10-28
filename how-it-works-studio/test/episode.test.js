'use strict';

/**
 * episode.test.js - the long-form chain, checked where it can be checked.
 *
 * Two things go wrong quietly in an episode and are expensive to find in a
 * frame: a beat sheet whose durations do not add up to the header's length, and
 * a world id in the compiler that no painter answers to (the renderer falls back
 * to a generic page and nobody notices until they watch the film).
 *
 * Neither needs a compiled artefact. The suite runs from `content/csv/` and
 * `src/`, which are both committed.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');

const requireEsm = createRequire(__filename);
const ROOT = path.resolve(__dirname, '..');
const FPS = 30;

/** The smallest CSV reader that survives quotes and commas in a cell. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift().map((h) => h.trim());
  return rows
    .filter((r) => r.length === header.length && r.some((v) => v.trim()))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i].trim()])));
}

const csv = (name) => parseCsv(fs.readFileSync(path.join(ROOT, 'content/csv', name), 'utf8'));
const clean = (id) => String(id).replace(/^'+/, '').trim();

const episodes = csv('episodes.csv').map((e) => ({ ...e, episode_id: clean(e.episode_id) }));
const beats = csv('beats.csv').map((b) => ({ ...b, episode_id: clean(b.episode_id) }));

// ---------------------------------------------------------------------------
// the sheet
// ---------------------------------------------------------------------------

test('every episode has beats', () => {
  for (const episode of episodes) {
    const mine = beats.filter((b) => b.episode_id === episode.episode_id);
    assert.ok(mine.length > 0, `${episode.episode_id} has no beats`);
  }
});

test('beat durations add up to the episode length, exactly', () => {
  for (const episode of episodes) {
    const mine = beats.filter((b) => b.episode_id === episode.episode_id);
    const total = mine.reduce((sum, b) => sum + Number(b.duration_s), 0);
    assert.strictEqual(
      Math.round(total * FPS),
      Math.round(Number(episode.target_seconds) * FPS),
      `${episode.episode_id}: beats total ${total}s, header says ${episode.target_seconds}s`
    );
  }
});

test('no beat is shorter than a shot', () => {
  for (const beat of beats) {
    assert.ok(Number(beat.duration_s) >= 2, `beat ${beat.episode_id}/${beat.beat_no} is under 2 s`);
  }
});

test('the reading check passes on every episode that has been built', () => {
  // words / 4 + 0.6 seconds, the rule script.md prints. This gates a *render*,
  // not a draft: an episode still being written is allowed to have a line that
  // is 0.1 s too quick for its beat, and the sheet says so. Once the status is
  // rendered, the film exists and the check has to hold.
  const built = new Set(
    episodes.filter((e) => ['rendered', 'published'].includes(e.status)).map((e) => e.episode_id)
  );
  assert.ok(built.size > 0, 'no episode is built yet');
  for (const beat of beats.filter((b) => built.has(b.episode_id))) {
    const words = String(beat.narration || '').split(/\s+/).filter(Boolean).length;
    const needed = words / 4 + 0.6;
    assert.ok(
      Number(beat.duration_s) + 1e-6 >= needed,
      `beat ${beat.episode_id}/${beat.beat_no}: ${words} words need ${needed.toFixed(1)} s, ` +
      `has ${beat.duration_s} s`
    );
  }
});

// ---------------------------------------------------------------------------
// the compiler
// ---------------------------------------------------------------------------

test('compile-episode validates every episode without writing', () => {
  // --check compiles in memory: this is the whole sheet, through the real
  // compiler, with nothing left behind to go stale
  const out = execFileSync(process.execPath, [path.join(ROOT, 'tools/compile-episode.mjs'), '--check'], {
    encoding: 'utf8',
  });
  assert.match(out, /episode\(s\) validated/);
});

test('every world the episode compiler asks for is a painter', async () => {
  const { worldExists } = await import(
    path.join('file://', ROOT, 'src/stage/reel/worlds.js')
  );
  const source = fs.readFileSync(path.join(ROOT, 'tools/compile-episode.mjs'), 'utf8');
  const ids = [...source.matchAll(/^\s*\d+:\s*'([a-z0-9_]+)',$/gm)].map((m) => m[1]);
  assert.ok(ids.length >= 9, 'the episode world table looks empty');
  for (const id of ids) assert.ok(worldExists(id), `no painter for "${id}"`);
});

test('a title card is drawn with a painter and a world is never left empty', async () => {
  const { worldExists } = await import(path.join('file://', ROOT, 'src/stage/reel/worlds.js'));
  assert.ok(worldExists('ep_title'));
  assert.ok(worldExists('ep_outro'));
});
