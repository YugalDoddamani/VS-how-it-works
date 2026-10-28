/**
 * worlds-episode.js - the long-form world: a clean workshop, drawn on the same
 * paper as the reels.
 *
 * The reels live on a shelf system; episodes live on a workbench. Same
 * projection, same palette, same line weight - a viewer should know which series
 * they are watching before she speaks, and that it is the same channel.
 *
 * Rules this file keeps, because breaking any one of them is visible:
 *
 *   - The frame is built in three bands: a kicker at y 300, the stage from 380
 *     to 1000, and the bench slab from 1010 down. Object bases sit on the bench
 *     (y ~1004) and everything is above y 1180, because she stands at the bottom
 *     of the frame and the caption card starts at 1490.
 *   - The first frame of a shot is already composed. Things move and settle, but
 *     nothing important fades up from an empty frame: a shot that starts blank
 *     reads as a loading screen.
 *   - Type is small and diegetic. The spoken line lives on the caption card; the
 *     world writes the labels a person would find on a bench (GOAL, TOOLS, CHECK,
 *     sensible), never a headline competing with the caption.
 *   - Positions are given in screen space through `benchBox()`, which solves the
 *     isometric coordinates that put a box's base centre on a chosen pixel. Hand
 *     placed iso coordinates are how a bench ends up with floating crates.
 *
 * Every painter takes (ctx, shot, frame, t) with t 0..1 through the shot.
 */

import { P, alpha, mix, FONT_SANS, FONT_SERIF } from './palette.js';
import { projector, isoBox, roundRect, poly, chip, paperCard } from './iso.js';
import { backdrop, label, easeOut, prog } from './page.js';

const W = 1080;

const KICKER_Y = 300;
const STAGE_TOP = 380;
const BENCH_Y = 1010;
const BENCH_LINE = BENCH_Y - 6;   // where object bases sit
const BUSY_Y = 800;               // the middle of the stage, for loose objects

// ---------------------------------------------------------------------------
// shared pieces
// ---------------------------------------------------------------------------

/** The small caps line at the top left: what this shot is about. */
function kicker(ctx, text, { y = KICKER_Y, x = 84, colour = alpha(P.ink, 0.42) } = {}) {
  if (!text) return;
  label(ctx, text.toUpperCase(), x, y, { size: 24, color: colour, weight: 700, align: 'left', spacing: 3 });
  ctx.save();
  ctx.strokeStyle = alpha(P.line, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y + 22);
  ctx.lineTo(x + 84, y + 22);
  ctx.stroke();
  ctx.restore();
}

/**
 * The workbench everything in this series stands on: an edge-on slab with a
 * cabinet front under it. The front matters - without it the bottom third of the
 * frame is bare paper, and a bare bottom is the difference between a set and a
 * slide.
 */
function benchSlab(ctx, { y = BENCH_Y, depth = 452 } = {}) {
  // cabinet front, drawn first so the top face overlaps it
  poly(
    ctx,
    [[-40, y + 38], [W + 40, y + 20], [W + 40, y + 20 + depth], [-40, y + 38 + depth]],
    mix(P.isoRight, 0.3),
    null,
    0
  );

  // two drawers and their handles
  ctx.save();
  const drawerTop = y + 108;
  const drawerH = 104;
  for (let d = 0; d < 2; d++) {
    const top = drawerTop + d * (drawerH + 26);
    poly(
      ctx,
      [[-40, top], [W + 40, top - 18], [W + 40, top - 18 + drawerH], [-40, top + drawerH]],
      mix(P.isoRight, 0.42),
      alpha(P.isoEdge, 0.3),
      2
    );
    // handle
    const hy = top + drawerH * 0.5 - 8;
    roundRect(ctx, W / 2 - 88, hy, 176, 16, 8);
    ctx.fillStyle = alpha(P.isoEdge, 0.55);
    ctx.fill();
  }
  ctx.restore();

  // the worktop itself
  poly(
    ctx,
    [[-40, y - 44], [W + 40, y - 62], [W + 40, y + 26], [-40, y + 44]],
    mix(P.isoLeft, 0.52),
    alpha(P.isoEdge, 0.45),
    2
  );
  ctx.save();
  ctx.strokeStyle = alpha(P.isoEdge, 0.22);
  ctx.lineWidth = 2;
  for (let i = 1; i < 3; i++) {
    const yy = y - 44 + i * 24;
    ctx.beginPath();
    ctx.moveTo(-40, yy);
    ctx.lineTo(W + 40, yy - 18);
    ctx.stroke();
  }
  ctx.restore();
}

