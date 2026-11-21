import { useState } from 'react';
import WaterChart from './WaterChart.jsx';
import MapView from './MapView.jsx';
import Knowledge from './Knowledge.jsx';
import { KNOWLEDGE } from '../knowledge.js';
import { fmtDate, fmtDateTime, n, signed } from '../format.js';

// Raport dla rolnika: najpierw proste odpowiedzi (jak jest, dlaczego, co zrobić),
// a liczby, metodyka i źródła są zwinięte w "Szczegóły" – dla doradcy i dociekliwych.
const KNOWLEDGE_TITLE = Object.fromEntries(KNOWLEDGE.map((k) => [k.id, k.title]));
const PRIORITY_LABEL = { pilne: 'Pilne', wazne: 'Ważne' };
const LEVEL_TONE = { susza: 'critical', zagrozenie: 'warning', sucho: 'warning', ok: 'good', mokro: 'wet', brak: 'unknown' };
const SOIL_SOURCE = { iung: 'mapa IUNG-PIB', soilgrids: 'model SoilGrids (przybliżenie)', user: 'wybór użytkownika', domyslna: 'przyjęta domyślnie' };
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
const VULN_LABEL = { wysoka: 'wysoka', srednia: 'średnia', niska: 'niska' };
const SOIL_SHORT = { I: 'lekka', II: 'lekka', III: 'średnia', IV: 'ciężka', organiczna: 'organiczna' };

