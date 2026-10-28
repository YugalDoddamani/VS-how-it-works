/**
 * worlds.js - the isometric world, one painter per shot background.
 *
 * The compiled reel gives each shot a `world` id; this file is the only place
 * that knows what that world looks like. Every painter draws the full 1080x1920
 * frame and leaves the bottom band free for the caption.
 *
 * Compositing order (see render.js): backdrop -> world -> character -> chrome.
 */

import { P, FAMILY, alpha, mix, blend, FONT_SANS, FONT_MONO, FONT_SERIF } from './palette.js';
import {
  projector, isoBox, isoGround, shelf, taggedBox, chip, paperCard,
  roundRect, poly, dottedArc, toggleAnimated,
} from './iso.js';

const W = 1080;
const H = 1920;

/**
 * Bitmap props the worlds can use. Vector shapes are right for the isometric
 * world, but a sneaker drawn from beziers reads as a bread roll - some objects
 * are cheaper to illustrate once and load than to reconstruct from primitives.
 * Hosts inject them (render-reel, the preview); with nothing injected the
 * painters fall back to their vector stand-ins and the frame still renders.
 */
const assets = {};

export function setWorldAssets(next) {
  Object.assign(assets, next || {});
}

/** Warm paper, a soft light from the top left, and a hairline grid. */
function backdrop(ctx, { warm = 1, vignette = 0.9, grid = true } = {}) {
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

  const vg = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.32, W / 2, H * 0.46, H * 0.86);
  vg.addColorStop(0, alpha(P.bgDeep, 0));
  vg.addColorStop(1, alpha(P.bgDeep, 0.55 * vignette));
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  if (grid) dotGrid(ctx, 0.05);
}

function dotGrid(ctx, alphaOuter = 0.06) {
  ctx.save();
  ctx.fillStyle = alpha(P.ink, alphaOuter);
  for (let y = 120; y < H - 260; y += 64) {
    for (let x = 44; x < W; x += 64) ctx.fillRect(x, y, 2, 2);
  }
  ctx.restore();
}

