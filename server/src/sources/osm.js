import { cachedFetch, memoDisk } from '../http.js';
import { bboxOf, distanceToLineM, interiorPoint } from '../geo.js';
import { decodeTile, lonLatToTile, tilePointToLonLat } from '../mvt.js';

// Wody wokół działki z OpenStreetMap: cieki, rowy, zbiorniki, mokradła.
// Źródło główne: kafle wektorowe OpenFreeMap (te same, co podkład mapy) – CDN, bez klucza i bez limitu
// na IP. Zapasowo: Overpass API (bez kluczy, ale publiczne serwery bywają przeciążone).
// Dane ODbL – wymagane "© OpenStreetMap contributors". Kompletność rowów melioracyjnych w OSM
// bywa różna w zależności od regionu – raport mówi o tym wprost.
const MIRRORS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const DAY = 24 * 3600_000;
const RADIUS_M = 600;

export const ATTRIBUTION = { name: '© OpenStreetMap contributors (Overpass API)', url: 'https://www.openstreetmap.org/copyright', licence: 'ODbL' };

const KIND = {
  river: 'rzeka', stream: 'strumień / ciek', canal: 'kanał', ditch: 'rów', drain: 'rów melioracyjny',
};

export function overpassQuery(lat, lon, radius = RADIUS_M) {
  const a = `around:${radius},${lat.toFixed(5)},${lon.toFixed(5)}`;
  return `[out:json][timeout:12];(way["waterway"~"^(river|stream|canal|ditch|drain)$"](${a});way["natural"="water"](${a});way["natural"="wetland"](${a});relation["natural"="water"](${a}););out tags geom qt;`;
}

export async function getWaters(geometry) {
  try {
    return summarizeWaters({ elements: await watersFromTiles(geometry) }, geometry, 'OpenFreeMap (OpenStreetMap)');
  } catch (tileErr) {
    try {
      return await watersFromOverpass(geometry);
    } catch (err) {
      throw new Error(`mapa wód niedostępna (kafle: ${tileErr.message}; Overpass: ${err.message})`);
    }
  }
}

const OFM_TILEJSON = 'https://tiles.openfreemap.org/planet';
const TILE_Z = 14; // najwyższy poziom kafli OpenFreeMap – pełna szczegółowość wód
const WATER_CLASSES = new Set(['lake', 'pond', 'river', 'reservoir', 'basin']);

/** Kafle z promienia RADIUS_M wokół działki -> elementy w formacie jak z Overpass (tags + geometry). */
export async function watersFromTiles(geometry) {
  const tj = await cachedFetch(OFM_TILEJSON, { ttlMs: 6 * 3600_000, timeoutMs: 8000 });
  const template = tj?.tiles?.[0];
  if (!template) throw new Error('brak adresu kafli w TileJSON');
  const b = bboxOf(geometry);
  const dLat = RADIUS_M / 111_320;
  const dLon = RADIUS_M / (111_320 * Math.cos((((b.minLat + b.maxLat) / 2) * Math.PI) / 180));
  const t0 = lonLatToTile(b.minLon - dLon, b.maxLat + dLat, TILE_Z);
  const t1 = lonLatToTile(b.maxLon + dLon, b.minLat - dLat, TILE_Z);
  const tiles = [];
  for (let x = t0.x; x <= t1.x; x++) for (let y = t0.y; y <= t1.y; y++) tiles.push({ x, y });
  if (tiles.length > 9) throw new Error('działka zbyt duża');
  const lists = await Promise.all(tiles.map(({ x, y }) => tileWaters(template, x, y)));
  return lists.flat();
}

async function tileWaters(template, x, y) {
  const url = template.replace('{z}', TILE_Z).replace('{x}', x).replace('{y}', y);
  // Wynik dekodowania (same wody, w WGS84) trzymamy na dysku – kafel się nie zmienia w obrębie wersji.
  return memoDisk(`ofm:${url}`, 30 * 24 * 3600_000, async () => {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'moje-gospodarstwo/0.2' } });
    if (!res.ok) throw new Error(`HTTP ${res.status} z tiles.openfreemap.org`);
    const layers = decodeTile(Buffer.from(await res.arrayBuffer()), ['waterway', 'water', 'landcover']);
    return tileLayersToElements(layers, x, y);
  });
}

