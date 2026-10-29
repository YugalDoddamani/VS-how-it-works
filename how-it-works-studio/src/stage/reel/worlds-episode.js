/**
 * worlds-episode.js - the long-form set, and the objects that stand on it.
 *
 * This file used to be nine painters, each of which drew a fixed picture. That
 * had a quiet consequence: the picture decided the meaning. A checklist beat and
 * a "where it fails" beat were both whatever their painter drew, and adding a
 * second robot to a scene was a code change rather than a decision the plan could
 * make.
 *
 * So it is split in two:
 *
 *   - the SET: paper, light, the kicker, the workbench. Always the same, so a
 *     viewer always knows which series they are in.
 *   - the SUBJECTS: a registry of things that can stand on the bench. Every
 *     subject declares a role - demonstrate, compare, transform, label, react -
 *     and a draw function that fills whatever box the layout engine gives it.
 *
 * A shot names its subjects; the painter draws those and nothing else. An object
 * the beat does not need simply is not in the list, so it cannot end up in the
 * frame as decoration.
 *
 * Placement is not decided here either. `composition.js` reserves the caption
 * and the character first and hands back a focal box and supporting boxes; the
 * subjects draw inside them.
 */

import { P, alpha, mix, FONT_SANS, FONT_SERIF } from './palette.js';
import { roundRect, poly, chip, paperCard } from './iso.js';
import { backdrop, label, easeOut, prog } from './page.js';
import { CAMERAS, layoutShot, cameraTransform, SAFE } from './composition.js';
import { captionTop } from './chrome.js';
import { framingFor } from './nao.js';

const W = 1080;

const BENCH_Y = 902;      // the worktop: high enough that the objects sit near the caption
const BENCH_LINE = BENCH_Y - 6;

// ---------------------------------------------------------------------------
// the set
// ---------------------------------------------------------------------------

/**
 * The workbench: top face and cabinet front. Not a subject - it is where the
 * subjects stand, and it is the same in every shot of the series.
 */
function benchSlab(ctx, { y = BENCH_Y, depth = 560 } = {}) {
  poly(
    ctx,
    [[-40, y + 38], [W + 40, y + 20], [W + 40, y + 20 + depth], [-40, y + 38 + depth]],
    mix(P.isoRight, 0.3),
    null,
    0
  );

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
    roundRect(ctx, W / 2 - 88, top + drawerH * 0.5 - 8, 176, 16, 8);
    ctx.fillStyle = alpha(P.isoEdge, 0.55);
    ctx.fill();
  }
  ctx.restore();

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

/** The label above the stage: what this shot is about, in two words. */
function kicker(ctx, text) {
  if (!text) return;
  label(ctx, String(text).toUpperCase(), SAFE.marginX + 12, 300, {
    size: 24,
    color: alpha(P.ink, 0.42),
    weight: 700,
    align: 'left',
    spacing: 3,
  });
  ctx.save();
  ctx.strokeStyle = alpha(P.line, 0.9);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(SAFE.marginX + 12, 322);
  ctx.lineTo(SAFE.marginX + 96, 322);
  ctx.stroke();
  ctx.restore();
}

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

// ---------------------------------------------------------------------------
// small drawing kit
// ---------------------------------------------------------------------------

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

function arrow(ctx, a, b, { colour = P.accent, width = 5, head = 16, progress = 1 } = {}) {
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
  if (p > 0.55) {
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

/** A parcel: the object the machine moves. Sized from its own box. */
function parcelShape(ctx, cx, cy, s, { tilt = 0, tone = P.accent, tickIn = 0, fold = true } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.shadowColor = alpha(P.ink, 0.18);
  ctx.shadowBlur = s * 0.24;
  ctx.shadowOffsetY = s * 0.09;
  roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.18);
  ctx.fillStyle = mix(tone, 0.6);
  ctx.fill();
  ctx.shadowColor = alpha(P.ink, 0);
  ctx.strokeStyle = mix(tone, -0.28);
  ctx.lineWidth = Math.max(2, s * 0.03);
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
  if (tickIn > 0) tick(ctx, 0, s * 0.14, s * 0.34 * tickIn, P.good, Math.max(4, s * 0.06));
  ctx.restore();
}

/** The odd one: what arrives when real life does not match the rule. */
function garbleShape(ctx, cx, cy, s, { spin = 0 } = {}) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin);
  ctx.beginPath();
  const spikes = 7;
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i * Math.PI) / spikes;
    const r = (i % 2 ? 0.42 : 0.66) * s;
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
}

/** An isometric crate drawn inside a screen-space box. */
function crate(ctx, cx, baseY, w, h, tone) {
  const d = w * 0.42;
  const top = baseY - h;
  poly(ctx, [[cx, top - d * 0.5], [cx + w / 2, top], [cx, top + d * 0.5], [cx - w / 2, top]], mix(tone, 0.74), mix(tone, -0.15), 2);
  poly(ctx, [[cx - w / 2, top], [cx, top + d * 0.5], [cx, baseY + d * 0.5], [cx - w / 2, baseY]], mix(tone, 0.16), mix(tone, -0.25), 2);
  poly(ctx, [[cx + w / 2, top], [cx, top + d * 0.5], [cx, baseY + d * 0.5], [cx + w / 2, baseY]], mix(tone, -0.06), mix(tone, -0.25), 2);
}


/** Greedy wrap against a measured width; returns at most `max` lines. */
function wrapText(ctx, text, maxWidth, max = 2) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else { lines.push(line); line = word; }
    if (lines.length === max) break;
  }
  if (lines.length < max && line) lines.push(line);
  return lines;
}

// ---------------------------------------------------------------------------
// the subjects
// ---------------------------------------------------------------------------

/**
 * Every subject declares:
 *   role   - what job it does in the explanation (demonstrate/compare/transform/label/react)
 *   about  - one line, for the storyboard and the plan report
 *   draw   - (ctx, box, opts) -> void, filling the box it is given
 *
 * `opts` carries the shot, the frame, the shot progress, and the subject's own
 * options from the plan (`opts.options`).
 */
