// Opcjonalnie: LLM przepisuje wynik reguł na ludzki język.
// Bez ANTHROPIC_API_KEY zwraca null i używamy szablonu z engine.js.
// LLM niczego nie wylicza i nie wymyśla – dostaje gotowe liczby i akcje.

export async function llmSummary(assessment, place) {
  const key = process.env.ANTHROPIC_API_KEY;
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
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: AbortSignal.timeout(12_000),
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.LLM_MODEL || 'claude-haiku-5-5',
        max_tokens: 300,
        system:
          'Jesteś doradcą rolniczym. Na podstawie podanych faktów napisz 2–3 krótkie zdania po polsku dla rolnika: co się dzieje z wodą na działce, dlaczego, i co najważniejszego ma zrobić (najpierw retencja, potem agrotechnika, nawadnianie na końcu). Prosty język, bez żargonu, bez wymyślania liczb spoza danych, bez wstępów.',
        messages: [{ role: 'user', content: JSON.stringify(facts) }],
      }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.content?.find((c) => c.type === 'text')?.text?.trim() || null;
  } catch {
    return null;
  }
}
