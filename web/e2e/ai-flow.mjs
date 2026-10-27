/**
 * Manual browser check of the AI evaluation / hint UI against a running stack.
 *
 *   API:  tests/support/fakeAiServer.ts (controllable FAKE model, no Gemini key needed)
 *   WEB:  NEXT_PUBLIC_API_MODE=live API_INTERNAL_URL=http://localhost:4040 INTERNAL_API_KEY=... next dev -p 3002
 *   RUN:  BASE=http://127.0.0.1:3002 FAKE=http://127.0.0.1:4040 node web/e2e/ai-flow.mjs
 *
 * Uses the pre-installed Playwright. Run `node web/scripts/copy-pyodide.mjs` first when using `next dev` directly.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.env.BASE ?? "http://127.0.0.1:3002";
const FAKE = process.env.FAKE ?? "http://127.0.0.1:4040";
const CODE = process.env.CODE ?? "PY001";

const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  -> " + extra : ""}`,
  );
};
const setMode = (m) =>
  fetch(`${FAKE}/__fake/mode`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(m),
  });

const SOLUTION = `jenis = input()
jam = int(input())
if jenis == "mobil":
    t = min(5000 + 3000 * (jam - 1), 20000)
else:
    t = min(2000 + 1000 * (jam - 1), 10000)
print(f"Tarif: {t}")`;

const browser = await chromium.launch();
const page = await browser.newPage();
page.setDefaultTimeout(30000);
const btn = (name) => page.getByRole("button", { name });
const next = (n) => btn(new RegExp(`Lanjut ke ${n}`));

await setMode({ evaluate: "ok", hint: "ok", delayMs: 0 });

// ---- login + stage 1 -------------------------------------------------------
await page.goto(`${BASE}/login`);
await page.fill("#code", CODE);
await page.click("button[type=submit]");
await page.waitForURL("**/mission");
await page.goto(`${BASE}/learn/case-1/understand`);
await btn("Periksa jawaban").waitFor();
check(
  "Periksa jawaban button is present in live mode",
  await btn("Periksa jawaban").isVisible(),
);
for (const label of ["Tujuan", "Input", "Proses", "Output", "Batasan"]) {
  await page.fill(`textarea[aria-label="${label}"]`, `isi ${label}`);
}
check("Lanjut is locked before evaluation", await next("02").isDisabled());

// failure: provider timeout
await setMode({ evaluate: "fail" });
await btn("Periksa jawaban").click();
await page.getByTestId("evaluation-error").waitFor();
const errText = await page.getByTestId("evaluation-error").innerText();
check(
  "failure shows an honest error with retry",
  /belum berhasil/i.test(errText) && /Coba lagi/.test(errText),
  errText.replace(/\s+/g, " ").slice(0, 120),
);
check(
  "failure keeps the student's work",
  (await page.inputValue('textarea[aria-label="Tujuan"]')) === "isi Tujuan",
);
check("failure does not unlock the next stage", await next("02").isDisabled());

// retry succeeds
await setMode({ evaluate: "ok" });
await page
  .getByTestId("evaluation-error")
  .getByRole("button", { name: "Coba lagi" })
  .click();
await page.getByTestId("evaluation-result").waitFor();
const result = await page.getByTestId("evaluation-result").innerText();
check(
  "success shows the validated score breakdown",
  result.includes("32/40") &&
    result.includes("Identifikasi tujuan") &&
    result.includes("Boleh lanjut"),
  result.replace(/\s+/g, " ").slice(0, 100),
);
check(
  "Lanjut unlocks only after a successful evaluation",
  await next("02").isEnabled(),
);

// editing after evaluation marks it stale
await page.fill('textarea[aria-label="Output"]', "isi Output diubah");
await page.getByText("Pekerjaan berubah").waitFor();
check(
  "editing after evaluation shows the old result as history and locks Lanjut",
  await next("02").isDisabled(),
);
await btn("Periksa jawaban").click();
await page.getByText("Boleh lanjut").waitFor();
check(
  "re-evaluating the new version unlocks again",
  await next("02").isEnabled(),
);
await next("02").click();
await page.waitForURL("**/design");

// ---- hints (design stage) ---------------------------------------------------
await setMode({ delayMs: 700 });
await btn("Minta petunjuk").click();
check(
  "hint shows a loading state",
  await page.getByText("Sedang menyiapkan petunjuk").isVisible(),
);
await page.getByTestId("hint-latest").waitFor();
await setMode({ delayMs: 0 });
const levels = [];
levels.push(await page.getByTestId("hint-latest").innerText());
for (let i = 0; i < 2; i++) {
  await btn("Minta petunjuk lagi").click();
  await page.waitForTimeout(600);
  levels.push(await page.getByTestId("hint-latest").innerText());
}
const seen = levels.map((t) => /L(\d)/.exec(t)?.[1]);
check(
  "hint levels follow the backend policy (L1, L1, L2)",
  seen.join(",") === "1,1,2",
  seen.join(","),
);
await setMode({ hint: "fail" });
await btn("Minta petunjuk lagi").click();
await page.waitForTimeout(800);
check(
  "a failed hint is labelled as a fallback, not an AI answer",
  (await page.getByTestId("hint-latest").innerText()).includes("Cadangan"),
);
await setMode({ hint: "ok" });
await page.getByText(/Riwayat petunjuk/).click();
check(
  "hint history is viewable",
  (await page.getByTestId("hint-history").locator("li").count()) >= 2,
);

// ---- stage 2..4 and case review ---------------------------------------------
await page.fill(
  'textarea[aria-label="Pseudocode"]',
  "MULAI\nbaca jenis dan jam\nhitung tarif\ntampilkan\nSELESAI",
);
await btn("Periksa jawaban").click();
await page.getByText("Boleh lanjut").waitFor();
await next("03").click();
await page.waitForURL("**/implement");

await page.waitForSelector(".cm-content");
await page.locator(".cm-content").click();
await page.keyboard.press("Control+A");
await page.keyboard.press("Delete");
await page.keyboard.insertText(SOLUTION);
await page.fill("#stdin", "mobil\n2");
await page.getByRole("button", { name: /Jalankan kode/ }).click();
await page
  .getByTestId("output-panel")
  .getByText("Tarif: 8000")
  .waitFor({ timeout: 90000 });
await btn("Periksa jawaban").click();
await page.getByText("Boleh lanjut").waitFor();
await next("04").click();
await page.waitForURL("**/test");

check(
  "test stage requires running the tests before evaluation",
  await btn("Periksa jawaban").isDisabled(),
);
await page.getByRole("button", { name: /Jalankan semua tes/ }).click();
await page.getByText(/Semua 5 skenario lulus/).waitFor({ timeout: 120000 });
await btn("Periksa jawaban").click();
await page.getByText("Boleh lanjut").waitFor();
await btn(/Selesaikan kasus/).click();
await page.waitForURL("**/case-review/case-1");
await page
  .getByText(/Lanjut ke Kasus 2/)
  .first()
  .waitFor();
const review = await page.locator("main").innerText();
check(
  "case review shows the backend routing decision and its provisional status",
  review.includes("Lanjut ke Kasus 2") &&
    /sementara/.test(review) &&
    /belum divalidasi/.test(review),
);
check(
  "case review shows an aggregate that is labelled non-final",
  /bukan penilaian akhir/.test(review),
);

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
