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

/** Shot 1: the shoe listing, seen from her hand. */
function povPhone(ctx, shot, frame, t) {
  backdrop(ctx);
  // desk
  ctx.fillStyle = mix(P.isoLeft, 0.18);
  ctx.beginPath();
  ctx.moveTo(0, 1420);
  ctx.lineTo(W, 1250);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  const push = 1 + 0.035 * t;
  ctx.save();
  ctx.translate(W / 2, 900);
  ctx.scale(push, push);
  ctx.translate(-W / 2, -900);
  ctx.rotate(-0.035);

  // phone body
  const px = 190;
  const py = 300;
  const pw = 700;
  const ph = 1230;
  ctx.save();
  ctx.shadowColor = alpha(P.ink, 0.28);
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 26;
  roundRect(ctx, px, py, pw, ph, 62);
  ctx.fillStyle = P.ink;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, px + 16, py + 16, pw - 32, ph - 32, 48);
  ctx.fillStyle = '#FFFCF7';
  ctx.fill();

  // status bar
  label(ctx, '9:41', px + 62, py + 92, { size: 24, color: alpha(P.ink, 0.55), align: 'left' });

  // product photo
  const cx = px + 44;
  const cy = py + 130;
  const cw = pw - 88;
  const ch = 620;
  roundRect(ctx, cx, cy, cw, ch, 34);
  ctx.fillStyle = mix(P.accentSoft, 0.45);
  ctx.fill();

  // a stylised shoe
  ctx.save();
  ctx.translate(cx + cw / 2, cy + ch * 0.58);
  ctx.rotate(-0.06);
  ctx.fillStyle = mix(P.accent, 0.1);
  ctx.beginPath();
  ctx.ellipse(0, -10, 190, 96, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = mix(P.accent, 0.32);
  ctx.beginPath();
  ctx.moveTo(-190, -10);
  ctx.bezierCurveTo(-150, 70, 120, 92, 196, 26);
  ctx.lineTo(210, 54);
  ctx.bezierCurveTo(130, 132, -160, 108, -205, 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = P.surface;
  roundRect(ctx, -200, 42, 410, 30, 15);
  ctx.fill();
  ctx.strokeStyle = alpha(P.ink, 0.35);
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(-40 + i * 34, -46);
    ctx.lineTo(-24 + i * 34, -16);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();

  // mock screen UI (drawn unrotated so the type stays crisp)
  ctx.save();
  const ux = px + 44;
  const uy = cy + ch + 44;
  label(ctx, 'Trail Runner 2', ux, uy + 26, { size: 44, color: P.ink, align: 'left', weight: 700 });
  label(ctx, '$48', ux, uy + 84, { size: 38, color: P.accent, align: 'left', weight: 700 });
  label(ctx, 'Free returns', ux + 116, uy + 84, { size: 26, color: P.inkSoft, align: 'left', weight: 500 });

  const btnPulse = 1 + 0.012 * Math.sin(frame / 5) * (t > 0.55 ? 1 : 0);
  ctx.save();
  ctx.translate(ux + (pw - 88) / 2, uy + 190);
  ctx.scale(btnPulse, btnPulse);
  roundRect(ctx, -(pw - 88) / 2, -44, pw - 88, 88, 44);
  ctx.fillStyle = P.accent;
  ctx.fill();
  label(ctx, 'Add to cart', 0, 15, { size: 34, color: '#FFF8F3', weight: 700 });
  ctx.restore();
  ctx.restore();

  // the hand: a thumb reaching in from the bottom-right, with a nail
  ctx.save();
  const hx = 872;
  const hy = 1520 + Math.sin(frame / 9) * 5;
  ctx.translate(hx, hy);
  ctx.rotate(-0.5);
  const skin = mix('#E8C2A8', 0.05);
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-150, 300);
  ctx.bezierCurveTo(-190, 60, -120, -190, 10, -250);
  ctx.bezierCurveTo(120, -300, 190, -190, 165, -60);
  ctx.bezierCurveTo(150, 80, 120, 240, 130, 320);
  ctx.closePath();
  ctx.fill();
  // nail
  ctx.fillStyle = mix('#F6DCCB', 0.25);
  ctx.beginPath();
  ctx.ellipse(28, -196, 46, 62, 0.06, 0, Math.PI * 2);
  ctx.fill();
  // shadow side
  ctx.fillStyle = alpha('#8A5A44', 0.10);
  ctx.beginPath();
  ctx.moveTo(-150, 300);
  ctx.bezierCurveTo(-190, 60, -120, -190, 10, -250);
  ctx.bezierCurveTo(-40, -170, -70, 40, -30, 300);
  ctx.closePath();
  ctx.fill();
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
      // the same shoe, recognisably
      ctx.save();
      ctx.translate(x + w / 2, c.y + 300);
      ctx.scale(0.82, 0.82);
      ctx.rotate(-0.05);
      ctx.fillStyle = mix(P.accent, 0.32);
      ctx.beginPath();
      ctx.moveTo(-190, -10);
      ctx.bezierCurveTo(-150, 70, 120, 92, 196, 26);
      ctx.lineTo(210, 54);
      ctx.bezierCurveTo(130, 132, -160, 108, -205, 34);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = P.surface;
      roundRect(ctx, -200, 42, 410, 28, 14);
      ctx.fill();
      ctx.restore();
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
  const x = 110;
  const y = 360;
  const w = W - 220;
  const h = 900;
  paperCard(ctx, x, y, w, h, { r: 26 });

  label(ctx, 'privacy', x + 56, y + 92, { size: 40, color: P.ink, align: 'left', weight: 700 });

  const rows = [
    ['Block pop-ups', 0],
    ['Send do-not-track', 0],
    ['Block third-party cookies', 1],
    ['Clear on close', 0],
  ];
  rows.forEach(([text, hot], i) => {
    const ry = y + 190 + i * 150;
    if (hot) {
      roundRect(ctx, x + 30, ry - 58, w - 60, 124, 18);
      ctx.fillStyle = alpha(P.accentSoft, 0.55);
      ctx.fill();
      ctx.strokeStyle = alpha(P.accent, 0.65);
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    label(ctx, text, x + 60, ry, { size: hot ? 34 : 30, color: hot ? P.ink : P.inkSoft, align: 'left', weight: hot ? 700 : 500 });
    const on = prog(t, 0.3, 0.55);
    if (hot) {
      toggleAnimated(ctx, x + w - 190, ry - 40, 140, on);
    } else {
      ctx.save();
      roundRect(ctx, x + w - 190, ry - 40, 140, 62, 31);
      ctx.fillStyle = alpha(P.ink, 0.10);
      ctx.fill();
      ctx.restore();
    }
  });
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

  const proj = projector(W * 0.40, 1120, 1.65);
  isoGround(ctx, proj, { x0: -150, y0: -110, x1: 200, y1: 110, step: 52 });

  // the note on its shelf
  const tone = FAMILY.storage;
  shelf(ctx, proj, { x: -190, y: -40, w: 150, d: 92, h: 220, tone: { top: tone.top, left: tone.left, right: tone.right } });
  const a = proj(-160, -8, 232);
  taggedBox(ctx, proj, { x: -160, y: -6, z: 228, s: 60, glow: 0.7 });
  chip(ctx, a[0] - 120, 1340, 'one note', { size: 27 });

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
  chip(ctx, 700, 1210, 'one switch', { size: 26 });
  toggleAnimated(ctx, 700, 1245, 210, 1);

  // the one line, big, at the top edge
  const line = prog(t, 0.2, 0.6);
  ctx.save();
  ctx.globalAlpha = line;
  label(ctx, 'one note · every site · one switch', W / 2, 512, { size: 52, color: P.ink, weight: 700 });
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = line * 0.9;
  ctx.strokeStyle = alpha(P.accent, 0.9);
  ctx.lineWidth = 6;
  const tw = 720 * line;
  ctx.beginPath();
  ctx.moveTo(W / 2 - tw / 2, 552);
  ctx.lineTo(W / 2 + tw / 2, 552);
  ctx.stroke();
  ctx.restore();
}

/** Recap: the dimmed world and three chips. */
function recapWorld(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 0.5, vignette: 1 });
  const proj = projector(W * 0.5, 1010, 1.2);
  ctx.save();
  ctx.globalAlpha = 0.55;
  shelf(ctx, proj, { x: -150, y: -40, w: 150, d: 92, h: 210, tone: FAMILY.storage });
  taggedBox(ctx, proj, { x: -118, y: -8, z: 222, s: 56 });
  ctx.restore();

  const chips = ['note', 'shared', 'blocked'];
  chips.forEach((c, i) => {
    const a = prog(t, 0.12 + i * 0.2, 0.32 + i * 0.2);
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
