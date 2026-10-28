/**
 * composition.js - where things are allowed to be.
 *
 * Every previous version of this stage placed objects first and measured the
 * caption afterwards, which is why the only thing keeping them apart was a
 * number somebody once tuned by eye. This module inverts that: it reserves the
 * chrome (header strip, caption card, platform UI) and the character's footprint
 * first, then hands a shot the rectangle that is actually free.
 *
 * It also owns the camera. A camera is a decision with a name - "object detail"
 * is not "zoom 12 %", it is "crop to the object, push toward it, keep her out of
 * the way" - so the presets are data: crop, focal point, how much of the free
 * region the subject may take, where supporting subjects go, and what the preset
 * is for.
 *
 * Pure functions only. No canvas state is read except measuring text, which is
 * passed in as a `captionTop` number by the caller.
 */

const W = 1080;
const H = 1920;

/** The parts of the frame that are spoken for before anything is composed. */
export const SAFE = {
  marginX: 72,          // nothing important closer to the edge than this
  headerBottom: 352,    // series badge + kicker strip
  captionBottom: 1780,  // the card's baseline, as chrome.js draws it
  platformTop: 120,     // where a phone's own UI sits over the video
  platformBottom: 260,
  gutter: 24,           // the minimum breathing room between two objects
};

/**
 * The five cameras.
 *
 * `crop` never goes below 1: the world is drawn for 1080x1920 and a crop under
 * 1 would show the canvas edge. `subject` is the largest share of the free
 * region the focal subject may take - a limit, not a size, so a small subject
 * stays small. `focal` is where the subject's centre sits inside the free
 * region. `characterFocal` means the camera is on her, and the world becomes the
 * background for that shot.
 */
export const CAMERAS = {
  'wide-establish': {
    label: 'wide establish',
    why: 'show the whole arrangement before any part of it is explained',
    crop: 1.0,
    push: 0.012,
    focal: [0.5, 0.44],
    subject: { w: 0.98, h: 0.92 },
    support: 'row',
    character: 'corner',
  },
  'object-detail': {
    label: 'object detail',
    why: 'one object, large, because the sentence is about that object',
    crop: 1.13,
    push: 0.02,
    focal: [0.5, 0.46],
    subject: { w: 0.84, h: 1.0 },
    support: 'beside',
    character: 'corner',
  },
  'character-reaction': {
    label: 'character reaction',
    why: 'her face is the new information; the arrangement is already understood',
    crop: 1.16,
    push: 0.02,
    focal: [0.5, 0.5],
    subject: { w: 0.0, h: 0.0 },
    support: 'none',
    character: 'lead',
    characterFocal: true,
  },
  'overhead-process': {
    label: 'overhead process',
    why: 'a sequence, read left to right, with the moving part visible',
    crop: 1.05,
    push: 0.01,
    focal: [0.5, 0.42],
    subject: { w: 1.0, h: 0.9 },
    support: 'row',
    character: 'corner',
  },
  comparison: {
    label: 'comparison',
    why: 'two things held at once, because the point is the difference',
    crop: 1.04,
    push: 0.014,
    focal: [0.34, 0.46],
    subject: { w: 0.72, h: 1.0 },
    support: 'beside',
    character: 'corner',
  },
};

export const COMPOSITION_IDS = Object.keys(CAMERAS);

/** Which shot codes and placements a composition implies. */
export const FRAME_FOR_COMPOSITION = {
  // A composition also decides whether she is in the frame at all. An object
  // detail with her watching is not an object detail: the object is the whole
  // point, so `react` means she is off for that shot and on for the comparison.
  'wide-establish': { code: 'MCU', placements: { lead: 'center', present: 'corner-bl', react: 'off', absent: 'off' } },
  'object-detail': { code: 'INSERT', placements: { lead: 'corner-bl', present: 'corner-bl', react: 'off', absent: 'off' } },
  'character-reaction': { code: 'CU', placements: { lead: 'center', present: 'center', react: 'center', absent: 'off' } },
  'overhead-process': { code: 'INSERT', placements: { lead: 'corner-br', present: 'corner-br', react: 'off', absent: 'off' } },
  comparison: { code: 'INSERT', placements: { lead: 'corner-br', present: 'corner-br', react: 'corner-br', absent: 'off' } },
};

