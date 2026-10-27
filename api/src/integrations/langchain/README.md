# LangChain integration (Gemini)

Orchestration of Gemini calls with **LangChain.js** (`@langchain/google-genai`). It is the only
place the model is invoked; controllers and Prisma code never import it directly.

| File | Responsibility |
| --- | --- |
| `gemini.ts` | `createGeminiRunner`: model setup from config, per-attempt timeout, bounded retries for transient failures, error classification (`classifyProviderError`) |
| `evaluation.ts` | evaluation prompt, model-facing schema, **strict** output validation, `evaluateStageWithModel` |
| `assistance.ts` | hint prompt (only the permitted level is stated), hint validation, static fallbacks |
| `types.ts` | `ModelRunner` interface (the seam used by tests), `AiError` and its client-safe messages |

Rules this layer follows:

- LangChain orchestrates; **policy stays in application code**: levels, completion, progress and routing
  live in `src/policies` and `src/services`. The model returns text and scores only.
- Structured output is requested with `withStructuredOutput(zodSchema)`, then validated again with stricter
  application schemas (exact rubric keys, integer 0–10 scores, echoed stage/submission reference, no code at L1–L3).
- A missing key fails with `NOT_CONFIGURED`; a failed call is never replaced with fabricated output.
- Raw provider text is never returned or logged; `AiError.message` is a fixed client-safe string.
- No LangGraph, agents, tools or background jobs.

See `docs/ai-evaluation-and-scaffolding.md` for configuration, policies, and troubleshooting.