/** A soft contact shadow, so objects sit on the bench instead of floating. */
function shadow(ctx, cx, cy, rx, ry = rx * 0.26, a = 0.1) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, rx);
  g.addColorStop(0, alpha(P.ink, a));
  g.addColorStop(1, alpha(P.ink, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const CRATE = (tone, shift = 0) => ({
  top: mix(tone, 0.74 + shift),
  left: mix(tone, 0.16 + shift),
  right: mix(tone, -0.06 + shift),
});

/**
 * Put an iso box's base centre on a screen point.
 * @returns {{x:number,y:number}} the top-face centre, for stacking labels on it
 */
function benchBox(ctx, proj, ox, oy, scale, sx, sy, { w, d, h, tone = P.accent, edge } = {}) {
  const C = Math.cos(Math.PI / 6);
  const u = (sx - ox) / (C * scale);
  const v = (sy - oy) / (0.5 * scale);
  const xc = (u + v) / 2;
  const yc = (v - u) / 2;
  isoBox(ctx, proj, {
    x: xc - w / 2,
    y: yc - d / 2,
    w,
    d,
    h,
    tones: CRATE(tone),
    edge,
  });
  return { x: sx, y: sy - h * scale, h };
}

function tick(ctx, x, y, s, colour = P.good, w = 5) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, y);
  ctx.lineTo(x - s * 0.1, y + s * 0.42);
  ctx.lineTo(x + s * 0.55, y - s * 0.42);
  ctx.stroke();
  ctx.restore();
}

function cross(ctx, x, y, s, colour = P.stop, w = 5) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s / 2, y - s / 2);
  ctx.lineTo(x + s / 2, y + s / 2);
  ctx.moveTo(x + s / 2, y - s / 2);
  ctx.lineTo(x - s / 2, y + s / 2);
  ctx.stroke();
  ctx.restore();
}

function arrow(ctx, a, b, { colour = P.accent, width = 5, head = 18, progress = 1 } = {}) {
  const p = Math.max(0, Math.min(1, progress));
  const ex = a[0] + (b[0] - a[0]) * p;
  const ey = a[1] + (b[1] - a[1]) * p;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  if (p > 0.6) {
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(ang - 0.55) * head, ey - Math.sin(ang - 0.55) * head);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - Math.cos(ang + 0.55) * head, ey - Math.sin(ang + 0.55) * head);
    ctx.stroke();
  }
  ctx.restore();
}

/** A parcel: the thing the machine moves around. Screen space. */
function parcel(ctx, x, y, s, { tilt = 0, tone = P.accent, tickIn = 0, bad = false, fold = true } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.shadowColor = alpha(P.ink, 0.18);
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.18);
  ctx.fillStyle = mix(tone, 0.6);
  ctx.fill();
  ctx.shadowColor = alpha(P.ink, 0);
  ctx.strokeStyle = mix(tone, -0.28);
  ctx.lineWidth = 2.5;
  ctx.stroke();
  if (fold) {
    ctx.strokeStyle = alpha(mix(tone, -0.25), 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s / 2, -s / 2 + s * 0.3);
    ctx.lineTo(s / 2, -s / 2 + s * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -s / 2);
    ctx.lineTo(0, -s / 2 + s * 0.3);
    ctx.stroke();
  }
  if (tickIn > 0) tick(ctx, 0, s * 0.14, s * 0.34 * tickIn, P.good, 5 * tickIn);
  if (bad) cross(ctx, 0, s * 0.14, s * 0.3, P.stop, 5);
  ctx.restore();
}

/** A card standing on the bench: heading, optional ticked rows. */
function standingCard(ctx, x, y, w, h, { title, rows = [], kickerText, tone = P.surface } = {}) {
  paperCard(ctx, x, y, w, h, { r: 26, fill: tone });
  let cy = y + 74;
  if (kickerText) {
    label(ctx, kickerText.toUpperCase(), x + 40, cy, {
      size: 22, color: alpha(P.ink, 0.42), weight: 700, align: 'left', spacing: 3,
    });
    cy += 40;
  }
  if (title) {
    ctx.save();
    ctx.font = `600 52px ${FONT_SERIF}`;
    ctx.fillStyle = P.ink;
    ctx.textAlign = 'left';
    ctx.fillText(title, x + 40, cy + 28);
    ctx.restore();
    cy += 88;
  }
  rows.forEach((row, i) => {
    const ry = cy + i * 86;
    roundRect(ctx, x + 40, ry - 20, 44, 44, 10);
    ctx.strokeStyle = alpha(P.ink, 0.3);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    tick(ctx, x + 62, ry + 2, 32, P.good, 5);
    label(ctx, row, x + 104, ry + 12, { size: 30, color: P.inkSoft, weight: 500, align: 'left' });
  });
}

