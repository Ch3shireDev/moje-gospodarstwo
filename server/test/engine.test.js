import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize } from '../src/sources/openMeteo.js';
import { nearestStation, warningsForCounty, nearestHydroStation, hydroWarningsFor } from '../src/sources/imgw.js';
import { parseUldk, parseUldkList, parcelFromFields, communeFromFields, wktToGeoJSON, PARCEL_ID_RE } from '../src/sources/uldk.js';
import { parseFeatureInfo, summarize } from '../src/sources/iungSoil.js';
import { parseSoilGrids } from '../src/sources/soilgrids.js';
import { parsePointList, analyzeTerrain } from '../src/sources/nmt.js';
import { powerRows } from '../src/sources/nasaPower.js';
import { parseScenes, effectiveOffset } from '../src/sources/sentinel.js';
import { parseTiffHeader, decodeTile } from '../src/cog.js';
import { et0PenmanMonteith, extraterrestrialRadiation } from '../src/et0.js';
import { to2180, areaM2, interiorPoint, distanceToLineM } from '../src/geo.js';
import { balanceWindow, iungPeriodNear, iungThreshold, rootZoneBalance } from '../src/analysis/water.js';
import { percentileOf, vulnerability } from '../src/analysis/history.js';
import { CROPS, kcOn } from '../src/data/crops.js';
import { buildAssessment } from '../src/engine.js';
import { buildReport, parseQuery, InputError, ParcelChoice } from '../src/report.js';
import { deflateSync } from 'node:zlib';

const fx = (name) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
const fxJson = (name) => JSON.parse(fx(name));

// ---------- Źródła ----------

test('Open-Meteo: dni i wilgotność z bieżącej godziny (fixtura z Postmana)', () => {
  const SOIL = { top: 'soil_moisture_3_to_9cm', deep: 'soil_moisture_27_to_81cm', labels: {} };
  const w = normalize(fxJson('openmeteo-poznan-2026-11-17.json'), { soil: SOIL, today: '2026-11-17', nowHour: '2026-11-17T23' });
  assert.equal(w.days.length, 21);
  assert.equal(w.soil.top, 0.291);
});

test('ULDK: działka po ID – pola, TERYT, kod powiatu, obrys w lon/lat', () => {
  const p = parcelFromFields(parseUldk(fx('uldk-parcel-by-id.txt')));
  assert.equal(p.id, '302502_2.0009.387');
  assert.equal(p.number, '387');
  assert.equal(p.region, 'Sulęcin');
  assert.equal(p.commune, 'Krzykosy');
  assert.equal(p.countyCode, '3025');
  assert.equal(p.geometry.type, 'Polygon');
  const [lon, lat] = p.geometry.coordinates[0][0];
  assert.ok(lon > 17 && lon < 18 && lat > 52 && lat < 53);
  const ha = areaM2(p.geometry) / 1e4;
  assert.ok(ha > 2.2 && ha < 2.5, `pole ${ha}`);
});

test('ULDK: GetParcelByIdOrNr ma w 1. linii liczbę wyników; brak działki = błąd', () => {
  const list = parseUldkList(fx('uldk-parcel-by-idornr.txt'));
  assert.equal(list.length, 1);
  assert.equal(list[0][0], '302502_2.0009.387');
  assert.throws(() => parseUldk(fx('uldk-parcel-not-found.txt')), /brak wyników/);
  assert.ok(PARCEL_ID_RE.test('302502_2.0009.387'));
  assert.ok(PARCEL_ID_RE.test('306401_1.0061.AR_05.36/10'));
  assert.ok(!PARCEL_ID_RE.test('Sulęcin 387'));
});

test('ULDK: gmina i WKT z zamienionymi osiami', () => {
  assert.equal(communeFromFields(['306401_1', 'Poznań', 'powiat Poznań', 'wielkopolskie']).countyCode, '3064');
  const g = wktToGeoJSON('SRID=4326;POLYGON((52.1 17.3,52.2 17.3,52.2 17.4,52.1 17.3))');
  assert.deepEqual(g.coordinates[0][0], [17.3, 52.1]);
});