function softBlob(ctx, x, y, r, color, a = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, alpha(color, a));
  g.addColorStop(1, alpha(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function label(ctx, text, x, y, { size = 26, color = P.inkSoft, align = 'center', weight = 600, spacing = 0 } = {}) {
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

function drawSpaced(ctx, text, x, y, spacing) {
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

function easeOut(t) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
}

function prog(t, a, b) {
  return Math.max(0, Math.min(1, (t - a) / (b - a)));
}

// ---------------------------------------------------------------------------
// worlds
// ---------------------------------------------------------------------------

/**
 * Shot 1: the shoe listing, seen from her hand.
 *
 * This is the hook and the first thing anyone sees, so it is drawn like a real
 * product page and not like a diagram of one: a straight phone, a shoe that
 * reads as a shoe at thumbnail size, real type hierarchy, and one thumb that
 * lands on the button instead of floating over the copy.
 */
function povPhone(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 1.1 });

  // the desk the phone is lying on
  ctx.fillStyle = mix(P.isoLeft, 0.2);
  ctx.beginPath();
  ctx.moveTo(0, 1470);
  ctx.lineTo(W, 1330);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  // ---- the phone ---------------------------------------------------------
  const px = 158;
  const py = 186;
  const pw = 764;
  const ph = 1256;
  const push = 1 + 0.03 * t;

  ctx.save();
  ctx.translate(W / 2, py + ph / 2);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -(py + ph / 2));

  ctx.save();
  ctx.shadowColor = alpha(P.ink, 0.3);
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 30;
  roundRect(ctx, px, py, pw, ph, 66);
  ctx.fillStyle = P.ink;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, px + 15, py + 15, pw - 30, ph - 30, 54);
  ctx.fillStyle = '#FFFDFA';
  ctx.fill();

  const sx = px + 34;          // screen content, inset
  const sw = pw - 68;
  const sy = py + 40;

  // status bar
  label(ctx, '9:41', sx + 6, sy + 30, { size: 26, color: P.ink, align: 'left', weight: 600 });
  ctx.save();
  ctx.fillStyle = alpha(P.ink, 0.8);
  for (let i = 0; i < 4; i++) ctx.fillRect(sx + sw - 106 + i * 13, sy + 26 - i * 4, 8, 4 + i * 4);
  roundRect(ctx, sx + sw - 44, sy + 12, 34, 18, 5);
  ctx.fill();
  ctx.restore();

  // nav row: back, then a bag
  ctx.save();
  ctx.strokeStyle = alpha(P.ink, 0.75);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(sx + 20, sy + 86);
  ctx.lineTo(sx + 2, sy + 104);
  ctx.lineTo(sx + 20, sy + 122);
  ctx.stroke();

  ctx.strokeStyle = alpha(P.ink, 0.7);
  roundRect(ctx, sx + sw - 34, sy + 96, 32, 30, 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(sx + sw - 18, sy + 96, 10, Math.PI, 0);
  ctx.stroke();
  ctx.restore();

  // ---- product photo -----------------------------------------------------
  const cx = sx;
  const cy = sy + 150;
  const cw = sw;
  const ch = 512;
  const shot0 = ctx.createLinearGradient(cx, cy, cx, cy + ch);
  shot0.addColorStop(0, mix(P.accentSoft, 0.5));
  shot0.addColorStop(1, mix(P.accentSoft, 0.16));
  roundRect(ctx, cx, cy, cw, ch, 30);
  ctx.fillStyle = shot0;
  ctx.fill();

  // floor shadow under the shoe
  ctx.save();
  ctx.fillStyle = alpha('#8A5A44', 0.1);
  ctx.beginPath();
  ctx.ellipse(cx + cw / 2, cy + ch * 0.74, 190, 26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawShoe(ctx, cx + cw / 2, cy + ch * 0.52, cw * 0.82);

  // ---- product copy ------------------------------------------------------
  const tx = sx + 2;
  let ty = cy + ch + 66;
  label(ctx, 'Trail Runner 2', tx, ty, { size: 46, color: P.ink, align: 'left', weight: 700 });

  ty += 44;
  drawStars(ctx, tx + 2, ty - 9, 4);
  label(ctx, '128 reviews', tx + 152, ty, { size: 25, color: P.inkSoft, align: 'left', weight: 500 });

  ty += 62;
  label(ctx, '$48', tx, ty, { size: 48, color: P.accent, align: 'left', weight: 700 });
  label(ctx, '$64', tx + 118, ty, { size: 28, color: alpha(P.ink, 0.42), align: 'left', weight: 500 });
  drawStrike(ctx, tx + 118, ty - 10, 52);

  ty += 40;
  label(ctx, 'Free returns · arrives Thursday', tx, ty, { size: 25, color: P.inkSoft, align: 'left', weight: 500 });

  // divider
  ctx.save();
  ctx.strokeStyle = alpha(P.line, 0.85);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(sx, ty + 34);
  ctx.lineTo(sx + sw, ty + 34);
  ctx.stroke();
  ctx.restore();

  // ---- the button, with the thumb about to land on it --------------------
  const bw = sw;
  const bh = 92;
  const bx = sx;
  const by = ty + 70;

  // a tap ripple on the frame the thumb presses, per the shot's direction
  const press = prog(t, 0.45, 0.75);
  if (press > 0) {
    ctx.save();
    ctx.strokeStyle = alpha(P.accent, 0.5 * (1 - press));
    ctx.lineWidth = 6 * (1 - press) + 1;
    ctx.beginPath();
    ctx.arc(bx + bw * 0.7, by + bh / 2, 30 + press * 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  roundRect(ctx, bx, by, bw, bh, 26);
  ctx.fillStyle = P.accent;
  ctx.fill();
  label(ctx, 'Add to cart', bx + bw * 0.34, by + bh / 2 + 12, {
    size: 34, color: '#FFF8F3', weight: 700,
  });

  // home indicator
  ctx.save();
  ctx.fillStyle = alpha(P.ink, 0.22);
  roundRect(ctx, W / 2 - 90, py + ph - 58, 180, 8, 4);
  ctx.fill();
  ctx.restore();
  ctx.restore();

  // ---- the hand ----------------------------------------------------------
  drawThumb(ctx, 596, by + bh + 96, 0.62, frame);
}

/**
 * A side-on sneaker. Flat, long and low - the proportions are what make it read
 * as a shoe rather than a bun: a sole that runs past the toe, an upper no taller
 * than a third of its length, and laces where laces actually are.
 */
/**
 * Draw the shoe prop at `width` px wide, centred on (cx, cy).
 * The bitmap is the real illustration; `oneShoe()` is only a stand-in for hosts
 * that have not injected it (the tests, and any render before the asset loads).
 */
function drawShoe(ctx, cx, cy, width) {
  const img = assets.shoe;
  if (!img) {
    drawSneaker(ctx, cx, cy, width / 420);
    return;
  }
  const scale = width / img.width;
  const h = img.height * scale;
  ctx.save();
  ctx.shadowColor = alpha('#8A5A44', 0.18);
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 10;
  ctx.drawImage(img, cx - width / 2, cy - h / 2, width, h);
  ctx.restore();
}

/**
 * A pair of sneakers, side on.
 *
 * A single shoe drawn from rounded shapes reads as a bread roll. The fix is
 * proportion and anatomy, not detail: a low toe, a high heel counter, a thin
 * sole with the upper sitting *on* it, laces on a tongue, and a second shoe
 * behind so the eye gets "pair of shoes" before it gets "shape".
 */
function drawSneaker(ctx, cx, cy, scale) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.save();
  ctx.translate(26, -26);
  ctx.rotate(-0.09);
  ctx.globalAlpha = 0.55;
  oneShoe(ctx, 0.94);
  ctx.restore();

  oneShoe(ctx, 1);
  ctx.restore();
}

function oneShoe(ctx, k) {
  ctx.save();
  ctx.scale(k, k);
  const ink = alpha(P.ink, 0.88);
  ctx.lineJoin = 'round';

  // ---- upper: low at the toe, high at the heel ---------------------------
  ctx.beginPath();
  ctx.moveTo(-188, 30);
  ctx.bezierCurveTo(-192, 2, -170, -18, -134, -26);
  ctx.bezierCurveTo(-96, -34, -52, -40, -8, -42);
  ctx.lineTo(58, -44);
  ctx.bezierCurveTo(44, -30, 42, -22, 46, -14);
  ctx.bezierCurveTo(86, -22, 118, -26, 146, -16);
  ctx.bezierCurveTo(164, -8, 170, 8, 168, 26);
  ctx.lineTo(166, 34);
  ctx.closePath();
  ctx.fillStyle = mix('#F8EFE9', 0.18);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();

  // collar opening
  ctx.save();
  ctx.translate(112, -20);
  ctx.rotate(0.22);
  ctx.beginPath();
  ctx.ellipse(0, 0, 34, 11, 0, 0, Math.PI * 2);
  ctx.fillStyle = alpha(P.ink, 0.35);
  ctx.fill();
  ctx.restore();

  // toe cap
  ctx.beginPath();
  ctx.moveTo(-188, 30);
  ctx.bezierCurveTo(-192, 2, -170, -18, -134, -26);
  ctx.bezierCurveTo(-150, 0, -152, 20, -146, 34);
  ctx.closePath();
  ctx.fillStyle = alpha('#FFFFFF', 0.65);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // tongue + laces
  ctx.beginPath();
  ctx.moveTo(-44, -40);
  ctx.lineTo(60, -44);
  ctx.lineTo(56, -22);
  ctx.lineTo(-40, -18);
  ctx.closePath();
  ctx.fillStyle = mix('#FFFFFF', 0.35);
  ctx.fill();
  ctx.strokeStyle = alpha(P.ink, 0.45);
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = alpha(P.ink, 0.65);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x = -30 + i * 24;
    ctx.beginPath();
    ctx.moveTo(x, -38);
    ctx.lineTo(x + 18, -24);
    ctx.stroke();
  }
  ctx.restore();

  // accent flash along the side
  ctx.beginPath();
  ctx.moveTo(-140, 26);
  ctx.bezierCurveTo(-84, 4, -6, -8, 92, -12);
  ctx.lineTo(96, 2);
  ctx.bezierCurveTo(-2, 8, -70, 22, -118, 34);
  ctx.closePath();
  ctx.fillStyle = mix(P.accent, 0.22);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.stroke();

  // heel tab
  roundRect(ctx, 146, -22, 22, 46, 9);
  ctx.fillStyle = mix(P.accent, 0.3);
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 3;
  ctx.stroke();

  // ---- sole: thin, and it runs past the toe ------------------------------
  ctx.beginPath();
  ctx.moveTo(-200, 30);
  ctx.lineTo(164, 30);
  ctx.bezierCurveTo(182, 30, 186, 44, 172, 50);
  ctx.bezierCurveTo(100, 62, -150, 62, -192, 52);
  ctx.bezierCurveTo(-208, 47, -210, 34, -200, 30);
  ctx.closePath();
  ctx.fillStyle = '#FFFDF9';
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = alpha(P.ink, 0.16);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-188, 42);
  ctx.bezierCurveTo(-110, 52, 96, 52, 168, 40);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawStars(ctx, x, y, filled) {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const px = x + i * 30;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 5 : 11;
      const a = (Math.PI / 5) * k - Math.PI / 2;
      const px2 = px + Math.cos(a) * r;
      const py2 = y + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px2, py2);
      else ctx.lineTo(px2, py2);
    }
    ctx.closePath();
    ctx.fillStyle = i < filled ? P.accent : alpha(P.ink, 0.18);
    ctx.fill();
  }
  ctx.restore();
}

