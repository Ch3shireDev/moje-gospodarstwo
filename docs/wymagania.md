# Wymagania z regulaminu KOWR – checklista

Źródło: trzy PDF-y w katalogu głównym repo (treść zadania, „Podstawy naukowe”, regulamin). Ten plik je streszcza i jest **nadrzędny** wobec wcześniejszych założeń projektu. Jeśli coś w kodzie lub w `context.md` jest z nim sprzeczne, wygrywa ten plik (a w razie wątpliwości – PDF).

Status: ✅ zrobione · ⚠️ częściowo · ❌ brak. Aktualizuj przy każdej zmianie.

## 1. Jak jury testuje (rozdz. 6) – to wyznacza priorytety

- Jurorzy **wpisują numer działki ewidencyjnej** (te same działki dla każdego zespołu, z całej Polski) i **datę analizy**: dziś albo dowolny dzień z ostatnich 10 lat.
- Wynik porównują z **danymi referencyjnymi** dostępnymi tylko dla jury. Liczy się więc poprawność oceny, a nie tylko ładny UI.
- Finał: 3–5 zespołów, pitch ok. 2–3 min + do 2 min pytań, demo na żywo dla 1–3 działek i dat wskazanych przez jury.
- Preferowany czas wygenerowania rekomendacji: **≤ 30 s** dla jednej działki.

## 2. Obowiązkowy zakres prototypu (pkt 3.3)

| # | Wymaganie | Status |
|---|---|---|
| 1 | Aplikacja webowa w przeglądarce, bez instalowania czegokolwiek. Musi działać w **Chrome, Firefox, Edge, Safari i Opera na Windows**. Działanie na mobile to atut | ⚠️ układ desktop + mobile gotowy, nie testowano w 5 przeglądarkach |

Nasze założenie: **web first**, pełna responsywność. Rolnik musi móc zrobić wszystko **tylko na telefonie** (PWA z instalacją na ekranie głównym). Jury testuje jednak na komputerze, więc widok desktopowy nie może być „rozciągniętym telefonem”.
| 2 | Wskazanie działki: **identyfikator działki ewidencyjnej** lub lokalizacja na mapie | ✅ ID TERYT, „obręb numer”, klik na mapie, wyszukiwarka miejsc (miejscowość, gmina, powiat, województwo) prowadząca do mapy |
| 3 | **Wybór aktualnej uprawy** | ✅ 9 upraw (Kc FAO-56, progi IUNG) |
| 4a | Ocena **bieżącej** sytuacji wodnej działki | ✅ KBW 61 dni vs progi IUNG, strefa korzeni FAO-56, Sentinel-2 |
| 4b | Ocena **historycznej podatności** na niedobory wody z danych **z ostatnich 10 lat** | ✅ susza w X z 10 sezonów, ryzykowne miesiące, percentyl; porównanie 14 upraw IUNG na tej glebie (które rzadziej miały suszę) |
| 4c | Analiza na **dowolną datę** z ostatnich 10 lat (z rozdz. 6) | ✅ |
| 4d | Wynik i rekomendacje **liczone z pobranych danych**. Wyświetlanie gotowych rekomendacji nie spełnia wymagań | ✅ silnik reguł |
| 5 | Raport: stan niedoboru wody **i jego przyczyny**, rekomendacje uzasadnione danymi (retencyjne, agrotechniczne, nawadnianie opcjonalnie), **data**, **źródła**, **ograniczenia** (aktualność, dokładność, niepewność, czynniki pominięte). Brak danych komunikowany wprost, bez pozornej precyzji | ✅ przyczyny, wskaźniki, poziom pewności, lista ograniczeń, statusy źródeł |
| 6 | Raport **do zapisania w systemie, jako plik (np. PDF) lub do druku** | ⚠️ PDF generowany w przeglądarce (pdfmake), zapis w aplikacji, JSON – PDF nie sprawdzony w przeglądarce |

## 3. Kolejność analizy (pkt 3.2 + „Podstawy naukowe”)

Obowiązkowa sekwencja, ma być widoczna w raporcie:

