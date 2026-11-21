// Współrzędne stacji synoptycznych IMGW (przybliżone, ±kilka km).
// API /synop nie zwraca współrzędnych, więc trzymamy je tutaj.
// skip: stacje górskie / morskie, których nie chcemy jako "najbliższej" dla pola.

export const STATIONS = {
  12295: { name: 'Białystok', lat: 53.11, lon: 23.16 },
  12600: { name: 'Bielsko-Biała', lat: 49.81, lon: 19.0 },
  12235: { name: 'Chojnice', lat: 53.72, lon: 17.55 },
  12550: { name: 'Częstochowa', lat: 50.81, lon: 19.09 },
  12160: { name: 'Elbląg', lat: 54.17, lon: 19.43 },
  12155: { name: 'Gdańsk', lat: 54.38, lon: 18.47 },
  12300: { name: 'Gorzów Wlkp.', lat: 52.74, lon: 15.28 },
  12135: { name: 'Hel', lat: 54.6, lon: 18.81 },
  12500: { name: 'Jelenia Góra', lat: 50.9, lon: 15.79 },
  12435: { name: 'Kalisz', lat: 51.78, lon: 18.08 },
  12650: { name: 'Kasprowy Wierch', lat: 49.23, lon: 19.98, skip: true },
  12560: { name: 'Katowice', lat: 50.24, lon: 19.03 },
  12185: { name: 'Kętrzyn', lat: 54.07, lon: 21.37 },
  12570: { name: 'Kielce', lat: 50.81, lon: 20.69 },
  12520: { name: 'Kłodzko', lat: 50.44, lon: 16.61 },
  12345: { name: 'Koło', lat: 52.2, lon: 18.66 },
  12100: { name: 'Kołobrzeg', lat: 54.18, lon: 15.58 },
  12105: { name: 'Koszalin', lat: 54.2, lon: 16.15 },
  12488: { name: 'Kozienice', lat: 51.56, lon: 21.55 },
  12566: { name: 'Kraków', lat: 50.08, lon: 19.8 },
  12670: { name: 'Krosno', lat: 49.71, lon: 21.77 },
  12415: { name: 'Legnica', lat: 51.19, lon: 16.21 },
  12690: { name: 'Lesko', lat: 49.47, lon: 22.34 },
  12418: { name: 'Leszno', lat: 51.84, lon: 16.53 },
  12125: { name: 'Lębork', lat: 54.55, lon: 17.75 },
  12495: { name: 'Lublin', lat: 51.22, lon: 22.39 },
  12120: { name: 'Łeba', lat: 54.75, lon: 17.53 },
  12465: { name: 'Łódź', lat: 51.72, lon: 19.4 },
  12280: { name: 'Mikołajki', lat: 53.79, lon: 21.58 },
  12270: { name: 'Mława', lat: 53.1, lon: 20.36 },
  12660: { name: 'Nowy Sącz', lat: 49.63, lon: 20.69 },
  12272: { name: 'Olsztyn', lat: 53.77, lon: 20.42 },
  12530: { name: 'Opole', lat: 50.63, lon: 17.97 },
  12285: { name: 'Ostrołęka', lat: 53.07, lon: 21.56 },
  12230: { name: 'Piła', lat: 53.13, lon: 16.75 },
  12001: { name: 'Platforma (Bałtyk)', lat: 55.0, lon: 18.3, skip: true },
  12360: { name: 'Płock', lat: 52.59, lon: 19.73 },
  12330: { name: 'Poznań', lat: 52.42, lon: 16.83 },
  12695: { name: 'Przemyśl', lat: 49.81, lon: 22.77 },
  12540: { name: 'Racibórz', lat: 50.06, lon: 18.19 },
  12210: { name: 'Resko', lat: 53.77, lon: 15.41 },
  12580: { name: 'Rzeszów', lat: 50.11, lon: 22.04 },
  12585: { name: 'Sandomierz', lat: 50.7, lon: 21.72 },
  12385: { name: 'Siedlce', lat: 52.18, lon: 22.25 },
  12310: { name: 'Słubice', lat: 52.35, lon: 14.62 },
  12469: { name: 'Sulejów', lat: 51.35, lon: 19.87 },
  12195: { name: 'Suwałki', lat: 54.13, lon: 22.95 },
  12205: { name: 'Szczecin', lat: 53.4, lon: 14.62 },
  12215: { name: 'Szczecinek', lat: 53.72, lon: 16.68 },
  12510: { name: 'Śnieżka', lat: 50.74, lon: 15.74, skip: true },
  12200: { name: 'Świnoujście', lat: 53.92, lon: 14.24 },
  12575: { name: 'Tarnów', lat: 50.03, lon: 20.98 },
  12399: { name: 'Terespol', lat: 52.07, lon: 23.62 },
  12250: { name: 'Toruń', lat: 53.04, lon: 18.6 },
  12115: { name: 'Ustka', lat: 54.59, lon: 16.85 },
  12375: { name: 'Warszawa', lat: 52.16, lon: 20.96 },
  12455: { name: 'Wieluń', lat: 51.21, lon: 18.56 },
  12497: { name: 'Włodawa', lat: 51.55, lon: 23.53 },
  12424: { name: 'Wrocław', lat: 51.1, lon: 16.88 },
  12625: { name: 'Zakopane', lat: 49.29, lon: 19.96 },
  12595: { name: 'Zamość', lat: 50.7, lon: 23.2 },
  12400: { name: 'Zielona Góra', lat: 51.93, lon: 15.53 },
};

export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
