#!/usr/bin/env node
/**
 * preview-server.mjs - a 60-line static server for the reel player.
 *
 * It serves the repository root, because the player needs three things that
 * live in three places: preview/ (the page), src/stage/reel/ (the renderer) and
 * series/<series>/reels/<slug>/reel.json + assets/nao/heads (the content).
 *
 * No build step, no dependencies, no framework. If a reel.json is missing it
 * says so in the page rather than 404ing silently.
 *
 * Usage: node tools/preview-server.mjs [--port 4173] [--open]
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const PORT = Number(portArg >= 0 ? args[portArg + 1] : process.env.PORT || 4173);
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, {
    'content-type': type,
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
  });
  res.end(body);
}

const server = http.createServer((req, res) => {
  let url;
  try {
    url = decodeURIComponent(new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname);
  } catch {
    return send(res, 400, 'bad request');
  }

  if (url === '/' || url === '') url = '/preview/index.html';
  if (url === '/preview' || url === '/preview/') url = '/preview/index.html';

  const file = path.join(ROOT, path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden');

  fs.readFile(file, (err, buf) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // A missing reel.json is a missing compile, not a broken link.
        if (file.endsWith('reel.json')) {
          return send(res, 404, JSON.stringify({ error: 'not compiled', hint: 'node tools/compile-reel.mjs' }), 'application/json');
        }
        return send(res, 404, `not found: ${url}`);
      }
      return send(res, 500, String(err));
    }
    const type = TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
    res.end(buf);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`reel preview  →  http://0.0.0.0:${PORT}/  (serving ${ROOT})`);
  console.log('press ctrl-c to stop');
});
