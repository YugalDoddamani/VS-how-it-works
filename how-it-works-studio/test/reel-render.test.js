'use strict';

/**
 * reel-render.test.js - does the stage actually draw a whole reel?
 *
 * There is no browser in CI, so this runs the real renderer against a recording
 * 2D context. That catches the failures that matter without one: an undefined
 * painter, a canvas API used wrongly, a shot with no caption, a character drawn
 * off-screen, or a frame that is not deterministic.
 *
 * It is not a visual test. It proves the reel renders; it cannot prove it looks
 * good - that is what the preview is for.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const REEL = path.join(
  ROOT, 'series/your-data-explained/reels/r03-why-the-ad-follows-you/reel.json'
);

async function loadStage() {
  // The stage is ES modules; the rest of the studio is CommonJS.
  return import(path.join(ROOT, 'src/stage/reel/render.js'));
}

async function loadNao() {
  return import(path.join(ROOT, 'src/stage/reel/nao.js'));
}

/** A recording 2D context: every call is appended to `log`. */
function fakeContext() {
  const log = [];
  const state = {
    fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, font: '400 10px sans',
    textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1, lineCap: 'butt',
    lineJoin: 'miter', shadowColor: 'transparent', shadowBlur: 0, shadowOffsetY: 0,
  };
  const gradient = () => ({ addColorStop() {} });
  const ctx = new Proxy(state, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'measureText') {
        return (text) => ({ width: String(text).length * 18 });
      }
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return gradient;
      if (prop === 'canvas') return { width: 1080, height: 1920 };
      return (...args) => {
        log.push([prop, ...args]);
      };
    },
    set(target, prop, value) {
      target[prop] = value;
      log.push([`set:${String(prop)}`, value]);
      return true;
    },
  });
  return { ctx, log };
}

/** A stand-in for a loaded image: only width/height are used by the stage. */
function imgStub(w = 370, h = 1202) {
  return { width: w, height: h };
}

/** A figure stub carries a marker, so the test can tell her from the world's art. */
function poseStub(w = 900, h = 1500) {
  return { width: w, height: h, nao: true };
}

/** A minimal pose set: the twelve whole figures, on a 900x1500 canvas. */
function posesStub() {
  const names = ['neutral', 'presenting', 'openhands', 'explaining', 'pointing', 'thinking',
    'skeptical', 'onefinger', 'deadpan', 'warm', 'nope', 'fingerheart'];
  const images = {};
  for (const n of names) images[n] = poseStub();
  return {
    manifest: {
      canvas: { width: 900, height: 1500 },
      figureHeight: 1280,
      feetY: 1460,
      headCx: 450,
      anchor: { headWidth: 212 },
      poses: names.map((n) => ({ name: n, file: `${n}.png`, width: 900, height: 1500, headWidth: 212, headTop: 90, feetY: 1460 })),
    },
    images,
  };
}

test('the compiled reel exists and is internally consistent', () => {
  assert.ok(fs.existsSync(REEL), 'run: node tools/compile-reel.mjs r03');
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));
  assert.strictEqual(reel.frames, 1350);
  assert.strictEqual(reel.seconds, 45);
  assert.strictEqual(reel.shots.length, 23);

  let cursor = 0;
  for (const shot of reel.shots) {
    assert.strictEqual(shot.start, cursor, `shot ${shot.n} does not start where the last ended`);
    assert.ok(shot.frames > 0);
    cursor += shot.frames;
    assert.ok(shot.vo.length > 0, `shot ${shot.n} has no voice-over`);
    assert.ok(shot.mouth.schedule.length >= 2, `shot ${shot.n} has no mouth schedule`);
  }
  assert.strictEqual(cursor, reel.frames);

  const lasts = reel.shots[reel.shots.length - 1];
  assert.strictEqual(lasts.code, 'CU', 'the sign-off should be a close-up');
  assert.strictEqual(lasts.frames, 60, 'the sign-off is exactly 2.0 s, never stretched');
});

test('every frame of the reel renders without throwing', async () => {
  const { drawFrame } = await loadStage();
  const { setPoses } = await loadNao();
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));

  setPoses(posesStub());

  const { ctx } = fakeContext();
  for (let f = 0; f < reel.frames; f++) {
    assert.doesNotThrow(() => drawFrame(ctx, reel, f), `frame ${f} threw`);
  }
});

test('a frame is deterministic', async () => {
  const { drawFrame } = await loadStage();
  const { setPoses } = await loadNao();
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));
  setPoses(posesStub());

  const a = fakeContext();
  const b = fakeContext();
  drawFrame(a.ctx, reel, 700);
  drawFrame(b.ctx, reel, 700);
  assert.deepStrictEqual(
    a.log.map((c) => JSON.stringify(c)),
    b.log.map((c) => JSON.stringify(c))
  );
});

