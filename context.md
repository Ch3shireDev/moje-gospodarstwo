# Kontekst projektu – „Moje Gospodarstwo – woda na Twoich polach”

Nazwa aplikacji: **Moje Gospodarstwo**, podtytuł **woda na Twoich polach**. „Zatrzymaj wodę, chroń plony” to nazwa zadania KOWR.

Plik dla osoby (albo modelu) przejmującej projekt w nowym wątku. Przeczytaj go w całości, zanim cokolwiek zmienisz. **Wymagania organizatora są w `docs/wymagania.md`** i mają pierwszeństwo przed tym plikiem.

## 1. Skąd to się wzięło

Hackathon HackNation 2026 (Bydgoszcz, 21–22.11.2026), zadanie Krajowego Ośrodka Wsparcia Rolnictwa (KOWR): *„Zatrzymaj wodę, chroń plony – Inteligentne wsparcie gospodarowania wodą w rolnictwie”*. Pełna treść, „Podstawy naukowe” i regulamin są w PDF-ach w katalogu głównym.

Pierwsza wersja prototypu powstała **przed publikacją pełnej treści zadania**, na zgadywanie. Część założeń okazała się błędna:

| Wcześniej zakładaliśmy                      | Regulamin mówi                                                                                                                                                                                                               |
|---------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Odbiorca = rolnik z telefonem, mobile-first | Wymóg: działanie w przeglądarkach na **Windows** (Chrome, Firefox, Edge, Safari, Opera). Mobile to atut. Nasze założenie: **web first + pełna responsywność + PWA**, tak żeby rolnik mógł wszystko zrobić tylko na telefonie |
| Punkt na mapie                              | **Numer działki ewidencyjnej** albo mapa. Jury wpisuje numer                                                                                                                                                                 |
| „Dziś” + 3 scenariusze demo                 | **Dowolna data** z ostatnich 10 lat, wskazana przez jury                                                                                                                                                                     |
| Gleba wybierana ręcznie, bez uprawy         | **Wybór uprawy** obowiązkowy, gleba najlepiej z danych                                                                                                                                                                       |
| Bilans 14 dni                               | Ocena bieżąca **i historyczna podatność z 10 lat**                                                                                                                                                                           |
| Bez satelitów i bez GIS-u                   | Wymagane kategorie: meteo, **satelita**, gleba, **hydrologia**, przestrzenne (**działki, użytkowanie, ukształtowanie terenu**)                                                                                               |
| Raport tylko na ekranie                     | **Zapis, PDF lub druk**                                                                                                                                                                                                      |

Dobre trafienia, które zostają: retencja przed nawadnianiem, rekomendacje liczone regułami z danych (a nie gotowe teksty), jawne źródła, degradacja przy awarii źródła, prosty język i karty wiedzy.

## 2. Co ma robić aplikacja (cel)

1. Rolnik (lub juror) podaje **identyfikator działki** (np. `306401_1.0001.123`) albo klika na mapie, wybiera **uprawę** i **datę analizy** (domyślnie dziś, zakres: ostatnie 10 lat).
2. Backend pobiera dane i przechodzi przez obowiązkową sekwencję (z „Podstaw naukowych”):
   **ocena sytuacji wodnej → przyczyny → rekomendacje retencyjne → agrotechnika → ewentualnie nawadnianie**.
   - **Ocena:** bilans opad − ETc (ET0 × Kc uprawy, FAO-56) na dzień analizy, wilgotność gleby, wskaźnik satelitarny (NDVI/NDMI) z obrysu działki, porównanie z tym samym okresem w poprzednich 10 latach (percentyl, częstość niedoborów, najbardziej ryzykowne miesiące).
   - **Przyczyny:** deficyt opadów, upał, niska pojemność wodna gleby, odpływ (spadek z NMT, brak elementów retencyjnych), wymagania uprawy.
   - **Retencja:** gdzie i jak zatrzymać wodę – rowy i cieki przy działce, zagłębienia terenu, strefy buforowe.
   - **Agrotechnika:** międzyplony, resztki pożniwne, uproszczona uprawa, materia organiczna.
   - **Nawadnianie:** tylko w sezonie i tylko gdy uzasadnione. Termin i dawka.
3. Raport zawiera: datę analizy i wygenerowania, źródła z datami danych, **ograniczenia i poziom niepewności**, jawne braki danych. Można go wydrukować lub zapisać jako PDF (druk z przeglądarki).
4. Odpowiedź w **≤ 30 s** dla jednej działki.
5. Opcjonalnie LLM przepisuje wynik na prosty język. Bez klucza używany jest szablon. LLM niczego nie liczy.

## 3. Hierarchia źródeł wiedzy (rekomendacje i treści)

Przy konflikcie zaleceń wygrywa wyższy poziom:

