/**
 * nao.js - the character layer, v2: a drawn rig, not a floating face.
 *
 * Assets (built by tools/build-nao-rig.py):
 *   assets/nao/rig/body.png          full body, arms down, head removed
 *   assets/nao/rig/heads/*.png       nine expression heads, pre-aligned to the body
 *   assets/nao/rig/manifest.json     anchors + which head is which
 *
 * The head is swapped per frame from three inputs:
 *   the mouth shape implied by the lip-sync schedule,
 *   the blink cycle (deterministic, seeded by shot),
 *   the shot's mood (the sign-off gets the smile).
 *
 * Everything else is motion: breathing, a slow weight shift, and a head that
 * lags the body by a few frames so the hair reads as loose rather than pasted.
 *
 * Pure: no clock, no random. Frame N always draws the same thing.
 */

import { P, alpha } from './palette.js';

/** Mouth shapes the expression sheet provides. */
export const MOUTHS = ['closed', 'small', 'mid', 'open', 'oh'];
export const EYES = ['open', 'closed', 'half', 'wide', 'closed-smile'];

const rig = {
  manifest: null,
  body: null,
  heads: new Map(),
};

/** Hosts inject an image loader: browser Image, or @napi-rs/canvas loadImage. */
export function setRig({ manifest, body, heads }) {
  rig.manifest = manifest;
  rig.body = body;
  rig.heads = new Map(Object.entries(heads));
}

export function rigReady() {
  return Boolean(rig.body && rig.manifest && rig.heads.size >= 5);
}

export function rigInfo() {
  return {
    ready: rigReady(),
    heads: [...rig.heads.keys()],
    body: rig.body ? { width: rig.body.width, height: rig.body.height } : null,
  };
}

// ---------------------------------------------------------------------------
// head selection
// ---------------------------------------------------------------------------

/** Which head to draw for (mouth shape, eye state). */
export function pickHead(mouth, eyes) {
  const m = rig.manifest;
  if (!m) return 'rest';

  // The sheet's own vocabulary: only a few (mouth, eyes) pairs exist, so fall
  // back in a fixed order rather than inventing a head that was never drawn.
  if (eyes === 'closed' || eyes === 'half') {
    const blinkHead = m.byEyes[eyes] || m.byEyes.closed || 'blink';
    if (eyes === 'closed') return blinkHead;
    return blinkHead;
  }
  if (eyes === 'closed-smile') {
    // a closed-eye head whose mouth is open reads as a laugh; only use it when
    // the mouth is actually moving, otherwise it looks like a permanent giggle
    return mouth === 'open' || mouth === 'mid' ? (m.byEyes['closed-smile'] || 'smile') : 'rest';
  }
  if (mouth === 'oh') return m.byMouth.oh || 'oh';
  if (mouth === 'open') return m.byMouth.open || 'open';
  if (mouth === 'mid') return m.byMouth.mid || 'mid';
  if (mouth === 'small') return m.byMouth.small || 'small';
  return m.byMouth.closed || 'rest';
}

/** Openness 0..1 -> one of the five drawn mouth shapes. */
export function mouthShape(viseme, openness, rounded) {
  if (!viseme || openness <= 0.02) return 'closed';
  if (rounded && openness > 0.35) return 'oh';
  if (openness < 0.42) return 'small';
  if (openness < 0.78) return 'mid';
  return 'open';
}

// ---------------------------------------------------------------------------
// timing helpers
// ---------------------------------------------------------------------------

/** Binary search the change-point list for the entry live at `frame`. */
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

const ROUNDED = new Set(['O', 'U', 'W']);

/** Blink: a 5-frame cycle every ~3.2 s, offset per shot so cuts never sync up. */
export function blinkAt(shot, frame) {
  const period = 96 + ((shot.n * 37) % 28);      // 3.2–4.1 s
  const phase = (shot.n * 53) % period;
  const at = (frame - shot.start + phase) % period;
  if (at === 0) return 'half';
  if (at === 1 || at === 2) return 'closed';
  if (at === 3) return 'half';
  return 'open';
}