test('every shot draws its caption text', async () => {
  const { drawFrame } = await loadStage();
  const { setPoses } = await loadNao();
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));
  setPoses(posesStub());

  for (const shot of reel.shots) {
    const { ctx, log } = fakeContext();
    drawFrame(ctx, reel, shot.start + Math.floor(shot.frames / 2));
    const drawn = log.filter((c) => c[0] === 'fillText').map((c) => String(c[1]));
    const words = shot.vo.split(/\s+/).filter(Boolean).slice(0, 3);
    for (const w of words) {
      assert.ok(
        drawn.some((line) => line.includes(w.replace(/[^A-Za-z0-9'-]/g, ''))),
        `shot ${shot.n}: caption word "${w}" never drawn`
      );
    }
  }
});

test('the character is a whole figure, inside the frame, on every shot that has her', async () => {
  const { drawFrame } = await loadStage();
  const { setPoses } = await loadNao();
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));
  setPoses(posesStub());

  for (const shot of reel.shots) {
    const { ctx, log } = fakeContext();
    drawFrame(ctx, reel, shot.start + 2);
    // her drawing is the one whose image is a pose stub; the world draws its
    // own art through the same call
    const figures = log.filter((c) => c[0] === 'drawImage' && c[1] && c[1].nao === true);
    const expected = !['hands', 'off', 'absent'].includes(shot.placement);
    if (!expected) {
      assert.strictEqual(figures.length, 0, `shot ${shot.n} should not draw a character`);
      continue;
    }

    // exactly one drawing: a pose is a whole figure, never a body plus a head
    assert.strictEqual(figures.length, 1, `shot ${shot.n} drew ${figures.length} character images, expected 1`);
    const draw = figures[0];
    assert.strictEqual(draw.length, 6, `shot ${shot.n}: a figure should be one drawImage, not a stack`);
    const [, , dx, dy, dw, dh] = draw;
    assert.ok(Math.abs(dw / dh - 900 / 1500) < 0.01, `shot ${shot.n}: figure was squashed (${Math.round(dw)}x${Math.round(dh)})`);
    assert.ok(dx < 1080 && dx + dw > 0, `shot ${shot.n}: figure is off-frame horizontally`);
    assert.ok(dy < 1920, `shot ${shot.n}: figure starts below the canvas`);
    assert.ok(dh > 600, `shot ${shot.n}: figure is only ${Math.round(dh)} px tall`);
  }
});

test('a pose changes only on a cut, never inside a shot', async () => {
  const { poseFor, figureState } = await loadNao();
  const { setPoses } = await loadNao();
  setPoses(posesStub());
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));

  for (const shot of reel.shots) {
    const first = poseFor(shot);
    for (let f = shot.start; f < shot.end; f++) {
      assert.strictEqual(figureState(shot, f).pose, first, `shot ${shot.n} changed pose at frame ${f}`);
    }
  }

  // and the reel actually uses more than one pose, or the gestures are decoration
  const visible = reel.shots.filter((s) => !['hands', 'off', 'absent'].includes(s.placement));
  const used = new Set(visible.map((s) => poseFor(s)));
  assert.ok(used.size >= 6, `only ${used.size} poses used across ${visible.length} visible shots: ${[...used]}`);
  for (const shot of visible) {
    assert.ok(posesStub().images[poseFor(shot)], `shot ${shot.n} asks for a pose that does not exist: ${poseFor(shot)}`);
  }
});

test('her body follows the words: the lip-sync schedule still drives the frame', async () => {
  const { opennessAt } = await loadNao();
  const { setPoses } = await loadNao();
  setPoses(posesStub());
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));

  const shot = reel.shots.find((s) => s.vo.split(' ').length > 4);
  const values = [];
  for (let f = shot.start; f < shot.end; f++) values.push(opennessAt(shot, f));
  const max = Math.max(...values);
  assert.ok(max > 0.4, `shot ${shot.n}: openness never rose above ${max}`);
  assert.ok(values.some((v) => v === 0), `shot ${shot.n}: she never pauses`);
});

test("the script's performance note becomes the pose", async () => {
  const { poseFor } = await loadNao();
  const { setPoses } = await loadNao();
  setPoses(posesStub());
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));

  // every shot whose cell names a performance gets that pose, not a world default
  const authored = reel.shots.filter((s) => s.pose);
  assert.ok(authored.length >= 6, `only ${authored.length} shots carry a performance note`);
  for (const shot of authored) assert.strictEqual(poseFor(shot), shot.pose, `shot ${shot.n}`);

  // spot-check the three the script is explicit about
  const byN = Object.fromEntries(reel.shots.map((s) => [s.n, s]));
  assert.strictEqual(poseFor(byN[3]), 'skeptical', 'shot 3 is "half-smile, one brow up"');
  assert.strictEqual(poseFor(byN[11]), 'deadpan', 'shot 11 is "deadpan, flat stare"');
  assert.strictEqual(poseFor(byN[23]), 'fingerheart', 'shot 23 is "finger heart, warm smile"');
});

test('the reel keeps its grammar: corners, inserts, one whip', async () => {
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));
  const codes = reel.shots.map((s) => s.code);
  assert.ok(codes.filter((c) => c === 'CORNER').length >= 3, 'needs 3+ CORNER shots');
  assert.ok(codes.filter((c) => c === 'INSERT').length >= 4, 'needs 4+ INSERT shots');
  assert.strictEqual(reel.shots.filter((s) => s.transition === 'whip').length, 1);
  assert.strictEqual(codes[0], 'POV', 'opens on the viewer, not on her');
});
