# Co już zrobiliśmy i jaki jest cel projektu

**Moje Gospodarstwo – woda na Twoich polach**
HackNation 2026, zadanie KOWR „Zatrzymaj wodę, chroń plony”

## Cel

Dać każdemu rolnikowi w Polsce prostą i bezpłatną odpowiedź na trzy pytania o **konkretną działkę**:

1. **Jak jest z wodą na moim polu?** – czy jest susza i czy to nietypowe o tej porze roku?
2. **Dlaczego?** – za mało deszczu, upał, lekka gleba, spływ po stoku, rów odprowadzający wodę…
3. **Co mam zrobić?** – w kolejności wymaganej przez KOWR i zalecanej przez naukowców: najpierw **zatrzymać wodę** tam, gdzie spadła (najtaniej), potem **tak uprawiać**, żeby tracić mniej wilgoci, a dopiero na końcu zdecydować, **czy, kiedy i ile podlewać**.

Wszystko z bezpłatnych danych publicznych, w mniej niż 30 sekund, bez znajomości GIS, bez zakładania konta i bez instalacji – w przeglądarce na komputerze albo telefonie.

## Co już działa

### Prototyp (uruchomiony na Azure)

- **Strona startowa** „Sprawdź wodę na swoim polu w 3 prostych krokach”.
- **Wybór działki**: kliknięcie pola na mapie, wpisanie numeru działki ewidencyjnej (np. `302502_2.0009.387` lub „Sulęcin 387”) albo nazwy miejsca („Ciechanów”, „pomorskie”) – mapa przelatuje na to miejsce. Obrys i numer działki pojawiają się, zanim ruszy analiza. Rolnik wybiera **uprawę** (obowiązkowo) i ewentualnie **datę** – dziś albo dowolny dzień z ostatnich 10 lat (jury testuje także daty historyczne).
- **Raport** pod własnym adresem (można go odświeżyć albo komuś wysłać), prostym językiem:
  - **stan wody** jednym słowem i jednym zdaniem („Susza”, „Prawie susza”, „Sucho”, „Woda w normie”, „Mokro”),
  - **przyczyny** potwierdzone danymi,
  - **co zrobić** w grupach *zatrzymaj wodę → uprawa → podlewanie*, każda rada z rozwijanym „Dlaczego i jak?” i informacją, na jakich danych się opiera,
  - **które uprawy na tej glebie rzadziej miały suszę** w ostatnich 10 sezonach (np. „zamiast ziemniaka mniej ryzykowne byłyby zboża ozime”) – jako podpowiedź, nie nakaz,
  - **kiedy sprawdzić ponownie**: zakładamy 2–3 sprawdzenia w roku (przedwiośnie, przed siewem, przed zbiorem); na telefonie jednym przyciskiem trafiają do kalendarza jako przypomnienia (plik `.ics`),
  - zwinięte **szczegóły dla doradcy**: wskaźniki, porównanie z 10 latami, zdjęcia satelitarne, teren, ograniczenia, źródła.
- **Raport PDF** generowany w przeglądarce (A4: szkic działki, stan wody, najważniejsze rady, wykresy, zdjęcia satelitarne, przyczyny, rekomendacje, ograniczenia, źródła, metodyka).
- **Aplikacja na telefon (PWA)**: zwijany panel na dole ekranu z dużym przyciskiem „Analizuj działkę N”, można ją dodać do ekranu głównego.

### Dane – wszystkie pięć kategorii wymaganych w zadaniu, wszystkie bezpłatne

| Kategoria | Źródło |
|---|---|
| Meteorologiczne | Open-Meteo (reanaliza ERA5, prognoza), zapasowo NASA POWER z ET0 liczonym przez nas wg FAO-56; stacje i ostrzeżenia IMGW-PIB |
| Glebowe | **mapa kategorii podatności gleb na suszę IUNG-PIB** (ta sama, której używa państwowy monitoring suszy), ISRIC SoilGrids |
| Satelitarne | **Copernicus Sentinel-2**: NDVI i NDMI dla obrysu działki, zdjęcie w kolorach naturalnych i mapa zieloności, porównanie z poprzednimi latami |
| Hydrologiczne | wody z OpenStreetMap (rowy, cieki, stawy, mokradła w promieniu 600 m) z kafli OpenFreeMap; wodowskazy i ostrzeżenia o suszy hydrologicznej IMGW-PIB |
| Przestrzenne | GUGiK ULDK (obrys działki), numeryczny model terenu GUGiK (spadek, kierunek spływu, obniżenia), wyszukiwarka miejsc Nominatim (OpenStreetMap) |

### Metoda (oparta na nauce, zgodna z systemem państwowym)

- **Klimatyczny bilans wodny** (deszcz minus parowanie wzorcowe) z 61 dni porównany z **oficjalnymi progami suszy rolniczej IUNG-PIB** dla uprawy i kategorii gleby (rozporządzenie Ministra Rolnictwa z 2019 r.) – ta sama logika co w Systemie Monitoringu Suszy Rolniczej.
- **Tło 10 lat**: ten sam okres w poprzednich latach → percentyl, **podatność działki na suszę** i **miesiące największego ryzyka**.
- **Bilans wody w strefie korzeni** (FAO-56, współczynniki uprawowe Kc) → czy i ile podlać.
- **Satelita tylko potwierdza** ocenę, zgodnie z „Podstawami naukowymi” KOWR.
- **Rady dopasowane do działki**: rów 20 m od pola → „zatrzymaj wodę w rowie”, obniżenie na polu → „nie osuszaj go” (zaznaczone na mapie), stok → „orz w poprzek stoku”. Osobne zasady dla **trwałych użytków zielonych**: bez orki i siewu; wysokość koszenia, wypas, podsiew, a przede wszystkim *zasady pakietu dopłat mają pierwszeństwo*.
- **Uczciwa niepewność**: każdy raport ma poziom pewności, listę ograniczeń i status każdego źródła danych. Brak danych jest podawany wprost.

### Strona techniczna

- Front: React + MapLibre. Serwer: Node.js **bez żadnych zależności npm** (własny czytnik zdjęć satelitarnych Cloud Optimized GeoTIFF, własny koder PNG, własny dekoder kafli wektorowych).
- Odporność: każde źródło ma limit czasu i zapas; raport powstaje nawet przy awarii części źródeł.
- Pamięć podręczna na dysku dla danych archiwalnych – powtarzane analizy nie zużywają limitów API.
- **33 testy automatyczne** na prawdziwych odpowiedziach API; ET0 sprawdzone na przykładzie z podręcznika FAO-56.
- Uruchomienie jedną komendą: `docker compose up --build`; działa na najtańszej maszynie wirtualnej Azure.
- Dokumentacja: README (wg pkt 4.2 zadania), lista zgodności z regulaminem, opis działania, wyjaśnienie domeny prostym językiem, prezentacja (10 slajdów).

## Dalsze kroki

1. Porównanie wyników z mapami suszy IUNG-PIB dla wielu gmin i dat.
2. Rowy z państwowej bazy topograficznej (BDOT10k) zamiast OpenStreetMap.
3. Powiadomienia o suszy i ulewach.
4. Dopasowanie rad do dostępnych dotacji (mała retencja, zastawki na rowach, ekoschematy).
5. Konsultacja progów i rad z agronomami (ODR, IUNG).
