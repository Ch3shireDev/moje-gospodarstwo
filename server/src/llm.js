// Opcjonalnie: LLM przepisuje wynik reguł na ludzki język.
// Bez ANTHROPIC_API_KEY zwraca null i używamy szablonu z engine.js.
// LLM niczego nie wylicza i nie wymyśla – dostaje gotowe liczby i akcje.
import { env } from './platform.js';

export async function llmSummary(assessment, place, fetchImpl = fetch) {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const facts = {
    miejsce: place,
    data_analizy: assessment.date,
    uprawa: assessment.crop.short,
    gleba: assessment.soil.label,
    stan_wody: assessment.status.label,
    bilans_61_dni_mm: assessment.metrics,
    na_tle_lat: { percentyl: assessment.history.percentile, srednia_mm: assessment.history.meanKbw },
    przyczyny: assessment.causes.list.map((c) => c.title),
    retencja: (assessment.recommendations?.retencja ?? []).map((a) => a.title),
    agrotechnika: (assessment.recommendations?.agrotechnika ?? []).map((a) => a.title),
    nawadnianie: (assessment.recommendations?.nawadnianie ?? []).map((a) => a.title),
  };

  try {
    const res = await fetchImpl('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(12_000),
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: env.LLM_MODEL || 'claude-haiku-5-5',
        // Bez "myślenia": inaczej tokeny rozumowania zjadają limit i tekst urywa się w pół zdania.
        thinking: { type: 'disabled' },
        max_tokens: 1024,
        system:
          'Jesteś doradcą rolniczym. Na podstawie podanych faktów napisz 2–3 krótkie zdania po polsku dla rolnika: co się dzieje z wodą na działce, dlaczego, i co najważniejszego ma zrobić (najpierw retencja, potem agrotechnika, nawadnianie na końcu). Prosty język, bez żargonu, bez wymyślania liczb spoza danych, bez wstępów.',
        messages: [{ role: 'user', content: JSON.stringify(facts) }],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`[llm] Anthropic API ${res.status}: ${body.slice(0, 300)} – używam szablonu`);
      return null;
    }
    const json = await res.json();
    // Tylko pełna odpowiedź. Ucięta (max_tokens) albo odmowa -> szablon, nigdy pół zdania.
    if (json.stop_reason !== 'end_turn') {
      console.warn(`[llm] odpowiedź niepełna (stop_reason=${json.stop_reason}) – używam szablonu`);
      return null;
    }
    const text = (json.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim();
    return text || null;
  } catch (e) {
    console.warn(`[llm] ${e.message} – używam szablonu`);
    return null;
  }
}
