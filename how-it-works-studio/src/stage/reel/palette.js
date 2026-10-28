/**
 * palette.js - the palette from docs/04-visual-style.md, in one place.
 *
 * Every colour the stage uses comes from here. If a painter needs a new tone it
 * gets mixed from these; no literal hex values anywhere else in src/stage/reel/.
 */

export const P = {
  bg: '#FBF7F0',
  bgDeep: '#F2EADD',
  surface: '#FFFFFF',
  surfaceSoft: '#F6F0E6',
  ink: '#241F2B',
  inkSoft: '#5C5566',
  line: '#D9CDBB',

  accent: '#E8743B',
  accentSoft: '#F7D9C8',
  good: '#4C9A6A',
  stop: '#C4505A',
  link: '#4A7FB5',

  isoTop: '#FFF3E2',
  isoLeft: '#F2DFC6',
  isoRight: '#E0C8AA',
  isoEdge: '#B9A184',
};

/** Prop colour families, each as {top, left, right, edge, base}. */
export const FAMILY = {
  compute: fam('#7BA7C9'),
  network: fam('#8FBF9F'),
  storage: fam('#C9A87B'),
  people: fam('#E0A2A2'),
  abstract: fam('#A99BC4'),
  accentish: fam('#E8743B'),
  paper: fam('#D9CDBB'),
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

function rgbToHex(rgb) {
  return `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

/** Mix a colour towards white (t>0) or ink (t<0). */
export function mix(hex, t, towards = '#FFFFFF') {
  const a = hexToRgb(hex);
  const b = hexToRgb(towards);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * t));
}

/** Blend two hex colours: t=0 -> a, t=1 -> b. */
export function blend(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const k = Math.max(0, Math.min(1, t));
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * k));
}

export function alpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

function fam(base) {
  return {
    base,
    top: mix(base, 0.55),
    left: mix(base, 0.2),
    right: mix(base, -0.12),
    edge: mix(base, -0.45, P.ink),
    deep: mix(base, -0.28),
  };
}

// The three families the stage ships (assets/fonts/, registered in Node by
// tools/render-reel.mjs). Fallbacks are deliberately generic: the layout must
// survive a missing font without breaking the caption.
export const FONT_SANS = '"Inter", "DejaVu Sans", Helvetica, Arial, sans-serif';
export const FONT_SERIF = '"Source Serif 4", "DejaVu Serif", Georgia, serif';
export const FONT_MONO = '"IBM Plex Mono", "DejaVu Sans Mono", ui-monospace, monospace';
