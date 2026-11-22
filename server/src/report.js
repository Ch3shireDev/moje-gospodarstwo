// Składa raport dla działki i daty: rozpoznaje działkę, równolegle pobiera dane, liczy analizę.
// Każde źródło poza pogodą jest opcjonalne – jego brak trafia jawnie do raportu ("ograniczenia").
import * as uldkDefault from './sources/uldk.js';
import * as imgwDefault from './sources/imgw.js';
import * as iungDefault from './sources/iungSoil.js';
import * as soilgridsDefault from './sources/soilgrids.js';
import * as nmtDefault from './sources/nmt.js';
import * as osmDefault from './sources/osm.js';
import * as sentinelDefault from './sources/sentinel.js';
import { getWeatherSeries, addDays } from './weather.js';
import { buildAssessment, SOIL_CATEGORIES } from './engine.js';
import { CROPS, DEFAULT_CROP } from './data/crops.js';
import { areaM2, interiorPoint, squareAround } from './geo.js';
import { withTimeout } from './http.js';
import { llmSummary as llmDefault } from './llm.js';
import { fmtDate } from './format.js';

export const POLAND_BBOX = { minLat: 48.9, maxLat: 55.0, minLon: 14.0, maxLon: 24.2 };
export const HISTORY_YEARS = 10;

export class InputError extends Error {}

export const todayWarsaw = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date());
export const minDate = (today) => `${Number(today.slice(0, 4)) - HISTORY_YEARS}${today.slice(4)}`;

export function parseQuery(params, today = todayWarsaw()) {
  const parcelQuery = (params.get('parcel') ?? '').trim();
  const latS = params.get('lat');
  const lonS = params.get('lon');
  let lat = null;
  let lon = null;
  if (!parcelQuery) {
    lat = Number(latS);
    lon = Number(lonS);
    if (latS == null || lonS == null || !Number.isFinite(lat) || !Number.isFinite(lon)) throw new InputError('Podaj numer działki albo wskaż miejsce na mapie.');
    const b = POLAND_BBOX;
    if (lat < b.minLat || lat > b.maxLat || lon < b.minLon || lon > b.maxLon) throw new InputError('Punkt poza Polską.');
  } else if (parcelQuery.length > 120) {
    throw new InputError('Za długi identyfikator działki.');
  }
  const date = params.get('date') || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) throw new InputError('Nieprawidłowa data (podaj dd.mm.rrrr).');
  if (date > today) throw new InputError('Data analizy nie może być z przyszłości.');
  if (date < minDate(today)) throw new InputError(`Analiza obejmuje ostatnie ${HISTORY_YEARS} lat (od ${fmtDate(minDate(today))}).`);
  const crop = params.get('crop') || DEFAULT_CROP;
  if (!(crop in CROPS)) throw new InputError(`Nieznana uprawa: ${crop}`);
  const soil = params.get('soil') || 'auto';
  if (soil !== 'auto' && !(soil in SOIL_CATEGORIES)) throw new InputError(`Nieznana kategoria gleby: ${soil}`);
  return { parcelQuery: parcelQuery || null, lat, lon, date, crop, soil };
}

export const defaultDeps = {
  uldk: uldkDefault, imgw: imgwDefault, iung: iungDefault, soilgrids: soilgridsDefault,
  nmt: nmtDefault, osm: osmDefault, sentinel: sentinelDefault, weather: getWeatherSeries, llmSummary: llmDefault,
};

export class ParcelChoice extends Error {
  constructor(candidates) {
    super('Znaleziono kilka działek o tym numerze – wybierz właściwą.');
    this.candidates = candidates;
    this.status = 300;
  }
}

async function resolveParcel(q, deps) {
  if (q.parcelQuery) {
    let parcel;
    if (deps.uldk.PARCEL_ID_RE.test(q.parcelQuery)) {
      try {
        parcel = await deps.uldk.getParcelById(q.parcelQuery);
      } catch (err) {
        if (err instanceof deps.uldk.ParcelNotFound) throw new InputError(`Nie znaleziono działki ${q.parcelQuery} w ULDK (GUGiK).`);
        throw Object.assign(new Error(`ULDK (GUGiK) nie odpowiada: ${err.message}`), { status: 502 });
      }
    } else {
      let list;
      try {
        list = await deps.uldk.searchParcels(q.parcelQuery);
      } catch (err) {
        if (err instanceof deps.uldk.ParcelNotFound) throw new InputError(`Nie znaleziono działki „${q.parcelQuery}”. Podaj pełny identyfikator (np. 302502_2.0009.387) albo „obręb numer”.`);
        throw Object.assign(new Error(`ULDK (GUGiK) nie odpowiada: ${err.message}`), { status: 502 });
      }
      if (list.length > 1) throw new ParcelChoice(list.map((p) => ({ id: p.id, number: p.number, region: p.region, commune: p.commune, county: p.county, voivodeship: p.voivodeship })));
      parcel = list[0];
      if (!parcel.geometry) parcel = await deps.uldk.getParcelById(parcel.id).catch(() => parcel);
    }
    if (!parcel.geometry) throw new InputError('ULDK nie zwrócił obrysu działki.');
    const c = interiorPoint(parcel.geometry);
    return { parcel, lat: c.lat, lon: c.lon, failure: null };
  }
  try {
    const parcel = await deps.uldk.getParcel(q.lat, q.lon);
    return { parcel, lat: q.lat, lon: q.lon, failure: null };
  } catch (err) {
    return { parcel: null, lat: q.lat, lon: q.lon, failure: `ULDK: ${err.message}` };
  }
}

