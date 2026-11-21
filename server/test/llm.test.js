import { test } from 'node:test';
import assert from 'node:assert/strict';
import { llmSummary } from '../src/llm.js';

const assessment = {
  date: '2025-07-15', crop: { short: 'kukurydza' }, soil: { label: 'II' }, status: { label: 'Sucho' },
  metrics: {}, history: {}, causes: { list: [] }, recommendations: {},
};
const fakeFetch = (json, ok = true, status = 200) => async () => ({ ok, status, json: async () => json, text: async () => JSON.stringify(json) });

test('LLM: ucięta odpowiedź (max_tokens) daje szablon, a nie pół zdania', async () => {
  process.env.ANTHROPIC_API_KEY = 'test';
  const warn = console.warn; console.warn = () => {};
  try {
    const cut = { stop_reason: 'max_tokens', content: [{ type: 'text', text: 'Od 22 września opadło 46,8 mm, więc na polu' }] };
    assert.equal(await llmSummary(assessment, 'X', fakeFetch(cut)), null);
    assert.equal(await llmSummary(assessment, 'X', fakeFetch({ error: {} }, false, 401)), null);
    const full = { stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: 'Jest sucho. ' }, { type: 'text', text: 'Zatrzymaj wodę.' }] };
    assert.equal(await llmSummary(assessment, 'X', fakeFetch(full)), 'Jest sucho. Zatrzymaj wodę.');
  } finally {
    console.warn = warn;
    delete process.env.ANTHROPIC_API_KEY;
  }
});
