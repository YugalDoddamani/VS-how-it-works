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
          const baseY = c.y + crateW * 0.42;
          shadow(ctx, c.x, baseY + 10, crateW * 0.66, 12, 0.06);
          crate(ctx, c.x, baseY, crateW, crateW * 1.15, P.accent);
          label(ctx, String(i + 1), c.x - crateW * 0.18, baseY - crateW * 0.5, {
            size: crateW * 0.34, color: '#FFF7F1', weight: 700,
          });
          // the label sits beside the crate, on the free side, never on top of it
          label(ctx, labels[i] || item, c.x + crateW * 0.86, baseY - crateW * 0.36, {
            size: Math.max(26, Math.min(38, crateW * 0.34)), color: P.inkSoft, weight: 600, align: 'left',
          });
          if (i < n - 1) {
            arrow(ctx, [c.x + crateW * 0.9, baseY + 8], [centres[i + 1].x + crateW * 0.9, centres[i + 1].y - crateW * 0.62], {
              colour: alpha(P.ink, 0.26), width: 4, head: 12, progress: prog(o.t, 0.1 + i * 0.06, 0.3 + i * 0.06),
            });
          }
        });

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
        shadow(ctx, centres[i], baseY + 14, crateW * 0.7, 14, 0.07);
        crate(ctx, centres[i], baseY, crateW, crateW * 0.86, P.accent);
        label(ctx, String(i + 1), centres[i] - crateW * 0.2, baseY - crateW * 0.34, {
          size: Math.min(40, crateW * 0.36), color: '#FFF7F1', weight: 700,
        });
        chip(ctx, centres[i] - Math.min(60, crateW * 0.5), Math.max(b.y + 26, baseY - crateW * 1.34), labels[i] || item, {
          size: Math.min(24, crateW * 0.2),
        });
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
    about: 'the gate the loop passes through, open or closed',
    draw(ctx, b, o) {
      const failing = Boolean(o.options.failing);
      const baseY = b.y + b.h * 0.92;
      const railY = baseY - b.h * 0.16;
      const w = b.w;

      // rail
      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.2);
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x, railY);
      ctx.lineTo(b.x + w, railY - 6);
      ctx.stroke();
      ctx.strokeStyle = alpha(P.ink, 0.13);
      ctx.lineWidth = 3;
      for (let x = b.x + 20; x < b.x + w - 20; x += 46) {
        ctx.beginPath();
        ctx.moveTo(x, railY);
        ctx.lineTo(x + 4, railY + 26);
        ctx.stroke();
      }
      ctx.restore();

      // booth
      const bx = b.x + w * 0.62;
      const bw = Math.min(w * 0.3, 150);
      shadow(ctx, bx, baseY + 6, bw * 0.9, 20, 0.09);
      crate(ctx, bx, baseY, bw, b.h * 0.52, P.isoLeft);
      ctx.save();
      poly(
        ctx,
        [[bx - 6, baseY - b.h * 0.4], [bx + bw * 0.22, baseY - b.h * 0.46], [bx + bw * 0.22, baseY - b.h * 0.16], [bx - 6, baseY - b.h * 0.1]],
        alpha(failing ? P.stop : P.good, 0.5),
        null,
        0
      );
      ctx.restore();
      chip(ctx, bx - 52, baseY - b.h * 0.62, failing ? 'CLOSED' : 'CHECK', { accent: !failing, size: 21 });

      // the arm
      const angle = failing ? 0 : 1.15 * easeOut(prog(o.t, 0.2, 0.4));
      const armLen = Math.min(w * 0.3, 210);
      ctx.save();
      ctx.translate(bx - bw * 0.5, railY - b.h * 0.1);
      ctx.rotate(angle);
      roundRect(ctx, -armLen, -12, armLen, 24, 12);
      ctx.fillStyle = failing ? mix(P.stop, -0.02) : mix(P.accent, 0.04);
      ctx.fill();
      ctx.restore();

      // the parcel on the rail
      const run = easeOut(prog(o.t, 0.06, failing ? 0.4 : 0.7));
      const px = b.x + 40 + run * (failing ? w * 0.18 : w * 0.62);
      const py = railY - b.h * 0.2;
      parcelShape(ctx, px, py, Math.min(70, b.h * 0.22), {
        tone: failing ? P.accent : P.good,
        tickIn: failing ? 0 : prog(o.t, 0.6, 0.8),
      });

      if (failing) {
        const bad = prog(o.t, 0.4, 0.58);
        if (bad > 0) cross(ctx, px + 20, py - b.h * 0.24, 46, alpha(P.stop, bad), 8);
        ctx.save();
        ctx.font = `700 34px ${FONT_SANS}`;
        ctx.fillStyle = alpha(P.ink, 0.26);
        ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) {
          const f = (o.t * 1.6 + i * 0.33) % 1;
          ctx.globalAlpha = 0.5 * (1 - f);
          ctx.fillText('?', px - 22 + i * 32, py - 60 - f * 70);
        }
        ctx.restore();
      }
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
  backdrop(ctx, { warm: shot.warm ?? 0.95 });
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
      ctx.beginPath();
      ctx.moveTo(from[0], from[1]);
      ctx.quadraticCurveTo((from[0] + to[0]) / 2, to[1] - 40, to[0], to[1]);
      ctx.stroke();
      ctx.restore();
    });
  }

  let supportIndex = 0;
  subjects.forEach((s) => {
    const def = SUBJECTS[s.id];
    if (!def) return;
    const box = s.role === 'focal' ? layout.focal : layout.support[supportIndex++];
    if (!box || !box.w || !box.h) return;
    ctx.save();
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
