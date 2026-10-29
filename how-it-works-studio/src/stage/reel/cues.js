/**
 * cues.js - the beat's sentence, turned into a schedule the picture can follow.
 *
 * The first cut of an explainer draws one animation for the whole beat and lets
 * it loop. It looks fine and it explains nothing: the eye sees a background
 * moving at its own pace while a voice talks about something else. The fix is
 * not "more animation", it is *timing* - the picture has to change state on the
 * word that names the thing.
 *
 * So a beat may carry a cue list: a handful of anchors, each naming the word in
 * the narration at which the visual should advance, and the two or three words
 * the viewer should read on the prop at that moment ("DNS", "GET /cat", "HTML").
 * This module turns that list into frames.
 *
 * Two decisions worth stating:
 *
 *   - A word's share of the read is proportional to its length, not even. "and"
 *     does not take as long as "JavaScript", and if it does the visual drifts a
 *     third of a second late by the end of the sentence.
 *   - A cue runs until the next cue starts, not for a fixed duration. The last
 *     one runs to the end of the beat. That way a shot cut in the middle of a
 *     cue resumes the same state instead of restarting the demonstration.
 *
 * Pure functions: same narration + same cue list = same frames, always.
 */

const norm = (word) => String(word).toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, '');

/**
 * Where each word of `text` falls inside `frames`, as beat-local frames.
 *
 * @param {string} text    the narration for the beat
 * @param {number} frames  how many frames the beat lasts
 * @param {number} [offset] frames to skip before the first word (the VO's in)
 * @returns {{word:string, index:number, start:number, end:number}[]}
 */
export function wordTimeline(text, frames, offset = 0) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const span = Math.max(1, frames - offset);
  const weights = words.map((w) => norm(w).length + 1 + (/[,;:]$/.test(w) ? 1 : 0) + (/[.!?]$/.test(w) ? 2 : 0));
  const total = weights.reduce((a, b) => a + b, 0);

  const out = [];
  let acc = 0;
  let cursor = offset;
  for (let i = 0; i < words.length; i++) {
    const start = Math.round(offset + (acc / total) * span);
    acc += weights[i];
    const end = Math.round(offset + (acc / total) * span);
    out.push({ word: words[i], index: i, start, end: Math.max(start + 1, end) });
    cursor = end;
  }
  // pin the last word's end to the beat, so nothing drifts off the end
  out[out.length - 1].end = Math.max(out[out.length - 1].start + 1, Math.round(offset + span));
  if (cursor > offset + span) out[out.length - 1].end = offset + span;
  return out;
}

/** The first word index matching `needle`, comparing letters and digits only. */
function findWord(timeline, needle) {
  const want = norm(needle);
  if (!want) return -1;
  const exact = timeline.findIndex((w) => norm(w.word) === want);
  if (exact >= 0) return exact;
  // a cue may name the stem ("encrypt" for "encrypted"); first hit wins
  return timeline.findIndex((w) => norm(w.word).startsWith(want) || want.startsWith(norm(w.word)));
}

/**
 * Resolve a beat's authored cues into frames.
 *
 * @param {{at:string, tag?:string, note?:string}[]} cues
 * @param {string} narration
 * @param {number} frames  beat length
 * @returns {{index:number, tag:string, at:string, wordIndex:number, start:number, end:number}[]}
 */
export function resolveCues(cues, narration, frames, offset = 0) {
  const list = (cues || []).filter(Boolean);
  if (!list.length) return [];
  const timeline = wordTimeline(narration, frames, offset);
  if (!timeline.length) return [];

  const resolved = list.map((cue, index) => {
    const wordIndex = findWord(timeline, cue.at);
    const start = wordIndex >= 0 ? timeline[wordIndex].start : Math.round((index / list.length) * frames);
    return {
      index,
      at: String(cue.at || ''),
      tag: String(cue.tag || ''),
      wordIndex,
      start: Math.max(0, Math.min(frames - 1, start)),
      end: frames,
    };
  });

  // monotonic: a cue never starts before the one before it
  for (let i = 1; i < resolved.length; i++) {
    if (resolved[i].start < resolved[i - 1].start) resolved[i].start = resolved[i - 1].start;
  }
  for (let i = 0; i < resolved.length; i++) {
    resolved[i].end = i + 1 < resolved.length ? Math.max(resolved[i].start + 1, resolved[i + 1].start) : frames;
  }
  return resolved;
}

/** Which cue is live at `frame` (absolute), and how far through it we are. */
export function cueAt(beatCues, frame, beatStart = 0) {
  if (!beatCues || !beatCues.length) return null;
  const local = frame - beatStart;
  let live = null;
  for (const cue of beatCues) {
    if (cue.start <= local) live = cue;
    else break;
  }
  // before the first cue the beat is still "arriving": hold the first state
  if (!live) live = { ...beatCues[0], start: 0 };
  const span = Math.max(1, live.end - live.start);
  const p = Math.max(0, Math.min(1, (local - live.start) / span));
  return { ...live, p, count: beatCues.length };
}

/** Problems with an authored cue list, for the compiler to report. */
export function validateCues(cues, narration) {
  const problems = [];
  const list = cues || [];
  if (!list.length) return problems;
  const timeline = wordTimeline(narration, 1000, 0);
  const seen = new Set();
  for (const cue of list) {
    if (!cue.at) problems.push('a cue has no `at` word');
    else if (findWord(timeline, cue.at) < 0) problems.push(`cue word "${cue.at}" is not in the narration`);
    if (cue.at && seen.has(norm(cue.at))) problems.push(`cue word "${cue.at}" is used twice in one beat`);
    if (cue.at) seen.add(norm(cue.at));
  }
  return problems;
}

export { norm as normaliseWord, findWord };
