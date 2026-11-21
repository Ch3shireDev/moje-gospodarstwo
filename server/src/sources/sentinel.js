// Sentinel-2 L2A (Copernicus) z publicznego katalogu Earth Search (Element 84, AWS) – bez konta.
// Dla działki liczymy NDVI (wigor roślin) i NDMI (wilgotność roślin) z pikseli 20 m,
// z maską chmur i cieni z klasyfikacji sceny (SCL). Pobieramy tylko kafle z działką.
import { createHash } from 'node:crypto';
import { cachedFetch, memoDisk } from '../http.js';
import { projectGeometry, pointInProjected, toUtm } from '../geo.js';
import { levelForResolution, levelTransform, openCog, readWindow } from '../cog.js';
import { pngDataUrl, upscaleWithOutline } from '../png.js';

const STAC = 'https://earth-search.aws.element84.com/v1/search';
const DAY = 24 * 3600_000;
// SCL: 4 = roślinność, 5 = gleba odsłonięta. Reszta (chmury 8–10, cienie 3, śnieg 11, woda 6...) odpada.
const VALID_SCL = new Set([4, 5]);

export const ATTRIBUTION = {
  name: 'Copernicus Sentinel-2 L2A (ESA), katalog Earth Search / AWS Open Data',
  url: 'https://registry.opendata.aws/sentinel-2-l2a-cogs/',
  licence: 'dane Copernicus – wolny i otwarty dostęp, wymagane przypisanie',
};

const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export async function searchScenes({ lat, lon, from, to, maxCloud = 80, limit = 30 }) {
  const body = JSON.stringify({
    collections: ['sentinel-2-l2a'],
    intersects: { type: 'Point', coordinates: [Number(lon.toFixed(5)), Number(lat.toFixed(5))] },
    datetime: `${from}T00:00:00Z/${to}T23:59:59Z`,
    limit,
    query: { 'eo:cloud_cover': { lt: maxCloud } },
  });
  const isPast = to < addDays(new Date().toISOString().slice(0, 10), -3);
  const raw = await cachedFetch(STAC, {
    method: 'POST',
    body,
    headers: { 'Content-Type': 'application/json' },
    ttlMs: 6 * 3600_000,
    diskTtlMs: isPast ? 365 * DAY : 0,
    timeoutMs: 12000,
  });
  return parseScenes(raw);
}

/** Scena -> potrzebne pasma. Duplikaty (ta sama data i kafel, inna wersja przetworzenia) – bierzemy najnowszą. */
export function parseScenes(raw) {
  const byKey = new Map();
  for (const f of raw?.features ?? []) {
    const a = f.assets ?? {};
    if (!a.red?.href || !a.nir?.href || !a.scl?.href) continue;
    const date = f.properties?.datetime?.slice(0, 10);
    const tile = f.properties?.['s2:mgrs_tile'] ?? f.id.split('_')[1];
    const version = Number(f.id.split('_')[3] ?? 0);
    const scene = {
      id: f.id,
      date,
      cloud: f.properties?.['eo:cloud_cover'] ?? null,
      epsg: f.properties?.['proj:epsg'],
      bands: {
        red: band(a.red),
        nir: band(a.nir),
        swir16: a.swir16?.href ? band(a.swir16) : null,
        green: a.green?.href ? band(a.green) : null,
        blue: a.blue?.href ? band(a.blue) : null,
        scl: { href: a.scl.href, scale: 1, offset: 0 },
      },
      version,
    };
    const key = `${date}_${tile}`;
    if (!byKey.has(key) || byKey.get(key).version < version) byKey.set(key, scene);
  }
  return [...byKey.values()].sort((x, y) => y.date.localeCompare(x.date));
}

function band(asset) {
  const rb = asset['raster:bands']?.[0] ?? {};
  return { href: asset.href, scale: rb.scale ?? 0.0001, offset: rb.offset ?? 0 };
}

const geomHash = (geometry) => createHash('sha1').update(JSON.stringify(geometry)).digest('hex').slice(0, 16);

/** Statystyki działki dla sceny. Najpierw maska SCL (mała), pasma dopiero gdy działka jest bezchmurna. */
export async function parcelStats(scene, geometry, { minClear = 0.5 } = {}) {
  return memoDisk(`s2:${scene.id}:${geomHash(geometry)}:${minClear}`, Infinity, () => computeStats(scene, geometry, minClear));
}