export function tileLayersToElements(layers, x, y) {
  const out = [];
  const toLL = (extent) => ([px, py]) => {
    const [lon, lat] = tilePointToLonLat(TILE_Z, x, y, px, py, extent);
    return { lon: Math.round(lon * 1e6) / 1e6, lat: Math.round(lat * 1e6) / 1e6 };
  };
  const push = (tags, geom, extent) => {
    for (const line of geom) if (line.length >= 2) out.push({ type: 'tile', id: `${x}/${y}/${out.length}`, tags, geometry: line.map(toLL(extent)) });
  };
  for (const f of layers.waterway?.features ?? []) {
    if (!KIND[f.props.class]) continue;
    push({ waterway: f.props.class, name: f.props.name, intermittent: f.props.intermittent ? 'yes' : undefined }, f.geometry, layers.waterway.extent);
  }
  for (const f of layers.water?.features ?? []) {
    if (!WATER_CLASSES.has(f.props.class)) continue;
    push({ natural: 'water', water: f.props.class === 'pond' ? 'pond' : f.props.class === 'river' ? 'river' : 'lake' }, f.geometry, layers.water.extent);
  }
  for (const f of layers.landcover?.features ?? []) {
    if (f.props.class !== 'wetland') continue;
    push({ natural: 'wetland', wetland: f.props.subclass }, f.geometry, layers.landcover.extent);
  }
  return out;
}

async function watersFromOverpass(geometry) {
  const c = interiorPoint(geometry);
  const body = `data=${encodeURIComponent(overpassQuery(c.lat, c.lon))}`;
  let lastErr;
  for (const url of MIRRORS) {
    try {
      const raw = await cachedFetch(url, {
        method: 'POST',
        body,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        ttlMs: DAY,
        diskTtlMs: 30 * DAY,
        timeoutMs: 6000,
      });
      return summarizeWaters(raw, geometry, 'Overpass API (OpenStreetMap)');
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(`OSM/Overpass niedostępny (${lastErr?.message ?? 'brak odpowiedzi'})`);
}

export function summarizeWaters(raw, geometry, source = 'OpenStreetMap') {
  const items = [];
  for (const el of raw?.elements ?? []) {
    const t = el.tags ?? {};
    const line = (el.geometry ?? []).map((p) => [p.lon, p.lat]);
    if (line.length < 2) continue;
    const distM = Math.round(distanceToLineM(geometry, line));
    let kind;
    let type;
    if (t.waterway) {
      type = ['ditch', 'drain'].includes(t.waterway) ? 'row' : 'ciek';
      kind = KIND[t.waterway] ?? t.waterway;
    } else if (t.natural === 'wetland') {
      type = 'mokradlo';
      kind = t.wetland === 'bog' ? 'torfowisko' : 'mokradło';
    } else if (t.water === 'river') {
      type = 'ciek';
      kind = 'koryto rzeki';
    } else {
      type = 'zbiornik';
      kind = t.water === 'pond' ? 'staw / oczko' : 'zbiornik wodny';
    }
    if (distM > RADIUS_M) continue;
    items.push({ id: `${el.type}/${el.id}`, type, kind, name: t.name ?? null, distM, intermittent: t.intermittent === 'yes' });
  }
  items.sort((a, b) => a.distM - b.distM);
  // Ten sam ciek pocięty na granicach kafli – zostawiamy najbliższy fragment.
  const seen = new Set();
  const unique = items.filter((it) => {
    const key = `${it.type}|${it.kind}|${it.name ?? ''}${it.name ? '' : `|${Math.round(it.distM / 25)}`}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  items.length = 0;
  items.push(...unique);
  const nearest = (type) => items.find((x) => x.type === type) ?? null;
  return {
    radiusM: RADIUS_M,
    source,
    items: items.slice(0, 15),
    nearestDitch: nearest('row'),
    nearestStream: nearest('ciek'),
    nearestWater: nearest('zbiornik'),
    nearestWetland: nearest('mokradlo'),
    count: items.length,
  };
}
