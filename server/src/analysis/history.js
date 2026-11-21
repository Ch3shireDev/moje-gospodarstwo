// Ocena na tle 10 lat: percentyl bieżącego KBW i historyczna podatność działki na suszę.
import { IUNG_PERIODS } from '../data/iungKbw.js';
import { balanceWindow, iungPeriodDates, iungThreshold, KBW_DAYS } from './water.js';

const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
const MONTHS_GEN = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];

const sameDayInYear = (date, year) => {
  const mmdd = date.slice(5) === '02-29' ? '02-28' : date.slice(5);
  return `${year}-${mmdd}`;
};

/** Ten sam 61-dniowy okres w poprzednich latach (do 10). */
export function sameWindowHistory(days, date, years = 10) {
  const y0 = Number(date.slice(0, 4));
  const out = [];
  for (let y = y0 - 1; y >= y0 - years; y--) {
    const w = balanceWindow(days, sameDayInYear(date, y), KBW_DAYS);
    if (w.complete) out.push({ year: y, ...w });
  }
  return out;
}

/** Percentyl (0–100): jaki odsetek lat miał w tym okresie bilans niższy lub równy. */
export function percentileOf(value, sample) {
  if (!sample.length) return null;
  const below = sample.filter((x) => x < value).length;
  const equal = sample.filter((x) => x === value).length;
  return Math.round(((below + equal / 2) / sample.length) * 100);
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const r1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

export function compareWithHistory(current, history) {
  const kbws = history.map((h) => h.kbw);
  return {
    years: history.length,
    percentile: percentileOf(current.kbw, kbws),
    meanKbw: r1(mean(kbws)),
    meanRain: r1(mean(history.map((h) => h.rain))),
    meanEt0: r1(mean(history.map((h) => h.et0))),
    meanHotDays: r1(mean(history.map((h) => h.hotDays))),
    minKbw: kbws.length ? Math.min(...kbws) : null,
    maxKbw: kbws.length ? Math.max(...kbws) : null,
    rainPctOfNormal: mean(history.map((h) => h.rain)) ? Math.round((current.rain / mean(history.map((h) => h.rain))) * 100) : null,
    et0PctOfNormal: mean(history.map((h) => h.et0)) ? Math.round((current.et0 / mean(history.map((h) => h.et0))) * 100) : null,
    byYear: history.map((h) => ({ year: h.year, kbw: h.kbw, rain: h.rain, et0: h.et0 })),
  };
}

/**
 * Historyczna podatność: w ilu z ostatnich lat KBW spadł poniżej progu IUNG dla uprawy i gleby,
 * w którym okresie najczęściej. Gdy uprawa nie ma progów IUNG – porównujemy okresy między sobą (mediana KBW).
 */
export function vulnerability(days, date, { iungKey, category }, years = 10) {
  const y0 = Number(date.slice(0, 4));
  // Pełne sezony przed datą analizy (sezon oceny IUNG kończy się 30.IX).
  const lastFull = date.slice(5) >= '09-30' ? y0 : y0 - 1;
  const seasons = [];
  for (let y = lastFull; y > lastFull - years; y--) seasons.push(y);

  const periods = IUNG_PERIODS.map((_, idx) => {
    const rows = [];
    for (const y of seasons) {
      const p = iungPeriodDates(y, idx);
      const w = balanceWindow(days, p.end, KBW_DAYS);
      if (!w.complete) continue;
      const thr = iungThreshold(iungKey, category, idx);
      rows.push({ year: y, kbw: w.kbw, drought: typeof thr === 'number' ? w.kbw < thr : null });
    }
    const thr = iungThreshold(iungKey, category, idx);
    const kbws = rows.map((r) => r.kbw).sort((a, b) => a - b);
    return {
      idx,
      label: iungPeriodDates(y0, idx).label,
      endMonth: IUNG_PERIODS[idx][2],
      threshold: thr ?? null,
      evaluated: rows.length,
      droughtYears: rows.filter((r) => r.drought).map((r) => r.year),
      medianKbw: kbws.length ? kbws[Math.floor(kbws.length / 2)] : null,
    };
  });

  const usable = periods.filter((p) => p.evaluated > 0);
  const evaluatedYears = new Set();
  const droughtYears = new Set();
  for (const p of periods) {
    if (typeof p.threshold !== 'number') continue;
    for (const y of seasons) evaluatedYears.add(y);
    p.droughtYears.forEach((y) => droughtYears.add(y));
  }
  const hasThresholds = periods.some((p) => typeof p.threshold === 'number');
  const notRecommended = periods.every((p) => p.threshold === 'nie');

  // Najbardziej ryzykowne okresy: z progami – najwięcej lat z suszą; bez progów – najniższa mediana KBW.
  let risky;
  if (hasThresholds) {
    const maxN = Math.max(0, ...periods.map((p) => p.droughtYears.length));
    risky = maxN > 0 ? periods.filter((p) => p.droughtYears.length >= Math.max(1, maxN - 1) && typeof p.threshold === 'number') : [];
  } else {
    const sorted = [...usable].sort((a, b) => a.medianKbw - b.medianKbw);
    risky = sorted.slice(0, 3);
  }
  const riskMonths = monthsSpan(risky);

  const n = droughtYears.size;
  const total = seasons.length;
  const level = !hasThresholds ? null : n >= 4 ? 'wysoka' : n >= 2 ? 'srednia' : 'niska';

  return {
    seasons: total,
    seasonsRange: total ? `${seasons.at(-1)}–${seasons[0]}` : null,
    hasThresholds,
    notRecommended,
    droughtYears: [...droughtYears].sort(),
    droughtYearsCount: n,
    level,
    riskPeriods: risky.map((p) => ({ label: p.label, droughtYears: p.droughtYears.length, medianKbw: p.medianKbw })),
    riskMonths,
    periods,
  };
}

function monthsSpan(periods) {
  if (!periods.length) return null;
  // Okres sześciodekadowy obejmuje ok. dwa miesiące przed końcem – bierzemy miesiące, w których leży.
  const months = new Set();
  for (const p of periods) {
    const [sm, , em] = IUNG_PERIODS[p.idx];
    for (let m = sm; m <= em; m++) months.add(m);
  }
  const arr = [...months].sort((a, b) => a - b);
  // Okres zaczynający się 21.III to praktycznie kwiecień–maj.
  const trimmed = arr.length > 2 && arr[0] === 3 ? arr.slice(1) : arr;
  return { from: trimmed[0], to: trimmed.at(-1), label: trimmed.length === 1 ? MONTHS[trimmed[0] - 1] : `od ${MONTHS_GEN[trimmed[0] - 1]} do ${MONTHS_GEN[trimmed.at(-1) - 1]}` };
}

/** Średni miesięczny bilans (opad − ET0) z 10 lat i bieżący rok – do wykresu "typowy rok vs ten rok". */
export function monthlyClimatology(days, date, years = 10) {
  const y0 = Number(date.slice(0, 4));
  const acc = Array.from({ length: 12 }, () => ({ sum: 0, n: 0 }));
  const cur = Array.from({ length: 12 }, () => ({ sum: 0, n: 0, days: 0 }));
  for (const d of days) {
    if (d.rain == null || d.et0 == null) continue;
    const y = Number(d.date.slice(0, 4));
    const m = Number(d.date.slice(5, 7)) - 1;
    if (y >= y0 - years && y < y0) {
      acc[m].sum += d.rain - d.et0;
      acc[m].n++;
    }
    if (y === y0 && d.date <= date) {
      cur[m].sum += d.rain - d.et0;
      cur[m].days++;
    }
  }
  return acc.map((a, m) => {
    const daysInMonth = new Date(Date.UTC(y0, m + 1, 0)).getUTCDate();
    return {
      month: m + 1,
      normal: a.n ? r1((a.sum / a.n) * daysInMonth) : null,
      current: cur[m].days >= daysInMonth - 1 ? r1(cur[m].sum) : null,
      currentPartial: cur[m].days > 0 && cur[m].days < daysInMonth - 1 ? r1(cur[m].sum) : null,
    };
  });
}
