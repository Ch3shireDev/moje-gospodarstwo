import { cachedFetch } from '../http.js';
import { et0Hargreaves, et0PenmanMonteith } from '../et0.js';

// NASA POWER (reanaliza MERRA-2 i dane satelitarne CERES, siatka ok. 0,5° × 0,625°).
// Zapasowe źródło historii pogody, gdy Open-Meteo odmawia (np. limit zapytań).
// Dane bezpłatne, bez klucza i bez ograniczeń komercyjnych; NASA prosi o podanie źródła.
// POWER nie podaje ET0, więc liczymy je sami: FAO-56 Penman-Monteith albo Hargreaves, gdy brakuje promieniowania.

const PARAMS = 'PRECTOTCORR,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN';
const DAY = 24 * 3600_000;
const FILL = -999;

export const ATTRIBUTION = { name: 'NASA POWER', url: 'https://power.larc.nasa.gov/', licence: 'dane NASA – bez ograniczeń, z podaniem źródła' };

export async function getYear(lat, lon, year, end) {
  const last = end && end < `${year}-12-31` ? end : `${year}-12-31`;
  const url =
    `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=${PARAMS}&community=AG` +
    `&longitude=${lon.toFixed(2)}&latitude=${lat.toFixed(2)}&start=${year}0101&end=${last.replaceAll('-', '')}&format=JSON`;
  const complete = last === `${year}-12-31`;
  const raw = await cachedFetch(url, { ttlMs: DAY, diskTtlMs: complete ? Infinity : DAY, timeoutMs: 25000 });
  return powerRows(raw, lat);
}

export function powerRows(raw, lat) {
  const p = raw?.properties?.parameter ?? {};
  const z = raw?.geometry?.coordinates?.[2] ?? 100;
  const v = (key, k) => {
    const x = p[key]?.[k];
    return x == null || x === FILL ? null : Number(x);
  };
  return Object.keys(p.PRECTOTCORR ?? {}).sort().map((k) => {
    const date = `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
    const tmax = v('T2M_MAX', k);
    const tmin = v('T2M_MIN', k);
    const rh = v('RH2M', k);
    const u2 = v('WS2M', k);
    const rs = v('ALLSKY_SFC_SW_DWN', k);
    let et0 = null;
    let et0Method = null;
    if (tmax != null && tmin != null) {
      if (rh != null && u2 != null && rs != null) {
        et0 = et0PenmanMonteith({ tmax, tmin, rhMean: rh, u2, rs, latDeg: lat, isoDate: date, z });
        et0Method = 'pm';
      } else {
        et0 = et0Hargreaves({ tmax, tmin, latDeg: lat, isoDate: date });
        et0Method = 'hargreaves';
      }
    }
    return { date, rain: v('PRECTOTCORR', k), et0: et0 == null ? null : Math.round(et0 * 100) / 100, et0Method, tmax, tmin, rainProb: null, windMax: null };
  }).filter((r) => r.rain != null || r.et0 != null);
}
