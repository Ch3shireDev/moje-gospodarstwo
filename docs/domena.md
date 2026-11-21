# Domena problemu – po ludzku

Elementarne wyjaśnienie, czym zajmuje się aplikacja: skąd się bierze susza na polu, jak się ją mierzy i co można z nią zrobić. Dla osób, które nie są hydrologami ani agronomami.

## 1. Woda na polu to rachunek: przychody i wydatki

Pole ma „konto” wody w glebie.

- **Przychód:** deszcz (i śnieg). Mierzy się go w **milimetrach** – 1 mm deszczu to 1 litr na metr kwadratowy, czyli **10 m³ (10 000 litrów) na hektar**.
- **Wydatki:** woda **paruje** z gleby i jest **wypijana przez rośliny**, które oddają ją liśćmi do powietrza. Razem nazywa się to **ewapotranspiracją**. Latem w Polsce to zwykle 3–5 mm dziennie.
- **Straty:** część deszczu **spływa** po powierzchni (szczególnie z pochyłego pola i przy ulewie) albo **odpływa rowami**.
- **Magazyn:** gleba trzyma pewien zapas wody. Piasek mało, glina dużo.

Jeśli przez dłuższy czas wydatki są większe niż przychody, zapas w glebie się kończy i rośliny zaczynają cierpieć.

## 2. Bilans wodny i parowanie wzorcowe

- **ET0 (parowanie wzorcowe)** – ile wody wyparowałoby z „wzorcowego trawnika” przy danej pogodzie. Zależy od słońca, temperatury, wiatru i wilgotności powietrza. Liczy się je ze wzoru FAO (Organizacja Narodów Zjednoczonych ds. Wyżywienia i Rolnictwa), tzw. FAO-56 Penman-Monteith.
- **Klimatyczny bilans wodny (KBW)** = deszcz − parowanie wzorcowe w danym okresie. Wynik ujemny oznacza, że więcej wody uciekło, niż przyszło.
  - Przykład: w 61 dniach spadło 100 mm, a parowanie wyniosło 265 mm → KBW = −165 mm.
- **Kc (współczynnik uprawowy)** – różne rośliny piją różnie. Kukurydza w lipcu zużywa ok. 1,2 raza tyle, co wzorcowy trawnik, a świeżo posiane zboże tylko 0,3–0,4 raza. Wartości są w tabelach FAO-56.

## 3. Susza – kilka rodzajów

| Rodzaj | Co to znaczy | Kto ocenia w Polsce |
|---|---|---|
| **Atmosferyczna** | długo nie pada | IMGW-PIB |
| **Rolnicza** | w glebie brakuje wody na tyle, że **spada plon** | IUNG-PIB (System Monitoringu Suszy Rolniczej) |
| **Hydrologiczna** | niskie stany rzek i wód podziemnych | IMGW-PIB, PIG-PIB |

Aplikacja zajmuje się przede wszystkim **suszą rolniczą**, a o hydrologicznej informuje, gdy IMGW wyda ostrzeżenie dla województwa.

## 4. Jak IUNG ocenia suszę rolniczą

Instytut Uprawy Nawożenia i Gleboznawstwa (IUNG-PIB) w Puławach prowadzi państwowy monitoring suszy. Upraszczając:

1. Liczy **klimatyczny bilans wodny** w okresach po **6 dekad** (ok. 61 dni), od 21 marca do 30 września, co 10 dni.
2. Porównuje go z **progiem** dla danej **uprawy** i **kategorii gleby**. Progi są w rozporządzeniu Ministra Rolnictwa z 11.04.2019 r.
3. Jeśli bilans spadnie poniżej progu – jest **susza rolnicza**. Próg dobrano tak, że oznacza przeciętnie ok. **20% spadku plonu**.

**Kategorie gleby** (od tego, ile wody gleba udostępnia roślinom w warstwie do 1,5 m):

| Kategoria | Gleba | Podatność na suszę |
|---|---|---|
| I | piaski luźne i słabogliniaste | bardzo podatna |
| II | piaski gliniaste | podatna |
| III | gliny lekkie, pyły | średnio podatna |
| IV | gliny średnie i ciężkie, iły | mało podatna |

Przykład z tabeli: dla kukurydzy na glebie kategorii II w okresie 1.06–31.07 próg wynosi **−184 mm**. Bilans −165 mm to jeszcze nie susza, ale już blisko.

