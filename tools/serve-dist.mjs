#!/usr/bin/env node
// A zero-dependency static server for dist/, for putting the built game on a
// tailnet or a LAN. Correct MIME types, immutable caching for hashed assets,
// and index.html for anything it does not have (the app is one page).
//
//   node tools/serve-dist.mjs            # http://0.0.0.0:4173
//   PORT=8090 node tools/serve-dist.mjs

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const PORT = Number(process.env.PORT) || 4173;
const HOST = process.env.HOST || '0.0.0.0';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8', '.woff2': 'font/woff2',
};

createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = normalize(join(ROOT, url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    statSync(file);
  } catch {
    file = join(ROOT, 'index.html');
  }
  const ext = extname(file);
  const hashed = url.startsWith('/assets/');
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': hashed ? 'public, max-age=31536000, immutable' : url.startsWith('/voice/') ? 'public, max-age=604800' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}).listen(PORT, HOST, () => console.log(`The Ashgrave Files: http://${HOST}:${PORT}/ (serving ${ROOT})`));
