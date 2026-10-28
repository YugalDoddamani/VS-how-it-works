/**
 * app.js - the reel player.
 *
 * Reads a compiled reel.json, drives drawFrame() from a playhead, and gives a
 * reviewer the three things they actually need: play, scrub to a shot, and look
 * at one frame at a time.
 */

import { drawFrame, shotAt } from '../src/stage/reel/render.js';
import { setPoses } from '../src/stage/reel/nao.js';
import { setWorldAssets } from '../src/stage/reel/worlds.js';

const W = 1080;
const H = 1920;
const FPS = 30;

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const playBtn = document.getElementById('play');
const scrub = document.getElementById('scrub');
const timecode = document.getElementById('timecode');
const shotLabel = document.getElementById('shot-label');
const shotList = document.getElementById('shot-list');
const reelSelect = document.getElementById('reel-select');
const metaEl = document.getElementById('meta');
const guidesToggle = document.getElementById('guides');
const downloadBtn = document.getElementById('download');

let reel = null;
let frame = 0;
let playing = false;
let last = 0;
let drawGuides = false;
let spritesReady = false;

// ---------------------------------------------------------------------------
// reels list
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

async function listReels() {
  const res = await fetch('/series/index.csv', { cache: 'no-store' });
  const rows = parseCsv(await res.text());
  const head = rows.shift();
  const at = (r, k) => r[head.indexOf(k)];
  return rows
    .filter((r) => at(r, 'format') === 'reel')
    .map((r) => ({
      id: at(r, 'id'),
      title: at(r, 'title'),
      series: at(r, 'series'),
      seconds: at(r, 'seconds'),
      path: at(r, 'path'),
    }));
}

// ---------------------------------------------------------------------------
// load
// ---------------------------------------------------------------------------

async function loadReel(path) {
  playing = false;
  playBtn.dataset.state = 'paused';
  const res = await fetch(`${path}reel.json`, { cache: 'no-store' });
  if (!res.ok) {
    metaEl.textContent = `no reel.json at ${path} — run: node tools/compile-reel.mjs`;
    return;
  }
  reel = await res.json();
  frame = 0;
  scrub.max = String(reel.frames - 1);
  scrub.value = '0';
  document.title = `${reel.id} · ${reel.title} — Nao`;
  metaEl.innerHTML = `<strong>${reel.title}</strong><span>${reel.series} · ${reel.seconds.toFixed(1)} s · ${reel.frames} frames · ${reel.shotCount} shots · outfit <code>${reel.outfit}</code></span>`;
  buildShotList();
  draw();
  filmStatus(path);
}

function buildShotList() {
  shotList.innerHTML = '';
  for (const shot of reel.shots) {
    const li = document.createElement('li');
    li.dataset.shot = String(shot.n);
    li.innerHTML = `
      <span class="n">${String(shot.n).padStart(2, '0')}</span>
      <span class="code">${shot.code}</span>
      <span class="lens">${shot.lens}</span>
      <span class="vo">${shot.vo}</span>`;
    li.addEventListener('click', () => {
      frame = shot.start;
      playing = false;
      playBtn.dataset.state = 'paused';
      draw();
    });
    shotList.append(li);
  }
}

/**
 * The compiled reel and the encoded film live in the same folder. If the mp4 is
 * there, say so and link it; if not, say how to make it. Never claim a render
 * that does not exist.
 */
async function filmStatus(path) {
  const link = document.getElementById('film-link');
  const status = document.getElementById('film-status');
  const mp4 = `${path}output/${reel.slug}.mp4`;
  const res = await fetch(mp4, { method: 'HEAD' });
  if (res.ok) {
    const mb = (Number(res.headers.get('content-length') || 0) / 1048576).toFixed(1);
    link.href = mp4;
    link.textContent = `${reel.slug}.mp4`;
    status.textContent = `${mb} MB · 1080x1920 · ${reel.seconds.toFixed(0)}s · rendered`;
    status.dataset.state = 'ready';
  } else {
    link.removeAttribute('href');
    link.textContent = `${reel.slug}.mp4 — not rendered`;
    status.textContent = 'node tools/render-reel.mjs --reel ' + reel.id.toLowerCase() + ' --all --mp4 <path>';
    status.dataset.state = 'pending';
  }
}

