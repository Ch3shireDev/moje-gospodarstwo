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

  // Słupki rysujemy w SVG rozciąganym na całą szerokość (preserveAspectRatio="none"), a napisy
  // jako zwykły HTML nad wykresem – inaczej tekst rozciągałby się razem ze słupkami.
  const pct = (x) => `${(x / W) * 100}%`;
  const todayX = todayIdx >= 0 ? padX + slot * todayIdx : null;
  const ticks = days
    .map((d, i) => ({ d, i }))
    .filter(({ i }) => i === 0 || i === todayIdx || i === days.length - 1);

  return (
    <figure className="chart">
      <div className="chart-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} preserveAspectRatio="none">
          {days.map((d, i) => {
            const future = d.date > today;
            const rh = (d.rain ?? 0) * k;
            const eh = (d.et0 ?? 0) * k;
            return (
              <g key={d.date} opacity={future ? 0.55 : 1}>
                <rect x={xOf(i)} y={mid - rh} width={bw} height={Math.max(rh, 0)} className="bar-rain">
                  <title>{`${fmtDayMonth(d.date)}: opad ${n(d.rain)} mm`}</title>
                </rect>
                <rect x={xOf(i)} y={mid} width={bw} height={Math.max(eh, 0)} className="bar-et0">
                  <title>{`${fmtDayMonth(d.date)}: parowanie ${n(d.et0)} mm`}</title>
                </rect>
              </g>
            );
          })}
          <line x1="0" x2={W} y1={mid} y2={mid} className="axis" vectorEffect="non-scaling-stroke" />
          {todayX != null && <line x1={todayX} x2={todayX} y1="4" y2={H - 18} className="today" vectorEffect="non-scaling-stroke" />}
        </svg>
        {todayX != null && (
          <span className="chart-label today-label" style={{ left: pct(todayX), top: 0 }} aria-hidden="true">
            po dacie →
          </span>
        )}
        {ticks.map(({ d, i }) => (
          <span
            key={d.date}
            className={`chart-label tick${i === 0 ? ' at-start' : i === days.length - 1 ? ' at-end' : ''}`}
            style={i === 0 ? { left: 0 } : i === days.length - 1 ? { right: 0 } : { left: pct(xOf(i) + bw / 2) }}
            aria-hidden="true"
          >
            {i === todayIdx ? 'analiza' : fmtDayMonth(d.date)}
          </span>
        ))}
      </div>
      <figcaption className="legend">
        <span><i className="sw rain" /> opad [mm]</span>
        <span><i className="sw et0" /> parowanie ET0 [mm]</span>
      </figcaption>
    </figure>
  );
}
