/**
 * nao.js - the character layer.
 *
 * Twelve head sprites, one per viseme, cut from the talking-head sheet by
 * tools/build-nao-sprites.py. Everything else here is placement: which sprite,
 * how big, where, and how much idle motion.
 *
 * The mouth is driven by the schedule compiled from the shot's voice-over line,
 * never by audio and never by a random number generator, so the same frame is
 * always the same face.
 */

import { P, alpha } from './palette.js';

export const VISEME_NAMES = ['rest', 'A', 'E', 'I', 'O', 'U', 'W', 'MBP', 'FV', 'L', 'SZTD', 'CGK'];

/**
 * Framing per placement. `bottom` is deliberately *behind* the caption card for
 * the full-frame shots: the sprite is cropped at the chest, so letting the card
 * hide that edge is cleaner than drawing a visible cut.
 */
const FRAMING = {
  center: { h: 930, cx: 540, bottom: 1630 },
  left: { h: 880, cx: 296, bottom: 1630 },
  'split-right': { h: 820, cx: 838, bottom: 1640 },
  'corner-br': { h: 600, cx: 840, bottom: 1520 },
  'corner-bl': { h: 600, cx: 240, bottom: 1520 },
};

const sprites = new Map();
const masked = new Map();
let layerFactory = null;

/**
 * The stage has to run in a browser and in Node, and masking a sprite needs an
 * offscreen canvas. Rather than pull in a dependency, the host injects a factory:
 *   browser -> () => document.createElement('canvas')
 *   node    -> () => require('@napi-rs/canvas').createCanvas(w, h)
 */
export function setLayerFactory(fn) {
  layerFactory = fn;
  masked.clear();
}

/** A sprite with its bottom edge faded out, so the chest never cuts hard. */
function maskedSprite(name, img) {
  if (!layerFactory || !img) return img;
  const hit = masked.get(name);
  if (hit) return hit;

  const layer = layerFactory(img.width || 416, img.height || 420);
  const lc = layer.getContext('2d');
  lc.drawImage(img, 0, 0, layer.width, layer.height);
  lc.globalCompositeOperation = 'destination-out';
  // The sheet is cropped at the chest, so the crop edge itself has to disappear.
  // Fade from just under the choker: head and neck stay solid, the shoulders
  // dissolve into the paper.
  const fadeFrom = layer.height * 0.60;
  const g = lc.createLinearGradient(0, fadeFrom, 0, layer.height * 0.94);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,1)');
  lc.fillStyle = g;
  lc.fillRect(0, fadeFrom, layer.width, layer.height - fadeFrom);
  masked.set(name, layer);
  return layer;
}

/** Inject already-decoded images (used by the tests and by the player). */
export function setSprites(map) {
  sprites.clear();
  masked.clear();
  for (const [k, v] of Object.entries(map)) sprites.set(k, v);
}

/** Load all twelve from a base URL, e.g. '/assets/nao/heads'. */
export async function loadSprites(base = '/assets/nao/heads') {
  const ImageCtor = globalThis.Image;
  if (!ImageCtor) throw new Error('loadSprites needs a browser (no Image constructor)');
  const entries = await Promise.all(
    VISEME_NAMES.map(
      (name) =>
        new Promise((resolve) => {
          const img = new ImageCtor();
          img.onload = () => resolve([name, img]);
          img.onerror = () => resolve([name, null]);
          img.src = `${base}/${name}.png`;
        })
    )
  );
  setSprites(Object.fromEntries(entries.filter(([, img]) => img)));
  return sprites.size;
}

export function spriteCount() {
  return sprites.size;
}

/** Binary search the change-point list for the viseme live at `frame`. */
export function entryAt(schedule, frame) {
  if (!schedule || !schedule.length) return { f: 0, v: 'rest', o: 0 };
  let lo = 0;
  let hi = schedule.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (schedule[mid].f <= frame) lo = mid;
    else hi = mid - 1;
  }
  return schedule[lo];
}

/** Which viseme is on screen for this shot at this frame, plus blend info. */
export function visemeAt(shot, frame) {
  const local = frame - shot.start - (shot.mouth?.offset ?? 0);
  const schedule = shot.mouth?.schedule;
  if (!schedule || local < 0) return { v: 'rest', blend: 0, next: null };
  const current = entryAt(schedule, local);
  const idx = schedule.indexOf(current);
  const next = idx + 1 < schedule.length ? schedule[idx + 1] : null;
  const untilNext = next ? next.f - local : Infinity;
  if (next && untilNext >= 0 && untilNext < 2) {
    return { v: current.v, next: next.v, blend: (2 - untilNext) / 2 };
  }
  return { v: current.v, next: null, blend: 0 };
}

function drawSprite(ctx, img, x, y, h, a = 1) {
  if (!img) return;
  const ratio = (img.width || 416) / (img.height || 420);
  const w = h * ratio;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.drawImage(img, x - w / 2, y - h, w, h);
  ctx.restore();
}

/**
 * Draw Nao for a shot. Returns the sprite box, or null when she is not in frame
 * (inserts, POV, the save frame).
 */
export function drawNao(ctx, shot, frame, t) {
  const box = FRAMING[shot.placement];
  if (!box) return null;

  const { v, next, blend } = visemeAt(shot, frame);
  const img = maskedSprite(v, sprites.get(v) || sprites.get('rest'));
  const imgNext = next ? maskedSprite(next, sprites.get(next)) : null;

  // Idle: a slow breath and a small sway. Never more than 4 px: she is drawn,
  // not animated with a spring.
  const bob = Math.sin(frame / 19) * 3;
  const sway = Math.sin(frame / 27) * 3;
  const breathe = 1 + 0.004 * Math.sin(frame / 23);
  const push = 1 + 0.02 * t;

  const h = box.h * breathe * push;
  const cx = box.cx + sway + (shot.placement.startsWith('corner') ? 8 * (t - 0.5) : 0);
  const bottom = box.bottom + bob;

  // A soft grounding shadow under the fade, so she sits on the page instead of
  // floating. Kept low and wide: it is a shadow, not a spotlight.
  ctx.save();
  const g = ctx.createRadialGradient(cx, bottom - h * 0.1, 6, cx, bottom - h * 0.1, h * 0.4);
  g.addColorStop(0, alpha(P.ink, 0.10));
  g.addColorStop(1, alpha(P.ink, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, bottom - h * 0.1, h * 0.4, h * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawSprite(ctx, img, cx, bottom, h, 1);
  if (imgNext && blend > 0) drawSprite(ctx, imgNext, cx, bottom, h, blend);

  return { cx, bottom, h };
}

export function framingFor(placement) {
  return FRAMING[placement] || null;
}
