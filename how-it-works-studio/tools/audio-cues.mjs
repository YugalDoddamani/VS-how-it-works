/**
 * audio-cues.mjs - where the sound effects go.
 *
 * The picture is a pure function of (reel, frame); the soundtrack is a pure
 * function of the compiled shots. Every cue is tied to an *event* in a world -
 * the stamp lands, the parcel passes the gate, the pile settles - and expressed
 * as a fraction of that shot, so re-timing the script moves the sound with it
 * instead of leaving it stranded.
 *
 * Gains are relative to the voice-over bed, which sits around -16 LUFS.
 */

/** world -> [[fraction of the shot, cue, gain], ...] */
const BY_WORLD = {
  // --- reels ---------------------------------------------------------------
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

  // --- episodes: the workshop ---------------------------------------------
  // The checklist ticks itself off.
  ep_checklist: [[0.18, 'tick', 0.35], [0.34, 'tick', 0.35], [0.5, 'tick', 0.35], [0.72, 'click', 0.4]],
  // Four crates land on the bench.
  ep_title: [[0.1, 'pop', 0.4], [0.22, 'pop', 0.4], [0.34, 'pop', 0.4], [0.46, 'pop', 0.4]],
  // The parcel is handed from crate to crate.
  ep_steps: [[0.1, 'pop', 0.4], [0.34, 'pop', 0.35], [0.6, 'pop', 0.35], [0.84, 'pop', 0.35]],
  // The rule stamps the work.
  ep_rules: [[0.12, 'paper', 0.4], [0.5, 'thud', 0.75], [0.74, 'pop', 0.4]],
  // The same machine, jamming.
  ep_rules_broken: [[0.3, 'thud', 0.6], [0.52, 'click', 0.5], [0.6, 'pop', 0.4]],
  // The pile settles, the funnel swallows, the guess drops.
  ep_pile: [[0.12, 'paper', 0.4], [0.42, 'pop', 0.4], [0.7, 'pop', 0.45]],
  // The loop turns: one tick per station.
  ep_loop: [[0.1, 'tick', 0.35], [0.35, 'tick', 0.35], [0.6, 'tick', 0.35], [0.85, 'tick', 0.35]],
  // The gate lifts, or it does not.
  ep_gate: [[0.22, 'click', 0.55], [0.55, 'tick', 0.3], [0.8, 'chime', 0.3]],
  // The sign, and the four crates left running.
  ep_outro: [[0.14, 'paper', 0.45], [0.45, 'pop', 0.3], [0.62, 'pop', 0.3], [0.78, 'chime', 0.35]],
};

/** A gate that fails gets a different set: metal, not a chime. */
const VARIANT_CUES = {
  'ep_gate:gate_fail': [[0.2, 'click', 0.55], [0.44, 'thud', 0.8], [0.62, 'pop', 0.35]],
};

/** Every cut gets a quiet whoosh, so the film has a pulse even on dialogue. */
const CUT_GAIN = 0.16;

/**
 * @param {object} reel compiled reel.json / episode.json
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

    const variant = shot.variant ? VARIANT_CUES[`${shot.world}:${shot.variant}`] : null;
    for (const [frac, cue, gain] of variant || BY_WORLD[shot.world] || []) {
      cues.push({ at: start + length * frac, cue, gain, why: `shot ${shot.n} ${shot.world}` });
    }
  }

  // the sign-off gets the only pad in the film
  cues.push({ at: last.start / reel.fps + 0.12, cue: 'warm', gain: 0.32, why: 'sign-off pad' });
  cues.push({ at: last.start / reel.fps + 0.5, cue: 'chime', gain: 0.28, why: 'sign-off chime' });

  return cues.sort((a, b) => a.at - b.at);
}