const SUBJECTS = {
  checklist: {
    role: 'demonstrate',
    about: 'a list of ordinary steps, ticking itself off with no judgement',
    draw(ctx, b, o) {
      const pad = Math.min(36, b.w * 0.07);
      const cardW = b.w;
      const cardH = b.h;
      paperCard(ctx, b.x, b.y, cardW, cardH, { r: 26 });
      const k = Math.min(1.15, cardW / 460);
      let y = b.y + 58 * k;
      label(ctx, 'REPLACED BY', b.x + pad, y, {
        size: 22 * k, color: alpha(P.ink, 0.42), weight: 700, align: 'left', spacing: 3,
      });
      y += 52 * k;
      ctx.save();
      ctx.font = `600 ${52 * k}px ${FONT_SERIF}`;
      ctx.fillStyle = P.ink;
      ctx.textAlign = 'left';
      ctx.fillText('A checklist', b.x + pad, y);
      ctx.restore();
      y += 34 * k;

      const rows = (o.options.rows && o.options.rows.length ? o.options.rows : ['open the mail', 'sort it', 'paste the number', 'send the reply']).slice(0, 4);
      const rowH = Math.min(84 * k, (b.y + cardH - y - 40) / rows.length);
      rows.forEach((row, i) => {
        const ry = y + i * rowH;
        roundRect(ctx, b.x + pad, ry, 42 * k, 42 * k, 10 * k);
        ctx.strokeStyle = alpha(P.ink, 0.32);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        tick(ctx, b.x + pad + 21 * k, ry + 22 * k, 30 * k, P.good, 5);
        label(ctx, row, b.x + pad + 60 * k, ry + 30 * k, {
          size: 28 * k, color: P.inkSoft, weight: 500, align: 'left',
        });
      });

      // the list keeps working
      const scan = easeOut(prog(o.t, 0.1, 0.8));
      ctx.save();
      ctx.strokeStyle = alpha(P.accent, 0.4);
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.moveTo(b.x + pad, y + scan * (rowH * rows.length));
      ctx.lineTo(b.x + cardW - pad, y + scan * (rowH * rows.length));
      ctx.stroke();
      ctx.restore();
    },
  },

  robot: {
    role: 'compare',
    about: 'the genius robot the myth promises, dismissed',
    draw(ctx, b, o) {
      const s = Math.min(b.w * 0.78, b.h * 0.72);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h * 0.44;
      ctx.save();
      ctx.translate(cx, cy);
      // body
      roundRect(ctx, -s * 0.34, s * 0.02, s * 0.68, s * 0.56, s * 0.1);
      ctx.fillStyle = mix(P.link, 0.62);
      ctx.fill();
      ctx.strokeStyle = mix(P.link, -0.18);
      ctx.lineWidth = 3;
      ctx.stroke();
      // head
      roundRect(ctx, -s * 0.26, -s * 0.42, s * 0.52, s * 0.4, s * 0.12);
      ctx.fillStyle = mix(P.link, 0.76);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = alpha(P.ink, 0.72);
      for (const dx of [-0.1, 0.1]) {
        ctx.beginPath();
        ctx.arc(dx * s, -s * 0.24, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = mix(P.link, -0.18);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.42);
      ctx.lineTo(0, -s * 0.58);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -s * 0.61, s * 0.05, 0, Math.PI * 2);
      ctx.fillStyle = P.accent;
      ctx.fill();
      // arms
      ctx.beginPath();
      ctx.moveTo(-s * 0.34, s * 0.16);
      ctx.lineTo(-s * 0.48, s * 0.34);
      ctx.moveTo(s * 0.34, s * 0.16);
      ctx.lineTo(s * 0.48, s * 0.34);
      ctx.stroke();
      ctx.restore();

      // the lasso
      const strike = easeOut(prog(o.t, 0.25, 0.5));
      if (strike > 0) {
        ctx.save();
        ctx.strokeStyle = mix(P.stop, -0.06);
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.ellipse(cx, cy, s * 0.62, s * 0.58, -0.16, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        label(ctx, 'not by AI', cx, Math.min(b.y + b.h - 8, cy + s * 0.86), {
          size: 28, color: alpha(P.stop, 0.92 * Math.min(1, strike * 2)), weight: 700,
        });
      }
    },
  },

  'steps-row': {
    role: 'demonstrate',
    about: 'a sequence of steps, with the work being handed along it',
    draw(ctx, b, o) {
      const items = (o.options.items && o.options.items.length ? o.options.items : ['read', 'sort', 'decide', 'send']).slice(0, 4);
      const labels = o.options.labels || {};
      const n = items.length;
      // A phone is tall, so a sequence runs down it. The horizontal version is
      // only used when the box is genuinely wide (a wide-establish shot).
      const vertical = b.h > b.w * 0.75;

      if (vertical) {
        const gap = b.h / n;
        const crateW = Math.max(84, Math.min(b.w * 0.46, gap * 0.6));
        const centres = items.map((_, i) => ({ x: b.x + b.w * 0.4, y: b.y + gap * (i + 0.5) }));

        ctx.save();
        ctx.strokeStyle = alpha(P.ink, 0.14);
        ctx.lineWidth = 6;
        ctx.setLineDash([14, 12]);
        ctx.beginPath();
        ctx.moveTo(centres[0].x, centres[0].y);
        ctx.lineTo(centres[n - 1].x, centres[n - 1].y);
        ctx.stroke();
        ctx.restore();

        items.forEach((item, i) => {
          const c = centres[i];
          const land = easeOut(prog(o.t, 0.02 + i * 0.07, 0.16 + i * 0.07));
          if (land <= 0) return;
          const settle = Math.sin((1 - land) * Math.PI) * -6;
          const baseY = c.y + crateW * 0.42;
          ctx.save();
          ctx.translate(0, (1 - land) * -84 + settle);
          shadow(ctx, c.x, baseY + 10, crateW * 0.66, 12, 0.06);
          crate(ctx, c.x, baseY, crateW, crateW * 1.15, P.accent);
          label(ctx, String(i + 1), c.x - crateW * 0.18, baseY - crateW * 0.5, {
            size: crateW * 0.34, color: '#FFF7F1', weight: 700,
          });
          // the label sits beside the crate, on the free side, never on top of it
          label(ctx, labels[i] || item, c.x + crateW * 0.86, baseY - crateW * 0.36, {
            size: Math.max(26, Math.min(38, crateW * 0.34)), color: P.inkSoft, weight: 600, align: 'left',
          });
          ctx.restore();
          if (i < n - 1) {
            arrow(ctx, [c.x + crateW * 0.9, baseY + 8], [centres[i + 1].x + crateW * 0.9, centres[i + 1].y - crateW * 0.62], {
              colour: alpha(P.ink, 0.26), width: 4, head: 12, progress: prog(o.t, 0.1 + i * 0.06, 0.3 + i * 0.06),
            });
          }
        });

        // "then continue": the sequence does not stop at check, it goes round
        // again. Drawn as a return path on the free side of the column.
        const loopIn = easeOut(prog(o.t, 0.5, 0.78));
        if (loopIn > 0) {
          const lx = b.x + b.w * 0.13;
          const top = centres[0].y;
          const bottom = centres[n - 1].y;
          ctx.save();
          ctx.strokeStyle = alpha(P.accent, 0.5 * loopIn);
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.setLineDash([9, 9]);
          ctx.lineDashOffset = -o.t * 120;
          ctx.beginPath();
          ctx.moveTo(b.x + crateW * 0.02, bottom);
          ctx.quadraticCurveTo(lx - crateW * 0.5, (top + bottom) / 2, b.x + crateW * 0.02, top);
          ctx.stroke();
          ctx.restore();
          ctx.save();
          ctx.globalAlpha = loopIn;
          ctx.fillStyle = alpha(P.accent, 0.75);
          ctx.beginPath();
          ctx.moveTo(b.x + crateW * 0.02, top - 6);
          ctx.lineTo(b.x + crateW * 0.02 - 9, top + 12);
          ctx.lineTo(b.x + crateW * 0.02 + 9, top + 12);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        const walk = Math.min(0.999, prog(o.t, 0.12, 0.92)) * (n - 1);
        const seg = Math.floor(walk);
        const frac = walk - seg;
        const py = centres[seg].y + (centres[seg + 1].y - centres[seg].y) * easeOut(frac);
        parcelShape(ctx, centres[0].x - crateW * 1.05 - Math.sin(frac * Math.PI) * 18, py, Math.max(64, crateW * 0.46), { tone: P.accent });
        return;
      }

      const gap = b.w / n;
      const crateW = Math.max(110, Math.min(gap * 0.92, b.h * 0.62));
      const baseY = b.y + b.h * 0.92;
      const centres = items.map((_, i) => b.x + gap * (i + 0.5));

      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.16);
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x + gap * 0.12, baseY + 10);
      ctx.lineTo(b.x + b.w - gap * 0.12, baseY + 6);
      ctx.stroke();
      ctx.restore();

      items.forEach((item, i) => {
        const land = easeOut(prog(o.t, 0.02 + i * 0.06, 0.16 + i * 0.06));
        if (land <= 0) return;
        const drop = (1 - land) * -96;
        shadow(ctx, centres[i], baseY + 14, crateW * 0.7, 14, 0.07 * land);
        crate(ctx, centres[i], baseY + drop, crateW, crateW * 0.86, P.accent);
        ctx.save();
        label(ctx, String(i + 1), centres[i] - crateW * 0.2, baseY + drop - crateW * 0.34, {
          size: Math.min(40, crateW * 0.36), color: '#FFF7F1', weight: 700,
        });
        chip(ctx, centres[i] - Math.min(60, crateW * 0.5), Math.max(b.y + 26, baseY + drop - crateW * 1.34), labels[i] || item, {
          size: Math.min(24, crateW * 0.2),
        });
        ctx.restore();
      });

      for (let i = 0; i < n - 1; i++) {
        arrow(ctx, [centres[i] + crateW * 0.7, baseY - crateW * 0.5], [centres[i + 1] - crateW * 0.7, baseY - crateW * 0.5], {
          colour: alpha(P.ink, 0.28), width: 4, head: 13, progress: prog(o.t, 0.08 + i * 0.07, 0.26 + i * 0.07),
        });
      }

      const walk = Math.min(0.999, prog(o.t, 0.12, 0.92)) * (n - 1);
      const seg = Math.floor(walk);
      const frac = walk - seg;
      const px = centres[seg] + (centres[seg + 1] - centres[seg]) * easeOut(frac);
      const py = baseY - crateW * 1.9 - Math.sin(frac * Math.PI) * 40;
      parcelShape(ctx, px, py, crateW * 0.62, { tone: P.accent });
    },
  },

  'loop-row': {
    role: 'demonstrate',
    about: 'the same four stations, with the path that returns',
    draw(ctx, b, o) {
      const names = (o.options.items && o.options.items.length ? o.options.items : ['GOAL', 'TOOLS', 'CHECK', 'AGAIN']).map((s) => s.toUpperCase());
      const n = names.length;
      const gap = b.w / n;
      const crateW = Math.max(104, Math.min(gap * 0.88, b.h * 0.58));
      const baseY = b.y + b.h * 0.9;
      const centres = names.map((_, i) => b.x + gap * (i + 0.5));
      const hot = String(o.options.focus || '').toLowerCase();

      // the return path, under the row
      ctx.save();
      ctx.strokeStyle = alpha(P.accent, 0.3);
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 13]);
      ctx.beginPath();
      ctx.moveTo(centres[n - 1], baseY + 18);
      ctx.quadraticCurveTo(b.x + b.w / 2, baseY + 92, centres[0], baseY + 18);
      ctx.stroke();
      ctx.restore();

      names.forEach((name, i) => {
        const isHot = hot ? name.toLowerCase() === hot : false;
        const tone = name === 'CHECK' ? P.good : P.accent;
        shadow(ctx, centres[i], baseY + 12, crateW * 0.72, 14, 0.06);
        crate(ctx, centres[i], baseY, crateW, crateW * (0.86 + (isHot ? 0.22 : 0)) + 4 * Math.sin(o.t * Math.PI * 2 + i), tone);
        if (isHot) {
          ctx.save();
          ctx.strokeStyle = alpha(P.accent, 0.5 + 0.3 * Math.sin(o.t * Math.PI * 6));
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.ellipse(centres[i], baseY - crateW * 0.2, crateW * 0.72, crateW * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        chip(ctx, centres[i] - Math.min(58, crateW * 0.52), Math.max(b.y + 24, baseY - crateW * 1.3), name, {
          accent: name === 'CHECK',
          size: Math.min(22, crateW * 0.2),
        });
        label(ctx, String(i + 1), centres[i] - crateW * 0.2, baseY - crateW * 0.32, {
          size: Math.min(34, crateW * 0.32), color: '#FFF7F1', weight: 700,
        });
      });

      // the parcel sits on the station under discussion
      const idx = hot ? Math.max(0, names.findIndex((x) => x.toLowerCase() === hot)) : 0;
      const hop = 1 - easeOut(prog(o.t, 0, 0.18));
      parcelShape(ctx, centres[idx], baseY - crateW * 1.55 - hop * 24, crateW * 0.6, { tone: P.accent });
    },
  },

  'rule-cards': {
    role: 'demonstrate',
    about: 'the if/then pair, and what the rule does with what arrives',
    draw(ctx, b, o) {
      const broken = Boolean(o.options.broken);
      const shot = o.shot || {};
      // The three shots of this beat are three different questions about the
      // same rule, so they are three different pictures:
      //   object detail   - the condition alone, as large as the frame allows
      //   comparison      - the pair, because the point is that one implies the other
      //   overhead        - the machine, taking a card and emitting an answer
      const mode = o.options.mode
        || (shot.composition === 'object-detail' ? 'condition'
          : shot.composition === 'overhead-process' ? 'machine'
            : 'pair');

      if (mode === 'machine') {
        // A pipeline reads left to right: what goes in, the machine, what comes
        // out. Everything is measured from the box so it grows with the camera.
        const w = Math.max(150, Math.min(b.w * 0.28, b.h * 0.34));
        const cx = b.x + b.w * 0.5;
        const baseY = b.y + b.h * 0.8;
        const cardW = Math.max(200, Math.min(b.w * 0.3, 300));
        shadow(ctx, cx, baseY + 10, w * 0.8, 22, 0.08);
        crate(ctx, cx, baseY, w, b.h * 0.46, P.accent);
        roundRect(ctx, cx - w * 0.3, baseY - b.h * 0.32, w * 0.6, 22, 11);
        ctx.fillStyle = alpha(P.ink, 0.65);
        ctx.fill();
        label(ctx, 'RULES', cx, baseY - b.h * 0.5, { size: 22, color: alpha(P.ink, 0.5), weight: 700, spacing: 2 });

        // a card goes in at the top, an answer comes out at the bottom right
        const feed = easeOut(prog(o.t, 0.05, 0.5));
        const cardY = baseY - b.h * 0.52;
        const cardX = b.x + b.w * 0.04;
        paperCard(ctx, cardX, cardY, cardW, 92, { r: 16 });
        label(ctx, broken ? 'does not fit' : 'form no. 41', cardX + cardW / 2, cardY + 54, {
          size: 25, color: broken ? P.stop : P.inkSoft, weight: 600,
        });
        arrow(ctx, [cardX + cardW + 8 + (1 - feed) * 26, cardY + 46], [cx - w * 0.62, cardY + 46], {
          colour: alpha(P.ink, 0.32), width: 4, head: 14, progress: 0.4 + feed * 0.6,
        });
        const out = prog(o.t, 0.28, 0.62);
        const outX = b.x + b.w * 0.86;
        const outY = baseY - b.h * 0.5;
        if (out > 0) {
          arrow(ctx, [cx + w * 0.66, outY + 20], [outX - 62, outY + 20], {
            colour: alpha(P.ink, 0.32), width: 4, head: 14, progress: out,
          });
          parcelShape(ctx, outX, outY + 20, Math.max(64, Math.min(w * 0.62, 96)), {
            tone: broken ? P.accent : P.good, tickIn: broken ? 0 : out,
          });
          if (broken) cross(ctx, outX + 34, outY - 18, 42, alpha(P.stop, out), 7);
        }
        label(ctx, broken ? 'no answer' : 'column B', outX, baseY + 8, {
          size: 20, color: alpha(P.ink, 0.42), weight: 700, spacing: 1,
        });
        return;
      }

      if (mode === 'condition') {
        // The card is the whole picture in this shot, so it is measured to fill
        // its box rather than to a remembered size.
        const cardW = Math.min(b.w * 0.94, 700);
        const cardH = Math.min(b.h * 0.98, 560);
        const x = b.x + (b.w - cardW) / 2;
        const y = b.y + b.h - cardH;
        const k = cardH / 420;
        paperCard(ctx, x, y, cardW, cardH, { r: 26 });
        label(ctx, 'IF', x + 36 * k, y + 66 * k, { size: 26 * k, color: alpha(P.accent, 0.95), weight: 700, align: 'left', spacing: 4 });
        ctx.save();
        const size = Math.min(56 * k, cardW * 0.1);
        ctx.font = `600 ${size}px ${FONT_SERIF}`;
        ctx.fillStyle = P.ink;
        ctx.textAlign = 'left';
        const head = wrapText(ctx, o.options.condition || 'the form has a name', cardW - 72 * k, 2);
        head.forEach((line, li) => ctx.fillText(line, x + 36 * k, y + 168 * k + li * size * 1.12));
        ctx.restore();
        label(ctx, o.options.conditionSub || 'a condition the machine can check', x + 36 * k, y + cardH - 46 * k, {
          size: 26 * k, color: alpha(P.ink, 0.42), weight: 500, align: 'left',
        });
        return;
      }

      // A narrow box cannot hold two stacked cards and still be readable: the
      // pair needs width. Under that width the rule is printed as one card with
      // two lines, which is the same sentence in half the paper.
      if (b.w < 400) {
        const cardW = Math.min(b.w, 620);
        const cardH = Math.min(b.h * 0.9, 420);
        const x = b.x + (b.w - cardW) / 2;
        const y = b.y + b.h - cardH;
        const size = Math.min(42, cardW * 0.1);
        paperCard(ctx, x, y, cardW, cardH, { r: 24, fill: broken ? mix(P.stop, 0.95) : P.surface });
        label(ctx, 'IF', x + 30, y + 54, { size: 22, color: alpha(P.ink, 0.42), weight: 700, align: 'left', spacing: 3 });
        ctx.save();
        ctx.font = `600 ${size}px ${FONT_SERIF}`;
        ctx.fillStyle = P.ink;
        ctx.textAlign = 'left';
        wrapText(ctx, o.options.condition || 'the form has a name', cardW - 60, 2)
          .forEach((line, li) => ctx.fillText(line, x + 30, y + 108 + li * size * 1.14));
        ctx.restore();
        const thenY = y + cardH * 0.62;
        label(ctx, 'THEN', x + 30, thenY, { size: 22, color: alpha(P.accent, 0.95), weight: 700, align: 'left', spacing: 3 });
        ctx.save();
        ctx.font = `600 ${size * 0.86}px ${FONT_SERIF}`;
        ctx.fillStyle = broken ? alpha(P.ink, 0.45) : P.ink;
        ctx.textAlign = 'left';
        wrapText(ctx, o.options.result || 'put it in column B', cardW - 110, 2)
          .forEach((line, li) => ctx.fillText(line, x + 30, thenY + 46 + li * size));
        ctx.restore();
        if (broken) cross(ctx, x + cardW - 40, thenY + 34, 30, P.stop, 6);
        return;
      }

      // IF above THEN: the rule is a sentence, and a sentence on a phone runs
      // down the page. Side-by-side cards leave both of them small.
      const gap = Math.max(44, b.h * 0.06);
      const cardH = Math.min(300, (b.h - gap) / 2);
      const cardW = Math.min(b.w, cardH * 1.5);
      const x = b.x + (b.w - cardW) / 2;
      const k = cardH / 300;
      const cards = [
        { tag: 'IF', head: o.options.condition || 'the form has a name', sub: 'this, in plain words', tone: P.surface, y: b.y },
        { tag: 'THEN', head: o.options.result || 'put it in column B', sub: 'same answer, every time', tone: broken ? mix(P.stop, 0.94) : P.surface, y: b.y + cardH + gap },
      ];
      cards.forEach((c, i) => {
        paperCard(ctx, x, c.y, cardW, cardH, { r: 24, fill: c.tone });
        label(ctx, c.tag, x + 30, c.y + 52 * k, {
          size: Math.max(19, 24 * k), color: i ? alpha(P.accent, 0.95) : alpha(P.ink, 0.42),
          weight: 700, align: 'left', spacing: 3,
        });
        ctx.save();
        const size = Math.max(26, Math.min(46 * k, cardW * 0.075));
        ctx.font = `600 ${size}px ${FONT_SERIF}`;
        ctx.fillStyle = broken && i === 1 ? alpha(P.ink, 0.45) : P.ink;
        ctx.textAlign = 'left';
        const head = wrapText(ctx, c.head, cardW - 60, 2);
        head.forEach((line, li) => ctx.fillText(line, x + 30, c.y + 118 * k + li * size * 1.12));
        ctx.restore();
        label(ctx, c.sub, x + 30, Math.min(c.y + cardH - 22, c.y + 208 * k), {
          size: Math.max(20, 26 * k), color: alpha(P.ink, 0.42), weight: 500, align: 'left',
        });
        if (broken && i === 1) cross(ctx, x + cardW - 44, c.y + 50, 34, P.stop, 6);
      });

      const midX = x + cardW / 2;
      const top = b.y + cardH;
      const step = broken ? 1 : prog(o.t, 0.1, 0.4);
      ctx.save();
      ctx.strokeStyle = broken ? alpha(P.stop, 0.75) : P.accent;
      if (broken) ctx.setLineDash([12, 12]);
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(midX, top + 6);
      ctx.lineTo(midX, top + gap - 6);
      ctx.stroke();
      if (!broken && step > 0.5) {
        ctx.beginPath();
        ctx.moveTo(midX - 13, top + gap - 26);
        ctx.lineTo(midX, top + gap - 6);
        ctx.lineTo(midX + 13, top + gap - 26);
        ctx.stroke();
      }
      ctx.restore();
      if (broken) cross(ctx, midX, top + gap / 2, 34, P.stop, 6);
    },
  },

  'rule-machine': {
    role: 'transform',
    about: 'the machine that applies the rule, and where it jams',
    draw(ctx, b, o) {
      const broken = Boolean(o.options.broken);
      const w = Math.min(b.w * 0.7, 240);
      const cx = b.x + b.w / 2;
      const baseY = b.y + b.h * 0.92;
      const shake = broken ? Math.sin(o.t * Math.PI * 14) * (o.t > 0.4 ? 4 : 0) : 0;
      ctx.save();
      ctx.translate(shake, 0);
      shadow(ctx, cx, baseY + 10, w * 0.8, 22, 0.08);
      crate(ctx, cx, baseY, w, w * 1.15, P.accent);
      roundRect(ctx, cx - w * 0.28, baseY - w * 0.86, w * 0.56, w * 0.12, w * 0.06);
      ctx.fillStyle = alpha(P.ink, 0.7);
      ctx.fill();
      label(ctx, broken ? 'BREAKS' : 'RULES', cx, baseY - w * 1.24, {
        size: 22, color: alpha(P.ink, 0.5), weight: 700, spacing: 2,
      });
      ctx.restore();
    },
  },

  pile: {
    role: 'compare',
    about: 'a mess: the input a rule cannot take',
    draw(ctx, b, o) {
      const s = Math.max(64, Math.min(b.w * 0.26, b.h * 0.3));
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h * 0.5;
      const items = [
        [-0.3, 0.12, 0.22], [0.26, 0.18, -0.16], [-0.02, -0.22, 0.5],
        [0.36, -0.16, 0.1], [0.04, 0.44, -0.28], [-0.34, -0.34, 0.34],
      ];
      items.forEach(([dx, dy, rot], i) => {
        const drift = Math.sin((o.frame / 30) * 1.1 + i) * 2;
        parcelShape(ctx, cx + dx * b.w * 0.34 + drift, cy + dy * b.h * 0.34, s, { tilt: rot, tone: P.accent });
      });
      label(ctx, 'MESSY IN', cx, b.y + 22, { size: 20, color: alpha(P.ink, 0.5), weight: 700, spacing: 2 });
    },
  },

  model: {
    role: 'transform',
    about: 'the model: the part that guesses sensibly',
    draw(ctx, b, o) {
      const w = Math.max(110, Math.min(b.w * 0.62, b.h * 0.3));
      const cx = b.x + b.w / 2;
      const baseY = b.y + b.h * 0.9;
      // the funnel
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.9, b.y + 10);
      ctx.lineTo(cx + w * 0.9, b.y + 10);
      ctx.lineTo(cx + w * 0.34, b.y + b.h * 0.2);
      ctx.lineTo(cx - w * 0.34, b.y + b.h * 0.2);
      ctx.closePath();
      ctx.fillStyle = mix(P.bgDeep, 0.12);
      ctx.fill();
      ctx.strokeStyle = alpha(P.isoEdge, 0.8);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      shadow(ctx, cx, baseY + 8, w * 0.8, 20, 0.08);
      crate(ctx, cx, baseY, w, b.h * 0.78, P.link);
      chip(ctx, cx - 34, b.y + b.h * 0.3, 'model', { size: 20 });
    },
  },

  bins: {
    role: 'label',
    about: 'the two possible outcomes, named',
    draw(ctx, b, o) {
      const names = o.options.items || ['SENSIBLE', 'NONSENSE'];
      // the names live under the crates, so the crates give up the bottom strip
      const tones = [P.good, P.stop];
      const gap = b.w / names.length;
      names.forEach((name, i) => {
        const cx = b.x + gap * (i + 0.5);
        const w = Math.max(96, Math.min(gap * 0.78, b.h * 0.62));
        const baseY = b.y + b.h * 0.78;
        shadow(ctx, cx, baseY + 10, w * 0.8, 16, 0.07);
        crate(ctx, cx, baseY, w, w * 0.9, tones[i] || P.accent);
        label(ctx, String(name).toUpperCase(), cx, baseY + 34, {
          size: 19, color: alpha(P.ink, 0.62), weight: 700, spacing: 1,
        });
      });
    },
  },

  parcel: {
    role: 'transform',
    about: 'the single object that is being moved, judged, or rejected',
    draw(ctx, b, o) {
      const s = Math.min(b.w * 0.6, b.h * 0.6);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h * 0.5;
      if (o.options.state === 'garble') {
        garbleShape(ctx, cx, cy, s, { spin: 0.3 + o.t * 0.2 });
      } else {
        parcelShape(ctx, cx, cy, s, { tone: o.options.tone === 'good' ? P.good : P.accent, tickIn: o.options.tickIn ?? 0 });
      }
    },
  },

  garble: {
    role: 'compare',
    about: 'a real-world case that the rule cannot take',
    draw(ctx, b, o) {
      const s = Math.max(48, Math.min(b.w * 0.62, b.h * 0.36));
      garbleShape(ctx, b.x + b.w / 2, b.y + b.h * 0.46, s, { spin: 0.3 + o.t * 0.2 });
      label(ctx, 'does not fit', b.x + b.w / 2, b.y + b.h * 0.5 + s * 0.62 + 30, {
        size: 21, color: alpha(P.stop, 0.9), weight: 700,
      });
    },
  },

  checkpoint: {
    role: 'demonstrate',
    about: 'the gate the loop passes through: open, or held shut until a human says go',
    draw(ctx, b, o) {
      const failing = Boolean(o.options.failing);
      const w = b.w;
      const baseY = b.y + b.h * 0.92;
      const rowY = baseY - b.h * 0.05;
      const cx = b.x + w * 0.5;
      const gateW = Math.min(w * 0.58, 560);
      const postH = Math.min(b.h * 0.58, 380);
      const postW = Math.max(22, Math.min(44, w * 0.045));
      const leftX = cx - gateW / 2;
      const rightX = cx + gateW / 2;

      // ---- the road it stops ---------------------------------------------
      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.16);
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x + 6, rowY);
      ctx.lineTo(b.x + w - 6, rowY);
      ctx.stroke();
      ctx.strokeStyle = alpha(P.ink, 0.1);
      ctx.lineWidth = 3;
      for (let x = b.x + 22; x < b.x + w - 22; x += 52) {
        ctx.beginPath();
        ctx.moveTo(x, rowY + 2);
        ctx.lineTo(x + 3, rowY + 22);
        ctx.stroke();
      }
      ctx.restore();

      // ---- two posts ------------------------------------------------------
      [leftX, rightX].forEach((x, i) => {
        shadow(ctx, x, rowY + 6, postW * 1.6, 14, 0.08);
        roundRect(ctx, x - postW / 2, rowY - postH, postW, postH, postW * 0.3);
        ctx.fillStyle = mix(P.isoLeft, 0.12 + i * 0.06);
        ctx.fill();
        ctx.strokeStyle = alpha(P.isoEdge, 0.6);
        ctx.lineWidth = 2.5;
        ctx.stroke();
      });

      // ---- the light on the far post --------------------------------------
      const open = failing ? 0 : easeOut(prog(o.t, 0.2, 0.46));
      const lightY = rowY - postH - 30;
      ctx.save();
      const halo = ctx.createRadialGradient(rightX, lightY, 4, rightX, lightY, 54);
      halo.addColorStop(0, alpha(open > 0.5 ? P.good : P.stop, 0.4));
      halo.addColorStop(1, alpha(open > 0.5 ? P.good : P.stop, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(rightX, lightY, 54, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rightX, lightY, 17, 0, Math.PI * 2);
      ctx.fillStyle = mix(open > 0.5 ? P.good : P.stop, 0.1);
      ctx.fill();
      ctx.restore();

      chip(ctx, cx, lightY - 56, o.options.chip || (failing ? 'CLOSED' : 'CHECK'), {
        accent: !failing, size: Math.round(Math.max(21, Math.min(26, w * 0.032))),
      });

      // ---- the arm: shut across the road, lifted when the action is approved
      const angle = -(failing ? 0 : 1.22 * open);
      ctx.save();
      ctx.translate(leftX, rowY - postH * 0.74);
      ctx.rotate(angle);
      roundRect(ctx, 0, -12, gateW, 24, 12);
      ctx.fillStyle = failing ? mix(P.stop, 0.05) : mix(P.accent, 0.05);
      ctx.fill();
      // hazard stripes, so it reads as a barrier and not as a shelf
      ctx.save();
      ctx.beginPath();
      roundRect(ctx, 0, -12, gateW, 24, 12);
      ctx.clip();
      ctx.strokeStyle = alpha(P.surface, 0.55);
      ctx.lineWidth = 9;
      for (let x = 16; x < gateW; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x, -14);
        ctx.lineTo(x + 20, 14);
        ctx.stroke();
      }
      ctx.restore();
      ctx.restore();

      // ---- the invitation waits, then walks through ------------------------
      const pass = easeOut(prog(o.t, failing ? 0.06 : 0.48, failing ? 0.3 : 0.86));
      const startX = leftX - gateW * 0.26;
      const px = startX + pass * gateW * 0.62;
      const py = rowY - Math.min(78, b.h * 0.11);
      parcelShape(ctx, px, py, Math.min(132, b.h * 0.19), {
        tone: failing ? P.stop : P.accent,
        tickIn: failing ? 0 : prog(o.t, 0.72, 0.9),
      });

      if (failing) {
        const bad = prog(o.t, 0.34, 0.5);
        if (bad > 0) cross(ctx, px + 26, py - 44, 42, alpha(P.stop, bad), 7);
      }
    },
  },

  // ---------------------------------------------------------------------------
  // 0107 - what happens when you type a URL?
  // ---------------------------------------------------------------------------
  // The whole episode is one journey, so its subjects are the same six objects
  // seen at different sizes: an address bar, a directory, an address card, a
  // wire, a padlock, a request and the page it becomes.

  'url-bar': {
    role: 'demonstrate',
    about: 'the address bar, with a URL being typed into it',
    draw(ctx, b, o) {
      const text = String(o.options.text || 'nao.explains/cat');
      const w = Math.min(b.w * 0.98, 800);
      const h = Math.max(96, Math.min(b.h * 0.34, 140));
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h * 0.42 - h / 2;
      const typed = Math.round(Math.min(1, prog(o.t, 0.03, 0.4)) * text.length);

      shadow(ctx, x + w / 2, y + h + 14, w * 0.4, 18, 0.08);
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fillStyle = P.surface;
      ctx.fill();
      ctx.strokeStyle = alpha(P.ink, 0.14);
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // the little globe: this is a web address, not a search box
      const gx = x + h * 0.66;
      const gy = y + h / 2;
      ctx.save();
      ctx.strokeStyle = alpha(P.link, 0.8);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(gx, gy, h * 0.21, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(gx, gy, h * 0.09, h * 0.21, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx - h * 0.21, gy);
      ctx.lineTo(gx + h * 0.21, gy);
      ctx.stroke();
      ctx.restore();

      // the Enter key, and it gets pressed - measured first, because the text
      // has to live in what is left of the pill
      const kw = Math.min(150, w * 0.2);
      const kh = h * 0.62;
      const kx = x + w - kw - h * 0.24;
      const ky = y + (h - kh) / 2;

      const tx0 = gx + h * 0.34;
      const room = kx - tx0 - h * 0.24;
      let size = Math.min(40, h * 0.33);
      ctx.save();
      ctx.font = `600 ${size}px ${FONT_SANS}`;
      while (size > 16 && ctx.measureText(text).width > room) {
        size -= 2;
        ctx.font = `600 ${size}px ${FONT_SANS}`;
      }
      const shown = text.slice(0, typed);
      ctx.fillStyle = P.ink;
      ctx.textAlign = 'left';
      ctx.fillText(shown, tx0, gy + size * 0.34);
      if (Math.floor(o.t * 3.4) % 2 === 0 || typed < text.length) {
        ctx.fillStyle = alpha(P.accent, 0.85);
        ctx.fillRect(tx0 + ctx.measureText(shown).width + 3, gy - size * 0.55, 3, size * 1.1);
      }
      ctx.restore();
      const press = prog(o.t, 0.42, 0.52);
      ctx.save();
      roundRect(ctx, kx, ky + press * 4, kw, kh, kh * 0.32);
      ctx.fillStyle = press > 0 ? mix(P.accent, 0.82) : P.surfaceSoft;
      ctx.fill();
      ctx.strokeStyle = alpha(P.ink, 0.12);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = `700 ${Math.min(24, kh * 0.42)}px ${FONT_SANS}`;
      ctx.fillStyle = press > 0 ? alpha(P.ink, 0.85) : P.inkSoft;
      ctx.textAlign = 'center';
      ctx.fillText('ENTER', kx + kw / 2, ky + kh * 0.62 + press * 4);
      ctx.restore();

      label(ctx, o.options.caption || 'one line, six words', b.x + b.w / 2, y - 24, {
        size: 24, color: alpha(P.ink, 0.45), weight: 700, spacing: 2,
      });
    },
  },

  'page-stage': {
    role: 'transform',
    about: 'the browser window, empty and then built out of the files',
    draw(ctx, b, o) {
      const w = Math.min(b.w * 0.98, 760);
      const h = Math.min(b.h * 0.94, 620);
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h * 0.96 - h;
      const open = easeOut(prog(o.t, 0.02, 0.24));
      const broken = Boolean(o.options.broken);

      ctx.save();
      ctx.globalAlpha = 0.35 + 0.65 * open;
      ctx.translate(x + w / 2, y + h);
      ctx.scale(0.94 + 0.06 * open, 0.94 + 0.06 * open);
      ctx.translate(-(x + w / 2), -(y + h));
      shadow(ctx, x + w / 2, y + h + 10, w * 0.42, 18, 0.09);
      paperCard(ctx, x, y, w, h, { r: 26 });

      // the window's own chrome: three dots and a small address field
      const barH = Math.min(64, h * 0.13);
      ctx.save();
      roundRect(ctx, x, y, w, barH, 26);
      ctx.clip();
      ctx.fillStyle = mix(P.surfaceSoft, 0.1);
      ctx.fillRect(x, y, w, barH);
      ctx.restore();
      [0, 1, 2].forEach((i) => {
        ctx.beginPath();
        ctx.arc(x + 30 + i * 22, y + barH / 2, 6, 0, Math.PI * 2);
        ctx.fillStyle = alpha(P.ink, 0.14 - i * 0.03);
        ctx.fill();
      });
      roundRect(ctx, x + 104, y + barH * 0.28, w * 0.52, barH * 0.44, barH * 0.22);
      ctx.fillStyle = alpha(P.ink, 0.05);
      ctx.fill();
      label(ctx, o.options.url || 'nao.explains/cat', x + 120, y + barH * 0.62, {
        size: Math.min(20, barH * 0.34), color: alpha(P.ink, 0.5), weight: 600, align: 'left',
      });

      // the page itself: a hero, two lines, three thumbnails
      const px = x + w * 0.06;
      const pw = w * 0.88;
      const py = y + barH + h * 0.07;
      const ph = h - barH - h * 0.16;
      const assemble = Boolean(o.options.assemble);
      const step = (i) => (assemble ? easeOut(prog(o.t, 0.1 + i * 0.09, 0.26 + i * 0.09)) : 1);

      const heroH = ph * 0.44;
      const heroP = step(0);
      if (heroP > 0) {
        ctx.save();
        ctx.globalAlpha *= heroP;
        roundRect(ctx, px, py, pw, heroH, 14);
        if (broken && o.options.missing === 'hero') {
          ctx.fillStyle = alpha(P.stop, 0.06);
          ctx.fill();
          ctx.setLineDash([10, 8]);
          ctx.strokeStyle = alpha(P.stop, 0.4);
          ctx.lineWidth = 2.5;
          ctx.stroke();
          ctx.setLineDash([]);
          // the broken-image glyph
          const gx = px + pw / 2;
          const gy = py + heroH / 2;
          const gs = Math.min(heroH * 0.42, 64);
          ctx.strokeStyle = alpha(P.stop, 0.65);
          ctx.lineWidth = 3;
          ctx.strokeRect(gx - gs / 2, gy - gs * 0.36, gs, gs * 0.72);
          ctx.beginPath();
          ctx.moveTo(gx - gs / 2, gy + gs * 0.36);
          ctx.lineTo(gx - gs * 0.1, gy - gs * 0.04);
          ctx.lineTo(gx + gs * 0.12, gy + gs * 0.2);
          ctx.lineTo(gx + gs * 0.34, gy - gs * 0.08);
          ctx.lineTo(gx + gs / 2, gy + gs * 0.36);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(gx + gs * 0.24, gy - gs * 0.16, 4, 0, Math.PI * 2);
          ctx.fillStyle = alpha(P.stop, 0.65);
          ctx.fill();
          label(ctx, o.options.missingName || 'hero.jpg did not load', gx, gy + gs * 0.72 + 22, {
            size: Math.min(21, heroH * 0.12), color: alpha(P.stop, 0.8), weight: 600,
          });
        } else {
          ctx.fillStyle = mix(P.accent, 0.78);
          ctx.fill();
          // a tiny horizon, so the tile reads as a picture and not a slab
          ctx.save();
          ctx.beginPath();
          roundRect(ctx, px, py, pw, heroH, 14);
          ctx.clip();
          ctx.fillStyle = alpha(P.surface, 0.4);
          ctx.beginPath();
          ctx.arc(px + pw * 0.78, py + heroH * 0.34, heroH * 0.16, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      }
      [1, 2].forEach((i) => {
        const p = step(i);
        if (p <= 0) return;
        ctx.save();
        ctx.globalAlpha *= p;
        const ly = py + heroH + h * 0.06 + (i - 1) * h * 0.055;
        roundRect(ctx, px, ly, pw * (i === 1 ? 0.82 : 0.6), h * 0.026, 8);
        ctx.fillStyle = alpha(P.ink, 0.12);
        ctx.fill();
        ctx.restore();
      });
      const tiles = 3;
      for (let i = 0; i < tiles; i++) {
        const p = step(3 + i);
        if (p <= 0) continue;
        ctx.save();
        ctx.globalAlpha *= p;
        const tw = (pw - 16 * (tiles - 1)) / tiles;
        const ty = py + ph - h * 0.2;
        const tx = px + i * (tw + 16);
        roundRect(ctx, tx, ty, tw, h * 0.16, 10);
        ctx.fillStyle = i === 1 ? mix(P.link, 0.8) : alpha(P.ink, 0.07);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    },
  },

  'dns-directory': {
    role: 'demonstrate',
    about: 'the address book: a name goes in, an IP address comes out',
    draw(ctx, b, o) {
      const w = Math.min(b.w * 0.96, 700);
      const rows = (o.options.rows || [
        ['nao.explains', '203.0.113.7'],
        ['wikipedia.org', '198.51.100.4'],
        ['a-shop.example', '192.0.2.61'],
        ['news.example', '198.51.100.23'],
      ]).slice(0, 4);
      const rowH = Math.min(78, b.h * 0.16);
      const h = rowH * rows.length + 96;
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h * 0.94 - h;

      shadow(ctx, x + w / 2, y + h + 10, w * 0.42, 18, 0.08);
      paperCard(ctx, x, y, w, h, { r: 22 });

      // header: the book's title, and a magnifier that is doing the looking
      label(ctx, 'DNS', x + 32, y + 46, { size: 26, color: alpha(P.accent, 0.95), weight: 700, align: 'left', spacing: 3 });
      label(ctx, 'the address book', x + 104, y + 46, { size: 22, color: alpha(P.ink, 0.4), weight: 600, align: 'left' });
      const found = prog(o.t, 0.34, 0.5);
      const mx = x + w - 56 - (1 - found) * 26;
      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.4);
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(mx, y + 40, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx + 10, y + 50);
      ctx.lineTo(mx + 22, y + 62);
      ctx.stroke();
      ctx.restore();

      const hit = Math.max(0, Math.min(rows.length - 1, Number(o.options.hit ?? 0)));
      rows.forEach(([name, ip], i) => {
        const ry = y + 76 + i * rowH;
        const isHit = i === hit;
        const lit = isHit ? easeOut(prog(o.t, 0.3, 0.46)) : 0;
        if (lit > 0) {
          ctx.save();
          ctx.globalAlpha = 0.9 * lit;
          roundRect(ctx, x + 16, ry - rowH * 0.42, w - 32, rowH * 0.84, 12);
          ctx.fillStyle = mix(P.accent, 0.9);
          ctx.fill();
          ctx.restore();
        }
        ctx.save();
        ctx.font = `600 ${Math.min(26, rowH * 0.36)}px ${FONT_SANS}`;
        ctx.fillStyle = isHit && lit > 0.4 ? P.ink : alpha(P.ink, 0.72);
        ctx.textAlign = 'left';
        ctx.fillText(name, x + 34, ry + 8);
        ctx.font = `500 ${Math.min(24, rowH * 0.32)}px ${FONT_SANS}`;
        ctx.fillStyle = alpha(P.link, 0.95);
        ctx.textAlign = 'right';
        ctx.fillText(ip, x + w - (isHit && lit > 0.5 ? 62 : 34), ry + 8);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = alpha(P.ink, 0.08);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 28, ry + rowH * 0.44);
        ctx.lineTo(x + w - 28, ry + rowH * 0.44);
        ctx.stroke();
        ctx.restore();
        if (isHit && lit > 0.5) {
          tick(ctx, x + w - 30, ry - rowH * 0.24, 22, alpha(P.good, lit), 4);
        }
      });
    },
  },

  'address-card': {
    role: 'compare',
    about: 'the answer DNS gives back: a name resolved to an address',
    draw(ctx, b, o) {
      const w = Math.min(b.w * 0.92, 620);
      const h = Math.min(b.h * 0.72, 400);
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h * 0.9 - h;
      const pop = easeOut(prog(o.t, 0.04, 0.26));
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.65 * pop;
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(-0.02 + 0.012 * Math.sin(o.t * Math.PI * 2));
      ctx.translate(-(x + w / 2), -(y + h / 2));
      shadow(ctx, x + w / 2, y + h + 8, w * 0.4, 16, 0.08);
      paperCard(ctx, x, y, w, h, { r: 20 });
      const kSize = Math.max(14, Math.min(22, w * 0.045, h * 0.075));
      label(ctx, o.options.kicker || 'the answer', x + w / 2, y + h * 0.14, {
        size: kSize, color: alpha(P.ink, 0.42), weight: 700, spacing: 2,
      });
      // name, arrow down, address
      ctx.save();
      ctx.font = `600 ${Math.min(34, w * 0.075, h * 0.1)}px ${FONT_SANS}`;
      ctx.fillStyle = alpha(P.ink, 0.75);
      ctx.textAlign = 'center';
      ctx.fillText(o.options.name || 'nao.explains', x + w / 2, y + h * 0.32);
      ctx.restore();
      arrow(ctx, [x + w / 2, y + h * 0.36], [x + w / 2, y + h * 0.5], {
        colour: alpha(P.ink, 0.26), width: 4, head: 12, progress: easeOut(prog(o.t, 0.16, 0.36)),
      });
      ctx.save();
      const ipSize = Math.min(52, w * 0.115, h * 0.17);
      ctx.font = `700 ${ipSize}px ${FONT_SERIF}`;
      ctx.fillStyle = P.ink;
      ctx.textAlign = 'center';
      ctx.fillText(o.options.ip || '203.0.113.7', x + w / 2, y + h * 0.68);
      const subSize = Math.max(13, Math.min(23, w * 0.05, h * 0.072));
      ctx.font = `500 ${subSize}px ${FONT_SANS}`;
      ctx.fillStyle = alpha(P.ink, 0.45);
      wrapText(ctx, o.options.sub || 'the real place on the network', w * 0.86, 2)
        .forEach((line, li, all) => ctx.fillText(line, x + w / 2, y + h * 0.82 + (li - (all.length - 1) / 2) * (subSize * 1.3)));
      ctx.restore();
      const done = easeOut(prog(o.t, 0.4, 0.56));
      if (done > 0) tick(ctx, x + w - 52, y + h - 44, 32, alpha(P.good, done), 6);
      ctx.restore();
    },
  },

  'link-path': {
    role: 'demonstrate',
    about: 'a wire between your machine and the server, with data on it',
    draw(ctx, b, o) {
      // Two plinths and a road between them. Drawn horizontally unless the box
      // is genuinely tall, because the shot is about the distance, not the height.
      const vertical = b.h > b.w * 1.5;
      const inset = Math.min(b.w, b.h) * 0.1;
      const a = vertical
        ? { x: b.x + b.w * 0.5, y: b.y + b.h * 0.9 }
        : { x: b.x + inset + 70, y: b.y + b.h * 0.84 };
      const c = vertical
        ? { x: b.x + b.w * 0.5, y: b.y + b.h * 0.1 }
        : { x: b.x + b.w - inset - 70, y: b.y + b.h * 0.84 };
      const blockW = Math.min(vertical ? b.w * 0.5 : b.w * 0.27, 240);
      const blockH = Math.min(b.h * 0.44, blockW * 1.05);

      shadow(ctx, a.x, a.y + 6, blockW * 0.9, 16, 0.08);
      crate(ctx, a.x, a.y, blockW, blockH, P.isoLeft);
      label(ctx, o.options.near || 'you', a.x, a.y - blockH - 22, {
        size: Math.min(24, blockW * 0.2), color: alpha(P.ink, 0.6), weight: 700, spacing: 1,
      });
      shadow(ctx, c.x, c.y + 6, blockW * 0.9, 16, 0.08);
      crate(ctx, c.x, c.y, blockW, blockH, P.darkRack || P.isoRight);
      label(ctx, o.options.far || 'the server', c.x, c.y - blockH - 22, {
        size: Math.min(24, blockW * 0.2), color: alpha(P.ink, 0.6), weight: 700, spacing: 1,
      });

      // the road is drawn on, then packets run along it
      const draw = easeOut(prog(o.t, 0.06, 0.4));
      const lineY = a.y - blockH * 0.5;
      const lineY2 = c.y - blockH * 0.5;
      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.24);
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.setLineDash([16, 14]);
      ctx.lineDashOffset = -o.t * 90;
      ctx.beginPath();
      if (vertical) {
        ctx.moveTo(a.x, a.y - blockH - 8);
        ctx.lineTo(c.x, c.y + blockH + 8);
      } else {
        ctx.moveTo(a.x + blockW * 0.75, lineY);
        ctx.lineTo(a.x + blockW * 0.75 + (c.x - blockW * 0.75 - (a.x + blockW * 0.75)) * draw, lineY2);
      }
      ctx.stroke();
      ctx.restore();

      // packets: three small squares travelling the wire
      for (let i = 0; i < 3; i++) {
        const p = ((o.t * 1.4 + i * 0.33) % 1);
        const px = vertical ? a.x : a.x + blockW * 0.75 + (c.x - blockW * 0.75 - (a.x + blockW * 0.75)) * p;
        const py = vertical ? a.y - blockH - 8 + (c.y + blockH + 8 - (a.y - blockH - 8)) * p : lineY + (lineY2 - lineY) * p;
        if (!vertical && p > draw) continue;
        ctx.save();
        ctx.globalAlpha = 0.85;
        roundRect(ctx, px - 11, py - 11, 22, 22, 6);
        ctx.fillStyle = mix(P.accent, 0.3);
        ctx.fill();
        ctx.restore();
      }

      if (o.options.secure) {
        const done = easeOut(prog(o.t, 0.34, 0.5));
        if (done > 0) {
          ctx.save();
          ctx.globalAlpha = done;
          const cx = vertical ? b.x + b.w * 0.5 : (a.x + c.x) / 2;
          const cy = vertical ? (a.y + c.y) / 2 : lineY - 34;
          chip(ctx, cx - 66, cy - 22, 'TLS', { accent: true, size: 22 });
          ctx.restore();
        }
      }
    },
  },

  'https-lock': {
    role: 'demonstrate',
    about: 'the padlock: the same wire, with everything on it encrypted',
    draw(ctx, b, o) {
      const s = Math.min(b.w * 0.7, b.h * 0.62, 340);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h * 0.52;
      const closed = easeOut(prog(o.t, 0.12, 0.4));
      label(ctx, 'HTTPS', cx, cy - s * 0.78, {
        size: Math.min(34, s * 0.14), color: alpha(P.accent, 0.95), weight: 700, spacing: 4,
      });

      // body
      shadow(ctx, cx, cy + s * 0.5, s * 0.5, s * 0.1, 0.1);
      roundRect(ctx, cx - s * 0.42, cy - s * 0.08, s * 0.84, s * 0.6, s * 0.1);
      ctx.fillStyle = mix(P.good, 0.6);
      ctx.fill();
      ctx.strokeStyle = mix(P.good, -0.2);
      ctx.lineWidth = 3;
      ctx.stroke();

      // shackle: it comes down as the connection is secured
      ctx.save();
      ctx.strokeStyle = mix(P.good, -0.15);
      ctx.lineWidth = Math.max(10, s * 0.075);
      ctx.lineCap = 'round';
      ctx.beginPath();
      const sh = s * (0.34 - 0.06 * (1 - closed));
      ctx.arc(cx, cy - s * 0.1 - (1 - closed) * s * 0.12, sh, Math.PI, 0);
      ctx.stroke();
      ctx.restore();

      // keyhole
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.16, s * 0.055, 0, Math.PI * 2);
      ctx.fillStyle = alpha(P.surface, 0.95);
      ctx.fill();
      roundRect(ctx, cx - s * 0.022, cy + s * 0.16, s * 0.044, s * 0.14, s * 0.02);
      ctx.fill();

      // the packets on the wire are wrapped while they pass through
      const bandY = cy + s * 0.66;
      ctx.save();
      ctx.strokeStyle = alpha(P.good, 0.35);
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);
      ctx.lineDashOffset = -o.t * 80;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.1, bandY);
      ctx.lineTo(b.x + b.w * 0.9, bandY);
      ctx.stroke();
      ctx.restore();
      for (let i = 0; i < 3; i++) {
        const p = (o.t * 1.2 + i * 0.34) % 1;
        const px = b.x + b.w * 0.1 + p * b.w * 0.8;
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(p * Math.PI);
        roundRect(ctx, px - 10, bandY - 10, 20, 20, 5);
        ctx.fillStyle = alpha(P.good, 0.55);
        ctx.fill();
        ctx.restore();
      }

      if (closed > 0.6) {
        label(ctx, o.options.caption || 'nobody in the middle can read it', cx, cy + s * 0.78, {
          size: Math.min(23, s * 0.1), color: alpha(P.ink, 0.45), weight: 600,
        });
      }
    },
  },

  'request-envelope': {
    role: 'transform',
    about: 'the request: one envelope, addressed to the server',
    draw(ctx, b, o) {
      const w = Math.min(b.w * 0.66, 420);
      const h = Math.min(b.h * 0.5, 280);
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h * 0.5;
      const fly = easeOut(prog(o.t, 0.06, 0.44));
      const x = cx - w / 2 + fly * Math.min(b.w * 0.12, 70);
      const y = cy - h / 2;

      // the address it is going to, up in the corner - only when the shot does
      // not already carry a labelled link, or the server is named twice
      if (o.options.to) {
        label(ctx, o.options.to, b.x + b.w * 0.78, b.y + b.h * 0.12, {
          size: 22, color: alpha(P.ink, 0.42), weight: 700, spacing: 1,
        });
      }

      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(-0.03 + 0.02 * Math.sin(o.t * Math.PI * 2));
      ctx.translate(-(x + w / 2), -(y + h / 2));
      shadow(ctx, x + w / 2, y + h + 4, w * 0.42, 14, 0.09);
      roundRect(ctx, x, y, w, h, 14);
      ctx.fillStyle = mix(P.surfaceSoft, 0.12);
      ctx.fill();
      ctx.strokeStyle = alpha(P.ink, 0.16);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // flap
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 2);
      ctx.lineTo(x + w / 2, y + h * 0.56);
      ctx.lineTo(x + w - 2, y + 2);
      ctx.strokeStyle = alpha(P.ink, 0.16);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
      // the message
      ctx.save();
      ctx.font = `700 ${Math.min(40, w * 0.105)}px ${FONT_SERIF}`;
      ctx.fillStyle = P.ink;
      ctx.textAlign = 'center';
      ctx.fillText(o.options.label || 'GET /page', x + w / 2, y + h * 0.78);
      ctx.restore();
      ctx.restore();

      // and the little arrow that says which way it goes
      arrow(ctx, [x + w + 12, cy], [b.x + b.w * 0.92, cy], {
        colour: alpha(P.accent, 0.7), width: 4, head: 13, progress: prog(o.t, 0.18, 0.5),
      });
      label(ctx, 'REQUEST', b.x + b.w * 0.5, y - 22, {
        size: 22, color: alpha(P.accent, 0.9), weight: 700, spacing: 3,
      });
    },
  },

  'file-cards': {
    role: 'demonstrate',
    about: 'the files that come back: HTML, CSS, JavaScript, images',
    draw(ctx, b, o) {
      const defaults = [
        ['HTML', 'the words', P.accent],
        ['CSS', 'the look', P.link],
        ['JS', 'the behaviour', P.good],
        ['IMG', 'the pictures', P.stop],
      ];
      const files = (o.options.files || defaults).slice(0, 4)
        .map(([tag, sub, tone], i) => [tag, sub, tone || defaults[i % defaults.length][2]]);
      // Four cards in a fan: each one lands, then the whole stack settles.
      const cw = Math.min(b.w * 0.46, 340);
      const chh = Math.min(b.h * 0.42, 260);
      const cx = b.x + b.w * 0.5;
      const baseY = b.y + b.h * 0.9;
      files.forEach(([tag, sub, tone], i) => {
        const p = easeOut(prog(o.t, 0.04 + i * 0.09, 0.2 + i * 0.09));
        if (p <= 0) return;
        const spread = (i - (files.length - 1) / 2);
        const x = cx - cw / 2 + spread * cw * 0.42;
        const y = baseY - chh - Math.abs(spread) * chh * 0.14 - (1 - p) * 60;
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.75 * p;
        ctx.translate(x + cw / 2, y + chh);
        ctx.rotate(spread * 0.05 + 0.01 * Math.sin(o.t * Math.PI * 2 + i));
        ctx.translate(-(x + cw / 2), -(y + chh));
        shadow(ctx, x + cw / 2, y + chh + 6, cw * 0.36, 12, 0.07);
        paperCard(ctx, x, y, cw, chh, { r: 16 });
        ctx.save();
        roundRect(ctx, x, y, cw, chh * 0.2, 16);
        ctx.clip();
        ctx.fillStyle = mix(tone, 0.82);
        ctx.fillRect(x, y, cw, chh * 0.2);
        ctx.restore();
        label(ctx, tag, x + cw / 2, y + chh * 0.14, {
          size: Math.min(24, cw * 0.09), color: alpha(P.surface, 0.98), weight: 700, spacing: 2,
        });
        label(ctx, sub, x + cw / 2, y + chh * 0.52, {
          size: Math.min(30, cw * 0.105), color: alpha(P.ink, 0.8), weight: 600,
        });
        // a couple of lines, so the card reads as a file and not a label
        [0, 1].forEach((r) => {
          roundRect(ctx, x + cw * 0.12, y + chh * 0.68 + r * chh * 0.1, cw * (r ? 0.5 : 0.74), chh * 0.045, 6);
          ctx.fillStyle = alpha(P.ink, 0.1);
          ctx.fill();
        });
        ctx.restore();
      });
      label(ctx, o.options.caption || 'the pieces of one page', b.x + b.w / 2, b.y + 26, {
        size: 24, color: alpha(P.ink, 0.45), weight: 700, spacing: 2,
      });
    },
  },

  signpost: {
    role: 'label',
    about: 'the question the episode leaves behind',
    draw(ctx, b, o) {
      const cx = b.x + b.w / 2;
      const postTop = b.y + b.h * 0.28;
      const baseY = b.y + b.h * 0.98;
      shadow(ctx, cx, baseY, b.w * 0.3, 22, 0.08);
      roundRect(ctx, cx - 9, postTop, 18, baseY - postTop, 6);
      ctx.fillStyle = mix(P.isoLeft, 0.1);
      ctx.fill();
      ctx.strokeStyle = alpha(P.isoEdge, 0.7);
      ctx.lineWidth = 2;
      ctx.stroke();

      const tilt = -0.035 + 0.008 * Math.sin(o.t * Math.PI * 2);
      const cardW = Math.min(b.w * 0.86, 460);
      const cardH = Math.min(b.h * 0.34, 210);
      ctx.save();
      ctx.translate(cx, postTop + cardH * 0.1);
      ctx.rotate(tilt);
      paperCard(ctx, -cardW / 2, -cardH, cardW, cardH, { r: 24 });
      label(ctx, o.options.kicker || 'ask where', 0, -cardH * 0.58, { size: 26, color: alpha(P.ink, 0.45), weight: 600 });
      ctx.save();
      ctx.font = `600 ${Math.min(60, cardW * 0.14)}px ${FONT_SERIF}`;
      ctx.fillStyle = P.ink;
      ctx.textAlign = 'center';
      ctx.fillText(o.options.text || 'the check is', 0, -cardH * 0.2);
      ctx.restore();
      ctx.restore();
    },
  },

  // -------------------------------------------------------------------------
  // 0101 - where your photos actually live
  // -------------------------------------------------------------------------

  photo: {
    role: 'demonstrate',
    about: 'one photo: the object of the whole film',
    draw(ctx, b, o) {
      const w = Math.min(b.w * 0.72, b.h * 0.86);
      const h = w * 0.78;
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h - h;
      shadow(ctx, x + w / 2, y + h + 8, w * 0.42, 18, 0.09);
      paperCard(ctx, x, y, w, h, { r: 18 });
      // the picture inside: sky, a hill, a sun
      ctx.save();
      roundRect(ctx, x + w * 0.06, y + h * 0.08, w * 0.88, h * 0.62, 12);
      ctx.fillStyle = mix(P.link, 0.72);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.06, y + h * 0.7);
      ctx.quadraticCurveTo(x + w * 0.42, y + h * 0.34, x + w * 0.94, y + h * 0.7);
      ctx.lineTo(x + w * 0.94, y + h * 0.7);
      ctx.closePath();
      ctx.fillStyle = mix(P.good, 0.3);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + w * 0.76, y + h * 0.24, w * 0.07, 0, Math.PI * 2);
      ctx.fillStyle = mix(P.accent, 0.25);
      ctx.fill();
      ctx.restore();
      label(ctx, o.options.caption || 'your holiday', x + w / 2, y + h * 0.88, {
        size: Math.max(24, w * 0.07), color: alpha(P.ink, 0.5), weight: 600,
      });
    },
  },

  racks: {
    role: 'demonstrate',
    about: 'a warehouse of servers: what "the cloud" actually is',
    draw(ctx, b, o) {
      const cols = 3;
      const rows = 3;
      const gap = b.w * 0.03;
      const bw = (b.w * 0.82 - gap * (cols - 1)) / cols;
      const bh = Math.min((b.h * 0.74 - gap * (rows - 1)) / rows, bw * 1.6);
      const x0 = b.x + (b.w - (bw * cols + gap * (cols - 1))) / 2;
      const baseY = b.y + b.h * 0.9;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cx = x0 + bw / 2 + c * (bw + gap);
          const by = baseY - r * (bh * 0.62 + gap * 0.5);
          shadow(ctx, cx, by + 6, bw * 0.46, 12, 0.06);
          crate(ctx, cx, by, bw, bh, r === 1 && c === 1 ? P.link : P.isoLeft);
          const led = (o.frame / 18 + r * 3 + c) % 4 < 1.6;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx - bw * 0.16, by - bh * 0.5, Math.max(4, bw * 0.035), 0, Math.PI * 2);
          ctx.fillStyle = led ? P.good : alpha(P.ink, 0.25);
          ctx.fill();
          ctx.restore();
        }
      }
      label(ctx, o.options.caption || 'a building, not the sky', b.x + b.w / 2, b.y + 26, {
        size: 27, color: alpha(P.ink, 0.5), weight: 700, spacing: 2,
      });
    },
  },

  copies: {
    role: 'compare',
    about: 'the same photo, stored in three separate buildings',
    draw(ctx, b, o) {
      const n = 3;
      const gap = b.w * 0.05;
      const bw = (b.w * 0.86 - gap * (n - 1)) / n;
      const bh = Math.min(b.h * 0.42, bw * 1.1);
      const baseY = b.y + b.h * 0.92;
      for (let i = 0; i < n; i++) {
        const cx = b.x + b.w * 0.07 + bw / 2 + i * (bw + gap);
        const lift = i === 1 ? 0 : b.h * 0.06;
        shadow(ctx, cx, baseY + 8, bw * 0.5, 14, 0.08);
        crate(ctx, cx, baseY - lift, bw * 0.78, bh, P.isoLeft);
        // a roof, so it reads as a building
        poly(ctx, [[cx - bw * 0.5, baseY - lift - bh], [cx, baseY - lift - bh - bh * 0.22], [cx + bw * 0.5, baseY - lift - bh]], mix(P.accent, 0.55), alpha(P.accent, 0.7), 2);
        parcelShape(ctx, cx, baseY - lift - bh * 0.52, Math.max(40, bw * 0.3), { tone: P.link, tickIn: prog(o.t, 0.2 + i * 0.12, 0.5 + i * 0.12) });
        label(ctx, ['building A', 'building B', 'building C'][i], cx, baseY + 40, {
          size: 24, color: alpha(P.ink, 0.5), weight: 600,
        });
      }
      ctx.save();
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = alpha(P.ink, 0.22);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w * 0.1, baseY - b.h * 0.52);
      ctx.lineTo(b.x + b.w * 0.9, baseY - b.h * 0.52);
      ctx.stroke();
      ctx.restore();
      label(ctx, 'one photo, three copies', b.x + b.w / 2, b.y + 26, { size: 27, color: alpha(P.ink, 0.5), weight: 700, spacing: 2 });
    },
  },

  heat: {
    role: 'label',
    about: 'power in, heat out: the part nobody pictures',
    draw(ctx, b, o) {
      const barW = Math.min(b.w * 0.66, 420);
      const x = b.x + (b.w - barW) / 2;
      const topY = b.y + b.h * 0.16;
      const botY = b.y + b.h * 0.88;
      label(ctx, 'POWER IN', x + barW + 18, topY + 8, { size: 26, color: alpha(P.ink, 0.5), weight: 700, align: 'left', spacing: 1 });
      label(ctx, 'HEAT OUT', x + barW + 18, botY - 8, { size: 26, color: alpha(P.stop, 0.75), weight: 700, align: 'left', spacing: 1 });
      arrow(ctx, [x + barW + 6, topY], [x + barW * 0.42, topY], { colour: alpha(P.accent, 0.7), width: 6, head: 18 });
      arrow(ctx, [x + barW * 0.42, botY], [x + barW + 6, botY], { colour: alpha(P.stop, 0.6), width: 6, head: 18 });
      // the rack in the middle
      const cx = x + barW * 0.42;
      const h = (botY - topY) * 0.54;
      shadow(ctx, cx, botY - (botY - topY) * 0.1, barW * 0.3, 16, 0.08);
      crate(ctx, cx, botY - (botY - topY) * 0.14, barW * 0.34, h, P.isoLeft);
      chip(ctx, cx - 42, topY + (botY - topY) * 0.34, 'search', { size: 20 });
    },
  },

  // -------------------------------------------------------------------------
  // 0103 - is it actually free
  // -------------------------------------------------------------------------

  tags: {
    role: 'compare',
    about: 'the four prices a free tool can charge',
    draw(ctx, b, o) {
      const names = o.options.items || ['ATTENTION', 'DATA', 'LATER', 'SOMEONE ELSE'];
      const rows = b.h > b.w * 1.1 || b.w < 420;
      const n = names.length;
      const k = rows ? 1 : 0.72;
      const cellW = rows ? b.w : (b.w - 24 * (n - 1)) / n;
      const cellH = rows ? (b.h - 24 * (n - 1)) / n : b.h;
      names.forEach((name, i) => {
        const cx = rows ? b.x + b.w / 2 : b.x + cellW / 2 + i * (cellW + 24);
        const cy = rows ? b.y + cellH / 2 + i * (cellH + 24) : b.y + cellH / 2;
        const w = Math.min(cellW * 0.92, 260);
        const h = Math.min(cellH * 0.8, 150 * k);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.03 + i * 0.015);
        paperCard(ctx, -w / 2, -h / 2, w, h, { r: 16 });
        // the punched hole and the string
        ctx.beginPath();
        ctx.arc(0, -h / 2 + 22, 7, 0, Math.PI * 2);
        ctx.fillStyle = alpha(P.ink, 0.14);
        ctx.fill();
        ctx.save();
        ctx.font = `700 ${Math.min(30, w * 0.12)}px ${FONT_SANS}`;
        ctx.fillStyle = i === 3 ? alpha(P.ink, 0.62) : P.ink;
        ctx.textAlign = 'center';
        wrapText(ctx, name, w - 30, 2).forEach((line, li, all) => {
          ctx.fillText(line, 0, 8 + (li - (all.length - 1) / 2) * 32);
        });
        ctx.restore();
        ctx.restore();
        if (i === 0) {
          ctx.save();
          ctx.strokeStyle = alpha(P.accent, 0.45 + 0.25 * Math.sin(o.t * Math.PI * 6));
          ctx.lineWidth = 4;
          roundRect(ctx, cx - w / 2 - 8, cy - h / 2 - 8, w + 16, h + 16, 20);
          ctx.stroke();
          ctx.restore();
        }
      });
    },
  },

  scale: {
    role: 'compare',
    about: 'free on one side, who pays on the other',
    draw(ctx, b, o) {
      const cx = b.x + b.w / 2;
      const beamY = b.y + b.h * 0.34;
      const armW = Math.min(b.w * 0.78, 520);
      const baseY = b.y + b.h * 0.94;
      // the stand
      roundRect(ctx, cx - 8, beamY, 16, baseY - beamY, 6);
      ctx.fillStyle = mix(P.isoLeft, 0.08);
      ctx.fill();
      shadow(ctx, cx, baseY, armW * 0.3, 18, 0.08);
      // the beam, tilted by which side is heavier
      const tilt = Number(o.options.tilt || 0) * 0.16 + 0.03 * Math.sin(o.t * Math.PI * 2);
      ctx.save();
      ctx.translate(cx, beamY);
      ctx.rotate(tilt);
      roundRect(ctx, -armW / 2, -9, armW, 18, 9);
      ctx.fillStyle = mix(P.accent, 0.2);
      ctx.fill();
      ['free', 'who pays?'].forEach((name, i) => {
        const px = (i ? 1 : -1) * armW / 2;
        ctx.beginPath();
        ctx.arc(px, 0, Math.min(56, armW * 0.14), 0, Math.PI * 2);
        ctx.fillStyle = mix(P.surface, 0.02);
        ctx.fill();
        ctx.strokeStyle = alpha(P.isoEdge, 0.7);
        ctx.lineWidth = 3;
        ctx.stroke();
        label(ctx, name.toUpperCase(), px, 0, {
          size: Math.min(24, armW * 0.055), color: i ? alpha(P.ink, 0.5) : P.ink, weight: 700, spacing: 1,
        });
      });
      ctx.restore();
      label(ctx, o.options.caption || 'nothing is free, something pays', cx, b.y + 26, {
        size: 27, color: alpha(P.ink, 0.5), weight: 700, spacing: 1,
      });
    },
  },

  // -------------------------------------------------------------------------
  // 0104 - why your wifi dies at nine pm
  // -------------------------------------------------------------------------

  router: {
    role: 'demonstrate',
    about: 'the box in your hallway, sending on one channel',
    draw(ctx, b, o) {
      const w = Math.min(b.w * 0.5, 260);
      const cx = b.x + b.w / 2;
      const baseY = b.y + b.h * 0.9;
      shadow(ctx, cx, baseY + 8, w * 0.7, 18, 0.09);
      crate(ctx, cx, baseY, w, w * 0.5, P.isoLeft);
      // antennas
      [0.38, 0.62].forEach((f) => {
        const ax = b.x + b.w * f;
        ctx.save();
        ctx.strokeStyle = alpha(P.ink, 0.4);
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ax, baseY - w * 0.42);
        ctx.lineTo(ax + (f - 0.5) * w * 0.4, baseY - w * 0.95);
        ctx.stroke();
        ctx.restore();
      });
      // the waves
      for (let i = 0; i < 3; i++) {
        const r = w * (0.6 + i * 0.3) + Math.sin(o.t * Math.PI * 2 - i) * 6;
        ctx.save();
        ctx.strokeStyle = alpha(P.accent, 0.5 - i * 0.12);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(cx, baseY - w * 0.9, r, -Math.PI * 0.82, -Math.PI * 0.18);
        ctx.stroke();
        ctx.restore();
      }
      label(ctx, o.options.caption || 'one box, a hallway', cx, baseY + 44, {
        size: 25, color: alpha(P.ink, 0.5), weight: 600,
      });
    },
  },

  channels: {
    role: 'compare',
    about: 'three channels that do not overlap, and everybody on one of them',
    draw(ctx, b, o) {
      const crowded = Boolean(o.options.crowded);
      const lanes = 3;
      const names = ['1', '6', '11'];
      const laneH = (b.h * 0.6) / lanes;
      const x0 = b.x + b.w * 0.08;
      const x1 = b.x + b.w * 0.92;
      names.forEach((name, i) => {
        const y = b.y + b.h * 0.22 + i * laneH;
        // the band
        ctx.save();
        ctx.strokeStyle = alpha(P.ink, 0.12);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x0, y);
        ctx.lineTo(x1, y);
        ctx.stroke();
        ctx.restore();
        label(ctx, `ch ${name}`, x0 - 16, y + 8, { size: 26, color: alpha(P.ink, 0.4), weight: 700, align: 'right', spacing: 1 });

        // one bump per nearby network, squeezed onto the channel when crowded
        const bumps = crowded ? (i === 1 ? 7 : 1) : 2;
        for (let k = 0; k < bumps; k++) {
          const f = bumps === 1 ? 0.5 : (k + 0.5) / bumps;
          const cx = x0 + (x1 - x0) * (0.1 + f * 0.8);
          const r = Math.min(laneH * 0.42, 40);
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, y, r, Math.PI, 0);
          ctx.lineWidth = 4;
          ctx.strokeStyle = alpha(i === 1 && crowded ? P.stop : P.good, 0.7);
          ctx.stroke();
          ctx.restore();
        }
      });
      label(ctx, crowded ? 'nine pm: everybody on channel 6' : 'three channels, kept apart', b.x + b.w / 2, b.y + b.h * 0.9, {
        size: 27, color: alpha(crowded ? P.stop : P.ink, 0.75), weight: 700, spacing: 1,
      });
    },
  },

  // -------------------------------------------------------------------------
  // 0106 - chatbot vs agent
  // -------------------------------------------------------------------------

  'chat-panels': {
    role: 'compare',
    about: 'two things that look alike: a chat bubble and a task list',
    draw(ctx, b, o) {
      const vertical = b.h > b.w * 0.8;
      const gap = Math.min(b.w, b.h) * 0.07;
      const cw = vertical ? b.w * 0.94 : (b.w - gap) / 2;
      const ch = vertical ? (b.h - gap) / 2 : b.h * 0.94;
      const panels = [
        { x: vertical ? b.x + (b.w - cw) / 2 : b.x + (b.w - (cw * 2 + gap)) / 2, y: b.y + (vertical ? 0 : b.h * 0.03), tag: 'CHATBOT', tone: P.link },
        { x: b.x + (b.w - (cw * 2 + gap)) / 2 + cw + gap, y: vertical ? b.y + ch + gap : b.y + b.h * 0.03, tag: 'AGENT', tone: P.good },
      ];
      panels.forEach((pn, i) => {
        const w = Math.min(cw, b.w), h = Math.min(ch, b.h - (pn.y - b.y));
        shadow(ctx, pn.x + w / 2, pn.y + h + 8, w * 0.42, 16, 0.08);
        paperCard(ctx, pn.x, pn.y, w, h, { r: 22 });
        label(ctx, pn.tag, pn.x + 26, pn.y + 40, { size: 24, color: alpha(pn.tone, 0.9), weight: 700, align: 'left', spacing: 2 });
        if (i === 0) {
          // a speech bubble with a question mark in it
          const bw = w * 0.5;
          const bh = h * 0.34;
          roundRect(ctx, pn.x + w * 0.5 - bw / 2, pn.y + h * 0.42, bw, bh, Math.min(18, bh * 0.3));
          ctx.fillStyle = mix(P.link, 0.82);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(pn.x + w * 0.5 - bw * 0.2, pn.y + h * 0.42 + bh);
          ctx.lineTo(pn.x + w * 0.5 - bw * 0.34, pn.y + h * 0.42 + bh + 22);
          ctx.lineTo(pn.x + w * 0.5 + bw * 0.04, pn.y + h * 0.42 + bh);
          ctx.closePath();
          ctx.fill();
          label(ctx, '?', pn.x + w * 0.5, pn.y + h * 0.42 + bh * 0.68, { size: bh * 0.9, color: alpha(P.surface, 0.95), weight: 700 });
        } else {
          // a short task list, ticking itself off
          const rows = (o.options.rows || ['find a time', 'check the calendar', 'draft the invite']).slice(0, 3);
          const startY = pn.y + h * 0.36;
          const rowH = Math.min(46, (h * 0.5) / rows.length);
          rows.forEach((row, ri) => {
            const ry = startY + ri * rowH;
            const done = prog(o.t, 0.2 + ri * 0.12, 0.42 + ri * 0.12);
            ctx.save();
            roundRect(ctx, pn.x + w * 0.12, ry - 12, 22, 22, 6);
            ctx.strokeStyle = alpha(P.ink, 0.35);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
            if (done > 0) tick(ctx, pn.x + w * 0.12 + 11, ry - 1, 20, alpha(P.good, done), 4);
            label(ctx, row, pn.x + w * 0.12 + 40, ry + 4, { size: Math.min(24, w * 0.075), color: P.inkSoft, weight: 500, align: 'left' });
          });
        }
      });
    },
  },

  'chat-bubble': {
    role: 'demonstrate',
    about: 'a question goes in, a plain answer comes back',
    draw(ctx, b, o) {
      // A wide, short box is a conversation held sideways: the question on the
      // left, the answer on the right, one arrow between them. Stacking them
      // vertically in a 900x290 box made both bubbles small and the shot empty.
      if (b.w > b.h * 1.7) {
        const gap = Math.min(120, b.w * 0.12);
        const bw = Math.min((b.w - gap) / 2, 470);
        const bh = Math.min(b.h * 0.62, 230);
        const cy = b.y + b.h * 0.52;
        const qx = b.x + b.w / 2 - bw - gap / 2;
        const ax = b.x + b.w / 2 + gap / 2;
        const pop = easeOut(prog(o.t, 0.02, 0.18));
        const pop2 = easeOut(prog(o.t, 0.12, 0.3));
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.5 * pop;
        roundRect(ctx, qx, cy - bh / 2, bw, bh, 22);
        ctx.fillStyle = P.surface;
        ctx.fill();
        ctx.strokeStyle = alpha(P.ink, 0.12);
        ctx.lineWidth = 2;
        ctx.stroke();
        label(ctx, 'YOU ASK', qx + bw / 2, cy - bh / 2 - 18, { size: 22, color: alpha(P.ink, 0.42), weight: 700, spacing: 2 });
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.4 + 0.6 * pop2;
        roundRect(ctx, ax, cy - bh / 2, bw, bh, 22);
        ctx.fillStyle = mix(P.link, 0.86);
        ctx.fill();
        label(ctx, 'IT EXPLAINS', ax + bw / 2, cy - bh / 2 - 18, { size: 22, color: alpha(P.link, 0.95), weight: 700, spacing: 2 });
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = Math.min(1, pop2 * 1.4);
        ctx.font = `600 ${Math.min(34, bw * 0.075)}px ${FONT_SANS}`;
        ctx.fillStyle = P.ink;
        ctx.textAlign = 'center';
        wrapText(ctx, o.options.question || '"how do I get to the station?"', bw - 44, 2)
          .forEach((line, li, all) => ctx.fillText(line, qx + bw / 2, cy + 4 + (li - (all.length - 1) / 2) * 36));
        wrapText(ctx, o.options.answer || 'turn left, then follow the river', bw - 44, 2)
          .forEach((line, li, all) => ctx.fillText(line, ax + bw / 2, cy + 4 + (li - (all.length - 1) / 2) * 34));
        ctx.restore();

        arrow(ctx, [qx + bw + 10, cy], [ax - 12, cy], {
          colour: alpha(P.ink, 0.3), width: 4, head: 13, progress: prog(o.t, 0.16, 0.4),
        });
        return;
      }

      const w = Math.min(b.w * 0.94, 560);
      const cx = b.x + b.w / 2;
      const qh = Math.min(b.h * 0.3, 190);
      const ah = Math.min(b.h * 0.36, 230);
      const qy = b.y + b.h * 0.1;
      const ay = qy + qh + b.h * 0.14;

      // the question
      ctx.save();
      roundRect(ctx, cx - w / 2, qy, w, qh, 20);
      ctx.fillStyle = mix(P.surface, 0.0);
      ctx.fill();
      ctx.strokeStyle = alpha(P.ink, 0.12);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      label(ctx, 'YOU ASK', cx, qy - 14, { size: 22, color: alpha(P.ink, 0.42), weight: 700, spacing: 2 });
      ctx.save();
      ctx.font = `600 ${Math.min(34, w * 0.07)}px ${FONT_SANS}`;
      ctx.fillStyle = P.ink;
      ctx.textAlign = 'center';
      wrapText(ctx, o.options.question || '"how do I get to the station?"', w - 48, 2)
        .forEach((line, li, all) => ctx.fillText(line, cx, qy + qh * 0.6 + (li - (all.length - 1) / 2) * 36));
      ctx.restore();

      // the answer
      ctx.save();
      roundRect(ctx, cx - w * 0.44, ay, w * 0.88, ah, 22);
      ctx.fillStyle = mix(P.link, 0.86);
      ctx.fill();
      ctx.restore();
      arrow(ctx, [cx, qy + qh + 12], [cx, ay - 16], { colour: alpha(P.ink, 0.28), width: 4, head: 13, progress: prog(o.t, 0.1, 0.35) });
      label(ctx, 'IT EXPLAINS', cx, ay - 14, { size: 22, color: alpha(P.link, 0.95), weight: 700, spacing: 2 });
      ctx.save();
      ctx.font = `600 ${Math.min(32, w * 0.065)}px ${FONT_SANS}`;
      ctx.fillStyle = P.ink;
      ctx.textAlign = 'center';
      wrapText(ctx, o.options.answer || 'turn left, then follow the river', w * 0.76, 2)
        .forEach((line, li, all) => ctx.fillText(line, cx, ay + ah * 0.62 + (li - (all.length - 1) / 2) * 34));
      ctx.restore();
    },
  },

  'route-card': {
    role: 'label',
    about: 'the route itself: an answer you can read, not an action taken',
    draw(ctx, b, o) {
      const w = Math.min(b.w, 460);
      const h = Math.min(b.h * 0.78, 340);
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h * 0.9 - h;
      paperCard(ctx, x, y, w, h, { r: 18 });
      // two roads that meet
      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.16);
      ctx.lineWidth = 26;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + w * 0.14, y + h * 0.82);
      ctx.lineTo(x + w * 0.5, y + h * 0.5);
      ctx.lineTo(x + w * 0.86, y + h * 0.2);
      ctx.stroke();
      ctx.restore();
      // The dot walks the route and then walks it again: an answer is something
      // you read, and reading costs no steps. That is the whole point of the beat.
      const leg = (t) => {
        const u = Math.min(1, Math.max(0, t));
        return u < 0.5
          ? [x + w * 0.14 + (x + w * 0.5 - (x + w * 0.14)) * (u / 0.5), y + h * 0.82 - (x + w * 0.36) * (u / 0.5) * 0.63]
          : [x + w * 0.5 + (x + w * 0.36) * ((u - 0.5) / 0.5), y + h * 0.5 - (x + w * 0.36) * ((u - 0.5) / 0.5) * 0.63];
      };
      const cycle = 0.55;
      const travel = Math.min(1, Math.max(0, (o.t - 0.1) / cycle));
      const [px, py] = leg(travel);
      ctx.save();
      ctx.beginPath();
      ctx.arc(px, py, 13, 0, Math.PI * 2);
      ctx.fillStyle = P.accent;
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + w * 0.86, y + h * 0.2, 15, 0, Math.PI * 2);
      ctx.fillStyle = P.good;
      ctx.fill();
      ctx.restore();
      label(ctx, 'you', x + w * 0.14, y + h * 0.9 + 2, { size: 20, color: alpha(P.ink, 0.42), weight: 700 });
      label(ctx, 'station', x + w * 0.86, y + h * 0.2 - 26, { size: 20, color: alpha(P.good, 0.85), weight: 700 });
      label(ctx, o.options.caption || 'the route', x + w / 2, y + h - 22, { size: 24, color: alpha(P.ink, 0.5), weight: 700, spacing: 1 });
    },
  },

  calendar: {
    role: 'demonstrate',
    about: 'a week of slots, some free, that the agent can read',
    draw(ctx, b, o) {
      const cols = 4;
      const rows = 3;
      const gap = Math.min(b.w, b.h) * 0.035;
      // The grid is the picture, so it is measured from the box rather than
      // given a remembered cell size: full width, and as tall as three rows fit.
      const cw = (b.w * 0.98 - gap * (cols - 1)) / cols;
      const chh = Math.min((b.h * 0.86 - gap * (rows - 1)) / rows, cw * 1.35);
      const x0 = b.x + (b.w - (cw * cols + gap * (cols - 1))) / 2;
      const y0 = b.y + b.h * 0.94 - (chh * rows + gap * (rows - 1));
      const free = new Set([4, 6, 11]);
      const days = ['MON', 'TUE', 'WED', 'THU'];
      days.forEach((d, c) => {
        label(ctx, d, x0 + c * (cw + gap) + cw / 2, y0 - 16, {
          size: Math.min(20, cw * 0.22), color: alpha(P.ink, 0.34), weight: 700, spacing: 2,
        });
      });
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const x = x0 + c * (cw + gap);
          const y = y0 + r * (chh + gap);
          const isFree = free.has(i);
          const lit = easeOut(prog(o.t, 0.06 + i * 0.03, 0.22 + i * 0.03));
          const pulse = 0.5 + 0.5 * Math.sin((o.t * 6.28 + i) * 1.6);
          if (lit <= 0) continue;
          ctx.save();
          ctx.globalAlpha = lit;
          roundRect(ctx, x, y, cw, chh, 10);
          ctx.fillStyle = isFree ? mix(P.good, 0.86) : alpha(P.ink, 0.05);
          ctx.fill();
          ctx.strokeStyle = alpha(P.ink, 0.1);
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
          if (isFree) {
            // the free slots breathe, so the eye lands on the three that matter
            ctx.save();
            ctx.globalAlpha = lit * (0.28 + 0.22 * pulse);
            roundRect(ctx, x - 5, y - 5, cw + 10, chh + 10, 14);
            ctx.strokeStyle = P.good;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
            label(ctx, 'free', x + cw / 2, y + chh / 2 + 8, {
              size: Math.min(22, cw * 0.26), color: alpha(P.good, 0.9 * lit), weight: 700, spacing: 1,
            });
          }
        }
      }
      label(ctx, o.options.caption || 'this week', b.x + b.w / 2, y0 - 44, { size: 24, color: alpha(P.ink, 0.5), weight: 700, spacing: 2 });
    },
  },

  invite: {
    role: 'transform',
    about: 'the draft invitation: the thing the agent made, not sent',
    draw(ctx, b, o) {
      const w = Math.min(b.w * 0.94, 700);
      const h = Math.min(b.h * 0.82, 470);
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h * 0.9 - h;
      const tilt = -0.02 + 0.01 * Math.sin(o.t * Math.PI * 2);
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(tilt);
      shadow(ctx, 0, h / 2 + 6, w * 0.4, 16, 0.08);
      paperCard(ctx, -w / 2, -h / 2, w, h, { r: 16 });
      const wrong = Boolean(o.options.wrong);
      label(ctx, wrong ? 'DRAFT · WRONG' : 'DRAFT', -w / 2 + 24, -h / 2 + 34, {
        size: 20, color: wrong ? alpha(P.stop, 0.95) : alpha(P.accent, 0.9), weight: 700, align: 'left', spacing: 2,
      });
      ctx.save();
      ctx.font = `600 ${Math.min(32, w * 0.075)}px ${FONT_SERIF}`;
      ctx.fillStyle = wrong ? alpha(P.stop, 0.9) : P.ink;
      ctx.textAlign = 'left';
      const titleLines = wrapText(ctx, o.options.title || 'Meeting, Thursday 3 pm', w - 48, 2);
      titleLines.forEach((line, li) => ctx.fillText(line, -w / 2 + 24, -h / 2 + h * 0.42 + li * 36));
      if (wrong) {
        // the mistake is visible, not narrated: the line the agent got wrong is
        // struck through and the real instruction is written under it
        ctx.strokeStyle = alpha(P.stop, 0.85);
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        titleLines.forEach((line, li) => {
          const y = -h / 2 + h * 0.42 + li * 36 - 10;
          ctx.beginPath();
          ctx.moveTo(-w / 2 + 20, y);
          ctx.lineTo(-w / 2 + 24 + ctx.measureText(line).width, y);
          ctx.stroke();
        });
      }
      ctx.restore();
      label(ctx, o.options.sub || 'two slots compared · one chosen', -w / 2 + 24, h / 2 - 40, {
        size: 21, color: wrong ? alpha(P.stop, 0.8) : alpha(P.ink, 0.45), weight: wrong ? 600 : 500, align: 'left',
      });
      ctx.restore();
    },
  },

  'setup-pair': {
    role: 'compare',
    about: 'same model inside, different wiring: answer only, or answer plus steps',
    draw(ctx, b, o) {
      const rows = 2;
      const rowH = (b.h * 0.94) / rows;
      const w = b.w * 0.9;
      const x = b.x + b.w * 0.05;
      const items = [
        { tag: 'CHATBOT', out: 'one reply', tone: P.link, steps: false },
        { tag: 'AGENT', out: 'reply + steps', tone: P.good, steps: true },
      ];
      items.forEach((it, i) => {
        const cy = b.y + b.h * 0.07 + rowH * (i + 0.5);
        roundRect(ctx, x, cy - rowH * 0.34, w, rowH * 0.68, 18);
        ctx.fillStyle = mix(it.tone, 0.9);
        ctx.fill();
        label(ctx, it.tag, x + 26, cy - 4, { size: 27, color: alpha(it.tone, 0.95), weight: 700, align: 'left', spacing: 2 });
        // the same model box in both rows; what changes is what is wired to it
        const bx = x + w * 0.62;
        crate(ctx, bx, cy + rowH * 0.24, Math.min(130, w * 0.18), Math.min(96, rowH * 0.5), P.isoLeft);
        label(ctx, 'model', bx, cy - 2, { size: 20, color: alpha(P.ink, 0.55), weight: 600 });
        if (it.steps) {
          const n = 3;
          const sx = x + w * 0.18;
          for (let k = 0; k < n; k++) {
            const kx = sx + k * (w * 0.13);
            const lit = prog(o.t, 0.2 + k * 0.14, 0.4 + k * 0.14);
            roundRect(ctx, kx - 26, cy + rowH * 0.06, 52, 34, 8);
            ctx.fillStyle = alpha(P.accent, 0.2 * lit + 0.1);
            ctx.fill();
          }
          arrow(ctx, [x + w * 0.18 + 3 * (w * 0.13) - 26, cy + rowH * 0.24], [bx - 60, cy + rowH * 0.24], {
            colour: alpha(P.accent, 0.6), width: 4, head: 12, progress: prog(o.t, 0.3, 0.6),
          });
        } else {
          arrow(ctx, [x + w * 0.3, cy + rowH * 0.24], [bx - 60, cy + rowH * 0.24], {
            colour: alpha(P.ink, 0.22), width: 4, head: 12, progress: prog(o.t, 0.2, 0.5),
          });
        }
      });
      label(ctx, 'same model · different wiring', b.x + b.w / 2, b.y + 24, { size: 25, color: alpha(P.ink, 0.5), weight: 700, spacing: 1 });
    },
  },

  versus: {
    role: 'compare',
    about: 'the takeaway, held as two columns',
    draw(ctx, b, o) {
      const vertical = b.h > b.w * 0.9;
      const gap = Math.min(b.w, b.h) * 0.07;
      const cw = vertical ? b.w * 0.92 : (b.w - gap) / 2;
      const chh = vertical ? (b.h - gap) / 2 : b.h * 0.92;
      const cols = [
        { tag: 'CHATBOT', sub: 'responds', tone: P.link, tick: false },
        { tag: 'AGENT', sub: 'can take steps', tone: P.good, tick: true },
      ];
      cols.forEach((col, i) => {
        const x = vertical ? b.x + (b.w - cw) / 2 : b.x + i * (cw + gap);
        const y = vertical ? b.y + i * (chh + gap) : b.y + b.h * 0.04;
        shadow(ctx, x + cw / 2, y + chh + 6, cw * 0.4, 16, 0.08);
        paperCard(ctx, x, y, cw, chh, { r: 22 });
        label(ctx, col.tag, x + cw / 2, y + chh * 0.22, { size: Math.min(28, cw * 0.13), color: alpha(col.tone, 0.95), weight: 700, spacing: 3 });
        ctx.save();
        ctx.font = `600 ${Math.min(52, cw * 0.13)}px ${FONT_SERIF}`;
        ctx.fillStyle = P.ink;
        ctx.textAlign = 'center';
        wrapText(ctx, col.sub, cw - 44, 2).forEach((line, li, all) => {
          ctx.fillText(line, x + cw / 2, y + chh * 0.55 + (li - (all.length - 1) / 2) * 50);
        });
        ctx.restore();
        if (col.tick) tick(ctx, x + cw - 44, y + chh - 44, 34, P.good, 6);
      });
    },
  },

  'cat-pillow': {
    role: 'label',
    about: 'the channel joke: a small cat cushion holding something up',
    draw(ctx, b, o) {
      // The cushion is measured against the box in both directions: a support
      // box is wide and short, and a cushion sized from width alone climbs out
      // of it into the header.
      const w = Math.min(b.w * 0.86, b.h * 1.45, 300);
      const h = w * 0.62;
      const cx = b.x + b.w / 2;
      const baseY = b.y + b.h * 0.94;
      const breathe = Math.sin(o.t * Math.PI * 2) * 3;
      // the cushion's whole job is to hold something up: a small card tilted
      // against its head, so the joke reads as "even the cat checked this"
      if (o.options.stack) {
        // the joke, second use: the cat keeps the files steady while the page
        // is being built. The pile sits on the cushion and is measured up from
        // it, so the whole thing stays inside the box it was given.
        const sw = w * 0.92;
        const shh = Math.min(sw * 0.3, (b.h - h) * 0.62);
        const pile = baseY - h - shh * 0.2;
        for (let i = 2; i >= 0; i--) {
          const drop = (1 - easeOut(prog(o.t, 0.04 + (2 - i) * 0.07, 0.2 + (2 - i) * 0.07))) * 34;
          ctx.save();
          ctx.translate(cx + i * 3, pile - i * shh * 0.42 - drop);
          ctx.rotate(-0.06 + i * 0.04);
          shadow(ctx, 0, shh * 0.5 + 4, sw * 0.32, 8, 0.06);
          paperCard(ctx, -sw / 2, -shh / 2, sw, shh, { r: 10 });
          roundRect(ctx, -sw / 2 + 12, -shh * 0.22, sw * 0.34, shh * 0.2, 4);
          ctx.fillStyle = alpha(P.accent, 0.3 + i * 0.14);
          ctx.fill();
          roundRect(ctx, -sw / 2 + 12, shh * 0.06, sw * 0.48, shh * 0.14, 4);
          ctx.fillStyle = alpha(P.ink, 0.12);
          ctx.fill();
          ctx.restore();
        }
      }
      if (o.options.card) {
        const cw = Math.min(w * 1.12, b.w * 0.94);
        const chh = cw * 0.46;
        const cardY = baseY - h - chh * 0.72;
        ctx.save();
        ctx.translate(cx, cardY + chh / 2);
        ctx.rotate(-0.06 + 0.01 * Math.sin(o.t * Math.PI * 2));
        shadow(ctx, 0, chh / 2 + 4, cw * 0.4, 14, 0.08);
        paperCard(ctx, -cw / 2, -chh / 2, cw, chh, { r: 16 });
        ctx.font = `700 ${Math.min(26, cw * 0.13)}px ${FONT_SANS}`;
        ctx.fillStyle = alpha(P.ink, 0.82);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        wrapText(ctx, o.options.card, cw - 26, 2).forEach((line, li, all) => {
          ctx.fillText(line, 0, (li - (all.length - 1) / 2) * 28);
        });
        ctx.restore();
        shadow(ctx, cx, cardY + chh + 8, cw * 0.3, 10, 0.06);
      }
      shadow(ctx, cx, baseY + 6, w * 0.5, 16, 0.09);
      ctx.save();
      ctx.translate(cx, baseY - h / 2 + breathe);
      // ears
      [-1, 1].forEach((s) => {
        ctx.beginPath();
        ctx.moveTo(s * w * 0.3, -h * 0.34);
        ctx.lineTo(s * w * 0.42, -h * 0.62);
        ctx.lineTo(s * w * 0.1, -h * 0.46);
        ctx.closePath();
        ctx.fillStyle = mix(P.accent, 0.55);
        ctx.fill();
      });
      roundRect(ctx, -w / 2, -h / 2, w, h, h * 0.42);
      ctx.fillStyle = mix(P.accent, 0.55);
      ctx.fill();
      ctx.strokeStyle = alpha(P.ink, 0.12);
      ctx.lineWidth = 3;
      ctx.stroke();
      // face
      ctx.save();
      ctx.fillStyle = alpha(P.ink, 0.55);
      [-0.16, 0.16].forEach((f) => {
        ctx.beginPath();
        ctx.arc(w * f, -h * 0.06, Math.max(4, w * 0.022), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.4);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, h * 0.06, w * 0.09, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ctx.restore();
      ctx.restore();
      if (!o.options.card && !o.options.stack) {
        label(ctx, o.options.caption || 'even the cat checked this', cx, Math.min(b.y + b.h - 2, baseY + 34), {
          size: 21, color: alpha(P.ink, 0.45), weight: 600, spacing: 1,
        });
      }
    },
  },

  crowd: {
    role: 'label',
    about: 'the building at nine pm, all streaming at once',
    draw(ctx, b, o) {
      const n = 5;
      const gap = b.w * 0.03;
      const bw = (b.w * 0.86 - gap * (n - 1)) / n;
      const baseY = b.y + b.h * 0.86;
      for (let i = 0; i < n; i++) {
        const cx = b.x + b.w * 0.07 + bw / 2 + i * (bw + gap);
        const h = Math.min(b.h * 0.42, bw * 2.1) * (0.86 + 0.14 * Math.sin(i * 1.7));
        shadow(ctx, cx, baseY + 6, bw * 0.4, 10, 0.07);
        crate(ctx, cx, baseY, bw * 0.62, h, P.isoLeft);
        // a phone in hand
        roundRect(ctx, cx - bw * 0.1, baseY - h * 0.72, bw * 0.2, bw * 0.34, 3);
        ctx.fillStyle = alpha(P.accent, 0.55);
        ctx.fill();
        const ping = (o.frame / 22 + i * 0.4) % 3 < 1;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx + bw * 0.24, baseY - h * 0.78, 5, 0, Math.PI * 2);
        ctx.fillStyle = ping ? P.stop : alpha(P.ink, 0.2);
        ctx.fill();
        ctx.restore();
      }
      label(ctx, o.options.caption || 'everyone, at once', b.x + b.w / 2, b.y + 26, {
        size: 27, color: alpha(P.ink, 0.5), weight: 700, spacing: 2,
      });
    },
  },
};

