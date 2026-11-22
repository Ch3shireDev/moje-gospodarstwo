import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApi } from './api.js';
import { setDiskStore } from './http.js';
import { fileStore } from './diskStore.js';

setDiskStore(fileStore);

const PORT = Number(process.env.PORT) || 8787;
const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

/**
 * Pliki frontu. Pliki z /assets/ mają hash w nazwie – po wdrożeniu nowej wersji stare znikają.
 * Dla nich NIE ma przekierowania na index.html (SPA fallback): przeglądarka dostałaby HTML zamiast
 * skryptu i zgłosiła „error loading dynamically imported module”. Zwracamy 404, a front odświeża stronę.
 */
async function serveStatic(res, urlPath) {
  const safe = path.normalize(decodeURIComponent(urlPath)).replace(/^([/\\])+/, '');
  let file = path.join(DIST, safe);
  if (!file.startsWith(DIST)) return sendJson(res, 403, { error: 'Nie.' });
  const isAsset = safe.startsWith('assets/') || safe.startsWith('assets\\');
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = path.join(file, 'index.html');
  } catch {
    if (isAsset || path.extname(safe)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end('Nie ma takiego pliku (możliwe, że wgrano nową wersję aplikacji – odśwież stronę).');
    }
    file = path.join(DIST, 'index.html'); // SPA fallback tylko dla adresów stron (/mapa, /raport…)
  }
  try {
    const data = await readFile(file);
    const name = path.basename(file);
    // Pliki z hashem można trzymać w cache długo; index.html, sw.js i manifest – zawsze świeże.
    const cache = isAsset ? 'public, max-age=31536000, immutable' : 'no-cache';
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': name === 'index.html' || name === 'sw.js' ? 'no-cache' : cache });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: 'Brak zbudowanego frontu. Uruchom `npm run build` albo korzystaj z `npm run dev` w client/.' });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  try {
    const api = await handleApi(url.pathname, url.searchParams);
    if (api) return sendJson(res, api.status, api.body);
    return await serveStatic(res, url.pathname);
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`API: http://localhost:${PORT}/api/health`));