/** Dane działki do pokazania na mapie (bez analizy). */
export function parcelSummary(parcel) {
  return {
    id: parcel.id, number: parcel.number, region: parcel.region, commune: parcel.commune, county: parcel.county, voivodeship: parcel.voivodeship,
    areaHa: parcel.geometry ? Math.round((areaM2(parcel.geometry) / 1e4) * 100) / 100 : null,
    geometry: parcel.geometry,
  };
}

/**
 * Szybkie wyszukanie działki (tylko ULDK, ok. 1 s): po numerze / "obręb numer" albo po punkcie.
 * Rzuca InputError (brak działki) albo ParcelChoice (kilka pasuje).
 */
export async function lookupParcel(params, deps = defaultDeps) {
  const q = (params.get('parcel') ?? '').trim();
  if (q) {
    if (q.length > 120) throw new InputError('Za długi identyfikator działki.');
    const { parcel } = await resolveParcel({ parcelQuery: q }, deps);
    return parcelSummary(parcel);
  }
  const lat = Number(params.get('lat'));
  const lon = Number(params.get('lon'));
  const b = POLAND_BBOX;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < b.minLat || lat > b.maxLat || lon < b.minLon || lon > b.maxLon) {
    throw new InputError('Podaj numer działki albo punkt w Polsce.');
  }
  try {
    return parcelSummary(await deps.uldk.getParcel(lat, lon));
  } catch (err) {
    if (err instanceof deps.uldk.ParcelNotFound) throw new InputError('W tym miejscu nie ma działki ewidencyjnej. Kliknij w obrębie pola.');
    throw Object.assign(new Error(`ULDK (GUGiK) nie odpowiada: ${err.message}`), { status: 502 });
  }
}