/** The look on her face when she is not talking. */
function idleEyes(shot, frame) {
  const blink = blinkAt(shot, frame);
  if (blink !== 'open') return blink;
  // hold a smile at the very end of the reel, on the sign-off
  if (shot.n === shot.__lastShot && shot.__lastShot) return 'open';
  return 'open';
}

// ---------------------------------------------------------------------------
// framing
// ---------------------------------------------------------------------------

/**
 * Framing.
 *
 * `head` is the drawn height of the head, in canvas px. The figure follows from
 * the rig's proportions (the head is 30 % of the body), so a big head means a
 * tight shot and the legs simply run off the bottom of the canvas.
 *
 *   head 640  → head to upper thigh   (CU / ECU: "upper body, big")
 *   head 470  → head to mid-calf      (MCU)
 *   head 300  → the whole figure      (wide)
 *   head 360  → head and torso only   (CORNER, sitting in the bottom-right)
 *
 * `top` is where the top of her hair sits. Nothing here is scaled relative to
 * the canvas: the numbers *are* the composition.
 */
const FRAMING = {
  // placement        close (CU/ECU)      medium (MCU/SPLIT)    wide
  center: { close: [620, 250, 540], medium: [470, 520, 540], wide: [380, 620, 540] },
  left: { close: [540, 300, 470], medium: [420, 620, 430], wide: [350, 660, 360] },
  'split-right': { close: [540, 290, 812], medium: [430, 560, 800], wide: [350, 640, 812] },
  'corner-br': { close: [380, 960, 828], medium: [340, 1010, 826], wide: [300, 1050, 830] },
  'corner-bl': { close: [380, 960, 252], medium: [340, 1010, 254], wide: [300, 1050, 250] },
};

/** CU/ECU -> close, MCU/SPLIT/CORNER -> medium, everything else -> wide. */
function sizeClass(code) {
  if (code === 'CU' || code === 'ECU') return 'close';
  if (code === 'MCU' || code === 'SPLIT' || code === 'CORNER' || code === 'OTS') return 'medium';
  return 'wide';
}

/** The framing preset for a compiled shot, or null when she is not in frame. */
export function framingFor(placement, code) {
  const row = FRAMING[placement];
  if (!row) return null;
  const [head, top, cx] = row[sizeClass(code)] || row.medium;
  return { head, top, cx, scale: head / (rig.manifest?.anchor?.headWidth || 309) };
}

// ---------------------------------------------------------------------------
// drawing
// ---------------------------------------------------------------------------

/**
 * Draw the head with a small horizontal shear that grows towards the bottom of
 * the sprite. The top of the skull stays put and the bob swings, which is what
 * makes the hair read as loose instead of painted on. Six bands is enough: more
 * seams show at 1080p, fewer look like a wobble.
 */
const SWAY_BANDS = 7;

function drawSwayedHead(ctx, img, x, y, w, h, amount) {
  if (!img) return;
  if (!amount) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  const bandH = h / SWAY_BANDS;          // destination band height
  const srcBand = img.height / SWAY_BANDS; // source band height (they differ)
  const overlap = 0.8;                    // destination px, kills hairline seams
  for (let i = 0; i < SWAY_BANDS; i++) {
    // 0 at the scalp, 1 at the chin/chest
    const k = i / (SWAY_BANDS - 1);
    const shift = amount * k * k;
    const dy = i * bandH;
    const dh = i === SWAY_BANDS - 1 ? h - dy : Math.min(bandH + overlap, h - dy);
    ctx.drawImage(
      img,
      0,
      i * srcBand,
      img.width,
      Math.min(srcBand + (overlap / h) * img.height, img.height - i * srcBand),
      x + shift,
      y + dy,
      w,
      dh
    );
  }
}

/**
 * @returns {{x:number,y:number,w:number,h:number}|null} her box, for tests
 */