/** A small robot: the thing the myth is about, drawn so it can be crossed out. */
function robot(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  // body
  roundRect(ctx, -s * 0.34, -s * 0.1, s * 0.68, s * 0.58, s * 0.1);
  ctx.fillStyle = mix(P.link, 0.62);
  ctx.fill();
  ctx.strokeStyle = mix(P.link, -0.18);
  ctx.lineWidth = 3;
  ctx.stroke();
  // head
  roundRect(ctx, -s * 0.28, -s * 0.54, s * 0.56, s * 0.42, s * 0.12);
  ctx.fillStyle = mix(P.link, 0.76);
  ctx.fill();
  ctx.stroke();
  // eyes
  ctx.fillStyle = alpha(P.ink, 0.72);
  for (const dx of [-0.11, 0.11]) {
    ctx.beginPath();
    ctx.arc(dx * s, -s * 0.36, s * 0.042, 0, Math.PI * 2);
    ctx.fill();
  }
  // antenna
  ctx.strokeStyle = mix(P.link, -0.18);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.54);
  ctx.lineTo(0, -s * 0.7);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -s * 0.73, s * 0.05, 0, Math.PI * 2);
  ctx.fillStyle = P.accent;
  ctx.fill();
  // arms
  ctx.beginPath();
  ctx.moveTo(-s * 0.34, s * 0.04);
  ctx.lineTo(-s * 0.48, s * 0.24);
  ctx.moveTo(s * 0.34, s * 0.04);
  ctx.lineTo(s * 0.48, s * 0.24);
  ctx.stroke();
  ctx.restore();
}


/**
 * A one-line verdict under the stage. She stands in a corner, so the line moves
 * to the other side of the frame instead of being written across her head.
 */
function statusLine(ctx, shot, text, { y = 1150, size = 29, colour = P.inkSoft } = {}) {
  const right = shot.placement === 'corner-bl';
  const left = shot.placement === 'corner-br';
  label(ctx, text, right ? 900 : left ? 180 : W / 2, y, {
    size,
    color: colour,
    weight: 500,
    align: right ? 'right' : left ? 'left' : 'center',
  });
}

// ---------------------------------------------------------------------------
// beat worlds
// ---------------------------------------------------------------------------

/** Beat 1 - "you did not get replaced by AI, you got replaced by a checklist." */
function epChecklist(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 1 });
  benchSlab(ctx);
  kicker(ctx, 'replaced by');

  const cardX = 96;
  const cardW = 468;
  const rows = (shot.items && shot.items.length
    ? shot.items
    : ['open the mail', 'sort it', 'paste the number', 'send the reply']).slice(0, 4);
  shadow(ctx, cardX + cardW / 2, BENCH_Y + 8, cardW * 0.46, 30, 0.1);
  standingCard(ctx, cardX, STAGE_TOP + 20, cardW, 600, {
    kickerText: 'replaced by',
    title: 'A checklist',
    rows,
  });

  // the list keeps working: a scan line walks down it
  const scan = easeOut(prog(t, 0.08, 0.8));
  ctx.save();
  ctx.strokeStyle = alpha(P.accent, 0.4);
  ctx.lineWidth = 3;
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(cardX + 34, 640 + scan * 300);
  ctx.lineTo(cardX + cardW - 34, 640 + scan * 300);
  ctx.stroke();
  ctx.restore();

  // the robot, on the bench, dismissed
  const rx = 800;
  const ry = 850;
  shadow(ctx, rx, BENCH_Y + 4, 150, 26, 0.09);
  robot(ctx, rx, ry, 272);
  const strike = easeOut(prog(t, 0.24, 0.44));
  if (strike > 0) {
    ctx.save();
    ctx.strokeStyle = mix(P.stop, -0.06);
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.ellipse(rx, ry, 168, 158, -0.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    label(ctx, 'not by AI', rx, ry + 206, {
      size: 30, color: alpha(P.stop, 0.92 * Math.min(1, strike * 2)), weight: 700,
    });
  }
}

