// Etapy 3–5: rekomendacje retencyjne, agrotechniczne i (opcjonalnie) nawadnianie.
// Każda rekomendacja ma pole `basis` – dane, z których wynika. Bez oceny działki nic tu nie powstaje.
import { n } from './assess.js';
import { fmtDate, fmtDateTime } from '../format.js';

const PRIORITY_ORDER = { pilne: 0, wazne: 1, info: 2 };
const sortByPriority = (list) => list.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
const MONTH_LOC = ['styczniu', 'lutym', 'marcu', 'kwietniu', 'maju', 'czerwcu', 'lipcu', 'sierpniu', 'wrześniu', 'październiku', 'listopadzie', 'grudniu'];

export function retentionActions({ status, soil, terrain, waters, vulnerability, season, watersFailed, crop = {} }) {
  const out = [];
  const dry = status.rank > 0;
  const highRisk = vulnerability?.level === 'wysoka' || vulnerability?.level === 'srednia';
  const urgent = dry || season === 'spoczynek' || highRisk ? 'wazne' : 'info';

  const ditch = waters?.nearestDitch;
  if (ditch && ditch.distM <= 150) {
    out.push({
      id: 'retencja-row',
      priority: urgent,
      title: `Zatrzymaj wodę w rowie ${ditch.distM === 0 ? 'na działce' : `ok. ${ditch.distM} m od działki`}`,
      detail:
        `Postaw przegrodę z naturalnych materiałów (ziemia, faszyna, kłody) albo zamknij istniejącą zastawkę. Najwięcej daje piętrzenie od jesieni do wiosny – woda z roztopów zostaje w polu i podnosi poziom wód gruntowych.${crop.grassland ? ' Na łąkach podpiętrzanie wody w rowach to tradycyjny sposób nawadniania (nawodnienie podsiąkowe) – trawa korzysta z podniesionego poziomu wód gruntowych przez cały sezon.' : ''} Trwałe zatrzymanie wody w rowie wymaga zgłoszenia wodnoprawnego (organ: Wody Polskie), a gdy woda wpływa na grunty sąsiadów – ich zgody.`,
      note:
        'Spółki wodne i Wody Polskie często zalecają odmulanie i pogłębianie rowów. Przyrodnicy i hydrolodzy wskazują, że przyspiesza to odpływ i przesusza okoliczne pola – dlatego zalecamy zatrzymywanie, a nie pogłębianie.',
      basis: [`OpenStreetMap: ${ditch.kind}${ditch.name ? ` „${ditch.name}”` : ''}, ${ditch.distM} m`],
      knowledge: ['zastawki', 'formalnosci'],
    });
  }

  const dep = terrain?.depressions?.[0];
  if (dep) {
    out.push({
      id: 'retencja-obnizenie',
      priority: urgent,
      title: 'Nie osuszaj obniżenia na polu – niech zbiera wodę',
      detail:
        'Na działce jest lokalne obniżenie. Zamiast je drenować lub zasypywać, pozwól wodzie stać tam wiosną albo zrób w nim oczko lub płytki zbiornik. Woda wsiąka i zasila glebę wokół.',
      basis: [`NMT GUGiK: obniżenie ok. ${n(dep.depthM)} m poniżej otoczenia, ${dep.lat.toFixed(5)}, ${dep.lon.toFixed(5)}`],
      location: { lat: dep.lat, lon: dep.lon },
      knowledge: ['zastawki'],
    });
  } else if (terrain && terrain.reliefM >= 1 && terrain.lowest) {
    out.push({
      id: 'retencja-najnizszy',
      priority: 'info',
      title: `Zatrzymaj spływ w najniższej części pola (strona: ${terrain.downslope})`,
      detail:
        'Najniższa część działki to naturalne miejsce na zatrzymanie wody: pas trwałej roślinności (trawa, krzewy) albo płytki rów chłonny w poprzek spływu zatrzyma wodę z ulew w polu.',
      basis: [`NMT GUGiK: różnica wysokości ${n(terrain.reliefM)} m, najniższy punkt ${terrain.lowest.lat.toFixed(5)}, ${terrain.lowest.lon.toFixed(5)}`],
      location: { lat: terrain.lowest.lat, lon: terrain.lowest.lon },
      knowledge: [],
    });
  }

  if (terrain && terrain.slopePct >= 3) {
    out.push({
      id: 'retencja-stok',
      priority: terrain.slopePct >= 6 ? 'wazne' : 'info',
      title: crop.grassland ? 'Nie przeoruj łąki na stoku – darń zatrzymuje wodę' : 'Orz i siej w poprzek stoku',
      detail: crop.grassland
        ? 'Zwarta darń to najlepsza ochrona stoku przed spływem i erozją. Nie zaorywuj łąki (przekształcanie trwałych użytków zielonych w grunty orne ogranicza też wspólna polityka rolna), nie wjeżdżaj ciężkim sprzętem na rozmiękłą darń, a u podnóża stoku zostaw pas krzewów lub zadrzewień.'
        : 'Orz i siej w poprzek stoku, zostaw miedze i pasy trawy, a u podnóża posadź zadrzewienia śródpolne lub pas krzewów. Woda z ulewy wsiąknie, zamiast spłynąć razem z glebą.',
      basis: [`NMT GUGiK: średni spadek ${n(terrain.slopePct)}%, spływ w kierunku: ${terrain.downslope}`],
      knowledge: [],
    });
  }

  const stream = waters?.nearestStream;
  if (stream && stream.distM <= 300) {
    out.push({
      id: 'retencja-ciek',
      priority: 'info',
      title: `Zostaw pas trawy lub krzewów przy cieku (ok. ${stream.distM} m)`,
      detail:
        'Pas trwałej roślinności lub zadrzewień między polem a ciekiem spowalnia odpływ i zatrzymuje nawozy. Nie prostuj i nie pogłębiaj koryta – uregulowany ciek drenuje okolicę.',
      basis: [`OpenStreetMap: ${stream.kind}, ${stream.distM} m`],
      knowledge: ['rzeki'],
    });
  }

  const wet = waters?.nearestWetland ?? waters?.nearestWater;
  if (wet && wet.distM <= 300) {
    out.push({
      id: 'retencja-mokradlo',
      priority: 'info',
      title: `Nie osuszaj: ${wet.kind} ok. ${wet.distM} m od pola`,
      detail: 'To naturalny magazyn wody dla okolicy. Nie odwadniaj go i nie zasypuj. Jeśli odpływa z niego rów – zatrzymaj wodę przegrodą.',
      basis: [`OpenStreetMap: ${wet.kind}, ${wet.distM} m`],
      knowledge: ['torfowiska'],
    });
  }

  if (soil.category === 'organiczna') {
    out.push({
      id: 'retencja-torf',
      priority: 'wazne',
      title: 'Torf na polu: trzymaj wodę wysoko, nie pogłębiaj rowów',
      detail:
        'Na torfach i murszach każde obniżenie wód gruntowych to trwała utrata gleby (mineralizacja). Zatrzymuj wodę w rowach, nie pogłębiaj ich, rozważ ekstensywne łąki lub uprawy na mokro (paludikultura).',
      basis: ['IUNG-PIB: gleba organiczna lub pochodzenia organicznego'],
      knowledge: ['torfowiska'],
    });
  }

  if (!out.some((a) => a.id.startsWith('retencja-row'))) {
    out.push({
      id: 'retencja-ogolna',
      priority: season === 'spoczynek' ? 'wazne' : 'info',
      title: 'Zatrzymaj wodę z zimy i roztopów',
      detail: watersFailed
        ? 'Nie udało się pobrać mapy rowów i cieków. Jeśli przy polu jest rów melioracyjny, zamknij zastawkę albo postaw przegrodę z ziemi lub faszyny od jesieni do wiosny. Nie odprowadzaj wody z zagłębień w polu.'
        : 'W promieniu 150 m mapa nie pokazuje rowów (OSM bywa niekompletny). Jeśli jednak rów jest, zatrzymaj w nim wodę od jesieni do wiosny. Nie odprowadzaj wody z zagłębień w polu.',
      basis: [season === 'spoczynek' ? 'poza sezonem wegetacyjnym – najlepszy czas na retencję' : 'zasada „zatrzymaj wodę tam, gdzie spadła”'],
      knowledge: ['zastawki', 'formalnosci'],
    });
  }
  return sortByPriority(out);
}

