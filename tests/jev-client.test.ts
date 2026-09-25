import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConfigurationError, JevApiError } from '../src/errors.js';
import { JevClient } from '../src/jev-client.js';

test('sends generic decision request to documented endpoint and validates result', async () => {
  let requestedUrl = '';
  let requestedInit: RequestInit | undefined;
  const client = new JevClient({
    apiKey: 'test-key',
    baseUrl: 'https://api.example.test/',
    fetchImplementation: async (input, init) => {
      requestedUrl = String(input);
      requestedInit = init;
      return Response.json({ model: 'jev-latest', answers: { decision: { type: 'choice', choice: 'left', confidence: 0.7, probabilities: { left: 0.7, right: 0.3 } } }, usage: {} });
    },
  });
  const result = await client.decide({ context: { x: 1 }, question: 'Pick one', choices: { left: 'First', right: 'Second' } });
  assert.equal(requestedUrl, 'https://api.example.test/v1/systemone');
  assert.equal(new Headers(requestedInit?.headers).get('authorization'), 'Bearer test-key');
  assert.deepEqual(JSON.parse(String(requestedInit?.body)), {
    model: 'jev-latest',
    state: { x: 1 },
    questions: { decision: { type: 'choice', instructions: 'Pick one', criteria: { left: 'First', right: 'Second' } } },
  });
  assert.equal(result.choice, 'left');
});

test('requires an API key', async () => {
  await assert.rejects(new JevClient({ apiKey: '' }).decide({ context: null, question: 'Choose', choices: { a: 'A' } }), ConfigurationError);
});

test('reports unsuccessful and malformed API responses', async () => {
  const failed = new JevClient({ apiKey: 'k', fetchImplementation: async () => new Response('denied', { status: 403 }) });
  await assert.rejects(failed.decide({ context: null, question: 'Choose', choices: { a: 'A' } }), /HTTP 403/);
  const malformed = new JevClient({ apiKey: 'k', fetchImplementation: async () => Response.json({ answers: { decision: { type: 'choice', choice: 'a', confidence: 1.2, probabilities: {} } } }) });
  await assert.rejects(malformed.decide({ context: null, question: 'Choose', choices: { a: 'A' } }), JevApiError);
});