/** Beat 2 - the title card. Type, and the loop's parts waiting on the bench. */
function epTitle(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 1.1 });
  benchSlab(ctx);
  const proj = projector(W / 2, BENCH_LINE, 1);

  const words = String(shot.text || 'How AI automation works').split(/\s+/);
  const mid = Math.ceil(words.length / 2);
  const lines = words.length > 3
    ? [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
    : [words.join(' ')];

  const inA = easeOut(prog(t, 0, 0.14));
  ctx.save();
  ctx.globalAlpha = 0.55 + 0.45 * inA;
  ctx.translate(0, (1 - inA) * 12);
  label(ctx, 'Episode 02 · AI Without the Hype', W / 2, 520, {
    size: 26, color: alpha(P.ink, 0.45), weight: 700, spacing: 3,
  });
  ctx.font = `600 84px ${FONT_SERIF}`;
  ctx.fillStyle = P.ink;
  ctx.textAlign = 'center';
  ctx.fillText(lines[0], W / 2, 650);
  if (lines[1]) ctx.fillText(lines[1], W / 2, 748);
  ctx.restore();

  const rule = easeOut(prog(t, 0.1, 0.34));
  ctx.save();
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(W / 2 - 100, 806);
  ctx.lineTo(W / 2 - 100 + 200 * rule, 806);
  ctx.stroke();
  ctx.restore();

  label(ctx, 'a goal, some tools, a check, and a loop', W / 2, 872, {
    size: 34, color: P.inkSoft, weight: 500,
  });

  const parts = ['goal', 'tools', 'check', 'again'];
  parts.forEach((part, i) => {
    const pop = easeOut(prog(t, 0.1 + i * 0.09, 0.26 + i * 0.09));
    const sx = 300 + i * 160;
    shadow(ctx, sx, BENCH_LINE + 6, 66, 16, 0.06);
    benchBox(ctx, proj, W / 2, BENCH_LINE, 1, sx, BENCH_LINE, {
      w: 80, d: 80, h: 64 + 26 * pop, tone: i === 2 ? P.good : P.accent,
    });
    label(ctx, part, sx, 1092, { size: 22, color: alpha(P.ink, 0.45), weight: 600 });
  });
}

/** Beat 3 - automation is steps a machine follows, in order. */
function epSteps(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 0.95 });
  kicker(ctx, 'automation');

  ctx.save();
  ctx.font = `600 60px ${FONT_SERIF}`;
  ctx.fillStyle = P.ink;
  ctx.textAlign = 'center';
  ctx.fillText('Steps, in order', W / 2, 470);
  ctx.restore();
  label(ctx, 'a machine follows them without asking you first', W / 2, 522, {
    size: 30, color: P.inkSoft, weight: 500,
  });

  benchSlab(ctx);
  const proj = projector(W / 2, BENCH_LINE, 1);
  const steps = (shot.items && shot.items.length ? shot.items : ['read', 'sort', 'decide', 'send']).slice(0, 4);
  const xs = [180, 420, 660, 900];
  steps.forEach((step, i) => {
    const pop = easeOut(prog(t, 0.04 + i * 0.05, 0.18 + i * 0.05));
    shadow(ctx, xs[i], BENCH_LINE + 6, 80, 20, 0.07);
    const box = benchBox(ctx, proj, W / 2, BENCH_LINE, 1, xs[i], BENCH_LINE, {
      w: 100, d: 100, h: 104 + 14 * pop, tone: P.accent,
    });
    // the number sits on the near face, where a crate stencil would be
    label(ctx, String(i + 1), xs[i] - 30, BENCH_LINE - 34, {
      size: 40, color: '#FFF7F1', weight: 700,
    });
    chip(ctx, xs[i] - 52, box.y - 42, step, { size: 24 });
  });

  for (let i = 0; i < 3; i++) {
    arrow(ctx, [xs[i] + 96, BENCH_LINE - 62], [xs[i + 1] - 96, BENCH_LINE - 62], {
      colour: alpha(P.ink, 0.28),
      width: 4,
      head: 13,
      progress: prog(t, 0.08 + i * 0.07, 0.26 + i * 0.07),
    });
  }

  // the parcel walks the line, one crate per quarter of the shot
  const walk = Math.min(0.999, prog(t, 0.12, 0.95)) * 3;
  const seg = Math.floor(walk);
  const frac = walk - seg;
  const px = xs[seg] + (xs[seg + 1] - xs[seg]) * easeOut(frac);
  const py = BENCH_LINE - 250 - Math.sin(frac * Math.PI) * 46;
  shadow(ctx, px, BENCH_LINE + 2, 54, 14, 0.05);
  parcel(ctx, px, py, 104, { tone: P.accent });
}

/**
 * Beats 4 and 5 - the rules, and then the rules breaking.
 *
 * The sentence is "if this, then that", so the picture is literally two cards
 * with the parcel crossing between them. When the rule fails, the crossing is
 * what breaks: the arrow goes dashed and the parcel that arrives does not fit
 * through it.
 */
