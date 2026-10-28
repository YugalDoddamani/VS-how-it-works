/**
 * chrome.js - everything that is not the world and not her: the badge, the
 * caption, the progress hairline, the optional safe-area guides.
 *
 * Two rules from the visual spec drive the whole file:
 *
 *   - The caption is the most important object on screen, so it gets the only
 *     drop shadow in the frame and nothing is ever drawn behind it.
 *   - Chrome is a guest in the frame. It appears when it helps someone watch and
 *     gets out of the way when it does not, which is why the badge and the
 *     progress line are now per-shot decisions rather than permanent furniture.
 *
 * The caption is also not one thing. A definition, a punchline, a list and a
 * closing line are read differently, so they are typeset differently: four
 * treatments, each with its own type size, card shape and safe height. The layout
 * engine asks `captionTop()` for the answer before it places anything, so the
 * two never negotiate after the fact.
 */

import { P, alpha, mix, FONT_SANS, FONT_SERIF } from './palette.js';
import { roundRect } from './iso.js';

const W = 1080;
const H = 1920;

const CARD = {
  marginX: 60,
  width: W - 120,
  bottom: 1780,
  radius: 30,
};

/** The four caption treatments, as data. */
export const TREATMENTS = {
  standard: {
    why: 'a full sentence of narration: two lines, generous, unhurried',
    size: 46,
    shrinkTo: 40,
    maxLines: 3,
    lineHeight: 1.32,
    pad: 40,
    radius: 30,
  },
  punchline: {
    why: 'the line is the joke: bigger type, one idea, nothing else on the card',
    size: 60,
    shrinkTo: 52,
    maxLines: 2,
    lineHeight: 1.2,
    pad: 34,
    radius: 26,
  },
  steps: {
    why: 'an enumerated action: each item on its own row, numbered',
    size: 38,
    shrinkTo: 34,
    maxLines: 4,
    lineHeight: 1.5,
    pad: 30,
    radius: 26,
  },
  takeaway: {
    why: 'the closing line: serif, warm, set like a note rather than a subtitle',
    size: 52,
    shrinkTo: 44,
    maxLines: 3,
    lineHeight: 1.26,
    pad: 38,
    radius: 30,
    kicker: 'REMEMBER',
  },
};

