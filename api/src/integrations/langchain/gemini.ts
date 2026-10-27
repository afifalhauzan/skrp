import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  AiError,
  type AiFailureCategory,
  type ModelRunner,
  type StructuredRequest,
} from "./types";

export interface GeminiConfig {
  apiKey?: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

/** Maps any provider/library error to one of our categories. Never returns raw text. */
export function classifyProviderError(error: unknown): AiFailureCategory {
  if (error instanceof AiError) return error.category;
  const e = error as {
    name?: string;
    message?: string;
    status?: number;
    code?: string | number;
  } | null;
  const name = e?.name ?? "";
  const text = `${e?.message ?? ""} ${e?.code ?? ""}`;
  const status =
    typeof e?.status === "number"
      ? e.status
      : Number(/\[(\d{3})/.exec(text)?.[1] ?? NaN);

  if (
    name === "AbortError" ||
    name === "TimeoutError" ||
    /timed? ?out|aborted/i.test(text)
  )
    return "TIMEOUT";
  if (status === 429 || /RESOURCE_EXHAUSTED|rate.?limit|quota/i.test(text))
    return "RATE_LIMITED";
  if (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    /API[_ ]KEY|PERMISSION_DENIED|not found for API|is not found/i.test(text)
  ) {
    return "NOT_CONFIGURED";
  }
  if (
    /OutputParser|Failed to parse|ZodError|invalid json|Unexpected token/i.test(
      `${name} ${text}`,
    )
  )
    return "INVALID_RESPONSE";
  return "UNAVAILABLE";
}

const RETRYABLE: ReadonlySet<AiFailureCategory> = new Set([
  "TIMEOUT",
  "RATE_LIMITED",
  "UNAVAILABLE",
  "INVALID_RESPONSE",
]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * LangChain.js orchestration of one Gemini model. It only invokes the model with
 * structured output; it owns no learning policy. Retries are bounded and only for
 * transient categories; misconfiguration fails immediately.
 */
export function createGeminiRunner(config: GeminiConfig): ModelRunner {
  let model: ChatGoogleGenerativeAI | null = null;
  const getModel = () => {
    if (!config.apiKey) throw new AiError("NOT_CONFIGURED");
    // maxRetries: 0 here; retries are handled below so they stay bounded and observable.
    model ??= new ChatGoogleGenerativeAI({
      apiKey: config.apiKey,
      model: config.model,
      temperature: 0.2,
      maxRetries: 0,
    });
    return model;
  };

  return {
    modelName: config.model,
    async invokeStructured(request: StructuredRequest) {
      const started = Date.now();
      let lastCategory: AiFailureCategory = "UNAVAILABLE";
      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          const structured = getModel().withStructuredOutput(request.schema, {
            name: request.name,
          });
          const output = await structured.invoke(
            [
              ["system", request.system],
              ["human", request.user],
            ],
            { signal: AbortSignal.timeout(config.timeoutMs) },
          );
          return {
            output,
            modelName: config.model,
            durationMs: Date.now() - started,
          };
        } catch (error) {
          lastCategory = classifyProviderError(error);
          if (!RETRYABLE.has(lastCategory) || attempt === config.maxRetries)
            break;
          await sleep(500 * 2 ** attempt);
        }
      }
      throw new AiError(lastCategory);
    },
  };
}
