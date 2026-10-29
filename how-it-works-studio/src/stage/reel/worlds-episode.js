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
import { cueAt } from './cues.js';
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
// 0107 helpers: one journey, drawn at different sizes
// ---------------------------------------------------------------------------

const URL_TEXT = 'nao.explains/cat';

/** Which cue the beat has reached. A shot without cues is a finished state. */
const stepOf = (o) => (o.cue ? o.cue.index : 0);

/**
 * How far a state that begins on cue `i` has arrived: 0 before it, easing to 1
 * during the first half of it, 1 after. This is the whole trick behind the
 * 0107 pictures - the state change happens *on the word*, not on the cut.
 */
const since = (o, i) => {
  const step = stepOf(o);
  if (step > i) return 1;
  if (step < i) return 0;
  return o.cue ? Math.min(1, o.cue.p / 0.5) : 1;
};

/** A browser window: dots, a URL pill, and room for a page underneath. */
function browserCard(ctx, x, y, w, h, { url = URL_TEXT, compact = false } = {}) {
  const barH = Math.min(compact ? 46 : 58, h * 0.15);
  paperCard(ctx, x, y, w, h, { r: 22 });
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, x, y, w, barH + 20, 22);
  ctx.clip();
  ctx.fillStyle = mix(P.surfaceSoft, 0.12);
  ctx.fillRect(x, y, w, barH);
  ctx.restore();

  [0, 1, 2].forEach((i) => {
    ctx.beginPath();
    ctx.arc(x + 22 + i * 16, y + barH / 2, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = alpha(P.ink, 0.16 - i * 0.03);
    ctx.fill();
  });
  const pillX = x + 82;
  const pillW = w - 100;
  roundRect(ctx, pillX, y + barH * 0.26, pillW, barH * 0.48, barH * 0.24);
  ctx.fillStyle = alpha(P.ink, 0.05);
  ctx.fill();
  label(ctx, url, pillX + 16, y + barH * 0.66, {
    size: Math.min(17, barH * 0.34), color: alpha(P.ink, 0.5), weight: 600, align: 'left',
  });
  return barH;
}

/**
 * The page itself: a hero tile, two lines, three thumbnails.
 *
 * `build` is how much of it the browser has assembled - the reveal is a clip
 * from the top, because that is the order a page paints in. `missing` names the
 * tile that never arrived, and it is drawn as the broken-image glyph the viewer
 * has seen a thousand times, which is the point of the caveat beat.
 */