Aplikacja robi to samo dla wybranej działki i dnia, tylko że:
- dane o pogodzie bierze z reanalizy (model z siatką ok. 9 km), a IUNG ze stacji IMGW,
- parowanie liczy wzorem FAO-56, a IUNG metodą Penmana – wyniki mogą się różnić o kilka–kilkanaście mm. Raport o tym mówi.

## 5. Dlaczego „na tle 10 lat”

Ten sam bilans −100 mm w maju to w jednym regionie norma, a w innym wyjątkowa susza. Dlatego aplikacja porównuje bieżący okres z **tym samym okresem w 10 poprzednich latach** i liczy, jak często na tej działce susza przekraczała próg IUNG. Z tego wychodzi **podatność** działki (niska / średnia / wysoka) i **miesiące największego ryzyka** – dokładnie to, czego KOWR oczekuje w zadaniu.

## 6. Zapas wody w strefie korzeni

Gleba to gąbka, a korzenie sięgają tylko na pewną głębokość (ziemniak ok. 0,4 m, zboża ok. 1–1,5 m). Aplikacja liczy dzień po dniu (metodą FAO-56), ile wody zostało w zasięgu korzeni:

- **woda łatwo dostępna** – roślina pije bez wysiłku,
- gdy się skończy, roślina **zamyka szparki w liściach i przestaje rosnąć**, choć woda w glebie jeszcze jest.

To jest podstawa rady o **podlewaniu**: podlewać ma sens dopiero wtedy, gdy woda łatwo dostępna się skończyła, i tylko tyle, ile ubyło (zwykle do 25 mm na raz, czyli 250 m³ na hektar).

## 7. Satelita: NDVI i NDMI

Satelity Sentinel-2 (program Copernicus) fotografują Polskę co kilka dni, nie tylko w kolorach widzialnych, ale i w podczerwieni.

- **NDVI** – „zieloność”: zdrowe liście mocno odbijają bliską podczerwień, a pochłaniają czerwień. NDVI ok. 0,8 = bujna roślinność, ok. 0,2 = goła ziemia.
- **NDMI** – „wilgotność roślin”: używa podczerwieni krótkofalowej, którą pochłania woda w liściach.
- Piksel ma 20 × 20 m, chmury zasłaniają widok, a w poprzednich latach na polu mogła rosnąć inna roślina. Dlatego satelita w aplikacji tylko **potwierdza** ocenę z bilansu, nie decyduje sam (tak zalecają „Podstawy naukowe” KOWR).

## 8. Retencja – zatrzymać wodę tam, gdzie spadła

**Retencja** to zatrzymywanie wody w krajobrazie i w glebie, zamiast pozwolić jej szybko odpłynąć. Zasada „retain water where it falls” jest podstawą europejskich wytycznych o naturalnych metodach retencji wody i „Podstaw naukowych” zadania KOWR – **retencja przed nawadnianiem**.

Przykłady, od najtańszych:

| Działanie | Jak pomaga |
|---|---|
| **Zastawka lub przegroda na rowie** (ziemia, faszyna, kłody) | rów przestaje drenować pole; woda z zimy i wiosny zostaje, podnosi się poziom wód gruntowych |
| **Nie osuszać obniżeń, oczek, mokradeł** | to naturalne zbiorniki wody dla okolicy |
| **Uprawa w poprzek stoku, miedze, pasy trawy, zadrzewienia** | woda z ulewy wsiąka, zamiast spłynąć z glebą |
| **Strefy buforowe przy ciekach** | spowalniają odpływ, chronią wodę przed nawozami |
| **Międzyplony, słoma na polu, mniej orki** | gleba lepiej wchłania wodę i mniej jej paruje |
| **Więcej próchnicy** (obornik, kompost) | próchnica działa jak gąbka – zwiększa zapas wody w glebie |

### Łąki i pastwiska (trwałe użytki zielone) to osobny przypadek

Na trwałych użytkach zielonych **nie orze się i nie sieje** (przekształcanie ich w grunty orne ogranicza też wspólna polityka rolna), a **pokos trzeba zebrać**. Rady „orz w poprzek stoku”, „wysiej międzyplon” czy „zostaw słomę” są tu błędne. Dla łąk aplikacja podaje inne działania:

