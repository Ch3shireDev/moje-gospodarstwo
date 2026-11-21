// Ewapotranspiracja wzorcowa ET0 wg FAO-56 (Allen i in. 1998), dane dobowe.
// Używana, gdy źródło (np. NASA POWER) nie podaje gotowego ET0.
// Numery równań odnoszą się do FAO Irrigation and Drainage Paper No. 56.

const SIGMA = 4.903e-9; // stała Stefana-Boltzmanna [MJ K⁻⁴ m⁻² dzień⁻¹]

const satVp = (t) => 0.6108 * Math.exp((17.27 * t) / (t + 237.3)); // eq. 11

export function dayOfYear(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86_400_000);
}

/** Promieniowanie pozaziemskie Ra [MJ m⁻² dzień⁻¹], eq. 21–25. */
export function extraterrestrialRadiation(latDeg, doy) {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos(((2 * Math.PI) / 365) * doy);
  const delta = 0.409 * Math.sin(((2 * Math.PI) / 365) * doy - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(delta))));
  return ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws));
}

/**
 * FAO-56 Penman-Monteith, eq. 6.
 * tmax, tmin [°C], rhMean [%], u2 – wiatr na 2 m [m/s], rs – promieniowanie całkowite [MJ m⁻² dzień⁻¹], z – wysokość [m].
 */
export function et0PenmanMonteith({ tmax, tmin, rhMean, u2, rs, latDeg, isoDate, z = 100 }) {
  const t = (tmax + tmin) / 2;
  const delta = (4098 * satVp(t)) / (t + 237.3) ** 2; // eq. 13
  const p = 101.3 * ((293 - 0.0065 * z) / 293) ** 5.26; // eq. 7
  const gamma = 0.000665 * p; // eq. 8
  const es = (satVp(tmax) + satVp(tmin)) / 2; // eq. 12
  const ea = (rhMean / 100) * es; // eq. 19
  const ra = extraterrestrialRadiation(latDeg, dayOfYear(isoDate));
  const rso = (0.75 + 2e-5 * z) * ra; // eq. 37
  const rns = 0.77 * rs; // eq. 38, albedo 0,23
  const ratio = rso > 0 ? Math.min(rs / rso, 1) : 0.5;
  const rnl = SIGMA * (((tmax + 273.16) ** 4 + (tmin + 273.16) ** 4) / 2) * (0.34 - 0.14 * Math.sqrt(Math.max(ea, 0))) * (1.35 * ratio - 0.35); // eq. 39
  const rn = rns - rnl;
  const num = 0.408 * delta * rn + gamma * (900 / (t + 273)) * u2 * (es - ea);
  const den = delta + gamma * (1 + 0.34 * u2);
  return Math.max(0, num / den);
}

/** Hargreaves (FAO-56 eq. 52) – gdy brakuje promieniowania i wilgotności. Mniej dokładny. */
export function et0Hargreaves({ tmax, tmin, latDeg, isoDate }) {
  const ra = extraterrestrialRadiation(latDeg, dayOfYear(isoDate)) * 0.408; // MJ -> mm
  const t = (tmax + tmin) / 2;
  return Math.max(0, 0.0023 * (t + 17.8) * Math.sqrt(Math.max(tmax - tmin, 0)) * ra);
}
