/**
 * page.js - the page the world is drawn on: paper, light, grid, and the small
 * typographic helpers every painter uses.
 *
 * It lives apart from worlds.js because there are now two sets of painters -
 * the reels and the long-form episodes - and both have to sit on the same paper.
 */

import { P, alpha, mix, FONT_SANS } from './palette.js';

const W = 1080;
const H = 1920;

/** Warm paper, a soft light from the top left, and a hairline grid. */
export function backdrop(ctx, { warm = 1, vignette = 0.9, grid = true, t = 0 } = {}) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix(P.bg, 0.25 * warm));
  g.addColorStop(0.55, P.bg);
  g.addColorStop(1, mix(P.bgDeep, 0.1));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const light = ctx.createRadialGradient(W * 0.24, H * 0.16, 40, W * 0.24, H * 0.16, H * 0.75);
  light.addColorStop(0, alpha('#FFFFFF', 0.85 * warm));
  light.addColorStop(1, alpha('#FFFFFF', 0));
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, W, H);

  // A slow sweep of light across the wall. It is one gradient moving a few
  // hundred pixels over ten seconds: nothing to look at, and the frame stops
  // feeling like a still photograph behind the props.
  const sweep = ctx.createLinearGradient(W * (-0.4 + 0.5 * t), 0, W * (0.2 + 0.5 * t), H * 0.7);
  sweep.addColorStop(0, alpha('#FFFFFF', 0));
  sweep.addColorStop(0.45, alpha('#FFFFFF', 0.07 * warm));
  sweep.addColorStop(0.62, alpha('#FFFFFF', 0));
  sweep.addColorStop(1, alpha('#FFFFFF', 0));
  ctx.fillStyle = sweep;
  ctx.fillRect(0, 0, W, H);

  const vg = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.32, W / 2, H * 0.46, H * 0.86);
  vg.addColorStop(0, alpha(P.bgDeep, 0));
  vg.addColorStop(1, alpha(P.bgDeep, 0.55 * vignette));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  if (grid) dotGrid(ctx, 0.05);
  motes(ctx, t);
}

/**
 * Dust in the light. Twelve specks on coprime periods, so the pattern never
 * repeats inside a shot and no two frames are identical - which is most of what
 * "the background feels alive" means at this scale.
 */
function motes(ctx, t = 0) {
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const period = 9.3 + (i % 5) * 1.7;
    const phase = (t * period + i * 0.811) % 1;
    const x = ((i * 137.5) % 1) * W + Math.sin((t * 6.28 + i) * 1.7) * 26;
    const y = H * (0.12 + 0.72 * ((phase + i * 0.13) % 1));
    const drift = Math.sin((t * 6.28 + i * 2.1) * 0.9);
    const r = 3 + (i % 3) * 2;
    ctx.fillStyle = alpha('#FFFFFF', 0.16 + 0.1 * (0.5 + 0.5 * drift));
    ctx.beginPath();
    ctx.arc(x + drift * 18, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function dotGrid(ctx, alphaOuter = 0.06) {
  ctx.save();
  ctx.fillStyle = alpha(P.ink, alphaOuter);
  for (let y = 120; y < H - 260; y += 64) {
    for (let x = 44; x < W; x += 64) ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

export function softBlob(ctx, x, y, r, color, a = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, alpha(color, a));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function label(ctx, text, x, y, { size = 26, color = P.inkSoft, align = 'center', weight = 600, spacing = 0 } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${FONT_SANS}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (spacing) {
    drawSpaced(ctx, text, x, y, spacing);
  } else {
    ctx.fillText(text, x, y);
  }
  ctx.restore();
}

export function drawSpaced(ctx, text, x, y, spacing) {
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + spacing);
  const total = widths.reduce((a, b) => a + b, 0) - spacing;
  const align = ctx.textAlign;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  const prev = ctx.textAlign;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, cx, y);
    cx += widths[i];
  });
  ctx.textAlign = prev;
}

export function easeOut(t) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

export function prog(t, a, b) {
  return Math.max(0, Math.min(1, (t - a) / (b - a)));
}
