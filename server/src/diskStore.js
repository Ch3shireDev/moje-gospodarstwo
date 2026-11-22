// Magazyn cache na dysku dla serwera Node (pliki JSON w server/.cache). Aplikacja mobilna używa IndexedDB.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CACHE_DIR = process.env.CACHE_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.cache');

export const fileStore = {
  get: (hash) => readFile(path.join(CACHE_DIR, `${hash}.json`), 'utf8').catch(() => undefined),
  async set(hash, text) {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(path.join(CACHE_DIR, `${hash}.json`), text);
  },
};
