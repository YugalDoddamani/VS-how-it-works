/**
 * audio-cues.mjs - where the sound effects go.
 *
 * The picture is a pure function of (reel, frame); the soundtrack is a pure
 * function of the compiled shots. Every cue is tied to an *event* in a world -
 * the stamp lands, the toggles flip, the three cards drop in - and expressed as
 * a fraction of that shot, so re-timing the script moves the sound with it
 * instead of leaving it stranded.
 *
 * Gains are relative to the voice-over bed, which sits at about -16 LUFS.
 */

/** world -> [[fraction of shot, cue, gain], ...] */
const BY_WORLD = {
  pov_phone: [[0.18, 'swipe', 0.5], [0.55, 'pop', 0.35]],
  feed_ad: [[0.12, 'swipe', 0.5], [0.5, 'pop', 0.4]],
  bokeh: [[0.3, 'tick', 0.25]],
  shelf_one: [[0.2, 'pop', 0.45], [0.62, 'pop', 0.35]],
  shelf_two: [[0.18, 'pop', 0.45], [0.5, 'swipe', 0.4], [0.7, 'pop', 0.4]],
  note_open: [[0.1, 'paper', 0.5], [0.45, 'tick', 0.3], [0.7, 'tick', 0.3]],
  stamp: [[0.45, 'thud', 0.9]],
  link: [[0.3, 'pop', 0.4], [0.62, 'click', 0.5]],
  note_number: [[0.25, 'tick', 0.35], [0.55, 'pop', 0.45]],
  incognito: [[0.4, 'whoosh', 0.5]],
  spec_card: [[0.22, 'paper', 0.45]],
  browsers: [[0.3, 'click', 0.5], [0.44, 'click', 0.5], [0.58, 'click', 0.5]],
  app_icon: [[0.3, 'pop', 0.45]],
  settings: [[0.5, 'click', 0.55]],
  toggle: [[0.55, 'click', 0.6]],
  flat_grid: [[0.1, 'riser', 0.5], [0.55, 'chime', 0.35]],
  recap: [[0.12, 'pop', 0.4], [0.3, 'pop', 0.4], [0.48, 'pop', 0.4], [0.7, 'chime', 0.4]],
};

/** Every cut gets a quiet whoosh, so the reel has a pulse even on dialogue shots. */
const CUT_GAIN = 0.16;

/**
 * @param {object} reel compiled reel.json
 * @returns {{at:number, cue:string, gain:number, why:string}[]} seconds
 */
export function cuesFor(reel) {
  const cues = [];
  const last = reel.shots[reel.shots.length - 1];

  for (const shot of reel.shots) {
    const start = shot.start / reel.fps;
    const length = shot.frames / reel.fps;

    if (shot.transition === 'whip') {
      cues.push({ at: start, cue: 'whoosh', gain: 0.75, why: `shot ${shot.n} whip` });
    } else if (shot.n > 1) {
      cues.push({ at: start, cue: 'whoosh', gain: CUT_GAIN, why: `shot ${shot.n} cut` });
    }

    for (const [frac, cue, gain] of BY_WORLD[shot.world] || []) {
      cues.push({ at: start + length * frac, cue, gain, why: `shot ${shot.n} ${shot.world}` });
    }
  }

  // the sign-off gets the only pad in the reel
  cues.push({ at: last.start / reel.fps + 0.12, cue: 'warm', gain: 0.32, why: 'sign-off pad' });
  cues.push({ at: last.start / reel.fps + 0.5, cue: 'chime', gain: 0.28, why: 'sign-off chime' });

  return cues.sort((a, b) => a.at - b.at);
}
