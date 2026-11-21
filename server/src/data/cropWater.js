// Uprawy, dla których IUNG-PIB publikuje progi suszy rolniczej (14 grup), z nazwami do raportu
// i ogólną wodolubnością wg FAO.
//
// fao: FAO, „Irrigation Water Management: Training Manual No. 3 – Irrigation Water Needs”
//   (Brouwer, Heibloem 1986), rozdz. 3, tab. 14 „Indicative values of crop water needs and
//   sensitivity to drought”: potrzeby wodne w mm na cały okres wegetacji i wrażliwość na suszę.
//   https://www.fao.org/4/s2022e/s2022e07.htm (sprawdzone 21.11.2026).
//   To wartości orientacyjne z cieplejszych klimatów – w Polsce liczby są zwykle niższe,
//   ale kolejność upraw (która potrzebuje więcej wody) jest ta sama. Dla upraw bez wiersza
//   w tabeli FAO (rzepak, chmiel, tytoń, sady, krzewy, truskawki) nie podajemy liczb.
// cropId: klucz w data/crops.js, jeśli tę uprawę można wybrać w formularzu.
// perennial: uprawa wieloletnia albo specjalistyczna (sad, plantacja) – pokazujemy w tabeli, ale nie
//   podsuwamy jako zamiennika zwykłej uprawy polowej.

const SENS = { low: 'mała', 'low-medium': 'mała do średniej', 'medium-high': 'średnia do dużej', high: 'duża' };

export const IUNG_CROPS = {
  zboza_ozime: { label: 'zboża ozime', cropId: 'zboza_ozime', fao: { row: 'jęczmień, owies, pszenica', mm: [450, 650], sensitivity: 'low-medium' } },
  zboza_jare: { label: 'zboża jare', cropId: 'zboza_jare', fao: { row: 'jęczmień, owies, pszenica', mm: [450, 650], sensitivity: 'low-medium' } },
  kukurydza_ziarno: { label: 'kukurydza na ziarno', cropId: 'kukurydza_ziarno', fao: { row: 'kukurydza', mm: [500, 800], sensitivity: 'medium-high' } },
  kukurydza_kiszonka: { label: 'kukurydza na kiszonkę', cropId: 'kukurydza_kiszonka', fao: { row: 'kukurydza', mm: [500, 800], sensitivity: 'medium-high' } },
  rzepak: { label: 'rzepak i rzepik', cropId: 'rzepak', fao: null },
  ziemniak: { label: 'ziemniak', cropId: 'ziemniak', fao: { row: 'ziemniak', mm: [500, 700], sensitivity: 'high' } },
  burak: { label: 'burak cukrowy', cropId: 'burak', fao: { row: 'burak cukrowy', mm: [550, 750], sensitivity: 'low-medium' } },
  straczkowe: { label: 'rośliny strączkowe', cropId: 'straczkowe', fao: { row: 'groch, fasola', mm: [300, 500], sensitivity: 'medium-high' } },
  warzywa: { label: 'warzywa gruntowe (np. kapusta)', cropId: null, fao: { row: 'kapusta', mm: [350, 500], sensitivity: 'medium-high' } },
  truskawki: { perennial: true, label: 'truskawki', cropId: null, fao: null },
  krzewy_owocowe: { perennial: true, label: 'krzewy owocowe', cropId: null, fao: null },
  drzewa_owocowe: { perennial: true, label: 'drzewa owocowe', cropId: null, fao: null },
  chmiel: { perennial: true, label: 'chmiel', cropId: null, fao: null },
  tyton: { perennial: true, label: 'tytoń', cropId: null, fao: null },
};

export const faoSensitivityLabel = (s) => SENS[s] ?? null;

export const FAO_SOURCE = 'FAO, Irrigation Water Management – Training Manual No. 3 (1986), tab. 14';