function rulesScene(ctx, shot, frame, t, { broken = false } = {}) {
  backdrop(ctx, { warm: broken ? 0.75 : 0.95 });
  kicker(ctx, broken ? 'one week later' : 'rules');

  ctx.save();
  ctx.font = `600 58px ${FONT_SERIF}`;
  ctx.fillStyle = P.ink;
  ctx.textAlign = 'center';
  ctx.fillText(broken ? 'One week later' : 'If this, then that', W / 2, 452);
  ctx.restore();
  label(ctx, broken ? 'real life does not read the rule' : 'no judgement, no model, just a rule', W / 2, 504, {
    size: 29, color: P.inkSoft, weight: 500,
  });

  benchSlab(ctx);
  const proj = projector(W / 2, BENCH_LINE, 1);
  const cardY = 552;
  const cardH = 262;

  const cards = [
    { x: 84, tag: 'IF', head: 'the form has a name', sub: 'name = column B', tone: P.surface },
    { x: 604, tag: 'THEN', head: 'put it in column B', sub: 'same answer, every time', tone: broken ? mix(P.stop, 0.94) : P.surface },
  ];
  cards.forEach((card, i) => {
    const enter = easeOut(prog(t, 0, 0.12));
    ctx.save();
    ctx.globalAlpha = 0.72 + 0.28 * enter;
    paperCard(ctx, card.x, cardY, 392, cardH, { r: 24, fill: card.tone });
    label(ctx, card.tag, card.x + 34, cardY + 54, {
      size: 23, color: i ? alpha(P.accent, 0.95) : alpha(P.ink, 0.42), weight: 700, align: 'left', spacing: 3,
    });
    ctx.save();
    ctx.font = `600 40px ${FONT_SERIF}`;
    ctx.fillStyle = broken && i === 1 ? alpha(P.ink, 0.45) : P.ink;
    ctx.textAlign = 'left';
    ctx.fillText(card.head, card.x + 34, cardY + 122);
    ctx.restore();
    label(ctx, card.sub, card.x + 34, cardY + 184, {
      size: 25, color: alpha(P.ink, 0.45), weight: 500, align: 'left',
    });
    if (broken && i === 1) {
      cross(ctx, card.x + 340, cardY + 56, 34, P.stop, 7);
      label(ctx, '?', card.x + 196, cardY + 122, { size: 40, color: P.stop, weight: 700 });
    }
    ctx.restore();
  });

  // the crossing between the two cards
  const ay = cardY + 128;
  if (broken) {
    ctx.save();
    ctx.strokeStyle = alpha(P.stop, 0.7);
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(486, ay);
    ctx.lineTo(594, ay);
    ctx.stroke();
    ctx.restore();
    cross(ctx, 540, ay, 34, P.stop, 6);
  } else {
    arrow(ctx, [486, ay], [594, ay], { colour: P.accent, width: 6, head: 16, progress: prog(t, 0.15, 0.4) });
  }

  // the belt under the cards: the rule stamps what runs past it
  const beltY = BENCH_LINE - 36;
  ctx.save();
  ctx.strokeStyle = alpha(P.ink, 0.16);
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(110, beltY);
  ctx.lineTo(970, beltY - 10);
  ctx.stroke();
  ctx.restore();

  const stampX = 540;
  shadow(ctx, stampX, BENCH_LINE + 4, 70, 18, 0.06);
  const stamp = benchBox(ctx, proj, W / 2, BENCH_LINE, 1, stampX, BENCH_LINE, {
    w: 78, d: 78, h: 104, tone: P.isoLeft,
  });
  chip(ctx, stampX - 34, stamp.y - 34, 'RULE', { size: 19 });

  // what runs past it
  const run = easeOut(prog(t, 0.18, broken ? 0.5 : 0.86));
  const px = 190 + run * (broken ? 300 : 640);
  const py = beltY - 76;
  if (!broken) {
    parcel(ctx, px, py, 92, { tone: P.accent, tickIn: prog(t, 0.58, 0.74) });
  } else {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(0.3 + t * 0.2);
    ctx.beginPath();
    const spikes = 7;
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (i * Math.PI) / spikes;
      const r = i % 2 ? 36 : 56;
      const x = Math.cos(ang) * r;
      const y = Math.sin(ang) * r;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = mix(P.stop, 0.55);
    ctx.fill();
    ctx.strokeStyle = mix(P.stop, -0.2);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    statusLine(ctx, shot, 'does not fit', {
      size: 28,
      colour: alpha(P.stop, 0.95 * prog(t, 0.44, 0.6)),
    });
  }

  // filed work waiting on the bench
  [190, 300].forEach((x, i) => {
    shadow(ctx, x, BENCH_LINE + 6, 52, 13, 0.05);
    benchBox(ctx, proj, W / 2, BENCH_LINE, 1, x, BENCH_LINE, {
      w: 70, d: 70, h: 42 + i * 10, tone: P.isoLeft,
    });
  });
}