- koszenie wyżej i nie w największy upał, zbiór pokosu,
- niewypasanie do gołej ziemi w suszy,
- wstrzymanie nawożenia azotem, gdy jest sucho,
- podsiew traw odporniejszych na suszę (np. kupkówka, kostrzewa trzcinowa) – bez orki,
- podpiętrzanie wody w rowach zamiast deszczowni (nawodnienie podsiąkowe),
- **przede wszystkim: zasady pakietu dopłat.** Jeśli łąka jest w programie rolno-środowiskowo-klimatycznym, ekologicznym albo w ekoschemacie, jego warunki (terminy koszenia, zakazy nawożenia, podsiewu, obsada) mają pierwszeństwo przed radami aplikacji.

Podobnie z terminem zbioru: międzyplon ma sens tylko wtedy, gdy zdąży wyrosnąć. Po zbiorze do sierpnia – zwykły międzyplon, we wrześniu – ozimy, po październikowym zbiorze kukurydzy czy buraków – już nie; wtedy lepiej zostawić rozdrobnione resztki jako ściółkę.

## 9. Melioracje i rowy – dlaczego to temat

W XX wieku w Polsce zbudowano gęstą sieć rowów melioracyjnych, żeby **osuszać** podmokłe grunty pod uprawę. Dziś problemem jest raczej **niedobór** wody, a rowy nadal ją odprowadzają – także wiosną, gdy powinna zostać w polu. Wiele zastawek jest zniszczonych albo zawsze otwartych.

- Rowy zwykle należą do właścicieli gruntów albo **spółek wodnych**, a rzeki administrują **Wody Polskie**.
- Trwałe piętrzenie wody w rowie wymaga **zgłoszenia wodnoprawnego**, a jeśli woda wpływa na grunty sąsiadów – ich zgody.
- Przyrodnicy i hydrolodzy wskazują, że **pogłębianie i „czyszczenie” rowów i rzek przyspiesza odpływ** i przesusza okolicę. Dlatego aplikacja zaleca **zatrzymywanie wody**, a nie pogłębianie rowów.

## 10. Kolejność, której wymaga KOWR

```
ocena sytuacji wodnej → przyczyny → retencja → agrotechnika → (ewentualnie) nawadnianie
```

Najpierw trzeba wiedzieć, **czy** i **dlaczego** brakuje wody. Potem zatrzymać tę, która spada (najtaniej). Potem uprawiać tak, żeby jej nie tracić. Podlewanie jest na końcu – jest najdroższe i zużywa wodę, której w Polsce i tak jest mało (ok. 1,6 tys. m³ na mieszkańca rocznie wobec ok. 4,5 tys. średnio w Europie).

## Słowniczek

| Pojęcie | Znaczenie |
|---|---|
| **mm opadu** | 1 mm = 1 l/m² = 10 m³/ha |
| **ET0** | parowanie wzorcowe (FAO-56) |
| **ETc** | zużycie wody przez uprawę = Kc × ET0 |
| **KBW** | klimatyczny bilans wodny = opad − parowanie |
| **Kc** | współczynnik uprawowy (ile pije roślina względem trawnika) |
| **WOD** | woda ogólnie dostępna dla roślin w glebie |
| **IUNG-PIB** | Instytut Uprawy Nawożenia i Gleboznawstwa, Puławy |
| **IMGW-PIB** | Instytut Meteorologii i Gospodarki Wodnej |
| **GUGiK** | Główny Urząd Geodezji i Kartografii (działki, mapy, NMT) |
| **ULDK** | usługa GUGiK do wyszukiwania działek |
| **NMT** | numeryczny model terenu – wysokości terenu |
| **TERYT / identyfikator działki** | np. `302502_2.0009.387` = gmina, obręb, numer działki |
| **Sentinel-2** | satelity programu Copernicus (UE/ESA) |
| **NDVI / NDMI** | wskaźniki zieloności / wilgotności roślin z satelity |
| **Retencja** | zatrzymywanie wody w krajobrazie i glebie |
| **Zastawka** | przegroda na rowie podnosząca poziom wody |
| **Spółka wodna** | stowarzyszenie właścicieli gruntów utrzymujące rowy |
| **Międzyplon** | roślina siana między plonami głównymi, osłania glebę |

Źródła pojęć i liczb: FAO-56 (Allen i in.), IUNG-PIB (susza.iung.pulawy.pl), „Podstawy naukowe” KOWR, [docs/zrodla.md](zrodla.md).
