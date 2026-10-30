/**
 * nao.js - the character layer, v3: whole figures, not a collage.
 *
 * v2 pasted an expression head onto a body drawing. Two drawings, two canvases,
 * two sets of proportions: the shoulders doubled, the neck seam showed, and
 * swapping head sprites moved her eyes four pixels on every mouth change. It
 * looked like what it was - a cut-out.
 *
 * v3 draws one complete figure per frame (assets/nao/poses/, built by
 * tools/build-nao-poses.py). Every pose is the same character, the same outfit,
 * scaled to the same height, with her feet on one baseline and her head on one
 * column. Nothing is composited onto anything.
 *
 * Because a pose is a whole drawing, it can only change on a cut. That is fine:
 * the reel averages a shot every two seconds. Within a shot she is animated as
 * one object - breathing, a slow weight shift, and a small nod that follows the
 * words. The lip-sync schedule still drives the frame, it just moves her body
 * instead of her face.
 *
 * Pure: no clock, no random. Frame N always draws the same thing.
 */

import { P, alpha } from './palette.js';
import { captionTop } from './chrome.js';

const poses = {
  manifest: null,
  images: new Map(),
};

/** Hosts inject an image loader: browser Image, or @napi-rs/canvas loadImage. */
export function setPoses({ manifest, images }) {
  poses.manifest = manifest;
  poses.images = new Map(Object.entries(images));
}

export function posesReady() {
  return Boolean(poses.manifest && poses.images.size >= 1);
}

export function poseInfo() {
  return {
    ready: posesReady(),
    poses: [...poses.images.keys()],
    canvas: poses.manifest?.canvas || null,
  };
}

// ---------------------------------------------------------------------------
// which drawing
// ---------------------------------------------------------------------------

/**
 * The gesture and the face are chosen by what is being said, not by the shot
 * index: the script's `Nao` column names the performance ("half-smile, one brow
 * up", "deadpan, flat stare") and compile-reel turns it into a pose. The table
 * below is only the fallback for a shot that never wrote a note down. Either
 * way it changes when the shot changes, so the drawing never flickers.
 */
const POSE_BY_WORLD = {
  //                 close (CU/ECU)      everywhere else
  pov_phone: ['thinking', 'thinking'],
  feed_ad: ['pointing', 'pointing'],
  bokeh: ['gesture', 'neutral'],
  shelf_one: ['gesture', 'presenting'],
  shelf_two: ['openhands2', 'warm'],
  note_open: ['pointing', 'presenting'],
  stamp: ['skeptical', 'skeptical'],
  link: ['openhands', 'openhands'],
  note_number: ['deadpan', 'deadpan'],
  incognito: ['skeptical', 'skeptical'],
  spec_card: ['warm', 'warm'],
  browsers: ['openhands2', 'warm'],
  app_icon: ['pointing', 'pointing'],
  settings: ['pointing', 'pointing'],
  toggle: ['pointing', 'pointing'],
  flat_grid: ['presenting', 'presenting'],
  recap: ['warm', 'warm'],

  // the long-form workshop worlds
  ep_checklist: ['skeptical', 'presenting'],
  ep_title: ['presenting', 'presenting'],
  ep_steps: ['onefinger', 'presenting'],
  ep_rules: ['pointing', 'pointing'],
  ep_rules_broken: ['nope', 'skeptical'],
  ep_pile: ['thinking', 'gesture'],
  ep_loop: ['onefinger', 'gesture'],
  ep_gate: ['skeptical', 'deadpan'],
  ep_outro: ['fingerheart', 'warm'],
};

/** CU/ECU -> close, MCU/SPLIT/CORNER/OTS -> medium, everything else -> wide. */
function sizeClass(code) {
  if (code === 'CU' || code === 'ECU') return 'close';
  if (code === 'MCU' || code === 'SPLIT' || code === 'CORNER' || code === 'OTS') return 'medium';
  return 'wide';
}

