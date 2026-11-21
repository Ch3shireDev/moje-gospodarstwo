import { fmtDayMonth, n } from '../format.js';

// Opad w górę, parowanie (ET0) w dół, ta sama skala. Na pierwszy rzut oka widać,
// czy więcej wody przychodzi, czy ucieka. Pionowa kreska = dziś.
export default function WaterChart({ days, today }) {
  if (!days?.length) return null;
  const W = 340;
  const H = 156;
  const padX = 4;
  const mid = 80;
  const room = Math.min(mid - 14, H - mid - 22);
  const max = Math.max(4, ...days.map((d) => d.rain ?? 0), ...days.map((d) => d.et0 ?? 0));
  const k = room / max;
  const slot = (W - padX * 2) / days.length;
  const bw = Math.max(3, slot * 0.64);
  const todayIdx = days.findIndex((d) => d.date === today);
  const xOf = (i) => padX + slot * i + (slot - bw) / 2;

  const rainSum = days.filter((d) => d.date <= today).reduce((a, d) => a + (d.rain ?? 0), 0);
  const label = `Wykres opadu i parowania. Opad do daty analizy: ${n(rainSum)} mm.`;

  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none">
        {days.map((d, i) => {
          const future = d.date > today;
          const rh = (d.rain ?? 0) * k;
          const eh = (d.et0 ?? 0) * k;
          return (
            <g key={d.date} opacity={future ? 0.55 : 1}>
              <rect x={xOf(i)} y={mid - rh} width={bw} height={Math.max(rh, 0)} rx="1.5" className="bar-rain">
                <title>{`${fmtDayMonth(d.date)}: opad ${n(d.rain)} mm`}</title>
              </rect>
              <rect x={xOf(i)} y={mid} width={bw} height={Math.max(eh, 0)} rx="1.5" className="bar-et0">
                <title>{`${fmtDayMonth(d.date)}: parowanie ${n(d.et0)} mm`}</title>
              </rect>
            </g>
          );
        })}
        <line x1="0" x2={W} y1={mid} y2={mid} className="axis" />
        {todayIdx >= 0 && (
          <>
            <line x1={padX + slot * todayIdx} x2={padX + slot * todayIdx} y1="4" y2={H - 18} className="today" />
            <text x={padX + slot * todayIdx + 4} y="12" className="today-label">po dacie →</text>
          </>
        )}
        {days.map((d, i) =>
          i === 0 || i === todayIdx || i === days.length - 1 ? (
            <text key={d.date} x={xOf(i) + bw / 2} y={H - 4} className="tick" textAnchor={i === 0 ? 'start' : i === days.length - 1 ? 'end' : 'middle'}>
              {i === todayIdx ? "analiza" : fmtDayMonth(d.date)}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="legend">
        <span><i className="sw rain" /> opad [mm]</span>
        <span><i className="sw et0" /> parowanie ET0 [mm]</span>
      </figcaption>
    </figure>
  );
}
