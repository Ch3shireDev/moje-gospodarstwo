# Instrukcje dla Claude

Najpierw przeczytaj `docs/wymagania.md` (wymagania z regulaminu KOWR – **nadrzędne**), potem `context.md` (cel, architektura, pułapki w danych, kolejność prac). Źródłem prawdy są PDF-y w katalogu głównym.

- Język UI, komentarzy i commitów: polski.
- Każda zmiana ma przybliżać do zgodności z `docs/wymagania.md`. Po zrobieniu punktu zaktualizuj w nim status.
- Raport ma zachować kolejność: **ocena sytuacji wodnej → przyczyny → retencja → agrotechnika → nawadnianie (opcjonalnie)**. Żadnych rekomendacji bez oceny działki i żadnych gotowych tekstów niezależnych od danych.
- Brak danych pokazuj wprost. Bez pozornej precyzji, a niepewność ma być widoczna.
- Platforma: **web first** – ma działać w Chrome, Firefox, Edge, Safari i Opera na Windows. Do tego pełna responsywność i PWA: rolnik musi móc zrobić wszystko tylko na telefonie. Każdą zmianę UI sprawdzaj na desktopie i na wąskim ekranie. Odpowiedź ≤ 30 s na działkę.
- Backend (`server/`) preferuje zero zależności npm: `node:http`, globalny `fetch`, `node:test`, `node:zlib`. Zależność dodaj tylko, gdy bez niej nie da się zrobić wymaganej funkcji, z licencją permisywną (MIT, BSD, Apache-2.0, ISC) i wpisem w README.
- Po każdej zmianie w `server/src/engine.js` lub `server/src/sources/*` uruchom `npm test`.
- Treści edukacyjne są w `client/src/knowledge.js`, a źródła w `docs/zrodla.md`. Hierarchia źródeł: **nauka > organizacje przyrodnicze > instytucje państwowe**. Wody Polskie są dozwolone jako źródło danych i organ od formalności, ale przy konflikcie zaleceń wygrywają naukowcy i ekolodzy. **Bez Lasów Państwowych.** Parafrazuj, nie cytuj. Każda liczba musi mieć źródło.
- Każde nowe źródło danych, biblioteka albo użycie AI musi trafić do README: źródło, licencja, czy dane są na bieżąco czy wcześniej pobrane, data pobrania.
- Nie zgaduj formatów API. Przykładowe odpowiedzi są w `server/test/fixtures/` i `docs/api.md`. Nowe źródło = nowa fixtura z prawdziwej odpowiedzi.
- Nie zbieraj danych osobowych.
- Uruchamianie: `docker compose up --build` (prod) albo `docker compose -f docker-compose.dev.yml up` (dev).
