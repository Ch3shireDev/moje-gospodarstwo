// Leniwe wczytywanie modułów (np. generator PDF) odporne na wdrożenie nowej wersji.
// Pliki w /assets/ mają hash w nazwie. Gdy strona była otwarta przed wdrożeniem, pamięta stare nazwy,
// których na serwerze już nie ma – import kończy się błędem „error loading dynamically imported module”
// (Firefox), „Failed to fetch dynamically imported module” (Chrome) albo „Importing a module script failed”
// (Safari). Wtedy raz przeładowujemy stronę: dostaje nowy index.html z aktualnymi nazwami plików.
import { NetworkError } from './api.js';

const KEY = 'reloadedForNewVersionAt';
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically|Failed to fetch dynamically|Loading chunk|module script/i;

export const isChunkError = (err) => CHUNK_ERROR.test(String(err?.message ?? err));

/** Przeładowanie najwyżej raz na minutę – żeby nie zapętlić się, gdy plik naprawdę nie istnieje. */
export function reloadForNewVersion() {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(KEY)) || 0;
  } catch {
    /* tryb prywatny – trudno */
  }
  if (Date.now() - last < 60_000) return false;
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* jw. */
  }
  window.location.reload();
  return true;
}

export async function importFresh(loader) {
  try {
    return await loader();
  } catch (err) {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new NetworkError('offline');
    if (isChunkError(err)) {
      if (reloadForNewVersion()) {
        throw Object.assign(new Error('Wgrano nową wersję aplikacji – odświeżam stronę. Po odświeżeniu kliknij jeszcze raz.'), { reloading: true });
      }
      throw new Error('Nie udało się wczytać części aplikacji. Odśwież stronę (Ctrl+F5 albo przeciągnij w dół na telefonie) i spróbuj ponownie.');
    }
    throw err;
  }
}
