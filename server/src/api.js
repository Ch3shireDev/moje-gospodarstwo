// Endpointy /api/* bez warstwy HTTP. Używa ich serwer Node (index.js) i aplikacja mobilna,
// która liczy raport na telefonie (client/src/local/localApi.js) – ta sama logika, te same kody błędów.
import { buildReport, parseQuery, lookupParcel, InputError, ParcelChoice, todayWarsaw, minDate, defaultDeps } from './report.js';
import { EXAMPLES } from './demo.js';
import { SOIL_CATEGORIES } from './engine.js';
import { CROPS, DEFAULT_CROP } from './data/crops.js';
import { searchPlaces } from './sources/nominatim.js';

/** Zwraca { status, body } albo null, gdy to nie jest adres /api/. deps – np. bez LLM w aplikacji mobilnej. */
export async function handleApi(pathname, searchParams, deps = defaultDeps) {
  if (!pathname.startsWith('/api/')) return null;
  try {
    if (pathname === '/api/health') return { status: 200, body: { ok: true } };
    if (pathname === '/api/meta') {
      return {
        status: 200,
        body: {
          crops: Object.entries(CROPS).map(([id, c]) => ({ id, label: c.label })),
          defaultCrop: DEFAULT_CROP,
          soils: Object.entries(SOIL_CATEGORIES).map(([id, s]) => ({ id, label: s.label })),
          examples: EXAMPLES,
          today: todayWarsaw(),
          minDate: minDate(todayWarsaw()),
        },
      };
    }
    if (pathname === '/api/parcel') return { status: 200, body: await lookupParcel(searchParams, deps) };
    if (pathname === '/api/places') {
      const q = (searchParams.get('q') ?? '').trim();
      if (q.length < 2 || q.length > 80) throw new InputError('Wpisz nazwę miejscowości, gminy, powiatu albo województwa.');
      try {
        return { status: 200, body: { places: await searchPlaces(q) } };
      } catch (err) {
        throw Object.assign(new Error(`Wyszukiwarka miejsc (OpenStreetMap) nie odpowiada: ${err.message}`), { status: 502 });
      }
    }
    if (pathname === '/api/report') return { status: 200, body: await buildReport(parseQuery(searchParams), deps) };
    return { status: 404, body: { error: 'Nie ma takiego endpointu.' } };
  } catch (err) {
    if (err instanceof ParcelChoice) return { status: 300, body: { error: err.message, candidates: err.candidates } };
    const status = err instanceof InputError ? 400 : err.status ?? 500;
    if (status >= 500) console.error(err);
    return { status, body: { error: err.message } };
  }
}
