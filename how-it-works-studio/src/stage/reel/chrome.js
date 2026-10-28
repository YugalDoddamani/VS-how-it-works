/**
 * chrome.js - everything that is not the world and not her: the badge, the
 * caption card, the progress hairline, the optional safe-area guides.
 *
 * The caption is the most important object on screen (docs/04), so it gets the
 * only drop shadow in the frame and nothing is ever drawn behind it.
 */

import { P, alpha, FONT_SANS } from './palette.js';
import { roundRect } from './iso.js';

const W = 1080;
const H = 1920;

const CAP = {
  marginX: 60,
  width: W - 120,
  bottom: 1780,
  pad: 40,
  radius: 30,
  fontSize: 46,
  lineHeight: 62,
  maxWidth: 860,
};

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function normal(word) {
  return word.toLowerCase().replace(/[^a-z0-9'-]/g, '');
}

/**
 * Where the caption card starts, for a given shot.
 *
 * The number is public because the figure has to stop there. Her drawing runs to
 * her feet, the feet are off the bottom of the frame, and the card sits on top -
 * so without this the legs reappear underneath it and she looks like she is
 * standing behind a floating plank.
 */
export function captionTop(ctx, shot) {
  const text = shot.caption?.text || shot.vo || '';
  if (!text) return CAP.bottom;
  ctx.save();
  let size = CAP.fontSize;
  ctx.font = `600 ${size}px ${FONT_SANS}`;
  let lines = wrap(ctx, text, CAP.maxWidth);
  if (lines.length > 2) {
    size = 40;
    ctx.font = `600 ${size}px ${FONT_SANS}`;
    lines = wrap(ctx, text, CAP.maxWidth);
  }
  ctx.restore();
  const lineHeight = size * 1.32;
  const cardH = CAP.pad * 2 + lines.length * lineHeight - (lineHeight - size) * 0.2;
  return CAP.bottom - cardH;
}

/**
 * Draw the caption card for a shot. Emphasis words are tinted and underlined;
 * a caption is on screen for the whole shot, because the shot *is* the line.
 */
export function drawCaption(ctx, shot, frame) {
  const text = shot.caption?.text || shot.vo || '';
  if (!text) return;

  let size = CAP.fontSize;
  ctx.save();
  ctx.font = `600 ${size}px ${FONT_SANS}`;
  let lines = wrap(ctx, text, CAP.maxWidth);
  if (lines.length > 2) {
    size = 40;
    ctx.font = `600 ${size}px ${FONT_SANS}`;
    lines = wrap(ctx, text, CAP.maxWidth);
  }
  ctx.restore();

  const lineHeight = size * 1.32;
  const cardH = CAP.pad * 2 + lines.length * lineHeight - (lineHeight - size) * 0.2;
  const cardY = CAP.bottom - cardH;

  // card
  ctx.save();
  ctx.shadowColor = alpha(P.ink, 0.14);
  ctx.shadowBlur = 42;
  ctx.shadowOffsetY = 12;
  roundRect(ctx, CAP.marginX, cardY, CAP.width, cardH, CAP.radius);
  ctx.fillStyle = P.surface;
  ctx.fill();
  ctx.restore();
  roundRect(ctx, CAP.marginX, cardY, CAP.width, cardH, CAP.radius);
  ctx.strokeStyle = alpha(P.line, 0.9);
  ctx.lineWidth = 2;
  ctx.stroke();

  // text
  const emphasis = new Set((shot.caption?.emphasis || []).map(normal));
  ctx.save();
  ctx.font = `600 ${size}px ${FONT_SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  let y = cardY + CAP.pad + size * 0.92;
  for (const line of lines) {
    const words = line.split(' ');
    const widths = words.map((w) => ctx.measureText(`${w} `).width);
    const total = widths.reduce((a, b) => a + b, 0) - ctx.measureText(' ').width;
    let x = CAP.marginX + (CAP.width - total) / 2;

    words.forEach((word, i) => {
      const hot = emphasis.has(normal(word));
      ctx.fillStyle = hot ? P.accent : P.ink;
      ctx.fillText(word, x, y);
      const w = ctx.measureText(word).width;
      if (hot) {
        // the growing underline from docs/13: it grows over the first 6 frames
        const grow = Math.min(1, (frame - shot.start + 1) / 6);
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
      x += widths[i];
    });
    y += lineHeight;
  }
  ctx.restore();
}

/** Series badge, top-left. Reel id, top-right. */
export function drawBadge(ctx, reel) {
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
  ctx.fillText(`${reel.id} · ${reel.seconds.toFixed(0)}s`, W - 60, 120);
  ctx.restore();
}

/** A 4 px progress hairline. The only "UI" the video itself has. */
export function drawProgress(ctx, reel, frame) {
  const p = Math.max(0, Math.min(1, frame / reel.frames));
  ctx.save();
  ctx.fillStyle = alpha(P.line, 0.55);
  ctx.fillRect(0, H - 6, W, 6);
  ctx.fillStyle = alpha(P.accent, 0.9);
  ctx.fillRect(0, H - 6, W * p, 6);
  ctx.restore();
}

/** Optional overlays for review: caption band, safe margins, overlay thirds. */
export function drawGuides(ctx, { caption = true, safe = true, thirds = true } = {}) {
  ctx.save();
  if (caption) {
    ctx.strokeStyle = alpha(P.link, 0.5);
    ctx.setLineDash([12, 10]);
    ctx.lineWidth = 2;
    ctx.strokeRect(48, 1452, W - 96, 348);
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
