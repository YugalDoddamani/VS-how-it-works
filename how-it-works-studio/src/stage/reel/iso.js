/**
 * iso.js - the isometric drawing kit.
 *
 * One projection, a handful of primitives, and the small set of shapes the world
 * is made of (boxes, shelves, tagged boxes, chips, cards). Everything the reels
 * draw in 3D goes through here, so the whole world shares one vanishing point
 * and one line weight - which is what makes it look drawn rather than assembled.
 *
 * Screen space is 1080 x 1920. `project` maps world units to screen pixels.
 */

import { P, alpha, mix, blend, FONT_SANS } from './palette.js';

const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

export function projector(ox, oy, scale = 1) {
  return (x, y, z = 0) => [ox + (x - y) * COS30 * scale, oy + (x + y) * SIN30 * scale - z * scale];
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function poly(ctx, pts, fill, stroke, width = 2) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
}

/** A box in isometric space. x,y = the near corner; z = base height. */
export function isoBox(ctx, proj, { x, y, w, d, h, z = 0, tones, edge = P.isoEdge, shadow = true }) {
  const t = tones || { top: P.isoTop, left: P.isoLeft, right: P.isoRight };

  const A = proj(x, y, z + h);         // top near
  const B = proj(x + w, y, z + h);     // top right
  const C = proj(x + w, y + d, z + h); // top far
  const D = proj(x, y + d, z + h);     // top left
  const B2 = proj(x + w, y, z);
  const C2 = proj(x + w, y + d, z);
  const D2 = proj(x, y + d, z);

  if (shadow) {
    const cx = (A[0] + C[0]) / 2;
    const cy = (A[1] + C[1]) / 2;
    const rx = Math.abs(B[0] - D[0]) / 2 * 1.04;
    const ry = Math.abs(B[1] - D[1]) / 2 * 1.04;
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = P.ink;
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy + 14, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  poly(ctx, [D, C, C2, D2], t.left, edge, 2);   // left face (towards -x)
  poly(ctx, [C, B, B2, C2], t.right, edge, 2);  // right face
  poly(ctx, [A, B, C, D], t.top, edge, 2);      // top face
  return { topCenter: [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2] };
}

/** Faint isometric ground grid, used to seat a prop on the page. */
export function isoGround(ctx, proj, { x0, y0, x1, y1, step = 60, ink = P.line }) {
  ctx.save();
  ctx.strokeStyle = alpha(ink, 0.55);
  ctx.lineWidth = 1;
  for (let x = x0; x <= x1; x += step) {
    const a = proj(x, y0);
    const b = proj(x, y1);
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
  }
  for (let y = y0; y <= y1; y += step) {
    const a = proj(x0, y);
    const b = proj(x1, y);
    ctx.beginPath();
    ctx.moveTo(...a);
    ctx.lineTo(...b);
    ctx.stroke();
  }
  ctx.restore();
}

/** A storage shelf: an upright frame with two boards and a few tagged boxes. */
export function shelf(ctx, proj, { x, y, w = 210, d = 120, h = 250, tone, items = 2 }) {
  const tones = tone || {
    top: mix(P.isoTop, 0.1),
    left: mix(P.isoLeft, 0.05),
    right: mix(P.isoRight, 0.02),
  };
  // uprights
  isoBox(ctx, proj, { x, y, w: 16, d, h, tones });
  isoBox(ctx, proj, { x: x + w - 16, y, w: 16, d, h, tones });
  // boards
  const boards = [0.16, 0.56, 0.94];
  boards.forEach((f) => isoBox(ctx, proj, { x, y, w, d: d, h: 12, z: h * f, tones, shadow: false }));
  return { boards, top: h };
}

/** A tagged cookie box: a parcel with a small tag on its lid. */
export function taggedBox(ctx, proj, { x, y, z = 0, s = 74, tones, tag = true, glow = 0 }) {
  const t = tones || {
    top: mix('#E0A2A2', 0.55),
    left: mix('#E0A2A2', 0.2),
    right: mix('#E0A2A2', -0.1),
  };
  if (glow > 0) {
    const c = proj(x + s / 2, y + s / 2, z + s / 2);
    const g = ctx.createRadialGradient(c[0], c[1], 4, c[0], c[1], s * 1.5);
    g.addColorStop(0, alpha(P.accent, 0.34 * glow));
    g.addColorStop(1, alpha(P.accent, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c[0], c[1], s * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const { topCenter } = isoBox(ctx, proj, { x, y, w: s, d: s, h: s * 0.78, z, tones: t, edge: mix('#E0A2A2', -0.45, P.ink) });
  if (tag) {
    ctx.save();
    ctx.strokeStyle = alpha(P.ink, 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topCenter[0], topCenter[1]);
    ctx.lineTo(topCenter[0] + 26, topCenter[1] - 30);
    ctx.stroke();
    roundRect(ctx, topCenter[0] + 22, topCenter[1] - 52, 34, 24, 5);
    ctx.fillStyle = P.surface;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  return topCenter;
}

/** A label chip that sits on the page (not in the world). */
export function chip(ctx, x, y, text, { fill = P.surface, ink = P.ink, border = P.line, size = 26, pad = 18, accent = false } = {}) {
  ctx.save();
  ctx.font = `600 ${size}px ${FONT_SANS}`;
  const w = ctx.measureText(text).width + pad * 2;
  const h = size + pad * 1.15;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = accent ? P.accent : fill;
  ctx.fill();
  if (!accent) {
    ctx.strokeStyle = border;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = accent ? '#FFF8F3' : ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2 + 1);
  ctx.restore();
  return w;
}

/** A paper card, with the faint ruled texture the channel uses. */
export function paperCard(ctx, x, y, w, h, { r = 22, fill = P.surface, border = P.line, shadow = true } = {}) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = alpha(P.ink, 0.16);
    ctx.shadowBlur = 38;
    ctx.shadowOffsetY = 14;
  }
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.stroke();
}

/** Dotted arc between two page points. */
export function dottedArc(ctx, a, b, { bulge = 70, dash = [9, 11], color = P.accent, width = 4, progress = 1 } = {}) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.setLineDash(dash);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2 - bulge;
  const steps = 48;
  const upto = Math.max(2, Math.round(steps * progress));
  ctx.beginPath();
  for (let i = 0; i <= upto; i++) {
    const t = i / steps;
    const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * mx + t * t * b[0];
    const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * my + t * t * b[1];
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** A switch, drawn in page space: the thing the whole reel ends on. */
export function toggle(ctx, x, y, w, { on = true, t = 0, ink = P.ink } = {}) {
  const h = w * 0.44;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = on ? mix(P.good, 0.12) : P.line;
  ctx.fill();
  ctx.strokeStyle = alpha(ink, 0.5);
  ctx.lineWidth = 2;
  ctx.stroke();

  const knob = h * 0.82;
  const travel = w - knob - h * 0.1;
  const kx = x + h * 0.075 + (on ? travel : 0) + (on ? 0 : -travel * 0);
  ctx.save();
  ctx.shadowColor = alpha(ink, 0.2);
  ctx.shadowBlur = 10;
  roundRect(ctx, kx, y + (h - knob) / 2, knob, knob, knob / 2);
  ctx.fillStyle = P.surface;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, kx, y + (h - knob) / 2, knob, knob, knob / 2);
  ctx.strokeStyle = alpha(ink, 0.35);
  ctx.lineWidth = 2;
  ctx.stroke();

  if (on) {
    ctx.save();
    ctx.strokeStyle = alpha(P.good, 0.9);
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.restore();
  }
  return { w, h };
}

/** Animated "toggle off" that takes a progress 0..1 and slides the knob. */
export function toggleAnimated(ctx, x, y, w, progress, { ink = P.ink, invert = false } = {}) {
  const h = w * 0.44;
  const p = Math.max(0, Math.min(1, progress));
  const startOn = !invert;
  // knob position lerps from left(when off) to right(when on)
  const onAmount = invert ? 1 - p : p;
  roundRect(ctx, x, y, w, h, h / 2);
  const g = blend(P.line, mix(P.good, 0.12), onAmount);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = alpha(ink, 0.45);
  ctx.lineWidth = 2;
  ctx.stroke();

  const knob = h * 0.82;
  const travel = w - knob - h * 0.15;
  const kx = x + h * 0.075 + travel * onAmount;
  ctx.save();
  ctx.shadowColor = alpha(ink, 0.18);
  ctx.shadowBlur = 12;
  roundRect(ctx, kx, y + (h - knob) / 2, knob, knob, knob / 2);
  ctx.fillStyle = P.surface;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, kx, y + (h - knob) / 2, knob, knob, knob / 2);
  ctx.strokeStyle = alpha(ink, 0.3);
  ctx.lineWidth = 2;
  ctx.stroke();
  return startOn;
}
