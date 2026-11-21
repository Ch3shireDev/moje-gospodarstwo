// Uprawy, które rolnik może wybrać.
//
// kc: współczynniki uprawowe FAO-56 (Allen i in., tab. 12): ini / mid / end.
// rootM, p: głębokość korzeni [m] i frakcja łatwo dostępnej wody (FAO-56, tab. 22) – brane dolne
//   wartości zakresów, bo w Polsce gleby często ograniczają ukorzenienie.
// kcMonth: Kc w kolejnych miesiącach I..XII. To NASZE PRZYBLIŻENIE: przypisaliśmy fazy FAO
//   (ini/mid/end) do typowego kalendarza w Polsce. 0 = pole bez uprawy (np. po zbiorze).
// iung: klucz do tabeli progów KBW IUNG (data/iungKbw.js). null = IUNG nie monitoruje tej uprawy.
// grassland: trwały użytek zielony – bez orki i siewu; inne rady agrotechniczne (koszenie, wypas, podsiew).
// straw: czy po zbiorze zostaje słoma (zboża, rzepak) – inaczej mówimy o resztkach pożniwnych.
// critical: okresy krytyczne dla wody – opis do raportu (na podstawie okresów, w których IUNG
//   podaje progi suszy dla uprawy, i faz FAO o najwyższym Kc).

export const CROPS = {
  zboza_ozime: {
    label: 'Zboża ozime (pszenica, żyto, jęczmień, pszenżyto)',
    short: 'zboża ozime',
    kc: { ini: 0.4, mid: 1.15, end: 0.3 },
    rootM: 1.5,
    p: 0.55,
    kcMonth: [0.4, 0.4, 0.4, 0.7, 1.15, 1.15, 0.5, 0, 0, 0.4, 0.4, 0.4],
    iung: 'zboza_ozime',
    straw: true,
    critical: 'od strzelania w źdźbło do kłoszenia (maj–czerwiec)',
    harvestMonth: 7,
  },
  zboza_jare: {
    label: 'Zboża jare (jęczmień, owies, pszenica jara)',
    short: 'zboża jare',
    kc: { ini: 0.3, mid: 1.15, end: 0.25 },
    rootM: 1.0,
    p: 0.55,
    kcMonth: [0, 0, 0, 0.3, 0.8, 1.15, 0.6, 0, 0, 0, 0, 0],
    iung: 'zboza_jare',
    straw: true,
    critical: 'od krzewienia do kłoszenia (maj–czerwiec)',
    harvestMonth: 8,
  },
  kukurydza_ziarno: {
    label: 'Kukurydza na ziarno',
    short: 'kukurydza na ziarno',
    kc: { ini: 0.3, mid: 1.2, end: 0.6 },
    rootM: 1.0,
    p: 0.55,
    kcMonth: [0, 0, 0, 0, 0.3, 0.7, 1.2, 1.2, 0.6, 0.6, 0, 0],
    iung: 'kukurydza_ziarno',
    critical: 'wiechowanie i kwitnienie (lipiec)',
    harvestMonth: 10,
  },
  kukurydza_kiszonka: {
    label: 'Kukurydza na kiszonkę',
    short: 'kukurydza na kiszonkę',
    kc: { ini: 0.3, mid: 1.2, end: 0.6 },
    rootM: 1.0,
    p: 0.55,
    kcMonth: [0, 0, 0, 0, 0.3, 0.7, 1.2, 1.2, 0.6, 0, 0, 0],
    iung: 'kukurydza_kiszonka',
    critical: 'wiechowanie i kwitnienie (lipiec)',
    harvestMonth: 9,
  },
  rzepak: {
    label: 'Rzepak i rzepik',
    short: 'rzepak',
    kc: { ini: 0.35, mid: 1.1, end: 0.35 },
    rootM: 1.0,
    p: 0.6,
    kcMonth: [0.35, 0.35, 0.35, 0.7, 1.1, 1.0, 0.35, 0, 0.35, 0.35, 0.35, 0.35],
    iung: 'rzepak',
    straw: true,
    critical: 'pąkowanie i kwitnienie (kwiecień–maj) oraz wschody jesienią (sierpień–wrzesień)',
    harvestMonth: 7,
  },
  ziemniak: {
    label: 'Ziemniak',
    short: 'ziemniak',
    kc: { ini: 0.5, mid: 1.15, end: 0.75 },
    rootM: 0.4,
    p: 0.35,
    kcMonth: [0, 0, 0, 0.5, 0.5, 0.9, 1.15, 1.0, 0.75, 0, 0, 0],
    iung: 'ziemniak',
    critical: 'zawiązywanie i przyrost bulw (czerwiec–sierpień)',
    harvestMonth: 9,
  },
  burak: {
    label: 'Burak cukrowy',
    short: 'burak cukrowy',
    kc: { ini: 0.35, mid: 1.2, end: 0.7 },
    rootM: 0.7,
    p: 0.55,
    kcMonth: [0, 0, 0, 0.35, 0.5, 0.9, 1.2, 1.2, 1.0, 0.7, 0, 0],
    iung: 'burak',
    critical: 'zwieranie rzędów i przyrost korzeni (lipiec–sierpień)',
    harvestMonth: 10,
  },
  straczkowe: {
    label: 'Rośliny strączkowe (groch, bobik, łubin, soja)',
    short: 'rośliny strączkowe',
    kc: { ini: 0.4, mid: 1.15, end: 0.35 },
    rootM: 0.6,
    p: 0.45,
    kcMonth: [0, 0, 0, 0.4, 0.7, 1.15, 1.0, 0.35, 0, 0, 0, 0],
    iung: 'straczkowe',
    critical: 'kwitnienie i zawiązywanie strąków (czerwiec–lipiec)',
    harvestMonth: 8,
  },
  uzytki_zielone: {
    label: 'Łąka lub pastwisko (trwałe użytki zielone)',
    short: 'użytki zielone',
    kc: { ini: 0.4, mid: 0.95, end: 0.85 },
    rootM: 0.5,
    p: 0.6,
    kcMonth: [0.4, 0.4, 0.5, 0.85, 0.95, 0.95, 0.95, 0.95, 0.85, 0.7, 0.4, 0.4],
    iung: null,
    grassland: true,
    critical: 'odrost po pokosach (maj–sierpień)',
    harvestMonth: null,
  },
};

export const DEFAULT_CROP = 'zboza_ozime';

/** Kc na dany dzień: liniowa interpolacja między środkami miesięcy. */
export function kcOn(crop, isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  const daysIn = new Date(Date.UTC(d.getUTCFullYear(), m + 1, 0)).getUTCDate();
  const t = (day - 0.5) / daysIn - 0.5; // -0.5..0.5 względem środka miesiąca
  const cur = crop.kcMonth[m];
  const other = crop.kcMonth[(m + (t >= 0 ? 1 : 11)) % 12];
  // Nie interpolujemy przez "pole puste" (0) – tam zmiana jest skokowa (siew, zbiór).
  if (cur === 0 || other === 0) return cur;
  return cur + (other - cur) * Math.abs(t);
}
