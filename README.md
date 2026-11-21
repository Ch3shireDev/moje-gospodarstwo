# Moje Gospodarstwo – woda na Twoich polach

Prototyp na HackNation 2026, zadanie KOWR *„Zatrzymaj wodę, chroń plony – Inteligentne wsparcie gospodarowania wodą w rolnictwie”*.

> README jest ułożone według pkt 4.2 treści zadania. Checklista zgodności z regulaminem: [docs/wymagania.md](docs/wymagania.md).

## Problem i rozwiązanie

Otwarte dane o pogodzie, glebie, satelitach i wodzie są rozproszone i trudne w użyciu. Aplikacja ocenia sytuację wodną konkretnej działki ewidencyjnej i podpowiada działania: najpierw zatrzymanie wody, potem zabiegi uprawowe, na końcu nawadnianie. Pełny opis do zgłoszenia: [docs/opis-zgloszenia.md](docs/opis-zgloszenia.md).

**Dokumenty:**
- [docs/jak-to-dziala.md](docs/jak-to-dziala.md) – co dzieje się w aplikacji od kliknięcia do raportu,
- [docs/status.md](docs/status.md) – co już zrobiliśmy i jaki jest cel projektu,
- [docs/domena.md](docs/domena.md) – domena problemu po ludzku: bilans wodny, susza rolnicza, progi IUNG, retencja, satelita, słowniczek,
- [docs/prezentacja.md](docs/prezentacja.md) – prezentacja (10 slajdów, [Marp](https://marp.app/)). PDF do zgłoszenia:

```bash
npx @marp-team/marp-cli docs/prezentacja.md --pdf --html --allow-local-files
```

  Podgląd na żywo: rozszerzenie „Marp for VS Code”. Te same polecenie z `--pptx` zamiast `--pdf` daje plik PowerPoint.

## 1. Uruchomienie

### Docker – jedna komenda

```bash
docker compose up --build        # http://localhost:8787
```

Opcjonalnie skopiuj `.env.example` do `.env` (port, klucz do LLM, obraz Node).

Gdy Docker Hub odpowiada `429 Too Many Requests` (limit anonimowych pobrań na IP), pobierz obraz Node z mirrora Google:

```bash
NODE_IMAGE=mirror.gcr.io/library/node:22-alpine docker compose up --build
```
 Tryb deweloperski z hot reloadem:

```bash
docker compose -f docker-compose.dev.yml up    # front :5173, API :8787
```

### Bez Dockera (Windows, Linux, macOS)

Wymagany Node 20+.

```bash
npm run setup          # instaluje zależności frontu (backend ich nie ma)
npm run build
npm start              # http://localhost:8787 – front + API w jednym procesie
```

Tryb deweloperski (dwa terminale): `npm run dev:server` (API :8787) i `npm run dev:client` (front :5173, proxy `/api`).

Testy: `npm test`.

Użytkownik niczego nie instaluje – wystarczy przeglądarka (Chrome, Firefox, Edge, Safari, Opera). Interfejs jest responsywny, więc całość da się obsłużyć także na telefonie. Na telefonie aplikację można dodać do ekranu głównego jako PWA (działa po `npm run build`).

### Open-Meteo zwraca 429 (limit zapytań)

Darmowe API Open-Meteo ma limit **na adres IP**: 600 zapytań na minutę, 5 000 na godzinę, 10 000 na dobę. Zapytanie o więcej niż 2 tygodnie danych liczy się jak kilka. Na hackathonie wszyscy wychodzą do internetu z jednego IP, więc limit szybko się kończy. Aplikacja wtedy sama przełącza historię pogody na NASA POWER (mniej dokładne) i pisze o tym w raporcie. Żeby wróciło ERA5:

1. **Inne IP** – najszybciej: hotspot z telefonu albo serwer w chmurze. Limit liczy się osobno dla każdego IP.
2. **Poczekaj** – limit minutowy i godzinowy zwalnia się sam, dobowy o północy (UTC).
3. **Cache** – pobrane lata zapisują się w `server/.cache` (w Dockerze na wolumenie `app_cache`), więc ta sama okolica nie zużywa limitu drugi raz. Przed demo przeklikaj działki jury z dobrego łącza.
4. **Klucz komercyjny** – `OPEN_METEO_API_KEY=...` w `.env`. Zapytania idą wtedy na `customer-api` i `customer-archive-api.open-meteo.com` bez limitu na IP. API historyczne jest od planu Professional.
5. **Własna instancja** – serwer Open-Meteo jest open source (AGPLv3, Docker). Ustaw `OPEN_METEO_FORECAST_URL` i `OPEN_METEO_ARCHIVE_URL`. Uwaga: do archiwum trzeba pobrać dane ERA5, to duże zbiory.

## 2. Funkcjonalności

1. **Dwa ekrany:** mapa z panelem wyboru działki, a po wyborze – strona z analizą. Z analizy wracasz do mapy w to samo miejsce i możesz kliknąć np. działkę sąsiada.
2. **Wskazanie działki:** identyfikator działki ewidencyjnej (np. `302502_2.0009.387`), „nazwa obrębu i numer” (np. `Sulęcin 387`) albo kliknięcie na mapie. Obrys działki z ULDK GUGiK.
2. **Uprawa** (9 grup, m.in. zboża ozime i jare, kukurydza, rzepak, ziemniak, burak, strączkowe, użytki zielone) i **data analizy**: dziś albo dowolny dzień z ostatnich 10 lat.
3. **Ocena sytuacji wodnej** (etap 1):
   - klimatyczny bilans wodny (opad − ET0) z 61 dni porównany z **progami suszy rolniczej IUNG-PIB** dla uprawy i kategorii gleby (rozporządzenie MRiRW z 2019 r.),
   - ten sam okres w **10 poprzednich latach** (percentyl, średnia, rok po roku),
   - **historyczna podatność**: w ilu z 10 sezonów wystąpiła susza i w których miesiącach ryzyko jest największe,
   - zapas wody w strefie korzeni (FAO-56, Kc uprawy),
   - **NDVI i NDMI z Sentinel-2** dla obrysu działki (maska chmur SCL) na tle tych samych tygodni w poprzednich latach.
4. **Przyczyny** (etap 2): mało opadów, długi okres bez deszczu, wysokie parowanie, lekka gleba, mało materii organicznej, spływ po stoku, odpływ rowami, faza uprawy, słabsza roślinność na zdjęciu satelitarnym. Każda z liczbą i źródłem.
5. **Rekomendacje** w kolejności wymaganej przez KOWR, każda z polem „na podstawie”:
   - **retencja**: zatrzymanie wody w rowie przy działce, wykorzystanie obniżeń terenu (punkt na mapie), spowolnienie spływu po stoku, strefy buforowe, ochrona mokradeł, gleby organiczne,
   - **agrotechnika**: międzyplony, resztki pożniwne, ograniczenie orki, materia organiczna, dobór upraw,
   - **nawadnianie** (opcjonalnie): czy, kiedy i ile (dawka z bilansu strefy korzeni, termin z prognozy),
   - dla analizy „na dziś”: ostrzeżenia IMGW (meteo i susza hydrologiczna), przymrozki, upał, ulewy.
6. **Ograniczenia i niepewność:** poziom pewności, lista czynników nieuwzględnionych, jawne braki danych (np. „brak bezchmurnego zdjęcia”, „OSM nie odpowiedział”), status każdego źródła.
7. **Zapis raportu:** plik PDF generowany w przeglądarce (A4: dane działki ze szkicem obrysu, stan wody, wskaźniki, wykresy 10 lat, przyczyny, rekomendacje, ograniczenia, źródła z przypisaniami, metodyka; numeracja stron), zapis w aplikacji (ostatnie 10 raportów w przeglądarce), pobranie danych w JSON.
8. Opcjonalne podsumowanie przez LLM (bez klucza – szablon).

Kolejność analizy: ocena sytuacji wodnej → przyczyny → rekomendacje retencyjne → agrotechnika → nawadnianie. Bez danych pogodowych raport nie powstaje (HTTP 502), a bez oceny nie ma rekomendacji.

## 3. Architektura

```
client/  React + Vite + MapLibre + PWA: formularz (działka, uprawa, data, gleba), mapa, raport, druk
server/src/
  index.js            HTTP (node:http): /api/meta, /api/report, statyczny front
  report.js           rozpoznanie działki, równoległe pobieranie z limitami czasu, statusy źródeł
  engine.js           składa analizę: ocena -> przyczyny -> rekomendacje -> niepewność
  analysis/water.js   KBW 61 dni, okresy i progi IUNG, bilans strefy korzeni FAO-56
  analysis/history.js 10 lat: percentyl, podatność, klimatologia miesięczna
  analysis/assess.js  wskaźniki, werdykt, przyczyny
  analysis/recommend.js retencja, agrotechnika, nawadnianie, pogoda
  weather.js          szereg dobowy: Open-Meteo (ERA5 + prognoza), zapasowo NASA POWER
  et0.js              ET0 FAO-56 Penman-Monteith i Hargreaves
  cog.js              czytnik Cloud Optimized GeoTIFF (HTTP Range + node:zlib)
  geo.js              PUWG 1992, UTM, pole, punkty w działce, odległości
  data/iungKbw.js     progi KBW IUNG (generowane z susza.iung.pulawy.pl/progi)
  data/crops.js       uprawy: Kc i głębokość korzeni (FAO-56), kalendarz faz
  sources/            uldk, openMeteo, nasaPower, iungSoil, soilgrids, nmt, osm, imgw, sentinel
```

```
GET /api/report?parcel=302502_2.0009.387&date=2025-05-31&crop=zboza_ozime[&soil=I|II|III|IV]
GET /api/report?lat=52.10&lon=17.30&date=2025-05-31&crop=ziemniak
```

Gdy numer pasuje do kilku działek, API zwraca 300 z listą kandydatów. Backend nie ma zależności npm. Wyniki pobrane z archiwów (pogoda z lat ubiegłych, gleba, NMT, statystyki scen satelitarnych) są zapisywane w `server/.cache`, więc kolejne analizy tego miejsca są szybsze i nie zużywają limitów API.

## 4–5. Źródła danych i aktualność

| Kategoria | Źródło | Zakres | Pobierane |
|---|---|---|---|
| Meteo | Open-Meteo Historical (ERA5 / ERA5-Land) | opad, ET0, temp., dobowo, od 11 lat przed datą analizy | na bieżąco, rocznymi blokami; lata zakończone – cache na dysku |
| Meteo | Open-Meteo Forecast | ostatnie dni + prognoza 7 dni, wilgotność gleby | na bieżąco (tylko analiza „na dziś”) |
| Meteo (zapas) | NASA POWER (MERRA-2) | opad, temp., wilgotność, wiatr, promieniowanie; ET0 liczymy wg FAO-56 | gdy Open-Meteo odmawia |
| Meteo | IMGW-PIB `synop`, `warningsmeteo` | stacja, ostrzeżenia dla powiatu | na bieżąco; brak archiwum |
| Hydrologia | IMGW-PIB `hydro`, `warningshydro` | najbliższy wodowskaz, ostrzeżenia o suszy hydrologicznej | na bieżąco; brak archiwum |
| Hydrologia | OpenStreetMap – kafle wektorowe OpenFreeMap (zapasowo Overpass API) | rowy, cieki, zbiorniki, mokradła w promieniu 600 m | na bieżąco; zdekodowane kafle w cache na dysku |
| Glebowe | IUNG-PIB: mapa kategorii podatności gleb na suszę (WMS) | kategoria I–IV, gleby organiczne, użytkowanie | na bieżąco |
| Glebowe | IUNG-PIB: progi KBW (rozporządzenie MRiRW 11.04.2019) | 14 upraw × 4 kategorie × 14 okresów | **pobrane wcześniej, 21.11.2026** (`server/src/data/iungKbw.js`) |
| Glebowe | ISRIC SoilGrids 2.0 | uziarnienie, węgiel organiczny | na bieżąco |
| Satelitarne | Sentinel-2 L2A (Earth Search, AWS) | NDVI, NDMI, maska SCL, 20 m, od 2018 | na bieżąco (tylko kafle z działką) |
| Przestrzenne | GUGiK ULDK | działka, obręb, gmina, powiat, obrys | na bieżąco |
| Przestrzenne | GUGiK NMT (GetHByPointList) | wysokości w siatce 9×9 na działce | na bieżąco |
| Podkład | OpenFreeMap, GUGiK WMS (ortofoto, działki) | mapa | w przeglądarce |
| Wiedza | FAO-56 (Kc, głębokość korzeni, wzory ET0) | `server/src/data/crops.js`, `et0.js` | przygotowane wcześniej |

Wynik i rekomendacje zawsze liczy aplikacja z pobranych danych. Nie ma gotowych rekomendacji.

## 6. Biblioteki, usługi i AI

| Składnik | Rola | Licencja |
|---|---|---|
| React, React DOM | UI | MIT |
| Vite, @vitejs/plugin-react | build | MIT |
| vite-plugin-pwa | instalacja jako PWA | MIT |
| MapLibre GL JS | mapa | BSD-3-Clause |
| pdfmake (ładowany dopiero przy pobieraniu raportu) | raport PDF generowany w przeglądarce | MIT |
| Roboto (font dołączony do pdfmake) | polskie znaki w PDF | Apache-2.0 |
| Node.js (bez zależności npm po stronie serwera) | backend | MIT |
| Anthropic Messages API (opcjonalnie) | przepisanie gotowego wyniku na prosty język | usługa płatna – patrz niżej |

**Sztuczna inteligencja:**
- *W aplikacji:* opcjonalnie model Claude (Anthropic) dostaje gotowe liczby i listę działań z silnika reguł i pisze 2–3 zdania podsumowania. Model niczego nie liczy i nie wybiera działań. Bez klucza `ANTHROPIC_API_KEY` podsumowanie powstaje z szablonu, a aplikacja działa w pełni.
- *Przy tworzeniu:* kod i dokumentacja powstały z pomocą asystenta Claude Code (Anthropic).

**Koszty (pkt 5.4):** w prototypie wszystkie źródła danych są bezpłatne. Płatne elementy:
- opcjonalne podsumowanie LLM, rozliczane za tokeny – przy małym modelu to ułamki grosza na raport. Alternatywa: szablon (domyślnie);
- przy wdrożeniu produkcyjnym aplikacja **nie wymaga żadnych opłat licencyjnych**. Rekomendowana droga to własna instancja serwera Open-Meteo (open source, AGPLv3, Docker): koszt to tylko serwer i dysk. Dane ERA5 są też dostępne bezpłatnie wprost z Copernicus Climate Data Store. Alternatywy: komercyjny plan Open-Meteo (stała opłata miesięczna, co najmniej Professional ze względu na API historyczne) albo archiwum dobowe IMGW-PIB (dane ze stacji, ET0 trzeba liczyć samodzielnie metodą FAO-56 Penman-Monteith).

## 7. Licencje i warunki korzystania z danych

- **Open-Meteo** (sprawdzone 21.11.2026 na https://open-meteo.com/en/terms, `/en/pricing`, `/en/licence`):
  - *Dane:* CC BY 4.0, także do użytku komercyjnego. Wymagane przypisanie przy każdym miejscu, gdzie dane są pokazywane: „Weather data by Open-Meteo.com” z linkiem do https://open-meteo.com/. Dane z reanalizy ERA5 dodatkowo podlegają licencji Copernicus i wymagają przypisania Copernicus Climate Change Service.
  - *Darmowe API:* tylko do użytku niekomercyjnego. Open-Meteo za komercyjne uznaje m.in. aplikacje z subskrypcjami lub reklamami, a darmowy plan poleca do oceny i prototypowania. Prototyp hackathonowy bez reklam i opłat mieści się w tych warunkach.
  - *Wdrożenie przez KOWR:* regulamin Open-Meteo nie opisuje wprost aplikacji instytucji publicznych. Bezpłatna droga to **własna instancja** serwera Open-Meteo. Alternatywa to plan płatny (API historyczne zawiera dopiero plan Professional, plan Standard go nie ma). Pewność co do darmowego API dla instytucji publicznej dałoby tylko zapytanie do Open-Meteo.
  - *Serwer Open-Meteo:* AGPLv3, self-hosting z Dockera jest wspierany. Łączymy się z nim po HTTP jako z osobną usługą i go nie modyfikujemy, więc AGPL nie obejmuje kodu tej aplikacji.
- **IMGW-PIB** – dane publiczne, wymagane wskazanie źródła („Źródłem pochodzenia danych jest IMGW-PIB”) i oznaczenie danych przetworzonych. https://danepubliczne.imgw.pl
- **GUGiK (ULDK, WMS)** – dane bezpłatne, udostępniane na podstawie ustawy Prawo geodezyjne i kartograficzne. https://www.geoportal.gov.pl
- **OpenStreetMap / OpenFreeMap** – dane ODbL, wymagane przypisanie „© OpenStreetMap contributors”.
- **Copernicus Sentinel-2** – wolny i otwarty dostęp, wymagane przypisanie („Contains modified Copernicus Sentinel data”). Katalog Earth Search / AWS Open Data.
- **NASA POWER** – dane NASA bez ograniczeń, z podaniem źródła.
- **IUNG-PIB** – mapa kategorii gleb i progi KBW udostępnione publicznie (susza.iung.pulawy.pl, sgeo.iung.pl). Warunki dalszego wykorzystania do potwierdzenia z IUNG.
- **ISRIC SoilGrids** – CC BY 4.0.
- **FAO-56** – metodyka (wzory i tabele) cytowana w kodzie.

Warunki licencji do potwierdzenia przed zgłoszeniem: [docs/wymagania.md](docs/wymagania.md), pkt 7.

## 8. Znane ograniczenia

- **Pogoda z modeli**, nie z pola: ERA5-Land ok. 9 km, NASA POWER ok. 50 km. Lokalne burze mogą się różnić.
- **ET0 FAO-56 a progi IUNG:** IUNG liczy parowanie metodą Penmana z danych stacji IMGW. My liczymy ET0 metodą FAO-56 z reanalizy, więc nasz KBW może się różnić od komunikatów IUNG.
- **Bilans strefy korzeni** zaczyna się 1 marca od założenia, że gleba jest uwilgotniona do polowej pojemności. Nie uwzględnia nawadniania, wód gruntowych ani drenowania. Kalendarz faz upraw jest typowy dla Polski, a nie odczytany z pola.
- **Kategoria gleby** z mapy IUNG to dominanta z ok. 10 punktów na działce. Gdy mapa nie ma danych – przybliżenie z SoilGrids (250 m).
- **Satelita:** zdjęcia od 2018 r. Zachmurzenie często uniemożliwia odczyt. W poprzednich latach na działce mogła rosnąć inna uprawa, więc porównanie NDVI jest orientacyjne. Archiwum jest w USA – na wolnym łączu jedna scena to kilkanaście sekund.
- **Rowy i cieki z OSM** bywają niekompletne. Czytamy je z kafli wektorowych OpenFreeMap (CDN, bez klucza i limitu na IP); publiczne serwery Overpass, używane tylko zapasowo, bywają przeciążone i nie mają kluczy API.
- **IMGW nie ma archiwum** ostrzeżeń i pomiarów – dla dat historycznych ich nie ma. Dla dat historycznych nie znamy też ówczesnej prognozy.
- Próg „blisko suszy” (30 mm nad progiem IUNG) i podział podatności (≥ 4 sezony z suszą na 10 = wysoka, 2–3 = średnia) to nasze założenia.
- Nie zweryfikowano: działania frontu w 5 przeglądarkach i wydruku do PDF (na maszynie deweloperskiej nie było `npm`), działania w Dockerze.

## 9. Weryfikacja wyników

- 23 testy (`npm test`) na fixturach z prawdziwych odpowiedzi API: parsery ULDK, IUNG, SoilGrids, NMT, IMGW, NASA POWER, STAC; ET0 sprawdzone na przykładzie 18 z FAO-56; progi IUNG; scenariusze silnika (susza wg IUNG, przyczyny, kolejność rekomendacji); degradacja przy awarii źródeł.
- Ręczne sprawdzenie na żywo: działka 302502_2.0009.387 (Krzykosy, gleba kat. II). Wynik z 10 lat: susza wg progów IUNG w 2018 i 2019 r., zgodnie ze znanymi suszami w Wielkopolsce.
- Każdy raport pokazuje wskaźniki, wartości odniesienia i źródła, więc wynik da się sprawdzić ręcznie (np. z mapami KBW na susza.iung.pulawy.pl).

## Skalowalność (pkt 5.5)

- **Cache** odpowiedzi źródeł w pamięci serwera (prognoza krótko, ULDK i archiwum 24 h). Przy większym ruchu: Redis i zapis gotowych raportów.
- **Limity Open-Meteo (darmowe API):** 600 zapytań/min, 5 000/h, 10 000/dobę, 300 000/miesiąc, liczone na adres IP. Zapytanie z więcej niż 10 zmiennymi albo o więcej niż 2 tygodnie danych dla jednego punktu liczy się jako kilka zapytań. Pełny szereg dzienny z 10 lat zużyłby kilkaset zapytań na raport. Dlatego:
  - z archiwum pobieramy tylko potrzebne okna (ten sam okres w każdym z 10 lat) i minimum zmiennych,
  - dane archiwalne trzymamy w cache na dysku, bo się nie zmieniają,
  - przy skali krajowej: własna instancja Open-Meteo albo plan płatny.
- Dane statyczne (gleba, teren, cieki) można pobrać raz i trzymać lokalnie.
- **Czas odpowiedzi:** wszystkie źródła odpytywane równolegle, cel ≤ 30 s na działkę.
- **Koszty:** jeden mały serwer (Docker) wystarcza na prototyp. Przy skali krajowej dochodzą: cache, ewentualna instancja Open-Meteo i przechowywanie danych satelitarnych.

## Bezpieczeństwo i prywatność

Aplikacja nie ma kont ani logowania i nie zbiera danych osobowych. Ostatni raport jest zapisywany tylko w przeglądarce użytkownika (localStorage). Parametry zapytań są walidowane (zakres współrzędnych Polski, lista typów gleby).

## Treści edukacyjne

Sekcja „Zatrzymaj wodę – dlaczego to działa”: zastawki na rowach, torfowiska, skutki prostowania rzek, rola lasów, formalności. Treści są w `client/src/knowledge.js`, a źródła i ich hierarchia w [docs/zrodla.md](docs/zrodla.md).

## Dla nowej osoby w projekcie

Zacznij od [docs/wymagania.md](docs/wymagania.md) i `context.md`. `CLAUDE.md` zawiera krótkie zasady pracy z repo.
