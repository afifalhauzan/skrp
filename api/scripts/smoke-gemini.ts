/**
 * Real-API smoke test. Calls Gemini ONCE for a stage evaluation and ONCE for an L1 hint
 * through the same LangChain code path the server uses, then validates both outputs
 * with the application schemas. No database needed.
 *
 *   GEMINI_API_KEY=... [GEMINI_MODEL=...] pnpm --filter @skrp/api smoke:gemini
 *
 * Exit code 0 only if both calls succeed and validate. Costs two small model requests.
 */
import { DEFAULT_GEMINI_MODEL } from "../src/config/env";
import { getCaseConfig } from "../src/config/cases";
import {
  AiError,
  createGeminiRunner,
  evaluateStageWithModel,
  generateHintWithModel,
} from "../src/integrations/langchain";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(
      "GEMINI_API_KEY is not set (this smoke test never falls back to mock output).",
    );
    process.exit(2);
  }
  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const runner = createGeminiRunner({
    apiKey,
    model,
    timeoutMs: 30_000,
    maxRetries: 1,
  });
  const caseConfig = getCaseConfig("case-1")!;
  console.log(`model: ${model}`);

  const evaluation = await evaluateStageWithModel(runner, {
    caseConfig,
    stage: "understand",
    submissionRef: "smoketest0001",
    artifacts: [
      {
        label: "Spesifikasi masalah dari siswa",
        content:
          "Tujuan: menghitung tarif parkir\nInput: jenis kendaraan dan lama parkir\nProses: jam pertama lebih mahal, jam berikutnya lebih murah, ada batas maksimum\nOutput: Tarif: <angka>\nBatasan: maksimum Rp20.000 untuk mobil",
      },
    ],
    evidence: [],
  });
  console.log(
    `evaluation ok in ${evaluation.durationMs} ms, total ${evaluation.result.criteria.reduce((s, c) => s + c.score, 0)}/40`,
  );
  for (const c of evaluation.result.criteria)
    console.log(`  ${c.key}: ${c.score}/10 — ${c.evidence.slice(0, 90)}`);
  console.log(`  feedback: ${evaluation.result.feedback.slice(0, 160)}`);

  const hint = await generateHintWithModel(runner, {
    caseConfig,
    stage: "design",
    level: "L1",
    work: [
      { label: "Pseudocode siswa", content: "MULAI\nbaca input\nSELESAI" },
    ],
    previousHints: [],
  });
  console.log(
    `hint ok in ${hint.durationMs} ms (${hint.assistanceType}): ${hint.hint.slice(0, 200)}`,
  );
  console.log("SMOKE TEST PASSED");
}

main().catch((error) => {
  console.error(
    error instanceof AiError
      ? `FAILED: ${error.category} — ${error.message}`
      : `FAILED: ${(error as Error).message}`,
  );
  process.exit(1);
});