function drawStrike(ctx, x, y, w) {
  ctx.save();
  ctx.strokeStyle = alpha(P.ink, 0.4);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();
  ctx.restore();
}

/** A thumb coming in from the bottom-right. One shape, one nail, one shadow. */
/**
 * A thumb reaching in from the bottom-right corner, tip on the button. Short
 * enough to read as a thumb and not as a finger lying across the screen.
 */
function drawThumb(ctx, x, y, angle, frame) {
  const bob = Math.sin(frame / 9) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(angle);

  const g = ctx.createLinearGradient(-80, 0, 90, 0);
  g.addColorStop(0, '#EFCBB2');
  g.addColorStop(0.55, '#E4B79B');
  g.addColorStop(1, '#CF9D82');

  ctx.save();
  ctx.shadowColor = alpha('#8A5A44', 0.32);
  ctx.shadowBlur = 26;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, -62, -78, 132, 430, 66);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, -34, -56, 76, 100, 38);
  ctx.fillStyle = '#F8E1D0';
  ctx.fill();
  ctx.strokeStyle = alpha('#C2926F', 0.5);
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.save();
  ctx.strokeStyle = alpha('#B07A5D', 0.3);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-46, 92);
  ctx.quadraticCurveTo(4, 122, 54, 92);
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

/** Shot 2: the same shoes, now an ad in the feed. */
function feedAd(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 1 });
  const scroll = -40 * t;
  const cards = [
    { y: 210 + scroll, badge: 'Ad', shoe: true },
    { y: 1000 + scroll, badge: '', shoe: false },
  ];

  cards.forEach((c, i) => {
    const x = 96;
    const w = W - 192;
    const h = 700;
    paperCard(ctx, x, c.y, w, h, { r: 34, shadow: true });
    roundRect(ctx, x + 24, c.y + 24, w - 48, h - 150, 24);
    ctx.fillStyle = i === 0 ? mix(P.accentSoft, 0.4) : mix(P.isoLeft, 0.3);
    ctx.fill();

    if (i === 0) {
      // the same shoe, recognisably - it is the whole point of the shot
      drawShoe(ctx, x + w / 2, c.y + 300, w * 0.8);
    } else {
      ctx.save();
      ctx.translate(x + w / 2, c.y + 320);
      ctx.fillStyle = mix(P.link, 0.42);
      roundRect(ctx, -200, -120, 400, 260, 26);
      ctx.fill();
      ctx.restore();
    }

    label(ctx, i === 0 ? 'Trail Runner 2' : 'Also for you', x + 34, c.y + h - 96, {
      size: 34, color: P.ink, align: 'left', weight: 700,
    });
    label(ctx, i === 0 ? 'Sponsored · $48' : 'Something you might like', x + 34, c.y + h - 52, {
      size: 24, color: P.inkSoft, align: 'left', weight: 500,
    });

    if (c.badge) {
      const a = prog(t, 0.06, 0.16); // the badge lands on frame ~4
      ctx.save();
      ctx.globalAlpha = a;
      roundRect(ctx, x + 26, c.y + 26, 96, 56, 28);
      ctx.fillStyle = P.ink;
      ctx.fill();
      label(ctx, 'Ad', x + 74, c.y + 64, { size: 26, color: '#FFF8F3', weight: 700 });
      ctx.restore();
    }
  });

  // the scroll thumb
  ctx.save();
  ctx.fillStyle = alpha(P.ink, 0.12);
  roundRect(ctx, W - 44, 420 + 120 * t, 6, 220, 3);
  ctx.fill();
  ctx.restore();
}

