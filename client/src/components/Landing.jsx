import { useState } from 'react';
import { fmtDate } from '../format.js';

// Strona startowa: co to jest, 3 kroki, wyszukiwarka. Bez rejestracji i bez zbierania danych.
export default function Landing({ examples = [], lastReport, onSearch, onStart, onExample, onOpenReport }) {
  const [text, setText] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (text.trim()) onSearch(text.trim());
    else onStart();
  };

  return (
    <main className="landing">
      <section className="hero">
        <h2>Sprawdź wodę na swoim polu w 3 prostych krokach</h2>
        <p className="hero-lead">
          Czy na działce jest susza, dlaczego i co zrobić: najpierw jak zatrzymać wodę, potem jak uprawiać, a na końcu czy podlewać.
          Za darmo, bez zakładania konta, z publicznych danych.
        </p>
        <form className="hero-search" onSubmit={submit} role="search">
          <label htmlFor="landing-search" className="sr-only">Miejscowość albo numer działki</label>
          <input
            id="landing-search"
            type="search"
            enterKeyHint="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Wpisz miejscowość albo numer działki, np. Ciechanów"
            autoComplete="off"
            spellCheck="false"
          />
          <button type="submit" className="btn-primary">{text.trim() ? 'Szukaj' : 'Otwórz mapę'}</button>
        </form>
        <p className="small muted hero-hint">Możesz wpisać miasto, gminę, powiat albo województwo (np. „pomorskie”) – potem klikniesz swoje pole na mapie.</p>
        {lastReport && (
          <button type="button" className="link-btn" onClick={onOpenReport}>
            Wróć do ostatniej analizy: {lastReport.place?.parcel ? `działka ${lastReport.place.parcel.number}` : lastReport.place?.label}, {fmtDate(lastReport.date)}
          </button>
        )}
      </section>

      <ol className="steps">
        <li className="card">
          <span className="step-no" aria-hidden="true">1</span>
          <h3>Znajdź pole</h3>
          <p>Wpisz miejscowość albo numer działki ewidencyjnej. Na mapie kliknij swoje pole – zobaczysz jego granice.</p>
        </li>
        <li className="card">
          <span className="step-no" aria-hidden="true">2</span>
          <h3>Wybierz uprawę</h3>
          <p>Powiedz, co rośnie na polu. Datę możesz zostawić dzisiejszą albo cofnąć się do 10 lat.</p>
        </li>
        <li className="card">
          <span className="step-no" aria-hidden="true">3</span>
          <h3>Przeczytaj rady</h3>
          <p>W kilkanaście sekund: stan wody, przyczyny i co zrobić – zatrzymaj wodę, uprawa, podlewanie. Raport zapiszesz jako PDF.</p>
        </li>
      </ol>

      <section className="landing-grid">
        <div className="card">
          <h3>Kiedy sprawdzać?</h3>
          <p>Wystarczy 2–3 razy w roku, w chwilach decyzji:</p>
          <ul>
            <li><strong>Przedwiośnie</strong> – zatrzymać wodę z roztopów, zamknąć zastawki na rowach.</li>
            <li><strong>Przed siewem</strong> – dobrać uprawę roli i uprawę do zapasu wody.</li>
            <li><strong>Przed zbiorem</strong> – zaplanować międzyplon i zostawienie resztek.</li>
          </ul>
          <p className="small muted">W suszy, gdy rozważasz podlewanie, warto zajrzeć co tydzień–dwa.</p>
        </div>
        <div className="card">
          <h3>Co dostaniesz?</h3>
          <ul>
            <li>Stan wody na tle 10 lat i oficjalnych progów suszy IUNG-PIB.</li>
            <li>Przyczyny: deszcz, upał, gleba, spadek terenu, rowy w pobliżu.</li>
            <li>Rady dopasowane do działki, z wyjaśnieniem „dlaczego”.</li>
            <li>Które uprawy na tej glebie rzadziej cierpiały na suszę.</li>
            <li>Zdjęcie satelitarne pola i raport PDF do wydruku.</li>
          </ul>
        </div>
      </section>

      <section className="landing-cta">
        <button type="button" className="btn-primary" onClick={onStart}>Otwórz mapę i wybierz pole</button>
        {examples.length > 0 && (
          <div className="examples">
            <span className="muted small">albo zobacz przykład:</span>
            {examples.map((ex) => (
              <button key={ex.label} type="button" className="chip-btn" onClick={() => onExample(ex)}>
                {ex.label}
              </button>
            ))}
          </div>
        )}
        <p className="small muted">
          Dane: GUGiK, IUNG-PIB, IMGW-PIB, Copernicus Sentinel-2, OpenStreetMap, Open-Meteo. Nie zbieramy danych osobowych – raporty zostają w Twojej przeglądarce.
        </p>
      </section>
    </main>
  );
}