// ---------------------------------------------------------------------------
// draw
// ---------------------------------------------------------------------------

let lastShot = null;

function draw() {
  if (!reel) return;
  const shot = drawFrame(ctx, reel, frame, { guides: drawGuides });
  if (spritesReady) {
    // no-op: kept so the draw stays warm after sprites arrive
  }

  const tc = (f) => {
    const s = f / FPS;
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
  };
  timecode.textContent = `${tc(frame)} / ${tc(reel.frames)}`;
  shotLabel.textContent = `shot ${shot.n}/${reel.shotCount} · ${shot.code} · ${shot.lens}`;
  scrub.value = String(frame);

  if (lastShot !== shot.n) {
    lastShot = shot.n;
    for (const li of shotList.children) {
      li.classList.toggle('active', Number(li.dataset.shot) === shot.n);
    }
    const active = shotList.querySelector('li.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }
}

// ---------------------------------------------------------------------------
// loop
// ---------------------------------------------------------------------------

function tick(now) {
  if (playing && reel) {
    if (!last) last = now;
    const dt = (now - last) / 1000;
    last = now;
    let next = frame + dt * FPS;
    if (next >= reel.frames) {
      next = reel.frames - 1;
      playing = false;
      playBtn.dataset.state = 'paused';
    }
    frame = next;
    draw();
  } else {
    last = 0;
  }
  requestAnimationFrame(tick);
}

// ---------------------------------------------------------------------------
// controls
// ---------------------------------------------------------------------------

playBtn.addEventListener('click', () => {
  if (!reel) return;
  if (frame >= reel.frames - 1) frame = 0;
  playing = !playing;
  playBtn.dataset.state = playing ? 'playing' : 'paused';
  playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
});

scrub.addEventListener('input', () => {
  frame = Number(scrub.value);
  playing = false;
  playBtn.dataset.state = 'paused';
  draw();
});

guidesToggle.addEventListener('change', () => {
  drawGuides = guidesToggle.checked;
  draw();
});

downloadBtn.addEventListener('click', () => {
  if (!reel) return;
  const a = document.createElement('a');
  a.download = `${reel.id}-frame-${String(Math.round(frame)).padStart(4, '0')}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
});

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  if (e.code === 'Space') {
    e.preventDefault();
    playBtn.click();
  } else if (e.code === 'ArrowRight') {
    frame = Math.min(reel.frames - 1, frame + (e.shiftKey ? 1 : 10));
    draw();
  } else if (e.code === 'ArrowLeft') {
    frame = Math.max(0, frame - (e.shiftKey ? 1 : 10));
    draw();
  } else if (e.code === 'Home') {
    frame = 0;
    draw();
  }
});

/** Load the whole-figure pose set: the manifest and one image per pose. */
async function loadPoses(base) {
  const manifest = await (await fetch(`${base}/poses.json`, { cache: 'no-store' })).json();
  const load = (src) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`missing ${src}`));
      img.src = src;
    });
  const images = {};
  await Promise.all(
    manifest.poses.map(async (p) => {
      images[p.name] = await load(`${base}/${p.file}`);
    })
  );
  setPoses({ manifest, images });
  try {
    images.shoe = await load('/assets/world/shoe.png');
    setWorldAssets({ shoe: images.shoe });
  } catch { /* the vector stand-in will do */ }
  return Object.keys(images).length - 1;
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------

(async function boot() {
  const reels = await listReels();
  reelSelect.innerHTML = reels
    .map((r) => `<option value="${r.path}">${r.id} · ${r.title} (${r.seconds}s)</option>`)
    .join('');
  const wanted = new URLSearchParams(location.search).get('reel');
  const initial = reels.find((r) => r.id.toLowerCase() === String(wanted).toLowerCase()) || reels.find((r) => r.id === 'R03') || reels[0];
  reelSelect.value = initial.path;

  try {
    const n = await loadPoses('/assets/nao/poses');
    spritesReady = n > 0;
    if (!spritesReady) console.warn('no figure poses loaded');
  } catch (err) {
    console.error(err);
  }

  reelSelect.addEventListener('change', () => loadReel(reelSelect.value));
  await loadReel(initial.path);
  requestAnimationFrame(tick);
})();