function epRules(ctx, shot, frame, t) {
  rulesScene(ctx, shot, frame, t, { broken: false });
}

function epRulesBroken(ctx, shot, frame, t) {
  rulesScene(ctx, shot, frame, t, { broken: true });
}

/** Beat 6 - now add a model: messy in, sensible out. */
function epPile(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 0.85 });
  kicker(ctx, 'add a model');

  ctx.save();
  ctx.font = `600 54px ${FONT_SERIF}`;
  ctx.fillStyle = P.ink;
  ctx.textAlign = 'center';
  ctx.fillText('Something that guesses', W / 2, 452);
  ctx.restore();

  benchSlab(ctx);
  const proj = projector(W / 2, BENCH_LINE, 1);

  // the pile: fixed offsets, so the frame is the same every time it is drawn
  shadow(ctx, 200, BUSY_Y, 190, 40, 0.06);
  const pile = [
    [-30, 14, 0.22], [26, 22, -0.16], [-8, -26, 0.5], [44, -18, 0.1],
    [10, 54, -0.28], [54, 46, 0.34], [-44, 44, 0.06],
  ];
  pile.forEach(([dx, dy, rot], i) => {
    const drift = Math.sin((frame / 30) * 1.1 + i) * 2;
    parcel(ctx, 200 + dx + drift, BUSY_Y + dy, 100, { tilt: rot, tone: P.accent });
  });
  label(ctx, 'MESSY IN', 200, BUSY_Y + 132, { size: 24, color: alpha(P.ink, 0.45), weight: 700, spacing: 2 });

  // the funnel sits on the model, so the pile has somewhere to go
  const fx = 548;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(fx - 96, 596);
  ctx.lineTo(fx + 96, 596);
  ctx.lineTo(fx + 36, 710);
  ctx.lineTo(fx - 36, 710);
  ctx.closePath();
  ctx.fillStyle = mix(P.bgDeep, 0.12);
  ctx.fill();
  ctx.strokeStyle = alpha(P.isoEdge, 0.8);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  shadow(ctx, fx, BENCH_LINE + 8, 96, 22, 0.08);
  const model = benchBox(ctx, proj, W / 2, BENCH_LINE, 1, fx, BENCH_LINE, {
    w: 108, d: 108, h: 262, tone: P.link,
  });
  chip(ctx, fx - 34, 700, 'model', { size: 21 });


  const bins = [
    { x: 790, name: 'sensible', tone: P.good },
    { x: 936, name: 'nonsense', tone: P.stop },
  ];
  bins.forEach((bin) => {
    shadow(ctx, bin.x, BENCH_LINE + 6, 54, 14, 0.06);
    benchBox(ctx, proj, W / 2, BENCH_LINE, 1, bin.x, BENCH_LINE, {
      w: 92, d: 92, h: 86, tone: bin.tone,
    });
    label(ctx, bin.name.toUpperCase(), bin.x - 2, BENCH_LINE - 30, {
      size: 18, color: '#FFF9F4', weight: 700, spacing: 1,
    });
  });

  // the sensible guess, landing in front of the bin it chose
  const out = easeOut(prog(t, 0.16, 0.74));
  const gx = model.x + 96 + out * 156;
  const gy = 700 + out * 196;
  parcel(ctx, gx, gy, 86, { tone: P.good, tickIn: prog(t, 0.55, 0.74) });
}