export function poseFor(shot) {
  // the script's Nao column wins: it is the only place that says what her face
  // is doing on this beat
  if (shot.pose && poses.images.has(shot.pose)) return shot.pose;

  const close = sizeClass(shot.code) === 'close';
  const pair = POSE_BY_WORLD[shot.world];
  // a close shot can only afford a gesture that happens above her waist, so it
  // asks for the close variant of the world's pose
  const want = pair ? (close ? pair[0] : pair[1]) : close ? 'pointing' : 'neutral';
  if (poses.images.has(want)) return want;
  return [...poses.images.keys()][0];
}

// ---------------------------------------------------------------------------
// where her hands are
// ---------------------------------------------------------------------------

/**
 * The two poses that are worth pointing with, measured off the drawings: the
 * extended hand, in canvas pixels. A gesture only *means* something if the line
 * to the object starts where the finger is - otherwise the viewer reads two
 * unrelated marks on the page.
 */
const HAND_ANCHORS = {
  pointing: [[211, 397]],
  onefinger: [[626, 475]],
  explaining: [[669, 478]],
  gesture: [[678, 458]],
  openhands2: [[202, 545], [703, 545]],
  presenting: [[222, 812], [677, 811]],
};

const CANVAS_CX = 450;

export function handAnchors(pose) {
  return HAND_ANCHORS[pose] || [];
}

/** Her mirror rule, in one place: drawNao and the gesture line must agree. */
export function mirrorFor(shot, pose) {
  return shot.n % 2 === 1 && pose !== 'pointing';
}

/**
 * The extended hand, on the page, in canvas pixels. Picks the hand nearest the
 * thing being explained, so she reaches toward it rather than across herself.
 */
export function handPointFor(shot, box, pose, target = null) {
  const anchors = handAnchors(pose);
  if (!anchors.length) return null;
  const mirror = mirrorFor(shot, pose);
  const points = anchors.map(([ax, ay]) => ({
    x: box.cx + ((mirror ? -(ax - CANVAS_CX) : (ax - CANVAS_CX)) * box.scale),
    y: box.top + ay * box.scale,
  }));
  if (!target) return points[0];
  points.sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
  return points[0];
}

// ---------------------------------------------------------------------------
// framing
// ---------------------------------------------------------------------------

/**
 * `head` is the drawn width of her head in canvas px; everything else follows
 * from her proportions (her head is 16.5 % of her height, so the whole figure
 * is 6.05 heads tall). A big head means a tight shot and her legs simply run
 * off the bottom of the canvas - which is what an upper-body close-up is.
 *
 * The close values stop at the hip, not the collarbone: below that the caption
 * card covers her anyway, and a figure cut at the chest is the floating-head
 * problem again with extra steps. Her hands have to stay in frame, because the
 * hands are the animation.
 */
const FRAMING = {
  // placement         close (CU)      medium (MCU)   whole figure
  center: { close: [360, 300, 540], medium: [300, 520, 540], wide: [258, 250, 540] },
  left: { close: [345, 320, 452], medium: [290, 530, 430], wide: [258, 250, 380] },
  'split-right': { close: [345, 320, 800], medium: [290, 530, 800], wide: [258, 250, 790] },
  // A corner insert sits behind the caption card, so the card - not the crop -
  // is what ends her. That means the head starts well above it: with the old
  // numbers the card landed on her chest and the shot was a head on a shelf.
  // The tops below keep head, shoulders and waist above the card at every size.
  'corner-br': { close: [200, 760, 806], medium: [172, 850, 812], wide: [152, 900, 818] },
  'corner-bl': { close: [200, 760, 300], medium: [172, 850, 294], wide: [152, 900, 288] },
};

/** The framing preset for a compiled shot, or null when she is not in frame. */
export function framingFor(placement, code) {
  const row = FRAMING[placement];
  if (!row) return null;
  const [head, top, cx] = row[sizeClass(code)] || row.medium;
  const anchor = poses.manifest?.anchor?.headWidth || 212;
  const figH = poses.manifest?.figureHeight || 1280;
  return {
    head,
    top,
    cx,
    scale: head / anchor,
    // where her feet land once scaled - used for the ground shadow
    feetOffset: (poses.manifest?.feetY || 1460) - (poses.manifest?.canvas?.height || 1500) * 0,
    figureH: figH * (head / anchor),
  };
}

