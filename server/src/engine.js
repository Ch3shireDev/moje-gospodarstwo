// Silnik analizy. Kolejność wymagana przez KOWR:
// ocena sytuacji wodnej -> przyczyny -> rekomendacje retencyjne -> agrotechnika -> nawadnianie (opcjonalnie).
// Wszystko liczone z pobranych danych; nic nie jest wcześniej przygotowane.
import { CROPS, kcOn } from './data/crops.js';
import { balanceWindow, iungPeriodNear, iungThreshold, longestDrySpell, rootZoneBalance, SOIL_CATEGORIES, KBW_DAYS } from './analysis/water.js';
import { compareWithHistory, monthlyClimatology, sameWindowHistory, vulnerability } from './analysis/history.js';
import { assessWater, identifyCauses, n, seasonOf, signed } from './analysis/assess.js';
import { agroActions, irrigationActions, retentionActions, weatherActions } from './analysis/recommend.js';
import { addDays } from './weather.js';
import { fmtDate } from './format.js';

export { SOIL_CATEGORIES };

export function buildAssessment(input) {
  const { date, today, cropId, soil, weather, terrain = null, waters = null, satellite = null, warnings = [], hydroWarnings = [], failures = {}, parcel = null } = input;
  const crop = CROPS[cropId] ?? CROPS.zboza_ozime;
  const isToday = date === today;
  const days = weather.days;
  const season = seasonOf(date);

  // --- 1. Ocena ---
  const current = balanceWindow(days, date, KBW_DAYS, { kcFor: (d) => kcOn(crop, d) || 0.3 });
  const period = iungPeriodNear(date);
  const soilCatForIung = SOIL_CATEGORIES[soil.category] ? soil.category : null;
  const threshold = period ? iungThreshold(crop.iung, soilCatForIung, period.idx) : undefined;
  const hist = compareWithHistory(current, sameWindowHistory(days, date));
  const vuln = vulnerability(days, date, { iungKey: crop.iung, category: soilCatForIung });
  const rootZone = SOIL_CATEGORIES[soil.category] || soil.category === 'organiczna'
    ? rootZoneBalance(days, date, crop, SOIL_CATEGORIES[soil.category] ? soil.category : 'IV')
    : null;
  const status = current.complete
    ? assessWater({ date, crop, soil, current, period, threshold, history: hist, rootZone, satellite })
    : { level: 'brak', rank: -1, label: 'Za mało danych', tone: 'unknown', season, indicators: [], confirmedBySatellite: null };

  // --- 2. Przyczyny ---
  const drySpell = longestDrySpell(days, date);
  const causes = identifyCauses({ status, current, history: hist, soil, terrain, waters, rootZone, crop, drySpell, satellite });

  // --- 3–5. Rekomendacje ---
  const next = days.filter((d) => d.date > date).slice(0, 7);
  const recentEtc = (() => {
    const w = days.filter((d) => d.date > addDays(date, -7) && d.date <= date && d.et0 != null);
    return w.length ? w.reduce((s, d) => s + d.et0 * (kcOn(crop, d.date) || 0.3), 0) / w.length : 0;
  })();
  const recommendations = status.level === 'brak' ? null : {
    retencja: retentionActions({ status, soil, terrain, waters, vulnerability: vuln, season, watersFailed: !!failures.waters, crop }),
    agrotechnika: agroActions({ status, soil, crop, vulnerability: vuln, date, rootZone, iungNotRecommended: threshold === 'nie' }),
    nawadnianie: irrigationActions({ rootZone, season, isToday, next: isToday ? next : [], crop, recentEtc }),
    pogoda: isToday ? weatherActions({ next, season, warnings, hydroWarnings }) : [],
  };

  const uncertainty = buildUncertainty({ weather, soil, satellite, terrain, waters, failures, hist, crop, threshold, isToday, parcel, rootZone });

  return {
    date,
    isToday,
    season,
    crop: { id: cropId in CROPS ? cropId : 'zboza_ozime', label: crop.label, short: crop.short, critical: crop.critical, iung: !!crop.iung, kcToday: Math.round(kcOn(crop, date) * 100) / 100 },
    soil,
    status,
    metrics: {
      windowDays: KBW_DAYS,
      windowStart: current.start,
      rain: current.rain,
      et0: current.et0,
      etc: current.etc,
      kbw: current.kbw,
      hotDays: current.hotDays,
      drySpell,
      iungPeriod: period?.label ?? null,
      iungThreshold: typeof threshold === 'number' ? threshold : null,
    },
    history: hist,
    vulnerability: vuln,
    climatology: monthlyClimatology(days, date),
    rootZone,
    causes,
    recommendations,
    uncertainty,
    chartDays: days.filter((d) => d.date > addDays(date, -30) && d.date <= addDays(date, 7)),
    summary: templateSummary({ status, current, hist, vuln, crop, causes, recommendations, date, soil }),
  };
}