test('IUNG: kategoria gleby z GetFeatureInfo i dominanta na działce', () => {
  assert.equal(parseFeatureInfo(fxJson('iung-katgl-featureinfo.json')), 2);
  const s = summarize([2, 2, 2, 11, 2]);
  assert.equal(s.category, 'II');
  assert.equal(s.share, 80);
  assert.equal(summarize([13, 13]).category, null);
  assert.equal(summarize([5, 5, 2]).category, 'organiczna');
});

test('SoilGrids: jednostki (d_factor), średnie ważone, kategoria z uziarnienia', () => {
  const s = parseSoilGrids(fxJson('soilgrids-krzykosy.json'));
  assert.ok(s.sandPct > 60, `piasek ${s.sandPct}`);
  assert.ok(s.clayPct > 5 && s.clayPct < 20);
  assert.ok(s.socTopGkg > 5 && s.socTopGkg < 60);
  assert.ok(['I', 'II'].includes(s.category));
});

test('NMT GUGiK: lista punktów i spadek płaszczyzny', () => {
  const pts = parsePointList(fx('gugik-nmt-pointlist.txt'));
  assert.equal(pts.length, 4);
  assert.equal(pts[1].h, 66.8);
  // Siatka 3×3 nachylona 5% na wschód (y rośnie, h maleje).
  const grid = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) grid.push({ i, j, x: 470000 + i * 100, y: 380000 + j * 100, h: 100 - j * 5, inside: true, lat: 52 + i * 0.001, lon: 17 + j * 0.001 });
  const t = analyzeTerrain(grid, 3);
  assert.equal(t.slopePct, 5);
  assert.equal(t.downslope, 'wschód');
  assert.equal(t.reliefM, 10);
});

test('IMGW hydro: najbliższy wodowskaz i ostrzeżenia o suszy hydrologicznej (scalone)', () => {
  const st = nearestHydroStation(fxJson('imgw-hydro.json'), 52.1, 17.3);
  assert.ok(st && st.distanceKm <= 40);
  const w = hydroWarningsFor(fxJson('imgw-warningshydro.json'), 'łódzkie', '2026-11-21 12:00:00');
  assert.ok(w.length >= 1);
  assert.equal(new Set(w.map((x) => x.event)).size, w.length);
  assert.ok(w.some((x) => x.drought));
});

test('IMGW meteo: stacja i ostrzeżenia dla powiatu', () => {
  assert.ok(nearestStation(fxJson('imgw-synop.json'), 52.4, 16.92));
  assert.ok(Array.isArray(warningsForCounty(fxJson('imgw-warnings.json'), '3064', new Date('2026-11-17T20:00:00Z'))));
});

test('NASA POWER: wiersze dobowe i ET0 FAO-56 w realnym zakresie dla maja', () => {
  const rows = powerRows(fxJson('nasa-power-krzykosy-2025-q2.json'), 52.1);
  const may = rows.filter((r) => r.date.startsWith('2025-05'));
  assert.equal(may.length, 31);
  const meanEt0 = may.reduce((s, r) => s + r.et0, 0) / may.length;
  assert.ok(meanEt0 > 2 && meanEt0 < 5, `ET0 maj ${meanEt0}`);
});

test('FAO-56: przykład 18 z podręcznika (Bruksela, 6 lipca) daje ET0 ok. 3,9 mm', () => {
  // Dane z FAO-56, Example 18: tmax 21,5, tmin 12,3, RHmean ~ (z ea 1,409 kPa), u2 2,078 m/s, Rs 22,07 MJ, z 100 m, lat 50°48'.
  const et0 = et0PenmanMonteith({ tmax: 21.5, tmin: 12.3, rhMean: 76.6, u2: 2.078, rs: 22.07, latDeg: 50.8, isoDate: '2026-07-06', z: 100 });
  assert.ok(Math.abs(et0 - 3.9) < 0.3, `ET0 ${et0}`);
  assert.ok(Math.abs(extraterrestrialRadiation(50.8, 187) - 41.1) < 0.5);
});