export function agroActions({ status, soil, crop, vulnerability, date, rootZone, iungNotRecommended }) {
  const out = [];
  const m = Number(date.slice(5, 7));
  const lightSoil = soil.category === 'I' || soil.category === 'II';
  const risky = vulnerability?.level === 'wysoka' || lightSoil;
  const dry = status.rank > 0;

  // Trwałe użytki zielone: nie orze się ich i nie sieje, a pokos trzeba zebrać – zupełnie inne zabiegi.
  if (crop.grassland) return grasslandActions({ status, soil, vulnerability, dry, lightSoil });

  // Międzyplon ma sens tylko wtedy, gdy zdąży wyrosnąć przed zimą: zbiór do sierpnia – zwykły,
  // we wrześniu – ozimy, w październiku (kukurydza, burak) – już za późno, zostają resztki jako mulcz.
  const hm = crop.harvestMonth;
  const basisSoil = [lightSoil ? `gleba kat. ${soil.category} – mała pojemność wodna` : `uprawa: ${crop.short}`, vulnerability?.level ? `podatność na suszę z ${vulnerability.seasons} lat: ${vulnerability.level}` : null].filter(Boolean);
  if (hm && hm <= 9) {
    const afterHarvest = m >= hm && m <= 9;
    out.push({
      id: 'agro-miedzyplon',
      priority: afterHarvest || risky ? 'wazne' : 'info',
      title: hm <= 8
        ? (afterHarvest ? 'Zaraz po zbiorze wysiej międzyplon' : `Po zbiorze w ${MONTH_LOC[hm - 1]} wysiej międzyplon`)
        : 'Jeśli zbierzesz do połowy września – wysiej międzyplon ozimy',
      detail: hm <= 8
        ? 'Międzyplon osłania glebę przed słońcem i wiatrem, a korzenie i resztki poprawiają strukturę, więc gleba lepiej wchłania i trzyma wodę. W suchym okresie wybieraj gatunki o małych wymaganiach (np. gorczyca, facelia) i siej zaraz po zbiorze, póki w glebie jest wilgoć.'
        : 'Po wrześniowym zbiorze na międzyplon ścierniskowy jest już późno, ale międzyplon ozimy (np. żyto, wyka ozima) zdąży okryć glebę przed zimą. Przy późniejszym zbiorze lepiej zostawić rozdrobnione resztki na powierzchni.',
      basis: basisSoil,
      knowledge: [],
    });
  }

  out.push({
    id: 'agro-resztki',
    priority: dry || (hm && hm >= 10) ? 'wazne' : 'info',
    title: crop.straw ? 'Zostaw słomę i resztki na polu' : 'Po zbiorze rozdrobnij resztki i zostaw je na polu',
    detail: crop.straw
      ? 'Słoma i resztki ograniczają parowanie z gleby i spływ po ulewie. Nie wypalaj, nie wywoź całej słomy z lekkich gleb.'
      : `Rozdrobnione resztki pożniwne leżące na powierzchni działają jak ściółka (mulcz): ograniczają parowanie, chronią glebę przed ulewą i zasilają ją w próchnicę.${hm && hm >= 10 ? ` Przy zbiorze w ${MONTH_LOC[hm - 1]} na międzyplon jest już za późno – to najprostsza ochrona gleby na zimę.` : ''}`,
    basis: [dry ? `stan wody: ${status.label.toLowerCase()}` : 'ograniczanie strat wilgoci'],
    knowledge: [],
  });

  if (lightSoil || dry) {
    out.push({
      id: 'agro-uprawa',
      priority: dry ? 'wazne' : 'info',
      title: 'Nie orz głęboko, gdy jest sucho',
      detail: 'Każde odwrócenie suchej gleby to utrata wilgoci. Uprawa bezorkowa lub pasowa i jak najmniej przejazdów zatrzymują wodę w profilu. Po siewie na lekkiej glebie wałowanie poprawia podsiąk wody.',
      basis: [lightSoil ? `gleba kat. ${soil.category}` : null, dry ? 'bieżący niedobór wody' : null].filter(Boolean),
      knowledge: [],
    });
  }

  if (lightSoil || (soil.socTopGkg != null && soil.socTopGkg < 10)) {
    out.push({
      id: 'agro-materia',
      priority: 'info',
      title: 'Dawaj obornik, kompost i poplony',
      detail: 'Obornik, kompost, poplony i pozostawiona słoma z roku na rok podnoszą zawartość próchnicy, a ta zwiększa pojemność wodną gleby. To działanie długofalowe – efekt widać po kilku latach.',
      basis: [soil.socTopGkg != null ? `węgiel organiczny 0–30 cm ok. ${n(soil.socTopGkg)} g/kg (SoilGrids)` : `gleba kat. ${soil.category}`],
      knowledge: [],
    });
  }

  if (iungNotRecommended || vulnerability?.level === 'wysoka') {
    out.push({
      id: 'agro-dobor',
      priority: iungNotRecommended ? 'wazne' : 'info',
      title: 'Wybierz uprawy i odmiany odporniejsze na suszę',
      detail: iungNotRecommended
        ? `IUNG nie wskazuje uprawy „${crop.short}” na glebie kat. ${soil.category}. Na takich glebach lepiej sprawdzają się gatunki o głębokim korzeniu i małych potrzebach wodnych (np. żyto, łubin, gryka).`
        : 'Susza powtarzała się tu w wielu sezonach. Odmiany wcześniejsze lub o głębszym systemie korzeniowym oraz wcześniejszy siew pozwalają wykorzystać wiosenną wilgoć.',
      basis: [iungNotRecommended ? 'tabela progów IUNG: uprawa niewskazana na tej kategorii gleby' : `susza w ${vulnerability.droughtYearsCount} z ${vulnerability.seasons} sezonów`],
      knowledge: [],
    });
  }
  return sortByPriority(out);
}

