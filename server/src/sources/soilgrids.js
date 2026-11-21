import { cachedFetch } from '../http.js';

// ISRIC SoilGrids 2.0 (siatka 250 m, model globalny, licencja CC BY 4.0).
// Bierzemy uziarnienie i węgiel organiczny do opisu przyczyn (materia organiczna) i jako zapas,
// gdy mapa IUNG nie ma danych. Serwis bywa wolny (kilkanaście sekund), dlatego cache na dysku.

const DAY = 24 * 3600_000;
const DEPTHS = ['0-5cm', '5-15cm', '15-30cm', '30-60cm', '60-100cm'];
const THICK = { '0-5cm': 5, '5-15cm': 10, '15-30cm': 15, '30-60cm': 30, '60-100cm': 40 };

export const ATTRIBUTION = { name: 'ISRIC SoilGrids 2.0', url: 'https://soilgrids.org/', licence: 'CC BY 4.0' };

export async function getSoil(lat, lon) {
  const params = new URLSearchParams({ lon: lon.toFixed(4), lat: lat.toFixed(4), value: 'mean' });
  for (const p of ['clay', 'sand', 'silt', 'soc']) params.append('property', p);
  for (const d of DEPTHS) params.append('depth', d);
  const raw = await cachedFetch(`https://rest.isric.org/soilgrids/v2.0/properties/query?${params}`, {
    ttlMs: DAY,
    diskTtlMs: 365 * DAY,
    timeoutMs: 20000,
  });
  return parseSoilGrids(raw);
}

/** Średnie ważone grubością warstw: 0–30 cm (warstwa orna) i 0–100 cm. */
export function parseSoilGrids(raw) {
  const layers = Object.fromEntries((raw?.properties?.layers ?? []).map((l) => [l.name, l]));
  const avg = (name, maxCm) => {
    const l = layers[name];
    if (!l) return null;
    let s = 0;
    let w = 0;
    let top = 0;
    for (const d of l.depths) {
      const t = THICK[d.label];
      if (!t || top >= maxCm) continue;
      top += t;
      const v = d.values?.mean;
      if (v == null) continue;
      s += (v / (l.unit_measure?.d_factor ?? 1)) * t;
      w += t;
    }
    return w ? Math.round((s / w) * 10) / 10 : null;
  };
  const out = {
    clayPct: avg('clay', 100),
    sandPct: avg('sand', 100),
    siltPct: avg('silt', 100),
    socTopGkg: avg('soc', 30), // g/kg w warstwie 0–30 cm
  };
  if (out.clayPct == null && out.sandPct == null) throw new Error('SoilGrids: brak danych dla tego punktu');
  out.category = categoryFromTexture(out);
  out.texture = textureLabel(out);
  return out;
}

/**
 * Przybliżona kategoria podatności na suszę (I–IV jak w IUNG) z uziarnienia.
 * IUNG klasyfikuje wg grup granulometrycznych z mapy glebowo-rolniczej (części spławialne < 0,02 mm).
 * SoilGrids podaje frakcje USDA (ił < 2 µm, pył 2–50 µm), więc część spławialną szacujemy jako
 * ił + połowa pyłu. To nasze przybliżenie – używane tylko, gdy mapa IUNG nie ma danych.
 */
export function categoryFromTexture({ clayPct, siltPct }) {
  if (clayPct == null) return null;
  const splawialne = clayPct + 0.5 * (siltPct ?? 0);
  if (siltPct >= 50 && clayPct < 20) return 'III'; // utwory pyłowe
  if (splawialne < 10) return 'I';
  if (splawialne < 20) return 'II';
  if (splawialne < 35) return 'III';
  return 'IV';
}

function textureLabel({ clayPct, sandPct, siltPct }) {
  if (sandPct >= 70) return 'piaszczysta';
  if (siltPct >= 50) return 'pylasta';
  if (clayPct >= 30) return 'ilasta / gliniasta ciężka';
  return 'gliniasta';
}
