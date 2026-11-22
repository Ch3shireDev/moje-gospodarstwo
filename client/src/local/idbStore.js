// Cache "dyskowy" backendu w aplikacji mobilnej: IndexedDB (dane archiwalne pogody, gleby, NDVI – oszczędza limity API).
// Gdy IndexedDB nie działa, cache po prostu nie ma.
const DB = 'mg-cache';
const STORE = 'kv';

let dbp = null;
const open = () =>
  (dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));

const tx = async (mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const idbStore = {
  get: (hash) => tx('readonly', (s) => s.get(hash)).catch(() => undefined),
  set: (hash, text) => tx('readwrite', (s) => s.put(text, hash)).catch(() => undefined),
};
