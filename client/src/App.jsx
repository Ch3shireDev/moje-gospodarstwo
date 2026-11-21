import { Component, useEffect, useMemo, useRef, useState } from 'react';
import MapView from './components/MapView.jsx';
import Report from './components/Report.jsx';
import DatePicker from './components/DatePicker.jsx';
import { ChoiceError, FALLBACK_META, fetchMeta, fetchParcel, fetchReport, lastReport, savedReports, storage } from './api.js';
import { fmtDate, n, parsePlDate } from './format.js';

function useInstallPrompt() {
  const [evt, setEvt] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setEvt(e);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  if (!evt) return null;
  return async () => {
    evt.prompt();
    await evt.userChoice.catch(() => null);
    setEvt(null);
  };
}

// Błąd w widoku raportu nie może położyć całej aplikacji.
class ReportBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error('Błąd widoku raportu:', error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="banner error" role="alert">
        <p>Nie udało się wyświetlić raportu ({String(this.state.error.message ?? this.state.error)}).</p>
        <button type="button" className="btn-secondary" onClick={this.props.onReset}>Wróć do mapy</button>
      </div>
    );
  }
}

const LOADING_STEPS = [
  'Szukam działki w ewidencji (GUGiK)…',
  'Pobieram pogodę z 10 lat…',
  'Sprawdzam glebę (IUNG) i teren (NMT)…',
  'Pobieram dane z satelity Sentinel-2…',
  'Liczę bilans wodny i rekomendacje…',
];

// Adresy: "/" = mapa, "/raport?dzialka=…&data=…&uprawa=…[&gleba=…]" = raport.
// Odświeżenie albo wklejony link otwiera ten sam raport; działa też "wstecz" w przeglądarce.
function reportPath(q) {
  const p = new URLSearchParams();
  if (q.parcel) p.set('dzialka', q.parcel);
  else if (q.lat != null) {
    p.set('lat', Number(q.lat).toFixed(6));
    p.set('lon', Number(q.lon).toFixed(6));
  }
  if (q.date) p.set('data', q.date);
  if (q.crop) p.set('uprawa', q.crop);
  if (q.soil && q.soil !== 'auto') p.set('gleba', q.soil);
  return `/raport?${p}`;
}

function parseRoute(loc = window.location) {
  if (loc.pathname !== '/raport' && loc.hash !== '#raport') return { view: 'mapa', q: null };
  const p = new URLSearchParams(loc.search);
  const q = {
    parcel: p.get('dzialka') || null,
    lat: p.get('lat') != null ? Number(p.get('lat')) : null,
    lon: p.get('lon') != null ? Number(p.get('lon')) : null,
    date: p.get('data') || null,
    crop: p.get('uprawa') || null,
    soil: p.get('gleba') || 'auto',
  };
  const complete = (q.parcel || (Number.isFinite(q.lat) && Number.isFinite(q.lon))) && q.date && q.crop;
  return { view: 'raport', q: complete ? q : null };
}

const queryOfReport = (r) =>
  r && {
    parcel: r.place?.parcel?.id ?? null,
    lat: r.place?.parcel ? null : r.place?.lat,
    lon: r.place?.parcel ? null : r.place?.lon,
    date: r.date,
    crop: r.crop?.id,
    soil: r.query?.soil ?? 'auto',
  };

function reportMatches(r, q) {
  if (!r || !q) return false;
  const rq = queryOfReport(r);
  if (rq.date !== q.date || rq.crop !== q.crop || (rq.soil ?? 'auto') !== (q.soil ?? 'auto')) return false;
  if (q.parcel) return rq.parcel === q.parcel;
  return Math.abs(r.place.lat - q.lat) < 1e-5 && Math.abs(r.place.lon - q.lon) < 1e-5;
}

function navigate(path, { replace = false } = {}) {
  if (window.location.pathname + window.location.search === path) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
}