1. **Ocena sytuacji wodnej** – meteo, gleba, satelita, na tle 10 lat. Interpretacja satelity uwzględnia rodzaj uprawy.
2. **Identyfikacja przyczyn** – deficyt opadów, wysoka temperatura, mała pojemność wodna gleby (uziarnienie, próchnica), nadmierny odpływ (spadek terenu, brak mokradeł, oczek, zadrzewień), wymagania uprawy.
3. **Rekomendacje retencyjne** – zasada „zatrzymaj wodę tam, gdzie spadła”: miejsca i sposoby zatrzymania wody na działce lub w gospodarstwie (rowy, cieki, oczka, mokradła, strefy buforowe, zadrzewienia). Wymaga danych o terenie i hydrologii.
4. **Działania agrotechniczne** – międzyplony, resztki pożniwne, ograniczenie intensywnej uprawy, materia organiczna.
5. **Nawadnianie (opcjonalnie)** – czy jest zasadne, kiedy i ile.

System **nie generuje rekomendacji bez wcześniejszego rozpoznania warunków działki**. Retencja ma priorytet przed nawadnianiem.

Przykładowe rekomendacje z treści zadania (wzorzec stylu, którego oczekuje jury): podwyższone ryzyko suszy wynikające z niskiej retencji glebowej i częstych niedoborów opadów; najwyższe ryzyko w okresie maj–lipiec; warunki do retencji krajobrazowej w rowach lub małych ciekach; międzyplony i resztki pożniwne.

## 4. Kategorie danych (pkt 3.3) – wszystkie wymagane

| Kategoria | Teraz | Kandydaci (lista z pkt 5.2 jest otwarta) | Status |
|---|---|---|---|
| Meteorologiczne | Open-Meteo (prognoza + ERA5), IMGW synop i ostrzeżenia | – | ✅ |
| Satelitarne | Sentinel-2 L2A (Earth Search), NDVI + NDMI z maską SCL, własny czytnik COG | – | ✅ |
| Glebowe | mapa kategorii IUNG (WMS), progi KBW IUNG, SoilGrids (SOC, uziarnienie) | – | ✅ |
| Hydrologiczne | OSM (rowy, cieki, zbiorniki, mokradła), IMGW wodowskazy i ostrzeżenia o suszy hydrologicznej | BDOT10k jako pewniejsze źródło rowów | ⚠️ Overpass bywa niedostępny |
| Przestrzenne: działki | ULDK (ById, ByIdOrNr, ByXY) | – | ✅ |
| Przestrzenne: teren | NMT GUGiK (GetHByPointList): spadek, kierunek spływu, obniżenia | – | ✅ |
| Przestrzenne: użytkowanie | warstwa IUNG (las, woda, zabudowa), ortofoto WMS | BDOT10k | ⚠️ |
| Tło suszowe | – | EDO (Copernicus) WMS – opcjonalnie | ❌ |

Warunek: dane bezpłatne, legalnie dostępne, użyte zgodnie z licencją, z udokumentowanym pochodzeniem.

Wymagane są **kategorie**, a nie konkretni dostawcy. Lista źródeł w pkt 5.2 jest „pomocnicza, otwarta i niewyczerpująca”. Przykład: dane hydrologiczne są obowiązkowe, ale **Wody Polskie (Hydroportal ISOK) są opcjonalne** – cieki, rowy i zbiorniki można wziąć z BDOT10k (GUGiK) lub OpenStreetMap, a stany wód z IMGW-PIB hydro.

## 5. Elementy zgłoszenia (pkt 4.1)

- [ ] Nazwa zespołu i tytuł rozwiązania (bez imion i nazwisk w nazwie zespołu – zalecenie z § 6 regulaminu)
- [ ] Zwięzły opis: problem, główne funkcjonalności, sposób wykorzystania danych, korzyści dla użytkownika
- [ ] Link do **prywatnego** repozytorium (prywatne co najmniej do końca wydarzenia; dostęp dla jury według instrukcji z Platformy)
- [ ] README spełniające pkt 4.2 (niżej)
- [ ] Prezentacja PDF, **maks. 10 slajdów**
- [ ] Działający prototyp: link do działającej wersji lub instrukcja uruchomienia w README (**obowiązkowe**)
- [ ] Film do **3 minut**
- [ ] Raport lub raporty wygenerowane przez prototyp

## 6. README – minimum z pkt 4.2