function treatmentFor(shot) {
  const id = shot.caption?.treatment;
  return TREATMENTS[id] ? id : 'standard';
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const normal = (word) => word.toLowerCase().replace(/[^a-z0-9'-]/g, '');

/** Rows for the `steps` treatment: explicit rows if given, else the sentence split. */
export function stepRows(shot) {
  const explicit = shot.caption?.steps;
  if (Array.isArray(explicit) && explicit.length) return explicit.map(String);
  return String(shot.caption?.text || shot.vo || '')
    .split(/(?<=\.)\s+/)
    .map((s) => s.replace(/\.$/, '').trim())
    .filter(Boolean);
}

/** Measure a caption: everything the layout engine and the renderer both need. */
export function measureCaption(ctx, shot) {
  const id = treatmentFor(shot);
  const t = TREATMENTS[id];
  const text = shot.caption?.text || shot.vo || '';
  if (!text) return { id, t, lines: [], size: t.size, lineHeight: t.size * t.lineHeight, cardH: 0, cardY: CARD.bottom };

  const kind = id === 'steps' ? 'steps' : 'prose';
  let size = t.size;
  let rows = [];

  ctx.save();
  ctx.font = `${kind === 'takeaway' ? 600 : 600} ${size}px ${kind === 'takeaway' ? FONT_SERIF : FONT_SANS}`;
  if (kind === 'steps') {
    rows = stepRows(shot);
    const width = CARD.width - t.pad * 2 - 74;
    while (size > t.shrinkTo && rows.some((r) => ctx.measureText(r).width > width)) {
      size -= 2;
      ctx.font = `600 ${size}px ${FONT_SANS}`;
    }
  } else {
    const maxWidth = CARD.width - t.pad * 2;
    rows = wrap(ctx, text, maxWidth);
    while (rows.length > t.maxLines && size > t.shrinkTo) {
      size -= 2;
      ctx.font = `600 ${size}px ${kind === 'takeaway' ? FONT_SERIF : FONT_SANS}`;
      rows = wrap(ctx, text, maxWidth);
    }
  }
  ctx.restore();

  const lineHeight = Math.round(size * t.lineHeight);
  const kickerH = t.kicker ? 40 : 0;
  const cardH = t.pad * 2 + kickerH + rows.length * lineHeight + (kind === 'steps' ? 8 : 0);
  return { id, t, kind, rows, size, lineHeight, kickerH, cardH, cardY: CARD.bottom - cardH };
}

/**
 * Where the caption card starts, for a given shot.
 *
 * Public because the character has to stop there and the layout engine has to
 * compose above it. If this number and the drawn card ever disagree, she gets
 * drawn through the card - which is exactly what used to happen.
 */
export function captionTop(ctx, shot) {
  const text = shot.caption?.text || shot.vo || '';
  if (!text) return CARD.bottom;
  return measureCaption(ctx, shot).cardY;
}

/** The caption's rectangle, for overlap checks. */
export function captionRegion(ctx, shot) {
  const m = measureCaption(ctx, shot);
  return { x: CARD.marginX, y: m.cardY, w: CARD.width, h: m.cardH };
}

// ---------------------------------------------------------------------------
// drawing
// ---------------------------------------------------------------------------

function underline(ctx, x, y, w, grow) {
  ctx.save();
  ctx.strokeStyle = alpha(P.accent, 0.85);
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + 12);
  ctx.lineTo(x + w * grow, y + 12);
  ctx.stroke();
  ctx.restore();
}

/** Draw one line of prose, word by word, tinting and underlining the hot words. */
function proseLine(ctx, ctxState) {
  const { line, x0, y, size, emphasis, grow } = ctxState;
  const words = line.split(' ');
  const widths = words.map((w) => ctx.measureText(`${w} `).width);
  const total = widths.reduce((a, b) => a + b, 0) - ctx.measureText(' ').width;
  let x = x0 + (CARD.width - 0 - x0 * 2 + CARD.marginX * 2 - total) / 2;
  // x0 is CARD.marginX; centre inside the card
  x = CARD.marginX + (CARD.width - total) / 2;

  words.forEach((word, i) => {
    const hot = emphasis.has(normal(word));
    ctx.fillStyle = hot ? P.accent : P.ink;
    ctx.fillText(word, x, y);
    if (hot) underline(ctx, x, y, ctx.measureText(word).width, grow);
    x += widths[i];
  });
}

export function drawCaption(ctx, shot, frame) {
  const text = shot.caption?.text || shot.vo || '';
  if (!text) return;
  const m = measureCaption(ctx, shot);
  const { t, id } = m;
  const grow = Math.min(1, (frame - shot.start + 1) / 6);

  // ---- card --------------------------------------------------------------
  const fill = id === 'takeaway' ? mix(P.accent, 0.94) : P.surface;
  ctx.save();
  ctx.shadowColor = alpha(P.ink, 0.14);
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, CARD.marginX, m.cardY, CARD.width, m.cardH, t.radius);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, CARD.marginX, m.cardY, CARD.width, m.cardH, t.radius);
  ctx.strokeStyle = alpha(id === 'punchline' ? P.accent : P.line, id === 'punchline' ? 0.5 : 0.9);
  ctx.lineWidth = 2;
  ctx.stroke();

  const insideX = CARD.marginX + t.pad;
  const emphasis = new Set((shot.caption?.emphasis || []).map(normal));

  // ---- the treatments ----------------------------------------------------
  if (id === 'steps') {
    const rows = m.rows;
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    rows.forEach((row, i) => {
      const y = m.cardY + t.pad + i * m.lineHeight + m.size * 0.8;
      // number
      ctx.beginPath();
      ctx.arc(insideX + 22, y - m.size * 0.28, 22, 0, Math.PI * 2);
      ctx.fillStyle = P.accent;
      ctx.fill();
      ctx.fillStyle = '#FFF8F3';
      ctx.font = `700 24px ${FONT_SANS}`;
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), insideX + 22, y - m.size * 0.28 + 8);
      // row text
      ctx.textAlign = 'left';
      ctx.font = `600 ${m.size}px ${FONT_SANS}`;
      ctx.fillStyle = P.ink;
      ctx.fillText(row, insideX + 66, y);
    });
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  let y = m.cardY + t.pad + m.kickerH + m.size * 0.9;

  if (t.kicker) {
    ctx.font = `700 22px ${FONT_SANS}`;
    ctx.fillStyle = alpha(P.accent, 0.9);
    ctx.textAlign = 'left';
    const chars = [...t.kicker];
    let kx = insideX;
    for (const ch of chars) {
      ctx.fillText(ch, kx, m.cardY + t.pad + 20);
      kx += ctx.measureText(ch).width + 3;
    }
  }

  ctx.font = `600 ${m.size}px ${id === 'takeaway' ? FONT_SERIF : FONT_SANS}`;
  ctx.textAlign = 'left';
  for (const line of m.rows) {
    proseLine(ctx, { line, x0: insideX, y, size: m.size, emphasis, grow });
    y += m.lineHeight;
  }
  ctx.restore();

  // a punchline gets one accent rule above it, so the card has a signature
  if (id === 'punchline') {
    ctx.save();
    ctx.fillStyle = alpha(P.accent, 0.9);
    roundRect(ctx, CARD.marginX + CARD.width / 2 - 26, m.cardY + 16, 52, 6, 3);
    ctx.fill();
    ctx.restore();
  }
}

