// Prymitywy, które działają tak samo w Node (serwer) i w przeglądarce / WebView (aplikacja na Androida).
// Dzięki temu cały backend (bez index.js i diskStore.js) da się zbundlować do frontu i liczyć raport na telefonie.
// Tylko API webowe: Compression/DecompressionStream, crypto.subtle, TextDecoder, DataView, btoa.

/** Zmienne środowiskowe – w przeglądarce ich nie ma, więc pusty obiekt. */
export const env = globalThis.process?.env ?? {};

async function pipe(bytes, stream) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

/** zlib (RFC 1950) – rozpakowanie. */
export const inflate = (bytes) => pipe(bytes, new DecompressionStream('deflate'));

/** zlib (RFC 1950) – kompresja. */
export const deflate = (bytes) => pipe(bytes, new CompressionStream('deflate'));

/** SHA-1 jako hex (klucze cache – nie do bezpieczeństwa). */
export async function sha1hex(text) {
  const digest = await globalThis.crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Bajty -> base64 (bez Buffer). Po kawałku, żeby nie przekroczyć limitu argumentów. */
export function toBase64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export const ascii = (bytes, start = 0, end = bytes.length) => new TextDecoder('latin1').decode(bytes.subarray(start, end));

export const view = (bytes) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

export function concat(parts) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/**
 * fetch do plików binarnych (kafle, COG). W aplikacji Capacitor globalny fetch jest podmieniony na natywny
 * (CapacitorHttp – omija CORS), który słabo radzi sobie z binarkami i Range. Serwery z binarkami (AWS S3,
 * OpenFreeMap) mają CORS, więc dla nich bierzemy oryginalny fetch WebView, jeśli jest.
 */
export const binaryFetch = (...args) => (globalThis.CapacitorWebFetch ?? globalThis.fetch)(...args);
