// Geometria bez bibliotek: odwzorowanie poprzeczne Mercatora (PUWG 1992 i UTM),
// pole, środek i punkty wewnątrz działki. Wzory: Snyder, "Map Projections – A Working Manual" (USGS 1987).

const A = 6378137; // GRS80 / WGS84 – różnica w spłaszczeniu jest pomijalna na potrzeby działki
const F = 1 / 298.257222101;

function transverseMercator(lat, lon, { lon0Deg, k0, fe, fn }) {
  const e2 = F * (2 - F);
  const ep2 = e2 / (1 - e2);
  const phi = (lat * Math.PI) / 180;
  const lam = (lon * Math.PI) / 180;
  const lon0 = (lon0Deg * Math.PI) / 180;
  const N = A / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const T = Math.tan(phi) ** 2;
  const C = ep2 * Math.cos(phi) ** 2;
  const Aa = Math.cos(phi) * (lam - lon0);
  const e4 = e2 * e2;
  const e6 = e4 * e2;
  const M =
    A *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi));
  const easting = k0 * N * (Aa + ((1 - T + C) * Aa ** 3) / 6 + ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * Aa ** 5) / 120) + fe;
  const northing =
    k0 * (M + N * Math.tan(phi) * ((Aa * Aa) / 2 + ((5 - T + 9 * C + 4 * C * C) * Aa ** 4) / 24 + ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * Aa ** 6) / 720)) + fn;
  return { easting, northing };
}

/** WGS84 -> PUWG 1992 (EPSG:2180). Zwraca też konwencję geodezyjną: x = północ, y = wschód. */
export function to2180(lat, lon) {
  const { easting, northing } = transverseMercator(lat, lon, { lon0Deg: 19, k0: 0.9993, fe: 500000, fn: -5300000 });
  return { e: easting, n: northing, x: northing, y: easting };
}

/** WGS84 -> UTM na półkuli północnej (EPSG:326xx). */
export function toUtm(lat, lon, zone) {
  const { easting, northing } = transverseMercator(lat, lon, { lon0Deg: zone * 6 - 183, k0: 0.9996, fe: 500000, fn: 0 });
  return { e: easting, n: northing };
}

export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Lista wielokątów: każdy to tablica pierścieni [[lon, lat], ...]. Pierwszy pierścień = obrys, reszta = dziury. */
export function polygonsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

export function bboxOf(geometry) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const poly of polygonsOf(geometry)) {
    for (const [lon, lat] of poly[0]) {
      minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon);
      minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat);
    }
  }
  return { minLon, minLat, maxLon, maxLat };
}

/** Rzut geometrii do układu metrycznego podaną funkcją (lat, lon) -> {e, n}. */
export function projectGeometry(geometry, project) {
  return polygonsOf(geometry).map((poly) => poly.map((ring) => ring.map(([lon, lat]) => {
    const p = project(lat, lon);
    return [p.e, p.n];
  })));
}

function ringArea(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) s += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  return s / 2;
}

/** Pole w m² (w PUWG 1992 zniekształcenie skali to maks. ok. ±0,1%, pomijalne dla działki). */
export function areaM2(geometry) {
  let total = 0;
  for (const poly of projectGeometry(geometry, to2180)) {
    total += Math.abs(ringArea(poly[0]));
    for (const hole of poly.slice(1)) total -= Math.abs(ringArea(hole));
  }
  return total;
}

/** Czy punkt (w tym samym układzie co pierścienie) leży wewnątrz wielokąta z dziurami. Ray casting. */
export function pointInProjected(polys, x, y) {
  for (const poly of polys) {
    let inside = false;
    for (const ring of poly) {
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
    }
    if (inside) return true;
  }
  return false;
}

/** Środek działki: środek bboxa, a jeśli wypada poza działką – najbliższy punkt siatki wewnątrz. */
export function interiorPoint(geometry) {
  const b = bboxOf(geometry);
  const c = { lat: (b.minLat + b.maxLat) / 2, lon: (b.minLon + b.maxLon) / 2 };
  const polys = polygonsOf(geometry);
  const test = (lat, lon) => pointInProjected(polys, lon, lat);
  if (test(c.lat, c.lon)) return c;
  const pts = gridPoints(geometry, 10);
  if (!pts.length) return c;
  return pts.reduce((best, p) => (Math.hypot(p.lat - c.lat, p.lon - c.lon) < Math.hypot(best.lat - c.lat, best.lon - c.lon) ? p : best));
}

/** Regularna siatka punktów wewnątrz działki (maks. ok. n×n), w WGS84. */
export function gridPoints(geometry, n = 8) {
  const b = bboxOf(geometry);
  const polys = polygonsOf(geometry);
  const out = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const lat = b.minLat + ((i + 0.5) / n) * (b.maxLat - b.minLat);
      const lon = b.minLon + ((j + 0.5) / n) * (b.maxLon - b.minLon);
      if (pointInProjected(polys, lon, lat)) out.push({ lat, lon, i, j });
    }
  }
  return out;
}

/** Odległość punktu od odcinka (w metrach, układ metryczny). */
export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Najmniejsza odległość [m] między obrysem działki a linią [[lon, lat], ...]. 0, gdy linia przecina działkę. */
export function distanceToLineM(geometry, line) {
  const polys = projectGeometry(geometry, to2180);
  const pts = line.map(([lon, lat]) => {
    const p = to2180(lat, lon);
    return [p.e, p.n];
  });
  if (pts.some(([x, y]) => pointInProjected(polys, x, y))) return 0;
  let best = Infinity;
  for (const poly of polys) {
    for (const ring of poly) {
      for (const [x, y] of ring) {
        for (let i = 1; i < pts.length; i++) best = Math.min(best, distToSegment(x, y, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
      }
      for (const [x, y] of pts) {
        for (let i = 1; i < ring.length; i++) best = Math.min(best, distToSegment(x, y, ring[i - 1][0], ring[i - 1][1], ring[i][0], ring[i][1]));
      }
    }
  }
  return best;
}

/** Kwadrat ok. sizeM×sizeM wokół punktu jako geometria (gdy nie ma obrysu działki). */
export function squareAround(lat, lon, sizeM = 100) {
  const dLat = sizeM / 2 / 111_320;
  const dLon = sizeM / 2 / (111_320 * Math.cos((lat * Math.PI) / 180));
  return {
    type: 'Polygon',
    coordinates: [[[lon - dLon, lat - dLat], [lon + dLon, lat - dLat], [lon + dLon, lat + dLat], [lon - dLon, lat + dLat], [lon - dLon, lat - dLat]]],
  };
}