/** A warm room, thrown out of focus. Used behind her on CU/MCU shots. */
function bokeh(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 1 });
  const drift = Math.sin(frame / 40) * 10;
  softBlob(ctx, 250 + drift, 420, 300, P.accentSoft, 0.55);
  softBlob(ctx, 860 - drift, 300, 260, mix(P.link, 0.6), 0.22);
  softBlob(ctx, 720, 1180, 340, mix(P.isoLeft, 0.1), 0.6);
  softBlob(ctx, 160, 1120, 220, mix(P.good, 0.7), 0.14);
  // a horizon line, out of focus
  ctx.save();
  ctx.strokeStyle = alpha(P.line, 0.7);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 1330);
  ctx.lineTo(W, 1290);
  ctx.stroke();
  ctx.restore();
}

/** The shelf world: one site, one box, one label. */
function shelfWorld(ctx, { items = 1, labelA = 'this site', labelB = 'another site', travel = 0, glowA = 0, glowB = 0 }) {
  backdrop(ctx);

  // a big pale plate behind the prop, so a 24 mm world still has a subject
  const OX = items === 2 ? W * 0.42 : W * 0.40;
  const plate = ctx.createRadialGradient(OX, 1120, 60, OX, 1120, 560);
  plate.addColorStop(0, alpha(P.surface, 0.95));
  plate.addColorStop(0.65, alpha(P.surface, 0.5));
  plate.addColorStop(1, alpha(P.surface, 0));
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.ellipse(OX, 1120, 560, 470, 0, 0, Math.PI * 2);
  ctx.fill();

  const proj = projector(OX, 1260, 1.5);
  isoGround(ctx, proj, { x0: -170, y0: -130, x1: 170, y1: 130, step: 58 });

  const tones = FAMILY.storage;

  if (items === 1) {
    const px = -84;
    shelf(ctx, proj, { x: px, y: -18, w: 168, d: 96, h: 240, tone: { top: tones.top, left: tones.left, right: tones.right } });
    taggedBox(ctx, proj, { x: px + 40, y: 0, z: 246, s: 66, glow: glowA });
    const tag = proj(px + 58, 24, 0);
    chip(ctx, tag[0] - 78, 1410, labelA, { size: 30 });
  } else {
    const leftX = -246;
    const rightX = 24;
    shelf(ctx, proj, { x: leftX, y: -44, w: 152, d: 96, h: 232, tone: { top: tones.top, left: tones.left, right: tones.right } });
    shelf(ctx, proj, { x: rightX, y: -44, w: 152, d: 96, h: 232, tone: { top: tones.top, left: tones.left, right: tones.right } });

    const a = proj(leftX + 34, 2, 244);
    const b = proj(rightX + 34, 2, 244);
    if (travel <= 0.001) {
      taggedBox(ctx, proj, { x: leftX + 34, y: 4, z: 240, s: 62, glow: glowA });
    } else {
      ctx.save();
      ctx.globalAlpha = 0.28;
      taggedBox(ctx, proj, { x: leftX + 34, y: 4, z: 240, s: 62, tag: false });
      ctx.restore();
      dottedArc(ctx, a, b, { bulge: 170, progress: travel, color: alpha(P.accent, 0.8), width: 5 });
      const tt = easeOut(travel);
      const mx = (a[0] + b[0]) / 2;
      const my = (a[1] + b[1]) / 2 - 170;
      const x = (1 - tt) * (1 - tt) * a[0] + 2 * (1 - tt) * tt * mx + tt * tt * b[0];
      const y = (1 - tt) * (1 - tt) * a[1] + 2 * (1 - tt) * tt * my + tt * tt * b[1];
      drawBoxAtPage(ctx, x, y, 66, glowB);
    }
    chip(ctx, a[0] - 72, 1430, labelA, { size: 27 });
    chip(ctx, b[0] - 72, 1430, labelB, { size: 27 });
  }
}

/** A tagged box drawn directly in page space (used when it is in flight). */
function drawBoxAtPage(ctx, x, y, s, glow = 0) {
  if (glow > 0) softBlob(ctx, x, y - s * 0.5, s * 1.6, P.accent, 0.3 * glow);
  const w = s * 0.86;
  const h = s * 0.62;
  poly(ctx, [[x - w, y - h], [x, y - h * 1.9], [x + w, y - h], [x, y - h * 0.1]], mix('#E0A2A2', 0.55), mix('#E0A2A2', -0.4, P.ink));
  poly(ctx, [[x - w, y - h], [x, y - h * 0.1], [x, y + h * 0.9], [x - w, y]], mix('#E0A2A2', 0.2), mix('#E0A2A2', -0.4, P.ink));
  poly(ctx, [[x + w, y - h], [x, y - h * 0.1], [x, y + h * 0.9], [x + w, y]], mix('#E0A2A2', -0.1), mix('#E0A2A2', -0.4, P.ink));
}

function shelfOne(ctx, shot, frame, t) {
  shelfWorld(ctx, { items: 1, labelA: 'this site', glowA: prog(t, 0.1, 0.5) });
}

function shelfTwo(ctx, shot, frame, t) {
  shelfWorld(ctx, {
    items: 2,
    labelA: 'site 1',
    labelB: 'site 2',
    travel: prog(t, 0.18, 0.82),
    glowB: prog(t, 0.6, 1),
  });
}

