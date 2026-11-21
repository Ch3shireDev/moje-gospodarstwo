// Bilans wodny: klimatyczny (KBW, jak w IUNG) i glebowy (FAO-56, rozdz. 8).
import { IUNG_PERIODS, IUNG_THRESHOLDS } from '../data/iungKbw.js';
import { kcOn } from '../data/crops.js';
import { addDays, daysBetween } from '../weather.js';
import { fmtDayMonth } from '../format.js';

export const KBW_DAYS = 61; // okres sześciodekadowy IUNG (np. 21.III–20.V to 61 dni)

/**
 * Kategorie podatności gleb na suszę IUNG (woda ogólnie dostępna WOD w profilu do 1,5 m).
 * Źródło przedziałów: https://susza.iung.pulawy.pl/kategorie/. wodMm = środek przedziału (nasze przybliżenie
 * do bilansu glebowego); dla kat. I i IV, które są otwarte, przyjęliśmy 110 i 220 mm.
 */
export const SOIL_CATEGORIES = {
  I: { label: 'kategoria I – bardzo podatna na suszę', short: 'bardzo podatna (lekka, piaszczysta)', wodRange: '< 127,5 mm', wodMm: 110 },
  II: { label: 'kategoria II – podatna na suszę', short: 'podatna (piasek gliniasty)', wodRange: '127,5–169,9 mm', wodMm: 149 },
  III: { label: 'kategoria III – średnio podatna na suszę', short: 'średnio podatna (glina lekka, pył)', wodRange: '170–202,5 mm', wodMm: 186 },
  IV: { label: 'kategoria IV – mało podatna na suszę', short: 'mało podatna (glina średnia i ciężka, ił)', wodRange: '> 202,5 mm', wodMm: 220 },
};

const md = (iso) => [Number(iso.slice(5, 7)), Number(iso.slice(8, 10))];

/** Suma opadu, ET0 i KBW w oknie `len` dni kończącym się w `end` (włącznie). */
export function balanceWindow(days, end, len = KBW_DAYS, { kcFor } = {}) {
  const start = addDays(end, -(len - 1));
  const win = days.filter((d) => d.date >= start && d.date <= end);
  let rain = 0, et0 = 0, etc = 0, missing = 0, hot = 0, dryDays = 0;
  for (const d of win) {
    if (d.rain == null || d.et0 == null) {
      missing++;
      continue;
    }
    rain += d.rain;
    et0 += d.et0;
    if (kcFor) etc += kcFor(d.date) * d.et0;
    if (d.tmax != null && d.tmax >= 30) hot++;
    if (d.rain < 1) dryDays++;
  }
  const expected = len;
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    start,
    end,
    rain: r1(rain),
    et0: r1(et0),
    etc: kcFor ? r1(etc) : null,
    kbw: r1(rain - et0),
    hotDays: hot,
    dryDays,
    complete: win.length - missing >= expected - 2,
    days: win.length - missing,
  };
}

/** Najdłuższy ciąg dni bez opadu (< 1 mm) kończący się najpóźniej w `end`, liczony w oknie len dni. */
export function longestDrySpell(days, end, len = KBW_DAYS) {
  const start = addDays(end, -(len - 1));
  let best = 0, cur = 0;
  for (const d of days.filter((x) => x.date >= start && x.date <= end)) {
    if (d.rain != null && d.rain < 1) {
      cur++;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best;
}

/** Okres IUNG, którego koniec jest najbliżej daty (maks. ±10 dni). null poza sezonem oceny. */
export function iungPeriodNear(date) {
  const year = date.slice(0, 4);
  let best = null;
  IUNG_PERIODS.forEach(([sm, sd, em, ed], idx) => {
    const end = `${year}-${String(em).padStart(2, '0')}-${String(ed).padStart(2, '0')}`;
    const diff = Math.abs(daysBetween(end, date));
    if (diff <= 10 && (!best || diff < best.diff)) {
      best = { idx, diff, end, start: `${year}-${String(sm).padStart(2, '0')}-${String(sd).padStart(2, '0')}`, label: `${fmtDayMonth(sm, sd)}–${fmtDayMonth(em, ed)}` };
    }
  });
  return best;
}

export function iungPeriodDates(year, idx) {
  const [sm, sd, em, ed] = IUNG_PERIODS[idx];
  const p = (m, d) => `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return { start: p(sm, sd), end: p(em, ed), label: `${fmtDayMonth(sm, sd)}–${fmtDayMonth(em, ed)}` };
}


/** Próg KBW IUNG: liczba (mm), null (brak spadków plonu w tym okresie), 'nie' (uprawa niewskazana), undefined (brak danych). */
export function iungThreshold(iungKey, category, periodIdx) {
  if (!iungKey || !category || periodIdx == null) return undefined;
  return IUNG_THRESHOLDS[iungKey]?.[category]?.[periodIdx];
}

/**
 * Bilans wody w strefie korzeniowej (FAO-56, rozdz. 8, uproszczony – bez współczynnika stresu Ks).
 * Start: 1 marca (po zimie zakładamy glebę uwilgotnioną do polowej pojemności wodnej – założenie).
 * TAW = WOD kategorii × (głębokość korzeni / 1,5 m), RAW = p × TAW.
 */
export function rootZoneBalance(days, date, crop, soilCategory) {
  const cat = SOIL_CATEGORIES[soilCategory] ?? SOIL_CATEGORIES.III;
  const taw = Math.round(cat.wodMm * Math.min(crop.rootM, 1.5) / 1.5);
  const raw = Math.round(crop.p * taw);
  const [m] = md(date);
  if (m < 3 || m > 10) return { applicable: false, taw, raw, reason: 'poza sezonem wegetacyjnym' };
  const start = `${date.slice(0, 4)}-03-01`;
  let dr = 0;
  let daysOverRaw = 0;
  let used = 0;
  for (const d of days) {
    if (d.date < start || d.date > date) continue;
    if (d.rain == null || d.et0 == null) continue;
    const kc = kcOn(crop, d.date) || 0.3; // pole bez uprawy: parowanie z gleby, Kc ≈ 0,3 (przybliżenie)
    dr = Math.min(taw, Math.max(0, dr - d.rain + kc * d.et0));
    daysOverRaw = dr > raw ? daysOverRaw + 1 : 0;
    used++;
  }
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    applicable: true,
    start,
    taw,
    raw,
    depletion: r1(dr),
    available: r1(taw - dr),
    availablePct: Math.round(((taw - dr) / taw) * 100),
    overRaw: dr > raw,
    daysOverRaw,
    days: used,
    kcToday: r1(kcOn(crop, date)),
  };
}