async function computeStats(scene, geometry, minClear) {
  const zone = Number(scene.epsg) - 32600;
  if (!(zone > 0 && zone < 61)) throw new Error(`Sentinel-2: nieobsługiwany układ EPSG:${scene.epsg}`);
  const polys = projectGeometry(geometry, (lat, lon) => toUtm(lat, lon, zone));

  // Siatka 20 m z pasma SCL (natywnie 20 m).
  const sclHeader = await openCog(scene.bands.scl.href);
  const sclLevel = levelForResolution(sclHeader, 20);
  const tr = levelTransform(sclHeader, sclLevel);
  const xs = polys.flatMap((p) => p[0].map((c) => c[0]));
  const ys = polys.flatMap((p) => p[0].map((c) => c[1]));
  const col0 = Math.floor((Math.min(...xs) - tr.x0) / tr.px) - 1;
  const col1 = Math.floor((Math.max(...xs) - tr.x0) / tr.px) + 1;
  const row0 = Math.floor((tr.y0 - Math.max(...ys)) / tr.py) - 1;
  const row1 = Math.floor((tr.y0 - Math.min(...ys)) / tr.py) + 1;
  if ((col1 - col0) * (row1 - row0) > 250_000) throw new Error('Sentinel-2: działka zbyt duża do szybkiej analizy');

  const scl = await readWindow(scene.bands.scl.href, sclLevel, col0, row0, col1, row1);
  const inside = [];
  for (let r = 0; r < scl.rows; r++) {
    for (let c = 0; c < scl.cols; c++) {
      const x = tr.x0 + (scl.col0 + c + 0.5) * tr.px;
      const y = tr.y0 - (scl.row0 + r + 0.5) * tr.py;
      if (pointInProjected(polys, x, y)) inside.push(r * scl.cols + c);
    }
  }
  // Działka mniejsza niż piksel – bierzemy piksel środkowy.
  if (!inside.length) inside.push(Math.floor(scl.rows / 2) * scl.cols + Math.floor(scl.cols / 2));
  const valid = inside.filter((k) => VALID_SCL.has(scl.data[k]));
  const clearFraction = valid.length / inside.length;
  const base = { sceneId: scene.id, date: scene.date, sceneCloud: scene.cloud, pixels: inside.length, clearFraction: round(clearFraction, 2) };
  if (clearFraction < minClear) return { ...base, clear: false };

  // Każde pasmo czytamy z poziomu najbliższego zadanej rozdzielczości i próbkujemy po współrzędnych
  // środka piksela SCL. B11 (SWIR) bierzemy z podglądu 40 m – kafel 20 m waży ponad 1 MB.
  const centers = valid.map((k) => {
    const r = Math.floor(k / scl.cols);
    const c = k % scl.cols;
    return [tr.x0 + (scl.col0 + c + 0.5) * tr.px, tr.y0 - (scl.row0 + r + 0.5) * tr.py];
  });
  const readBand = async (b, resM) => {
    const h = await openCog(b.href);
    const lvl = levelForResolution(h, resM);
    const t = levelTransform(h, lvl);
    const cs = centers.map(([x, y]) => [Math.floor((x - t.x0) / t.px), Math.floor((t.y0 - y) / t.py)]);
    const c0 = Math.min(...cs.map((p) => p[0]));
    const r0 = Math.min(...cs.map((p) => p[1]));
    const w = await readWindow(b.href, lvl, c0, r0, Math.max(...cs.map((p) => p[0])), Math.max(...cs.map((p) => p[1])));
    const dns = cs.map(([c, r]) => w.data[(r - w.row0) * w.cols + (c - w.col0)] || null); // 0 = nodata
    return dns.map((dn) => (dn == null ? null : dn * b.scale + effectiveOffset(dns, b)));
  };
  const [red, nir, swir] = await Promise.all([
    readBand(scene.bands.red, 20),
    readBand(scene.bands.nir, 20),
    scene.bands.swir16 ? readBand(scene.bands.swir16, 40) : null,
  ]);

  const ndvi = [];
  const ndmi = [];
  valid.forEach((k, i) => {
    const R = red[i];
    const N = nir[i];
    if (R != null && N != null && N + R > 0) ndvi.push((N - R) / (N + R));
    const S = swir?.[i];
    if (S != null && N != null && N + S > 0) ndmi.push((N - S) / (N + S));
  });
  return {
    ...base,
    clear: true,
    ndvi: ndvi.length ? round(median(ndvi), 3) : null,
    ndmi: ndmi.length ? round(median(ndmi), 3) : null,
    bareShare: round(valid.filter((k) => scl.data[k] === 5).length / valid.length, 2),
  };
}

