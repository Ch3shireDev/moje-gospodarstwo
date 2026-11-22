import { cachedFetch } from '../http.js';
import { env as processEnv } from '../platform.js';

// Open-Meteo: prognoza (z dniami wstecz) i archiwum reanalizy ERA5 / ERA5-Land.
// Licencja danych CC BY 4.0, darmowe API do użytku niekomercyjnego (patrz README).
// Limity: zapytanie o > 2 tygodnie danych liczy się jako kilka zapytań, dlatego archiwum
// pobieramy rocznymi blokami i trzymamy na dysku – dane z przeszłości się nie zmieniają.

const DAILY_FORECAST = [
  'precipitation_sum',
  'precipitation_probability_max',
  'et0_fao_evapotranspiration',
  'temperature_2m_max',
  'temperature_2m_min',
  'wind_speed_10m_max',
];
const DAILY_ARCHIVE = ['precipitation_sum', 'et0_fao_evapotranspiration', 'temperature_2m_max', 'temperature_2m_min'];
const SOIL_FORECAST = { top: 'soil_moisture_3_to_9cm', deep: 'soil_moisture_27_to_81cm', labels: { top: '3–9 cm', deep: '27–81 cm' } };
const DAY = 24 * 3600_000;

export const ATTRIBUTION = { name: 'Open-Meteo.com', url: 'https://open-meteo.com/', licence: 'CC BY 4.0' };

// Adresy API. Domyślnie darmowe (limit na IP: 600/min, 5 000/h, 10 000/dobę).
// OPEN_METEO_API_KEY – klucz planu komercyjnego: zapytania idą na serwery "customer-" bez limitu na IP.
// OPEN_METEO_FORECAST_URL / OPEN_METEO_ARCHIVE_URL – własna instancja Open-Meteo (np. http://localhost:8080).
export function endpoints(env = processEnv) {
  const key = env.OPEN_METEO_API_KEY?.trim();
  const forecast = env.OPEN_METEO_FORECAST_URL?.replace(/\/$/, '') || (key ? 'https://customer-api.open-meteo.com' : 'https://api.open-meteo.com');
  const archive = env.OPEN_METEO_ARCHIVE_URL?.replace(/\/$/, '') || (key ? 'https://customer-archive-api.open-meteo.com' : 'https://archive-api.open-meteo.com');
  return { forecast: `${forecast}/v1/forecast`, archive: `${archive}/v1/archive`, key };
}
const withKey = (params, key) => {
  if (key) params.set('apikey', key);
  return params;
};

/** Prognoza + pastDays dni wstecz (maks. 92). Wilgotność gleby tylko z bieżącej godziny. */
export async function getForecast(lat, lon, { pastDays = 14, forecastDays = 7 } = {}) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(3),
    longitude: lon.toFixed(3),
    daily: DAILY_FORECAST.join(','),
    hourly: [SOIL_FORECAST.top, SOIL_FORECAST.deep].join(','),
    past_days: String(Math.min(92, Math.max(0, pastDays))),
    forecast_days: String(Math.min(16, Math.max(1, forecastDays))),
    timezone: 'Europe/Warsaw',
    wind_speed_unit: 'kmh',
  });
  const ep = endpoints();
  const raw = await cachedFetch(`${ep.forecast}?${withKey(params, ep.key)}`, { ttlMs: 30 * 60_000, timeoutMs: 12000 });
  const now = new Date(Date.now() + (raw.utc_offset_seconds ?? 3600) * 1000).toISOString();
  return {
    days: dailyRows(raw),
    soilNow: soilNow(raw.hourly, SOIL_FORECAST, now.slice(0, 13)),
    elevation: raw.elevation ?? null,
    model: 'prognoza Open-Meteo (best match)',
  };
}

/** Archiwum dobowe dla jednego roku kalendarzowego (lub jego części do `end`). */
export async function getArchiveYear(lat, lon, year, end) {
  const start = `${year}-01-01`;
  const last = end && end < `${year}-12-31` ? end : `${year}-12-31`;
  const params = new URLSearchParams({
    // Zaokrąglenie do ~5 km: sąsiednie działki trafiają w tę samą komórkę ERA5-Land (~9 km) i w ten sam cache.
    latitude: (Math.round(lat * 20) / 20).toFixed(2),
    longitude: (Math.round(lon * 20) / 20).toFixed(2),
    start_date: start,
    end_date: last,
    daily: DAILY_ARCHIVE.join(','),
    timezone: 'Europe/Warsaw',
  });
  const complete = last === `${year}-12-31`;
  const ep = endpoints();
  const raw = await cachedFetch(`${ep.archive}?${withKey(params, ep.key)}`, {
    ttlMs: DAY,
    diskTtlMs: complete ? Infinity : DAY,
    timeoutMs: 15000,
  });
  return dailyRows(raw);
}

export function dailyRows(raw) {
  const d = raw.daily ?? {};
  const pick = (key, i) => (d[key] && d[key][i] != null ? Number(d[key][i]) : null);
  return (d.time ?? []).map((date, i) => ({
    date,
    rain: pick('precipitation_sum', i),
    rainProb: pick('precipitation_probability_max', i),
    et0: pick('et0_fao_evapotranspiration', i),
    tmax: pick('temperature_2m_max', i),
    tmin: pick('temperature_2m_min', i),
    windMax: pick('wind_speed_10m_max', i),
  }));
}

// Wilgotność bierzemy TYLKO z bieżącej godziny. Dalsza część szeregu skacze przy
// przełączaniu modeli (best_match), więc przyszłość liczymy z bilansu wodnego.
export function soilNow(hourly, soil, nowHour) {
  if (!hourly?.time) return null;
  let idx = hourly.time.findIndex((t) => t.startsWith(nowHour));
  if (idx === -1) idx = hourly.time.findLastIndex((t) => t.slice(0, 13) <= nowHour);
  if (idx === -1) return null;
  const val = (key) => (hourly[key]?.[idx] != null ? Number(hourly[key][idx]) : null);
  return { at: hourly.time[idx], top: val(soil.top), deep: val(soil.deep), labels: soil.labels };
}

// Zgodność wsteczna z testami na fixturze z Postmana.
export function normalize(raw, { soil, today, nowHour }) {
  const days = dailyRows(raw).map((r) => ({ ...r, past: r.date < today, isToday: r.date === today }));
  return { location: { lat: raw.latitude, lon: raw.longitude, elevation: raw.elevation ?? null }, today, days, soil: soilNow(raw.hourly, soil, nowHour) };
}