export async function buildReport(q, deps = defaultDeps, { today = todayWarsaw() } = {}) {
  const t0 = Date.now();
  const { parcel, lat, lon, failure: parcelFailure } = await resolveParcel(q, deps);
  const geometry = parcel?.geometry ?? squareAround(lat, lon, 100);
  const center = { lat, lon };
  const isToday = q.date === today;
  const historyStart = `${Number(q.date.slice(0, 4)) - HISTORY_YEARS - 1}-01-01`;
  const end = isToday ? addDays(today, 7) : [addDays(q.date, 7), today].sort()[0];

  const opt = (p, ms, label) => withTimeout(Promise.resolve().then(p), ms, label);
  const [weatherR, iungR, sgR, nmtR, osmR, s2R, s2hR, synopR, warnR, hydroR, hydroWarnR] = await Promise.allSettled([
    deps.weather({ lat, lon, start: historyStart, end, today }),
    q.soil === 'auto' ? opt(() => deps.iung.getSoilCategory(geometry), 12000, 'IUNG') : Promise.resolve(null),
    opt(() => deps.soilgrids.getSoil(lat, lon), 20000, 'SoilGrids'),
    opt(() => deps.nmt.getTerrain(geometry), 12000, 'NMT'),
    opt(() => deps.osm.getWaters(geometry), 20000, 'OSM'),
    opt(() => deps.sentinel.latestClear(geometry, center, q.date), 24000, 'Sentinel-2'),
    opt(() => deps.sentinel.sameWindowPastYears(geometry, center, q.date), 24000, 'Sentinel-2 (historia)'),
    isToday ? deps.imgw.getSynop() : Promise.resolve(null),
    isToday ? deps.imgw.getWarnings() : Promise.resolve(null),
    isToday ? deps.imgw.getHydro() : Promise.resolve(null),
    isToday ? deps.imgw.getHydroWarnings() : Promise.resolve(null),
  ]);

  if (weatherR.status === 'rejected') {
    throw Object.assign(new Error(`Brak danych pogodowych (Open-Meteo i NASA POWER): ${weatherR.reason?.message ?? weatherR.reason}`), { status: 502 });
  }
  const val = (r) => (r.status === 'fulfilled' ? r.value : null);
  const why = (r) => (r.status === 'rejected' ? String(r.reason?.message ?? r.reason) : null);

  // Gleba: wybór użytkownika > mapa IUNG > SoilGrids.
  const sg = val(sgR);
  const iungSoil = val(iungR);
  let soil;
  if (q.soil !== 'auto') soil = { category: q.soil, source: 'user', label: SOIL_CATEGORIES[q.soil].label };
  else if (iungSoil?.category) soil = { category: iungSoil.category, source: 'iung', label: iungSoil.label, share: iungSoil.share, mixed: iungSoil.mixed, landuse: iungSoil.landuse, breakdown: iungSoil.breakdown };
  else if (sg?.category) soil = { category: sg.category, source: 'soilgrids', label: SOIL_CATEGORIES[sg.category].label, landuse: iungSoil?.landuse ?? null, iungNote: iungSoil?.label ?? null };
  else soil = { category: 'III', source: 'domyslna', label: `${SOIL_CATEGORIES.III.label} (przyjęta domyślnie – brak danych glebowych)`, landuse: iungSoil?.landuse ?? null };
  if (sg) Object.assign(soil, { socTopGkg: sg.socTopGkg, clayPct: sg.clayPct, sandPct: sg.sandPct, siltPct: sg.siltPct, texture: sg.texture });

  const s2 = val(s2R);
  const satellite = s2 || val(s2hR) ? { current: s2, history: val(s2hR) ?? [] } : null;
  const failures = {
    parcel: parcelFailure,
    soilIung: why(iungR),
    soilgrids: why(sgR),
    terrain: why(nmtR),
    waters: why(osmR),
    satellite: why(s2R) ?? (s2 && !s2.clear ? `sprawdzono ${s2.tried} z ${s2.candidates} scen, wszystkie z chmurami nad działką` : null),
  };

  const commune = parcel ? { commune: parcel.commune, county: parcel.county, voivodeship: parcel.voivodeship, countyCode: parcel.countyCode } : null;
  const warnings = val(warnR) && commune ? deps.imgw.warningsForCounty(val(warnR), commune.countyCode) : [];
  const hydroWarnings = val(hydroWarnR) && commune ? deps.imgw.hydroWarningsFor(val(hydroWarnR), commune.voivodeship) : [];
  const weather = val(weatherR);

  const assessment = buildAssessment({
    date: q.date, today, cropId: q.crop, soil, weather, terrain: val(nmtR), waters: val(osmR), satellite,
    warnings, hydroWarnings, failures, parcel,
  });

  const place = parcel
    ? `działka ${parcel.number}, obręb ${parcel.region}, gm. ${parcel.commune}, ${parcel.county}, woj. ${parcel.voivodeship}`
    : `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
  const aiSummary = await deps.llmSummary(assessment, place).catch(() => null);

  const st = (r, skipped) => (skipped ? 'pominięte' : r.status === 'fulfilled' ? (r.value == null ? 'brak danych' : 'ok') : `błąd: ${why(r)}`);
  return {
    query: q,
    place: {
      label: place,
      lat, lon,
      parcel: parcel ? { id: parcel.id, number: parcel.number, region: parcel.region, commune: parcel.commune, county: parcel.county, voivodeship: parcel.voivodeship, areaHa: Math.round((areaM2(parcel.geometry) / 1e4) * 100) / 100, geometry: parcel.geometry } : null,
    },
    ...assessment,
    summary: aiSummary ?? assessment.summary,
    summarySource: aiSummary ? 'llm' : 'szablon',
    terrain: val(nmtR),
    waters: val(osmR),
    satellite,
    station: val(synopR) ? deps.imgw.nearestStation(val(synopR), lat, lon) : null,
    hydroStation: val(hydroR) ? deps.imgw.nearestHydroStation(val(hydroR), lat, lon) : null,
    warnings,
    hydroWarnings,
    soilNow: weather.soilNow,
    weatherNotes: weather.notes,
    dataSources: [
      { category: 'Meteorologiczne', name: weather.sources.join('; '), status: 'ok', live: true, range: `${fmtDate(historyStart)} – ${fmtDate(end)}` },
      { category: 'Meteorologiczne', name: 'IMGW-PIB: stacja synoptyczna, ostrzeżenia', status: st(synopR, !isToday), live: true },
      { category: 'Hydrologiczne', name: 'IMGW-PIB: wodowskazy, ostrzeżenia hydrologiczne', status: st(hydroR, !isToday), live: true },
      { category: 'Hydrologiczne', name: `OpenStreetMap – rowy, cieki, zbiorniki, mokradła (${val(osmR)?.source ?? 'kafle OpenFreeMap, zapasowo Overpass'})`, status: st(osmR), live: true },
      { category: 'Glebowe', name: 'IUNG-PIB: kategorie podatności gleb na suszę', status: q.soil === 'auto' ? st(iungR) : 'pominięte (wybór użytkownika)', live: true },
      { category: 'Glebowe', name: 'IUNG-PIB: progi klimatycznego bilansu wodnego (rozporządzenie MRiRW 2019)', status: 'ok', live: false, fetched: '21.11.2026' },
      { category: 'Glebowe', name: 'ISRIC SoilGrids 2.0: uziarnienie, węgiel organiczny', status: st(sgR), live: true },
      { category: 'Satelitarne', name: 'Copernicus Sentinel-2 L2A (Earth Search): NDVI, NDMI', status: s2?.clear ? 'ok' : st(s2R) === 'ok' ? 'brak bezchmurnej sceny' : st(s2R), live: true },
      { category: 'Przestrzenne', name: 'GUGiK ULDK: działka ewidencyjna', status: parcel ? 'ok' : `błąd: ${parcelFailure}`, live: true },
      { category: 'Przestrzenne', name: 'GUGiK NMT: ukształtowanie terenu', status: st(nmtR), live: true },
    ],
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - t0,
  };
}
