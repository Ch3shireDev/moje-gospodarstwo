import { cachedFetch } from '../http.js';
import { gridPoints, interiorPoint, to2180 } from '../geo.js';

// Mapa kategorii podatności gleb na suszę IUNG-PIB (warstwa Susza:katgl_landuse2024),
// ta sama, której używa System Monitoringu Suszy Rolniczej. Zapytanie WMS GetFeatureInfo o piksel.
// Wartości rastra wg legendy (GetLegendGraphic, 21.11.2026).
const WMS = 'https://sgeo.iung.pl/geoserver/Susza/wms';
const LAYER = 'Susza:katgl_landuse2024';
const DAY = 24 * 3600_000;

export const CLASSES = {
  1: { category: 'I', label: 'kategoria I – gleba bardzo podatna na suszę' },
  2: { category: 'II', label: 'kategoria II – gleba podatna na suszę' },
  3: { category: 'III', label: 'kategoria III – gleba średnio podatna na suszę' },
  4: { category: 'IV', label: 'kategoria IV – gleba mało podatna na suszę' },
  5: { category: 'organiczna', label: 'gleba organiczna lub pochodzenia organicznego' },
  11: { category: null, landuse: 'las', label: 'lasy, zadrzewienia' },
  12: { category: null, landuse: 'woda', label: 'wody' },
  13: { category: null, landuse: 'zabudowa', label: 'tereny zabudowane' },
  14: { category: null, landuse: 'nieuzytek', label: 'tereny komunikacyjne, nieużytki' },
  19: { category: null, landuse: 'inne', label: 'tereny niesklasyfikowane' },
  99: { category: null, landuse: 'inne', label: 'tereny niesklasyfikowane' },
};

export const ATTRIBUTION = { name: 'IUNG-PIB – mapa kategorii podatności gleb na suszę', url: 'https://susza.iung.pulawy.pl/mapa-kategorii/' };

export function parseFeatureInfo(json) {
  const v = json?.features?.[0]?.properties?.GRAY_INDEX;
  return v == null ? null : Number(v);
}

async function valueAt(lat, lon) {
  const { e, n } = to2180(lat, lon);
  const E = Math.round(e);
  const N = Math.round(n);
  const params = new URLSearchParams({
    SERVICE: 'WMS', VERSION: '1.1.1', REQUEST: 'GetFeatureInfo',
    LAYERS: LAYER, QUERY_LAYERS: LAYER, STYLES: '', SRS: 'EPSG:2180',
    BBOX: `${E - 50},${N - 50},${E + 50},${N + 50}`,
    WIDTH: '101', HEIGHT: '101', X: '50', Y: '50', INFO_FORMAT: 'application/json',
  });
  const json = await cachedFetch(`${WMS}?${params}`, { ttlMs: DAY, diskTtlMs: 180 * DAY, timeoutMs: 8000 });
  return parseFeatureInfo(json);
}

/** Kategoria dominująca na działce (próbki w siatce punktów wewnątrz obrysu). */
export async function getSoilCategory(geometry) {
  const pts = [interiorPoint(geometry), ...gridPoints(geometry, 3)].slice(0, 10);
  const values = (await Promise.allSettled(pts.map((p) => valueAt(p.lat, p.lon))))
    .filter((r) => r.status === 'fulfilled' && r.value != null && r.value !== 0 && r.value !== 255)
    .map((r) => r.value);
  if (!values.length) throw new Error('IUNG: brak danych dla tego miejsca');
  return summarize(values);
}

export function summarize(values) {
  const counts = {};
  for (const v of values) counts[v] = (counts[v] ?? 0) + 1;
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const soilRanked = ranked.filter(([v]) => CLASSES[v]?.category);
  const [top, topCount] = soilRanked[0] ?? ranked[0];
  const cls = CLASSES[top] ?? { category: null, label: `wartość ${top}` };
  return {
    value: Number(top),
    category: cls.category,
    landuse: cls.landuse ?? 'rolne',
    label: cls.label,
    share: Math.round((topCount / values.length) * 100),
    samples: values.length,
    mixed: soilRanked.length > 1,
    breakdown: ranked.map(([v, c]) => ({ value: Number(v), label: CLASSES[v]?.label ?? String(v), count: c })),
  };
}
