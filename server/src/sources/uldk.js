import { cachedFetch } from '../http.js';

// ULDK (GUGiK) odpowiada tekstem:
// - GetParcelById / GetParcelByXY / GetCommuneByXY: 1. linia = status (0 = OK, -1 = błąd), 2. linia = pola "|".
// - GetParcelByIdOrNr: 1. linia = LICZBA wyników, kolejne linie = wyniki.
const BASE = 'https://uldk.gugik.gov.pl/';
const PARCEL_FIELDS = 'id,parcel,region,commune,county,voivodeship,geom_wkt';
const DAY = 24 * 3600_000;

export class ParcelNotFound extends Error {}

export function parseUldk(text) {
  const lines = String(text).trim().split(/\r?\n/);
  const status = lines[0]?.trim();
  if (status !== '0' || !lines[1]) {
    throw new ParcelNotFound(`ULDK: ${lines.slice(1).join(' ').replace(/błędny format.*$/i, '').trim() || 'brak wyników'}`);
  }
  return lines[1].split('|').map((s) => s.trim());
}

/** GetParcelByIdOrNr: lista wyników (może być kilka działek o tym samym numerze w obrębach o tej samej nazwie). */
export function parseUldkList(text) {
  const lines = String(text).trim().split(/\r?\n/).map((l) => l.trim());
  const count = Number(lines[0]);
  if (!Number.isFinite(count) || count < 1) throw new ParcelNotFound('ULDK: nie znaleziono działki');
  return lines.slice(1).filter(Boolean).map((l) => l.split('|').map((s) => s.trim()));
}

/** Gmina, powiat, województwo + kod powiatu (pierwsze 4 znaki TERYT gminy). */
export async function getCommune(lat, lon) {
  const url = `${BASE}?request=GetCommuneByXY&xy=${lon},${lat},4326&result=teryt,commune,county,voivodeship`;
  const text = await cachedFetch(url, { as: 'text', ttlMs: DAY, diskTtlMs: 30 * DAY });
  return communeFromFields(parseUldk(text));
}

export function communeFromFields([teryt, commune, county, voivodeship]) {
  return { teryt, countyCode: teryt?.slice(0, 4) ?? null, commune, county, voivodeship };
}

/**
 * Identyfikator działki (TERYT), np. 302502_2.0009.387: WWPPGG_R.OOOO.NR
 * (WWPPGG_R = gmina, OOOO = obręb, NR = numer działki, czasem z arkuszem mapy AR_x).
 */
export const PARCEL_ID_RE = /^\d{6}_\d\.\d{4}\.\S+$/;

export function parcelFromFields([id, number, region, commune, county, voivodeship, wkt]) {
  const terytGminy = id?.split('.')[0] ?? null;
  return {
    id,
    number,
    region,
    commune,
    county,
    voivodeship,
    teryt: terytGminy,
    countyCode: terytGminy?.slice(0, 4) ?? null,
    geometry: wkt ? wktToGeoJSON(wkt) : null,
  };
}

/** Działka po pełnym identyfikatorze. */
export async function getParcelById(id) {
  const url = `${BASE}?request=GetParcelById&id=${encodeURIComponent(id)}&result=${PARCEL_FIELDS}&srid=4326`;
  const text = await cachedFetch(url, { as: 'text', ttlMs: DAY, diskTtlMs: 30 * DAY, timeoutMs: 12000 });
  return parcelFromFields(parseUldk(text));
}

/** Działka po "nazwa obrębu + numer" (np. "Sulęcin 387") albo po identyfikatorze. Może zwrócić kilka. */
export async function searchParcels(query) {
  const url = `${BASE}?request=GetParcelByIdOrNr&id=${encodeURIComponent(query)}&result=${PARCEL_FIELDS}&srid=4326`;
  const text = await cachedFetch(url, { as: 'text', ttlMs: DAY, diskTtlMs: 30 * DAY, timeoutMs: 12000 });
  return parseUldkList(text).map(parcelFromFields);
}

/** Działka ewidencyjna pod punktem. */
export async function getParcel(lat, lon) {
  const url = `${BASE}?request=GetParcelByXY&xy=${lon},${lat},4326&result=${PARCEL_FIELDS}&srid=4326`;
  const text = await cachedFetch(url, { as: 'text', ttlMs: DAY, diskTtlMs: 30 * DAY, timeoutMs: 12000 });
  return parcelFromFields(parseUldk(text));
}

/** Prosty parser WKT (POLYGON / MULTIPOLYGON) -> GeoJSON w lon/lat. */
export function wktToGeoJSON(wkt) {
  const body = String(wkt).replace(/^SRID=\d+;/i, '').trim();
  const open = body.indexOf('(');
  if (open === -1) return null;
  const type = body.slice(0, open).trim().toUpperCase();
  const s = body.slice(open).replace(/\s*([(),])\s*/g, '$1');

  const ring = (str) => str.split(',').map((pt) => pt.trim().split(/\s+/).slice(0, 2).map(Number));
  const polygon = (str) => str.split('),(').map(ring);

  let geometry;
  if (type === 'POLYGON') geometry = { type: 'Polygon', coordinates: polygon(s.slice(2, -2)) };
  else if (type === 'MULTIPOLYGON') geometry = { type: 'MultiPolygon', coordinates: s.slice(3, -3).split(')),((').map(polygon) };
  else return null;

  // EPSG:4326 bywa podawany jako lat,lon. Polska: lon 14–24, lat 49–55, więc łatwo wykryć.
  const all = flatten(geometry);
  const [x0, y0] = all[0] ?? [];
  if (x0 > 48 && x0 < 56 && y0 > 13 && y0 < 25) all.forEach((p) => p.reverse());

  const inPoland = all.every(([x, y]) => x > 13 && x < 25 && y > 48 && y < 56);
  return inPoland ? geometry : null; // np. przyszło w EPSG:2180 (metry) – wtedy odpuszczamy obrys
}

function flatten(geometry) {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polys.flat(2); // lista punktów [x, y] (te same referencje, więc reverse() działa w miejscu)
}
