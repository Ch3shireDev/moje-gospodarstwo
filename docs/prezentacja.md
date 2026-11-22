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
    font-size: 27px;
    padding: 56px 64px;
  }
  h1 { color: #1d3a2a; font-size: 48px; margin-bottom: 0.3em; }
  h2 { color: #1d3a2a; font-size: 38px; }
  strong { color: #2a6f97; }
  table { font-size: 22px; }
  th { background: #1d3a2a; color: #fff; }
  blockquote { border-left: 6px solid #c98a1b; background: #fff7e6; padding: 10px 18px; color: #5a4310; font-size: 24px; }
  section.lead { background: #1d3a2a; color: #f4f1e8; justify-content: center; }
  section.lead h1, section.lead h2, section.lead strong { color: #f4f1e8; }
  section.lead p { color: #cfe3d6; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .who { display: inline-block; background: #2a6f97; color: #fff; border-radius: 999px; padding: 4px 16px; font-size: 20px; letter-spacing: 0.03em; }
  .q { font-size: 30px; font-style: italic; color: #2f5d43; }
  .small { font-size: 19px; color: #5f6b62; }
  footer { color: #5f6b62; }
footer: 'Moje Gospodarstwo · HackNation 2026 · zadanie KOWR'
---

<!-- _class: lead -->
<!-- _paginate: false -->
<!-- _footer: '' -->

# Moje Gospodarstwo - woda na Twoich polach

Rolnicy i przyrodnicy kłócą się o mokradła i rowy.
A obie strony chcą tego samego: **żeby woda została tam, gdzie spadła.**

Dajemy obu stronom te same fakty o jednym polu: za darmo, bez konta, w telefonie.

<p class="small">Spór o strategię ochrony mokradeł, zima 2026 – PAP / Nauka w Polsce, 06.03.2026</p>

HackNation 2026 · zadanie KOWR „Zatrzymaj wodę, chroń plony”

<!--
Dzień dobry. Zacznę od kłótni.

Tej zimy rząd przedstawił strategię ochrony mokradeł. Część rolników zaprotestowała: boją się wywłaszczeń, zalanych łąk i strat w gospodarstwach. Przyrodnicy z Centrum Ochrony Mokradeł odpowiadają, że wodę trzeba zatrzymywać tam, gdzie spadła, i że to jest w bezpośrednim interesie rolnika.

Kiedy się w ten spór wsłuchać, obie strony mówią o tym samym. Rolnik nie chce, żeby woda uciekła mu rowem do morza, bo w lipcu zabraknie jej na polu. Przyrodnik nie chce, żeby uciekła, bo bez niej znikają mokradła. Kłócą się o sposób, a nie o cel.

Brakuje im wspólnych faktów o konkretnym polu: ile tu spadło, ile wyparowało, gdzie jest rów, gdzie zastoisko, jak było przez ostatnie dziesięć lat. To właśnie robi Moje Gospodarstwo, doradca wodny dla jednej działki.

Problem znamy wszyscy: susze wracają, a kiedy już spadnie deszcz, to ulewa, po której woda szybko ucieka rowami. Danych w Polsce jest dużo: IMGW, IUNG, GUGiK, satelity Copernicus. Tyle że każde w innym miejscu, w innym formacie i dla kogoś, kto zna GIS.

Rolnik ma trzy proste pytania: jest sucho czy nie, dlaczego i co mam zrobić. Chcieliśmy narzędzia, które otworzy na telefonie, stojąc na miedzy, i w pół minuty dostanie odpowiedź prostym językiem.

Opowiemy o nim przez kilka historii: od rolnika, który planuje wiosnę, po przyrodnika, który robi ekspertyzę. I to będzie ten sam raport.
-->

---

## Trzy kroki

<div class="cols">
<div>

1. **Znajdź pole**: wpisz region, miasto lub numer działki („Ciechanów”, „pomorskie”, „Sulęcin 387”), a potem kliknij pole na mapie
2. **Powiedz, co rośnie**: zboże, kukurydza, ziemniak, łąka…
3. **Analizuj**: wynik po kilkunastu sekundach

</div>
<div>

**Dostajesz, w tej kolejności:**

- stan wody jednym słowem: *Susza · Sucho · Woda w normie · Mokro*
- **dlaczego**: deszcz, upał, gleba, stok, rów
- **co zrobić**: najpierw zatrzymaj wodę, potem uprawa, na końcu podlewanie
- raport **PDF** do wydruku

</div>
</div>

<!--
Obsługa to trzy kroki. Wpisujemy miejscowość albo numer działki, klikamy pole na mapie i widzimy jego granice. Mówimy, co tam rośnie, i klikamy Analizuj.

Raport zawsze ma tę samą kolejność, zgodną z zadaniem KOWR: najpierw jak jest z wodą, potem dlaczego, a na końcu co zrobić. Rady też idą po kolei: najpierw zatrzymać wodę, bo to najtańsze, potem mądrzej uprawiać, a podlewanie dopiero na końcu, jeśli w ogóle trzeba.

Każdą radę można rozwinąć i zobaczyć, z jakich danych wynika.
-->

---

<span class="who">Rolnik · przedwiośnie</span>

## „Jak zatrzymać wodę po zimie?”

- Lekka, piaszczysta gleba. Co roku to samo: wiosną mokro, w czerwcu sucho.
- Aplikacja widzi **rów 20 m od pola** i **obniżenie terenu** na działce. Zaznacza je na mapie.
- Rady:
  - **przytrzymaj wodę w rowie**: prosta przegroda z ziemi, faszyny albo kłód,
  - **nie osuszaj zastoiska**, to Twój zbiornik na maj,
  - wiele lat z rzędu dawaj obornik i międzyplony, a gleba zatrzyma więcej wody.
- Przy każdej radzie uczciwie: kiedy trzeba zgłoszenia wodnoprawnego albo zgody sąsiada.

<p class="small">Zastawka na rowie to dokładnie to, za co projekt strategii mokradeł proponuje rolnikom dobrowolne dopłaty.</p>

<!--
Pierwsza historia: przedwiośnie. Rolnik z lekką glebą wie, że wiosną woda jest, a w czerwcu jej brakuje.

Aplikacja patrzy na mapę wód i model terenu. Widzi rów dwadzieścia metrów od pola i zagłębienie na działce, i pokazuje je na mapie.

Rady są konkretne: przytrzymaj wodę w rowie, nie osuszaj tego zagłębienia, bo to darmowy zbiornik na maj. Nie udajemy przy tym, że wszystko wolno. Piszemy wprost, kiedy trzeba zgłoszenia wodnoprawnego albo zgody sąsiada.

Za hydrologami i przyrodnikami zalecamy zatrzymywanie wody, a nie pogłębianie rowów.

I tu wraca nasza kłótnia z początku. Zastawka na rowie to dokładnie to, za co projekt strategii mokradeł proponuje rolnikom dobrowolne dopłaty. Rolnik ma wodę na maj, przyrodnik ma mokry rów. Ta sama decyzja, dwa powody.
-->

---

<span class="who">Rolnik · przed siewem</span>

## „Co tu w ogóle siać?”

Ta sama działka, gleba kat. II. W ilu z 10 ostatnich sezonów (2015–2024) uprawa miałaby suszę:

| Uprawa | Sezony z suszą |
|---|---|
| zboża ozime, warzywa gruntowe | **2 z 10** |
| ziemniak, burak, zboża jare | 3 z 10 |
| kukurydza, strączkowe | 4 z 10 |
| rzepak | 5 z 10 |

<p class="small">Wynik z prototypu dla działki 302502_2.0009.387 (gm. Krzykosy). Progi suszy IUNG-PIB dla każdej uprawy i tej gleby; obok potrzeby wodne wg FAO.</p>

> To podpowiedź, nie nakaz. O wyborze decydują też płodozmian, rynek i dopłaty.

<!--
Druga historia: rolnik zastanawia się, co posiać.

Aplikacja bierze dziesięć ostatnich sezonów pogody na tej działce i przykłada do nich oficjalne progi suszy IUNG dla czternastu upraw na tej glebie. Wychodzi prosta tabelka: zboża ozime miałyby tu suszę dwa razy na dziesięć lat, kukurydza cztery, rzepak pięć.

To prawdziwy wynik z naszego prototypu dla działki w gminie Krzykosy.

Nie mówimy rolnikowi, co ma siać. Mówimy, co na tej ziemi rzadziej cierpi na suszę. Rada „rozważ inną uprawę” pojawia się dopiero przy wyraźnej różnicy, co najmniej dwóch sezonów. Resztę zostawiamy rolnikowi: płodozmian, rynek, kontrakty i dopłaty zna lepiej od nas.
-->

---

<span class="who">Rolnik · lipiec, susza</span>

## „Podlewać czy czekać na deszcz?”

- Aplikacja liczy, **ile wody zostało w strefie korzeni** danej uprawy.
- Patrzy w **prognozę na 7 dni**: jeśli idzie deszcz, mówi „poczekaj”.
- Jeśli trzeba podlać, podaje dawkę, np. **ok. 25 mm, czyli 250 m³ na hektar**.
- Do tego ostrzeżenia IMGW: upał, burze, susza hydrologiczna.

> Podlewanie jest na końcu listy, nie na początku. Najpierw woda, która już spadła.

<!--
Trzecia historia: lipiec, sucho, kukurydza zwija liście. Rolnik ma beczkowóz albo deszczownię i pyta: podlewać czy czekać?

Aplikacja prowadzi dzienny bilans wody w strefie korzeni, metodą FAO. Patrzy w prognozę: jeśli za dwa dni ma padać, mówi „poczekaj”. Jeśli nie, podaje konkretną dawkę w milimetrach i w metrach sześciennych na hektar.

Podkreślam: podlewanie jest u nas zawsze ostatnie. Najpierw zatrzymujemy to, co spadło z nieba.
-->

---

<span class="who">Hodowca · łąka i pastwisko</span>

## „Mam łąkę, nie pole”

- Łąki **się nie orze i nie obsiewa od nowa**. Aplikacja to wie.
- Inne rady: **wyżej kosić**, ograniczyć wypas w suszy, podsiew, nie osuszać.
- Na górze listy: **najpierw zasady Twojego pakietu dopłat**, bo mają pierwszeństwo przed naszymi radami.
- Łąki nie porównujemy z uprawami polowymi. Zaoranie trwałego użytku zielonego to strata wody i próchnicy.

<!--
Czwarta historia: hodowca z łąką. To przypadek, na którym łatwo się wyłożyć. Wiele narzędzi doradzi orkę i międzyplon, czyli dokładnie to, czego na łące robić nie wolno.

My mamy osobne zasady dla trwałych użytków zielonych: wysokość koszenia, wypas, podsiew. Na samej górze jest rada, żeby najpierw sprawdzić zasady swojego pakietu dopłat, bo jeśli ktoś jest w programie rolno-środowiskowym, to one wygrywają z każdą radą z aplikacji.

Tę część poprawiliśmy po uwagach eksperta w trakcie hackathonu.
-->

---

<span class="who">Przyrodnik · ekspertyza</span>

## „Potrzebuję twardych danych”

- **10 lat historii** dla działki: bilans wodny rok po roku, miesiące największego ryzyka.
- **Zdjęcie satelitarne** Sentinel-2: zieloność i wilgotność roślin na tle poprzednich lat.
- **Teren i woda**: spadek, kierunek spływu, obniżenia, rowy, mokradła i oczka w promieniu 600 m.
- W raporcie: **poziom pewności, ograniczenia i status każdego źródła**, z datą.
- **Ten sam raport, który dostaje rolnik**: wspólne liczby zamiast przekrzykiwania się.

> Wynik do sprawdzenia, a nie czarna skrzynka: każda liczba ma źródło.

<!--
Piąta historia, z drugiego końca skali: przyrodnik albo hydrolog, który robi ekspertyzę, na przykład czy warto przywrócić mokradło albo zablokować rów.

Dla niego są zwinięte szczegóły: dziesięć lat bilansu rok po roku, zdjęcia satelitarne na tle poprzednich lat, ukształtowanie terenu, wody w okolicy.

I co najważniejsze: to jest dokładnie ten sam raport, który widzi rolnik. Kiedy przyrodnik i rolnik siadają do rozmowy o rowie, patrzą na te same liczby. To nie rozwiąże każdego sporu, ale zamienia spór o wiarę w rozmowę o faktach.

Ważne jest też to, czego nie ukrywamy. Każdy raport ma poziom pewności, listę ograniczeń i status każdego źródła. Jeśli satelita nie miał bezchmurnego zdjęcia albo mapa rowów jest niepełna, raport mówi to wprost.
-->

---

<span class="who">Doradca ODR · wstecz w czasie</span>

## „A jak było w 2018?”

Działka 302502_2.0009.387, kukurydza, **31.07.2018**:

- **Prawie susza**: bilans 61 dni **−165,7 mm**, próg suszy IUNG **−184 mm**
- deszczu **o 34% mniej** niż zwykle
- susza wg IUNG w **2 z 10** sezonów

Analiza na **dowolny dzień z ostatnich 10 lat**. Raport PDF można dać rolnikowi albo dołączyć do wniosku.

<p class="small">Wynik z prototypu; pogoda z zapasowego źródła NASA POWER. 2018 to znana susza w Wielkopolsce.</p>

<!--
Szósta historia: doradca rolniczy, który chce zobaczyć, jak było w konkretnym roku, na przykład w suchym 2018. Albo jury, które sprawdza nasze wyniki na historycznych datach.

Wybieramy datę sprzed lat i dostajemy pełną analizę z tamtego dnia: prawie susza, sto sześćdziesiąt sześć milimetrów na minusie, przy progu IUNG sto osiemdziesiąt cztery.

Raport PDF można wydrukować i dać rolnikowi albo dołączyć do dokumentacji.
-->

---

## Ile razy to otwierać?

<div class="cols">
<div>

**2–3 razy w roku**, w chwilach decyzji:

- **przedwiośnie**: zatrzymać wodę z roztopów
- **przed siewem**: jak uprawiać, co siać
- **przed zbiorem**: międzyplon, słoma

W suszy, przy podlewaniu: co tydzień albo dwa.

</div>
<div>

Raport sam podpowiada, **kiedy sprawdzić ponownie**.

Na telefonie jeden przycisk dodaje te terminy **do kalendarza**: bez konta, bez maila, bez zbierania danych.

</div>
</div>

<!--
To nie jest aplikacja do codziennego klikania. Woda na polu zmienia się w tygodniach, nie w godzinach.

Zakładamy, że rolnik zajrzy dwa, trzy razy w roku, kiedy podejmuje decyzje: na przedwiośniu, przed siewem i przed zbiorem. Raport sam podaje najbliższe terminy, a na telefonie jednym przyciskiem dodaje je do kalendarza.

Nie zbieramy żadnych danych osobowych: nie ma konta, maila ani numeru telefonu. Przypomnienie trafia prosto do kalendarza rolnika.
-->

---

## Czy można temu ufać?

- **Metoda państwowa**: te same progi suszy IUNG-PIB co w Systemie Monitoringu Suszy Rolniczej.
- **Wszystkie pięć rodzajów danych** z zadania, publiczne i bezpłatne: pogoda, gleba, satelita, woda, teren.
- **Nauka przed instytucjami**: przy sporze zaleceń wygrywają hydrolodzy i przyrodnicy.
- Działa, nawet gdy któreś źródło padnie, i wtedy **mówi o tym wprost**.
- **33 testy** na prawdziwych odpowiedziach serwisów. AI najwyżej przepisuje gotowy wynik na prostszy język i niczego nie liczy.

<p class="q">Dziękujemy! Spróbuj: wpisz swoją miejscowość → kliknij pole → Analizuj</p>

<!--
Na koniec pytanie, które zadałby każdy rolnik: czy można temu ufać?

Liczymy suszę tak samo jak państwowy monitoring IUNG, z oficjalnymi progami dla upraw i gleb. Korzystamy z publicznych danych ze wszystkich pięciu kategorii wymaganych w zadaniu.

Przy radach trzymamy się nauki: kiedy zalecenia instytucji i naukowców się rozjeżdżają, idziemy za hydrologami i przyrodnikami.

Jeśli jakieś źródło nie odpowie, raport i tak powstanie, ale napisze, czego brakuje. Sztuczna inteligencja jest u nas tylko opcjonalnym redaktorem. Nic nie liczy.

Zaczęliśmy od kłótni rolników z przyrodnikami. Chcemy, żeby obie strony wychodziły od tego samego: woda ma zostać tam, gdzie spadła, a pole ma dać plon.

Dziękujemy. Najlepiej po prostu spróbować: wpisać swoją miejscowość, kliknąć pole i nacisnąć Analizuj. Chętnie pokażemy to na żywo na działce, którą Państwo wskażą.
-->
