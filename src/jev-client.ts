import { ConfigurationError, JevApiError } from './errors.js';
import { decisionResultSchema, type JevDecisionInput, type JevDecisionResult } from './schemas.js';

export const DEFAULT_JEV_API_BASE_URL = 'https://api.typesafe.ai';

type ClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetchImplementation?: typeof fetch;
};

export class JevClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: ClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.JEV_API_KEY ?? '';
    this.baseUrl = (options.baseUrl ?? process.env.JEV_API_BASE_URL ?? DEFAULT_JEV_API_BASE_URL).replace(/\/+$/, '');
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  async decide(input: JevDecisionInput): Promise<JevDecisionResult> {
    if (!this.apiKey) throw new ConfigurationError('JEV_API_KEY is required to make a decision.');
    const response = await this.fetchImplementation(`${this.baseUrl}/v1/systemone`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        model: 'jev-latest',
        state: input.context,
        questions: {
          decision: {
            type: 'choice',
            instructions: input.question,
            criteria: input.choices,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new JevApiError(`Jev API returned HTTP ${response.status}.`, response.status);
    }
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new JevApiError('Jev API returned invalid JSON.');
    }

    const envelope = payload as { answers?: unknown } | null;
    if (!envelope || typeof envelope !== 'object') throw new JevApiError('Jev API returned an invalid response.');

    const data = envelope.answers && typeof envelope.answers === 'object'
      ? (envelope.answers as Record<string, unknown>).decision
      : undefined;
    if (!data || typeof data !== 'object' || (data as { type?: unknown }).type !== 'choice') {
      throw new JevApiError('Jev API response did not contain a choice answer.');
    }
    const answer = data as { choice?: unknown; confidence?: unknown; probabilities?: unknown };
    const parsed = decisionResultSchema.safeParse({
      choice: answer.choice,
      confidence: answer.confidence,
      scores: answer.probabilities,
    });
    if (!parsed.success) throw new JevApiError('Jev API response data did not match the decision result schema.');
    return parsed.data;
  }
}
