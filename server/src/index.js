import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildReport, parseQuery, lookupParcel, InputError, ParcelChoice, todayWarsaw, minDate } from './report.js';
import { EXAMPLES } from './demo.js';
import { SOIL_CATEGORIES } from './engine.js';
import { CROPS, DEFAULT_CROP } from './data/crops.js';
import { searchPlaces } from './sources/nominatim.js';

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
    if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true });
    if (url.pathname === '/api/meta') {
      return sendJson(res, 200, {
        crops: Object.entries(CROPS).map(([id, c]) => ({ id, label: c.label })),
        defaultCrop: DEFAULT_CROP,
        soils: Object.entries(SOIL_CATEGORIES).map(([id, s]) => ({ id, label: s.label })),
        examples: EXAMPLES,
        today: todayWarsaw(),
        minDate: minDate(todayWarsaw()),
      });
    }
    if (url.pathname === '/api/parcel') {
      return sendJson(res, 200, await lookupParcel(url.searchParams));
    }
    if (url.pathname === '/api/places') {
      const q = (url.searchParams.get('q') ?? '').trim();
      if (q.length < 2 || q.length > 80) throw new InputError('Wpisz nazwę miejscowości, gminy, powiatu albo województwa.');
      try {
        return sendJson(res, 200, { places: await searchPlaces(q) });
      } catch (err) {
        throw Object.assign(new Error(`Wyszukiwarka miejsc (OpenStreetMap) nie odpowiada: ${err.message}`), { status: 502 });
      }
    }
    if (url.pathname === '/api/report') {
      const query = parseQuery(url.searchParams);
      return sendJson(res, 200, await buildReport(query));
    }
    if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Nie ma takiego endpointu.' });
    return serveStatic(res, url.pathname);
  } catch (err) {
    if (err instanceof ParcelChoice) return sendJson(res, 300, { error: err.message, candidates: err.candidates });
    const status = err instanceof InputError ? 400 : err.status ?? 500;
    if (status >= 500) console.error(err);
    return sendJson(res, status, { error: err.message });
  }
});

server.listen(PORT, () => console.log(`API: http://localhost:${PORT}/api/health`));
