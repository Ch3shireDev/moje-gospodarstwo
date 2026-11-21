const num = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 });
export const n = (x) => (x == null || Number.isNaN(x) ? '–' : num.format(x));
export const signed = (x) => (x == null ? '–' : x > 0 ? `+${n(x)}` : n(x));

// Daty po polsku: dd.mm.rrrr (np. 23.11.2026). Wewnętrznie i w API – ISO rrrr-mm-dd.
const isIso = (iso) => typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}/.test(iso);

/** "2026-11-23" -> "23.11.2026" */
export const fmtDate = (iso) => (isIso(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '–');
/** "2026-11-23" -> "23.11" */
export const fmtDayMonth = (iso) => (isIso(iso) ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}` : '–');
export const fmtLongDate = fmtDate;

const weekday = new Intl.DateTimeFormat('pl-PL', { weekday: 'short', timeZone: 'UTC' });
export const fmtWeekday = (iso) => {
  if (!isIso(iso)) return '–';
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return Number.isFinite(d.getTime()) ? weekday.format(d).replace('.', '') : '–';
};

/** Znacznik czasu ISO -> "23.11.2026 14:05" (czas lokalny przeglądarki). */
export function fmtDateTime(isoTs) {
  const d = new Date(isoTs);
  if (!Number.isFinite(d.getTime())) return '–';
  const p = (x) => String(x).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "23.11.2026" (także 23-11-2026, 23/11/2026, 3.1.2026) -> "2026-11-23"; null gdy niepoprawna. */
export function parsePlDate(text) {
  const m = String(text ?? '').trim().match(/^(\d{1,2})[.\-/ ](\d{1,2})[.\-/ ](\d{4})$/);
  if (!m) return null;
  const [, d, mo, y] = m.map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