export const SUBJECT_IDS = Object.keys(SUBJECTS);
export const SUBJECT_ROLES = ['demonstrate', 'compare', 'transform', 'label', 'react'];

/** What a world can draw, and what it calls the shot by default. */
export const SCENES = {
  ep_checklist: { subjects: ['checklist', 'robot'], kicker: 'replaced by' },
  ep_title: { subjects: ['loop-row'], kicker: 'the loop' },
  ep_steps: { subjects: ['steps-row'], kicker: 'automation' },
  ep_rules: { subjects: ['rule-cards', 'rule-machine'], kicker: 'rules' },
  ep_rules_broken: { subjects: ['rule-cards', 'rule-machine', 'garble'], kicker: 'one week later' },
  ep_pile: { subjects: ['pile', 'model', 'bins'], kicker: 'add a model' },
  ep_loop: { subjects: ['loop-row', 'model'], kicker: 'the loop' },
  ep_gate: { subjects: ['checkpoint', 'garble'], kicker: 'the check' },
  ep_outro: { subjects: ['signpost'], kicker: 'next time' },

  // 0101 - the cloud
  ep_cloud_title: { subjects: ['photo'], kicker: 'the cloud' },
  ep_cloud_photo: { subjects: ['photo'], kicker: 'safe in the cloud' },
  ep_cloud_racks: { subjects: ['racks'], kicker: 'a warehouse' },
  ep_cloud_heat: { subjects: ['heat', 'racks'], kicker: 'power in, heat out' },
  ep_cloud_copies: { subjects: ['copies'], kicker: 'copies' },
  ep_cloud_outro: { subjects: ['photo', 'racks'], kicker: 'next time' },

  // 0103 - free tools
  ep_free_title: { subjects: ['tags'], kicker: 'genuinely free?' },
  ep_free_tools: { subjects: ['tags'], kicker: 'four prices' },
  ep_free_scale: { subjects: ['scale'], kicker: 'who pays' },
  ep_free_outro: { subjects: ['scale'], kicker: 'next time' },

  // 0104 - wifi at nine
  ep_wifi_title: { subjects: ['router'], kicker: 'why nine?' },
  ep_wifi_router: { subjects: ['router'], kicker: 'the box' },
  ep_wifi_channels: { subjects: ['channels'], kicker: 'the band' },
  ep_wifi_crowd: { subjects: ['crowd'], kicker: 'nine pm' },
  ep_wifi_outro: { subjects: ['channels'], kicker: 'next time' },

  // 0106 - chatbot vs agent
  ep_ai_panels: { subjects: ['chat-panels'], kicker: 'chatbot or agent' },
  ep_ai_chatbot: { subjects: ['chat-bubble', 'route-card'], kicker: 'chatbot' },
  ep_ai_agent: { subjects: ['calendar', 'chat-bubble'], kicker: 'agent' },
  ep_ai_invite: { subjects: ['invite', 'calendar'], kicker: 'it can make things' },
  ep_ai_setup: { subjects: ['setup-pair'], kicker: 'not magic' },
  ep_ai_steps: { subjects: ['steps-row'], kicker: 'the steps' },
  ep_ai_mistake: { subjects: ['invite'], kicker: 'the catch' },
  ep_ai_permissions: { subjects: ['checkpoint'], kicker: 'permissions' },
  ep_ai_recap: { subjects: ['versus', 'cat-pillow'], kicker: 'the difference' },
  ep_ai_outro: { subjects: ['versus'], kicker: 'next time' },

  // 0107 - what happens when you type a URL
  ep_url_hook: { subjects: ['url-bar', 'page-stage'], kicker: 'one line' },
  ep_url_dns: { subjects: ['dns-directory', 'address-card'], kicker: 'find the address' },
  ep_url_address: { subjects: ['address-card', 'dns-directory'], kicker: 'the address' },
  ep_url_connect: { subjects: ['link-path'], kicker: 'connect' },
  ep_url_https: { subjects: ['https-lock', 'link-path'], kicker: 'https' },
  ep_url_request: { subjects: ['request-envelope', 'link-path'], kicker: 'request' },
  ep_url_response: { subjects: ['file-cards', 'request-envelope'], kicker: 'response' },
  ep_url_render: { subjects: ['page-stage', 'file-cards', 'cat-pillow'], kicker: 'render' },
  ep_url_broken: { subjects: ['page-stage', 'file-cards'], kicker: 'looks broken' },
  ep_url_recap: { subjects: ['steps-row'], kicker: 'the short version' },
  ep_url_outro: { subjects: ['steps-row'], kicker: 'next time' },
};