/** The box opening; the note reading "same person as before". */
function noteOpen(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 0.85 });
  const open = easeOut(prog(t, 0.05, 0.5));
  const proj = projector(W / 2, 1290, 1.62);

  // the parcel, opened
  isoBox(ctx, proj, { x: -110, y: -70, w: 220, d: 150, h: 110, tones: { top: mix('#E0A2A2', 0.45), left: mix('#E0A2A2', 0.2), right: mix('#E0A2A2', -0.06) } });

  // lid, hinged at the back edge and tilting open
  ctx.save();
  const hinge = proj(-110, -70, 110);
  ctx.translate(hinge[0], hinge[1]);
  ctx.rotate(-0.42 * open);
  poly(ctx,
    [[0, 0], [240, -120], [420, -40], [180, 80]],
    mix('#E0A2A2', 0.5), mix('#E0A2A2', -0.35, P.ink), 3);
  ctx.restore();

  // the note, rising out of the box
  const rise = 150 * open;
  const nx = W / 2 - 300;
  const ny = 690 - rise * 0.55;
  ctx.save();
  ctx.shadowColor = alpha(P.ink, 0.2);
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 14;
  roundRect(ctx, nx, ny, 600, 380, 14);
  ctx.fillStyle = '#FFFDF8';
  ctx.fill();
  ctx.restore();
  roundRect(ctx, nx, ny, 600, 380, 14);
  ctx.strokeStyle = alpha(P.ink, 0.14);
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.globalAlpha = 0.25 + 0.75 * open;
  label(ctx, 'you are the same person', nx + 46, ny + 116, { size: 44, color: P.ink, align: 'left', weight: 600 });
  label(ctx, 'as last time', nx + 46, ny + 174, { size: 44, color: P.ink, align: 'left', weight: 600 });
  ctx.strokeStyle = alpha(P.ink, 0.16);
  ctx.lineWidth = 3;
  [232, 278, 322].forEach((dy, i) => {
    ctx.beginPath();
    ctx.moveTo(nx + 46, ny + dy);
    ctx.lineTo(nx + 46 + (i === 2 ? 240 : 508), ny + dy);
    ctx.stroke();
  });
  ctx.restore();

  // the tag on its string
  ctx.save();
  ctx.strokeStyle = alpha(P.ink, 0.4);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(nx + 560, ny + 330);
  ctx.quadraticCurveTo(nx + 606, ny + 380, nx + 640, ny + 360);
  ctx.stroke();
  roundRect(ctx, nx + 620, ny + 332, 64, 46, 8);
  ctx.fillStyle = P.surface;
  ctx.fill();
  ctx.strokeStyle = alpha(P.ink, 0.35);
  ctx.stroke();
  ctx.restore();
}

/** The note itself: a long number, and no name. */
function noteNumber(ctx, shot, frame, t) {
  backdrop(ctx);
  paperCard(ctx, 80, 300, W - 160, 980, { r: 22, fill: '#FFFDF8' });

  // header rule
  ctx.save();
  ctx.fillStyle = alpha(P.ink, 0.7);
  ctx.fillRect(140, 372, 120, 6);
  ctx.restore();
  label(ctx, 'cookie: nao_session', 140, 348, { size: 30, color: P.inkSoft, align: 'left', weight: 600 });

  const rows = ['4f 62 2a 9d 71 b3', 'c8 05 6e 11 df 94', '77 3b a0 5c e2 68'];
  rows.forEach((r, i) => {
    label(ctx, r, 140, 500 + i * 110, { size: i === 0 ? 68 : 62, color: i === 0 ? P.ink : mix(P.ink, 0.25), align: 'left', weight: 500, spacing: 2 });
  });
  ctx.save();
  ctx.font = `500 62px ${FONT_MONO}`;
  ctx.restore();

  // the crossed-out name
  const nameX = 150;
  const nameY = 1080;
  label(ctx, 'name: —', nameX, nameY, { size: 54, color: alpha(P.ink, 0.55), align: 'left', weight: 600 });
  ctx.save();
  ctx.strokeStyle = P.stop;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(nameX - 6, nameY - 18);
  ctx.lineTo(nameX + 300, nameY - 24);
  ctx.stroke();
  ctx.restore();

  // no-name stamp
  ctx.save();
  ctx.translate(760, 1010);
  ctx.rotate(-0.13);
  ctx.strokeStyle = alpha(P.stop, 0.8);
  ctx.lineWidth = 6;
  roundRect(ctx, -150, -54, 300, 108, 16);
  ctx.stroke();
  label(ctx, 'NOT YOUR NAME', 0, 14, { size: 30, color: alpha(P.stop, 0.9), weight: 700 });
  ctx.restore();
}

