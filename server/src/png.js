// Minimalny koder PNG (RGB, 8 bit) – do obrazów satelitarnych działki. Bez zależności, działa też w przeglądarce.
// Specyfikacja: W3C PNG (chunki IHDR, IDAT, IEND, CRC-32).
import { deflate, toBase64, concat, view } from './platform.js';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const u32be = (n) => {
  const b = new Uint8Array(4);
  view(b).setUint32(0, n);
  return b;
};

function chunk(type, data) {
  const td = concat([new TextEncoder().encode(type), data]);
  return concat([u32be(data.length), td, u32be(crc32(td))]);
}

/** rgb: Uint8Array długości w*h*3. Zwraca Uint8Array z plikiem PNG. */
export async function encodePng(rgb, w, h) {
  const ihdr = new Uint8Array(13);
  view(ihdr).setUint32(0, w);
  view(ihdr).setUint32(4, h);
  ihdr[8] = 8; // bity na kanał
  ihdr[9] = 2; // RGB
  const raw = new Uint8Array((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filtr: brak
    raw.set(rgb.subarray(y * w * 3, (y + 1) * w * 3), y * (w * 3 + 1) + 1);
  }
  return concat([
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', await deflate(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

export const pngDataUrl = async (rgb, w, h) => `data:image/png;base64,${toBase64(await encodePng(rgb, w, h))}`;

/**
 * Powiększa obraz (najbliższy sąsiad – piksele 20 m zostają ostre, bez "rozmycia" udającego szczegóły)
 * i rysuje obrys działki. outline: lista pierścieni w układzie pikseli źródłowych (x, y jako ułamki).
 */
export function upscaleWithOutline(rgb, w, h, factor, outline = [], color = [255, 230, 0]) {
  const W = w * factor;
  const H = h * factor;
  const out = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    const sy = Math.floor(y / factor);
    for (let x = 0; x < W; x++) {
      const s = (sy * w + Math.floor(x / factor)) * 3;
      const d = (y * W + x) * 3;
      out[d] = rgb[s];
      out[d + 1] = rgb[s + 1];
      out[d + 2] = rgb[s + 2];
    }
  }
  const plot = (x, y) => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const px = Math.round(x) + dx;
        const py = Math.round(y) + dy;
        if (px < 0 || py < 0 || px >= W || py >= H) continue;
        const d = (py * W + px) * 3;
        out[d] = color[0];
        out[d + 1] = color[1];
        out[d + 2] = color[2];
      }
    }
  };
  for (const ring of outline) {
    for (let i = 1; i < ring.length; i++) {
      const [x0, y0] = ring[i - 1].map((v) => v * factor);
      const [x1, y1] = ring[i].map((v) => v * factor);
      const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let k = 0; k <= steps; k++) plot(x0 + ((x1 - x0) * k) / steps, y0 + ((y1 - y0) * k) / steps);
    }
  }
  return { rgb: out, w: W, h: H };
}
