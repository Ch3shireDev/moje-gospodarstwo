// Składa szereg dobowy pogody dla punktu: archiwum (10+ lat) + ostatnie dni i prognoza.
// Kolejność źródeł: Open-Meteo (ERA5/ERA5-Land, prognoza) -> NASA POWER (zapas dla przeszłości).
import * as openMeteoDefault from './sources/openMeteo.js';
import * as nasaPowerDefault from './sources/nasaPower.js';

export const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86_400_000);

// Archiwum ERA5 w Open-Meteo ma opóźnienie ok. 5 dni.
const ARCHIVE_LAG_DAYS = 6;

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function archiveYears(src, lat, lon, start, end) {
  const years = [];
  for (let y = Number(start.slice(0, 4)); y <= Number(end.slice(0, 4)); y++) years.push(y);
  const chunks = await mapLimit(years, 4, (y) => src.fetch(lat, lon, y, end));
  return chunks.flat().filter((r) => r.date >= start && r.date <= end);
}

/**
 * @returns {{ days, sources: string[], notes: string[], soilNow, forecastUsed: boolean }}
 * days: [{ date, rain, et0, tmax, tmin, windMax, rainProb, kind: 'archiwum'|'ostatnie'|'prognoza' }]
 */
export async function getWeatherSeries({ lat, lon, start, end, today }, deps = {}) {
  const openMeteo = deps.openMeteo ?? openMeteoDefault;
  const nasaPower = deps.nasaPower ?? nasaPowerDefault;
  const notes = [];
  const sources = [];
  const archiveEnd = [end, addDays(today, -ARCHIVE_LAG_DAYS)].sort()[0];
  let days = [];

  if (start <= archiveEnd) {
    try {
      days = await archiveYears({ fetch: (la, lo, y, e) => openMeteo.getArchiveYear(la, lo, y, e) }, lat, lon, start, archiveEnd);
      sources.push('Open-Meteo – archiwum ERA5 / ERA5-Land');
    } catch (err) {
      notes.push(`Archiwum Open-Meteo niedostępne (${err.message}). Historia pogody z NASA POWER (MERRA-2, siatka ok. 50 km, ET0 policzone przez nas wg FAO-56).`);
      days = await archiveYears({ fetch: (la, lo, y, e) => nasaPower.getYear(la, lo, y, e) }, lat, lon, start, archiveEnd);
      sources.push('NASA POWER – MERRA-2 (zapasowo)');
    }
    days = days.map((d) => ({ ...d, kind: 'archiwum' }));
  }

  let soilNowValue = null;
  let forecastUsed = false;
  const recentStart = addDays(archiveEnd, 1);
  if (end >= recentStart) {
    const pastDays = Math.max(0, daysBetween(recentStart, today));
    const forecastDays = Math.max(1, daysBetween(today, end) + 1);
    try {
      const fc = await openMeteo.getForecast(lat, lon, { pastDays: Math.min(pastDays, 92), forecastDays: Math.min(forecastDays, 16) });
      const fresh = fc.days
        .filter((d) => d.date >= recentStart && d.date <= end)
        .map((d) => ({ ...d, kind: d.date < today ? 'ostatnie' : 'prognoza' }));
      days = days.concat(fresh);
      soilNowValue = fc.soilNow;
      forecastUsed = fresh.some((d) => d.kind === 'prognoza');
      sources.push('Open-Meteo – prognoza i ostatnie dni');
    } catch (err) {
      notes.push(`Prognoza Open-Meteo niedostępna (${err.message}). Brak prognozy na najbliższe dni.`);
      try {
        const lastDays = await archiveYears({ fetch: (la, lo, y, e) => nasaPower.getYear(la, lo, y, e) }, lat, lon, recentStart, [end, today].sort()[0]);
        days = days.concat(lastDays.map((d) => ({ ...d, kind: 'ostatnie' })));
        if (lastDays.length) sources.push('NASA POWER – ostatnie dni (zapasowo)');
      } catch {
        notes.push('Brak danych pogodowych z ostatnich dni.');
      }
    }
  }

  // Dedup i sortowanie (na styku archiwum i prognozy).
  const byDate = new Map();
  for (const d of days) byDate.set(d.date, d);
  days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { days, sources: [...new Set(sources)], notes, soilNow: soilNowValue, forecastUsed };
}