/** Beats 7, 8 and 11 - the loop: goal, tools, check, go again. */
function epLoop(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 0.9 });
  kicker(ctx, shot.footnote ? 'the whole thing' : 'the loop');
  benchSlab(ctx);
  const proj = projector(W / 2, BENCH_LINE, 1);

  const stations = [
    { name: 'GOAL', key: 'goal' },
    { name: 'TOOLS', key: 'tools' },
    { name: 'CHECK', key: 'check' },
    { name: 'AGAIN', key: 'again' },
  ];
  const active = stationKey(shot);
  const xs = [186, 418, 650, 882];

  // the return path under the row: the loop has to visibly come back
  ctx.save();
  ctx.strokeStyle = alpha(P.accent, 0.3);
  ctx.lineWidth = 4;
  ctx.setLineDash([12, 13]);
  ctx.beginPath();
  ctx.moveTo(xs[3], BENCH_LINE + 10);
  ctx.quadraticCurveTo(W / 2, BENCH_LINE + 96, xs[0], BENCH_LINE + 10);
  ctx.stroke();
  ctx.restore();

  if (shot.text) {
    ctx.save();
    ctx.font = `600 54px ${FONT_SERIF}`;
    ctx.fillStyle = P.ink;
    ctx.textAlign = 'center';
    ctx.fillText(shot.text, W / 2, 452);
    ctx.restore();
  }

  stations.forEach((s, i) => {
    const hot = s.key === active;
    const bump = hot ? 22 : 0;
    shadow(ctx, xs[i], BENCH_LINE + 6, 72, 17, 0.06);
    const box = benchBox(ctx, proj, W / 2, BENCH_LINE, 1, xs[i], BENCH_LINE, {
      w: 108, d: 108,
      h: 112 + bump + 5 * Math.sin(t * Math.PI * 2 + i),
      tone: s.key === 'check' ? P.good : P.accent,
    });
    if (hot) {
      ctx.save();
      ctx.strokeStyle = alpha(P.accent, 0.45 + 0.3 * Math.sin(t * Math.PI * 6));
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(xs[i], BENCH_LINE - 44, 96, 56, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    chip(ctx, xs[i] - 46, box.y - 40, s.name, {
      accent: s.key === 'check',
      size: 21,
    });
    label(ctx, String(i + 1), xs[i] - 26, BENCH_LINE - 34, {
      size: 34, color: '#FFF7F1', weight: 700,
    });
  });

  // the parcel sits on the station being talked about, and hops on a cut
  const idx = Math.max(0, stations.findIndex((s) => s.key === active));
  const hop = 1 - easeOut(prog(t, 0, 0.18));
  parcel(ctx, xs[idx], BENCH_LINE - 236 - hop * 26, 84, { tone: P.accent });

  statusLine(ctx, shot, shot.footnote || 'goal · tools · check · go again', {
    y: 1188,
    size: shot.footnote ? 31 : 26,
    colour: shot.footnote ? P.inkSoft : alpha(P.ink, 0.55),
  });
}

/** Which of the four stations this shot is about. */
function stationKey(shot) {
  const f = String(shot.focus || '').toLowerCase();
  if (['goal', 'tools', 'check', 'again'].includes(f)) return f;
  const text = String(shot.caption?.text || shot.vo || shot.text || '').toLowerCase();
  if (text.includes('goal')) return 'goal';
  if (text.includes('tool')) return 'tools';
  if (text.includes('check')) return 'check';
  if (text.includes('again') || text.includes('repeat')) return 'again';
  return 'check';
}

/** Beats 9 and 10 - the check, and what happens without one. */
function epGate(ctx, shot, frame, t) {
  const failing = shot.variant === 'gate_fail';
  backdrop(ctx, { warm: failing ? 0.75 : 0.95 });
  kicker(ctx, failing ? 'no check' : 'the check');

  ctx.save();
  ctx.font = `600 54px ${FONT_SERIF}`;
  ctx.fillStyle = P.ink;
  ctx.textAlign = 'center';
  ctx.fillText(failing ? 'Just vibes' : 'A loop with a check on it', W / 2, 452);
  ctx.restore();
  label(ctx, failing ? 'nothing decides what happens next' : 'one gate, every time round', W / 2, 504, {
    size: 29, color: P.inkSoft, weight: 500,
  });

  benchSlab(ctx);
  const proj = projector(W / 2, BENCH_LINE, 1);
  const railY = BENCH_LINE - 92;

  // the track: a rail with sleepers, so the parcel has something to run on
  ctx.save();
  ctx.strokeStyle = alpha(P.ink, 0.2);
  ctx.lineWidth = 11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(96, railY);
  ctx.lineTo(984, railY - 16);
  ctx.stroke();
  ctx.strokeStyle = alpha(P.ink, 0.13);
  ctx.lineWidth = 4;
  for (let x = 130; x < 980; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, railY - 4);
    ctx.lineTo(x + 4, railY + 32);
    ctx.stroke();
  }
  ctx.restore();

  // the checkpoint: a booth on the rail with an arm that lifts
  const gx = 640;
  const armY = railY - 56;
  shadow(ctx, gx, BENCH_LINE + 6, 150, 30, 0.09);
  const booth = benchBox(ctx, proj, W / 2, BENCH_LINE, 1, gx, BENCH_LINE, {
    w: 150, d: 150, h: 224, tone: P.isoLeft,
  });
  // a stripe of paint down the near face, so the booth reads as a machine
  ctx.save();
  ctx.globalAlpha = 0.5;
  poly(
    ctx,
    [[gx - 14, booth.y + 40], [gx + 34, booth.y + 16], [gx + 34, booth.y + 150], [gx - 14, booth.y + 174]],
    alpha(failing ? P.stop : P.good, 0.5),
    null,
    0
  );
  ctx.restore();
  chip(ctx, gx - 52, booth.y - 74, failing ? 'CLOSED' : 'CHECK', { accent: !failing, size: 22 });

  // the arm
  const pivotX = gx - 118;
  const angle = failing ? 0 : 1.15 * easeOut(prog(t, 0.2, 0.4));
  ctx.save();
  ctx.translate(pivotX, armY);
  ctx.rotate(angle);
  roundRect(ctx, -212, -13, 220, 26, 13);
  ctx.fillStyle = failing ? mix(P.stop, -0.02) : mix(P.accent, 0.04);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(pivotX, armY, 13, 0, Math.PI * 2);
  ctx.fillStyle = alpha(P.ink, 0.45);
  ctx.fill();
  ctx.restore();

  // the parcel runs the rail: either it is waved through, or it is stopped
  const run = easeOut(prog(t, 0.06, failing ? 0.42 : 0.78));
  const px = 150 + run * (failing ? 120 : 700);
  const py = railY - 78;
  shadow(ctx, px, railY + 16, 46, 11, 0.05);
  parcel(ctx, px, py, 92, {
    tone: failing ? P.accent : P.good,
    tickIn: failing ? 0 : prog(t, 0.62, 0.8),
  });

  if (failing) {
    const bad = prog(t, 0.4, 0.58);
    if (bad > 0) {
      cross(ctx, px + 18, armY - 96, 56, alpha(P.stop, bad), 9);
      statusLine(ctx, shot, 'no check, no automation', {
        size: 30,
        colour: alpha(P.stop, 0.95 * bad),
      });
    }
    ctx.save();
    ctx.font = `700 40px ${FONT_SANS}`;
    ctx.fillStyle = alpha(P.ink, 0.26);
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const f = (t * 1.6 + i * 0.33) % 1;
      ctx.globalAlpha = 0.5 * (1 - f);
      ctx.fillText('?', px - 26 + i * 38, py - 76 - f * 84);
    }
    ctx.restore();
  } else {
    const ok = prog(t, 0.66, 0.84);
    if (ok > 0) {
      statusLine(ctx, shot, 'the loop, held together by one check', {
        colour: alpha(P.inkSoft, ok),
      });
    }
  }
}

