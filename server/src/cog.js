// Minimalny czytnik Cloud Optimized GeoTIFF (COG) bez zależności.
// Obsługuje to, czego używa archiwum Sentinel-2 L2A na AWS (sentinel-cogs): klasyczny TIFF (nie BigTIFF),
// kafle, kompresja Deflate (8) lub brak (1), predyktor poziomy (2), 8 lub 16 bitów, jedna próbka na piksel.
// Pobiera tylko nagłówek i kafle pokrywające działkę (HTTP Range).
import { inflateSync } from 'node:zlib';
import { fetchRange } from './http.js';

const HEADER_BYTES = 16384;
const headerCache = new Map();

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 11: 4, 12: 8, 16: 8 };

function reader(buf, le) {
  return {
    u8: (o) => buf.readUInt8(o),
    u16: (o) => (le ? buf.readUInt16LE(o) : buf.readUInt16BE(o)),
    u32: (o) => (le ? buf.readUInt32LE(o) : buf.readUInt32BE(o)),
    f64: (o) => (le ? buf.readDoubleLE(o) : buf.readDoubleBE(o)),
  };
}

/** Parsuje IFD-y z bufora nagłówka. Zwraca listę poziomów (0 = pełna rozdzielczość, dalej podglądy). */
export function parseTiffHeader(buf) {
  const order = buf.toString('ascii', 0, 2);
  if (order !== 'II' && order !== 'MM') throw new Error('COG: to nie jest TIFF');
  const le = order === 'II';
  const r = reader(buf, le);
  if (r.u16(2) !== 42) throw new Error('COG: BigTIFF nieobsługiwany');

  const readValues = (type, count, valueOffset, entryPos) => {
    const size = TYPE_SIZE[type] ?? 1;
    const start = size * count <= 4 ? entryPos + 8 : valueOffset;
    if (start + size * count > buf.length) return { outOfHeader: true, start, size, count, type };
    const out = [];
    for (let i = 0; i < count; i++) {
      const o = start + i * size;
      if (type === 3) out.push(r.u16(o));
      else if (type === 4) out.push(r.u32(o));
      else if (type === 12) out.push(r.f64(o));
      else if (type === 1 || type === 7 || type === 2) out.push(r.u8(o));
      else out.push(r.u32(o));
    }
    return out;
  };

  const ifds = [];
  let off = r.u32(4);
  while (off && off + 2 <= buf.length && ifds.length < 12) {
    const n = r.u16(off);
    const tags = {};
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12;
      if (e + 12 > buf.length) break;
      const tag = r.u16(e);
      tags[tag] = readValues(r.u16(e + 2), r.u32(e + 4), r.u32(e + 8), e);
    }
    const first = (t) => (Array.isArray(tags[t]) ? tags[t][0] : undefined);
    ifds.push({
      width: first(256),
      height: first(257),
      bitsPerSample: first(258) ?? 8,
      compression: first(259) ?? 1,
      predictor: first(317) ?? 1,
      sampleFormat: first(339) ?? 1,
      tileWidth: first(322),
      tileHeight: first(323),
      offsets: tags[324],
      counts: tags[325],
      pixelScale: Array.isArray(tags[33550]) ? tags[33550] : null,
      tiePoint: Array.isArray(tags[33922]) ? tags[33922] : null,
      nodata: Array.isArray(tags[42113]) ? Number(Buffer.from(tags[42113]).toString('ascii').replace(/\0/g, '')) : null,
    });
    const nextPos = off + 2 + n * 12;
    off = nextPos + 4 <= buf.length ? r.u32(nextPos) : 0;
  }
  if (!ifds.length) throw new Error('COG: brak IFD');
  const base = ifds[0];
  if (!base.pixelScale || !base.tiePoint) throw new Error('COG: brak georeferencji');
  return { le, ifds };
}

async function resolveOutOfHeader(url, header) {
  // Tablice offsetów kafli mogą leżeć poza pierwszymi 64 KB – dociągamy je osobno.
  for (const ifd of header.ifds) {
    for (const key of ['offsets', 'counts']) {
      const v = ifd[key];
      if (v && v.outOfHeader) {
        const bytes = await fetchRange(url, v.start, v.start + v.size * v.count - 1);
        const r = reader(bytes, header.le);
        ifd[key] = Array.from({ length: v.count }, (_, i) => (v.size === 2 ? r.u16(i * 2) : r.u32(i * 4)));
      }
    }
  }
  return header;
}