/**
 * Prawdziwe obrazy z pasm Sentinel-2 dla wycinka wokół działki (margines ok. 160 m), piksel 20 m:
 * - kolory naturalne (B04, B03, B02) – "zdjęcie" z satelity,
 * - mapa zieloności NDVI ((B08 − B04) / (B08 + B04)), chmury i cienie wg SCL na szaro.
 * Obrys działki na żółto. PNG jako data URL (raport na stronie i w PDF).
 */
export async function sceneImages(scene, geometry) {
  if (!scene.bands.green || !scene.bands.blue) return null;
  return memoDisk(`s2img:${scene.id}:${geomHash(geometry)}`, Infinity, () => renderImages(scene, geometry));
}

async function renderImages(scene, geometry) {
  const zone = Number(scene.epsg) - 32600;
  const polys = projectGeometry(geometry, (lat, lon) => toUtm(lat, lon, zone));
  const sclHeader = await openCog(scene.bands.scl.href);
  const lvl = levelForResolution(sclHeader, 20);
  const tr = levelTransform(sclHeader, lvl);
  const xs = polys.flatMap((p) => p[0].map((c) => c[0]));
  const ys = polys.flatMap((p) => p[0].map((c) => c[1]));
  const M = 8; // margines w pikselach (8 × 20 m = 160 m)
  const col0 = Math.floor((Math.min(...xs) - tr.x0) / tr.px) - M;
  const col1 = Math.floor((Math.max(...xs) - tr.x0) / tr.px) + M;
  const row0 = Math.floor((tr.y0 - Math.max(...ys)) / tr.py) - M;
  const row1 = Math.floor((tr.y0 - Math.min(...ys)) / tr.py) + M;
  if (col1 - col0 > 220 || row1 - row0 > 220) return null; // bardzo duża działka – bez obrazu

  const win = async (b) => {
    const h = await openCog(b.href);
    const l = levelForResolution(h, 20);
    const t = levelTransform(h, l);
    if (Math.abs(t.px - tr.px) > 0.01 || Math.abs(t.x0 - tr.x0) > 0.01 || Math.abs(t.y0 - tr.y0) > 0.01) throw new Error('Sentinel-2: niezgodne siatki pasm');
    const w = await readWindow(b.href, l, col0, row0, col1, row1);
    const dns = Array.from(w.data, (v) => v || null);
    const off = effectiveOffset(dns, b);
    return { ...w, refl: dns.map((v) => (v == null ? null : v * b.scale + off)) };
  };
  const [scl, red, green, blue, nir] = await Promise.all([
    readWindow(scene.bands.scl.href, lvl, col0, row0, col1, row1),
    win(scene.bands.red),
    win(scene.bands.green),
    win(scene.bands.blue),
    win(scene.bands.nir),
  ]);
  const { cols, rows } = scl;
  const n = cols * rows;
  const rgb = new Uint8Array(n * 3);
  const veg = new Uint8Array(n * 3);
  const tone = (v) => (v == null ? 0 : Math.round(255 * Math.min(1, Math.max(0, v * 3.2)) ** (1 / 1.3)));
  for (let k = 0; k < n; k++) {
    rgb[k * 3] = tone(red.refl[k]);
    rgb[k * 3 + 1] = tone(green.refl[k]);
    rgb[k * 3 + 2] = tone(blue.refl[k]);
    const c = scl.data[k];
    let col;
    if ([3, 8, 9, 10].includes(c)) col = [205, 205, 212]; // chmura / cień
    else if (c === 6) col = [70, 120, 200]; // woda
    else {
      const R = red.refl[k];
      const N = nir.refl[k];
      col = R != null && N != null && N + R > 0 ? ndviColor((N - R) / (N + R)) : [205, 205, 212];
    }
    veg.set(col, k * 3);
  }
  const outline = polys.flatMap((p) => p.map((ring) => ring.map(([x, y]) => [(x - (tr.x0 + scl.col0 * tr.px)) / tr.px, (tr.y0 - scl.row0 * tr.py - y) / tr.py])));
  const factor = Math.max(2, Math.min(16, Math.floor(320 / Math.max(cols, rows))));
  const a = upscaleWithOutline(rgb, cols, rows, factor, outline);
  const b = upscaleWithOutline(veg, cols, rows, factor, outline, [20, 20, 20]);
  return {
    sceneId: scene.id,
    date: scene.date,
    pixelM: Math.round(tr.px),
    widthM: Math.round(cols * tr.px),
    heightM: Math.round(rows * tr.py),
    rgb: pngDataUrl(a.rgb, a.w, a.h),
    ndvi: pngDataUrl(b.rgb, b.w, b.h),
  };
}