function pageBlocks(ctx, x, y, w, h, { build = 1, missing = null } = {}) {
  const heroH = h * 0.44;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, Math.max(2, h * build));
  ctx.clip();

  // a nav strip: the first thing a browser paints, and the cue that this blank
  // rectangle is a web page rather than an empty window
  const navH = Math.max(14, h * 0.07);
  roundRect(ctx, x, y, w, navH, navH / 2);
  ctx.fillStyle = alpha(P.ink, 0.06);
  ctx.fill();
  [0.1, 0.24, 0.38].forEach((frac) => {
    roundRect(ctx, x + w * frac, y + navH * 0.28, w * 0.08, navH * 0.44, navH * 0.22);
    ctx.fillStyle = alpha(P.ink, 0.1);
    ctx.fill();
  });

  const top = y + navH + Math.max(10, h * 0.05);
  if (missing === 'hero') {
    roundRect(ctx, x, top, w, heroH, 14);
    ctx.fillStyle = alpha(P.stop, 0.05);
    ctx.fill();
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = alpha(P.stop, 0.45);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.setLineDash([]);
    const gx = x + w / 2;
    const gy = top + heroH / 2;
    const gs = Math.min(heroH * 0.44, 62);
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
  } else {
    roundRect(ctx, x, top, w, heroH, 14);
    ctx.fillStyle = mix(P.accent, 0.78);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, x, top, w, heroH, 14);
    ctx.clip();
    ctx.fillStyle = alpha(P.surface, 0.42);
    ctx.beginPath();
    ctx.arc(x + w * 0.78, top + heroH * 0.34, heroH * 0.15, 0, Math.PI * 2);
    ctx.fill();
    // a horizon line, so the tile reads as a picture and not a slab
    ctx.fillStyle = alpha(P.surface, 0.3);
    ctx.beginPath();
    ctx.moveTo(x, top + heroH);
    ctx.lineTo(x + w * 0.3, top + heroH * 0.52);
    ctx.lineTo(x + w * 0.52, top + heroH);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.34, top + heroH);
    ctx.lineTo(x + w * 0.62, top + heroH * 0.62);
    ctx.lineTo(x + w * 0.9, top + heroH);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // two lines of copy
  [0.74, 0.46].forEach((frac, i) => {
    roundRect(ctx, x, top + heroH + 18 + i * 16, w * frac, 9, 4.5);
    ctx.fillStyle = alpha(P.ink, 0.12);
    ctx.fill();
  });

  // three thumbnails
  const thY = top + heroH + 54;
  const thH = Math.max(24, Math.min(h - (heroH + 60 + navH), h * 0.24));
  const thW = (w - 24) / 3;
  for (let i = 0; i < 3; i++) {
    roundRect(ctx, x + i * (thW + 12), thY, thW, thH, 10);
    ctx.fillStyle = mix(i === 1 ? P.link : P.accent, 0.84);
    ctx.fill();
  }
  ctx.restore();
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

  // ---------------------------------------------------------------------------
  // 0107 - what happens when you type a URL?
  // ---------------------------------------------------------------------------
  //
  // These are not backdrops. Every one of them is a short demonstration that
  // advances on the beat's cues (src/stage/reel/cues.js): the picture changes
  // state on the word that names the thing, and it *keeps* that state across the
  // cuts inside a beat, so a three-shot beat is one continuous explanation seen
  // from three angles instead of the same loop starting over.
  //
  // Each painter also reports where its current element sits - `o.focus(x,y,r)` -
  // which is how the frame knows what to ring and what she is pointing at.

  'url-bar': {
    role: 'demonstrate',
    about: 'the address bar: a URL is typed, Enter is pressed, a page arrives',
    draw(ctx, b, o) {
      const text = String(o.options.text || URL_TEXT);
      const step = stepOf(o);
      const base = b.y + b.h;

      // ---- the pill --------------------------------------------------------
      const w = Math.min(b.w * 0.97, 800);
      const h = Math.min(Math.max(96, b.h * 0.2), 132);
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h * 0.06;

      shadow(ctx, x + w / 2, y + h + 12, w * 0.4, 16, 0.07);
      roundRect(ctx, x, y, w, h, h / 2);
      ctx.fillStyle = P.surface;
      ctx.fill();
      ctx.strokeStyle = alpha(P.ink, 0.16);
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // globe
      const gx = x + h * 0.62;
      const gy = y + h / 2;
      ctx.save();
      ctx.strokeStyle = alpha(P.link, 0.85);
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(gx, gy, h * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(gx, gy, h * 0.085, h * 0.2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(gx - h * 0.2, gy);
      ctx.lineTo(gx + h * 0.2, gy);
      ctx.stroke();
      ctx.restore();

      // the Enter key, measured first so the URL shrinks to fit beside it
      const kw = Math.min(148, w * 0.2);
      const kh = h * 0.6;
      const kx = x + w - kw - h * 0.26;
      const ky = y + (h - kh) / 2;
      const tx0 = gx + h * 0.3;
      const room = kx - tx0 - h * 0.24;
      const typedFrac = step >= 1 ? 1 : Math.max(0.06, o.cue ? o.cue.p : 1);
      const shown = text.slice(0, Math.max(1, Math.round(text.length * typedFrac)));

      let size = Math.min(38, h * 0.32);
      ctx.save();
      ctx.font = `600 ${size}px ${FONT_SANS}`;
      while (size > 15 && ctx.measureText(text).width > room) {
        size -= 2;
        ctx.font = `600 ${size}px ${FONT_SANS}`;
      }
      ctx.fillStyle = P.ink;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(shown, tx0, gy + size * 0.34);
      // caret: solid while typing, blinking once the words are in
      const caretOn = step < 1 || Math.floor(o.frame / 9) % 2 === 0;
      if (caretOn) {
        ctx.fillStyle = alpha(P.accent, 0.9);
        ctx.fillRect(tx0 + ctx.measureText(shown).width + 3, gy - size * 0.55, 3, size * 1.1);
      }
      ctx.restore();

      const pressed = since(o, 1);
      ctx.save();
      roundRect(ctx, kx, ky + pressed * 4, kw, kh, kh * 0.3);
      ctx.fillStyle = pressed > 0.35 ? mix(P.accent, 0.82) : P.surfaceSoft;
      ctx.fill();
      ctx.strokeStyle = alpha(P.ink, 0.14);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = `700 ${Math.min(23, kh * 0.4)}px ${FONT_SANS}`;
      ctx.fillStyle = pressed > 0.35 ? alpha(P.ink, 0.9) : P.inkSoft;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('ENTER', kx + kw / 2, ky + kh * 0.6 + pressed * 4);
      ctx.restore();

      // ---- what Enter buys: the page ---------------------------------------
      // The window is on screen from the first frame - an empty browser is what
      // the viewer is looking at while the URL is typed - and the page is poured
      // into it once Enter is pressed.
      const pageIn = since(o, 2);
      const winW = Math.min(b.w * 0.92, 690);
      const winY = y + h + Math.max(26, b.h * 0.08);
      const winH = Math.max(140, base - winY - 8);
      const winX = b.x + (b.w - winW) / 2;
      const barH = browserCard(ctx, winX, winY, winW, winH, { url: text, compact: true });

      if (pageIn > 0) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.75 * pageIn;
        pageBlocks(ctx, winX + winW * 0.06, winY + barH + winH * 0.06, winW * 0.88, winH * 0.78, {
          build: Math.max(0.04, pageIn),
        });
        ctx.restore();
      } else {
        // before the page, a progress rail inside the empty window
        const railY = winY + barH + winH * 0.12;
        roundRect(ctx, winX + winW * 0.08, railY, winW * 0.84, 8, 4);
        ctx.fillStyle = alpha(P.ink, 0.07);
        ctx.fill();
        const run = (o.frame % 44) / 44;
        roundRect(ctx, winX + winW * 0.08 + winW * 0.84 * run * 0.7, railY, winW * 0.2, 8, 4);
        ctx.fillStyle = alpha(P.accent, 0.55);
        ctx.fill();
      }

      // ---- the route the rest of the film walks ----------------------------
      const route = since(o, 3);
      if (route > 0) {
        const steps = ['FIND', 'CONNECT', 'REQUEST', 'RENDER'];
        const ry = base - 16;
        const rw = Math.min(b.w * 0.9, 620);
        const rx = b.x + (b.w - rw) / 2;
        ctx.save();
        ctx.globalAlpha = route;
        ctx.strokeStyle = alpha(P.accent, 0.35);
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 10]);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx + rw, ry);
        ctx.stroke();
        ctx.restore();
        steps.forEach((s, i) => {
          const sx = rx + (rw / (steps.length - 1)) * i;
          ctx.save();
          ctx.globalAlpha = route;
          ctx.beginPath();
          ctx.arc(sx, ry, 7, 0, Math.PI * 2);
          ctx.fillStyle = mix(P.accent, 0.4);
          ctx.fill();
          label(ctx, s, sx, ry - 18, { size: 17, color: alpha(P.ink, 0.45), weight: 700, spacing: 1.5 });
          ctx.restore();
        });
      }

      // ---- what she is talking about right now -----------------------------
      if (step <= 0) o.focus(tx0 + room * 0.5, gy, Math.min(96, room * 0.5));
      else if (step === 1) o.focus(kx + kw / 2, ky + kh / 2, 62);
      else o.focus(winX + winW / 2, winY + winH * 0.46, Math.min(132, winW * 0.22));
    },
  },

  'page-stage': {
    role: 'transform',
    about: 'the browser window: empty, then built out of the files that arrived',
    draw(ctx, b, o) {
      const step = stepOf(o);
      const broken = Boolean(o.options.broken);
      const w = Math.min(b.w * 0.97, 700);
      const h = b.h * 0.96;
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h - h;
      const barH = Math.min(58, h * 0.14);
      const open = easeOut(Math.min(1, (o.frame - (o.shot?.start || 0)) / 8));

      ctx.save();
      ctx.globalAlpha = 0.25 + 0.75 * open;
      browserCard(ctx, x, y, w, h, { url: o.options.url || URL_TEXT });

      const cx0 = x + w * 0.06;
      const cw = w * 0.88;
      const cy0 = y + barH + h * 0.05;
      const chh = h - barH - h * 0.12;

      // On the render beat the page assembles as the sentence walks through the
      // files; on the failure beat it arrives complete with one tile missing.
      const build = broken ? 1 : Math.max(0.22, Math.min(1, (step + (o.cue ? o.cue.p : 1)) / 3.2));
      const missing = broken ? 'hero' : null;
      pageBlocks(ctx, cx0, cy0, cw, chh, { build, missing });

      if (broken) {
        // the server answered fine (tick on the title bar) and one file did not
        // (a cross in the tile that never arrived). The words for both are the
        // cue tags, drawn by the frame - a painter that writes its own labels
        // ends up saying the same thing twice.
        const ok = since(o, 1);
        const failed = since(o, 2);
        if (ok > 0) {
          ctx.save();
          ctx.globalAlpha = ok;
          tick(ctx, x + w - 46, y + barH * 0.5, 20, alpha(P.good, 1), 4.5);
          ctx.restore();
        }
        if (failed > 0) {
          ctx.save();
          ctx.globalAlpha = failed;
          cross(ctx, x + w * 0.5 + Math.min(96, w * 0.18), cy0 + chh * 0.3, 28, alpha(P.stop, 0.9), 5);
          ctx.restore();
        }
      }
      ctx.restore();

      if (!broken) {
        if (step <= 0) o.focus(x + w * 0.12, cy0 + chh * 0.06, 70);
        else if (step === 1) o.focus(x + w * 0.5, cy0 + chh * 0.28, Math.min(170, cw * 0.34));
        else o.focus(x + w * 0.5, cy0 + chh * 0.5, Math.min(210, cw * 0.42));
      } else if (step <= 0) {
        o.focus(x + w * 0.5, cy0 + chh * 0.28, Math.min(170, cw * 0.36));
      } else if (step === 1) {
        o.focus(x + w - 46, y + barH * 0.5, 62);
      } else {
        o.focus(x + w * 0.5, cy0 + chh * 0.28, Math.min(170, cw * 0.36));
      }
    },
  },

  'dns-directory': {
    role: 'demonstrate',
    about: 'DNS: a name goes in, the matching row is found, an address comes out',
    draw(ctx, b, o) {
      const step = stepOf(o);
      const rows = (o.options.rows || [
        ['nao.explains', '203.0.113.7'],
        ['wikipedia.org', '198.51.100.4'],
        ['a-shop.example', '192.0.2.61'],
        ['news.example', '198.51.100.23'],
      ]).slice(0, 4);
      const hit = Math.max(0, Math.min(rows.length - 1, Number(o.options.hit ?? 0)));
      const w = Math.min(b.w * 0.99, 820);
      const rowH = Math.min(74, (b.h - 130) / rows.length);
      const headH = Math.max(56, rowH * 0.82);
      const h = headH + rowH * rows.length + 22;
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h - h;

      shadow(ctx, x + w / 2, y + h + 10, w * 0.42, 16, 0.08);
      paperCard(ctx, x, y, w, h, { r: 22 });

      // ---- the query: what the browser is holding --------------------------
      const qY = y + headH * 0.5;
      label(ctx, 'DNS', x + 26, qY + 9, { size: 24, color: alpha(P.accent, 0.95), weight: 700, align: 'left', spacing: 3 });
      const typed = rows[hit][0];
      const showTyped = step >= 1 ? typed : typed.slice(0, Math.max(1, Math.round(typed.length * (o.cue ? o.cue.p : 1))));
      ctx.save();
      ctx.font = `600 22px ${FONT_SANS}`;
      ctx.fillStyle = alpha(P.ink, 0.72);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${showTyped}${step >= 1 ? '' : '|'}`, x + 92, qY + 8);
      ctx.restore();

      // the magnifier: parked in the header while it reads, then it settles on
      // the row it found. It never sits over a value.
      const found = since(o, 1);
      const mx = x + w - 40 + found * 6;
      const my = y + headH * 0.5 - 6;
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = alpha(found > 0.5 ? P.good : P.ink, 0.5);
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(mx, my, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx + 8, my + 8);
      ctx.lineTo(mx + 17, my + 17);
      ctx.stroke();
      ctx.restore();

      // ---- the rows --------------------------------------------------------
      rows.forEach(([name, ip], i) => {
        const ry = y + headH + rowH * (i + 0.5);
        const isHit = i === hit;
        const lit = isHit ? since(o, 1) : 0;
        if (lit > 0) {
          ctx.save();
          ctx.globalAlpha = 0.85 * lit;
          roundRect(ctx, x + 12, ry - rowH * 0.44, w - 24, rowH * 0.88, 12);
          ctx.fillStyle = mix(P.accent, 0.88);
          ctx.fill();
          ctx.restore();
        }
        ctx.save();
        ctx.font = `600 ${Math.min(25, rowH * 0.36)}px ${FONT_SANS}`;
        ctx.fillStyle = lit > 0.4 ? P.ink : alpha(P.ink, 0.7);
        ctx.textAlign = 'left';
        ctx.fillText(name, x + 32, ry + 8);
        ctx.font = `500 ${Math.min(23, rowH * 0.33)}px ${FONT_SANS}`;
        ctx.fillStyle = alpha(P.link, 0.95);
        ctx.textAlign = 'right';
        ctx.fillText(ip, x + w - 30, ry + 8);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = alpha(P.ink, 0.07);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 24, ry + rowH * 0.45);
        ctx.lineTo(x + w - 24, ry + rowH * 0.45);
        ctx.stroke();
        ctx.restore();
      });

      // ---- the answer leaves the book --------------------------------------
      const out = since(o, 2);
      if (out > 0) {
        const ip = rows[hit][1];
        const bx = x + w / 2;
        const by = y - 54 - (1 - out) * 22;
        ctx.save();
        ctx.globalAlpha = out;
        const cw = chip(ctx, bx - 96, by, ip, { accent: true, size: 22 });
        void cw;
        // and a line from the row to the badge: the value came from *there*
        ctx.strokeStyle = alpha(P.accent, 0.4);
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 9]);
        ctx.beginPath();
        ctx.moveTo(x + w - 90, y + headH + rowH * (hit + 0.5));
        ctx.lineTo(bx + 6, by + 30);
        ctx.stroke();
        ctx.restore();
        o.focus(bx, by + 18, 96);
      } else if (step >= 1) {
        o.focus(x + w * 0.5, y + headH + rowH * (hit + 0.5), Math.min(120, w * 0.16));
      } else {
        o.focus(x + 92 + 90, y + headH * 0.5, 90);
      }
    },
  },

  'address-card': {
    role: 'compare',
    about: 'a contact: a name, the number it resolves to, and the call that follows',
    draw(ctx, b, o) {
      const step = stepOf(o);
      const name = o.options.name || 'nao.explains';
      const ip = o.options.ip || '203.0.113.7';
      const w = Math.min(b.w * 0.95, 640);
      const h = b.h * 0.9;
      const x = b.x + (b.w - w) / 2;
      const y = b.y + b.h - h;
      const pop = easeOut(Math.min(1, (o.frame - (o.shot?.start || 0)) / 9));

      ctx.save();
      ctx.globalAlpha = 0.3 + 0.7 * pop;
      ctx.translate(0, (1 - pop) * 16);
      shadow(ctx, x + w / 2, y + h + 10, w * 0.42, 16, 0.08);
      paperCard(ctx, x, y, w, h, { r: 20 });

      // header: this is an address book, not a business card
      label(ctx, 'CONTACTS', x + 26, y + 38, { size: 18, color: alpha(P.ink, 0.4), weight: 700, align: 'left', spacing: 3 });
      const found = since(o, 1);
      if (found > 0) {
        ctx.save();
        ctx.globalAlpha = found;
        chip(ctx, x + w - 132, y + 20, 'found', { size: 17, ink: mix(P.good, -0.25), border: alpha(P.good, 0.4) });
        ctx.restore();
      }

      // the search line
      const qy = y + h * 0.2;
      roundRect(ctx, x + 22, qy - 26, w - 44, 48, 24);
      ctx.fillStyle = alpha(P.ink, 0.045);
      ctx.fill();
      const typed = name.slice(0, Math.max(2, Math.round(name.length * (step <= 0 ? (o.cue ? o.cue.p : 1) : 1))));
      label(ctx, typed, x + 44, qy + 7, { size: 22, color: alpha(P.ink, 0.7), weight: 600, align: 'left' });

      // the contact itself: avatar, name, number
      const avatarX = x + 22 + Math.min(58, w * 0.11);
      const avatarY = y + h * 0.44;
      const ar = Math.min(34, w * 0.06);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + ar, avatarY, ar, 0, Math.PI * 2);
      ctx.fillStyle = mix(P.accent, 0.8);
      ctx.fill();
      ctx.fillStyle = alpha(P.surface, 0.95);
      ctx.beginPath();
      ctx.arc(avatarX + ar, avatarY - ar * 0.24, ar * 0.34, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(avatarX + ar, avatarY + ar * 0.52, ar * 0.56, Math.PI, 0);
      ctx.fill();
      ctx.restore();

      label(ctx, name, avatarX + ar * 2 + 20, avatarY - 4, { size: Math.min(30, w * 0.062), color: alpha(P.ink, 0.9), weight: 700, align: 'left' });

      const num = since(o, 1);
      ctx.save();
      ctx.globalAlpha = Math.max(0.14, num);
      label(ctx, ip, avatarX + ar * 2 + 20, avatarY + 34, {
        size: Math.min(27, w * 0.055), color: alpha(P.link, 0.95), weight: 600, align: 'left',
      });
      ctx.restore();

      // the call: the whole point of looking a contact up
      const callIn = since(o, 2);
      const btnW = Math.min(190, w * 0.42);
      const btnH = 62;
      const bx = x + 22;
      const by = y + h - btnH - 26;
      ctx.save();
      roundRect(ctx, bx, by, btnW, btnH, btnH / 2);
      ctx.fillStyle = callIn > 0.3 ? mix(P.good, 0.55) : mix(P.ink, 0.9);
      ctx.fill();
      ctx.fillStyle = alpha(P.surface, 0.98);
      ctx.font = `700 22px ${FONT_SANS}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CALL', bx + btnW * 0.46, by + btnH / 2 + 1);
      // handset glyph
      ctx.save();
      ctx.translate(bx + btnW - 40, by + btnH / 2);
      ctx.rotate(-0.5);
      roundRect(ctx, -12, -6, 24, 12, 6);
      ctx.fill();
      ctx.restore();
      ctx.restore();

      // ring waves once the call goes out
      if (callIn > 0) {
        ctx.save();
        for (let i = 0; i < 3; i++) {
          const p = ((o.frame / 26 + i / 3) % 1);
          ctx.globalAlpha = callIn * (1 - p) * 0.55;
          ctx.strokeStyle = alpha(P.good, 0.9);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(bx + btnW - 40, by + btnH / 2, 22 + p * 34, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // "before calling" is the analogy's hinge: the number is what gets dialled
      if (callIn > 0.5) {
        ctx.save();
        ctx.globalAlpha = (callIn - 0.5) * 2;
        tick(ctx, x + w - 54, y + h - 52, 26, alpha(P.good, 0.95), 5);
        ctx.restore();
      }
      ctx.restore();

      if (step <= 0) o.focus(x + w * 0.5, qy, 96);
      else if (step === 1) o.focus(avatarX + ar * 2 + 90, avatarY + 10, 110);
      else o.focus(bx + btnW * 0.5, by + btnH * 0.5, 78);
    },
  },

  'link-path': {
    role: 'demonstrate',
    about: 'two machines and the cable between them: opening it, then sealing it',
    draw(ctx, b, o) {
      const step = stepOf(o);
      const pad = Math.min(58, b.w * 0.08);
      const nodeW = Math.min(226, b.w * 0.25);
      const nodeH = Math.min(340, b.h * 0.62);
      const base = b.y + b.h;
      const leftX = b.x + pad + nodeW / 2;
      const rightX = b.x + b.w - pad - nodeW / 2;
      const nodeBase = base - 26;
      const wireY = nodeBase - nodeH * 0.5;

      // the two ends
      shadow(ctx, leftX, nodeBase + 8, nodeW * 0.8, 12, 0.07);
      crate(ctx, leftX, nodeBase, nodeW, nodeH, P.accent);
      label(ctx, o.options.near || 'you', leftX, nodeBase - nodeH - 34, {
        size: 20, color: alpha(P.ink, 0.5), weight: 700, spacing: 2,
      });
      const serverLit = since(o, 2);
      shadow(ctx, rightX, nodeBase + 8, nodeW * 0.8, 12, 0.07);
      crate(ctx, rightX, nodeBase, nodeW, nodeH, mix(P.link, 0.1 + 0.3 * serverLit));
      label(ctx, o.options.far || 'the server', rightX, nodeBase - nodeH - 34, {
        size: 20, color: alpha(P.ink, 0.5), weight: 700, spacing: 2,
      });

      // the cable: it is drawn, then joined in the middle
      const drawn = since(o, 0);
      const joined = since(o, 1);
      const a = { x: leftX + nodeW * 0.42, y: wireY };
      const c = { x: rightX - nodeW * 0.42, y: wireY };
      const midX = (a.x + c.x) / 2;
      const leftEnd = { x: a.x + (midX - a.x) * Math.min(1, drawn * 1.15), y: wireY };
      const rightEnd = { x: c.x - (c.x - midX) * Math.min(1, Math.max(0, drawn - 0.35) * 1.7), y: wireY };

      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.3);
      ctx.lineWidth = 9;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo((a.x + leftEnd.x) / 2, wireY + 26, leftEnd.x, leftEnd.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.quadraticCurveTo((c.x + rightEnd.x) / 2, wireY + 26, rightEnd.x, rightEnd.y);
      ctx.stroke();
      ctx.restore();

      // the plugs: two halves that meet only when the connection is agreed
      const plugGap = 26 * (1 - joined);
      [-1, 1].forEach((side) => {
        const px = midX + side * (10 + plugGap);
        ctx.save();
        roundRect(ctx, side < 0 ? px - 26 : px, wireY - 15, 26, 30, 6);
        ctx.fillStyle = joined > 0.6 ? mix(P.good, 0.5) : mix(P.ink, 0.12);
        ctx.fill();
        ctx.strokeStyle = alpha(P.ink, 0.3);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      });

      if (joined > 0) {
        // a pulse crossing the join, so the wire is obviously live
        ctx.save();
        const p = (o.frame % 46) / 46;
        const px = a.x + (c.x - a.x) * p;
        ctx.globalAlpha = joined * 0.9;
        ctx.beginPath();
        ctx.arc(px, wireY, 8, 0, Math.PI * 2);
        ctx.fillStyle = mix(P.accent, 0.2);
        ctx.fill();
        ctx.restore();
        if (joined > 0.5) {
          chip(ctx, midX - 52, wireY - 74, 'TCP', { accent: joined > 0.8, size: 18 });
        }
      }

      // the server answers: a light comes on at the far end
      if (serverLit > 0) {
        ctx.save();
        ctx.globalAlpha = serverLit;
        ctx.beginPath();
        ctx.arc(rightX, nodeBase - nodeH - 58, 9, 0, Math.PI * 2);
        ctx.fillStyle = mix(P.good, 0.2);
        ctx.fill();
        ctx.restore();
      }

      if (step <= 0) o.focus(leftEnd.x, wireY, 72);
      else if (step === 1) o.focus(midX, wireY, 82);
      else o.focus(rightX, nodeBase - nodeH * 0.5, 96);
    },
  },

  'https-lock': {
    role: 'demonstrate',
    about: 'the lock chamber: plain text goes in, sealed packets come out, a snooper gets nothing',
    draw(ctx, b, o) {
      const step = stepOf(o);
      const base = b.y + b.h;
      const pad = Math.min(48, b.w * 0.07);
      const nodeW = Math.min(188, b.w * 0.2);
      const nodeH = Math.min(290, b.h * 0.53);
      const leftX = b.x + pad + nodeW / 2;
      const rightX = b.x + b.w - pad - nodeW / 2;
      const nodeBase = base - 34;
      const wireY = nodeBase - nodeH * 0.55;

      shadow(ctx, leftX, nodeBase + 8, nodeW * 0.8, 12, 0.07);
      crate(ctx, leftX, nodeBase, nodeW, nodeH, P.accent);
      label(ctx, 'you', leftX, nodeBase - nodeH - 30, { size: 19, color: alpha(P.ink, 0.5), weight: 700, spacing: 2 });
      shadow(ctx, rightX, nodeBase + 8, nodeW * 0.8, 12, 0.07);
      crate(ctx, rightX, nodeBase, nodeW, nodeH, P.link);
      label(ctx, 'the server', rightX, nodeBase - nodeH - 30, { size: 19, color: alpha(P.ink, 0.5), weight: 700, spacing: 2 });

      // the wire
      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.28);
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(leftX + nodeW * 0.42, wireY);
      ctx.lineTo(rightX - nodeW * 0.42, wireY);
      ctx.stroke();
      ctx.restore();

      // ---- the chamber: where the padlock lives ----------------------------
      const chamberW = Math.min(240, (rightX - leftX) * 0.44);
      const chamberH = Math.min(290, b.h * 0.53);
      const cx = (leftX + rightX) / 2;
      const closed = since(o, 1);
      const lockY = wireY - chamberH * 0.5 - 6;

      ctx.save();
      roundRect(ctx, cx - chamberW / 2, lockY, chamberW, chamberH, 20);
      ctx.fillStyle = alpha(P.surface, 0.85);
      ctx.fill();
      ctx.strokeStyle = alpha(P.good, 0.35 + 0.45 * closed);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();

      // the padlock, drawn at the chamber's scale
      const s = Math.min(chamberW * 0.52, chamberH * 0.5);
      const lx = cx;
      const ly = lockY + chamberH * 0.54;
      ctx.save();
      roundRect(ctx, lx - s * 0.44, ly - s * 0.06, s * 0.88, s * 0.62, s * 0.12);
      ctx.fillStyle = mix(P.good, 0.55);
      ctx.fill();
      ctx.strokeStyle = mix(P.good, -0.2);
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.strokeStyle = mix(P.good, -0.15);
      ctx.lineWidth = Math.max(8, s * 0.14);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(lx, ly - s * 0.1 - (1 - closed) * s * 0.16, s * (0.3 - 0.05 * (1 - closed)), Math.PI, 0);
      ctx.stroke();
      ctx.restore();

      // ---- the traffic -----------------------------------------------------
      // before the lock: readable little notes. after it: sealed blocks.
      const inside = since(o, 1);
      const n = 4;
      for (let i = 0; i < n; i++) {
        const p = ((o.frame / 62 + i / n) % 1);
        const px = leftX + nodeW * 0.42 + (rightX - leftX - nodeW * 0.84) * p;
        const through = px > cx - chamberW * 0.2 && px < cx + chamberW * 0.2;
        const sealed = p > 0.5 && inside > 0.2;
        ctx.save();
        ctx.globalAlpha = through ? 0.25 : 0.95;
        if (sealed) {
          roundRect(ctx, px - 11, wireY - 11, 22, 22, 4);
          ctx.fillStyle = mix(P.good, 0.15);
          ctx.fill();
          // a tiny bar across it: nothing to read
          ctx.fillStyle = alpha(P.surface, 0.7);
          ctx.fillRect(px - 6, wireY - 2, 12, 3);
        } else {
          roundRect(ctx, px - 13, wireY - 10, 26, 20, 4);
          ctx.fillStyle = alpha(P.surface, 0.95);
          ctx.fill();
          ctx.strokeStyle = alpha(P.ink, 0.2);
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = alpha(P.ink, 0.35);
          ctx.fillRect(px - 8, wireY - 5, 16, 2);
          ctx.fillRect(px - 8, wireY, 10, 2);
        }
        ctx.restore();
      }

      // ---- the snooper ----------------------------------------------------
      const sneak = since(o, 2);
      if (sneak > 0) {
        const sx = cx;
        const sy = wireY + Math.max(74, chamberH * 0.62);
        ctx.save();
        ctx.globalAlpha = sneak;
        // a masked figure reaching up from below the line
        ctx.strokeStyle = alpha(P.ink, 0.35);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(sx, sy + 60);
        ctx.lineTo(sx, sy + 16);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx, sy - 4, 15, 0, Math.PI * 2);
        ctx.fillStyle = alpha(P.ink, 0.16);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = alpha(P.ink, 0.3);
        ctx.fillRect(sx - 15, sy - 10, 30, 7);
        // and what he gets: a scramble, crossed out
        const gx = sx + Math.max(64, chamberW * 0.62);
        chip(ctx, gx, sy - 8, '????', { fill: mix(P.stop, 0.08), ink: mix(P.stop, -0.15), size: 18 });
        cross(ctx, gx + 20, sy + 44, 26, alpha(P.stop, 0.85 * sneak), 5);
        ctx.restore();
      }

      if (step <= 0) o.focus(leftX + nodeW * 1.4, wireY, 70);
      else if (step === 1) o.focus(cx, ly - s * 0.1, Math.max(84, chamberW * 0.72));
      else o.focus(cx + Math.max(64, chamberW * 0.62) + 20, wireY + Math.max(74, chamberH * 0.62) + 4, 70);
    },
  },

  'request-envelope': {
    role: 'transform',
    about: 'one request: an envelope addressed to the server, then the server opens it',
    draw(ctx, b, o) {
      const step = stepOf(o);
      const base = b.y + b.h;
      const pad = Math.min(46, b.w * 0.06);
      const nodeW = Math.min(184, b.w * 0.2);
      const nodeH = Math.min(284, b.h * 0.52);
      const leftX = b.x + pad + nodeW / 2;
      const rightX = b.x + b.w - pad - nodeW / 2;
      const nodeBase = base - 40;
      const wireY = nodeBase - nodeH * 0.55;

      shadow(ctx, leftX, nodeBase + 8, nodeW * 0.8, 12, 0.07);
      crate(ctx, leftX, nodeBase, nodeW, nodeH, P.accent);
      label(ctx, o.options.near || 'you', leftX, nodeBase - nodeH - 28, { size: 18, color: alpha(P.ink, 0.5), weight: 700, spacing: 2 });

      const arrived = since(o, 2);
      shadow(ctx, rightX, nodeBase + 8, nodeW * 0.8, 12, 0.07);
      crate(ctx, rightX, nodeBase, nodeW, nodeH, mix(P.link, 0.1 + 0.25 * arrived));
      label(ctx, o.options.far || 'the server', rightX, nodeBase - nodeH - 28, { size: 18, color: alpha(P.ink, 0.5), weight: 700, spacing: 2 });

      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.26);
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(leftX + nodeW * 0.42, wireY);
      ctx.lineTo(rightX - nodeW * 0.42, wireY);
      ctx.stroke();
      ctx.restore();

      // the envelope travels the wire on the sentence
      const travel = since(o, 1);
      const aX = leftX + nodeW * 0.5;
      const bX = rightX - nodeW * 0.5;
      const ex = aX + (bX - aX) * travel;
      const ew = Math.min(280, (bX - aX) * 0.5);
      const eh = ew * 0.64;
      const ey = wireY - eh * 0.5 - 8;

      ctx.save();
      ctx.translate(ex, ey + eh / 2);
      ctx.rotate(-0.02 + 0.02 * Math.sin(o.frame / 26));
      ctx.translate(-ex, -(ey + eh / 2));
      shadow(ctx, ex, ey + eh + 8, ew * 0.4, 12, 0.09);
      roundRect(ctx, ex - ew / 2, ey, ew, eh, 12);
      ctx.fillStyle = mix(P.surfaceSoft, 0.14);
      ctx.fill();
      ctx.strokeStyle = alpha(P.ink, 0.2);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ex - ew / 2 + 2, ey + 2);
      ctx.lineTo(ex, ey + eh * 0.56);
      ctx.lineTo(ex + ew / 2 - 2, ey + 2);
      ctx.stroke();
      ctx.restore();

      // the message, written on it: this is the sentence, in a file
      label(ctx, o.options.label || 'GET /cat', ex, ey + eh * 0.84, {
        size: Math.min(26, ew * 0.14), color: alpha(P.ink, 0.85), weight: 700,
      });
      label(ctx, 'REQUEST', aX + (bX - aX) * 0.5, wireY - eh * 0.86, {
        size: 20, color: alpha(P.accent, 0.9), weight: 700, spacing: 3,
      });

      // the server door: it opens and the page comes out
      if (arrived > 0) {
        ctx.save();
        ctx.globalAlpha = arrived;
        const dw = nodeW * 0.9;
        const dh = nodeH * 0.62;
        const dx = rightX - dw / 2;
        const dy = nodeBase - dh;
        roundRect(ctx, dx, dy, dw, dh, 8);
        ctx.fillStyle = alpha(P.ink, 0.55);
        ctx.fill();
        // a page glyph peeking out
        const pw = dw * 0.52;
        const ph = dh * 0.66;
        paperCard(ctx, rightX - pw / 2, dy - ph * 0.35 * arrived, pw, ph, { r: 6 });
        ctx.fillStyle = alpha(P.accent, 0.5);
        ctx.fillRect(rightX - pw * 0.36, dy + ph * 0.18 - ph * 0.35 * arrived, pw * 0.72, ph * 0.2);
        ctx.restore();
        tick(ctx, rightX + nodeW * 0.6, nodeBase - nodeH - 46, 24, alpha(P.good, arrived), 5);
      }

      if (step <= 0) o.focus(ex, ey + eh * 0.5, 76);
      else if (step === 1) o.focus(ex, ey + eh * 0.5, 84);
      else o.focus(rightX, nodeBase - nodeH * 0.6, 88);
    },
  },

  'file-cards': {
    role: 'demonstrate',
    about: 'the reply: HTML, CSS, JavaScript, images and links arrive one at a time',
    draw(ctx, b, o) {
      const step = stepOf(o);
      const palette = [P.accent, P.link, P.good, P.stop, P.inkSoft];
      const defaults = [
        ['HTML', 'the words'],
        ['CSS', 'the look'],
        ['JS', 'the behaviour'],
        ['IMG', 'the pictures'],
        ['LINKS', 'more files'],
      ];
      const files = (o.options.files || defaults).slice(0, 5).map(([tag, sub], i) => [
        tag, sub, palette[i % palette.length],
      ]);

      const base = b.y + b.h;
      const srvW = Math.min(150, b.w * 0.2);
      const srvH = Math.min(190, b.h * 0.4);
      const srvX = b.x + srvW * 0.72;
      const trayX = b.x + b.w * 0.36;
      const trayW = b.x + b.w - trayX;

      // ---- the server, with its door open on the reply --------------------
      shadow(ctx, srvX, base - 10, srvW * 0.8, 12, 0.07);
      crate(ctx, srvX, base - 16, srvW, srvH, P.link);
      label(ctx, 'the server', srvX, base - srvH - 46, { size: 19, color: alpha(P.ink, 0.45), weight: 700, spacing: 2 });
      const open = since(o, 0);
      if (open > 0) {
        ctx.save();
        ctx.globalAlpha = open;
        const dw = srvW * 0.72;
        const dh = srvH * 0.62;
        roundRect(ctx, srvX - dw / 2, base - 18 - dh, dw, dh, 8);
        ctx.fillStyle = alpha(P.ink, 0.45);
        ctx.fill();
        ctx.restore();
      }

      // ---- the tray: five slots, named before they are filled -------------
      // A list of five words is a list; showing the five slots while the voice
      // names them is how the viewer sees that the page is a bundle.
      const rowH = Math.min(78, (b.h - 24) / files.length - 10);
      const rowGap = 10;
      const cardW = Math.min(trayW - 8, 460);
      const topY = b.y + Math.max(6, (b.h - (rowH + rowGap) * files.length + rowGap) * 0.35);

      files.forEach(([tag, sub, tone], i) => {
        const y = topY + i * (rowH + rowGap);
        const x = trayX;
        const p = since(o, i + 1);

        // the empty slot
        ctx.save();
        roundRect(ctx, x, y, cardW, rowH, 12);
        ctx.fillStyle = p > 0 ? alpha(P.surface, 0.9) : alpha(P.ink, 0.03);
        ctx.fill();
        ctx.strokeStyle = p > 0 ? alpha(tone, 0.5) : alpha(P.ink, 0.12);
        ctx.lineWidth = 2;
        if (p <= 0) ctx.setLineDash([7, 7]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // the card itself, arriving from the door
        if (p > 0) {
          const drop = (1 - p) * -26;
          const slide = (1 - p) * -34;
          ctx.save();
          ctx.globalAlpha = 0.25 + 0.75 * p;
          ctx.translate(slide, drop);
          shadow(ctx, x + cardW / 2, y + rowH + 5, cardW * 0.34, 10, 0.06);
          paperCard(ctx, x, y, cardW, rowH, { r: 12 });
          roundRect(ctx, x, y, cardW * 0.085, rowH, 12);
          ctx.fillStyle = mix(tone, 0.72);
          ctx.fill();
          label(ctx, tag, x + cardW * 0.15, y + rowH * 0.45, {
            size: Math.min(24, rowH * 0.36), color: alpha(P.ink, 0.9), weight: 700, align: 'left', spacing: 1,
          });
          label(ctx, sub, x + cardW * 0.15, y + rowH * 0.8, {
            size: Math.min(18, rowH * 0.26), color: alpha(P.ink, 0.45), weight: 600, align: 'left',
          });
          ctx.restore();

          if (p < 1) {
            ctx.save();
            ctx.globalAlpha = p;
            ctx.strokeStyle = alpha(tone, 0.4);
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 8]);
            ctx.beginPath();
            ctx.moveTo(srvX + srvW * 0.4, base - 20 - srvH * 0.45);
            ctx.quadraticCurveTo(srvX + srvW * 1.2, y + rowH / 2, x, y + rowH / 2);
            ctx.stroke();
            ctx.restore();
          }
        } else {
          // the slot says what is coming, in grey
          label(ctx, tag, x + cardW * 0.15, y + rowH * 0.45, {
            size: Math.min(22, rowH * 0.34), color: alpha(P.ink, 0.22), weight: 700, align: 'left', spacing: 1,
          });
        }
      });

      const shown = Math.min(files.length, step);
      if (shown > 0) {
        const y = topY + (shown - 1) * (rowH + rowGap);
        o.focus(trayX + cardW / 2, y + rowH / 2, Math.min(96, rowH * 0.68));
      } else {
        o.focus(srvX, base - 16 - srvH * 0.5, 80);
      }
    },
  },

  'route-steps': {
    role: 'demonstrate',
    about: 'the whole journey as five stations, lit in the order the recap says them',
    draw(ctx, b, o) {
      const step = stepOf(o);
      const items = (o.options.items || ['FIND', 'CONNECT', 'REQUEST', 'RECEIVE', 'RENDER']).slice(0, 5);
      const n = items.length;
      const base = b.y + b.h;
      const pad = Math.min(56, b.w * 0.09);
      const usable = b.w - pad * 2;
      const gap = usable / (n - 1);
      const nodeBase = base - Math.max(70, b.h * 0.22);
      const nodeW = Math.min(96, gap * 0.62);
      const nodeH = Math.min(104, b.h * 0.2);

      // The stations light in the order the sentence says them. The beat may
      // have fewer cues than stations (the sign-off names the route in three
      // words), so the count is normalised rather than assumed equal.
      const count = o.cue ? Math.max(1, o.cue.count) : n;
      const covered = ((step + (o.cue ? o.cue.p : 1)) / count) * n;
      const lit = (i) => Math.max(0, Math.min(1, covered - i));

      // the route
      const drawn = Math.max(0.02, Math.min(1, covered / n));
      ctx.save();
      ctx.strokeStyle = alpha(P.ink, 0.16);
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x + pad, nodeBase);
      ctx.lineTo(b.x + pad + usable, nodeBase);
      ctx.stroke();
      ctx.strokeStyle = alpha(P.accent, 0.65);
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(b.x + pad, nodeBase);
      ctx.lineTo(b.x + pad + usable * drawn, nodeBase);
      ctx.stroke();
      ctx.restore();

      items.forEach((item, i) => {
        const x = b.x + pad + gap * i;
        const on = lit(i);
        shadow(ctx, x, nodeBase + 8, nodeW * 0.7, 10, 0.06);
        crate(ctx, x, nodeBase, nodeW, nodeH, on > 0.2 ? P.accent : P.isoLeft);
        label(ctx, String(i + 1), x - nodeW * 0.2, nodeBase - nodeH * 0.5, {
          size: nodeW * 0.3, color: alpha(P.surface, 0.95), weight: 700,
        });
        label(ctx, item, x, nodeBase - nodeH - 20, {
          size: Math.min(19, gap * 0.34), color: on > 0.2 ? alpha(P.accent, 0.95) : alpha(P.ink, 0.4),
          weight: 700, spacing: 1.5,
        });
      });

      // the parcel: it is handed station to station as the recap is spoken
      const t = Math.min(1, covered / n);
      const px = b.x + pad + usable * t;
      const py = nodeBase - nodeH * 0.5 - 46;
      if (step >= 0) {
        ctx.save();
        roundRect(ctx, px - 16, py - 16, 32, 32, 8);
        ctx.fillStyle = mix(P.accent, 0.2);
        ctx.fill();
        ctx.strokeStyle = alpha(P.accent, 0.6);
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      o.focus(b.x + pad + gap * Math.min(n - 1, Math.floor(Math.min(n - 1, covered))), nodeBase - nodeH * 0.5, Math.min(96, gap * 0.5));
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
  // one hero object per beat: the 0107 pictures are demonstrations, and a
  // demonstration with a second prop beside it is a diagram
  ep_url_hook: { subjects: ['url-bar'], kicker: 'one line' },
  ep_url_dns: { subjects: ['dns-directory'], kicker: 'find the address' },
  ep_url_address: { subjects: ['address-card'], kicker: 'the address' },
  ep_url_connect: { subjects: ['link-path'], kicker: 'connect' },
  ep_url_https: { subjects: ['https-lock'], kicker: 'https' },
  ep_url_request: { subjects: ['request-envelope'], kicker: 'request' },
  ep_url_response: { subjects: ['file-cards'], kicker: 'response' },
  ep_url_render: { subjects: ['page-stage'], kicker: 'render' },
  ep_url_broken: { subjects: ['page-stage'], kicker: 'looks broken' },
  ep_url_recap: { subjects: ['route-steps'], kicker: 'the short version' },
  ep_url_outro: { subjects: ['route-steps'], kicker: 'next time' },
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
  // top half of the picture - and because the bench is also the surface the
  // subjects stand on, it has to be decided before either is drawn, or every
  // prop in a cropped shot hovers a hundred pixels above its own table.
  // A close-up of her leaves no room above her head for objects, so the bench
  // stays where the set puts it; an insert or a wide shot gets the bench dropped
  // to just under its object region, so nothing floats.
  const hasObjectRegion = !framing || framing.top - SAFE.headerBottom > 260;
  const benchY = hasObjectRegion
    ? Math.min(BENCH_Y, framing ? framing.top - 26 : Math.min(1180, captionTopY - 150))
    : BENCH_Y;
  const ground = benchY - 6;

  // The paper is the world and takes the camera; the bench and the kicker do
  // not. They are the *stage*: if they drifted with the lens, a cropped shot
  // would draw its bench higher than the objects standing on it, and every prop
  // in the film would float above the bench by a different amount.
  const cam = cameraTransform(shot, t);
  ctx.save();
  ctx.translate(cam.anchorX, cam.anchorY);
  ctx.scale(cam.scale, cam.scale);
  ctx.translate(-cam.anchorX, -cam.anchorY);
  backdrop(ctx, { warm: shot.warm ?? 0.95, t });
  ctx.restore();
  benchSlab(ctx, { y: benchY, depth: 1980 - benchY });
  kicker(ctx, shot.kicker || scene.kicker);

  const layout = layoutShot(shot, { captionTop: captionTopY, framing, groundY: ground });
  shot.__layout = layout; // read back by the visual checker, never by the picture

  // ---- the sentence the shot is inside -----------------------------------
  //
  // A shot knows which words of the beat it covers, and the picture up to that
  // word. `beatT` is progress through the *beat*, not through the shot: that is
  // what stops a three-shot beat from drawing the same demonstration three
  // times from the top. `cue` is the state the narration has reached, and the
  // painter draws that state - so a cut is a change of angle on one continuous
  // demonstration instead of a new loop.
  const beatInfo = shot.cueBeats || { start: shot.start, frames: shot.frames };
  const beatT = Math.max(0, Math.min(1, (frame - beatInfo.start) / Math.max(1, beatInfo.frames)));
  const cue = cueAt(shot.cues, frame, beatInfo.start);

  // Painters report where the thing they are currently demonstrating sits, so
  // the frame can ring it and she can point at it. The first report wins: the
  // focal subject runs first and it is the one the sentence is about.
  let focus = null;
  const reportFocus = (x, y, r) => {
    if (!focus) focus = { x, y, r: Math.max(46, r || 90) };
  };

  // An empty list is a decision - a close-up of her has no props - while a
  // missing list means "whatever the scene draws by default". Conflating the two
  // is how a reaction shot silently gets a prop box it can never fill.
  const subjects = (Array.isArray(shot.subjects)
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

  // A close-up of her is not an excuse to leave the bench empty: the beat's own
  // object stays on screen above her head, so the explanation never stops for a
  // face. The band is measured off her framing, so the two cannot collide.
  if (!subjects.length && shot.composition === 'character-reaction' && framing && framing.top - SAFE.headerBottom > 260) {
    const banner = {
      x: SAFE.marginX + 12,
      y: SAFE.headerBottom + 14,
      w: W - (SAFE.marginX + 12) * 2,
      h: Math.max(150, Math.min(300, framing.top - SAFE.headerBottom - 56)),
    };
    const ids = (scene.subjects.length ? scene.subjects : [shot.focalSubject]).filter((id) => SUBJECTS[id]);
    ids.slice(0, 1).forEach((id) => {
      const def = SUBJECTS[id];
      if (!def) return;
      ctx.save();
      ctx.globalAlpha = 0.92;
      def.draw(ctx, banner, {
        shot,
        frame,
        t,
        beatT,
        cue,
        role: def.role,
        ground: banner.y + banner.h,
        options: (shot.subjectOptions && shot.subjectOptions[id]) || {},
        focus: reportFocus,
      });
      ctx.restore();
    });
  }

  let supportIndex = 0;
  subjects.forEach((s, subjectIndex) => {
    const def = SUBJECTS[s.id];
    if (!def) return;
    const box = s.role === 'focal' ? layout.focal : layout.support[supportIndex++];
    if (!box || !box.w || !box.h) return;
    // The subject fades up once, at the top of the beat - never per shot. A
    // prop that re-arrives on every cut is the tell that a beat is really three
    // unrelated pictures.
    const entry = shot.start - beatInfo.start;
    const arrived = easeOut(prog(frame - beatInfo.start, entry, entry + 12));
    ctx.save();
    ctx.translate(0, (1 - arrived) * 14);
    if (arrived < 1) ctx.globalAlpha = 0.55 + 0.45 * arrived;
    def.draw(ctx, box, {
      shot,
      frame,
      t,
      beatT,
      cue,
      role: def.role,
      ground,
      options: (shot.subjectOptions && shot.subjectOptions[s.id]) || {},
      focus: reportFocus,
    });
    ctx.restore();
  });

  // Where the sentence has reached, ringed, with the words the prop stands for.
  shot.__focus = focus && cue ? { ...focus, tag: cue.tag || '' } : null;
  shot.__cue = cue || null;
  if (focus && cue) drawFocus(ctx, focus, cue, frame);
}

/**
 * The ring around whatever the sentence is talking about, and the two or three
 * words that name it.
 *
 * Without it the props are scenery: the viewer has to work out which of the
 * things on the bench the voice means. The ring answers that in one glance, and
 * it moves when the sentence moves, so the picture is seen to be following the
 * explanation rather than running beside it.
 */
function drawFocus(ctx, focus, cue, frame) {
  const { x, y } = focus;
  // keep room above the ring for its note, and never let the ring climb into
  // the header strip
  const r = Math.max(40, Math.min(focus.r, y - (SAFE.headerBottom + 64)));
  const pulse = 0.5 + 0.5 * Math.sin((frame / 30) * Math.PI * 1.4);

  ctx.save();
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 1.5);
  glow.addColorStop(0, alpha(P.accent, 0.1 + 0.04 * pulse));
  glow.addColorStop(1, alpha(P.accent, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = alpha(P.accent, 0.55 + 0.2 * pulse);
  ctx.lineWidth = 3.5;
  ctx.setLineDash([13, 11]);
  ctx.lineDashOffset = -(frame * 1.6) % 24;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // four corner ticks: the ring reads as a lens, not as a bubble
  ctx.save();
  ctx.strokeStyle = alpha(P.accent, 0.8);
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * (Math.PI / 2);
    const r0 = r * 1.06;
    const r1 = r * 1.2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
    ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();

  if (!cue.tag) return;
  // the name of the thing, lettered above the ring like a note on the paper -
  // no pill, because a filled chip over a drawing reads as UI, and this is an
  // explanation, not a dashboard
  ctx.save();
  const size = 21;
  const text = String(cue.tag).toUpperCase();
  ctx.font = `700 ${size}px ${FONT_SANS}`;
  ctx.textBaseline = 'alphabetic';
  const tw = ctx.measureText(text).width + 34;
  // above the ring, but never in the header strip: a note that overlaps the top
  // edge of its object still reads, a note that lands in the middle of it does not
  const ty = Math.max(SAFE.headerBottom + 26, y - r - 30);
  const tx = Math.max(SAFE.marginX + 8, Math.min(W - SAFE.marginX - tw, x - tw / 2));
  label(ctx, text, tx + tw / 2, ty, { size, color: alpha(P.accent, 0.95), weight: 700, spacing: 2.5 });
  ctx.strokeStyle = alpha(P.accent, 0.45);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(tx + 10, ty + 9);
  ctx.lineTo(tx + tw - 10, ty + 9);
  ctx.stroke();
  ctx.restore();
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