function openKnowledge(id) {
  const el = document.getElementById(`wiedza-${id}`);
  if (!el) return;
  el.open = true;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function downloadJson(report) {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `raport-${report.place.parcel?.id?.replace(/[^\w.-]/g, '_') ?? 'punkt'}-${report.date}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** Jedna rada: polecenie na wierzchu, "dlaczego i jak" po rozwinięciu. */
function Todo({ a }) {
  return (
    <li className={`todo prio-${a.priority}`}>
      <details>
        <summary>
          <span className="todo-title">{a.title}</span>
          {PRIORITY_LABEL[a.priority] && <span className="chip">{PRIORITY_LABEL[a.priority]}</span>}
          <span className="todo-more">Dlaczego i jak?</span>
        </summary>
        <div className="todo-body">
          <p>{a.detail}</p>
          {a.note && <p className="note">{a.note}</p>}
          {a.basis?.length > 0 && (
            <p className="basis">
              <strong>Skąd to wiemy:</strong> {a.basis.join(' · ')}
            </p>
          )}
          {a.knowledge?.filter((k) => KNOWLEDGE_TITLE[k]).map((k) => (
            <button key={k} type="button" className="why-link no-print" onClick={() => openKnowledge(k)}>
              Więcej: {KNOWLEDGE_TITLE[k]} →
            </button>
          ))}
        </div>
      </details>
    </li>
  );
}

function TodoGroup({ title, list }) {
  if (!list?.length) return null;
  return (
    <div className="todo-group">
      <h4>{title}</h4>
      <ul className="todos">
        {list.map((a) => (
          <Todo key={a.id} a={a} />
        ))}
      </ul>
    </div>
  );
}

function Climatology({ data }) {
  const rows = data.filter((d) => d.month >= 3 && d.month <= 10);
  const vals = rows.flatMap((r) => [r.normal, r.current, r.currentPartial]).filter((v) => v != null);
  if (!vals.length) return null;
  const max = Math.max(20, ...vals.map(Math.abs));
  const W = 340, H = 140, mid = 70, slot = W / rows.length, k = (mid - 12) / max;
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Bilans miesięczny: średnia z 10 lat i bieżący rok">
        {rows.map((r, i) => {
          const x = i * slot;
          const bar = (v, dx, cls) => (v == null ? null : <rect x={x + dx} y={v >= 0 ? mid - v * k : mid} width={slot * 0.32} height={Math.abs(v) * k} className={cls} rx="1.5"><title>{`${MONTHS[r.month - 1]}: ${signed(v)} mm`}</title></rect>);
          return (
            <g key={r.month}>
              {bar(r.normal, slot * 0.14, 'bar-normal')}
              {bar(r.current ?? r.currentPartial, slot * 0.52, r.current != null ? 'bar-current' : 'bar-partial')}
              <text x={x + slot / 2} y={H - 3} textAnchor="middle" className="tick">{MONTHS[r.month - 1]}</text>
            </g>
          );
        })}
        <line x1="0" x2={W} y1={mid} y2={mid} className="axis" />
      </svg>
      <figcaption className="legend">
        <span><i className="sw normal" /> zwykle (10 lat)</span>
        <span><i className="sw current" /> ten rok</span>
        <span>deszcz minus parowanie, mm/miesiąc</span>
      </figcaption>
    </figure>
  );
}

export default function Report({ report, onSave, onBack }) {
  const [pdfState, setPdfState] = useState(null);
  const [saved, setSaved] = useState(false);
  async function downloadPdf() {
    setPdfState('busy');
    try {
      const { downloadReportPdf } = await import('../pdf/reportPdf.js');
      await downloadReportPdf(report);
      setPdfState(null);
    } catch (err) {
      console.error(err);
      setPdfState(`Nie udało się utworzyć PDF: ${err.message ?? err}`);
    }
  }
  const { place, status, metrics, history, vulnerability: v, rootZone, causes, recommendations: rec, uncertainty, soil, crop, satellite, terrain, waters } = report;
  const tone = LEVEL_TONE[status.level] ?? 'unknown';
  const parcel = place.parcel;
  const satCur = satellite?.current;

  return (
    <article className="report">
      <div className="report-back no-print">
        <button type="button" className="btn-secondary" onClick={onBack}>← Mapa</button>
        <div className="report-tools">
          <button type="button" className="btn-primary btn-small" onClick={downloadPdf} disabled={pdfState === 'busy'} title="Pobierz raport jako plik PDF">
            {pdfState === 'busy' ? 'PDF…' : 'PDF'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => { onSave(); setSaved(true); }} title="Zapisz raport w tej przeglądarce">
            {saved ? 'Zapisano' : 'Zapisz'}
          </button>
          <button type="button" className="btn-secondary hide-narrow" onClick={() => downloadJson(report)} title="Pobierz surowe dane analizy (JSON)">
            Dane
          </button>
        </div>
      </div>
      {pdfState && pdfState !== 'busy' && <div className="banner error">{pdfState}</div>}

      <div className="report-head-grid">
        <header className="place">
          <h2>{parcel ? `Działka ${parcel.number} · ${parcel.region}` : 'Wybrane miejsce'}</h2>
          <p className="muted small">
            {parcel ? `gm. ${parcel.commune}, ${n(parcel.areaHa)} ha` : `${n(place.lat)}, ${n(place.lon)}`} · {fmtDate(report.date)} · {crop.short} · gleba {SOIL_SHORT[soil.category] ?? soil.category}
          </p>

          {/* 1. JAK JEST */}
          <div className={`status tone-${tone}`}>
            <div className="status-main">
              <span className="status-kicker">Woda na Twoim polu</span>
              <strong className="status-label">{status.label}</strong>
              <span className="status-plain">{status.plain}</span>
            </div>
          </div>
          <p className="summary">
            {report.summary}
            {report.summarySource === 'llm' && <span className="ai-tag" title="Tekst napisany przez model językowy na podstawie wyników analizy">AI</span>}
          </p>
        </header>
        {parcel?.geometry && (
          <div className="mini-map no-print">
            <MapView parcelGeometry={parcel.geometry} markers={markersOf(report)} interactive={false} visible />
          </div>
        )}
      </div>

      {/* 2. DLACZEGO */}
      {causes.list.length > 0 && (
        <section className="block">
          <h3>Dlaczego?</h3>
          <ul className="reasons">
            {causes.list.map((c) => (
              <li key={c.id}>
                <details>
                  <summary>{c.title}</summary>
                  <p className="small">{c.detail}</p>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 3–5. CO ZROBIĆ – w kolejności: zatrzymaj wodę, uprawa, podlewanie */}
      {rec ? (
        <section className="block">
          <h3>Co zrobić?</h3>
          <p className="muted small">Kliknij radę, żeby zobaczyć dlaczego i jak.</p>
          <TodoGroup title="1. Zatrzymaj wodę" list={rec.retencja} />
          <TodoGroup title="2. Uprawa" list={rec.agrotechnika} />
          <TodoGroup title="3. Podlewanie" list={rec.nawadnianie} />
          <TodoGroup title="Pogoda na najbliższe dni" list={rec.pogoda} />
        </section>
      ) : (
        <p className="banner">Bez oceny wody na działce nie podajemy rad.</p>
      )}

      <p className="certainty">
        <strong>Pewność wyniku: {uncertainty.label.replace(' pewność', '').toLowerCase()}.</strong> Rady opierają się na danych pogodowych i mapach, a nie na pomiarze na Twoim polu. Szczegóły i ograniczenia – poniżej.
      </p>

      {/* SZCZEGÓŁY – dla doradcy i dociekliwych */}
      <details className="more">
        <summary>Szczegóły: liczby, ostatnie 10 lat, satelita, teren</summary>
        <div className="more-body">
          <p className="small muted">
            Gleba: {soil.label} ({SOIL_SOURCE[soil.source] ?? soil.source}). Uprawa: {crop.label}.{parcel && <> Działka <code>{parcel.id}</code>, {parcel.county}, woj. {parcel.voivodeship}.</>}
          </p>
          <table className="indicators">
            <thead>
              <tr><th>Wskaźnik</th><th>Wartość</th><th>Odniesienie</th><th>Wniosek</th></tr>
            </thead>
            <tbody>
              {status.indicators.map((i) => (
                <tr key={i.id} className={`lvl-${i.level}`}>
                  <td>{i.name}{!i.decisive && <span className="muted small"> (pomocniczy)</span>}</td>
                  <td className="num">{i.value}</td>
                  <td className="small">{i.reference}</td>
                  <td className="small">{i.verdict}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted small">
            Bilans = opad {n(metrics.rain)} mm − parowanie wzorcowe {n(metrics.et0)} mm ({fmtDate(metrics.windowStart)} – {fmtDate(report.date)}). Zapotrzebowanie uprawy (ETc = Kc × ET0): {n(metrics.etc)} mm. Najdłuższy okres bez deszczu: {metrics.drySpell} dni.
            {metrics.iungThreshold != null && <> Próg suszy IUNG: {n(metrics.iungThreshold)} mm ({metrics.iungPeriod}).</>}
            {rootZone?.applicable && <> Strefa korzeni (FAO-56): zostało ok. {n(rootZone.available)} z {n(rootZone.taw)} mm ({rootZone.availablePct}%).</>}
          </p>

          <div className="grid2">
            <div className="card">
              <h4>Ten sam okres w poprzednich latach</h4>
              {history.years ? (
                <>
                  <p className="small">
                    Zwykle: <strong>{signed(history.meanKbw)} mm</strong> (od {signed(history.minKbw)} do {signed(history.maxKbw)} mm). Deszcz {history.rainPctOfNormal ?? '–'}% normy, parowanie {history.et0PctOfNormal ?? '–'}% normy.
                  </p>
                  <ul className="years">
                    {history.byYear.map((y) => (
                      <li key={y.year} style={{ '--w': `${Math.min(100, Math.abs(y.kbw) / 3)}%` }} className={y.kbw < 0 ? 'neg' : 'pos'}>
                        <span>{y.year}</span>
                        <i />
                        <span className="num">{signed(y.kbw)}</span>
                      </li>
                    ))}
                    <li className="cur" style={{ '--w': `${Math.min(100, Math.abs(metrics.kbw) / 3)}%` }}>
                      <span>{report.date.slice(0, 4)}</span>
                      <i />
                      <span className="num">{signed(metrics.kbw)}</span>
                    </li>
                  </ul>
                </>
              ) : (
                <p className="muted">Brak danych historycznych.</p>
              )}
            </div>
            <div className="card">
              <h4>Jak często jest tu susza</h4>
              {v.hasThresholds ? (
                <p className="small">
                  Susza wg progów IUNG ({crop.short}, gleba kat. {soil.category}) w <strong>{v.droughtYearsCount} z {v.seasons}</strong> lat ({v.seasonsRange}){v.droughtYears.length ? `: ${v.droughtYears.join(', ')}` : ''}. Podatność: <strong>{VULN_LABEL[v.level]}</strong>.
                </p>
              ) : (
                <p className="small">IUNG nie publikuje progów dla tej uprawy – porównujemy okresy między sobą.</p>
              )}
              {v.riskMonths && <p className="small">Najczęściej brakuje wody: <strong>{v.riskMonths.label}</strong>. Okres krytyczny uprawy: {crop.critical}.</p>}
              {v.notRecommended && <p className="note">IUNG nie wskazuje tej uprawy na tej kategorii gleby.</p>}
            </div>
          </div>
          <Climatology data={report.climatology} />
          <WaterChart days={report.chartDays} today={report.date} />

          <div className="grid2">
            <div className="card">
              <h4>{satCur?.images ? 'Zdjęcie satelitarne (Sentinel-2)' : 'Dane z Sentinel-2'}</h4>
              {satCur?.images && (
                <div className="s2-images">
                  <figure>
                    <img src={satCur.images.rgb} alt={`Zdjęcie satelitarne działki z ${fmtDate(satCur.images.date)}`} />
                    <figcaption>Kolory naturalne, {fmtDate(satCur.images.date)}</figcaption>
                  </figure>
                  <figure>
                    <img src={satCur.images.ndvi} alt="Mapa zieloności roślin (NDVI)" />
                    <figcaption>Zieloność roślin (NDVI)</figcaption>
                  </figure>
                  <p className="s2-legend">
                    <i style={{ background: 'rgb(150,110,80)' }} /> gleba <i style={{ background: 'rgb(235,220,120)' }} /> słabe rośliny <i style={{ background: 'rgb(35,125,55)' }} /> bujne
                    <i style={{ background: 'rgb(205,205,212)' }} /> chmura <i style={{ background: 'rgb(70,120,200)' }} /> woda · żółta linia: granica działki · wycinek ok. {n(satCur.images.widthM)} × {n(satCur.images.heightM)} m, piksel {satCur.images.pixelM} m
                  </p>
                </div>
              )}
              {satCur?.clear ? (
                <p className="small">
                  {fmtDate(satCur.date)}: NDVI <strong>{n(satCur.ndvi)}</strong>{satCur.ndmi != null && <>, NDMI <strong>{n(satCur.ndmi)}</strong></>} ({satCur.pixels} pikseli 20 m, bez chmur {Math.round(satCur.clearFraction * 100)}%).
                </p>
              ) : (
                <p className="muted small">Brak bezchmurnych danych Sentinel-2 dla działki z 30 dni przed datą analizy.</p>
              )}
              {satellite?.history?.filter((h) => h.clear).length > 0 && (
                <p className="small muted">Poprzednie lata: {satellite.history.filter((h) => h.clear).map((h) => `${h.year}: ${n(h.ndvi)}`).join(' · ')}</p>
              )}
            </div>
            <div className="card">
              <h4>Teren i woda wokół</h4>
              {terrain ? (
                <p className="small">Spadek {n(terrain.slopePct)}% w kierunku: {terrain.downslope}, różnica wysokości {n(terrain.reliefM)} m{terrain.depressions.length ? `, obniżeń: ${terrain.depressions.length}` : ''}.</p>
              ) : (
                <p className="muted small">Brak danych o terenie.</p>
              )}
              {waters ? (
                waters.items.length ? (
                  <ul className="small">
                    {waters.items.slice(0, 5).map((w) => (
                      <li key={w.id}>{w.kind}{w.name ? ` „${w.name}”` : ''}: {w.distM === 0 ? 'na działce' : `${w.distM} m`}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="small">W promieniu {waters.radiusM} m mapa OSM nie pokazuje wód.</p>
                )
              ) : (
                <p className="muted small">Brak danych o rowach i ciekach (OSM nie odpowiedział).</p>
              )}
              {report.hydroStation && (
                <p className="small">Wodowskaz IMGW {report.hydroStation.name} ({report.hydroStation.river}, {report.hydroStation.distanceKm} km): stan {report.hydroStation.level} cm{report.hydroStation.warningLevel ? `, ostrzegawczy ${report.hydroStation.warningLevel} cm` : ''}.</p>
              )}
            </div>
          </div>
        </div>
      </details>

      <details className="more">
        <summary>Ograniczenia i pewność wyniku</summary>
        <div className="more-body limits">
          <ul>
            {uncertainty.items.map((t) => (
              <li key={t}>{t}</li>
            ))}
            {report.weatherNotes?.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <p className="small muted">Rady wynikają z reguł opisanych w dokumentacji i danych z dnia analizy. Decyzję podejmuje rolnik. W razie wątpliwości zapytaj doradcę (ODR).</p>
        </div>
      </details>

      <details className="more">
        <summary>Źródła danych</summary>
        <div className="more-body">
          <table className="indicators">
            <thead>
              <tr><th>Kategoria</th><th>Źródło</th><th>Status</th></tr>
            </thead>
            <tbody>
              {report.dataSources.map((s) => (
                <tr key={s.name}>
                  <td>{s.category}</td>
                  <td>{s.name}{s.range ? ` (${s.range})` : ''}{!s.live && s.fetched ? ` – pobrane ${s.fetched}` : ''}</td>
                  <td className="small">{s.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="small muted">
            Weather data by <a href="https://open-meteo.com/">Open-Meteo.com</a> (CC BY 4.0) · Generated using Copernicus Climate Change Service information · Źródłem pochodzenia danych jest IMGW-PIB (dane przetworzone) ·
            NASA POWER · IUNG-PIB · GUGiK · Contains modified Copernicus Sentinel data · ISRIC SoilGrids (CC BY 4.0) · © OpenStreetMap contributors (ODbL).
          </p>
          <p className="small muted">Wygenerowano: {fmtDateTime(report.generatedAt)} · czas analizy {n(report.durationMs / 1000)} s</p>
        </div>
      </details>

      <div className="no-print">
        <Knowledge metrics={metrics} />
      </div>
    </article>
  );
}

function markersOf(report) {
  return Object.values(report.recommendations ?? {}).flat().filter((a) => a.location).map((a) => ({ ...a.location, title: a.title }));
}