test('Sentinel-2: sceny z STAC bez duplikatów, offset tylko gdy DN ≥ 1000', () => {
  const scenes = parseScenes(fxJson('stac-sentinel2-krzykosy-2025-05.json'));
  assert.ok(scenes.length >= 1);
  assert.ok(scenes[0].bands.red.href.endsWith('B04.tif'));
  assert.equal(effectiveOffset([450, 700], { scale: 0.0001, offset: -0.1 }), 0);
  assert.equal(effectiveOffset([1450, 1700], { scale: 0.0001, offset: -0.1 }), -0.1);
});

test('COG: nagłówek TIFF i kafel Deflate z predyktorem', async () => {
  // Minimalny TIFF: 2×1 kafel 16-bit, predyktor 2. Wartości 10, 15 -> różnice 10, 5.
  const tile = Buffer.alloc(4);
  tile.writeUInt16LE(10, 0);
  tile.writeUInt16LE(5, 2);
  const arr = await decodeTile(deflateSync(tile), { compression: 8, predictor: 2, bitsPerSample: 16, tileWidth: 2, tileHeight: 1 }, true);
  assert.deepEqual([...arr], [10, 15]);
  assert.throws(() => parseTiffHeader(Buffer.from('XX')), /TIFF/);
});

test('Geometria: PUWG 1992 (Warszawa) i odległość od linii', () => {
  const p = to2180(52.2297, 21.0122);
  assert.ok(Math.abs(p.x - 486757) < 5 && Math.abs(p.y - 637382) < 5);
  const g = { type: 'Polygon', coordinates: [[[17.3, 52.1], [17.301, 52.1], [17.301, 52.101], [17.3, 52.101], [17.3, 52.1]]] };
  const c = interiorPoint(g);
  assert.ok(c.lat > 52.1 && c.lat < 52.101);
  const d = distanceToLineM(g, [[17.3, 52.1015], [17.301, 52.1015]]);
  assert.ok(d > 50 && d < 60, `odległość ${d}`);
});

// ---------- Analiza ----------

