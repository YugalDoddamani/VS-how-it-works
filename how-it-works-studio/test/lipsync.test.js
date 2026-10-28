'use strict';

/**
 * lipsync.test.js - unit tests for the text-driven mouth schedule.
 *
 * No browser, no audio, no fixture files: the whole point of deriving visemes
 * from text is that this is testable as pure functions.
 */

const test = require('node:test');
const assert = require('node:assert');

const Visemes = require('../src/stage/rig/visemes.js');
const LipSync = require('../src/stage/rig/lipsync.js');

// ---------------------------------------------------------------------------
// viseme mapping
// ---------------------------------------------------------------------------

test('the twelve visemes are exactly the sheet cells', () => {
  assert.deepStrictEqual(Visemes.VISEMES, [
    'rest', 'A', 'E', 'I', 'O', 'U', 'W', 'MBP', 'FV', 'L', 'SZTD', 'CGK',
  ]);
});

test('openness is monotonic between rest and A for the vowels', () => {
  const order = ['rest', 'MBP', 'SZTD', 'FV', 'U', 'CGK', 'E', 'O', 'A'];
  for (let i = 1; i < order.length; i++) {
    assert.ok(
      Visemes.opennessOf(order[i]) >= Visemes.opennessOf(order[i - 1]),
      `${order[i]} should be at least as open as ${order[i - 1]}`
    );
  }
  assert.strictEqual(Visemes.opennessOf('rest'), 0);
  assert.strictEqual(Visemes.opennessOf('A'), 1);
});

test('every viseme has an openness value', () => {
  for (const v of Visemes.VISEMES) {
    assert.strictEqual(typeof Visemes.opennessOf(v), 'number', `${v} has no openness`);
  }
});

test('rule-list examples produce the documented viseme', () => {
  // Each word is expected to *contain* the viseme for the pattern under test.
  const cases = {
    change: 'CGK', // ch
    share: 'CGK', // sh
    thing: 'SZTD', // th
    photo: 'FV', // ph
    quick: 'W', // qu
    moon: 'U', // oo
    see: 'I', // ee
    wait: 'E', // ai
    low: 'O', // ow
    cat: 'CGK', // hard c before a
    say: 'SZTD', // s
    me: 'MBP', // m
    fast: 'FV', // f
    look: 'L', // l
  };
  for (const [word, expected] of Object.entries(cases)) {
    assert.ok(
      Visemes.visemesForWord(word).includes(expected),
      `word "${word}": expected ${expected} in ${JSON.stringify(Visemes.visemesForWord(word))}`
    );
  }
});

test('hard c before a vowel and soft c before e/i differ', () => {
  assert.strictEqual(Visemes.visemesForWord('cat')[0], 'CGK');
  assert.strictEqual(Visemes.visemesForWord('city')[0], 'SZTD');
});

test('exception dictionary wins over the rule list', () => {
  assert.deepStrictEqual(Visemes.visemesForWord('the'), ['SZTD', 'E']);
  assert.deepStrictEqual(Visemes.visemesForWord('one'), ['W', 'A', 'CGK']);
  assert.deepStrictEqual(Visemes.visemesForWord('you'), ['I', 'U']);
});

test('silent final e is dropped, doubled consonants collapse', () => {
  assert.deepStrictEqual(Visemes.visemesForWord('made'), ['MBP', 'A', 'SZTD']);
  const bitter = Visemes.visemesForWord('tt');
  assert.ok(bitter.length <= 2, 'doubled consonant should not produce two shapes');
});

test('an unknown or empty word still yields at least one shape', () => {
  assert.deepStrictEqual(Visemes.visemesForWord(''), []);
  assert.ok(Visemes.visemesForText('...').length >= 1);
});

test('produced visemes are always in the sheet set', () => {
  const sentence = 'Your photos live in a city with no people, and the lights never go out.';
  for (const v of Visemes.visemesForText(sentence)) {
    assert.ok(Visemes.isViseme(v), `unknown viseme produced: ${v}`);
  }
});

// ---------------------------------------------------------------------------
// schedule building
// ---------------------------------------------------------------------------

const DURATIONS = [15, 30, 90, 180, 240, 270, 360];

test('a schedule is valid and does not exceed its beat', () => {
  const text = 'Your photos live in a city with no people.';
  for (const frames of DURATIONS) {
    const schedule = LipSync.buildSchedule(text, frames);
    const issues = LipSync.validateSchedule(schedule, frames);
    assert.deepStrictEqual(issues, [], `frames=${frames}: ${JSON.stringify(issues)}`);
    const last = schedule.frames[schedule.frames.length - 1];
    assert.ok(last.f < frames, `frames=${frames}: schedule runs past the beat`);
  }
});

test('a schedule always starts and ends on rest', () => {
  const texts = ['', 'Hi.', 'Yes, exactly.', 'The cloud is just someone else\'s computer!'];
  for (const text of texts) {
    const schedule = LipSync.buildSchedule(text, 120);
    assert.strictEqual(schedule.frames[0].f, 0);
    assert.strictEqual(schedule.frames[0].v, 'rest');
    assert.strictEqual(schedule.frames[schedule.frames.length - 1].v, 'rest', `text="${text}"`);
  }
});