/** Camera transform for a frame: crop and drift, anchored on the focal point. */
export function cameraTransform(shot, t) {
  const preset = CAMERAS[shot.composition] || CAMERAS['object-detail'];
  const scale = preset.crop * (1 + preset.push * Math.max(0, Math.min(1, t)));
  const [fx, fy] = preset.focal;
  return {
    scale,
    anchorX: fx * W,
    anchorY: SAFE.headerBottom + fy * (SAFE.captionBottom - SAFE.headerBottom),
  };
}

// ---------------------------------------------------------------------------
// rectangles
// ---------------------------------------------------------------------------

const rect = (x, y, w, h) => ({ x, y, w, h, right: x + w, bottom: y + h });

function overlap(a, b, gutter = 0) {
  if (!a || !b) return 0;
  const dx = Math.min(a.right, b.right + gutter) - Math.max(a.x, b.x - gutter);
  const dy = Math.min(a.bottom, b.bottom + gutter) - Math.max(a.y, b.y - gutter);
  if (dx <= 0 || dy <= 0) return 0;
  return dx * dy;
}

function clampRect(r, bounds) {
  const w = Math.min(r.w, bounds.w);
  const h = Math.min(r.h, bounds.h);
  return rect(
    Math.min(Math.max(r.x, bounds.x), bounds.right - w),
    Math.min(Math.max(r.y, bounds.y), bounds.bottom - h),
    w,
    h
  );
}

/** The character's footprint, whether or not her sprites are loaded. */
export function figureFootprint(shot, framing) {
  if (!framing) return null;
  // framing is { head, top, cx, scale }; her canvas is 900x1500 drawn at a head
  // width of 212, so the footprint follows from the head width alone
  const w = framing.head * (900 / 212);
  const h = framing.head * (1500 / 212);
  return rect(framing.cx - w / 2, framing.top, w, h);
}

/**
 * The free region for a shot.
 *
 * The full band between the header and the caption, minus the part of her that
 * pokes into it. She stands at the bottom, so in practice the free region is the
 * band above her head - which is exactly where the old painters were putting
 * things by hand.
 */
export function freeRegion({ captionTop, figure }) {
  const top = SAFE.headerBottom;
  const bottom = Math.max(top + 120, captionTop - SAFE.gutter);
  const x0 = SAFE.marginX + 12;
  const x1 = W - SAFE.marginX - 12;
  let y1 = bottom;

  if (figure) {
    const instrudes = figure.y < bottom && figure.right > x0 && figure.x < x1;
    if (instrudes) y1 = Math.max(top + 200, figure.y - SAFE.gutter);
  }
  return rect(x0, top, x1 - x0, y1 - top);
}

// ---------------------------------------------------------------------------
// the layout
// ---------------------------------------------------------------------------

/**
 * Compose one shot.
 *
 * @param {object} shot       compiled shot (composition, characterRole, subjects)
 * @param {object} opts
 * @param {number} opts.captionTop  where the caption card starts on this frame
 * @param {object} [opts.framing]   the character's framing numbers, if she is in
 * @returns {{preset:object, usable:object, focal:object|null, support:object[],
 *            figure:object|null, captionTop:number, warnings:string[]}}
 */
