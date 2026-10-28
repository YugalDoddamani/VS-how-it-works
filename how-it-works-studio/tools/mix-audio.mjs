#!/usr/bin/env node
/**
 * mix-audio.mjs - build the soundtrack and mux it onto the film.
 *
 * Three layers, all placed on the same timeline:
 *   1. voice-over - one clip per group of shots, from output/vo.json
 *   2. effects    - the cue table in audio-cues.mjs, one shared WAV per cue
 *   3. the bed    - nothing. Silence between lines is the point; a music bed
 *                   would sit under the jokes and make the film feel like an ad.
 *
 * Summing happens here rather than in ffmpeg's amix on purpose: this environment
 * ships a 2018 ffmpeg whose amix divides by the input count, so a 60-cue mix
 * comes out near-silent and dips every time a cue ends. Summing plain PCM is
 * thirty lines and does exactly what is asked.
 *
 * Usage:
 *   node tools/mix-audio.mjs --reel 0102 --wav /tmp/mix.wav      (no video)
 *   node tools/mix-audio.mjs --reel 0102 --video in.mp4 --out out.mp4
 *   ... --no-vo            effects only
 *   ... --vo-gain 1.0      override the voice level
 *
 * The voice clips and their frames live in output/vo.json:
 *   { "clips": [ { "file": "g1.mp3", "start": 0, "end": 120 } ] }
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { cuesFor } from './audio-cues.mjs';
import { findCompiled } from './lookup.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FFMPEG = require('@ffmpeg-installer/ffmpeg').path;
const RATE = 44100;

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
}
const has = (name) => process.argv.includes(`--${name}`);

/** Read a 16-bit PCM WAV into Float32 mono at 44.1 kHz (mono is all we make). */
function readWav(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error(`not a wav: ${file}`);
  let offset = 12;
  let channels = 1;
  let rate = RATE;
  let bits = 16;
  let data = null;
  while (offset + 8 <= buf.length) {
    const id = buf.toString('ascii', offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(body + 2);
      rate = buf.readUInt32LE(body + 4);
      bits = buf.readUInt16LE(body + 14);
    } else if (id === 'data') {
      data = buf.subarray(body, Math.min(buf.length, body + size));
    }
    offset = body + size + (size % 2);
  }
  if (!data) throw new Error(`no data chunk: ${file}`);
  if (bits !== 16) throw new Error(`only 16-bit wav supported: ${file}`);
  const frames = Math.floor(data.length / (2 * channels));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += data.readInt16LE((i * channels + c) * 2);
    out[i] = sum / (channels * 32768);
  }
  if (rate !== RATE) throw new Error(`expected ${RATE} Hz, got ${rate}: ${file}`);
  return out;
}

function writeWav(file, samples) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  fs.writeFileSync(file, buf);
}

function addLayer(mix, samples, atSeconds, gain) {
  const start = Math.max(0, Math.round(atSeconds * RATE));
  const end = Math.min(mix.length, start + samples.length);
  for (let i = start; i < end; i++) mix[i] += samples[i - start] * gain;
}

/** Decode any ffmpeg-readable file to a mono 44.1 kHz wav, optionally retimed. */
function decode(file, tempo, tmpDir) {
  const out = path.join(tmpDir, `${path.basename(file).replace(/\W+/g, '_')}-${tempo.toFixed(2)}.wav`);
  if (fs.existsSync(out)) return out;
  const args = ['-hide_banner', '-y', '-i', file];
  if (Math.abs(tempo - 1) > 0.001) args.push('-filter:a', `atempo=${tempo.toFixed(3)}`);
  args.push('-ar', String(RATE), '-ac', '1', '-c:a', 'pcm_s16le', out);
  const r = spawnSync(FFMPEG, args, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error((r.stderr || '').split('\n').slice(-10).join('\n'));
    throw new Error(`could not decode ${file}`);
  }
  return out;
}

