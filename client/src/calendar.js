// Przypomnienia w kalendarzu telefonu: plik .ics (iCalendar, RFC 5545) generowany w przeglądarce.
// Bez serwera, konta i danych osobowych – kalendarz sam przypomni o kolejnym sprawdzeniu pola.
import { saveFile } from './saveFile.js';

const esc = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Linie dłuższe niż 75 bajtów trzeba łamać (spacja na początku kolejnej linii), nie przecinając
// znaku UTF-8 (polskie litery mają 2 bajty, półpauza 3).
const enc = new TextEncoder();
function fold(line) {
  const parts = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (bytes + b > (parts.length ? 74 : 75)) {
      parts.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  parts.push(cur);
  return parts.join('\r\n ');
}

const ymd = (iso) => iso.replaceAll('-', '');
const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

/**
 * checks: [{ date: 'RRRR-MM-DD', title, why }], place: np. "działka 387 (Sulęcin)", url: link do raportu.
 * Wydarzenia o 9:00 czasu lokalnego, z przypomnieniem w chwili wydarzenia.
 */
export function buildIcs(checks, { place, url }) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Moje Gospodarstwo//przypomnienia//PL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const now = stamp();
  for (const c of checks) {
    const d = ymd(c.date);
    const summary = `Sprawdź pole: ${c.title.toLowerCase()}${place ? ` – ${place}` : ''}`;
    const description = `${c.why.charAt(0).toUpperCase()}${c.why.slice(1)}.${url ? `\nOtwórz raport: ${url}` : ''}\nMoje Gospodarstwo – woda na Twoich polach`;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${d}-${Math.random().toString(36).slice(2)}@moje-gospodarstwo`,
      `DTSTAMP:${now}`,
      `DTSTART:${d}T090000`,
      `DTEND:${d}T093000`,
      fold(`SUMMARY:${esc(summary)}`),
      fold(`DESCRIPTION:${esc(description)}`),
      ...(url ? [fold(`URL:${url}`)] : []),
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${esc(summary)}`),
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

export function downloadIcs(checks, opts) {
  const blob = new Blob([buildIcs(checks, opts)], { type: 'text/calendar;charset=utf-8' });
  return saveFile(blob, 'przypomnienia-moje-gospodarstwo.ics');
}
