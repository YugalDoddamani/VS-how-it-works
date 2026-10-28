/**
 * lipsync.js - build a per-frame mouth schedule for a beat, from its text.
 *
 * Pure functions only. Deterministic: the same (text, timing) always yields the
 * same schedule, so a re-render is byte-identical and a silent episode still
 * animates the mouth correctly.
 *
 * The schedule stores only *changes*, so a 9 s beat is ~80 entries rather than
 * 270, which keeps episode.json reviewable by a human.
 *
 * See docs/11-lip-sync.md.
 */
(function (global) {
  'use strict';

  var Visemes =
    typeof require === 'function' && typeof module !== 'undefined'
      ? require('./visemes.js')
      : global.Visemes;

  var MIN_HOLD_FRAMES = 2; // shorter than 66 ms at 30 fps reads as flicker
  var BLEND_FRAMES = 2; // coarticulation ramp
  var SENTENCE_REST = 8;
  var COMMA_REST = 4;

  function clamp(value, lo, hi) {
    return Math.min(hi, Math.max(lo, value));
  }

  /** Merge adjacent visemes until every hold is at least `min` frames. */
  function mergeToMinimum(entries, min) {
    var out = entries.map(function (e) {
      return { v: e.v, start: e.start, len: e.len };
    });
    var changed = true;
    while (changed) {
      changed = false;
      for (var i = 0; i < out.length; i++) {
        if (out[i].len >= min) continue;
        // Prefer merging into a neighbour with the same viseme.
        if (i > 0 && out[i - 1].v === out[i].v) {
          out[i - 1].len += out[i].len;
          out.splice(i, 1);
        } else if (i + 1 < out.length && out[i + 1].v === out[i].v) {
          out[i].len += out[i + 1].len;
          out.splice(i + 1, 1);
        } else if (i > 0) {
          out[i - 1].len += out[i].len;
          out.splice(i, 1);
        } else if (out.length > 1) {
          out[i + 1].len += out[i].len;
          out[i + 1].start = out[i].start;
          out.splice(i, 1);
        } else {
          out[i].len = min;
        }
        changed = true;
        break;
      }
    }
    return out;
  }

  /**
   * Turn a list of {v, len} shapes into contiguous {start, len} entries of
   * exactly `totalFrames`, by scaling proportionally and fixing the remainder on
   * the last entry.
   */
  function fitToFrames(shapes, totalFrames) {
    if (!shapes.length) return [];
    var sum = shapes.reduce(function (acc, s) {
      return acc + s.len;
    }, 0);
    if (!sum) return [];

    var scale = totalFrames / sum;
    var out = [];
    var cursor = 0;
    for (var i = 0; i < shapes.length; i++) {
      var len = Math.max(1, Math.round(shapes[i].len * scale));
      out.push({ v: shapes[i].v, start: cursor, len: len });
      cursor += len;
    }
    // Absorb rounding drift on the final entry so the total is exact.
    var last = out[out.length - 1];
    last.len += totalFrames - (last.start + last.len);
    if (last.len < 1) last.len = 1;

    // Trim anything past the end (can happen if the final entry went negative).
    return out.filter(function (e) {
      return e.start < totalFrames && e.len > 0;
    });
  }

  /**
   * Build a schedule.
   *
   * @param {string} text           narration for the beat
   * @param {number} totalFrames    beat duration in frames
   * @param {object} [options]
   *   - emphasis: array of words to widen by 15 %
   *   - mode: 'talking-head' | 'mid' | 'full-body' (reduction only)
   * @returns {{mode:string, fps:number, frames:Array<{f:number,v:string,o:number}>}}
   */
  function buildSchedule(text, totalFrames, options) {
    var opts = options || {};
    var frames = Math.max(1, Math.round(totalFrames));
    var words = String(text || '').split(/\s+/).filter(Boolean);

    if (!words.length) {
      return { mode: opts.mode || 'full-body', fps: opts.fps || 30, frames: [{ f: 0, v: 'rest', o: 0 }] };
    }

    var counts = words.map(Visemes.graphemeCount);
    var chars = counts.reduce(function (a, b) {
      return a + b;
    }, 0);
    if (!chars) {
      return { mode: opts.mode || 'full-body', fps: opts.fps || 30, frames: [{ f: 0, v: 'rest', o: 0 }] };
    }

    // Reserve time for the rests between and after words, then distribute the
    // remainder in proportion to characters. Speaking rate is therefore even
    // across the beat, which is what makes it look like a considered read.
    var gapFrames = words.length ? clamp(Math.round((frames / chars) * 0.6), 1, 4) : 0;
    var endRest = /[.!?]$/.test(words[words.length - 1]) ? SENTENCE_REST : COMMA_REST;
    var restsTotal = gapFrames * (words.length - 1) + endRest;
    var speakFrames = Math.max(words.length * 2, frames - restsTotal);
    var framesPerChar = speakFrames / chars;

    var emphasis = (opts.emphasis || []).map(function (w) {
      return Visemes.normaliseWord(w);
    });

    var shapes = [{ v: 'rest', len: Math.max(1, Math.round(framesPerChar)) }];
    words.forEach(function (word, index) {
      var seq = Visemes.visemesForWord(word);
      var wordChars = counts[index] || seq.length;
      var per = (wordChars * framesPerChar) / seq.length;
      var isEmphasis = emphasis.indexOf(Visemes.normaliseWord(word)) !== -1;

      seq.forEach(function (v) {
        shapes.push({ v: v, len: Math.max(1, Math.round(per)), emphasis: isEmphasis });
      });

      if (index < words.length - 1) {
        // A bilabial or W next pulls the previous shape toward U: the mouth
        // closes before the m, which is what stops it looking like a slideshow.
        var next = Visemes.visemesForWord(words[index + 1])[0];
        if (next === 'MBP' || next === 'W') {
          var prev = shapes[shapes.length - 1];
          if (prev && prev.v !== 'rest' && prev.len > BLEND_FRAMES) {
            prev.len -= BLEND_FRAMES;
            shapes.push({ v: 'U', len: BLEND_FRAMES });
          }
        }
        shapes.push({ v: 'rest', len: gapFrames });
      } else {
        shapes.push({ v: 'rest', len: Math.max(2, endRest) });
      }
    });

    // Reserve frame 0 and the last `tail` frames for a closed mouth, so the beat
    // always starts and ends on `rest` no matter how the scaling rounds.
    var tail = Math.min(SENTENCE_REST, Math.max(2, Math.round(frames * 0.04)));
    var window = Math.max(1, frames - 1 - tail);
    var fitted = mergeToMinimum(fitToFrames(shapes, window), MIN_HOLD_FRAMES).map(function (e) {
      return { v: e.v, start: e.start + 1, len: e.len, emphasis: e.emphasis };
    });

    fitted = [{ v: 'rest', start: 0, len: 1 }]
      .concat(fitted)
      .concat([{ v: 'rest', start: 1 + window, len: frames - 1 - window }]);

    // Collapse to change-points with strictly increasing frames, keeping the
    // shape that actually holds at each frame.
    var byFrame = [];
    for (var j = 0; j < fitted.length; j++) {
      var e = fitted[j];
      var start = Math.min(e.start, frames - 1);
      var prev = byFrame[byFrame.length - 1];
      if (prev && prev.f === start) {
        byFrame[byFrame.length - 1] = { f: start, v: e.v, openness: Visemes.opennessOf(e.v), emphasis: e.emphasis };
      } else if (prev && start < prev.f) {
        /* out of order after clamping: drop */
      } else {
        byFrame.push({ f: start, v: e.v, openness: Visemes.opennessOf(e.v), emphasis: e.emphasis });
      }
    }

    var schedule = [];
    var prevV = null;
    for (var k = 0; k < byFrame.length; k++) {
      var entry = byFrame[k];
      if (entry.v === prevV) continue;
      var open = entry.emphasis ? clamp(entry.openness * 1.15, 0, 1) : entry.openness;
      schedule.push({ f: entry.f, v: entry.v, o: Math.round(open * 100) / 100 });
      prevV = entry.v;
    }

    if (!schedule.length) schedule.push({ f: 0, v: 'rest', o: 0 });
    if (schedule[0].f !== 0) schedule.unshift({ f: 0, v: 'rest', o: 0 });
    if (schedule[0].v !== 'rest') schedule[0] = { f: 0, v: 'rest', o: 0 };
    if (schedule[schedule.length - 1].v !== 'rest') {
      schedule.push({ f: Math.max(1, frames - 1), v: 'rest', o: 0 });
    }

    return {
      mode: opts.mode || 'full-body',
      fps: opts.fps || 30,
      frames: schedule,
    };
  }

  /** Binary search the change-point list for the entry live at `frame`. */
  function entryAt(schedule, frame) {
    var list = (schedule && schedule.frames) || [];
    if (!list.length) return { f: 0, v: 'rest', o: 0 };
    var lo = 0;
    var hi = list.length - 1;
    while (lo < hi) {
      var mid = Math.floor((lo + hi + 1) / 2);
      if (list[mid].f <= frame) lo = mid;
      else hi = mid - 1;
    }
    return list[lo];
  }

  /**
   * Mouth state at a frame, with a short blend across the boundary so the shape
   * ramps instead of cutting.
   */
  function mouthStateAt(schedule, frame) {
    var list = (schedule && schedule.frames) || [];
    if (!list.length) return { v: 'rest', o: 0, blend: 0 };
    var current = entryAt(schedule, frame);
    var index = list.indexOf(current);
    var next = index + 1 < list.length ? list[index + 1] : null;
    var since = frame - current.f;

    if (next && BLEND_FRAMES > 0) {
      var untilNext = next.f - frame;
      if (untilNext >= 0 && untilNext < BLEND_FRAMES) {
        // t ramps 0 -> 1 across the last BLEND_FRAMES frames before the change.
        var t = (BLEND_FRAMES - untilNext) / BLEND_FRAMES;
        return {
          v: current.v,
          next: next.v,
          blend: Math.round(t * 100) / 100,
          o: Math.round((current.o + (next.o - current.o) * t) * 100) / 100,
        };
      }
    }
    return { v: current.v, o: current.o, blend: 0 };
  }

  /**
   * Reduced three-state mouth for full-body framing, where per-viseme detail is
   * sub-pixel.
   */
  function postureFor(openness) {
    if (openness < 0.15) return 'closed';
    if (openness < 0.6) return 'mid';
    return 'open';
  }

  /** Validate a schedule built here or loaded from episode.json. */
  function validateSchedule(schedule, totalFrames) {
    var issues = [];
    if (!schedule || !Array.isArray(schedule.frames)) {
      return [{ severity: 'error', message: 'lipSync.frames must be an array.' }];
    }
    if (!schedule.frames.length) {
      issues.push({ severity: 'error', message: 'lipSync.frames is empty.' });
      return issues;
    }
    if (schedule.frames[0].f !== 0) {
      issues.push({ severity: 'error', message: 'lipSync.frames must start at frame 0.' });
    }
    schedule.frames.forEach(function (entry, i) {
      if (!Visemes.isViseme(entry.v)) {
        issues.push({ severity: 'error', message: 'Unknown viseme "' + entry.v + '" at index ' + i + '.' });
      }
      if (!(entry.o >= 0 && entry.o <= 1)) {
        issues.push({ severity: 'error', message: 'openness out of range at index ' + i + '.' });
      }
      if (i > 0 && entry.f <= schedule.frames[i - 1].f) {
        issues.push({ severity: 'error', message: 'lipSync frames must be strictly increasing (index ' + i + ').' });
      }
    });
    if (typeof totalFrames === 'number' && schedule.frames[0].f >= totalFrames) {
      issues.push({ severity: 'error', message: 'lipSync schedule starts after the beat ends.' });
    }
    if (schedule.frames[schedule.frames.length - 1].v !== 'rest') {
      issues.push({ severity: 'warn', message: 'lipSync schedule does not end on "rest".' });
    }
    return issues;
  }

  var LipSync = {
    MIN_HOLD_FRAMES: MIN_HOLD_FRAMES,
    BLEND_FRAMES: BLEND_FRAMES,
    buildSchedule: buildSchedule,
    entryAt: entryAt,
    mouthStateAt: mouthStateAt,
    postureFor: postureFor,
    validateSchedule: validateSchedule,
    mergeToMinimum: mergeToMinimum,
    fitToFrames: fitToFrames,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = LipSync;
  } else {
    global.LipSync = LipSync;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