function synthDays({ from = '2014-01-01', to = '2025-12-31', rain = () => 1.5, et0 = (d) => (['05', '06', '07'].includes(d.slice(5, 7)) ? 4 : 1.5), tmax = () => 22 } = {}) {
  const out = [];
  for (let d = new Date(`${from}T12:00:00Z`); d <= new Date(`${to}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    out.push({ date: iso, rain: rain(iso), et0: et0(iso), tmax: tmax(iso), tmin: 10 });
  }
  return out;
}

test('KBW: okno 61 dni, okres IUNG i próg z tabeli rozporządzenia', () => {
  const days = synthDays();
  const w = balanceWindow(days, '2025-05-31');
  assert.equal(w.start, '2025-04-01');
  assert.equal(w.days, 61);
  const p = iungPeriodNear('2025-05-31');
  assert.equal(p.label, '01.04–31.05');
  assert.equal(iungThreshold('zboza_ozime', 'II', p.idx), -153);
  assert.equal(iungThreshold('burak', 'I', 0), 'nie');
  assert.equal(iungThreshold('zboza_ozime', 'I', 13), null);
  assert.equal(iungPeriodNear('2025-11-20'), null);
});

test('Kc wg FAO-56 i bilans strefy korzeni', () => {
  assert.equal(kcOn(CROPS.zboza_ozime, '2025-05-16'), 1.15);
  assert.equal(kcOn(CROPS.kukurydza_ziarno, '2025-02-10'), 0);
  const dry = synthDays({ rain: () => 0 });
  const rz = rootZoneBalance(dry, '2025-06-15', CROPS.ziemniak, 'I');
  assert.ok(rz.overRaw);
  assert.equal(rz.available, 0);
  assert.equal(rootZoneBalance(dry, '2025-12-15', CROPS.ziemniak, 'I').applicable, false);
});

test('Historia: percentyl i podatność (susza tylko w 2018 i 2019)', () => {
  assert.equal(percentileOf(-100, [-50, -60, -70, -150]), 25);
  const days = synthDays({ rain: (d) => (['2018', '2019'].includes(d.slice(0, 4)) ? 0 : 3) });
  const v = vulnerability(days, '2025-10-15', { iungKey: 'zboza_ozime', category: 'I' });
  assert.deepEqual(v.droughtYears, [2018, 2019]);
  assert.equal(v.level, 'srednia');
  assert.ok(v.riskMonths);
});

test('Silnik: kolejność etapów, susza wg IUNG, przyczyny i rekomendacje z uzasadnieniem', () => {
  const days = synthDays({ rain: (d) => (d.startsWith('2025') ? 0.3 : 2), tmax: (d) => (d.startsWith('2025-05') ? 31 : 22) });
  const a = buildAssessment({
    date: '2025-05-31', today: '2026-11-21', cropId: 'zboza_ozime',
    soil: { category: 'I', source: 'iung', label: 'kat. I', socTopGkg: 6 },
    weather: { days, sources: ['test'], notes: [] },
    terrain: { slopePct: 4, downslope: 'południe', reliefM: 2, depressions: [{ lat: 52.1, lon: 17.3, h: 60, depthM: 0.4 }], lowest: { lat: 52.1, lon: 17.3, h: 60 } },
    waters: { nearestDitch: { kind: 'rów melioracyjny', distM: 20 }, nearestStream: null, items: [] },
  });
  assert.equal(a.status.level, 'susza');
  assert.ok(a.status.indicators.find((i) => i.id === 'kbw-iung').decisive);
  const ids = a.causes.list.map((c) => c.id);
  for (const id of ['opad', 'gleba', 'splyw', 'rowy', 'materia-organiczna']) assert.ok(ids.includes(id), `brak przyczyny ${id}`);
  assert.deepEqual(Object.keys(a.recommendations), ['retencja', 'agrotechnika', 'nawadnianie', 'pogoda']);
  assert.ok(a.recommendations.retencja.some((r) => r.id === 'retencja-row' && r.basis.length));
  assert.ok(a.recommendations.retencja.some((r) => r.id === 'retencja-obnizenie' && r.location));
  assert.equal(a.recommendations.nawadnianie[0].id, 'nawadnianie-historyczne');
  assert.equal(a.recommendations.pogoda.length, 0); // data historyczna – bez prognozy
  assert.ok(a.uncertainty.items.length >= 3);
});

test('Silnik: za mało danych pogodowych -> brak rekomendacji', () => {
  const a = buildAssessment({ date: '2025-05-31', today: '2026-11-21', cropId: 'zboza_ozime', soil: { category: 'II', source: 'iung' }, weather: { days: [], sources: [], notes: [] } });
  assert.equal(a.status.level, 'brak');
  assert.equal(a.recommendations, null);
});

// ---------- Raport i API ----------

test('parseQuery: działka, data z 10 lat, uprawa, gleba', () => {
  const ok = parseQuery(new URLSearchParams('parcel=302502_2.0009.387&date=2020-07-01&crop=ziemniak'), '2026-11-21');
  assert.equal(ok.parcelQuery, '302502_2.0009.387');
  assert.equal(ok.soil, 'auto');
  assert.throws(() => parseQuery(new URLSearchParams('parcel=x&date=2015-01-01'), '2026-11-21'), InputError);
  assert.throws(() => parseQuery(new URLSearchParams('parcel=x&date=2027-01-01'), '2026-11-21'), InputError);
  assert.throws(() => parseQuery(new URLSearchParams('lat=40&lon=10'), '2026-11-21'), InputError);
  assert.throws(() => parseQuery(new URLSearchParams('parcel=x&crop=banany'), '2026-11-21'), InputError);
});

const parcelFx = parcelFromFields(parseUldk(fx('uldk-parcel-by-id.txt')));
const fakeDeps = (over = {}) => ({
  uldk: {
    PARCEL_ID_RE, ParcelNotFound: class extends Error {},
    getParcelById: async () => parcelFx,
    searchParcels: async () => [parcelFx],
    getParcel: async () => parcelFx,
  },
  imgw: { getSynop: async () => [], getWarnings: async () => [], getHydro: async () => [], getHydroWarnings: async () => [], nearestStation: () => null, nearestHydroStation: () => null, warningsForCounty: () => [], hydroWarningsFor: () => [] },
  iung: { getSoilCategory: async () => summarize([2, 2, 2]) },
  soilgrids: { getSoil: async () => parseSoilGrids(fxJson('soilgrids-krzykosy.json')) },
  nmt: { getTerrain: async () => { throw new Error('NMT padł'); } },
  osm: { getWaters: async () => { throw new Error('Overpass padł'); } },
  sentinel: { latestClear: async () => ({ clear: false, tried: 2, candidates: 2 }), sameWindowPastYears: async () => [] },
  weather: async () => ({ days: synthDays(), sources: ['Open-Meteo – archiwum ERA5 / ERA5-Land'], notes: [], soilNow: null }),
  llmSummary: async () => null,
  ...over,
});

test('Raport: składa się mimo awarii NMT, OSM i satelity – i mówi o nich wprost', async () => {
  const q = parseQuery(new URLSearchParams('parcel=302502_2.0009.387&date=2025-05-31&crop=zboza_ozime'), '2026-11-21');
  const r = await buildReport(q, fakeDeps(), { today: '2026-11-21' });
  assert.equal(r.place.parcel.id, '302502_2.0009.387');
  assert.equal(r.soil.source, 'iung');
  assert.equal(r.soil.category, 'II');
  assert.ok(r.dataSources.find((s) => s.name.includes('NMT')).status.startsWith('błąd'));
  assert.ok(r.uncertainty.items.some((t) => t.includes('ukształtowaniu terenu')));
  assert.ok(r.recommendations.retencja.length >= 1);
  assert.equal(r.summarySource, 'szablon');
});

test('Raport: kilka działek o tym numerze -> wybór (ParcelChoice)', async () => {
  const q = parseQuery(new URLSearchParams('parcel=Wilda 36&date=2025-05-31'), '2026-11-21');
  const deps = fakeDeps();
  deps.uldk.searchParcels = async () => [parcelFx, { ...parcelFx, id: 'inna' }];
  await assert.rejects(buildReport(q, deps, { today: '2026-11-21' }), ParcelChoice);
});

test('Raport: bez pogody nie ma raportu (502)', async () => {
  const q = parseQuery(new URLSearchParams('parcel=302502_2.0009.387&date=2025-05-31'), '2026-11-21');
  await assert.rejects(buildReport(q, fakeDeps({ weather: async () => { throw new Error('limit'); } }), { today: '2026-11-21' }), (e) => e.status === 502);
});

test('Daty w tekstach po polsku: dd.mm.rrrr', async () => {
  const { fmtDate, fmtDateTime } = await import('../src/format.js');
  assert.equal(fmtDate('2026-11-23'), '23.11.2026');
  assert.equal(fmtDateTime('2026-11-18 05:00:00'), '18.11.2026 05:00');
  const days = synthDays({ rain: (d) => (d.startsWith('2025') ? 0.3 : 2) });
  const a = buildAssessment({ date: '2025-05-31', today: '2026-11-21', cropId: 'zboza_ozime', soil: { category: 'II', source: 'iung' }, weather: { days, sources: [], notes: [] } });
  const text = JSON.stringify([a.summary, a.status.indicators, a.recommendations, a.uncertainty]);
  assert.ok(a.summary.includes('31.05.2025'));
  assert.ok(!/\d{4}-\d{2}-\d{2}/.test(text), 'w tekstach została data ISO');
});

test('Open-Meteo: adresy darmowe, z kluczem komercyjnym i własna instancja', async () => {
  const { endpoints } = await import('../src/sources/openMeteo.js');
  assert.equal(endpoints({}).forecast, 'https://api.open-meteo.com/v1/forecast');
  const k = endpoints({ OPEN_METEO_API_KEY: 'abc' });
  assert.equal(k.archive, 'https://customer-archive-api.open-meteo.com/v1/archive');
  assert.equal(k.key, 'abc');
  assert.equal(endpoints({ OPEN_METEO_ARCHIVE_URL: 'http://localhost:8080/' }).archive, 'http://localhost:8080/v1/archive');
});

test('API działki: wyszukanie bez analizy (numer, punkt, brak działki)', async () => {
  const { lookupParcel } = await import('../src/report.js');
  const deps = fakeDeps();
  const byId = await lookupParcel(new URLSearchParams('parcel=302502_2.0009.387'), deps);
  assert.equal(byId.number, '387');
  assert.ok(byId.areaHa > 2 && byId.geometry);
  const byPoint = await lookupParcel(new URLSearchParams('lat=52.1&lon=17.3'), deps);
  assert.equal(byPoint.id, '302502_2.0009.387');
  deps.uldk.getParcel = async () => { throw new deps.uldk.ParcelNotFound('brak'); };
  await assert.rejects(lookupParcel(new URLSearchParams('lat=52.1&lon=17.3'), deps), InputError);
  await assert.rejects(lookupParcel(new URLSearchParams('lat=40&lon=10'), deps), InputError);
});

test('PNG: poprawny nagłówek, CRC, powiększenie z obrysem; skala NDVI', async () => {
  const { encodePng, crc32, upscaleWithOutline } = await import('../src/png.js');
  const { ndviColor } = await import('../src/sources/sentinel.js');
  assert.equal(crc32(Buffer.from('IEND')), 0xae426082);
  const png = await encodePng(new Uint8Array([255, 0, 0, 0, 255, 0]), 2, 1);
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(new DataView(png.buffer, png.byteOffset).getUint32(16), 2); // szerokość z IHDR
  const up = upscaleWithOutline(new Uint8Array(2 * 2 * 3), 2, 2, 4, [[[0, 0], [2, 0]]]);
  assert.equal(up.w, 8);
  assert.deepEqual([...up.rgb.subarray(0, 3)], [255, 230, 0]); // linia obrysu
  assert.deepEqual(ndviColor(-0.5), [150, 110, 80]);
  assert.deepEqual(ndviColor(0.9), [35, 125, 55]);
});

test('Łąka (TUZ): bez orki, siewu i słomy; kukurydza: bez międzyplonu po październikowym zbiorze', () => {
  const days = synthDays({ rain: (d) => (d.startsWith('2025') ? 0.3 : 2) });
  const common = {
    date: '2025-07-31', today: '2026-11-21',
    soil: { category: 'I', source: 'iung', socTopGkg: 6 },
    weather: { days, sources: [], notes: [] },
    terrain: { slopePct: 7, downslope: 'południe', reliefM: 3, depressions: [], lowest: null },
    waters: { nearestDitch: { kind: 'rów', distM: 10 }, nearestStream: null, items: [] },
  };
  const tuz = buildAssessment({ ...common, cropId: 'uzytki_zielone' });
  const tuzText = JSON.stringify(tuz.recommendations).toLowerCase();
  for (const bad of ['orz ', 'orz i', 'wysiej', 'międzyplon', 'słom', 'wybierz uprawy']) assert.ok(!tuzText.includes(bad), `łąka dostała radę z "${bad}"`);
  const ids = tuz.recommendations.agrotechnika.map((a) => a.id);
  assert.ok(ids.includes('agro-tuz-koszenie') && ids.includes('agro-tuz-podsiew'));
  assert.equal(ids[0], 'agro-tuz-pakiet'); // zasady pakietu dopłat na górze
  assert.ok(tuz.recommendations.retencja.some((r) => r.title.includes('Nie przeoruj')));

  const maize = buildAssessment({ ...common, cropId: 'kukurydza_ziarno' });
  const mIds = maize.recommendations.agrotechnika.map((a) => a.id);
  assert.ok(!mIds.includes('agro-miedzyplon'), 'kukurydza zbierana w październiku nie powinna dostać międzyplonu');
  assert.ok(maize.recommendations.agrotechnika.find((a) => a.id === 'agro-resztki').title.includes('rozdrobnij'));
  const wheat = buildAssessment({ ...common, cropId: 'zboza_ozime' });
  assert.ok(wheat.recommendations.agrotechnika.some((a) => a.id === 'agro-miedzyplon'));
});

test('Wody z kafla OpenFreeMap (MVT): dekoder, rzeka Warta, odległość od działki', async () => {
  const { decodeTile, tilePointToLonLat, lonLatToTile } = await import('../src/mvt.js');
  const { tileLayersToElements, summarizeWaters } = await import('../src/sources/osm.js');
  const buf = readFileSync(new URL('./fixtures/openfreemap-14-8979-5404.pbf', import.meta.url));
  const layers = decodeTile(buf, ['waterway', 'water', 'landcover']);
  assert.deepEqual(Object.keys(layers).sort(), ['landcover', 'water', 'waterway']);
  assert.ok(layers.waterway.features.some((f) => f.props.name === 'Warta'));
  assert.deepEqual(lonLatToTile(17.3003, 52.1001, 14), { x: 8979, y: 5404 });
  const [lon, lat] = tilePointToLonLat(14, 8979, 5404, 0, 0, 4096);
  assert.ok(Math.abs(lon - 17.2925) < 0.001 && lat > 52.1 && lat < 52.11);
  const w = summarizeWaters({ elements: tileLayersToElements(layers, 8979, 5404) }, parcelFx.geometry, 'test');
  assert.equal(w.nearestStream.type, 'ciek');
  const warta = w.items.find((i) => i.name === 'Warta');
  assert.ok(warta && warta.distM < 200, `Warta ${warta?.distM} m`);
});

test('Porównanie upraw: te same progi IUNG dla każdej uprawy, zamienniki tylko polowe, łąka bez porównania', () => {
  // Suche lipce i sierpnie co trzeci rok – uprawy z progami latem (kukurydza, ziemniak) cierpią częściej.
  const days = synthDays({
    rain: (d) => (['07', '08'].includes(d.slice(5, 7)) ? (Number(d.slice(0, 4)) % 3 === 0 ? 0.2 : 1.2) : 2.2),
    et0: (d) => (['05', '06', '07', '08'].includes(d.slice(5, 7)) ? 4 : 1.5),
  });
  const common = { date: '2025-10-15', today: '2026-11-21', soil: { category: 'I', source: 'iung' }, weather: { days, sources: [], notes: [] } };
  const a = buildAssessment({ ...common, cropId: 'ziemniak' });
  const cmp = a.cropComparison;
  assert.ok(cmp.available);
  assert.equal(cmp.seasons, 10);
  assert.equal(cmp.rows.length, 14);
  assert.ok(cmp.rows.find((r) => r.key === 'burak').notSuited, 'burak na glebie kat. I jest niewskazany wg IUNG');
  assert.equal(cmp.rows.at(-1).key, 'burak');
  assert.ok(cmp.current.key === 'ziemniak' && cmp.current.droughtYears > 0);
  for (let i = 1; i < cmp.rows.length - 1; i++) assert.ok(cmp.rows[i - 1].droughtYears <= cmp.rows[i].droughtYears, 'posortowane od najmniejszego ryzyka');
  assert.ok(cmp.safer.length && cmp.safer.every((r) => !r.perennial && r.droughtYears <= cmp.current.droughtYears - 2));
  const act = a.recommendations.agrotechnika.find((x) => x.id === 'agro-wybor-uprawy');
  assert.ok(act && !/truskawki|chmiel|drzewa/.test(act.title));
  assert.equal(cmp.rows.find((r) => r.key === 'warzywa').fao.mmFrom, 350); // kapusta wg FAO, tab. 14

  const tuz = buildAssessment({ ...common, cropId: 'uzytki_zielone' });
  assert.equal(tuz.cropComparison.available, false);
  const noSoil = buildAssessment({ ...common, cropId: 'ziemniak', soil: { category: null, source: 'soilgrids' } });
  assert.equal(noSoil.cropComparison.available, false);
});

test('Kolejne sprawdzenie: 2–3 terminy w roku, po dacie analizy', async () => {
  const { nextCheckDates } = await import('../src/engine.js');
  const { CROPS } = await import('../src/data/crops.js');
  const k = nextCheckDates('2025-07-15', CROPS.kukurydza_ziarno);
  assert.deepEqual(k.map((x) => x.date), ['2025-10-01', '2026-03-01', '2026-04-15']);
  const z = nextCheckDates('2025-11-21', CROPS.zboza_ozime);
  assert.equal(z.length, 3);
  assert.ok(z.every((x) => x.date > '2025-11-21'));
  assert.equal(z[1].title, 'Wiosna');
});

test('Wyszukiwarka miejsc (Nominatim): województwo przed wsią o tej samej nazwie, bez duplikatów', async () => {
  const { parsePlaces } = await import('../src/sources/nominatim.js');
  const maz = parsePlaces(JSON.parse(readFileSync(new URL('./fixtures/nominatim-mazowsze.json', import.meta.url))));
  assert.equal(maz[0].kind, 'województwo');
  assert.match(maz[0].label, /mazowieckie/);
  const cie = parsePlaces(JSON.parse(readFileSync(new URL('./fixtures/nominatim-ciechanow.json', import.meta.url))));
  assert.equal(new Set(cie.map((p) => p.label)).size, cie.length);
  assert.equal(cie[0].name, 'Ciechanów');
  assert.equal(cie[0].bbox.length, 4);
  assert.ok(cie[0].bbox[0] < cie[0].bbox[2] && cie[0].bbox[1] < cie[0].bbox[3]);
});

test('IMGW: odpowiedź "Brak ostrzeżeń" (obiekt zamiast tablicy) nie wywraca raportu', async () => {
  const { warningsForCounty, hydroWarningsFor } = await import('../src/sources/imgw.js');
  const none = JSON.parse(fx('imgw-warningsmeteo-brak.json'));
  assert.ok(!Array.isArray(none) && typeof none.message === 'string');
  assert.deepEqual(warningsForCounty(none, '3025'), []);
  assert.deepEqual(hydroWarningsFor(none, 'wielkopolskie'), []);
  assert.deepEqual(warningsForCounty(null, '3025'), []);
});

test('Platforma (Node i przeglądarka): zlib w obie strony, SHA-1, base64', async () => {
  const { inflate, deflate, sha1hex, toBase64 } = await import('../src/platform.js');
  const data = new TextEncoder().encode('zatrzymaj wodę '.repeat(50));
  assert.deepEqual(await inflate(await deflate(data)), data);
  assert.equal(await sha1hex('abc'), 'a9993e364706816aba3e25717850c26c9cd0d89d');
  assert.equal(toBase64(new Uint8Array([104, 105])), 'aGk=');
});