export async function openCog(url) {
  if (headerCache.has(url)) return headerCache.get(url);
  const p = (async () => {
    const buf = await fetchRange(url, 0, HEADER_BYTES - 1);
    return resolveOutOfHeader(url, parseTiffHeader(buf));
  })();
  headerCache.set(url, p);
  if (headerCache.size > 200) headerCache.delete(headerCache.keys().next().value);
  try {
    return await p;
  } catch (err) {
    headerCache.delete(url);
    throw err;
  }
}

/** Parametry geotransformacji poziomu: lewy górny róg i rozmiar piksela w jednostkach układu (m). */
export function levelTransform(header, level) {
  const base = header.ifds[0];
  const ifd = header.ifds[level];
  const [, , , X0, Y0] = base.tiePoint;
  const factor = base.width / ifd.width;
  return { x0: X0, y0: Y0, px: base.pixelScale[0] * factor, py: base.pixelScale[1] * factor };
}

/** Indeks poziomu o rozdzielczości najbliższej `resM`. */
export function levelForResolution(header, resM) {
  let best = 0;
  let bestDiff = Infinity;
  header.ifds.forEach((ifd, i) => {
    if (!ifd.offsets || !ifd.tileWidth) return;
    const res = levelTransform(header, i).px;
    const diff = Math.abs(res - resM);
    if (diff < bestDiff) {
      best = i;
      bestDiff = diff;
    }
  });
  return best;
}

export function decodeTile(raw, ifd, le) {
  const data = ifd.compression === 8 ? inflateSync(raw) : ifd.compression === 1 ? raw : null;
  if (!data) throw new Error(`COG: nieobsługiwana kompresja ${ifd.compression}`);
  const w = ifd.tileWidth;
  const h = ifd.tileHeight;
  let arr;
  if (ifd.bitsPerSample === 16) {
    arr = new Uint16Array(w * h);
    for (let i = 0; i < w * h && i * 2 + 1 < data.length; i++) arr[i] = le ? data[i * 2] | (data[i * 2 + 1] << 8) : (data[i * 2] << 8) | data[i * 2 + 1];
  } else if (ifd.bitsPerSample === 8) {
    arr = new Uint8Array(data.buffer, data.byteOffset, Math.min(w * h, data.length)).slice();
  } else {
    throw new Error(`COG: nieobsługiwane ${ifd.bitsPerSample} bitów`);
  }
  if (ifd.predictor === 2) {
    const mask = ifd.bitsPerSample === 16 ? 0xffff : 0xff;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 1; x < w; x++) arr[row + x] = (arr[row + x] + arr[row + x - 1]) & mask;
    }
  }
  return arr;
}

/**
 * Czyta prostokąt pikseli [col0, col1] × [row0, row1] (włącznie) z poziomu `level`.
 * Zwraca { data, cols, rows, col0, row0 }.
 */
export async function readWindow(url, level, col0, row0, col1, row1) {
  const header = await openCog(url);
  const ifd = header.ifds[level];
  col0 = Math.max(0, col0); row0 = Math.max(0, row0);
  col1 = Math.min(ifd.width - 1, col1); row1 = Math.min(ifd.height - 1, row1);
  if (col1 < col0 || row1 < row0) throw new Error('COG: działka poza sceną');
  const cols = col1 - col0 + 1;
  const rows = row1 - row0 + 1;
  const out = ifd.bitsPerSample === 16 ? new Uint16Array(cols * rows) : new Uint8Array(cols * rows);
  const tilesAcross = Math.ceil(ifd.width / ifd.tileWidth);
  const tx0 = Math.floor(col0 / ifd.tileWidth), tx1 = Math.floor(col1 / ifd.tileWidth);
  const ty0 = Math.floor(row0 / ifd.tileHeight), ty1 = Math.floor(row1 / ifd.tileHeight);
  const jobs = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = ty * tilesAcross + tx;
      const offset = ifd.offsets[t];
      const count = ifd.counts[t];
      jobs.push((async () => {
        if (!count) return; // pusty kafel = nodata
        const raw = await fetchRange(url, offset, offset + count - 1, { timeoutMs: Number(process.env.COG_TILE_TIMEOUT_MS) || 20000 });
        const tile = decodeTile(raw, ifd, header.le);
        for (let y = Math.max(row0, ty * ifd.tileHeight); y <= Math.min(row1, (ty + 1) * ifd.tileHeight - 1); y++) {
          for (let x = Math.max(col0, tx * ifd.tileWidth); x <= Math.min(col1, (tx + 1) * ifd.tileWidth - 1); x++) {
            out[(y - row0) * cols + (x - col0)] = tile[(y - ty * ifd.tileHeight) * ifd.tileWidth + (x - tx * ifd.tileWidth)];
          }
        }
      })());
    }
  }
  await Promise.all(jobs);
  return { data: out, cols, rows, col0, row0 };
}