export function layoutShot(shot, { captionTop, framing = null, groundY = 1004 } = {}) {
  const preset = CAMERAS[shot.composition] || CAMERAS['object-detail'];
  const figure = figureFootprint(shot, framing);
  const usable = freeRegion({ captionTop: captionTop ?? SAFE.captionBottom - 260, figure });
  const warnings = [];

  // Everything stands on the bench, so every box is measured up from it. A box
  // floating in the middle of the free region reads as a diagram; a box that
  // touches the bench reads as an object, and that is the whole visual language.
  const ground = Math.min(groundY, usable.bottom);
  const headroom = ground - usable.y - SAFE.gutter;

  // ---- focal -------------------------------------------------------------
  // Supporting subjects have to live somewhere. If the plan asks for any and the
  // camera stacks them beside the focal subject, the focal subject gives up the
  // width for them - otherwise the two are drawn on top of each other and the
  // "supporting" object is a smudge behind the important one.
  const companions = Math.max(0, (shot.subjects || []).filter((s) => s.role !== 'focal').length);
  const beside = (preset.support === 'beside' || preset.support === 'column') && companions > 0;
  const reserveW = beside ? Math.min(usable.w * 0.34, 300) + SAFE.gutter : 0;
  // A row of supporting subjects above the focal subject is space the focal
  // subject does not get. Reserving it up front is the difference between a
  // band of props sitting above the object and props drawn on top of it.
  const inRow = preset.support === 'row' && companions > 0;
  const rowH = inRow ? Math.max(130, Math.min(headroom * 0.3, 300)) : 0;
  const reserveH = inRow ? rowH + SAFE.gutter : 0;

  let focal = null;
  if (!preset.characterFocal) {
    const w = Math.max(220, Math.min(usable.w * preset.subject.w - reserveW, usable.w - reserveW));
    const h = Math.max(180, Math.min((headroom - reserveH) * preset.subject.h, headroom - reserveH));
    const cx = usable.x + usable.w * preset.focal[0];
    const cy = ground - h + Math.min(40, h * 0.08) * -1 + h / 2;
    focal = clampRect(rect(cx - w / 2, cy - h / 2, w, h), { ...usable, bottom: ground });

    // The strip beside the focal subject belongs to the supporting subjects.
    // Without this the focal box is centred and the props are laid over its
    // right edge, which is the overlap the reviewer keeps spotting.
    if (beside && focal.right > usable.right - reserveW) {
      focal = rect(usable.right - reserveW - focal.w, focal.y, focal.w, focal.h);
    }

    if (figure && overlap(focal, figure) > 0) {
      const shift = focal.right - figure.x + SAFE.gutter;
      const mirrored = clampRect(rect(focal.x - shift * 2, focal.y, focal.w, focal.h), { ...usable, bottom: ground });
      if (overlap(mirrored, figure) === 0) {
        focal = mirrored;
        warnings.push('focal shifted off the character');
      } else {
        warnings.push('focal subject overlaps the character');
      }
    }
  }

  // ---- supporting --------------------------------------------------------
  const support = [];
  const n = companions;
  if (n && preset.support !== 'none' && focal) {
    const gap = SAFE.gutter;
    const bandH = rowH || Math.max(120, Math.min(headroom - focal.h - gap, usable.h * 0.3));
    for (let i = 0; i < n; i++) {
      let box;
      if (preset.support === 'row') {
        // a row above the focal subject: the arrangement, then the thing
        const bw = (usable.w - gap * (n - 1)) / n;
        box = rect(usable.x + i * (bw + gap), Math.max(usable.y, focal.y - gap - bandH), bw, bandH);
      } else if (preset.support === 'column') {
        const bw = Math.max(160, Math.min(usable.w - focal.w - gap * 2, usable.w * 0.34));
        const bh = Math.min(bandH, (usable.h - gap * (n - 1)) / n);
        const onRight = figure ? figure.x <= usable.x + usable.w / 2 : true;
        box = rect(onRight ? usable.right - bw : usable.x, focal.y + i * (bh + gap) - bh * 0.2, bw, bh);
      } else {
        // beside: a stack in the space the focal subject left, at bench height
        const bw = Math.max(150, Math.min(reserveW - gap, usable.w * 0.32));
        const bh = Math.max(110, Math.min(headroom * 0.44, (headroom - gap * (n - 1)) / n));
        const onRight = !(figure && figure.x > usable.x + usable.w / 2);
        const x = onRight ? usable.right - bw : usable.x;
        box = rect(x, ground - bh - i * (bh + gap * 0.4), bw, bh);
        box = rect(box.x, Math.max(usable.y, box.y), bw, bh);
      }
      box = clampRect(box, { ...usable, bottom: ground });
      if (figure && overlap(box, figure, 10) > 0) warnings.push(`supporting subject ${i} overlaps the character`);
      support.push(box);
    }
  }

  // ---- sanity ------------------------------------------------------------
  if (focal) {
    if (overlap(focal, rect(0, 0, W, SAFE.headerBottom)) > 0) warnings.push('focal subject in the header strip');
    if (captionTop && focal.bottom > captionTop - SAFE.gutter) warnings.push('focal subject under the caption');
    const area = (focal.w * focal.h) / (W * H);
    if (area < 0.06) warnings.push('focal subject is small for the frame');
  }
  if (headroom < 200) warnings.push('too little space above the bench');

  return { preset, usable, focal, support, figure, captionTop, ground, warnings };
}

/** A one-line description of a composition, for the storyboard and the tests. */
export function describeComposition(id) {
  const preset = CAMERAS[id] || CAMERAS['object-detail'];
  return `${preset.label} — ${preset.why}`;
}

export const ROLES = ['focal', 'supporting'];