export function drawNao(ctx, shot, frame, t) {
  if (!rigReady()) return null;
  const box = framingFor(shot.placement, shot.code);
  if (!box) return null;

  const { width: bw, height: bh } = rig.body;
  const figureH = bh * box.scale;
  const figureW = bw * box.scale;

  // ---- motion ------------------------------------------------------------
  const f = frame;
  const breath = Math.sin((f / 30) * ((Math.PI * 2) / 3.6));      // ~3.6 s
  const sway = Math.sin((f / 30) * ((Math.PI * 2) / 8.3));        // ~8.3 s
  const headLag = Math.sin(((f - 5) / 30) * ((Math.PI * 2) / 5.1));

  const breatheY = 1 + 0.008 * breath;
  const bodyRot = (sway * 0.5 * Math.PI) / 180;                    // ±0.5°
  const headRot = (headLag * 1.1 * Math.PI) / 180;                 // ±1.1°
  const headDx = headLag * box.head * 0.012;
  const headDy = breath * box.head * 0.004;
  const hairSway = headLag * box.head * 0.022;                     // bands shear by up to this
  const tilt = Math.sin((f / 30) * ((Math.PI * 2) / 11.4)) * 0.5;   // a slow, listening tilt

  // A push-in over the shot, tiny: it keeps a two-second shot from feeling dead
  const push = 1 + 0.012 * t;

  const cx = box.cx;
  // pivot: her feet for a full figure, her neck for a close-up
  const pivotY = box.top + figureH;

  // ---- shadow ------------------------------------------------------------
  ctx.save();
  const groundY = Math.min(1920, box.top + figureH * 0.995);
  if (box.top + figureH < 1900) {
    const g = ctx.createRadialGradient(cx, groundY - 14, 8, cx, groundY - 14, figureW * 0.62);
    g.addColorStop(0, alpha(P.ink, 0.16));
    g.addColorStop(1, alpha(P.ink, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 14, figureW * 0.62, figureH * 0.026, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // ---- body --------------------------------------------------------------
  ctx.save();
  ctx.translate(cx, pivotY);
  ctx.rotate(bodyRot);
  ctx.scale(push, push * breatheY);
  ctx.translate(-cx, -pivotY);
  const bx = cx - figureW / 2;
  const by = box.top;
  ctx.drawImage(rig.body, bx, by, figureW, figureH);
  ctx.restore();

  // ---- head --------------------------------------------------------------
  const viseme = headState(shot, frame);
  const headName = viseme.head;

  ctx.save();
  ctx.translate(cx + headDx, by + headDy);
  ctx.rotate(headRot + bodyRot + ((tilt * Math.PI) / 180));
  ctx.scale(push, push);
  // The head sprite is a canvas the same size as the body, pre-aligned, so it is
  // drawn at the body's size and position and lands exactly on the neck.
  drawSwayedHead(
    ctx,
    rig.heads.get(headName) || rig.heads.get('rest'),
    -figureW / 2,
    0,
    figureW,
    figureH,
    hairSway
  );
  ctx.restore();

  return { x: bx, y: by, w: figureW, h: figureH, head: headName, viseme: viseme.viseme };
}

/** The head + mouth state for a frame of a shot. */
export function headState(shot, frame) {
  const local = frame - shot.start - (shot.mouth?.offset ?? 0);
  const schedule = shot.mouth?.schedule || [];
  const current = local < 0 ? { v: 'rest', o: 0 } : entryAt(schedule, local);
  const mouth = mouthShape(current.v, current.o, ROUNDED.has(current.v));

  const blink = blinkAt(shot, frame);
  const mood = shot.mood || 'neutral';

  let eyes = blink;
  if (mood === 'smile' && blink === 'open' && (mouth === 'closed' || mouth === 'small')) {
    // alternate: a two-second closed-eye smile reads as a mannequin
    const since = frame - shot.start;
    eyes = since % 100 < 46 ? 'closed-smile' : 'open';
  }

  return {
    head: pickHead(mouth === 'closed' && blink !== 'open' ? 'closed' : mouth, eyes),
    mouth,
    eyes,
    viseme: current.v,
    openness: current.o,
  };
}
