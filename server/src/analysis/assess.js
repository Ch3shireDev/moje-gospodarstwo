// Etap 1 i 2: ocena sytuacji wodnej i identyfikacja przyczyn.
// Każdy wskaźnik ma wartość, odniesienie i werdykt – raport pokazuje je wszystkie, żeby wynik był sprawdzalny.
import { SOIL_CATEGORIES } from './water.js';
import { fmtDate } from '../format.js';

const n1 = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });
export const n = (x) => (x == null ? '–' : n1.format(x));
export const signed = (x) => (x == null ? '–' : x > 0 ? `+${n(x)}` : n(x));

// plain – jedno proste zdanie dla rolnika (bez żargonu), pokazywane pod etykietą stanu.
export const LEVELS = {
  susza: { rank: 3, label: 'Susza', tone: 'critical', plain: 'Brakuje wody. Susza może obniżyć plon.' },
  zagrozenie: { rank: 2, label: 'Prawie susza', tone: 'warning', plain: 'Jest bardzo sucho – niewiele brakuje do suszy.' },
  sucho: { rank: 1, label: 'Sucho', tone: 'warning', plain: 'Jest sucho jak na tę porę roku.' },
  ok: { rank: 0, label: 'Woda w normie', tone: 'good', plain: 'Wody jest wystarczająco.' },
  mokro: { rank: 0, label: 'Mokro', tone: 'wet', plain: 'Wody jest dużo, więcej niż zwykle.' },
  brak: { rank: -1, label: 'Brak danych', tone: 'unknown', plain: 'Za mało danych, żeby ocenić.' },
};

// Margines "blisko progu" – nasze założenie (nie pochodzi z IUNG): 30 mm przed progiem suszy.
export const NEAR_THRESHOLD_MM = 30;

export function seasonOf(isoDate) {
  const m = Number(isoDate.slice(5, 7));
  if (m >= 4 && m <= 9) return 'wegetacja';
  if (m === 3 || m === 10) return 'przejsciowy';
  return 'spoczynek';
}

