// Baza wiedzy "dlaczego to działa". Treści są parafrazą źródeł przyrodniczych i naukowych
// (Centrum Ochrony Mokradeł / bagna.pl, OTOP, Koalicja Ratujmy Rzeki, WWF, PAN, EEA, IMGW-PIB). Bez portali
// publicystycznych – tylko publikacje naukowe, raporty instytucji naukowych i organizacji przyrodniczych.
// Hierarchia: nauka > organizacje przyrodnicze > instytucje państwowe (docs/zrodla.md).
// Wody Polskie i Lasy Państwowe: można przywoływać, ale przy konflikcie zaleceń wygrywają naukowcy i przyrodnicy.
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
      { value: '~1,6 tys. m³', label: 'własne zasoby wodne na mieszkańca Polski rocznie – w UE mniej mają tylko Czechy, Cypr i Malta' },
    ],
    sources: [
      { title: 'Badanie efektów piętrzenia wody zastawkami (PECO, 2013)', url: 'https://yadda.icm.edu.pl/baztech/element/bwmeta1.element.baztech-f7d43bd6-b5e5-49d9-af06-5d4c74c57277/c/PECO_2013_2_p1-24.pdf' },
      { title: 'OTOP: Rolniku, rolniczko – zatrzymaj wodę w rowie', url: 'https://otop.org.pl/wp-content/uploads/2026/08/otop_broszura_rolniku_rolniczko_net_pojed_Str.pdf' },
      { title: 'Gutry-Korycka, Sadurski, Kundzewicz i in. (2014): Zasoby wodne a ich wykorzystanie, „Nauka” (PAN) 1/2014', url: 'https://czasopisma.pan.pl/Content/92153' },
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
    ],
  },
  {
    id: 'rzeki',
    title: 'Wyprostowana rzeka osusza okolicę',
    lead:
      'Przez dekady rzeki skracano, prostowano i obwałowywano, żeby szybciej odprowadzały wodę. Efekt: woda szybciej ucieka, a dolina traci naturalne miejsca, w których mogłaby wsiąknąć.',
    points: [
      'Europejska Agencja Środowiska ocenia, że 70–90% terenów zalewowych w Europie jest zdegradowanych – m.in. przez prostowanie rzek, wały i odcięcie mokradeł w dolinach.',
      'Rzeka odcięta wałami od doliny traci możliwość naturalnego zatrzymywania wezbranej wody. Mokradła, które dawniej napełniały się przy każdym wezbraniu i oddawały wodę powoli, wysychają.',
      'Zespół Komitetu Nauk o Wodzie PAN po powodzi 2024 r. wymienia nieprzemyślaną regulację rzek wśród przyczyn powodzi: przenosi ona zagrożenie niżej w dół rzeki.',
      'Ten sam zespół zaleca spowalnianie odpływu: renaturyzację rzek, „odwróconą meliorację” (rowy, które zatrzymują wodę), poldery i rolnicze praktyki zwiększające retencję gleby. W wielu krajach UE zapory, prostowanie i wały osiągnęły już granicę skuteczności.',
      'Zbiorniki zaporowe podnoszą wody gruntowe tylko w swoim pobliżu – WWF Polska wskazuje, że nie są dobrym narzędziem w walce z suszą.',
      'Głębokie wody podziemne odnawiają się bardzo powoli, dlatego hydrolodzy postulują je chronić. Tego, co szybko wypuścimy rowem i rzeką, szybko nie odzyskamy.',
    ],
    numbers: [{ value: '70–90%', label: 'terenów zalewowych w Europie jest zdegradowanych (EEA)' }],
    sources: [
      { title: 'Europejska Agencja Środowiska (2019): Floodplains – a natural system to preserve and restore, raport EEA 24/2019', url: 'https://www.eea.europa.eu/en/analysis/publications/floodplains-a-natural-system-to-preserve-and-restore' },
      { title: 'Zespół ds. Odbudowy Odporności po Powodzi KNoWiGW PAN (2025): raport po powodzi 2024, „Nauka” 4/2025', url: 'https://nauka-pan.pl/index.php/nauka/article/download/1145/1192/1552' },
      { title: 'WWF Polska: dlaczego zbiorniki zaporowe nie pomagają w walce z suszą', url: 'https://www.wwf.pl/sites/default/files/inline-files/dlaczego%20zbiorniki%20zaporowe%20nie%20s%C4%85%20dobrym%20narz%C4%99dziem%20w%20walce%20z%20susz%C4%85.pdf' },
      { title: 'Gutry-Korycka, Sadurski, Kundzewicz i in. (2014): Zasoby wodne a ich wykorzystanie, „Nauka” (PAN) 1/2014', url: 'https://czasopisma.pan.pl/Content/92153' },
    ],
  },
  {
    id: 'lasy',
    title: 'Las jako gąbka – i gdzie ta gąbka się kończy',
    lead:
      'Las zatrzymuje wodę w koronach drzew, ściółce, martwym drewnie i glebie. Spowalnia spływ i wyrównuje przepływy w rzekach. Nie jest jednak tamą na każdą ulewę.',
    points: [
      'Europejska Agencja Środowiska wskazuje, że lasy zatrzymują nadmiar deszczu, ograniczają gwałtowny spływ i szkody powodziowe, a w suszy łagodzą niedobory. Efekt zależy od powierzchni lasu, składu gatunkowego i intensywności gospodarki.',
      'Naukowcy z Nauki dla Przyrody i Polskiego Towarzystwa Hydrobiologicznego postulują, by w obszarach źródliskowych, zwłaszcza w górach, gospodarkę leśną podporządkować retencji wody, a nie pozyskaniu drewna.',
      'Uczciwie: las nie jest tamą na każdą ulewę. We wrześniu 2024 r. na Śnieżniku spadło 218,8 mm deszczu w jedną dobę, a sumy z kilku dni kilkakrotnie przekroczyły miesięczną normę (IMGW-PIB). Przy takich opadach liczy się suma wielu działań w całej zlewni – zespół Komitetu Nauk o Wodzie PAN zaleca jednocześnie chronić lasy i mokradła, zwiększać retencję gleby praktykami rolniczymi i renaturyzować rzeki.',
      'Dla rolnika wniosek jest praktyczny: zadrzewienia śródpolne, miedze i pasy krzewów działają jak mini-las. Spowalniają spływ z pola, chronią przed erozją i wiatrem, który wysusza glebę.',
    ],
    numbers: [],
    sources: [
      { title: 'EEA / Climate-ADAPT: Water retention potential of Europe’s forests', url: 'https://climate-adapt.eea.europa.eu/pl/metadata/publications/water-retention-potential-of-europes-forests' },
      { title: 'Polish Science (PAP): list Polskiego Towarzystwa Hydrobiologicznego i Nauki dla Przyrody w sprawie suszy', url: 'https://polishscience.pl/en/?p=129622' },
      { title: 'IMGW-PIB: Biuletyn Państwowej Służby Hydrologiczno-Meteorologicznej, wrzesień 2024', url: 'https://dane.imgw.pl/data/dane_pomiarowo_obserwacyjne/Biuletyn_PSHM/Biuletyn_PSHM_2024_09_(wrzesien).pdf' },
      { title: 'Zespół ds. Odbudowy Odporności po Powodzi KNoWiGW PAN (2025): raport po powodzi 2024, „Nauka” 4/2025', url: 'https://nauka-pan.pl/index.php/nauka/article/download/1145/1192/1552' },
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
