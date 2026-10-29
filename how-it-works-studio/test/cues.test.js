/**
 * cues.test.js - the beat's sentence, as frames.
 *
 * These are the rules that keep the picture on the voice: a word's share of the
 * read, a cue that lasts until the next one, and the guarantee that a cut in the
 * middle of a beat resumes the demonstration instead of restarting it.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { wordTimeline, resolveCues, cueAt, validateCues } from '../src/stage/reel/cues.js';

const LINE = 'It asks DNS for the right address, like looking up a contact before calling.';

test('the timeline covers the beat exactly, in order', () => {
  const t = wordTimeline(LINE, 144, 3);
  assert.equal(t.length, LINE.split(' ').length);
  assert.equal(t[0].start, 3);
  assert.equal(t[t.length - 1].end, 144);
  for (let i = 1; i < t.length; i++) {
    assert.ok(t[i].start >= t[i - 1].start, 'words are in order');
    assert.ok(t[i].end > t[i].start, 'every word has time on screen');
  }
});

test('a long word takes longer than a short one', () => {
  const t = wordTimeline('and JavaScript', 100);
  const a = t[0].end - t[0].start;
  const b = t[1].end - t[1].start;
  assert.ok(b > a * 2, `JavaScript ${b} frames vs and ${a}`);
});

test('a cue starts on its word and runs to the next cue', () => {
  const cues = resolveCues(
    [{ at: 'asks', tag: 'ask DNS' }, { at: 'contact', tag: '' }, { at: 'calling', tag: '' }],
    LINE,
    144,
    3
  );
  assert.equal(cues.length, 3);
  assert.ok(cues[0].start >= 3);
  assert.equal(cues[0].end, cues[1].start);
  assert.equal(cues[2].end, 144);
  assert.ok(cues[0].wordIndex < cues[1].wordIndex);
});

test('a stem finds the word it belongs to', () => {
  const cues = resolveCues([{ at: 'encrypt', tag: 'HTTPS' }], 'it sets up an encrypted connection', 90);
  assert.equal(cues[0].wordIndex, 4);
});

test('a cue word that is not in the narration is reported, not guessed', () => {
  const problems = validateCues([{ at: 'banana', tag: 'x' }], LINE);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /banana/);
});

test('the cue at a frame is stable across a cut', () => {
  const cues = resolveCues([{ at: 'asks', tag: 'a' }, { at: 'calling', tag: 'b' }], LINE, 144, 3);
  const beatStart = 300;
  const fromPreviousShot = cueAt(cues, beatStart + 60, beatStart);
  const fromThisShot = cueAt(cues, beatStart + 60, beatStart);
  assert.deepEqual(fromPreviousShot, fromThisShot);
  assert.equal(fromPreviousShot.index, 0);
  assert.ok(fromPreviousShot.p > 0 && fromPreviousShot.p < 1);
});

test('before the first cue the beat holds the opening state', () => {
  const cues = resolveCues([{ at: 'contact', tag: '' }], LINE, 144, 0);
  const early = cueAt(cues, 0, 0);
  assert.equal(early.index, 0);
  assert.equal(early.p, 0);
});

test('a shot with no cues has no cue at all', () => {
  assert.equal(cueAt([], 40, 0), null);
  assert.equal(cueAt(undefined, 40, 0), null);
});