/**
 * Series badge, top-left; id and length, top-right.
 *
 * Drawn only when the shot asks for it: an opening frame, a chapter break, the
 * closing takeaway. On a body shot it is furniture.
 */
export function drawBadge(ctx, reel, shot = null) {
  if (shot && shot.chrome && shot.chrome.badge === false) return;
  if (shot && !shot.chrome) return;

  ctx.save();
  ctx.fillStyle = P.accent;
  ctx.fillRect(60, 96, 26, 26);
  ctx.restore();

  ctx.save();
  ctx.font = `700 27px ${FONT_SANS}`;
  ctx.fillStyle = P.inkSoft;
  ctx.textAlign = 'left';
  const series = (reel.series || '').toUpperCase();
  let x = 104;
  for (const ch of series) {
    ctx.fillText(ch, x, 120);
    x += ctx.measureText(ch).width + 3.4;
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = alpha(P.ink, 0.45);
  ctx.fillText(`${reel.id.replace(/^'+/, '')} · ${reel.seconds.toFixed(0)}s`, W - 60, 120);
  ctx.restore();
}

/** A 4 px progress hairline. The only "UI" the video itself has. */
export function drawProgress(ctx, reel, frame, shot = null) {
  if (shot && shot.chrome && shot.chrome.progress === false) return;
  if (shot && !shot.chrome) return;
  const p = Math.max(0, Math.min(1, frame / reel.frames));
  ctx.save();
  ctx.fillStyle = alpha(P.line, 0.55);
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = alpha(P.accent, 0.9);
  ctx.fillRect(0, H - 6, W * p, 6);
  ctx.restore();
}

/** Optional overlays for review: caption band, safe margins, overlay thirds. */
export function drawGuides(ctx, { caption = true, safe = true, thirds = true, captionTopY = 1452 } = {}) {
  ctx.save();
  if (caption) {
    ctx.strokeStyle = alpha(P.link, 0.5);
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 2;
    ctx.strokeRect(48, captionTopY, W - 96, 1780 - captionTopY + 40);
  }
  if (safe) {
    ctx.strokeStyle = alpha(P.stop, 0.45);
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(60, 220, W - 120, H - 220 - 120);
  }
  if (thirds) {
    ctx.strokeStyle = alpha(P.ink, 0.14);
    ctx.setLineDash([]);
    [W / 3, (W * 2) / 3].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    });
    [H / 3, (H * 2) / 3].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    });
  }
  ctx.restore();
}