1. **Nauka:** FAO-56, IUNG-PIB (System Monitoringu Suszy Rolniczej), KE – Natural Water Retention Measures, publikacje recenzowane, naukowcy (SGGW, ERCE PAN, UW, PAN).
2. **Organizacje przyrodnicze:** Centrum Ochrony Mokradeł (bagna.pl), OTOP, Koalicja Ratujmy Rzeki, WWF, Nauka dla Przyrody, PTH, EEA / Climate-ADAPT.
3. **Instytucje państwowe i doradztwo:** PGW Wody Polskie, CDR Brwinów / ODR, IMGW-PIB (w części zaleceń).

## 4. Uruchomienie

```bash
docker compose up --build                     # produkcyjnie: http://localhost:8787
docker compose -f docker-compose.dev.yml up   # dev z hot reloadem: :5173 (front), :8787 (API)
```

Bez Dockera: `npm run setup`, potem `npm run dev:server` i `npm run dev:client` w dwóch terminalach. Testy: `npm test` (tylko backend, `node:test`).

## 5. Architektura

Aktualny opis modułów i API jest w README (sekcja 3). W skrócie: `report.js` rozpoznaje działkę i równolegle pobiera dane (pogoda jest wymagana, reszta opcjonalna z limitami czasu), `engine.js` + `analysis/*` liczą ocenę, przyczyny, rekomendacje i niepewność, `weather.js` przełącza Open-Meteo -> NASA POWER, `cog.js` czyta Sentinel-2 bez bibliotek.

```
GET /api/report?parcel=<ID lub "obręb numer">&date=RRRR-MM-DD&crop=<uprawa>[&soil=I|II|III|IV]
GET /api/report?lat=..&lon=..&date=..&crop=..
```

### Open-Meteo – licencja (sprawdzone 21.11.2026)

- Dane: CC BY 4.0, także komercyjnie. W UI obok danych musi być „Weather data by Open-Meteo.com” z linkiem do https://open-meteo.com/ (teraz jest samo „Open-Meteo” bez linku – do poprawy w `Report.jsx`). Dla ERA5 dodatkowo przypisanie Copernicus Climate Change Service.
- Darmowe API: tylko użytek niekomercyjny (bez reklam i subskrypcji). Prototyp na hackathon się mieści.
- Wdrożenie przez KOWR bez opłat licencyjnych: własna instancja (serwer AGPLv3, osobna usługa po HTTP, więc AGPL nie obejmuje naszego kodu) albo ERA5 wprost z Copernicus CDS. Plan płatny (API historyczne dopiero od planu Professional) to tylko alternatywa. Regulamin Open-Meteo nie mówi wprost, czy instytucja publiczna może korzystać z darmowego API.
- Regulamin KOWR (pkt 5.2) wymaga danych bezpłatnych i legalnych – prototyp na darmowym API to spełnia. Pkt 5.4 dopuszcza płatne usługi, jeśli są opisane z kosztami i alternatywami.
- Plan B / walidacja: archiwum dobowe IMGW-PIB ze stacji. Bez ograniczenia komercyjnego, ale punktowe i bez ET0 (trzeba liczyć Penman-Monteith wg FAO-56).

### Zależności

Backend nadal **preferuje zero zależności npm**. Wyjątek dopuszczamy tylko wtedy, gdy bez biblioteki nie da się rozsądnie zrobić wymaganej funkcji (np. odczyt rastrów GeoTIFF z satelity lub NMT). Najpierw sprawdź, czy wystarczy usługa, która zwraca gotowe statystyki, albo `node:zlib`. Każda nowa zależność musi mieć licencję permisywną (MIT, BSD, Apache-2.0, ISC), bo zwycięzca przenosi prawa na KOWR. Wpisz ją do README w sekcji licencji.

## 6. Pułapki w danych (sprawdzone na prawdziwych odpowiedziach)

