import { cachedFetch } from '../http.js';
import { bboxOf, polygonsOf, pointInProjected, to2180 } from '../geo.js';

// Numeryczny Model Terenu GUGiK (usługa GetHByPointList, wysokości w m n.p.m., układ PUWG 1992).
// Siatka punktów na działce -> spadek (płaszczyzna dopasowana MNK), deniwelacja, kierunek spływu,
// lokalne obniżenia (miejsca, gdzie woda naturalnie się zbiera).
const BASE = 'https://services.gugik.gov.pl/nmt/';
const DAY = 24 * 3600_000;

export const ATTRIBUTION = { name: 'GUGiK – Numeryczny Model Terenu', url: 'https://www.geoportal.gov.pl/' };

export function parsePointList(text) {
  return String(text)
    .trim()
    .split(',')
    .map((s) => s.trim().split(/\s+/).map(Number))
    .filter((a) => a.length >= 3 && a.every(Number.isFinite))
    .map(([x, y, h]) => ({ x, y, h }));
}

/** Siatka n×n w obrysie bboxa działki (punkty spoza działki oznaczone inside=false – przydają się do kontekstu). */
export function buildGrid(geometry, n = 9) {
  const b = bboxOf(geometry);
  const polys = polygonsOf(geometry);
  const pts = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const lat = b.minLat + (i / (n - 1)) * (b.maxLat - b.minLat);
      const lon = b.minLon + (j / (n - 1)) * (b.maxLon - b.minLon);
      const p = to2180(lat, lon);
      pts.push({ i, j, lat, lon, x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, inside: pointInProjected(polys, lon, lat) });
    }
  }
  return pts;
}

export async function getTerrain(geometry) {
  const grid = buildGrid(geometry, 9);
  const list = grid.map((p) => `${p.x} ${p.y}`).join(',');
  const text = await cachedFetch(`${BASE}?request=GetHByPointList&list=${encodeURIComponent(list)}`, {
    as: 'text',
    ttlMs: DAY,
    diskTtlMs: 365 * DAY,
    timeoutMs: 12000,
  });
  const heights = parsePointList(text);
  if (heights.length < grid.length * 0.5) throw new Error('NMT: za mało punktów w odpowiedzi');
  // Odpowiedź jest w tej samej kolejności co zapytanie.
  grid.forEach((p, k) => (p.h = heights[k]?.h ?? null));
  return analyzeTerrain(grid, 9);
}

export function analyzeTerrain(grid, n) {
  const pts = grid.filter((p) => p.h != null && p.h > -50);
  const inside = pts.filter((p) => p.inside);
  const use = inside.length >= 4 ? inside : pts;
  if (use.length < 4) throw new Error('NMT: brak wysokości');

  // Płaszczyzna h = a + b·E + c·N (E = y, N = x w konwencji geodezyjnej), MNK.
  const mE = mean(use.map((p) => p.y));
  const mN = mean(use.map((p) => p.x));
  const mH = mean(use.map((p) => p.h));
  let see = 0, snn = 0, sen = 0, seh = 0, snh = 0;
  for (const p of use) {
    const e = p.y - mE, nn = p.x - mN, h = p.h - mH;
    see += e * e; snn += nn * nn; sen += e * nn; seh += e * h; snh += nn * h;
  }
  const det = see * snn - sen * sen;
  const b = det ? (seh * snn - snh * sen) / det : 0;
  const c = det ? (snh * see - seh * sen) / det : 0;
  const slopePct = Math.hypot(b, c) * 100;
  // Kierunek, w którym teren opada (azymut od północy).
  const downAz = (Math.atan2(-b, -c) * 180) / Math.PI;
  const azimuth = (downAz + 360) % 360;

  const hs = use.map((p) => p.h);
  const min = Math.min(...hs);
  const max = Math.max(...hs);
  const lowest = use.find((p) => p.h === min);

  // Lokalne obniżenia: punkt wewnątrz działki niższy od wszystkich sąsiadów w siatce o > 0,2 m.
  const at = (i, j) => grid.find((p) => p.i === i && p.j === j && p.h != null);
  const depressions = [];
  for (const p of inside) {
    const nb = [];
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) if (di || dj) {
      const q = at(p.i + di, p.j + dj);
      if (q) nb.push(q.h);
    }
    if (nb.length >= 5 && nb.every((h) => h - p.h > 0.2)) depressions.push({ lat: p.lat, lon: p.lon, h: p.h, depthM: Math.round((Math.min(...nb) - p.h) * 100) / 100 });
  }

  return {
    slopePct: Math.round(slopePct * 10) / 10,
    downslope: compass(azimuth),
    downslopeAzimuth: Math.round(azimuth),
    reliefM: Math.round((max - min) * 10) / 10,
    minH: min,
    maxH: max,
    meanH: Math.round(mH * 10) / 10,
    lowest: lowest ? { lat: lowest.lat, lon: lowest.lon, h: lowest.h } : null,
    depressions,
    samples: use.length,
  };
}

const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;

function compass(az) {
  const names = ['północ', 'północny wschód', 'wschód', 'południowy wschód', 'południe', 'południowy zachód', 'zachód', 'północny zachód'];
  return names[Math.round(az / 45) % 8];
}