/**
 * Her footprint on this frame, in canvas pixels.
 *
 * The layout engine needs this *before* anything is drawn - it is how the frame
 * knows which region she owns - and it must answer even when the sprites have
 * not been loaded (a headless layout check, a test). Hence the fallback maths
 * from the framing numbers rather than from the image size.
 */
export function figureBox(shot) {
  const box = framingFor(shot.placement, shot.code);
  if (!box) return null;
  const anchor = poses.manifest?.anchor?.headWidth || 212;
  const canvasW = poses.manifest?.canvas?.width || 900;
  const canvasH = poses.manifest?.canvas?.height || 1500;
  const w = box.head * (canvasW / anchor);
  const h = box.head * (canvasH / anchor);
  return { x: box.cx - w / 2, y: box.top, w, h };
}

// ---------------------------------------------------------------------------
// timing helpers (still used: the schedule now drives her body, not her mouth)
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

/**
 * How open her mouth would be at this frame, 0..1. There is no mouth to draw,
 * so it is spent on the nod instead - she moves as she speaks.
 */
export function opennessAt(shot, frame) {
  const local = frame - shot.start - (shot.mouth?.offset ?? 0);
  if (local < 0) return 0;
  return entryAt(shot.mouth?.schedule || [], local).o || 0;
}

// ---------------------------------------------------------------------------
// drawing
// ---------------------------------------------------------------------------

/**
 * A thin, dashed reach from her hand toward the thing the sentence is on, with a
 * tick at the end. Drawn behind the figure: a line that starts *on* the drawn
 * hand reads as a prop, and a line that starts behind it reads as a gesture.
 */
function drawReach(ctx, hand, focus, frame) {
  const dx = focus.x - hand.x;
  const dy = focus.y - hand.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 80) return null;
  // A gesture has a length. Drawn all the way to a prop at the top of the frame
  // it stops being a gesture and becomes a plumb line through the picture, so it
  // reaches toward the object and stops.
  const reach = Math.min(720, Math.max(120, dist * 0.95));
  const stop = Math.min(Math.max(0.4, 1 - (focus.r * 1.2) / dist), reach / dist);
  const end = { x: hand.x + dx * stop, y: hand.y + dy * stop };
  const bow = Math.min(90, dist * 0.16) * (dx < 0 ? 1 : -1);
  const mid = {
    x: (hand.x + end.x) / 2 + (dy / dist) * bow * 0.6,
    y: (hand.y + end.y) / 2 - (dx / dist) * bow * 0.6,
  };

  // it fades as it climbs, so the hand still reads before the line does
  ctx.save();
  const fade = Math.max(0.2, 0.62 - dist / 1500);
  ctx.strokeStyle = alpha(P.accent, fade);
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.setLineDash([2, 12]);
  ctx.lineDashOffset = -(frame * 1.4) % 14;
  ctx.beginPath();
  ctx.moveTo(hand.x, hand.y);
  ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y);
  ctx.stroke();
  ctx.restore();

  // the hand end: a small solid dot, so the reach is clearly *hers*
  ctx.save();
  ctx.fillStyle = alpha(P.accent, 0.75);
  ctx.beginPath();
  ctx.arc(hand.x, hand.y, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // the far end: two short ticks, a pointer rather than an arrowhead
  const ang = Math.atan2(end.y - mid.y, end.x - mid.x);
  ctx.save();
  ctx.strokeStyle = alpha(P.accent, 0.8);
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  for (const side of [-0.62, 0.62]) {
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(end.x + Math.cos(ang + side) * 16, end.y + Math.sin(ang + side) * 16);
    ctx.stroke();
  }
  ctx.restore();
  return { hand, end };
}

/**
 * @returns {{x:number,y:number,w:number,h:number,pose:string}|null} her box
 */
