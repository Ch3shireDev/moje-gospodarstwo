import { KNOWLEDGE } from '../knowledge.js';
import { n } from '../format.js';

const TORF_RETENTION_M3_HA = 4000; // Kotowski / Centrum Ochrony Mokradeł

// Sekcja "Dlaczego to działa": karty wiedzy + przeliczenie na pole użytkownika.
export default function Knowledge({ metrics, openId }) {
  const deficitMm = Math.max(0, -(metrics?.kbw ?? 0));
  const deficitM3 = Math.round(deficitMm * 10); // 1 mm na hektarze = 10 m³

  return (
    <section className="knowledge" aria-labelledby="knowledge-h">
      <h3 id="knowledge-h">Zatrzymaj wodę – dlaczego to działa</h3>

      {deficitMm > 0 && (
        <div className="your-field">
          <p>
            <strong>Twoje pole w liczbach:</strong> przez 61 dni gleba straciła ok. {n(deficitMm)} mm wody więcej, niż dostała. To{' '}
            <strong>{n(deficitM3)} m³ na hektar</strong>, czyli ok. {Math.max(1, Math.round(deficitM3 / 10))} beczkowozów po 10 m³. Mokry hektar torfowiska
            trzyma ok. {n(TORF_RETENTION_M3_HA)} m³, ok. {n(TORF_RETENTION_M3_HA / Math.max(deficitM3, 1))}× więcej.
          </p>
        </div>
      )}

      {KNOWLEDGE.map((k) => (
        <details key={k.id} id={`wiedza-${k.id}`} className="k-card" open={openId === k.id}>
          <summary>{k.title}</summary>
          <p className="k-lead">{k.lead}</p>
          {k.numbers.length > 0 && (
            <ul className="k-numbers">
              {k.numbers.map((x) => (
                <li key={x.label}>
                  <strong>{x.value}</strong>
                  <span>{x.label}</span>
                </li>
              ))}
            </ul>
          )}
          <ul className="k-points">
            {k.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <p className="k-src-h">Źródła</p>
          <ul className="k-sources">
            {k.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