function duration(file) {
  const out = spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(out.stderr || '');
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

const reelId = arg('reel', '0102');
const { reel, dir } = findCompiled(ROOT, reelId);
const outDir = path.join(dir, 'output');
const voGain = Number(arg('vo-gain', '1.0'));
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nao-mix-'));

const filmLength = Math.ceil((reel.frames / reel.fps) * RATE);
const totalSamples = filmLength + RATE;
const mix = new Float32Array(totalSamples);

// ---- voice-over -----------------------------------------------------------
const voFile = path.join(outDir, 'vo.json');
let voCount = 0;
if (!has('no-vo') && fs.existsSync(voFile)) {
  const vo = JSON.parse(fs.readFileSync(voFile, 'utf8'));
  for (const clip of vo.clips) {
    const file = path.join(outDir, clip.file);
    if (!fs.existsSync(file)) throw new Error(`missing voice-over clip ${file}`);
    const at = clip.start / reel.fps;
    const window = (clip.end - clip.start) / reel.fps;
    const raw = duration(file) || window;
    // fit the clip to its window without turning her into a chipmunk: at most
    // 15 % faster, at most 5 % slower. Beyond that the cut is the problem.
    const tempo = Math.min(1.15, Math.max(0.95, raw / Math.max(0.2, window)));
    const wav = decode(file, tempo, tmpDir);
    addLayer(mix, readWav(wav), at, voGain);
    voCount++;
  }
} else if (!has('no-vo')) {
  console.log('  ! no output/vo.json — mixing effects only');
}

// ---- effects --------------------------------------------------------------
const cues = cuesFor(reel);
const cache = new Map();
for (const cue of cues) {
  if (!cache.has(cue.cue)) {
    const file = path.join(ROOT, 'assets/sfx', `${cue.cue}.wav`);
    if (!fs.existsSync(file)) throw new Error(`missing cue ${file} — run python3 tools/make-sfx.py`);
    cache.set(cue.cue, readWav(file));
  }
  addLayer(mix, cache.get(cue.cue), cue.at, cue.gain);
}

// ---- normalise and write --------------------------------------------------
let peak = 0;
for (let i = 0; i < filmLength; i++) peak = Math.max(peak, Math.abs(mix[i]));
const scale = peak > 0 ? 0.89 / peak : 1;
const final = new Float32Array(filmLength);
for (let i = 0; i < filmLength; i++) final[i] = mix[i] * scale;

const wavOut = arg('wav');
const videoIn = arg('video');
const mp4Out = arg('out');
const wavPath = wavOut || path.join(tmpDir, 'mix.wav');
writeWav(wavPath, final);

const level = (20 * Math.log10(peak * scale || 1e-9)).toFixed(1);

if (wavOut) {
  console.log(`wav    → ${path.relative(process.cwd(), wavOut) || wavOut}  ` +
    `${(filmLength / RATE).toFixed(2)}s  peak ${level} dBFS  ` +
    `${voCount} voice clips, ${cues.length} effects`);
}
if (videoIn && mp4Out) {
  const r = spawnSync(
    FFMPEG,
    [
      '-hide_banner', '-y',
      '-i', videoIn,
      '-i', wavPath,
      '-map', '0:v:0', '-map', '1:a:0',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
      '-movflags', '+faststart', '-shortest', mp4Out,
    ],
    { encoding: 'utf8' }
  );
  if (r.status !== 0) {
    console.error(r.stderr.split('\n').slice(-12).join('\n'));
    process.exit(1);
  }
  const size = (fs.statSync(mp4Out).size / 1e6).toFixed(1);
  console.log(`mp4    → ${path.relative(ROOT, mp4Out)}  ${size} MB  ` +
    `${voCount} voice clips, ${cues.length} effects, peak ${level} dBFS`);
}
if (!wavOut && !(videoIn && mp4Out)) {
  console.error('nothing to do: pass --wav <file> or --video <in> --out <out>');
  process.exit(1);
}