export function drawNao(ctx, shot, frame, t) {
  if (!posesReady()) return null;
  const box = framingFor(shot.placement, shot.code);
  if (!box) return null;

  const pose = poseFor(shot);
  const img = poses.images.get(pose) || poses.images.values().next().value;
  if (!img) return null;

  // Mirroring halves the ways a pose can read. An open palm or a presenting
  // hand is symmetric to the camera; a pointing hand is not, so it is left
  // alone. Alternating by shot keeps the same drawing from repeating.
  const mirror = mirrorFor(shot, pose);

  const { scale } = box;
  const w = img.width * scale;
  const h = img.height * scale;
  const x = box.cx - w / 2;
  const y = box.top;

  // what the sentence is on, if the world reported one this frame
  const focus = shot.__focus || null;

  // ---- motion ------------------------------------------------------------
  const f = frame;
  const breath = Math.sin((f / 30) * ((Math.PI * 2) / 3.6));       // ~3.6 s
  const sway = Math.sin((f / 30) * ((Math.PI * 2) / 8.3));         // ~8.3 s
  const slow = Math.sin((f / 30) * ((Math.PI * 2) / 13.7));         // ~13.7 s

  const open = opennessAt(shot, frame);
  const speaking = open * open;                                    // squared: only real vowels move her

  const breathe = 1 + 0.007 * breath;                              // ±0.7 % vertical
  // she leans into whatever she is explaining, which is where the eye goes
  const toward = focus ? Math.max(-1, Math.min(1, (focus.x - box.cx) / 420)) : 0;
  const reachLean = toward * 1.15 * (Math.PI / 180);
  const lean = (sway * 0.55 + speaking * 0.18) * (Math.PI / 180) + reachLean;   // ±0.55° + a little with the words
  const turn = slow * 0.22 * (Math.PI / 180);                       // a slow drift, keeps her from freezing
  const nod = -speaking * box.head * 0.006;                         // 3-4 px dip on a stressed vowel
  const push = 1 + 0.012 * t;                                       // a push-in over the shot

  // pivot at the feet: real weight, not a floating sticker
  const px = box.cx;
  const py = y + h;

  // ---- the line to what she is explaining --------------------------------
  //
  // She cannot turn her head inside a drawing, so the pointing is carried by the
  // hand she already has out plus a thin gesture line to the thing the sentence
  // is on. It stops short of the object on purpose: it is a reach, not a rod.
  let gesture = null;
  if (focus && pose && handAnchors(pose).length) {
    const hand = handPointFor(shot, box, pose, focus);
    if (hand && hand.y < captionTop(ctx, shot) - 20) gesture = drawReach(ctx, hand, focus, frame);
  }

  // ---- shadow ------------------------------------------------------------
  const ground = Math.min(1920 + 400, py - h * 0.004);
  if (ground < 2000) {
    ctx.save();
    const g = ctx.createRadialGradient(px, ground - 10, 6, px, ground - 10, w * 0.34);
    g.addColorStop(0, alpha(P.ink, 0.15));
    g.addColorStop(1, alpha(P.ink, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, ground - 10, w * 0.34, h * 0.018, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- the figure --------------------------------------------------------
  // She is drawn behind the caption card, and the card is not the bottom of
  // the frame: past it there is still a strip of bench. Clip her at the card so
  // the part of her the card hides stays hidden.
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, 1080, Math.max(0, captionTop(ctx, shot) - 2));
  ctx.clip();
  ctx.translate(px, py);
  ctx.rotate(lean + turn);
  ctx.scale(push, push * breathe);
  ctx.translate(-px, -py + nod);
  if (mirror) {
    ctx.translate(px, 0);
    ctx.scale(-1, 1);
    ctx.translate(-px, 0);
  }
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
  ctx.restore();

  return { x, y, w, h, pose, mirror, open, gesture };
}

/** Kept for the stage's describeFrame() and the player's readout. */
export function figureState(shot, frame) {
  return {
    pose: poseFor(shot),
    openness: opennessAt(shot, frame),
  };
}
