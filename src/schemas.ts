import { z } from 'zod';

const jsonValue: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(), z.number(), z.boolean(), z.null(),
    z.array(jsonValue),
    z.record(z.string(), jsonValue),
  ]),
);

export const jevDecideInputSchema = {
  context: jsonValue,
  question: z.string().trim().min(1),
  choices: z.record(z.string().trim().min(1), z.string().trim().min(1)).refine(
    (choices) => Object.keys(choices).length > 0,
    'At least one choice is required',
  ),
};

export const decisionResultSchema = z.object({
  choice: z.string().min(1),
  confidence: z.number().min(0).max(1),
  scores: z.record(z.string(), z.number().min(0).max(1)),
});

export type JevDecisionInput = {
  context: unknown;
  question: string;
  choices: Record<string, string>;
};
export type JevDecisionResult = z.infer<typeof decisionResultSchema>;