/** Łąki i pastwiska: bez orki, siewu i "zostawiania słomy". Zabiegi, które chronią darń i wodę w glebie. */
function grasslandActions({ status, soil, vulnerability, dry, lightSoil }) {
  const out = [];
  // Zobowiązania z dopłat mają pierwszeństwo – aplikacja nie wie, czy łąka jest w programie.
  out.push({
    id: 'agro-tuz-pakiet',
    priority: 'wazne',
    title: 'Masz dopłaty do łąki? Najpierw zasady pakietu',
    detail:
      'Jeśli łąka jest objęta pakietem rolno-środowiskowo-klimatycznym, rolnictwem ekologicznym albo ekoschematem, przestrzegaj jego zasad – terminów koszenia, zakazów nawożenia, podsiewu czy wałowania i dopuszczalnej obsady zwierząt. Mają one pierwszeństwo przed poniższymi radami; niezgodność może oznaczać utratę dopłaty. W razie wątpliwości zapytaj doradcę ODR albo biuro ARiMR.',
    basis: ['aplikacja nie zna Twoich zobowiązań z programów dopłat'],
    knowledge: [],
  });
  out.push({
    id: 'agro-tuz-koszenie',
    priority: dry ? 'wazne' : 'info',
    title: 'Koś wyżej i nie w największy upał',
    detail: 'Wyżej zostawiona ruń osłania glebę przed słońcem, więc mniej wody paruje, a trawa szybciej odrasta. W suszy nie koś przy samej ziemi i ogranicz liczbę pokosów. Pokos zbierz (siano, sianokiszonka) – zostawiony na łące dusi darń.',
    basis: [dry ? `stan wody: ${status.label.toLowerCase()}` : 'ograniczanie strat wilgoci', 'trwały użytek zielony'],
    knowledge: [],
  });
  if (dry) {
    out.push({
      id: 'agro-tuz-wypas',
      priority: 'wazne',
      title: 'Nie wypasaj do gołej ziemi',
      detail: 'Przegryziona do korzeni darń szybko wysycha i długo się odradza. W suszy zmniejsz obsadę albo częściej przenoś zwierzęta między kwaterami, żeby na pastwisku zostawała osłona z trawy.',
      basis: [`stan wody: ${status.label.toLowerCase()}`],
      knowledge: [],
    });
    out.push({
      id: 'agro-tuz-nawozenie',
      priority: 'info',
      title: 'W suszy wstrzymaj nawożenie azotem',
      detail: 'Bez wody trawa nie pobierze azotu, a nawóz może przypalić ruń albo zostać spłukany przez późniejszą ulewę. Nawoź tuż przed zapowiadanym deszczem albo po nim.',
      basis: [`stan wody: ${status.label.toLowerCase()}`],
      knowledge: [],
    });
  }
  if (lightSoil || vulnerability?.level === 'wysoka' || vulnerability?.level === 'srednia') {
    out.push({
      id: 'agro-tuz-podsiew',
      priority: 'info',
      title: 'Podsiewaj trawami odporniejszymi na suszę – bez orki',
      detail: 'Na przesychających łąkach sprawdzają się gatunki o głębszym korzeniu, np. kupkówka pospolita czy kostrzewa trzcinowa. Wsiewa się je w istniejącą darń siewnikiem do podsiewu (wczesną wiosną albo pod koniec lata), bez zaorywania łąki.',
      basis: [lightSoil ? `gleba kat. ${soil.category}` : `podatność na suszę: ${vulnerability.level}`],
      knowledge: [],
    });
  }
  return sortByPriority(out);
}

