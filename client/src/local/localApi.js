// Aplikacja mobilna (Capacitor): backend z server/src działa w WebView na telefonie – bez własnego serwera.
// Zapytania do GUGiK, IMGW, IUNG itd. idą przez natywny HTTP Capacitora (CapacitorHttp podmienia fetch),
// więc CORS ich nie blokuje. Podsumowanie LLM jest wyłączone – w aplikacji nie trzymamy żadnych kluczy.
import { handleApi } from '../../../server/src/api.js';
import { defaultDeps } from '../../../server/src/report.js';
import { setDiskStore } from '../../../server/src/http.js';
import { idbStore } from './idbStore.js';

setDiskStore(idbStore);

const deps = { ...defaultDeps, llmSummary: async () => null };

/** Odpowiednik GET /api/...: zwraca { status, body } jak serwer. */
export function localGet(url) {
  const u = new URL(url, 'https://localhost');
  return handleApi(u.pathname, u.searchParams, deps);
}