| Źródło                          | Pułapka                                                                                            | Jak obsłużone                                                                         |
|---------------------------------|----------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------|
| Open-Meteo `soil_moisture_*`    | W części prognozowej skacze o ~30% w 4 godziny, bo `best_match` przełącza modele                   | Bierzemy **tylko bieżącą godzinę**. Przyszłość liczymy z bilansu P − ET0              |
| Open-Meteo archiwum (ERA5)      | Inne warstwy gleby niż w prognozie, brak `precipitation_probability_max`                           | Osobna lista zmiennych w `openMeteo.js`                                               |
| Open-Meteo limity               | Darmowe API: 10 000 zapytań/dobę na IP. Na hackathonie limit był wyczerpany przez wspólne IP       | Archiwum rocznymi blokami z cache na dysku, zapas NASA POWER z ET0 liczonym przez nas |
| Sentinel-2 Earth Search         | STAC podaje offset −0,1, ale DN w COG są już bez przesunięcia (czerwień nad roślinnością ~400–800) | `effectiveOffset()`: offset tylko gdy wszystkie DN ≥ 1000                             |
| Sentinel-2 B11                  | Kafel 20 m waży > 1 MB                                                                             | B11 z podglądu 40 m, próbkowanie po współrzędnych                                     |
| ULDK GetParcelByIdOrNr          | 1. linia to LICZBA wyników, nie status                                                             | `parseUldkList()`                                                                     |
| IUNG WMS                        | Raster: GRAY_INDEX 1–4 kategorie, 5 organiczne, 11 las, 12 woda, 13 zabudowa                       | `CLASSES` w `iungSoil.js`                                                             |
| NMT GUGiK                       | `x` = północ, `y` = wschód (PUWG 1992)                                                             | `to2180()` zwraca obie konwencje                                                      |
| Overpass                        | Z sieci hackathonu nie odpowiadał                                                                  | Trzy serwery po kolei, potem jawny brak w raporcie                                    |
| IMGW `/synop`                   | Brak współrzędnych, liczby jako stringi, `null`, stacje górskie i „Platforma” na Bałtyku           | Tabela `stations.js`, `num()`, flaga `skip`                                           |
| IMGW `/synop` `suma_opadu`      | Nieznany okres akumulacji (nie doba)                                                               | Nie używamy opadu ze stacji                                                           |
| IMGW `/synop`, `/warningsmeteo` | Tylko stan bieżący, **brak archiwum**                                                              | Dla dat historycznych raport mówi wprost: brak danych                                 |
| IMGW `/warningsmeteo`           | Przypisane do 4-cyfrowych kodów TERYT powiatów, czas lokalny jako string                           | Kod powiatu z ULDK, porównanie stringów czasu warszawskiego                           |
| ULDK                            | Odpowiada **tekstem**: linia 1 = status (`0` = OK), linia 2 = pola rozdzielone `\|`                | `parseUldk()`. `306401_1` → powiat `3064`                                             |
| ULDK `xy`                       | Kolejność `lon,lat,4326` (sprawdzone)                                                              | —                                                                                     |
| Sezon                           | W listopadzie ET0 ~0,5 mm/dzień, nawadnianie bez sensu                                             | Silnik zna sezony. Jury może podać datę z sezonu wegetacyjnego                        |

## 7. Silnik reguł – obecne liczby

- RAW (łatwo dostępna woda): lekka 30 mm, średnia 50 mm, ciężka 70 mm. `sucho` ≤ −RAW/2, `susza` ≤ −RAW, `mokro` ≥ +25 mm (bilans 14 dni).
- Nawadnianie tylko w sezonie (IV–IX). Gdy w 3 dni spadnie ≥ 5 mm: „wstrzymaj się”. Dawka = deficyt, max 25 mm (1 mm = 10 m³/ha).
- Ulewa ≥ 15 mm/dzień. Przymrozek: tmin ≤ 0. Upał: tmax ≥ 30. Okno prac: ≥ 2 dni z opadem < 1 mm, „spokojny” dzień przy wietrze ≤ 20 km/h.
- Poza sezonem zawsze akcja retencyjna (zastawki, przegrody z materiałów naturalnych).
- Progi są **orientacyjne**. Do zmiany na metodykę FAO-56 (Kc) i IUNG (klimatyczny bilans wodny, kategorie gleb) oraz do konsultacji z mentorami.

## 8. Kolejność prac (stan na 21.11.2026)

Zrobione: punkty 1–8 z poprzedniej listy (działka po numerze, data, uprawa, 10 lat, przyczyny, niepewność, druk, satelita, teren, hydrologia, gleba IUNG). Do zrobienia:

1. **Zbudować i przetestować front** (`npm install && npm run build`) – na maszynie, na której powstał, nie było `npm`. Sprawdzić druk do PDF i układ w 5 przeglądarkach na Windows oraz na telefonie.
2. Porównać wyniki z mapami KBW IUNG dla kilku gmin i dat (ich dane referencyjne to najpewniej to, czego użyje jury).
3. BDOT10k jako pewniejsze źródło rowów niż OSM.
4. Materiały do zgłoszenia: prezentacja PDF (≤ 10 slajdów), film (≤ 3 min), przykładowe raporty (PDF).

## 9. Konwencje

- UI i komunikaty po polsku, prosto, bez żargonu. Zwracamy się do rolnika na „ty”.
- Każda nowa reguła = test w `server/test/engine.test.js`. Każde nowe źródło = fixtura z prawdziwej odpowiedzi w `server/test/fixtures/` + wpis w `docs/api.md`.
- Liczby w UI przez `Intl.NumberFormat('pl-PL')` (przecinek dziesiętny).
- Brak danych pokazujemy wprost („brak danych z X dla tej daty”), nigdy nie wypełniamy go wartością domyślną udającą pomiar.
- Nie zbieramy danych osobowych. Nie ma kont, logowania ani analityki.
- Każde nowe źródło danych lub biblioteka → wpis w README (źródło, licencja, czy dane są pobierane na bieżąco czy wcześniej, data pobrania).