export default function App() {
  const [meta, setMeta] = useState(FALLBACK_META);
  const [view, setView] = useState('mapa');
  const [parcelText, setParcelText] = useState(() => storage.get('parcelText', ''));
  const [point, setPoint] = useState(null);
  const [crop, setCrop] = useState(() => storage.get('crop', ''));
  const [soil, setSoil] = useState('auto');
  const [dateText, setDateText] = useState('');
  const [report, setReport] = useState(() => lastReport.get());
  const [candidates, setCandidates] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(() => savedReports.list());
  const [focus, setFocus] = useState(() => {
    const r = lastReport.get();
    return r ? { lat: r.place.lat, lon: r.place.lon, zoom: 15 } : null;
  });
  const ctrlRef = useRef(null);
  const install = useInstallPrompt();
  // Wybrana (jeszcze nieanalizowana) działka: obrys na mapie + numer w polu.
  const [selected, setSelected] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  // Telefon: panel wyboru zwinięty do karty działki i dużego przycisku "Analizuj".
  const [sheetOpen, setSheetOpen] = useState(false);
  const lookupRef = useRef(null);

  function lookup(target) {
    lookupRef.current?.abort();
    const ctrl = new AbortController();
    lookupRef.current = ctrl;
    setLookupBusy(true);
    setError(null);
    setCandidates(null);
    fetchParcel(target, ctrl.signal)
      .then((p) => {
        setSelected(p);
        setParcelText(p.id);
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        if (e instanceof ChoiceError) {
          setCandidates(e.candidates);
          setSheetOpen(true);
        } else {
          setSelected(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLookupBusy(false);
      });
  }

  // Wpisany numer -> po chwili przerwy w pisaniu pokazujemy działkę na mapie.
  useEffect(() => {
    const text = parcelText.trim();
    if (!text || text === selected?.id || text.length < 4 || !/\d/.test(text)) return undefined;
    const t = setTimeout(() => lookup({ parcel: text }), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parcelText]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchMeta(ctrl.signal)
      .then((m) => {
        setMeta(m);
        setDateText((t) => t || fmtDate(m.today));
      })
      .catch(() => setDateText((t) => t || fmtDate(FALLBACK_META.today)));
    return () => ctrl.abort();
  }, []);

  // Adres -> widok. Przy starcie i przy "wstecz"/"dalej" w przeglądarce.
  const reportRef = useRef(report);
  reportRef.current = report;
  useEffect(() => {
    const apply = () => {
      const { view: v, q } = parseRoute();
      if (v === 'mapa') {
        setView('mapa');
        return;
      }
      if (!q) {
        // Stary link "#raport" albo niepełny adres – pokaż ostatni raport, jeśli jest.
        if (reportRef.current) {
          navigate(reportPath(queryOfReport(reportRef.current)), { replace: true });
          setView('raport');
        } else {
          navigate('/', { replace: true });
          setView('mapa');
        }
        return;
      }
      if (q.parcel) setParcelText(q.parcel);
      setCrop(q.crop);
      setDateText(fmtDate(q.date));
      setSoil(q.soil);
      if (reportMatches(reportRef.current, q)) setView('raport');
      else run(q.parcel ? { parcel: q.parcel } : { lat: q.lat, lon: q.lon }, { date: q.date, crop: q.crop, soil: q.soil, fromRoute: true });
    };
    apply();
    window.addEventListener('popstate', apply);
    return () => window.removeEventListener('popstate', apply);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading) return undefined;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 3500);
    return () => clearInterval(t);
  }, [loading]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  function showReport(q = queryOfReport(report), opts) {
    if (q) navigate(reportPath(q), opts);
    setView('raport');
  }

  function showMap(opts) {
    navigate('/', opts);
    setView('mapa');
  }

  function validDate() {
    const iso = parsePlDate(dateText);
    if (!iso) return { error: 'Podaj datę w formacie dd.mm.rrrr, np. 23.11.2026.' };
    if (iso > meta.today || (meta.minDate && iso < meta.minDate)) return { error: `Data musi być między ${fmtDate(meta.minDate)} a ${fmtDate(meta.today)}.` };
    return { iso };
  }

  /** target: { parcel } albo { lat, lon } */
  function run(target, opts = {}) {
    const { iso, error: dateErr } = opts.date ? { iso: opts.date } : validDate();
    if (dateErr) {
      setError(dateErr);
      return;
    }
    const cropId = opts.crop ?? crop;
    if (!cropId) {
      // Serwer nie wie, co rośnie na polu – uprawę wybiera rolnik.
      setError('Wybierz, co rośnie na działce.');
      document.getElementById('crop-select')?.focus();
      return;
    }
    const q = { ...target, date: iso, crop: cropId, soil: opts.soil ?? soil };
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    setError(null);
    setCandidates(null);
    showReport(q, { replace: !!opts.fromRoute });
    fetchReport(q, ctrl.signal)
      .then((r) => {
        setReport(r);
        lastReport.set(r);
        // Adres z pełnym identyfikatorem działki (np. po wpisaniu "obręb numer").
        navigate(reportPath(queryOfReport(r)), { replace: true });
        if (r.place?.parcel?.id) setParcelText(r.place.parcel.id);
        if (r.place) setFocus({ lat: r.place.lat, lon: r.place.lon, zoom: 16 });
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        // Błąd albo wybór z kilku działek – wracamy do mapy, gdzie jest formularz.
        if (e instanceof ChoiceError) setCandidates(e.candidates);
        else setError(e.message);
        showMap({ replace: true });
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
  }

  function submit(e) {
    e?.preventDefault();
    const text = parcelText.trim();
    storage.set('parcelText', text);
    storage.set('crop', crop);
    // Analiza tylko dla wybranej (odnalezionej w ewidencji) działki.
    if (selected) run({ parcel: selected.id });
    else setError('Najpierw wybierz działkę: kliknij ją na mapie albo wpisz numer.');
  }

  // Klik na mapie tylko wybiera działkę (obrys + numer). Analiza dopiero po "Analizuj".
  function pickOnMap(p) {
    setPoint(p);
    lookup(p);
  }

  function useExample(ex) {
    setParcelText(ex.parcel);
    setCrop(ex.crop);
    setDateText(fmtDate(ex.date));
    setSoil('auto');
    run({ parcel: ex.parcel }, { date: ex.date, crop: ex.crop, soil: 'auto' });
  }

  const saveReport = () => setSaved(savedReports.add(report));
  const shownGeometry = selected?.geometry ?? report?.place?.parcel?.geometry ?? null;
  const markers = useMemo(() => (report && (!selected || selected.id === report.place?.parcel?.id) ? markersOf(report) : []), [report, selected]);

  return (
    <div className={`app view-${view}`}>
      <header className="topbar no-print">
        <a
          className="brand"
          href="/"
          title="Strona główna – mapa"
          onClick={(e) => {
            e.preventDefault();
            showMap();
          }}
        >
          <img src="/favicon.svg" alt="" width="30" height="30" />
          <div>
            <h1>Moje Gospodarstwo</h1>
            <p>woda na Twoich polach</p>
          </div>
        </a>
        <div className="topbar-actions">
          {view === 'raport' && (
            <button type="button" className="btn-ghost" onClick={() => showMap()}>
              ← Mapa
            </button>
          )}
          {view === 'mapa' && report && !loading && (
            <button type="button" className="btn-ghost" onClick={() => showReport()}>
              Analiza →
            </button>
          )}
          {install && (
            <button type="button" className="btn-ghost" onClick={install}>
              Zainstaluj
            </button>
          )}
        </div>
      </header>

      {/* EKRAN 1: mapa na całą szerokość + panel wyboru działki. Zostaje zamontowany, żeby mapa pamiętała widok. */}
      <main className="map-screen" hidden={view !== 'mapa'}>
        <MapView
          point={point}
          parcelGeometry={shownGeometry}
          markers={markers}
          onPick={pickOnMap}
          focus={focus}
          visible={view === 'mapa'}
          hint={lookupBusy ? 'Szukam działki…' : selected || report ? 'Kliknij, aby zmienić działkę' : 'Kliknij swoją działkę'}
        />

        <aside className={`picker${sheetOpen ? ' sheet-open' : ''}`}>
          <form className="controls card" onSubmit={submit}>
            <div className="picker-head">
              <h2 className="picker-title">Wybierz działkę</h2>
              <button type="button" className="sheet-toggle" aria-expanded={sheetOpen} onClick={() => setSheetOpen((o) => !o)}>
                {sheetOpen ? 'Mniej ▾' : 'Więcej: data, gleba ▴'}
              </button>
            </div>
            {selected ? (
              <div className="selected-parcel" aria-live="polite">
                <strong>Działka {selected.number} · {selected.region}</strong>
                <span className="small muted">gm. {selected.commune}, {selected.county}{selected.areaHa != null ? ` · ${n(selected.areaHa)} ha` : ''}</span>
              </div>
            ) : (
              <p className="small muted">{lookupBusy ? 'Szukam działki…' : 'Kliknij działkę na mapie albo wpisz jej numer.'}</p>
            )}
            {error && (
              <div className="banner error" role="alert">
                {error}
              </div>
            )}

            {/* Zawsze widoczne (także po zwinięciu na telefonie): numer, uprawa, przycisk. */}
            <label className="field">
              <span>Numer działki</span>
              <input
                type="text"
                value={parcelText}
                onChange={(e) => setParcelText(e.target.value)}
                onKeyDown={(e) => {
                  // Enter w polu numeru pokazuje działkę na mapie (analiza – przyciskiem).
                  if (e.key === 'Enter' && parcelText.trim() && parcelText.trim() !== selected?.id) {
                    e.preventDefault();
                    lookup({ parcel: parcelText.trim() });
                  }
                }}
                placeholder="np. 302502_2.0009.387 albo Sulęcin 387"
                autoComplete="off"
                spellCheck="false"
              />
            </label>
            <label className="field">
              <span>Co rośnie na działce?</span>
              <select id="crop-select" value={crop} onChange={(e) => { setCrop(e.target.value); setError(null); }} className={crop ? '' : 'needs-choice'} required>
                <option value="" disabled>– wybierz uprawę –</option>
                {meta.crops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="btn-primary analyze-btn"
              disabled={loading || lookupBusy || !selected || (parcelText.trim() !== '' && parcelText.trim() !== selected.id)}
              title={selected ? undefined : 'Najpierw wybierz działkę na mapie albo wpisz jej numer'}
            >
              {loading
                ? 'Analizuję…'
                : lookupBusy || (selected && parcelText.trim() && parcelText.trim() !== selected.id)
                  ? 'Szukam działki…'
                  : selected
                    ? `Analizuj działkę ${selected.number}`
                    : 'Najpierw wybierz działkę'}
            </button>

            {/* Po rozwinięciu: data, gleba, przykłady. */}
            <div className="picker-fields">
              <div className="field">
                <span>Data analizy</span>
                <DatePicker value={dateText} onChange={setDateText} min={meta.minDate} max={meta.today} today={meta.today} />
              </div>
              <label className="field">
                <span>Gleba</span>
                <select value={soil} onChange={(e) => setSoil(e.target.value)}>
                  <option value="auto">Automatycznie z mapy IUNG (zalecane)</option>
                  {meta.soils.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {meta.examples?.length > 0 && (
              <div className="examples picker-extra">
                <span className="muted small">Przykłady:</span>
                {meta.examples.map((ex) => (
                  <button key={ex.label} type="button" className="chip-btn" onClick={() => useExample(ex)}>
                    {ex.label}
                  </button>
                ))}
              </div>
            )}
          </form>

          {candidates && (
            <div className="card picker-extra" role="dialog" aria-label="Wybierz działkę">
              <h3>Kilka działek pasuje – wybierz właściwą</h3>
              <ul className="candidates">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setParcelText(c.id);
                        lookup({ parcel: c.id });
                      }}
                    >
                      {c.number}, obręb {c.region}, gm. {c.commune}, {c.county}
                    </button>
                    <code className="small muted">{c.id}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {saved.length > 0 && (
            <details className="card saved picker-extra">
              <summary>Zapisane raporty ({saved.length})</summary>
              <ul>
                {saved.map((e) => (
                  <li key={e.key}>
                    <button
                      type="button"
                      className="link-btn"
                      onClick={() => {
                        setReport(e.report);
                        setFocus({ lat: e.report.place.lat, lon: e.report.place.lon, zoom: 16 });
                        showReport(queryOfReport(e.report));
                      }}
                    >
                      {e.report.place.parcel ? `dz. ${e.report.place.parcel.number} (${e.report.place.parcel.region})` : e.report.place.label} · {fmtDate(e.report.date)} · {e.report.crop.short}
                    </button>
                    <button type="button" className="x-btn" aria-label="Usuń" onClick={() => setSaved(savedReports.remove(e.key))}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </aside>
      </main>

      {/* EKRAN 2: analiza na całą szerokość. */}
      {view === 'raport' && (
        <main className="report-screen" aria-live="polite" aria-busy={loading}>
          {loading && (
            <div className="loading card">
              <div className="spinner" aria-hidden="true" />
              <p>{LOADING_STEPS[step]}</p>
              <p className="muted small">Pierwsza analiza miejsca trwa zwykle 10–30 s. Kolejne są szybsze dzięki zapisanym danym.</p>
              <button type="button" className="btn-secondary" onClick={() => { ctrlRef.current?.abort(); setLoading(false); showMap(); }}>
                Anuluj
              </button>
            </div>
          )}
          {!loading && report && (
            <ReportBoundary key={report.generatedAt} onReset={() => { lastReport.clear(); setReport(null); showMap(); }}>
              <Report report={report} onSave={saveReport} onBack={() => showMap()} />
            </ReportBoundary>
          )}
          {!loading && !report && (
            <div className="empty card">
              <p>Brak analizy. Wróć do mapy i wybierz działkę.</p>
              <button type="button" className="btn-primary" onClick={() => showMap()}>← Mapa</button>
            </div>
          )}
        </main>
      )}
    </div>
  );
}

function markersOf(report) {
  const all = Object.values(report.recommendations ?? {}).flat();
  return all.filter((a) => a.location).map((a) => ({ ...a.location, title: a.title }));
}
