// Baza wiedzy "dlaczego to działa". Treści są parafrazą źródeł przyrodniczych i naukowych
// (Centrum Ochrony Mokradeł / bagna.pl, OTOP, Koalicja Ratujmy Rzeki, WWF, naukowcy SGGW i PAN, EEA).
// Hierarchia: nauka > organizacje przyrodnicze > instytucje państwowe (docs/zrodla.md).
// Wody Polskie: dane i formalności tak, ale przy konflikcie zaleceń wygrywają przyrodnicy. Bez Lasów Państwowych.
// Liczby oznaczone "wyliczenie" policzyliśmy sami z danych źródłowych – reszta jest ze źródeł.

export const KNOWLEDGE = [
  {
    id: 'zastawki',
    title: 'Zastawka na rowie: najtańszy magazyn wody',
    lead:
      'Większość rowów melioracyjnych w Polsce wykopano, żeby jak najszybciej pozbyć się wody. Dziś, przy coraz częstszych suszach, ta sama sieć może działać odwrotnie: wystarczy przegroda, która zatrzyma odpływ.',
    points: [
      'Zastawka podpiętrza wodę w rowie, a ta przesiąka w boki i podnosi poziom wód gruntowych w sąsiednich polach i łąkach.',
      'W badaniu terenowym z dębowymi zastawkami na rowach poziom wód gruntowych podniósł się o 15–85 cm. Najwyraźniej było to widać wiosną, po zatrzymaniu wód roztopowych.',
      'Najlepszy moment to jesień i zima: woda z roztopów zostaje w polu zamiast spłynąć do rzeki, a wiosną rośliny startują z pełnym zapasem.',
      'Nie pogłębiaj i nie „udrażniaj” rowów, jeśli to tylko przyspieszy odpływ. Tamy bobrów i zwalone kłody w rowach to darmowe zastawki – zostaw je, jeśli nie zagrażają drogom ani budynkom.',
      'Zastawki z regulacją (np. szandorowe, z deskami) pozwalają spuścić nadmiar wody, gdy trzeba wjechać w pole albo grozi podtopienie.',
    ],
    numbers: [
      { value: '15–85 cm', label: 'wzrost poziomu wód gruntowych przy zastawkach (badanie terenowe)' },
      { value: '~1,6 tys. m³', label: 'zasoby wód powierzchniowych na mieszkańca Polski rocznie; średnia europejska to ok. 4,6 tys. m³' },
    ],
    sources: [
      { title: 'Badanie efektów piętrzenia wody zastawkami (PECO, 2013)', url: 'https://yadda.icm.edu.pl/baztech/element/bwmeta1.element.baztech-f7d43bd6-b5e5-49d9-af06-5d4c74c57277/c/PECO_2013_2_p1-24.pdf' },
      { title: 'OTOP: Rolniku, rolniczko – zatrzymaj wodę w rowie', url: 'https://otop.org.pl/wp-content/uploads/2026/08/otop_broszura_rolniku_rolniczko_net_pojed_Str.pdf' },
      { title: 'Nauka w Polsce: zasoby wodne Polski na tle Europy (IOŚ-PIB)', url: 'https://scienceinpoland.pap.pl/node/83283' },
    ],
  },
  {
    id: 'torfowiska',
    title: 'Zasypane rowy i mokre torfowiska',
    lead:
      'Torfowisko to w 90–95% woda. Rów, który je osusza, wypuszcza nie tylko wodę, ale też węgiel – rozkładający się torf to jedno z największych rolniczych źródeł emisji w Polsce.',
    points: [
      'Osuszony torf zamienia się w mursz, który trzyma już tylko 20–50% wody. Ten proces jest nieodwracalny: teren osiada, a gleba coraz gorzej trzyma wilgoć.',
      'Żeby ponownie nawodnić torfowisko, rowy się zasypuje albo przegradza zastawkami. Centrum Ochrony Mokradeł zaleca też, żeby nie pogłębiać rowów pod pretekstem „konserwacji”.',
      'Osuszony hektar torfowiska traci ok. 4 tys. m³ retencji. Licząc po kosztach budowy zbiorników retencyjnych, to do ok. 12 tys. zł na hektar rocznie.',
      'Na mokrych torfowiskach da się dalej gospodarować: koszenie łąk, uprawy bagienne (paludikultura, np. trzcina, pałka). Centrum Ochrony Mokradeł zwraca uwagę, że mogą być opłacalne.',
      'Ponowne nawodnienie wszystkich osuszonych torfowisk przez zatrzymanie odpływu rowami zmniejszyłoby emisje Polski o ok. 21,7 mln ton ekw. CO₂ rocznie.',
    ],
    numbers: [
      { value: '1,3 mln ha', label: 'osuszonych torfowisk w Polsce' },
      { value: '~35 mln t', label: 'ekw. CO₂ rocznie z tych torfowisk – ponad 100% raportowanych emisji rolnictwa' },
      { value: '~4000 m³/ha', label: 'utraconej retencji na osuszonym hektarze torfowiska' },
      { value: '= 16 dawek', label: 'nawadniania po 25 mm – tyle wody trzyma jeden mokry hektar (wyliczenie)' },
    ],
    sources: [
      { title: 'W. Kotowski (Centrum Ochrony Mokradeł, UW): Ponowne nawodnienie torfowisk rolniczych', url: 'https://bagna.pl/images/aktualnosci/warsaw-climate-talks-2025/Kotowski_WarsawClimateTalks.pdf' },
      { title: 'bagna.pl: Oszacowanie emisji gazów cieplarnianych z torfowisk w Polsce', url: 'https://bagna.pl/images/klimat/Oszacowanie_emisji_gazow_cieplarnianych_z_uzytkowania_torfowisk_w_Polsce.pdf' },
      { title: 'Koalicja Ratujmy Rzeki / bagna.pl: Woda w ekosystemach bagiennych', url: 'https://ratujmyrzeki.bagna.pl/images/Wplyw_ekosystemy_bagienne.pdf' },
      { title: 'OKO.press: Czas mokradeł – na osuszaniu tracimy', url: 'https://oko.press/czas-mokradel-nauczmy-sie-je-ratowac-bo-na-osuszaniu-tracimy' },
    ],
  },
  {
    id: 'rzeki',
    title: 'Wyprostowana rzeka osusza okolicę',
    lead:
      'Przez dekady rzeki skracano i prostowano, żeby szybciej odprowadzały wodę. Efekt: woda ucieka szybciej, a pola w dolinie tracą wilgoć.',
    points: [
      'Uregulowane koryto szybciej się pogłębia (eroduje). Obniża się dno rzeki, a za nim poziom wód gruntowych w całej dolinie.',
      'Rzeka odcięta od terenów zalewowych przestaje wymieniać się wodą z gruntem i działa jak wielki rów drenujący.',
      'Regulacja odcina też mokradła w dolinie, które dawniej napełniały się przy każdym wezbraniu i oddawały wodę powoli.',
      'Największe powodzie ostatnich lat zdarzały się na rzekach uregulowanych i obwałowanych. Zbiorniki zaporowe podnoszą wody gruntowe tylko lokalnie, a poniżej tamy rzeka się wcina i dolina przesycha.',
      'Zamiast tego naukowcy i organizacje przyrodnicze postulują renaturyzację: przywracanie meandrów, polderów zalewowych i zalewanych łąk.',
      'Płytkie wody gruntowe odnawiają się w tygodnie i miesiące, głębsze warstwy – przez dziesiątki, a nawet setki lat. Tego, co wypuścimy rowem, szybko nie odzyskamy.',
    ],
    numbers: [],
    sources: [
      { title: 'PAP: prof. Mateusz Grygoruk (SGGW) o renaturyzacji rzek', url: 'https://www.pap.pl/aktualnosci/hydrolog-renaturyzacja-rzek-dzialanie-niezbedne-nie-tylko-dla-srodowiska-ale-i-dla' },
      { title: 'Warto wiedzieć: dr Kinga Krauze (ERCE PAN) – czy renaturyzacja rzek pomoże', url: 'https://wartowiedziec.pl/zarzadzanie-przestrzenia/81406-czy-renaturyzacja-rzek-pomoze-wygrac-walke-z-susza-i-powodziami' },
      { title: 'WWF Polska: dlaczego zbiorniki zaporowe nie pomagają w walce z suszą', url: 'https://www.wwf.pl/sites/default/files/inline-files/dlaczego%20zbiorniki%20zaporowe%20nie%20s%C4%85%20dobrym%20narz%C4%99dziem%20w%20walce%20z%20susz%C4%85.pdf' },
      { title: 'OKO.press: wciąż reguluje się rzeki (cyt. Koalicja Ratujmy Rzeki)', url: 'https://oko.press/w-polsce-wciaz-reguluje-sie-rzeki-ze-szkoda-dla-przyrody-i-bezpieczenstwa' },
    ],
  },
  {
    id: 'lasy',
    title: 'Las jako gąbka – i gdzie ta gąbka się kończy',
    lead:
      'Las zatrzymuje wodę w koronach drzew, ściółce, martwym drewnie i glebie. Spowalnia spływ i wyrównuje przepływy w rzekach. Nie jest jednak tamą na każdą ulewę.',
    points: [
      'Europejska Agencja Środowiska wskazuje, że lasy zatrzymują nadmiar deszczu, ograniczają gwałtowny spływ i szkody powodziowe, a w suszy łagodzą niedobory. Efekt zależy od powierzchni lasu, składu gatunkowego i intensywności gospodarki.',
      'Zwalone pnie w poprzek stoku, wykroty, śródleśne bagienka i zatkane rowy wyglądają na bałagan, ale w skali zlewni wyraźnie spowalniają spływ.',
      'Naukowcy z Nauki dla Przyrody i Polskiego Towarzystwa Hydrobiologicznego postulują, by w obszarach źródliskowych, zwłaszcza w górach, gospodarkę leśną podporządkować retencji wody, a nie pozyskaniu drewna.',
      'Uczciwie: przy opadach ekstremalnych (we wrześniu 2024 r. ponad 400 mm w 3–4 dni w Kotlinie Kłodzkiej) las nie zapobiegnie powodzi – tak oceniła grupa 16 naukowców, w tym hydrologów i klimatologów. Do tego po suszy przesuszona ściółka chłonie mniej wody. Las pomaga przy typowych ulewach, przy katastrofie jego wpływ jest niewielki.',
      'Dla rolnika wniosek jest praktyczny: zadrzewienia śródpolne, miedze i pasy krzewów działają jak mini-las. Spowalniają spływ z pola, chronią przed erozją i wiatrem, który wysusza glebę.',
    ],
    numbers: [],
    sources: [
      { title: 'EEA / Climate-ADAPT: Water retention potential of Europe’s forests', url: 'https://climate-adapt.eea.europa.eu/pl/metadata/publications/water-retention-potential-of-europes-forests' },
      { title: 'Nauka w Polsce: list PTH i Nauki dla Przyrody w sprawie suszy', url: 'https://polishscience.pl/en/?p=129622' },
      { title: 'Spider’s Web: przyczyny powodzi 2024 okiem naukowców (m.in. dr A. Jermaczek)', url: 'https://spidersweb.pl/2024/09/powodz-przyczyny-zdanie-naukowcow.html' },
      { title: 'Radio Kraków: stanowisko 16 naukowców o lasach i powodzi', url: 'https://www.radiokrakow.pl/audycje/zarzadzanie-lasami-a-powodz-list-naukowcow/' },
    ],
  },
  {
    id: 'formalnosci',
    title: 'Jak zatrzymać wodę w rowie zgodnie z prawem',
    lead:
      'Formalności są prostsze, niż się wydaje – pod warunkiem, że to rów melioracyjny, a nie naturalny ciek. Skrót na podstawie poradnika OTOP. To nie jest porada prawna.',
    points: [
      'Najpierw sprawdź status rowu: naturalny ciek może wyglądać jak rów, a podlega innym przepisom. Pomoże mapa podziału hydrograficznego w Hydroportalu.',
      'Najprostsza droga: przegroda z materiałów naturalnych (ziemia, faszyna, gałęzie, kłody, nieheblowane deski). Nie są to wyroby budowlane, więc odpada prawo budowlane.',
      'Zatrzymanie wody tymczasowymi środkami na własnym gruncie nie wymaga zgłoszenia.',
      'Trwałe zatrzymanie wody w rowie lub przebudowa ograniczająca odpływ: zgłoszenie (Prawo wodne, art. 395/395A). Jeśli woda wpłynie na grunty sąsiadów, potrzebna jest ich pisemna zgoda – pogadaj z nimi wcześniej.',
      'Na obszarach chronionych (Natura 2000, parki krajobrazowe, rezerwaty) dodatkowo zgłoszenie do RDOŚ.',
      'Jesteś w spółce wodnej? Możesz naciskać, żeby rowy zatrzymywały wodę, a nie tylko ją odprowadzały, i sprzeciwiać się „konserwacji”, która tylko przyspiesza odpływ.',
    ],
    numbers: [],
    sources: [{ title: 'OTOP BirdLife Polska: poradnik dla rolników o zatrzymywaniu wody w rowach', url: 'https://otop.org.pl/wp-content/uploads/2026/08/otop_broszura_rolniku_rolniczko_net_pojed_Str.pdf' }],
  },
];

// Które karty wiedzy pasują do których akcji z silnika reguł.
export const ACTION_KNOWLEDGE = {
  'retention-season': ['zastawki', 'formalnosci'],
  'retention-before-rain': ['zastawki', 'formalnosci'],
  'retention-future': ['zastawki', 'torfowiska'],
  irrigate: ['zastawki'],
  'irrigate-wait': ['zastawki'],
  'heavy-rain': ['lasy', 'rzeki'],
  wet: ['rzeki'],
  'imgw-*': [],
};

export const knowledgeFor = (actionId) => ACTION_KNOWLEDGE[actionId] ?? [];