// Skala NDVI: gleba/brak roślin (brąz) -> słaba roślinność (żółty) -> bujna (ciemna zieleń).
const NDVI_STOPS = [
  [0, [150, 110, 80]],
  [0.2, [205, 175, 105]],
  [0.4, [235, 220, 120]],
  [0.6, [140, 195, 95]],
  [0.8, [35, 125, 55]],
];
export function ndviColor(v) {
  if (v <= NDVI_STOPS[0][0]) return NDVI_STOPS[0][1];
  for (let i = 1; i < NDVI_STOPS.length; i++) {
    const [x1, c1] = NDVI_STOPS[i];
    const [x0, c0] = NDVI_STOPS[i - 1];
    if (v <= x1) {
      const t = (v - x0) / (x1 - x0);
      return c0.map((c, j) => Math.round(c + (c1[j] - c) * t));
    }
  }
  return NDVI_STOPS.at(-1)[1];
}

/**
 * Od 2022 r. (baseline 04.00) ESA dodaje do DN +1000, a STAC podaje offset −0,1. Sprawdzone na scenie
 * S2B_33UXT_20250812: DN czerwieni nad roślinnością ~400–800, czyli dane w tym katalogu są już bez
 * przesunięcia – zastosowanie offsetu dałoby ujemne odbicie. Dlatego offset stosujemy tylko wtedy,
 * gdy wszystkie DN na działce są ≥ 1000 (inaczej offset nie mógł zostać dodany).
 */
export function effectiveOffset(dns, band) {
  if (!band.offset || band.offset >= 0) return band.offset ?? 0;
  const shift = -band.offset / band.scale; // np. 1000
  const vals = dns.filter((v) => v != null);
  return vals.length && Math.min(...vals) >= shift ? band.offset : 0;
}

const round = (x, d) => Math.round(x * 10 ** d) / 10 ** d;
function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Najświeższa bezchmurna scena w oknie [date − daysBack, date]. Próbuje kolejnych scen. */
export async function latestClear(geometry, center, date, { daysBack = 30, maxTries = 4 } = {}) {
  const scenes = await searchScenes({ ...center, from: addDays(date, -daysBack), to: date, maxCloud: 80 });
  let tried = 0;
  for (const s of scenes) {
    if (tried >= maxTries) break;
    tried++;
    try {
      const st = await parcelStats(s, geometry);
      if (st.clear) {
        // Obraz to dodatek – jego brak nie psuje analizy. Ma własny limit czasu; gdy nie zdąży,
        // liczy się dalej w tle i trafia do cache na następny raport.
        const images = await Promise.race([
          sceneImages(s, geometry).catch(() => null),
          new Promise((resolve) => setTimeout(() => resolve(null), Number(process.env.S2_IMAGE_BUDGET_MS) || 6000)),
        ]);
        return { ...st, tried, candidates: scenes.length, images };
      }
    } catch {
      /* uszkodzona scena – próbujemy następnej */
    }
  }
  return { clear: false, tried, candidates: scenes.length };
}

/** To samo okno (±halfWindow dni) w poprzednich latach – odniesienie dla anomalii. */
export async function sameWindowPastYears(geometry, center, date, { years = 6, halfWindow = 15, firstYear = 2018 } = {}) {
  const y0 = Number(date.slice(0, 4));
  const tasks = [];
  for (let y = y0 - 1; y >= Math.max(firstYear, y0 - years); y--) {
    const d = `${y}${date.slice(4)}`;
    tasks.push((async () => {
      const scenes = (await searchScenes({ ...center, from: addDays(d, -halfWindow), to: addDays(d, halfWindow), maxCloud: 50 }))
        .sort((a, b) => (a.cloud ?? 100) - (b.cloud ?? 100));
      for (const s of scenes.slice(0, 2)) {
        try {
          const st = await parcelStats(s, geometry);
          if (st.clear) return { year: y, ...st };
        } catch {
          /* próbujemy następnej */
        }
      }
      return { year: y, clear: false };
    })());
  }
  const res = await Promise.allSettled(tasks);
  return res.filter((r) => r.status === 'fulfilled').map((r) => r.value);
}
