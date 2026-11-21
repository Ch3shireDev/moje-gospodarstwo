export const FALLBACK_META = {
  crops: [{ id: 'zboza_ozime', label: 'Zboża ozime' }],
  defaultCrop: 'zboza_ozime',
  soils: [
    { id: 'I', label: 'kategoria I – bardzo podatna na suszę' },
    { id: 'II', label: 'kategoria II – podatna na suszę' },
    { id: 'III', label: 'kategoria III – średnio podatna na suszę' },
    { id: 'IV', label: 'kategoria IV – mało podatna na suszę' },
  ],
  examples: [],
  today: new Date().toISOString().slice(0, 10),
  minDate: null,
};

export class ChoiceError extends Error {
  constructor(message, candidates) {
    super(message);
    this.candidates = candidates;
  }
}

async function getJson(url, signal) {
  const res = await fetch(url, { signal });
  const body = await res.json().catch(() => ({}));
  if (res.status === 300) throw new ChoiceError(body.error, body.candidates ?? []);
  if (!res.ok) throw new Error(body.error || `Serwer odpowiedział błędem ${res.status}`);
  return body;
}

/** q: { parcel } albo { lat, lon }, plus date, crop, soil */
export function fetchReport(q, signal) {
  const params = new URLSearchParams();
  if (q.parcel) params.set('parcel', q.parcel);
  else {
    params.set('lat', q.lat.toFixed(6));
    params.set('lon', q.lon.toFixed(6));
  }
  if (q.date) params.set('date', q.date);
  if (q.crop) params.set('crop', q.crop);
  if (q.soil && q.soil !== 'auto') params.set('soil', q.soil);
  return getJson(`/api/report?${params}`, signal);
}

export const fetchMeta = (signal) => getJson('/api/meta', signal);

/** Sama działka (numer, obrys, powierzchnia) – bez analizy. q: { parcel } albo { lat, lon } */
export function fetchParcel(q, signal) {
  const params = new URLSearchParams();
  if (q.parcel) params.set('parcel', q.parcel);
  else {
    params.set('lat', q.lat.toFixed(6));
    params.set('lon', q.lon.toFixed(6));
  }
  return getJson(`/api/parcel?${params}`, signal);
}

/** Miejsca po nazwie (miejscowość, gmina, powiat, województwo) – Nominatim przez nasz serwer. */
export function fetchPlaces(text, signal) {
  return getJson(`/api/places?${new URLSearchParams({ q: text })}`, signal).then((b) => b.places ?? []);
}

// localStorage bywa niedostępny (tryb prywatny, WebView) – wtedy po prostu nie pamiętamy.
export const storage = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* np. przepełnione miejsce – trudno */
    }
  },
};

// Wersja kształtu raportu. Raporty zapisane przez starszą wersję aplikacji są ignorowane,
// bo nowy widok by się na nich wywrócił (np. brak pola date).
export const REPORT_VERSION = 2;
export const isValidReport = (r) =>
  !!r && typeof r.date === 'string' && !!r.status?.indicators && !!r.place && !!r.metrics && !!r.crop && !!r.uncertainty && Array.isArray(r.dataSources);

export const lastReport = {
  get: () => {
    const r = storage.get(`lastReport.v${REPORT_VERSION}`, null);
    return isValidReport(r) ? r : null;
  },
  set: (r) => storage.set(`lastReport.v${REPORT_VERSION}`, r),
  clear: () => storage.set(`lastReport.v${REPORT_VERSION}`, null),
};

/** Zapisane raporty (w przeglądarce). Maks. 10, bez geometrii żeby nie zapchać pamięci. */
export const savedReports = {
  list: () => storage.get(`savedReports.v${REPORT_VERSION}`, []).filter((e) => isValidReport(e?.report)),
  add(report) {
    const entry = { key: `${report.place.parcel?.id ?? report.place.label}|${report.date}|${report.crop.id}`, savedAt: new Date().toISOString(), report };
    const list = [entry, ...savedReports.list().filter((e) => e.key !== entry.key)].slice(0, 10);
    storage.set(`savedReports.v${REPORT_VERSION}`, list);
    return list;
  },
  remove(key) {
    const list = savedReports.list().filter((e) => e.key !== key);
    storage.set(`savedReports.v${REPORT_VERSION}`, list);
    return list;
  },
};