/** Beat 12 - the sign-off: a signpost with the question on it. */
function epOutro(ctx, shot, frame, t) {
  backdrop(ctx, { warm: 1.1 });
  kicker(ctx, 'next time');
  benchSlab(ctx);

  const sx = 372;
  shadow(ctx, sx, BENCH_LINE + 10, 150, 26, 0.08);
  roundRect(ctx, sx - 9, 640, 18, BENCH_LINE - 640, 6);
  ctx.fillStyle = mix(P.isoLeft, 0.1);
  ctx.fill();
  ctx.strokeStyle = alpha(P.isoEdge, 0.7);
  ctx.lineWidth = 2;
  ctx.stroke();

  const tilt = -0.035 + 0.008 * Math.sin(t * Math.PI * 2);
  ctx.save();
  ctx.translate(sx, 560);
  ctx.rotate(tilt);
  paperCard(ctx, -218, -138, 436, 208, { r: 26 });
  label(ctx, 'ask where', 0, -52, { size: 30, color: alpha(P.ink, 0.45), weight: 600 });
  ctx.save();
  ctx.font = `600 64px ${FONT_SERIF}`;
  ctx.fillStyle = P.ink;
  ctx.textAlign = 'center';
  ctx.fillText('the check is', 0, 38);
  ctx.restore();
  ctx.restore();

  // the loop, still going, drawn small on the bench in front
  const ring = [330, 220, 110];
  ring.forEach((r, i) => {
    ctx.save();
    ctx.strokeStyle = alpha(P.accent, 0.22 - i * 0.05);
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.ellipse(700, BENCH_LINE - 30, 150 + i * 34, 64 + i * 12, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  statusLine(ctx, shot, 'goal · tools · check · again', {
    y: BENCH_LINE + 96,
    size: 24,
    colour: alpha(P.ink, 0.42),
  });
}

export const EPISODE_PAINTERS = {
  ep_checklist: epChecklist,
  ep_title: epTitle,
  ep_steps: epSteps,
  ep_rules: epRules,
  ep_rules_broken: epRulesBroken,
  ep_pile: epPile,
  ep_loop: epLoop,
  ep_gate: epGate,
  ep_outro: epOutro,
};