/** The stamp: one ad company, on every box. */
function stampWorld(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 0.7 });

  // the parcel, filling the frame
  roundRect(ctx, 110, 470, 860, 720, 30);
  ctx.fillStyle = mix('#E0A2A2', 0.26);
  ctx.fill();
  ctx.strokeStyle = mix('#E0A2A2', -0.32, P.ink);
  ctx.lineWidth = 3;
  ctx.stroke();
  // packing tape
  ctx.save();
  roundRect(ctx, 110, 470, 860, 96, 28);
  ctx.fillStyle = alpha(P.surface, 0.55);
  ctx.fill();
  ctx.restore();

  const landed = prog(t, 0.2, 0.45);
  const scale = 1 + (1 - easeOut(landed)) * 0.4;
  ctx.save();
  ctx.translate(W / 2, 860);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 0.2 + 0.8 * landed;
  ctx.strokeStyle = mix(P.accent, -0.18);
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.arc(0, 0, 208, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 172, 0, Math.PI * 2);
  ctx.stroke();
  poly(ctx, [[0, -104], [104, 0], [0, 104], [-104, 0]], alpha(mix(P.accent, 0.35), 0.85), mix(P.accent, -0.25), 9);
  label(ctx, 'SAME COMPANY', 0, 250, { size: 34, color: mix(P.accent, -0.25), weight: 700, spacing: 3 });
  ctx.restore();

  if (landed > 0 && landed < 1) {
    ctx.save();
    ctx.globalAlpha = (1 - landed) * 0.4;
    ctx.strokeStyle = P.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(W / 2, 860, 208 + 190 * landed, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

/** Two sites, one dotted line, on the left; her on the right. */
function linkWorld(ctx, shot, frame, t) {
  backdrop(ctx);
  const proj = projector(310, 1140, 1.0);
  isoGround(ctx, proj, { x0: -150, y0: -150, x1: 150, y1: 150, step: 66 });

  shelf(ctx, proj, { x: -180, y: -50, w: 120, d: 80, h: 190, tone: FAMILY.storage });
  shelf(ctx, proj, { x: 60, y: -50, w: 120, d: 80, h: 190, tone: FAMILY.storage });
  const a = proj(-150, -16, 196);
  const b = proj(90, -16, 196);
  taggedBox(ctx, proj, { x: -150, y: -14, z: 194, s: 46 });
  taggedBox(ctx, proj, { x: 90, y: -14, z: 194, s: 46 });
  dottedArc(ctx, a, b, { bulge: 120, progress: prog(t, 0.1, 0.7), color: P.accent });

  chip(ctx, a[0] - 66, 1230, 'site 1', { size: 25 });
  chip(ctx, b[0] - 66, 1230, 'site 2', { size: 25 });

  // the shared number, called out in the middle of the link
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 120];
  ctx.save();
  ctx.globalAlpha = prog(t, 0.45, 0.75);
  roundRect(ctx, mid[0] - 128, mid[1] - 44, 256, 88, 44);
  ctx.fillStyle = P.ink;
  ctx.fill();
  label(ctx, 'same number', mid[0], mid[1] + 12, { size: 30, color: '#FFF8F3', weight: 700 });
  ctx.restore();
}

/** Incognito: it forgets here, not there. */
function incognitoWorld(ctx, shot, frame, t) {
  backdrop(ctx);
  const wx = 60;
  const wy = 300;
  const ww = 620;
  const wh = 900;
  paperCard(ctx, wx, wy, ww, wh, { r: 28 });

  ctx.save();
  roundRect(ctx, wx + 20, wy + 20, ww - 40, 66, 20);
  ctx.fillStyle = mix(P.surfaceSoft, -0.04);
  ctx.fill();
  [0, 1, 2].forEach((i) => {
    ctx.beginPath();
    ctx.arc(wx + 52 + i * 28, wy + 53, 7, 0, Math.PI * 2);
    ctx.fillStyle = alpha(P.ink, 0.3);
    ctx.fill();
  });
  ctx.restore();

  // the mask
  ctx.save();
  ctx.translate(wx + ww / 2, wy + 320);
  ctx.fillStyle = alpha(P.ink, 0.78);
  ctx.beginPath();
  ctx.moveTo(-118, -54);
  ctx.bezierCurveTo(-52, -92, 52, -92, 118, -54);
  ctx.bezierCurveTo(118, 78, 52, 152, 0, 178);
  ctx.bezierCurveTo(-52, 152, -118, 78, -118, -54);
  ctx.fill();
  ctx.fillStyle = P.surface;
  ctx.beginPath();
  ctx.ellipse(-44, 6, 23, 15, 0, 0, Math.PI * 2);
  ctx.ellipse(44, 6, 23, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  label(ctx, 'private window', wx + ww / 2, wy + 600, { size: 34, color: P.inkSoft, weight: 600 });
  ctx.save();
  ctx.strokeStyle = alpha(P.ink, 0.14);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(wx + 70, wy + 650);
  ctx.lineTo(wx + ww - 70, wy + 650);
  ctx.stroke();
  ctx.restore();

  // …and the note is still on the shelf, outside the window
  const a = prog(t, 0.35, 0.75);
  ctx.save();
  ctx.globalAlpha = 0.75 + 0.25 * a;
  chip(ctx, wx + 96, wy + 712, 'the note is still there', { size: 24, accent: false, border: alpha(P.stop, 0.6) });
  ctx.restore();

  // the shelf, small, drawn in the lower half so the split never crops it
  const proj = projector(wx + ww / 2, 1560, 0.62);
  taggedBox(ctx, proj, { x: -50, y: -40, z: 0, s: 56, glow: a });

  // dim wash over the left panel
  ctx.save();
  ctx.fillStyle = alpha(P.ink, 0.09);
  ctx.fillRect(0, 0, W * 0.62, H);
  ctx.restore();
}

/** The RFC card. Deliberately unglamorous. */
function specCard(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 0.6 });
  const x = 96;
  const y = 380;
  const w = W - 192;
  const h = 900;
  paperCard(ctx, x, y, w, h, { r: 14, fill: '#FFFEFB', border: mix(P.line, -0.05) });

  label(ctx, 'RFC 6265', x + 64, y + 96, { size: 34, color: P.inkSoft, align: 'left', weight: 700, spacing: 3 });
  label(ctx, 'Section 7.1 · Privacy Considerations', x + 64, y + 142, { size: 26, color: alpha(P.ink, 0.55), align: 'left', weight: 500 });

  ctx.save();
  ctx.fillStyle = alpha(P.ink, 0.65);
  ctx.fillRect(x + 64, y + 178, w - 128, 3);
  ctx.restore();

  ctx.save();
  ctx.font = `400 46px ${FONT_SERIF}`;
  ctx.fillStyle = P.ink;
  ctx.textAlign = 'left';
  const quote = [
    '“Third-party cookies let a server',
    'track a user across different',
    'sites. This is particularly',
    'worrisome.”',
  ];
  quote.forEach((line, i) => ctx.fillText(line, x + 64, y + 280 + i * 76));
  ctx.restore();

  // the underline that makes it a quote
  ctx.save();
  ctx.strokeStyle = alpha(P.accent, 0.9);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + 64, y + 620);
  ctx.lineTo(x + 430, y + 620);
  ctx.stroke();
  ctx.restore();

  label(ctx, 'the standard itself agrees', x + 64, y + 700, { size: 28, color: P.accent, align: 'left', weight: 700 });
}

