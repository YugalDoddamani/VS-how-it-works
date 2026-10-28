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

/** A minimal rig: one body and the nine expression heads from the manifest. */
function rigStub() {
  const names = ['rest', 'small', 'open', 'closed', 'mid', 'smile', 'blink', 'half', 'oh'];
  const heads = {};
  for (const n of names) heads[n] = imgStub();
  return {
    manifest: {
      body: { file: 'body.png', width: 370, height: 1202 },
      anchor: { x: 176, y: 3, headWidth: 309 },
      heads: names.map((n) => ({ name: n, file: `heads/${n}.png`, eyes: 'open', mouth: 'closed' })),
      byEyes: { open: 'rest', closed: 'blink', half: 'half', 'closed-smile': 'smile', wide: 'oh' },
      byMouth: { closed: 'rest', small: 'small', mid: 'mid', open: 'open', oh: 'oh' },
    },
    body: imgStub(),
    heads,
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
  const { setRig } = await loadNao();
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));

  setRig(rigStub());

  const { ctx } = fakeContext();
  for (let f = 0; f < reel.frames; f++) {
    assert.doesNotThrow(() => drawFrame(ctx, reel, f), `frame ${f} threw`);
  }
});

test('a frame is deterministic', async () => {
  const { drawFrame } = await loadStage();
  const { setRig } = await loadNao();
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));
  setRig(rigStub());

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
  const { setRig } = await loadNao();
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));
  setRig(rigStub());

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

test('the character is inside the frame on every shot that has her', async () => {
  const { drawFrame } = await loadStage();
  const { setRig } = await loadNao();
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));
  setRig(rigStub());

  for (const shot of reel.shots) {
    const { ctx, log } = fakeContext();
    drawFrame(ctx, reel, shot.start + 2);
    const images = log.filter((c) => c[0] === 'drawImage');
    const expected = !['hands', 'off', 'absent'].includes(shot.placement);
    if (expected) {
      assert.ok(images.length > 0, `shot ${shot.n} (${shot.placement}) drew no character`);
      // index 0 is the body; the head is drawn afterwards, in bands
      const body = images[0];
      const x = body[2];
      const y = body[3];
      if (body.length >= 11) {
        // 9-arg drawImage: (img, sx, sy, sw, sh, dx, dy, dw, dh)
        const dx = body[7];
        const dy = body[8];
        const dw = body[9];
        const dh = body[10];
        assert.ok(dx < 1080 && dx + dw > 0, `shot ${shot.n}: body is off-frame horizontally`);
        assert.ok(dy < 1920, `shot ${shot.n}: body starts below the canvas`);
        assert.ok(dh > 300, `shot ${shot.n}: body is only ${Math.round(dh)} px tall`);
      } else {
        assert.ok(x < 1080, `shot ${shot.n}: body is off-frame`);
        assert.ok(y < 1920, `shot ${shot.n}: body starts below the canvas`);
      }
      const heads = images.length - 1;
      assert.ok(heads >= 1, `shot ${shot.n}: head was never drawn`);
    } else {
      assert.strictEqual(images.length, 0, `shot ${shot.n} should not draw a character`);
    }
  }
});

test('the head swaps with the mouth shape and blinks on its own clock', async () => {
  const { headState, blinkAt } = await loadNao();
  const { setRig } = await loadNao();
  setRig(rigStub());
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));

  // the mouth actually changes across a shot that has a sentence in it
  const shot = reel.shots[3];
  const seen = new Set();
  for (let f = shot.start; f < shot.end; f++) seen.add(headState(shot, f).mouth);
  assert.ok(seen.size >= 2, `mouth never changed across shot ${shot.n}: ${[...seen]}`);

  // and it blinks: within any 4-second window there is a closed frame
  const closed = [];
  for (let f = 0; f < 120; f++) if (blinkAt(shot, f) !== 'open') closed.push(f);
  assert.ok(closed.length > 0, 'no blink in 4 seconds');
  assert.ok(closed.length < 40, 'blinking too often to read as blinking');

  // eyes are closed at most briefly - never for a whole shot
  let run = 0;
  let maxRun = 0;
  for (let f = shot.start; f < shot.end; f++) {
    const eyes = headState(shot, f).eyes;
    run = eyes === 'closed' || eyes === 'half' ? run + 1 : 0;
    maxRun = Math.max(maxRun, run);
  }
  assert.ok(maxRun <= 5, `eyes stayed shut for ${maxRun} frames in one shot`);
});

test('the reel keeps its grammar: corners, inserts, one whip', async () => {
  const reel = JSON.parse(fs.readFileSync(REEL, 'utf8'));
  const codes = reel.shots.map((s) => s.code);
  assert.ok(codes.filter((c) => c === 'CORNER').length >= 3, 'needs 3+ CORNER shots');
  assert.ok(codes.filter((c) => c === 'INSERT').length >= 4, 'needs 4+ INSERT shots');
  assert.strictEqual(reel.shots.filter((s) => s.transition === 'whip').length, 1);
  assert.strictEqual(codes[0], 'POV', 'opens on the viewer, not on her');
});