1. instrukcja uruchomienia
2. opis podstawowych funkcjonalności
3. skrócony opis architektury
4. źródła i zakresy danych
5. które dane są pobierane na bieżąco, a które wcześniej pobrane lub przetworzone, **z datami pobrania** (wynik i tak liczy aplikacja)
6. wykaz bibliotek, komponentów, modeli, usług zewnętrznych i **narzędzi AI**
7. licencje i warunki korzystania z danych i komponentów
8. znane ograniczenia techniczne
9. sposób weryfikacji wyników lub rekomendacji

Do tego, z pkt 5.1 i 5.5: zakres i sposób użycia AI oraz **skalowalność** (limity i dostępność źródeł, cache, zapis wyników, ograniczanie zapytań, aktualizacja danych, czas odpowiedzi przy większym ruchu, koszty infrastruktury). Z pkt 5.4: jeśli coś jest płatne, wskaż to wprost razem z kosztem i alternatywą.

## 7. Wymagania techniczne

- Technologia dowolna (pkt 5.1). Musi dać się uruchomić w warunkach wydarzenia według README.
- AI dozwolone. Zakres i sposób użycia **trzeba opisać**.
- Dla rolnika (pkt 5.4): bez płatnej licencji, specjalistycznego sprzętu, znajomości GIS, programowania, samodzielnego przetwarzania danych przestrzennych i instalowania oprogramowania.
- Skala (pkt 5.5): działa dla **dowolnej działki w Polsce**. Duży ruch nie jest wymagany, ale musi być opisany.
- Bezpieczeństwo (pkt 5.6): podstawy cyberbezpieczeństwa; **nie zbieramy danych osobowych**, jeśli nie są niezbędne.
- Regulamin § 2 ust. 10: rozwiązanie powstaje w trakcie wydarzenia. Biblioteki, dane i AI są dozwolone, o ile są wykazane z licencjami i **licencje pozwalają KOWR korzystać z rozwiązania** (zwycięzca przenosi autorskie prawa majątkowe na KOWR, § 5). Unikaj licencji copyleft lub niekomercyjnych w komponentach, które wchodzą do kodu.

## 8. Kryteria oceny (rozdz. 7)

| Kryterium | Waga | Na co patrzą |
|---|---|---|
| Wartość praktyczna | 25% | konkretne decyzje: retencja, racjonalne nawadnianie, ograniczanie strat wilgoci, skutki suszy; specyfika gospodarstwa i miejsca |
| Dane i wiarygodność | 25% | jakość i łączenie źródeł, poprawność merytoryczna, zgodność z wiedzą naukową, dopasowanie do działki, uzasadnienie danymi, **jawne ograniczenia i niepewność** |
| Innowacyjność i rozwój | 20% | nowatorstwo podejścia, wartość dodana wobec istniejących narzędzi, integracja z innymi systemami, skalowanie |
| Prostota obsługi | 15% | intuicyjność dla osoby bez przygotowania technicznego, dopasowanie do pracy w gospodarstwie |
| Prototyp i jakość techniczna | 15% | analiza dla wskazanej działki i daty, stabilność, architektura i kod, szybkość, bezpieczeństwo, dokumentacja, zgodność z licencjami |

Próg: jury może nie przyznać nagrody, jeśli żadne rozwiązanie nie uzyska 50% punktów albo nie spełni wymagań formalnych.

## 9. Bibliografia z „Podstaw naukowych” – punkt odniesienia dla metod

- Allen, Pereira, Smith – FAO-56 (ET0, współczynniki uprawy Kc, bilans wodny)
- Doroszewski i in. (2012) – Podstawy Systemu Monitoringu Suszy Rolniczej, IUNG-PIB (klimatyczny bilans wodny, kategorie gleb)
- Komisja Europejska (2014, 2015) – Natural Water Retention Measures
- FAO (2019) – Water scarcity management
- Minasny i in. (2017) – Soil carbon 4 per mille
- Żyłowska, Kozyra (2025) – zintegrowane monitorowanie suszy, IUNG-PIB
- Materiały polecane przez ekspertów: POLSA (2024) – dane satelitarne, rozdz. 6.3.3 i 6.3.4; CDR Brwinów (2025) – e-poradnik „Melioracje, retencja i gospodarka wodna w rolnictwie”

Mentorzy merytoryczni: susza i bilans wodny, agrotechnika i dane satelitarne, GIS i dane publiczne, potrzeby użytkownika. Progi i reguły warto skonsultować z nimi na miejscu.
