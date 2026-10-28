/**
 * render.js - the frame function.
 *
 *   drawFrame(ctx, reel, frame)
 *
 * Pure with respect to (reel, frame): the same frame always draws the same
 * pixels. No clock, no randomness, no audio. That is what makes the preview
 * scrubbable, the still export honest, and a future video export byte-stable.
 *
 * A frame is composed in five passes: paper, world, her, chrome, transition.
 */

import { drawWorld } from './worlds.js';
import { drawNao } from './nao.js';
import { drawCaption, drawBadge, drawProgress, drawGuides } from './chrome.js';
import { P, alpha } from './palette.js';

const W = 1080;

export function shotAt(reel, frame) {
  const f = Math.max(0, Math.min(reel.frames - 1, frame));
  let lo = 0;
  let hi = reel.shots.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (reel.shots[mid].start <= f) lo = mid;
    else hi = mid - 1;
  }
  return reel.shots[lo];
}

function shotProgress(shot, frame) {
  return Math.max(0, Math.min(1, (frame - shot.start) / Math.max(1, shot.frames)));
}

/**
 * The one non-hard cut in the reel: a 10-frame horizontal whip. Drawn as a few
 * offset ghosts plus a streak, which is exactly how a 90-degree whip reads at
 * 30 fps and costs nothing to render.
 */
function drawWhip(ctx, shot, frame) {
  if (shot.transition !== 'whip') return;
  const local = frame - shot.start;
  const len = 10;
  if (local >= len) return;

  const p = local / len;
  const ghosts = 4;
  ctx.save();
  for (let i = ghosts; i >= 1; i--) {
    const a = (1 - p) * 0.10 * (1 - i / (ghosts + 1));
    const dx = (1 - p) * 320 * (i / ghosts);
    ctx.globalAlpha = a;
    ctx.fillStyle = i % 2 ? P.accent : P.ink;
    ctx.fillRect(-dx, 0, W, 1920);
  }
  // the streak itself
  ctx.globalAlpha = (1 - p) * 0.5;
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, alpha(P.accent, 0));
  g.addColorStop(0.5, alpha(P.accent, 0.55));
  g.addColorStop(1, alpha(P.accent, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 860 + p * 200, W, 220 * (1 - p) + 40);
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} reel  compiled reel.json
 * @param {number} frame 0 .. reel.frames-1
 * @param {object} [opts] { guides: boolean }
 */
export function drawFrame(ctx, reel, frame, opts = {}) {
  const f = Math.max(0, Math.min(reel.frames - 1, Math.round(frame)));
  const shot = shotAt(reel, f);
  const t = shotProgress(shot, f);

  ctx.save();
  ctx.clearRect(0, 0, W, 1920);

  // 1 + 2: paper and world, through the shot's own lens.
  //
  // Every shot gets its own slight scale and a slow push, so a cut between two
  // shots of the same world is still a cut: the eye sees the camera move, not a
  // duplicated frame. The offsets are small on purpose - 3 % reads as a lens,
  // 10 % reads as a mistake.
  const lens = 1 + 0.028 * ((shot.n % 3) - 1) + 0.02 * t;
  ctx.save();
  ctx.translate(W / 2, 880);
  ctx.scale(lens, lens);
  ctx.translate(-W / 2, -880);
  drawWorld(ctx, shot, f, t);
  ctx.restore();

  // 3: her
  drawNao(ctx, shot, f, t);

  // 4: chrome
  drawBadge(ctx, reel);
  drawCaption(ctx, shot, f);
  drawProgress(ctx, reel, f);

  // 5: transition
  drawWhip(ctx, shot, f);

  if (opts.guides) drawGuides(ctx);
  ctx.restore();
  return shot;
}

/** A one-line description of what is on screen, for the player and the tests. */
export function describeFrame(reel, frame) {
  const shot = shotAt(reel, frame);
  return {
    shot: shot.n,
    code: shot.code,
    lens: shot.lens,
    world: shot.world,
    placement: shot.placement,
    t: shotProgress(shot, frame),
    vo: shot.vo,
  };
}