/** Wskaźniki i werdykt końcowy. */
export function assessWater({ date, crop, soil, current, period, threshold, history, rootZone, satellite }) {
  const indicators = [];

  // 1. KBW wg kryteriów IUNG – główny wskaźnik suszy rolniczej.
  if (typeof threshold === 'number') {
    const level = current.kbw < threshold ? 'susza' : current.kbw < threshold + NEAR_THRESHOLD_MM ? 'zagrozenie' : 'ok';
    indicators.push({
      id: 'kbw-iung',
      name: 'Klimatyczny bilans wodny vs próg suszy IUNG',
      value: `${signed(current.kbw)} mm`,
      reference: `próg ${n(threshold)} mm (${crop.short}, gleba kat. ${soil.category}, okres ${period.label})`,
      level,
      verdict:
        level === 'susza'
          ? `Bilans z 61 dni jest poniżej progu suszy rolniczej IUNG o ${n(Math.round(threshold - current.kbw))} mm.`
          : level === 'zagrozenie'
            ? `Do progu suszy IUNG brakuje ${n(Math.round(current.kbw - threshold))} mm.`
            : `Bilans jest ${n(Math.round(current.kbw - threshold))} mm nad progiem suszy IUNG.`,
      decisive: true,
    });
  } else if (threshold === null && period) {
    indicators.push({
      id: 'kbw-iung',
      name: 'Klimatyczny bilans wodny vs próg suszy IUNG',
      value: `${signed(current.kbw)} mm`,
      reference: `IUNG nie notuje spadków plonu z suszy dla: ${crop.short}, okres ${period.label}`,
      level: 'ok',
      verdict: 'W tym okresie susza nie obniża zwykle plonu tej uprawy (brak progu w tabeli IUNG).',
      decisive: false,
    });
  } else if (threshold === 'nie') {
    indicators.push({
      id: 'kbw-iung',
      name: 'Klimatyczny bilans wodny vs próg suszy IUNG',
      value: `${signed(current.kbw)} mm`,
      reference: `IUNG: ${crop.short} nie jest wskazana na glebie kat. ${soil.category}`,
      level: 'zagrozenie',
      verdict: 'Ta uprawa nie jest zalecana na tej kategorii gleby – ryzyko niedoboru wody jest podwyższone niezależnie od pogody.',
      decisive: false,
    });
  }

  // 2. Na tle 10 lat – ten sam okres w poprzednich latach.
  if (history.percentile != null && history.years >= 5) {
    const p = history.percentile;
    const level = p <= 10 ? 'sucho' : p <= 25 ? 'sucho' : p >= 80 && current.kbw > 0 ? 'mokro' : 'ok';
    indicators.push({
      id: 'kbw-historia',
      name: `Bilans na tle ${history.years} lat`,
      value: `${signed(current.kbw)} mm`,
      reference: `średnio ${signed(history.meanKbw)} mm; najgorszy rok ${signed(history.minKbw)} mm`,
      level,
      verdict:
        p <= 10
          ? `Jeden z najsuchszych okresów w ostatnich latach (bardziej sucho było w mniej niż 10% lat).`
          : p <= 25
            ? `Sucho jak na tę porę roku – bardziej sucho było tylko w ok. ${p}% lat.`
            : p >= 80
              ? `Wilgotniej niż zwykle – tak mokro było tylko w ok. ${100 - p}% lat.`
              : `Typowo jak na tę porę roku (percentyl ${p}).`,
      percentile: p,
      decisive: true,
    });
  }

  // 3. Zapas wody w strefie korzeni (FAO-56) – czy rośliny już odczuwają brak.
  if (rootZone?.applicable) {
    const level = rootZone.overRaw ? (rootZone.availablePct <= 25 ? 'zagrozenie' : 'sucho') : 'ok';
    indicators.push({
      id: 'strefa-korzeni',
      name: 'Zapas wody w strefie korzeni (FAO-56)',
      value: `${n(rootZone.available)} z ${n(rootZone.taw)} mm (${rootZone.availablePct}%)`,
      reference: `rośliny zaczynają odczuwać brak wody poniżej ${n(rootZone.taw - rootZone.raw)} mm`,
      level,
      verdict: rootZone.overRaw
        ? `Woda łatwo dostępna dla roślin skończyła się ${rootZone.daysOverRaw} dni temu – rośliny mogą ograniczać wzrost.`
        : `Rośliny mają jeszcze ok. ${n(Math.max(0, rootZone.raw - rootZone.depletion))} mm wody łatwo dostępnej.`,
      decisive: true,
    });
  }

  // 4. Satelita – tylko jako wskaźnik pomocniczy (nie interpretujemy go samodzielnie).
  if (satellite?.current?.clear) {
    const s = satellite.current;
    const hist = (satellite.history ?? []).filter((h) => h.clear && h.ndvi != null);
    const med = hist.length >= 3 ? median(hist.map((h) => h.ndvi)) : null;
    const medNdmi = hist.filter((h) => h.ndmi != null).length >= 3 ? median(hist.filter((h) => h.ndmi != null).map((h) => h.ndmi)) : null;
    const anomaly = med != null && s.ndvi != null ? Math.round((s.ndvi - med) * 100) / 100 : null;
    const ndmiAnomaly = medNdmi != null && s.ndmi != null ? Math.round((s.ndmi - medNdmi) * 100) / 100 : null;
    const bare = s.bareShare >= 0.5 || (s.ndvi != null && s.ndvi < 0.25);
    const weaker = !bare && ((anomaly != null && anomaly <= -0.1) || (ndmiAnomaly != null && ndmiAnomaly <= -0.1));
    indicators.push({
      id: 'satelita',
      name: 'Stan roślin z satelity (Sentinel-2)',
      value: `NDVI ${n(s.ndvi)}${s.ndmi != null ? `, NDMI ${n(s.ndmi)}` : ''} (${fmtDate(s.date)})`,
      reference: med != null ? `mediana z ${hist.length} lat w tym samym okresie: NDVI ${n(med)}${medNdmi != null ? `, NDMI ${n(medNdmi)}` : ''}` : 'za mało bezchmurnych scen z poprzednich lat do porównania',
      level: weaker ? 'sucho' : 'ok',
      verdict: bare
        ? 'W danych z satelity przeważa odkryta gleba lub słaba roślinność (np. po zbiorze lub przed wschodami) – wskaźnik nie mówi wiele o suszy.'
        : weaker
          ? 'Roślinność wyraźnie słabsza lub suchsza niż zwykle o tej porze. Pamiętaj, że w poprzednich latach na działce mogła rosnąć inna uprawa.'
          : anomaly != null
            ? 'Roślinność w typowym stanie jak na tę porę roku.'
            : 'Brak odniesienia z poprzednich lat – sama wartość nie wystarcza do oceny suszy.',
      anomaly,
      ndmiAnomaly,
      decisive: false,
    });
  }

  // Werdykt: najwyższy poziom spośród wskaźników rozstrzygających; satelita może tylko potwierdzić.
  const decisive = indicators.filter((i) => i.decisive);
  let level = 'brak';
  if (decisive.length) {
    const worst = decisive.reduce((a, b) => (LEVELS[b.level].rank > LEVELS[a.level].rank ? b : a));
    level = worst.level;
    if (LEVELS[level].rank === 0) level = decisive.some((i) => i.level === 'mokro') && !decisive.some((i) => LEVELS[i.level].rank > 0) ? 'mokro' : 'ok';
  }
  const sat = indicators.find((i) => i.id === 'satelita');
  const confirmedBySatellite = sat && LEVELS[level].rank > 0 ? sat.level === 'sucho' : null;
  return {
    level,
    ...LEVELS[level],
    season: seasonOf(date),
    indicators,
    confirmedBySatellite,
    periodLabel: period?.label ?? null,
  };
}

