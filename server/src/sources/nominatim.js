import { cachedFetch } from '../http.js';
import { env } from '../platform.js';

// Wyszukiwarka miejsc: Nominatim (OpenStreetMap). Zamienia tekst typu „Ciechanów”, „mazowsze”,
// „pomorskie” na listę miejsc z zasięgiem na mapie. Dane OSM na licencji ODbL.
// Zasady serwisu: najwyżej 1 zapytanie na sekundę, własny User-Agent, wyniki trzeba cache'ować
// (https://operations.osmfoundation.org/policies/nominatim/). Dlatego kolejka i cache na dysku.

const DAY = 24 * 3600_000;
const BASE = env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org';

export const ATTRIBUTION = { name: 'Nominatim / OpenStreetMap', url: 'https://www.openstreetmap.org/copyright', licence: 'ODbL 1.0' };

let queue = Promise.resolve();
let last = 0;
/** Jedno zapytanie naraz, co najmniej 1,1 s odstępu (polityka Nominatim). */
function throttled(fn) {
  const run = queue.then(async () => {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    try {
      return await fn();
    } finally {
      last = Date.now();
    }
  });
  queue = run.catch(() => {});
  return run;
}

export async function searchPlaces(text) {
  const q = text.trim().replace(/\s+/g, ' ').toLowerCase();
  const params = new URLSearchParams({ format: 'jsonv2', countrycodes: 'pl', 'accept-language': 'pl', limit: '8', addressdetails: '1', q });
  const url = `${BASE}/search?${params}`;
  const raw = await throttled(() => cachedFetch(url, { ttlMs: DAY, diskTtlMs: 30 * DAY, timeoutMs: 8000 }));
  return parsePlaces(raw);
}

const KIND = {
  state: 'województwo',
  county: 'powiat',
  municipality: 'gmina',
  city: 'miasto',
  town: 'miasto',
  village: 'wieś',
  hamlet: 'osada',
  suburb: 'część miejscowości',
  region: 'region',
};

/** Odpowiedź Nominatim -> miejsca bez duplikatów, od najważniejszych. */
export function parsePlaces(raw) {
  const out = [];
  const seen = new Set();
  const rows = (Array.isArray(raw) ? raw : []).slice().sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
  for (const r of rows) {
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const label = (r.display_name ?? '').replace(/, Polska$/, '');
    if (!label || seen.has(label)) continue;
    seen.add(label);
    const [s, n, w, e] = (r.boundingbox ?? []).map(Number);
    out.push({
      name: r.name || label.split(',')[0],
      label,
      kind: KIND[r.addresstype] ?? null,
      lat,
      lon,
      bbox: [w, s, e, n].every(Number.isFinite) ? [w, s, e, n] : null,
    });
  }
  return out.slice(0, 6);
}
