// Minimalny fetch z timeoutem i dwupoziomowym cache:
// - pamięć (szybkie, krótkie TTL: prognozy, ostrzeżenia),
// - dysk (dane archiwalne i statyczne – nie zmieniają się, a oszczędzają limity zapytań, np. Open-Meteo).
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cache = new Map();
const MAX_ENTRIES = 500;
const UA = 'moje-gospodarstwo/0.2 (prototyp KOWR HackNation 2026)';

export const CACHE_DIR =
  process.env.CACHE_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.cache');
const diskEnabled = process.env.DISK_CACHE !== '0' && process.env.NODE_ENV !== 'test';

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const keyFile = (key) => path.join(CACHE_DIR, `${createHash('sha1').update(key).digest('hex')}.json`);

async function diskGet(key, ttlMs) {
  if (!diskEnabled) return undefined;
  try {
    const { savedAt, value } = JSON.parse(await readFile(keyFile(key), 'utf8'));
    if (ttlMs && Date.now() - savedAt > ttlMs) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

async function diskSet(key, value) {
  if (!diskEnabled) return;
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(keyFile(key), JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    /* brak zapisu to nie błąd – po prostu nie ma cache */
  }
}

function memGet(key) {
  const hit = cache.get(key);
  return hit && hit.expires > Date.now() ? hit.value : undefined;
}

function memSet(key, value, ttlMs) {
  if (!ttlMs) return;
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
  cache.set(key, { value, expires: Date.now() + ttlMs });
}

/**
 * Pobiera URL jako JSON albo tekst.
 * ttlMs – cache w pamięci; diskTtlMs – cache na dysku (0 = bez; Infinity = na zawsze).
 */
export async function cachedFetch(url, { ttlMs = 0, diskTtlMs = 0, as = 'json', timeoutMs = 8000, method = 'GET', body, headers = {} } = {}) {
  const key = `${as}:${method}:${url}:${body ?? ''}`;
  const mem = memGet(key);
  if (mem !== undefined) return mem;
  if (diskTtlMs) {
    const disk = await diskGet(key, Number.isFinite(diskTtlMs) ? diskTtlMs : 0);
    if (disk !== undefined) {
      memSet(key, disk, ttlMs || 3600_000);
      return disk;
    }
  }

  const res = await fetch(url, {
    method,
    body,
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': UA, ...headers },
  });
  if (!res.ok) {
    let reason = '';
    try {
      const txt = await res.text();
      reason = JSON.parse(txt)?.reason ?? '';
    } catch {
      /* treść błędu nieistotna */
    }
    throw new HttpError(`HTTP ${res.status} z ${new URL(url).host}${reason ? `: ${reason}` : ''}`, res.status);
  }
  const value = as === 'json' ? await res.json() : await res.text();
  memSet(key, value, ttlMs);
  if (diskTtlMs) await diskSet(key, value);
  return value;
}

/** Fragment pliku binarnego (HTTP Range) – do czytania Cloud Optimized GeoTIFF. */
export async function fetchRange(url, start, end, { timeoutMs = 15000 } = {}) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { 'User-Agent': UA, Range: `bytes=${start}-${end}` },
  });
  if (res.status !== 206 && res.status !== 200) throw new HttpError(`HTTP ${res.status} z ${new URL(url).host}`, res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  // Serwer bez obsługi Range zwraca cały plik (200) – wycinamy żądany fragment.
  return res.status === 200 ? buf.subarray(start, end + 1) : buf;
}

/** Cache wyników obliczeń (np. statystyk NDVI dla działki i sceny) na dysku. */
export async function memoDisk(key, ttlMs, compute) {
  const k = `memo:${key}`;
  const mem = memGet(k);
  if (mem !== undefined) return mem;
  const disk = await diskGet(k, Number.isFinite(ttlMs) ? ttlMs : 0);
  if (disk !== undefined) {
    memSet(k, disk, 3600_000);
    return disk;
  }
  const value = await compute();
  memSet(k, value, 3600_000);
  await diskSet(k, value);
  return value;
}

/** Promise z limitem czasu. Po przekroczeniu odrzuca z czytelnym komunikatem. */
export function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label}: brak odpowiedzi w ${Math.round(ms / 1000)} s`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}
