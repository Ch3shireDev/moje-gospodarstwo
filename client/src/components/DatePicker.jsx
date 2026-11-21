import { useEffect, useRef, useState } from 'react';
import { fmtDate, parsePlDate } from '../format.js';

// Pole daty dd.mm.rrrr z kalendarzem (bez bibliotek). Tydzień od poniedziałku, polskie nazwy,
// szybki wybór miesiąca i roku, daty spoza [min, max] zablokowane. Ręczne wpisywanie działa dalej.
const MONTHS = ['styczeń', 'luty', 'marzec', 'kwiecień', 'maj', 'czerwiec', 'lipiec', 'sierpień', 'wrzesień', 'październik', 'listopad', 'grudzień'];
const DAYS = ['pn', 'wt', 'śr', 'cz', 'pt', 'sb', 'nd'];
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

export default function DatePicker({ value, onChange, min, max, today }) {
  const [open, setOpen] = useState(false);
  const selected = parsePlDate(value);
  const start = selected ?? today ?? new Date().toISOString().slice(0, 10);
  const [view, setView] = useState({ y: Number(start.slice(0, 4)), m: Number(start.slice(5, 7)) - 1 });
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const s = parsePlDate(value) ?? today;
    if (s) setView({ y: Number(s.slice(0, 4)), m: Number(s.slice(5, 7)) - 1 });
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const minY = min ? Number(min.slice(0, 4)) : view.y - 10;
  const maxY = max ? Number(max.slice(0, 4)) : view.y + 1;
  const years = [];
  for (let y = maxY; y >= minY; y--) years.push(y);

  const first = new Date(Date.UTC(view.y, view.m, 1));
  const offset = (first.getUTCDay() + 6) % 7; // poniedziałek = 0
  const daysIn = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysIn }, (_, i) => i + 1)];

  const shift = (k) =>
    setView(({ y, m }) => {
      const t = m + k;
      return { y: y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 };
    });
  const disabled = (d) => (min && d < min) || (max && d > max);
  const canPrev = !min || iso(view.y, view.m, 1) > min;
  const canNext = !max || iso(view.y, view.m, daysIn) < max;

  return (
    <div className="datepicker" ref={wrapRef}>
      <div className="date-row">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="dd.mm.rrrr"
          title="Data w formacie dd.mm.rrrr, np. 23.11.2026"
          aria-label="Data analizy (dd.mm.rrrr)"

        />
        <button type="button" className="cal-btn" aria-label="Otwórz kalendarz" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path fill="currentColor" d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7zm-2 7h14v10H5V9zm2 2v2h2v-2H7zm4 0v2h2v-2h-2zm4 0v2h2v-2h-2zm-8 4v2h2v-2H7zm4 0v2h2v-2h-2z" />
          </svg>
        </button>
        {today && (
          <button type="button" className="chip-btn" onClick={() => onChange(fmtDate(today))}>
            dziś
          </button>
        )}
      </div>

      {open && (
        <div className="cal" role="dialog" aria-label="Kalendarz">
          <div className="cal-head">
            <button type="button" className="cal-nav" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Poprzedni miesiąc">‹</button>
            <select value={view.m} onChange={(e) => setView((v) => ({ ...v, m: Number(e.target.value) }))} aria-label="Miesiąc">
              {MONTHS.map((name, i) => (
                <option key={name} value={i}>{name}</option>
              ))}
            </select>
            <select value={view.y} onChange={(e) => setView((v) => ({ ...v, y: Number(e.target.value) }))} aria-label="Rok">
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button type="button" className="cal-nav" onClick={() => shift(1)} disabled={!canNext} aria-label="Następny miesiąc">›</button>
          </div>
          <div className="cal-grid">
            {DAYS.map((d) => (
              <span key={d} className="cal-dow">{d}</span>
            ))}
            {cells.map((d, i) => {
              if (d == null) return <span key={`e${i}`} />;
              const date = iso(view.y, view.m, d);
              const cls = ['cal-day', date === selected && 'sel', date === today && 'today'].filter(Boolean).join(' ');
              return (
                <button
                  key={date}
                  type="button"
                  className={cls}
                  disabled={disabled(date)}
                  aria-label={fmtDate(date)}
                  aria-pressed={date === selected}
                  onClick={() => {
                    onChange(fmtDate(date));
                    setOpen(false);
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
