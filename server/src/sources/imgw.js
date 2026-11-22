import { cachedFetch } from '../http.js';
import { STATIONS, distanceKm } from '../stations.js';
import { fmtDate, fmtDateTime } from '../format.js';

// IMGW-PIB, dane publiczne. Tylko stan bieżący – API nie ma archiwum, więc dla dat
// historycznych raport mówi wprost, że tych danych brak.
// Warunek IMGW: podać źródło ("Źródłem pochodzenia danych jest IMGW-PIB") i oznaczyć dane przetworzone.
const BASE = 'https://danepubliczne.imgw.pl/api/data';

export const ATTRIBUTION = { name: 'IMGW-PIB', url: 'https://danepubliczne.imgw.pl/', licence: 'Źródłem pochodzenia danych jest IMGW-PIB (dane przetworzone)' };

export const getSynop = () => cachedFetch(`${BASE}/synop`, { ttlMs: 10 * 60_000 });
// Gdy nie ma ostrzeżeń, IMGW zamiast pustej tablicy zwraca obiekt {"message": "Brak ostrzeżeń …"}
// (fixtura imgw-warningsmeteo-brak.json). Wszystko, co nie jest tablicą, traktujemy jak brak danych.
const asList = (x) => (Array.isArray(x) ? x : []);

export const getWarnings = () => cachedFetch(`${BASE}/warningsmeteo`, { ttlMs: 5 * 60_000 });
export const getHydro = () => cachedFetch(`${BASE}/hydro`, { ttlMs: 15 * 60_000, timeoutMs: 12000 });
export const getHydroWarnings = () => cachedFetch(`${BASE}/warningshydro`, { ttlMs: 15 * 60_000, timeoutMs: 12000 });

// IMGW zwraca liczby jako stringi, czasem null. Ujednolicamy.
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/** Najbliższa stacja synoptyczna (z pominięciem gór i platformy na Bałtyku). */
export function nearestStation(synop, lat, lon) {
  let best = null;
  for (const row of asList(synop)) {
    const st = STATIONS[row.id_stacji];
    if (!st || st.skip) continue;
    const dist = distanceKm(lat, lon, st.lat, st.lon);
    if (!best || dist < best.distanceKm) best = { row, st, distanceKm: dist };
  }
  if (!best) return null;
  const { row, st } = best;
  return {
    id: row.id_stacji,
    name: st.name,
    distanceKm: Math.round(best.distanceKm),
    measuredAt: `${fmtDate(row.data_pomiaru)} ${String(row.godzina_pomiaru).padStart(2, '0')}:00 UTC`,
    temperature: num(row.temperatura),
    humidity: num(row.wilgotnosc_wzgledna),
    windKmh: row.predkosc_wiatru != null ? Math.round(num(row.predkosc_wiatru) * 3.6) : null,
    pressure: num(row.cisnienie),
  };
}

/** Najbliższy wodowskaz IMGW (API hydro podaje współrzędne) – stan wody względem stanów ostrzegawczego i alarmowego. */
export function nearestHydroStation(hydro, lat, lon) {
  let best = null;
  for (const row of asList(hydro)) {
    const la = num(row.lat);
    const lo = num(row.lon);
    if (la == null || lo == null || num(row.stan_wody) == null) continue;
    const d = distanceKm(lat, lon, la, lo);
    if (!best || d < best.d) best = { row, d };
  }
  if (!best || best.d > 40) return null;
  const r = best.row;
  return {
    id: r.id_stacji,
    name: r.stacja,
    river: r.rzeka,
    distanceKm: Math.round(best.d),
    level: num(r.stan_wody),
    measuredAt: fmtDateTime(r.stan_wody_data_pomiaru),
    warningLevel: num(r.stan_ostrzegawczy),
    alarmLevel: num(r.stan_alarmowy),
    flow: num(r.przeplyw),
    flowAt: r.przeplyw_data,
  };
}

/** Ostrzeżenia hydrologiczne (w tym "Susza hydrologiczna") obejmujące województwo działki. */
export function hydroWarningsFor(warnings, voivodeship, nowStr = warsawNowString()) {
  if (!voivodeship) return [];
  const v = voivodeship.toLowerCase();
  return asList(warnings)
    .filter((w) => !w.data_do || w.data_do > nowStr)
    .map((w) => ({ w, areas: (w.obszary ?? []).filter((o) => (o.wojewodztwo ?? '').toLowerCase() === v) }))
    .filter(({ areas }) => areas.length)
    .map(({ w, areas }) => ({
      event: w.zdarzenie,
      level: num(w['stopień'] ?? w.stopien),
      from: w.data_od,
      to: w.data_do,
      text: (w.przebieg ?? '').trim(),
      areas: areas.map((a) => a.opis),
      office: w.biuro,
      drought: /susza/i.test(w.zdarzenie ?? ''),
    }))
    // Jedno zdarzenie bywa wydane w kilku komunikatach – łączymy po rodzaju zdarzenia.
    .reduce((acc, w) => {
      const prev = acc.find((x) => x.event === w.event);
      if (prev) prev.areas = [...new Set([...prev.areas, ...w.areas])];
      else acc.push(w);
      return acc;
    }, []);
}

// "2026-11-17 23:07:00" w czasie warszawskim. Porównujemy stringi, bez strefowego piekła.
export function warsawNowString(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).format(now);
}

/** Ostrzeżenia meteo obowiązujące teraz lub w przyszłości dla powiatu (4 cyfry TERYT). */
export function warningsForCounty(warnings, countyCode, now = new Date()) {
  if (!countyCode) return [];
  const nowStr = warsawNowString(now);
  return asList(warnings)
    .filter((w) => Array.isArray(w.teryt) && w.teryt.includes(countyCode))
    .filter((w) => !w.obowiazuje_do || w.obowiazuje_do > nowStr)
    .map((w) => ({
      id: w.id,
      event: w.nazwa_zdarzenia,
      level: num(w.stopien),
      probability: num(w.prawdopodobienstwo),
      from: w.obowiazuje_od,
      to: w.obowiazuje_do,
      text: (w.tresc ?? '').trim(),
      office: w.biuro,
    }))
    .sort((a, b) => (a.from ?? '').localeCompare(b.from ?? ''));
}
