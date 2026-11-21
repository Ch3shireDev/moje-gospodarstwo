// Porównanie upraw na tej działce: w ilu z ostatnich 10 sezonów każda uprawa z listy IUNG-PIB
// wpadłaby w suszę rolniczą na tej kategorii gleby. Ten sam klimatyczny bilans wodny (KBW)
// i te same progi co w ocenie głównej – zmienia się tylko uprawa.
// To podpowiedź o ryzyku suszy, a nie zalecenie zmiany uprawy: o wyborze decydują też
// płodozmian, rynek, maszyny i zobowiązania z dopłat.
import { IUNG_THRESHOLDS } from '../data/iungKbw.js';
import { IUNG_CROPS, faoSensitivityLabel, FAO_SOURCE } from '../data/cropWater.js';
import { balanceWindow, iungPeriodDates, iungThreshold, KBW_DAYS } from './water.js';
import { IUNG_PERIODS } from '../data/iungKbw.js';

const levelOf = (n) => (n >= 4 ? 'wysoka' : n >= 2 ? 'srednia' : 'niska');
const median = (a) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function compareCrops(days, date, { category, currentIung = null }, years = 10) {
  if (!category) return { available: false, reason: 'Nie znamy kategorii gleby z mapy IUNG, więc nie da się porównać upraw według progów suszy.' };
  const y0 = Number(date.slice(0, 4));
  const lastFull = date.slice(5) >= '09-30' ? y0 : y0 - 1;
  const seasons = [];
  for (let y = lastFull; y > lastFull - years; y--) seasons.push(y);

  // KBW okresów sześciodekadowych nie zależy od uprawy – liczymy raz.
  const kbw = new Map();
  for (const y of seasons) {
    for (let idx = 0; idx < IUNG_PERIODS.length; idx++) {
      const w = balanceWindow(days, iungPeriodDates(y, idx).end, KBW_DAYS);
      if (w.complete) kbw.set(`${y}:${idx}`, w.kbw);
    }
  }
  const evaluated = seasons.filter((y) => IUNG_PERIODS.some((_, idx) => kbw.has(`${y}:${idx}`)));
  if (evaluated.length < 5) return { available: false, reason: 'Za mało pełnych sezonów pogody, żeby porównać uprawy.' };

  const rows = Object.keys(IUNG_THRESHOLDS).map((key) => {
    const meta = IUNG_CROPS[key] ?? { label: key, cropId: null, fao: null };
    const thr = IUNG_PERIODS.map((_, idx) => iungThreshold(key, category, idx));
    const fao = meta.fao ? { row: meta.fao.row, mmFrom: meta.fao.mm[0], mmTo: meta.fao.mm[1], sensitivity: faoSensitivityLabel(meta.fao.sensitivity) } : null;
    const base = { key, label: meta.label, cropId: meta.cropId, perennial: !!meta.perennial, current: key === currentIung, fao };
    if (thr.every((t) => t === 'nie')) return { ...base, notSuited: true, droughtYears: null, level: null, medianMargin: null };
    let droughtYears = 0;
    const margins = [];
    for (const y of evaluated) {
      let worst = null;
      for (let idx = 0; idx < thr.length; idx++) {
        const v = kbw.get(`${y}:${idx}`);
        if (typeof thr[idx] !== 'number' || v == null) continue;
        const m = v - thr[idx];
        if (worst == null || m < worst) worst = m;
      }
      if (worst == null) continue;
      margins.push(worst);
      if (worst < 0) droughtYears++;
    }
    const mm = median(margins);
    return { ...base, notSuited: false, droughtYears, level: levelOf(droughtYears), medianMargin: mm == null ? null : Math.round(mm) };
  });

  // Najpierw najmniejsze ryzyko; przy remisie – większy zapas wody do progu w typowym roku.
  rows.sort((a, b) => {
    if (a.notSuited !== b.notSuited) return a.notSuited ? 1 : -1;
    if (a.notSuited) return 0;
    return a.droughtYears - b.droughtYears || (b.medianMargin ?? 0) - (a.medianMargin ?? 0);
  });

  const cur = rows.find((r) => r.current) ?? null;
  // „Mniej ryzykowne”: co najmniej 2 sezony suszy mniej niż obecna uprawa (różnica 1 sezonu to szum).
  // Jako zamiennik podsuwamy tylko uprawy polowe – sad czy plantacji chmielu nie zakłada się zamiast ziemniaków.
  const safer = cur && !cur.notSuited ? rows.filter((r) => !r.notSuited && !r.current && !r.perennial && r.droughtYears <= cur.droughtYears - 2) : [];
  return {
    available: true,
    category,
    seasons: evaluated.length,
    seasonsRange: `${evaluated.at(-1)}–${evaluated[0]}`,
    rows,
    current: cur,
    safer,
    faoSource: FAO_SOURCE,
  };
}
