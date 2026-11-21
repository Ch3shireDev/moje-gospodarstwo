# Opis rozwiązania (do zgłoszenia, pkt 4.1)

> Szkic. Uzupełnij nazwę zespołu (bez imion i nazwisk – zalecenie z § 6 regulaminu) i sprawdź zgodność z aktualnym stanem prototypu.

**Zespół:** _[nazwa zespołu]_
**Tytuł:** Moje Gospodarstwo – woda na Twoich polach

## Problem

Susza rolnicza w Polsce występuje coraz częściej: długie okresy bez deszczu przeplatają się z ulewami, po których woda szybko odpływa. Polska ma jedne z najmniejszych zasobów wody w Europie – ok. 1,6 tys. m³ wód powierzchniowych na osobę rocznie wobec ok. 4,5 tys. średnio w Europie (IOŚ-PIB, projekt Klimada 2.0).

Przez dziesięciolecia sieć rowów melioracyjnych budowano po to, żeby odwadniać podmokłe grunty pod uprawę. Ta sieć nadal odprowadza wodę także wtedy, gdy powinna zostać w polu. Zastawek jest mało albo są zniszczone, a ich odbudowę hamują formalności, koszty, potrzeba porozumienia z sąsiadami i utrzymanie rowów nastawione na szybki odpływ. Podobnie z rzekami: hydrolodzy wskazują, że prostowanie koryt i usuwanie naturalnych przeszkód przyspiesza odpływ i obniża poziom wód gruntowych w okolicy.

Danych o pogodzie, glebie, terenie i stanie roślin jest dużo, ale są rozproszone i wymagają specjalistycznej wiedzy. Rolnik nie dostaje z nich prostej odpowiedzi: jak wygląda woda na mojej działce i co mogę z tym zrobić.

## Rozwiązanie

Aplikacja webowa (działa w przeglądarce na komputerze i telefonie, bez instalacji) dla konkretnej działki ewidencyjnej:

1. **ocenia sytuację wodną** – czy działce grozi susza według progów IUNG-PIB dla wybranej uprawy i kategorii gleby, na tle tego samego okresu w 10 poprzednich latach, z zapasem wody w strefie korzeni i stanem roślin z satelity,
2. **wyjaśnia przyczyny** – mało opadów, wysokie parowanie, lekka gleba, spływ po stoku, odpływ rowem przy działce,
3. **podpowiada działania w kolejności zalecanej przez naukowców i przez KOWR** („Podstawy naukowe” zadania, zasada „zatrzymaj wodę tam, gdzie spadła”):
   - najpierw **retencja**: zastawka lub przegroda z naturalnych materiałów w pobliskim rowie, wykorzystanie obniżeń terenu, spowolnienie spływu po stoku, ochrona mokradeł,
   - potem **agrotechnika** ograniczająca straty wilgoci: międzyplony, resztki pożniwne, mniej orki, materia organiczna,
   - na końcu **nawadnianie** – czy jest zasadne, kiedy i ile.

Stawiamy na najtańsze rozwiązania, które rolnik może wdrożyć sam (najprostsza przegroda z ziemi, faszyny lub kłód nie wymaga pozwolenia budowlanego), i mówimy wprost o formalnościach (trwałe piętrzenie wody w rowie wymaga zgłoszenia wodnoprawnego) oraz o ograniczeniach danych. Każda rada wynika z danych o tej działce, a nie z ogólnego poradnika.

## Główne funkcjonalności

- Wyszukanie działki po numerze ewidencyjnym (TERYT), po „obręb + numer” albo kliknięciem na mapie.
- Wybór uprawy i daty analizy: dziś albo dowolny dzień z ostatnich 10 lat.
- Ocena suszy według progów klimatycznego bilansu wodnego IUNG-PIB, porównanie z 10 latami, historyczna podatność działki (w ilu sezonach była susza, w których miesiącach ryzyko jest największe).
- Przyczyny niedoboru wody z liczbami i źródłami.
- Rekomendacje retencyjne dopasowane do działki (rów obok, obniżenie terenu pokazane na mapie, spadek), agrotechniczne i nawadniania.
- Jawne ograniczenia: poziom pewności, czynniki nieuwzględnione, brakujące dane.
- Raport do druku i zapisu jako PDF.

## Wykorzystanie danych

Wszystkie dane są bezpłatne i pobierane na bieżąco z publicznych źródeł, a wynik liczy aplikacja:

- **meteorologiczne:** Open-Meteo (reanaliza ERA5, prognoza), zapasowo NASA POWER; IMGW-PIB (stacje, ostrzeżenia),
- **satelitarne:** Copernicus Sentinel-2 (NDVI, NDMI dla obrysu działki),
- **glebowe:** mapa kategorii podatności gleb na suszę i progi suszy IUNG-PIB, ISRIC SoilGrids,
- **hydrologiczne:** rowy, cieki, zbiorniki i mokradła (OpenStreetMap), wodowskazy i ostrzeżenia o suszy hydrologicznej IMGW-PIB,
- **przestrzenne:** działki ewidencyjne (ULDK GUGiK), numeryczny model terenu (NMT GUGiK).

Metody: klimatyczny bilans wodny wg IUNG-PIB, ewapotranspiracja i współczynniki upraw wg FAO-56, naturalne metody retencji wody wg Komisji Europejskiej. Szczegóły i licencje: [README](../README.md).

## Korzyści dla rolnika

- Wie, czy jego działce grozi susza i dlaczego – bez znajomości GIS i bez szukania danych w pięciu serwisach.
- Wie, kiedy w roku ryzyko jest największe, więc może się przygotować (dobór uprawy, termin siewu, międzyplony).
- Dostaje konkretne, tanie działania na swojej działce, które zatrzymują wodę na dłużej, a nawadnia dopiero wtedy, gdy to naprawdę potrzebne.
- Ma raport do wydrukowania, np. do rozmowy z doradcą ODR albo ze spółką wodną.