// ---------------------------------------------------------------------------
// painting a shot
// ---------------------------------------------------------------------------

/**
 * Draw one shot of an episode.
 *
 * The order is deliberate: the set first, then the layout (which needs to know
 * where her body and the caption will be), then the subjects that the plan put
 * in this shot, each inside the box the layout gave it.
 */
function paintScene(ctx, shot, frame, t) {
  const scene = SCENES[shot.world] || { subjects: [], kicker: '' };
  const captionTopY = captionTop(ctx, shot);
  const framing = framingFor(shot.placement, shot.code);

  // Where the bench sits is a consequence, not a constant. When she is in the
  // frame it has to clear her head; when she is not, the bench drops toward the
  // caption and the objects get the room that she was using. That single number
  // is what makes an insert feel like a close-up instead of a diagram in the
  // top half of the picture.
  const benchY = framing ? BENCH_Y : Math.min(1180, captionTopY - 150);
  const ground = benchY - 6;

  // the set, through the shot's camera
  const cam = cameraTransform(shot, t);
  ctx.save();
  ctx.translate(cam.anchorX, cam.anchorY);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.anchorX, -cam.anchorY);
  backdrop(ctx, { warm: shot.warm ?? 0.95, t });
  benchSlab(ctx, { y: benchY, depth: 1980 - benchY });
  kicker(ctx, shot.kicker || scene.kicker);
  ctx.restore();

  const layout = layoutShot(shot, { captionTop: captionTopY, framing, groundY: ground });
  shot.__layout = layout; // read back by the visual checker, never by the picture

  const subjects = (shot.subjects && shot.subjects.length
    ? shot.subjects
    : scene.subjects.map((id) => ({ id, role: SUBJECTS[id]?.role }))
  ).filter((s) => SUBJECTS[s.id]);

  // Where the plan put supporting subjects above the focal one, they are inputs
  // to it: draw the connection, or the frame is three unrelated objects.
  if (layout.focal && layout.support.length) {
    layout.support.forEach((box) => {
      if (box.bottom > layout.focal.y + 10) return;
      const from = [box.x + box.w / 2, box.bottom + 6];
      const to = [layout.focal.x + layout.focal.w / 2, layout.focal.y - 6];
      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.22);
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 10]);
      // the dashes travel from the input to the object, so the frame says
      // "this feeds that" instead of showing two things that happen to line up
      ctx.lineDashOffset = -t * 160;
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.quadraticCurveTo((from[0] + to[0]) / 2, to[1] - 40, to[0], to[1]);
      ctx.stroke();
      ctx.restore();
    });
  }

  let supportIndex = 0;
  subjects.forEach((s, subjectIndex) => {
    const def = SUBJECTS[s.id];
    if (!def) return;
    const box = s.role === 'focal' ? layout.focal : layout.support[supportIndex++];
    if (!box || !box.w || !box.h) return;
    // Every subject arrives: a short rise and fade at the top of the shot, one
    // beat apart per object. Without it a cut lands on a finished diagram and
    // the shot looks like a slide; with it the picture is still being built
    // when the sentence starts.
    const enter = easeOut(prog(t, 0.01 + subjectIndex * 0.04, 0.14 + subjectIndex * 0.04));
    ctx.save();
    ctx.translate(0, (1 - enter) * 26);
    if (enter < 1) ctx.globalAlpha = 0.55 + 0.45 * enter;
    def.draw(ctx, box, {
      shot,
      frame,
      t,
      role: def.role,
      ground,
      options: (shot.subjectOptions && shot.subjectOptions[s.id]) || {},
    });
    ctx.restore();
  });
}

/** Every episode world, as a painter the stage can call by id. */
export const EPISODE_PAINTERS = Object.fromEntries(
  Object.keys(SCENES).map((world) => [world, (ctx, shot, frame, t) => paintScene(ctx, shot, frame, t)])
);

/** The catalogue, for the plan report and the compiler's validation. */
export function subjectCatalogue() {
  return Object.fromEntries(
    Object.entries(SUBJECTS).map(([id, def]) => [id, { role: def.role, about: def.about }])
  );
}

export { SUBJECTS, CAMERAS };
