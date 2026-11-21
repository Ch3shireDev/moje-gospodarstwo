---
marp: true
lang: pl
paginate: true
title: Moje Gospodarstwo – woda na Twoich polach
description: HackNation 2026, zadanie KOWR „Zatrzymaj wodę, chroń plony”
style: |
  section {
    font-family: 'Segoe UI', Roboto, Arial, sans-serif;
    background: #f4f1e8;
    color: #1b2a21;
    font-size: 26px;
    padding: 56px 64px;
  }
  h1 { color: #1d3a2a; font-size: 46px; margin-bottom: 0.3em; }
  h2 { color: #1d3a2a; font-size: 36px; }
  strong { color: #2a6f97; }
  table { font-size: 21px; }
  th { background: #1d3a2a; color: #fff; }
  blockquote { border-left: 6px solid #c98a1b; background: #fff7e6; padding: 10px 18px; color: #5a4310; font-size: 23px; }
  section.lead { background: #1d3a2a; color: #f4f1e8; justify-content: center; }
  section.lead h1, section.lead strong { color: #f4f1e8; }
  section.lead p { color: #cfe3d6; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .small { font-size: 19px; color: #5f6b62; }
  footer { color: #5f6b62; }
footer: 'Moje Gospodarstwo · HackNation 2026 · zadanie KOWR'
---

<!-- _class: lead -->
<!-- _paginate: false -->
<!-- _footer: '' -->

# Moje Gospodarstwo
## woda na Twoich polach

Doradca wodny dla działki rolnej: **jak jest, dlaczego i co zrobić** – z publicznych danych, w kilkanaście sekund.

HackNation 2026 · zadanie KOWR „Zatrzymaj wodę, chroń plony”

<!--
Notatki: 2–3 minuty na całość. Ten slajd 10 s.
-->

---

## Problem

- Susza rolnicza wraca coraz częściej: długo nie pada, a potem ulewa, po której woda szybko odpływa.
- Polska ma jedne z najmniejszych zasobów wody w Europie: **ok. 1,6 tys. m³ na osobę rocznie** wobec ok. 4,5 tys. średnio w Europie (IOŚ-PIB).
- Rowy melioracyjne budowane do **osuszania** nadal odprowadzają wodę, także wiosną, gdy powinna zostać w polu.
- Danych jest dużo (IMGW, IUNG, GUGiK, Copernicus), ale są **rozproszone i specjalistyczne**. Rolnik nie dostaje prostej odpowiedzi dla **swojej działki**.

<!--
Notatki: podkreślić "dla swojej działki" – to sedno zadania KOWR.
-->

---

## Rozwiązanie

<div class="cols">
<div>

1. Wpisz **numer działki** albo kliknij ją na mapie
2. Wybierz **uprawę** (i datę – dziś albo do 10 lat wstecz)
3. **Analizuj** → raport w 10–30 s

Działa w przeglądarce na komputerze i telefonie (PWA), bez instalacji i bez konta.

</div>
<div>

**Raport w kolejności z zadania KOWR:**

1. Woda na Twoim polu – jedno słowo, jedno zdanie
2. Dlaczego? – przyczyny z liczbami
3. Co zrobić? – **zatrzymaj wodę → uprawa → podlewanie**
4. Szczegóły, ograniczenia, źródła
5. PDF do wydruku

</div>
</div>

<!--
Notatki: tu przejść do demo na żywo (działka wskazana przez jury).
-->

---

## Dane – wszystkie wymagane kategorie, publiczne i bezpłatne

| Kategoria | Źródło | Co z tego mamy |
|---|---|---|
| Meteorologiczne | Open-Meteo (ERA5), zapasowo NASA POWER; IMGW-PIB | deszcz i parowanie z **11 lat**, prognoza, ostrzeżenia |
| Glebowe | **mapa kategorii gleb IUNG-PIB**, SoilGrids | podatność gleby na suszę, próchnica |
| Satelitarne | **Sentinel-2** (Copernicus) | zdjęcie działki, NDVI, NDMI na tle poprzednich lat |
| Hydrologiczne | OpenStreetMap, IMGW-PIB | rowy, cieki, mokradła w 600 m, susza hydrologiczna |
| Przestrzenne | **ULDK i NMT GUGiK** | obrys działki, spadek, obniżenia terenu |

<p class="small">Wszystko pobierane na żywo przy analizie. Wcześniej przygotowane są tylko progi suszy IUNG (rozporządzenie MRiRW z 2019 r.) i współczynniki upraw FAO-56.</p>

---

## Metoda – zgodna z nauką i z tym, czego używa państwo

- **Klimatyczny bilans wodny** (deszcz − parowanie) z 61 dni, porównany z **progami suszy rolniczej IUNG-PIB** dla uprawy i kategorii gleby. Ta sama logika co w państwowym Systemie Monitoringu Suszy Rolniczej.
- **Na tle 10 lat**: ten sam okres w poprzednich latach → percentyl, **podatność działki** i **miesiące największego ryzyka**.
- **Strefa korzeni** (FAO-56): dzienny bilans wody dla uprawy → czy i ile podlać.
- **Satelita tylko potwierdza** – zgodnie z „Podstawami naukowymi” KOWR.
- **Rady z danych o działce**: rów 20 m od pola, obniżenie terenu, spadek, rodzaj gleby.

> Żadnych gotowych tekstów: bez oceny działki nie ma rekomendacji.

---

## Przykład: działka 302502_2.0009.387 (gm. Krzykosy), kukurydza, 31.07.2018

<div class="cols">
<div>

**Prawie susza**
*Jest bardzo sucho – niewiele brakuje do suszy.*

- bilans 61 dni: **−165,7 mm**, próg suszy IUNG: **−184 mm**
- deszcz **o 34% mniej** niż zwykle
- gleba kategorii II (piasek gliniasty)
- susza wg IUNG w **2 z 10** sezonów

</div>
<div>

**Co zrobić?**
1. Zatrzymaj spływ w najniższej części pola
2. Po zbiorze wysiej międzyplon
3. Nie orz głęboko, gdy jest sucho
4. Podlewanie: ok. 25 mm (250 m³/ha)

</div>
</div>

<p class="small">Wynik z prototypu (dane pogodowe z zapasowego źródła NASA POWER – Open-Meteo miało wyczerpany limit z sieci hackathonu). Rok 2018 to znana susza w Wielkopolsce.</p>

---

## Retencja przed nawadnianiem

<div class="cols">
<div>

**Najtańsze, co rolnik zrobi sam:**
- przegroda z ziemi, faszyny lub kłód na rowie
- nie osuszać obniżeń i oczek
- uprawa w poprzek stoku, miedze, pasy trawy
- międzyplony, słoma na polu, mniej orki
- obornik i kompost → więcej próchnicy

</div>
<div>

**Uczciwie o formalnościach:**
- trwałe piętrzenie = zgłoszenie wodnoprawne
- zgoda sąsiadów, jeśli woda do nich wpłynie
- obszary chronione → RDOŚ

> Zalecamy **zatrzymywanie** wody w rowach, a nie ich pogłębianie – za hydrologami i przyrodnikami.

</div>
</div>

---

## Wiarygodność i uczciwość wyniku

- Każdy raport ma **poziom pewności** i listę **ograniczeń**: pogoda z modelu, a nie z pola; brak bezchmurnej sceny; rowy z niekompletnej mapy; zapasowe źródło danych.
- **Każda rada ma „Skąd to wiemy”**: dane i źródło, z których wynika.
- Brak danych pokazujemy wprost, bez pozornej precyzji. Raport powstaje nawet przy awarii części źródeł.
- **27 testów** na prawdziwych odpowiedziach API (ULDK, IUNG, IMGW, NMT, SoilGrids, NASA POWER, Sentinel-2); ET0 sprawdzone na przykładzie z podręcznika FAO-56.
- AI tylko opcjonalnie przepisuje gotowe liczby na prosty język – **nic nie liczy**.

---

## Technika, skala, koszty

<div class="cols">
<div>

- React + MapLibre (PWA), Node.js **bez zależności po stronie serwera**
- własny czytnik zdjęć satelitarnych (GeoTIFF) i PNG – bez GIS-u
- cache danych archiwalnych → ta sama okolica nie zużywa limitów API
- jedna komenda: `docker compose up --build`
- działa na najtańszej maszynie w chmurze (Azure B1s)

</div>
<div>

**Koszty:** dane bezpłatne. Przy skali krajowej Open-Meteo jako własna instancja (open source) – bez opłat licencyjnych.

**Dalej:**
- porównanie z mapami IUNG dla wielu gmin
- rowy z BDOT10k zamiast OSM
- powiadomienia o suszy i ulewie
- dopasowanie do dotacji (zastawki, mała retencja)

</div>
</div>

---

<!-- _class: lead -->
<!-- _footer: '' -->

# Dziękujemy

**Moje Gospodarstwo – woda na Twoich polach**

Zatrzymaj wodę tam, gdzie spadła. Podlewaj tylko wtedy, gdy trzeba.

Demo: wpisz numer działki → wybierz uprawę → **Analizuj**