/** Nawadnianie – opcjonalne, zawsze po retencji. Dawka z bilansu strefy korzeni, termin z prognozy. */
export function irrigationActions({ rootZone, season, isToday, next, crop, recentEtc }) {
  if (season === 'spoczynek' || !rootZone?.applicable) {
    return [{
      id: 'nawadnianie-poza-sezonem',
      priority: 'info',
      title: 'Nie podlewaj – rośliny teraz odpoczywają',
      detail: 'Rośliny prawie nie pobierają wody. Woda z opadów i roztopów zatrzymana teraz w glebie i rowach to zapas na wiosnę.',
      basis: ['poza sezonem wegetacyjnym'],
      knowledge: ['zastawki'],
    }];
  }
  const out = [];
  const rain3 = next.slice(0, 3).reduce((s, d) => s + (d.rain ?? 0), 0);
  const dose = Math.min(Math.round(rootZone.depletion), 25);
  const basis = [`zapas w strefie korzeni ${n(rootZone.available)} z ${n(rootZone.taw)} mm (FAO-56)`, `Kc ${n(rootZone.kcToday)} (${crop.short})`];

  if (rootZone.overRaw) {
    if (!isToday) {
      out.push({
        id: 'nawadnianie-historyczne',
        priority: 'wazne',
        title: crop.grassland ? 'Wtedy łące brakowało wody – warto było podpiętrzyć wodę w rowie' : `Wtedy warto było podlać: ok. ${dose} mm (${dose * 10} m³ na hektar)`,
        detail: crop.grassland
          ? 'W dniu analizy woda łatwo dostępna dla traw była już wyczerpana. Łąki najtaniej nawadnia się przez podpiętrzenie wody w rowach (nawodnienie podsiąkowe), a nie deszczownią.'
          : 'W dniu analizy woda łatwo dostępna dla roślin była już wyczerpana. Dla dat historycznych nie znamy ówczesnej prognozy, więc termin wymagał sprawdzenia prognozy na 3 dni.',
        basis,
        knowledge: ['zastawki'],
      });
    } else if (rain3 >= 5) {
      out.push({
        id: 'nawadnianie-wstrzymaj',
        priority: 'wazne',
        title: 'Poczekaj z podlewaniem – za 1–3 dni ma padać',
        detail: `Rośliny odczuwają już brak wody, ale prognoza daje ${n(Math.round(rain3 * 10) / 10)} mm w 3 dni. Sprawdź prognozę jutro rano. Jeśli deszcz nie przyjdzie, podaj ok. ${dose} mm.`,
        basis: [...basis, `prognoza Open-Meteo: ${n(Math.round(rain3 * 10) / 10)} mm w 3 dni`],
        knowledge: ['zastawki'],
      });
    } else {
      out.push({
        id: 'nawadnianie-teraz',
        priority: 'pilne',
        title: `Podlej w ciągu 1–2 dni: ok. ${dose} mm (${dose * 10} m³ na hektar)`,
        detail: crop.grassland
          ? `Woda łatwo dostępna w strefie korzeni skończyła się, a w 3 dni spadnie tylko ${n(Math.round(rain3 * 10) / 10)} mm. Łąk zwykle nie podlewa się deszczownią – najtaniej jest podpiętrzyć wodę w rowie zastawką (nawodnienie podsiąkowe). Deszczownia ma sens tylko na intensywnych użytkach przy własnym ujęciu wody.`
          : `Woda łatwo dostępna w strefie korzeni skończyła się, a w 3 dni spadnie tylko ${n(Math.round(rain3 * 10) / 10)} mm. Podlewaj rano lub wieczorem, jedną dawką do ok. 25 mm. Sprawdź, czy pobór wody wymaga pozwolenia wodnoprawnego (zależy od źródła i ilości).`,
        basis: [...basis, `prognoza: ${n(Math.round(rain3 * 10) / 10)} mm w 3 dni`],
        knowledge: ['zastawki'],
      });
    }
  } else {
    const left = Math.max(0, rootZone.raw - rootZone.depletion);
    const daysLeft = recentEtc > 0.2 ? Math.round(left / recentEtc) : null;
    out.push({
      id: 'nawadnianie-niepotrzebne',
      priority: 'info',
      title: 'Nie podlewaj – w glebie jest jeszcze woda',
      detail: `Rośliny mają jeszcze ok. ${n(Math.round(left))} mm wody łatwo dostępnej${daysLeft != null ? `. Przy obecnym zużyciu (${n(Math.round(recentEtc * 10) / 10)} mm/dzień) bez deszczu wystarczy jej na ok. ${daysLeft} dni` : ''}. Nawadniaj dopiero, gdy zapas spadnie poniżej ${n(rootZone.taw - rootZone.raw)} mm.`,
      basis,
      knowledge: [],
    });
  }
  return out;
}

