import type { z } from "zod";

export type AiFailureCategory =
  | "NOT_CONFIGURED"
  | "TIMEOUT"
  | "RATE_LIMITED"
  | "UNAVAILABLE"
  | "INVALID_RESPONSE";

/** Client-safe messages: raw provider text never leaves the integration layer. */
export const AI_ERROR_MESSAGES: Record<AiFailureCategory, string> = {
  NOT_CONFIGURED: "Layanan AI belum dikonfigurasi di server.",
  TIMEOUT: "Layanan AI terlalu lama merespons.",
  RATE_LIMITED: "Layanan AI sedang dibatasi. Coba lagi sebentar lagi.",
  UNAVAILABLE: "Layanan AI sedang tidak tersedia.",
  INVALID_RESPONSE: "Layanan AI mengembalikan respons yang tidak valid.",
};

export class AiError extends Error {
  constructor(readonly category: AiFailureCategory) {
    super(AI_ERROR_MESSAGES[category]);
    this.name = "AiError";
  }
}

export interface StructuredRequest {
  system: string;
  user: string;
  /** Schema handed to the model (kept lenient; strict validation happens afterwards). */
  schema: z.ZodType<Record<string, unknown>>;
  /** Short operation name for logs and the structured-output tool. */
  name: string;
}

export interface StructuredResponse {
  output: unknown;
  modelName: string;
  durationMs: number;
}

/**
 * The only thing the rest of the app knows about the model. Production uses the
 * LangChain/Gemini implementation; tests inject a fake.
 */
export interface ModelRunner {
  readonly modelName: string;
  invokeStructured(request: StructuredRequest): Promise<StructuredResponse>;
}
