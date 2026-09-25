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

test('uses the TypeSafe AI System One endpoint by default', async () => {
  let requestedUrl = '';
  const client = new JevClient({
    apiKey: 'test-key',
    fetchImplementation: async (input) => {
      requestedUrl = String(input);
      return Response.json({ model: 'jev-latest', answers: { decision: { type: 'choice', choice: 'yes', confidence: 1, probabilities: { yes: 1 } } }, usage: {} });
    },
  });
  await client.decide({ context: {}, question: 'Choose', choices: { yes: 'Yes' } });
  assert.equal(requestedUrl, 'https://api.typesafe.ai/v1/systemone');
});

test('allows JEV_API_BASE_URL to override the default origin', async () => {
  const originalBaseUrl = process.env.JEV_API_BASE_URL;
  process.env.JEV_API_BASE_URL = 'https://custom.typesafe.test/';
  try {
    let requestedUrl = '';
    const client = new JevClient({
      apiKey: 'test-key',
      fetchImplementation: async (input) => {
        requestedUrl = String(input);
        return Response.json({ model: 'jev-latest', answers: { decision: { type: 'choice', choice: 'yes', confidence: 1, probabilities: { yes: 1 } } }, usage: {} });
      },
    });
    await client.decide({ context: {}, question: 'Choose', choices: { yes: 'Yes' } });
    assert.equal(requestedUrl, 'https://custom.typesafe.test/v1/systemone');
  } finally {
    if (originalBaseUrl === undefined) delete process.env.JEV_API_BASE_URL;
    else process.env.JEV_API_BASE_URL = originalBaseUrl;
  }
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