/** Three browsers, three toggles, going off. */
function browsersWorld(ctx, shot, frame, t) {
  backdrop(ctx);
  const names = ['Safari', 'Firefox', 'Brave'];
  const cw = 236;
  const gap = 22;
  const totalW = cw * 3 + gap * 2;
  const x0 = (W - totalW) / 2;

  names.forEach((name, i) => {
    const x = x0 + i * (cw + gap);
    const y = 380 + i * 10;
    paperCard(ctx, x, y, cw, 540, { r: 24 });

    ctx.save();
    ctx.translate(x + cw / 2, y + 150);
    ctx.strokeStyle = mix(P.link, -0.1);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(0, 0, 62, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = alpha(mix(P.link, 0.4), 0.5);
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, name[0], 0, 18, { size: 52, color: mix(P.link, -0.2), weight: 700 });
    ctx.restore();

    label(ctx, name, x + cw / 2, y + 274, { size: 28, color: P.ink, weight: 700 });

    // the tracker dot, and its toggle
    const off = prog(t, 0.25 + i * 0.08, 0.55 + i * 0.08);
    ctx.save();
    ctx.fillStyle = off > 0.5 ? alpha(P.ink, 0.18) : P.stop;
    ctx.beginPath();
    ctx.arc(x + cw / 2, y + 322, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    label(ctx, off > 0.5 ? 'blocked' : 'tracking', x + cw / 2, y + 352, { size: 21, color: off > 0.5 ? P.inkSoft : P.stop, weight: 700 });

    toggleAnimated(ctx, x + cw / 2 - 54, y + 396, 108, off, { invert: true });
  });

  chip(ctx, W / 2 - 118, 990, 'on by default', { size: 26, accent: false });
}

/** An app, with its own little note. */
function appIconWorld(ctx, shot, frame, t) {
  backdrop(ctx);
  // phone
  ctx.save();
  ctx.shadowColor = alpha(P.ink, 0.25);
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 26;
  roundRect(ctx, 140, 300, 800, 1120, 70);
  ctx.fillStyle = P.ink;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, 158, 318, 764, 1084, 56);
  ctx.fillStyle = '#FFFCF7';
  ctx.fill();

  // icon grid, one hot
  const icons = 3;
  for (let r = 0; r < icons; r++) {
    for (let c = 0; c < icons; c++) {
      const hot = r === 1 && c === 1;
      const x = 210 + c * 240;
      const y = 420 + r * 240;
      roundRect(ctx, x, y, 170, 170, 42);
      ctx.fillStyle = hot ? mix(P.accent, 0.2) : alpha(P.ink, 0.07);
      ctx.fill();
      if (hot) {
        ctx.strokeStyle = P.accent;
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }
  }

  // the note tucked inside the hot icon
  const a = prog(t, 0.2, 0.6);
  ctx.save();
  ctx.globalAlpha = a;
  const nx = 460 + 20;
  const ny = 650 - 20 * a;
  paperCard(ctx, nx, ny, 130, 96, { r: 10, fill: P.surface, border: P.line, shadow: true });
  ctx.strokeStyle = alpha(P.ink, 0.4);
  ctx.lineWidth = 3;
  [24, 44, 64].forEach((dy) => {
    ctx.beginPath();
    ctx.moveTo(nx + 16, ny + dy);
    ctx.lineTo(nx + 100, ny + dy);
    ctx.stroke();
  });
  ctx.restore();

  chip(ctx, 220, 1180, 'settings › privacy', { size: 26 });
  label(ctx, 'apps run their own version', W / 2, 1290, { size: 30, color: P.inkSoft, weight: 600 });
}

/** The settings panel; the switch is the payoff. */
function settingsWorld(ctx, shot, frame, t) {
  backdrop(ctx);
  const x = 70;
  const y = 330;
  const w = 620;
  const h = 880;
  paperCard(ctx, x, y, w, h, { r: 26 });

  label(ctx, 'privacy', x + 48, y + 88, { size: 38, color: P.ink, align: 'left', weight: 700 });

  const rows = [
    ['Block pop-ups', 0],
    ['Send do-not-track', 0],
    ['Block third-party cookies', 1],
    ['Clear on close', 0],
  ];
  rows.forEach(([text, hot], i) => {
    const ry = y + 186 + i * 148;
    if (hot) {
      roundRect(ctx, x + 26, ry - 54, w - 52, 116, 18);
      ctx.fillStyle = alpha(P.accentSoft, 0.55);
      ctx.fill();
      ctx.strokeStyle = alpha(P.accent, 0.65);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    label(ctx, text, x + 52, ry, { size: hot ? 31 : 27, color: hot ? P.ink : P.inkSoft, align: 'left', weight: hot ? 700 : 500 });
    const on = prog(t, 0.3, 0.55);
    if (hot) {
      toggleAnimated(ctx, x + w - 168, ry - 38, 128, on);
    } else {
      ctx.save();
      roundRect(ctx, x + w - 168, ry - 38, 128, 58, 29);
      ctx.fillStyle = alpha(P.ink, 0.10);
      ctx.fill();
      ctx.restore();
    }
  });

  // a hairline from her to the switch: she is pointing at it, not standing next to it
  ctx.save();
  ctx.strokeStyle = alpha(P.accent, 0.55);
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(x + w - 40, y + 186 + 148 * 2 - 8);
  ctx.quadraticCurveTo(x + w + 90, y + 300, x + w + 40, y + 420);
  ctx.stroke();
  ctx.restore();
}

/** Extreme close-up of the switch, held. */
function toggleWorld(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 0.7 });
  const cx = W / 2;
  const cy = 900;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.06);
  const on = 1 - prog(t, 0.12, 0.32); // flipped off, then held
  const w = 760;
  const h = 340;
  roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = blend(P.line, mix(P.good, 0.12), on);
  ctx.fill();
  ctx.strokeStyle = alpha(P.ink, 0.5);
  ctx.lineWidth = 6;
  ctx.stroke();

  const knob = h - 46;
  const travel = w - knob - 46;
  const kx = -w / 2 + 23 + travel * on;
  ctx.save();
  ctx.shadowColor = alpha(P.ink, 0.3);
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, kx, -knob / 2, knob, knob, knob / 2);
  ctx.fillStyle = P.surface;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, kx, -knob / 2, knob, knob, knob / 2);
  ctx.strokeStyle = alpha(P.ink, 0.3);
  ctx.lineWidth = 4;
  ctx.stroke();

  label(ctx, on > 0.5 ? 'ON' : 'OFF', 0, h / 2 + 120, { size: 46, color: mix(P.ink, 0.3), weight: 700, spacing: 6 });
  ctx.restore();

  // the fingertip, coming in
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = mix('#E8C2A8', 0.06);
  ctx.beginPath();
  ctx.ellipse(cx + 210, 1320, 150, 120, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The save frame: the whole system, flat, with one line. */
function flatGrid(ctx, shot, frame, t) {
  backdrop(ctx);

  // one flat plate so the diagram reads as a single object
  const plate = ctx.createRadialGradient(W / 2, 1000, 40, W / 2, 1000, 520);
  plate.addColorStop(0, alpha(P.surface, 0.98));
  plate.addColorStop(0.7, alpha(P.surface, 0.6));
  plate.addColorStop(1, alpha(P.surface, 0));
  ctx.fillStyle = plate;
  ctx.beginPath();
  ctx.ellipse(W / 2, 1000, 520, 440, 0, 0, Math.PI * 2);
  ctx.fill();

  const proj = projector(W * 0.40, 1300, 1.42);
  isoGround(ctx, proj, { x0: -150, y0: -110, x1: 200, y1: 110, step: 52 });

  // the note on its shelf
  const tone = FAMILY.storage;
  shelf(ctx, proj, { x: -190, y: -40, w: 150, d: 92, h: 220, tone: { top: tone.top, left: tone.left, right: tone.right } });
  const a = proj(-160, -8, 232);
  taggedBox(ctx, proj, { x: -160, y: -6, z: 228, s: 60, glow: 0.7 });
  chip(ctx, a[0] - 66, a[1] + 150, 'one note', { size: 27 });

  // two site markers, drawn as small buildings rather than pins
  [
    { x: 30, label: 'site 1' },
    { x: 220, label: 'site 2' },
  ].forEach((m, i) => {
    const base = proj(m.x, 30, 0);
    const top = proj(m.x, 30, 150);
    ctx.save();
    ctx.strokeStyle = alpha(P.ink, 0.45);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(base[0], base[1]);
    ctx.lineTo(top[0], top[1]);
    ctx.stroke();
    poly(ctx, [[top[0], top[1] - 74], [top[0] + 58, top[1] - 42], [top[0], top[1] - 10], [top[0] - 58, top[1] - 42]],
      mix(P.link, 0.42), mix(P.link, -0.25), 3);
    label(ctx, m.label, top[0], top[1] - 96, { size: 25, color: P.inkSoft, weight: 600 });
    ctx.restore();
  });

  const b = proj(238, 30, 150);
  dottedArc(ctx, [a[0] + 20, a[1] - 40], [b[0] - 40, b[1] - 44], {
    bulge: 130, color: alpha(P.accent, 0.85), progress: prog(t, 0.1, 0.6), width: 5,
  });

  // the switch
  chip(ctx, 700, 1290, 'one switch', { size: 26 });
  toggleAnimated(ctx, 700, 1325, 210, 1);

  // the one line, big, at the top edge
  const line = prog(t, 0.2, 0.6);
  ctx.save();
  ctx.globalAlpha = line;
  label(ctx, 'one note · every site · one switch', W / 2, 452, { size: 50, color: P.ink, weight: 700 });
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = line * 0.9;
  ctx.strokeStyle = alpha(P.accent, 0.9);
  ctx.lineWidth = 6;
  const tw = 720 * line;
  ctx.beginPath();
  ctx.moveTo(W / 2 - tw / 2, 492);
  ctx.lineTo(W / 2 + tw / 2, 492);
  ctx.stroke();
  ctx.restore();
}

/** Recap: the dimmed world and three chips. */
function recapWorld(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 0.5, vignette: 1 });
  const proj = projector(W * 0.5, 1010, 1.35);
  ctx.save();
  ctx.globalAlpha = 0.55;
  shelf(ctx, proj, { x: -150, y: -40, w: 150, d: 92, h: 210, tone: FAMILY.storage });
  taggedBox(ctx, proj, { x: -118, y: -8, z: 222, s: 56 });
  ctx.restore();

  const chips = ['note', 'shared', 'blocked'];
  chips.forEach((c, i) => {
    const a = prog(t, 0.04 + i * 0.16, 0.2 + i * 0.16);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    const y = 700 + i * 130 - 14 * (1 - a);
    const w = 420;
    roundRect(ctx, W / 2 - w / 2, y, w, 108, 54);
    ctx.fillStyle = i === 2 ? mix(P.good, 0.1) : P.surface;
    ctx.fill();
    ctx.strokeStyle = i === 2 ? mix(P.good, -0.1) : P.line;
    ctx.lineWidth = 3;
    ctx.stroke();
    label(ctx, c, W / 2, y + 70, { size: 44, color: i === 2 ? mix(P.good, -0.3) : P.ink, weight: 700 });
    ctx.restore();
  });
}

const PAINTERS = {
  pov_phone: povPhone,
  feed_ad: feedAd,
  bokeh,
  shelf_one: shelfOne,
  shelf_two: shelfTwo,
  note_open: noteOpen,
  note_number: noteNumber,
  stamp: stampWorld,
  link: linkWorld,
  incognito: incognitoWorld,
  spec_card: specCard,
  browsers: browsersWorld,
  app_icon: appIconWorld,
  settings: settingsWorld,
  toggle: toggleWorld,
  flat_grid: flatGrid,
  recap: recapWorld,
};

export function drawWorld(ctx, shot, frame, t) {
  const painter = PAINTERS[shot.world] || bokeh;
  ctx.save();
  painter(ctx, shot, frame, t);
  ctx.restore();
}

export function worldExists(id) {
  return Boolean(PAINTERS[id]);
}
