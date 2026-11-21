// Polskie formaty dat w tekstach raportu: dd.mm.rrrr (np. 23.11.2026). Wewnętrznie trzymamy ISO (rrrr-mm-dd).

/** "2026-11-23" (albo "2026-11-23 05:00:00" / "2026-11-23T05:00") -> "23.11.2026" */
export function fmtDate(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso ?? '–';
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
}

/** "2026-11-23 05:00:00" -> "23.11.2026 05:00" */
export function fmtDateTime(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(s)) return s ?? '–';
  const time = s.slice(11, 16);
  return time ? `${fmtDate(s)} ${time}` : fmtDate(s);
}

/** Dzień i miesiąc: (4, 1) -> "01.04" */
export const fmtDayMonth = (month, day) => `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}`;