function buildUncertainty({ weather, soil, satellite, terrain, waters, failures, hist, crop, threshold, isToday, parcel, rootZone }) {
  let score = 3;
  const items = [];
  const add = (text, penalty = 0) => {
    items.push(text);
    score -= penalty;
  };
  add('Pogoda pochodzi z modeli i reanalizy na siatce kilku–kilkudziesięciu km, a nie z pomiaru na polu. Lokalne burze mogą się różnić.');
  add('Progi suszy IUNG wyznaczono dla parowania liczonego metodą Penmana z danych stacji IMGW. My liczymy ET0 metodą FAO-56 z reanalizy, więc wynik może się różnić od komunikatów IUNG.');
  if (weather.sources.some((s) => s.includes('NASA'))) add('Historia pogody pochodzi z zapasowego źródła NASA POWER (siatka ok. 50 km, ET0 policzone przez nas) – dokładność niższa niż ERA5.', 1);
  if (hist.years < 8) add(`Porównanie historyczne objęło tylko ${hist.years} lat.`, 1);
  if (soil.source !== 'iung') add(soil.source === 'user' ? 'Kategorię gleby wskazał użytkownik.' : 'Kategoria gleby oszacowana z modelu SoilGrids (250 m), bo mapa IUNG nie miała danych – może odbiegać od mapy glebowo-rolniczej.', soil.source === 'user' ? 0 : 1);
  if (soil.mixed) add('Na działce występuje więcej niż jedna kategoria gleby – ocena dotyczy dominującej.', 0.5);
  if (!crop.iung) add('IUNG nie publikuje progów suszy dla tej uprawy – ocena opiera się na porównaniu z poprzednimi latami i bilansie strefy korzeni.', 0.5);
  if (threshold === undefined && crop.iung) add('Data poza okresami oceny suszy IUNG (21 marca – 30 września) – ocena na tle poprzednich lat.', 0);
  if (!satellite?.current?.clear) add(`Brak bezchmurnych danych Sentinel-2 dla działki z 30 dni przed datą analizy${failures.satellite ? ` (${failures.satellite})` : ''}.`, 0.5);
  else add(`Dane Sentinel-2 z ${fmtDate(satellite.current.date)}, piksel 20 m. W poprzednich latach na działce mogły rosnąć inne uprawy, więc porównanie NDVI jest orientacyjne.`);
  if (!terrain) add(`Brak danych o ukształtowaniu terenu${failures.terrain ? ` (${failures.terrain})` : ''}.`, 0.5);
  if (!waters) add(`Brak danych o rowach i ciekach${failures.waters ? ` (${failures.waters})` : ''} – rekomendacje retencyjne są ogólne.`, 0.5);
  else add('Rowy i cieki z OpenStreetMap – mapa bywa niekompletna, szczególnie dla małych rowów melioracyjnych.');
  if (!isToday) add('Analiza historyczna: ostrzeżenia i pomiary IMGW są dostępne tylko na bieżąco, a prognozy z tamtego dnia nie znamy.');
  if (!parcel?.geometry) add('Brak obrysu działki – analiza dla punktu i jego otoczenia.', 1);
  if (rootZone?.applicable) add('Bilans strefy korzeni zakłada, że 1 marca gleba była nasycona wodą do polowej pojemności, i nie uwzględnia nawadniania, wód gruntowych ani drenowania.');
  add('Nie uwzględniamy faktycznej fazy rozwoju roślin (przyjęty typowy kalendarz), zabiegów na polu ani poziomu wód gruntowych.');
  add('Nie znamy Twoich zobowiązań z programów dopłat (ekoschematy, pakiety rolno-środowiskowo-klimatyczne, rolnictwo ekologiczne) ani ograniczeń na obszarach chronionych – ich zasady mają pierwszeństwo przed radami z raportu.');
  const level = score >= 2.5 ? 'wysoka' : score >= 1 ? 'srednia' : 'niska';
  return { level, label: { wysoka: 'Wysoka pewność', srednia: 'Średnia pewność', niska: 'Niska pewność' }[level], score: Math.round(score * 10) / 10, items };
}

/** Podsumowanie prostym językiem: co się dzieje, czy to normalne, co zrobić najpierw. Liczby zaokrąglone. */
function templateSummary({ status, current, hist, vuln, recommendations, date }) {
  if (status.level === 'brak') return 'Za mało danych pogodowych, żeby ocenić wodę na tej działce.';
  const parts = [status.plain];
  const pct = hist.rainPctOfNormal;
  const rain = `W ostatnich dwóch miesiącach (do ${fmtDate(date)}) spadło ${Math.round(current.rain)} mm deszczu`;
  if (pct == null) parts.push(`${rain}.`);
  else if (pct >= 90 && pct <= 110) parts.push(`${rain} – mniej więcej tyle, ile zwykle.`);
  else if (pct < 90) parts.push(`${rain} – o ${100 - pct}% mniej niż zwykle.`);
  else parts.push(`${rain} – o ${pct - 100}% więcej niż zwykle.`);
  if (vuln.level) {
    parts.push(vuln.droughtYearsCount
      ? `Susza była tu w ${vuln.droughtYearsCount} z ${vuln.seasons} ostatnich lat${vuln.riskMonths ? `, najczęściej ${vuln.riskMonths.label}` : ''}.`
      : `W ostatnich ${vuln.seasons} latach suszy tu nie było.`);
  }
  const first = recommendations?.retencja?.[0];
  if (first) parts.push(`Najważniejsze: ${first.title.charAt(0).toLowerCase()}${first.title.slice(1)}.`);
  return parts.join(' ');
}