/** Etap 2: przyczyny. Zwraca tylko te, które dane potwierdzają, z liczbami. */
export function identifyCauses({ status, current, history, soil, terrain, waters, rootZone, crop, drySpell, satellite }) {
  const causes = [];
  const dryish = status.rank > 0;
  const add = (c) => causes.push(c);

  if (history.rainPctOfNormal != null && history.rainPctOfNormal <= 75) {
    add({
      id: 'opad',
      title: 'Mało opadów',
      detail: `W ciągu 61 dni spadło ${n(current.rain)} mm, a średnio w tym okresie ${n(history.meanRain)} mm (${history.rainPctOfNormal}% normy z ${history.years} lat).`,
      weight: history.rainPctOfNormal <= 50 ? 3 : 2,
      kind: 'pogoda',
    });
  }
  if (drySpell >= 14) {
    add({ id: 'bez-deszczu', title: 'Długi okres bez deszczu', detail: `${drySpell} dni z rzędu z opadem poniżej 1 mm.`, weight: drySpell >= 21 ? 2 : 1, kind: 'pogoda' });
  }
  if ((history.et0PctOfNormal != null && history.et0PctOfNormal >= 110) || (history.meanHotDays != null && current.hotDays >= history.meanHotDays + 2)) {
    add({
      id: 'parowanie',
      title: current.hotDays > 0 ? 'Wysokie parowanie i upał' : 'Parowanie wyższe niż zwykle',
      detail: `Parowanie wzorcowe ${n(current.et0)} mm (${history.et0PctOfNormal ?? '–'}% normy z ${history.years} lat)${current.hotDays > 0 ? `, dni z temperaturą ≥ 30°C: ${current.hotDays} (średnio ${n(history.meanHotDays)})` : ''}.`,
      weight: 2,
      kind: 'pogoda',
    });
  }
  if (soil.category === 'I' || soil.category === 'II') {
    const cat = SOIL_CATEGORIES[soil.category];
    add({
      id: 'gleba',
      title: 'Gleba słabo magazynuje wodę',
      detail: `${cap(cat.label)} (woda ogólnie dostępna ${cat.wodRange} w profilu do 1,5 m wg IUNG). Lekka gleba szybciej przesycha.`,
      weight: soil.category === 'I' ? 3 : 2,
      kind: 'gleba',
    });
  }
  if (soil.socTopGkg != null && soil.socTopGkg < 10) {
    add({
      id: 'materia-organiczna',
      title: 'Mało materii organicznej',
      detail: `Węgiel organiczny w warstwie 0–30 cm ok. ${n(soil.socTopGkg)} g/kg (model SoilGrids, siatka 250 m). Gleba uboga w próchnicę trzyma mniej wody.`,
      weight: 1,
      kind: 'gleba',
    });
  }
  if (terrain && terrain.slopePct >= 3) {
    add({
      id: 'splyw',
      title: 'Woda spływa po stoku',
      detail: `Średni spadek działki ${n(terrain.slopePct)}% w kierunku: ${terrain.downslope} (różnica wysokości ${n(terrain.reliefM)} m, NMT GUGiK). Przy ulewach część wody odpływa, zamiast wsiąkać.`,
      weight: terrain.slopePct >= 6 ? 2 : 1,
      kind: 'teren',
    });
  }
  if (waters?.nearestDitch && waters.nearestDitch.distM <= 50) {
    add({
      id: 'rowy',
      title: 'Rów odprowadza wodę z pola',
      detail: `${cap(waters.nearestDitch.kind)} ${waters.nearestDitch.distM === 0 ? 'przecina działkę' : `ok. ${waters.nearestDitch.distM} m od działki`} (OpenStreetMap). Niezatrzymany rów drenuje wodę gruntową, zwłaszcza wiosną.`,
      weight: 1,
      kind: 'hydrologia',
    });
  }
  if (rootZone?.applicable && rootZone.kcToday >= 1 && dryish) {
    add({
      id: 'uprawa',
      title: 'Uprawa w okresie największych potrzeb wodnych',
      detail: `${cap(crop.short)}: współczynnik uprawowy Kc ok. ${n(rootZone.kcToday)} (FAO-56) – rośliny zużywają co najmniej tyle wody co trawnik wzorcowy. Okres krytyczny: ${crop.critical}.`,
      weight: 1,
      kind: 'uprawa',
    });
  }
  const sat = status.indicators.find((i) => i.id === 'satelita');
  if (sat?.level === 'sucho' && satellite?.current) {
    add({ id: 'roslinnosc', title: 'Satelita: rośliny słabsze niż zwykle', detail: sat.verdict + ` (${sat.value}; ${sat.reference}).`, weight: 1, kind: 'satelita' });
  }

  causes.sort((a, b) => b.weight - a.weight);
  return { list: causes, main: dryish ? causes.filter((c) => c.kind === 'pogoda' || c.weight >= 2).slice(0, 3) : [] };
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
function median(a) {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