/** Pogoda na najbliższe dni – tylko dla analizy "na dziś" (prognoza). */
export function weatherActions({ next, season, warnings, hydroWarnings }) {
  const out = [];
  const growing = season === 'wegetacja';
  for (const w of warnings ?? []) {
    out.push({ id: `imgw-${w.id}`, priority: (w.level ?? 1) >= 2 ? 'pilne' : 'wazne', title: `IMGW: ${w.event} (st. ${w.level ?? '?'})`, detail: `${w.text} Obowiązuje: ${fmtDateTime(w.from)} – ${fmtDateTime(w.to)}.`, basis: ['ostrzeżenie meteorologiczne IMGW-PIB dla powiatu'], knowledge: [] });
  }
  for (const w of (hydroWarnings ?? []).filter((x) => x.drought)) {
    out.push({ id: `imgw-hydro-${w.event}`, priority: 'wazne', title: `IMGW: ${w.event}`, detail: `${w.text} Obszar: ${w.areas.join('; ')}.`, basis: ['ostrzeżenie hydrologiczne IMGW-PIB dla województwa'], knowledge: ['rzeki'] });
  }
  const heavy = next.find((d) => (d.rain ?? 0) >= 15);
  if (heavy) out.push({ id: 'ulewa', priority: 'wazne', title: `Ulewa ${fmtDate(heavy.date)}: ok. ${n(heavy.rain)} mm`, detail: 'Nie nawoź i nie pryskaj na 1–2 dni przed. Przymknij zastawki, żeby woda wsiąkła zamiast odpłynąć rowem. Na stokach grozi erozja.', basis: ['prognoza Open-Meteo'], knowledge: ['zastawki'] });
  const frost = next.filter((d) => d.tmin != null && d.tmin <= 0);
  if (frost.length && season !== 'spoczynek') {
    out.push({ id: 'przymrozek', priority: growing ? 'pilne' : 'wazne', title: `Przymrozek: ${frost.map((d) => fmtDate(d.date)).join(', ')}`, detail: 'Uprawy wrażliwe okryj agrowłókniną albo zaplanuj deszczowanie przeciwprzymrozkowe.', basis: ['prognoza Open-Meteo: temperatura minimalna ≤ 0°C'], knowledge: [] });
  }
  const heat = next.filter((d) => d.tmax != null && d.tmax >= 30);
  if (heat.length) out.push({ id: 'upal', priority: 'wazne', title: `Upał: ${heat.map((d) => fmtDate(d.date)).join(', ')}`, detail: 'Zapotrzebowanie roślin na wodę rośnie. Jeśli nawadniasz – rano. Zabiegi ochrony roślin przenieś na wieczór.', basis: ['prognoza Open-Meteo: temperatura maksymalna ≥ 30°C'], knowledge: [] });
  return sortByPriority(out);
}