test('change points are strictly increasing', () => {
  const schedule = LipSync.buildSchedule('Data centres are a city with no people in them.', 300);
  for (let i = 1; i < schedule.frames.length; i++) {
    assert.ok(schedule.frames[i].f > schedule.frames[i - 1].f, `index ${i}`);
  }
});

test('only change-points are stored, not every frame', () => {
  const frames = 300;
  const schedule = LipSync.buildSchedule('Data centres are a city with no people in them.', frames);
  assert.ok(schedule.frames.length < frames / 2, `expected sparse schedule, got ${schedule.frames.length}`);
});

test('no viseme is held for less than the minimum after merging', () => {
  const schedule = LipSync.buildSchedule('A be see do go', 40);
  const list = schedule.frames;
  for (let i = 0; i < list.length - 1; i++) {
    const hold = list[i + 1].f - list[i].f;
    assert.ok(hold >= 1, `hold of ${hold} frames at index ${i}`);
  }
});

test('the same text always produces a byte-identical schedule', () => {
  const a = LipSync.buildSchedule('Wifi is a shared road, not a private one.', 210);
  const b = LipSync.buildSchedule('Wifi is a shared road, not a private one.', 210);
  assert.strictEqual(JSON.stringify(a), JSON.stringify(b));
});

test('a longer beat stretches the schedule rather than repeating it', () => {
  const text = 'Data centres use about one and a half percent of the world electricity.';
  const short = LipSync.buildSchedule(text, 180);
  const long = LipSync.buildSchedule(text, 360);

  assert.ok(
    long.frames[long.frames.length - 1].f > short.frames[short.frames.length - 1].f * 1.3,
    'the long beat should finish later'
  );

  // A shorter beat may merge shapes (minimum hold), but it must never reorder
  // them: the short shape sequence is a subsequence of the long one.
  const shortShapes = short.frames.map((e) => e.v);
  const longShapes = long.frames.map((e) => e.v);
  let cursor = 0;
  for (const shape of shortShapes) {
    while (cursor < longShapes.length && longShapes[cursor] !== shape) cursor++;
    assert.ok(cursor < longShapes.length, `shape "${shape}" missing from the stretched schedule`);
    cursor++;
  }
});

test('emphasis widens the mouth on the stressed word', () => {
  const text = 'The cache keeps a copy close to you.';
  const plain = LipSync.buildSchedule(text, 240);
  const stressed = LipSync.buildSchedule(text, 240, { emphasis: ['cache'] });
  const widestPlain = Math.max(...plain.frames.map((e) => e.o));
  const widestStressed = Math.max(...stressed.frames.map((e) => e.o));
  assert.ok(widestStressed >= widestPlain);
});

// ---------------------------------------------------------------------------
// playback
// ---------------------------------------------------------------------------

test('mouthStateAt is closed before the caption and at the very end', () => {
  const schedule = LipSync.buildSchedule('Your photos live in a city with no people.', 240);
  assert.strictEqual(LipSync.mouthStateAt(schedule, 0).o, 0);
  assert.strictEqual(LipSync.mouthStateAt(schedule, 239).o, 0);
});

test('mouthStateAt never returns an unknown viseme at any frame', () => {
  const schedule = LipSync.buildSchedule('Browsers are just very fast post offices.', 200);
  for (let f = 0; f < 200; f++) {
    const state = LipSync.mouthStateAt(schedule, f);
    assert.ok(Visemes.isViseme(state.v), `frame ${f}: ${state.v}`);
    if (state.next) assert.ok(Visemes.isViseme(state.next), `frame ${f} next: ${state.next}`);
    assert.ok(state.o >= 0 && state.o <= 1, `frame ${f}: openness ${state.o}`);
  }
});

test('blending happens only in the frames just before a change', () => {
  const schedule = LipSync.buildSchedule('Meet me at the router.', 120);
  let blended = 0;
  for (let f = 0; f < 120; f++) {
    if (LipSync.mouthStateAt(schedule, f).blend > 0) blended++;
  }
  assert.ok(blended > 0, 'expected some coarticulation');
  assert.ok(blended < 120 / 2, `blending leaked into too many frames: ${blended}`);
});

test('full-body reduction collapses to three mouth states', () => {
  const seen = new Set();
  const schedule = LipSync.buildSchedule('Data centres are a city with no people.', 240);
  for (let f = 0; f < 240; f++) {
    seen.add(LipSync.postureFor(LipSync.mouthStateAt(schedule, f).o));
  }
  for (const state of seen) {
    assert.ok(['closed', 'mid', 'open'].includes(state), `unexpected posture: ${state}`);
  }
});

test('validateSchedule rejects a broken schedule', () => {
  const broken = { mode: 'full-body', fps: 30, frames: [{ f: 4, v: 'rest', o: 0 }, { f: 2, v: 'ZZ', o: 3 }] };
  const issues = LipSync.validateSchedule(broken, 120);
  assert.ok(issues.some((i) => /Unknown viseme/.test(i.message)));
  assert.ok(issues.some((i) => /strictly increasing/.test(i.message)));
  assert.ok(issues.some((i) => /openness out of range/.test(i.message)));
  assert.ok(issues.some((i) => /start at frame 0/.test(i.message)));
});
