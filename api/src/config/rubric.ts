/**
 * Versioned stage rubric. PROVISIONAL: the four indicators per stage and the 0-10
 * range are the project's working definition, not a validated instrument, and no
 * passing threshold is defined here.
 */
import type { StageId } from "@skrp/shared";

export const RUBRIC_VERSION = "rubric-provisional-v1";
export const CRITERION_MAX_SCORE = 10;

export interface Criterion {
  key: string;
  label: string;
  description: string;
}

export const RUBRIC: Record<StageId, readonly Criterion[]> = {
  understand: [
    {
      key: "goal",
      label: "Identifikasi tujuan",
      description: "Tujuan masalah dirumuskan dengan tepat.",
    },
    {
      key: "inputs",
      label: "Identifikasi input",
      description:
        "Data masukan yang dibutuhkan disebutkan dengan benar dan lengkap.",
    },
    {
      key: "outputs",
      label: "Identifikasi output",
      description:
        "Keluaran yang diharapkan disebutkan dengan benar dan sesuai format.",
    },
    {
      key: "consistency",
      label: "Konsistensi logis",
      description:
        "Tujuan, input, output, dan batasan masalah saling konsisten.",
    },
  ],
  design: [
    {
      key: "alignment",
      label: "Kesesuaian dengan spesifikasi",
      description:
        "Rancangan sesuai dengan spesifikasi masalah (aturan, input, output).",
    },
    {
      key: "step_order",
      label: "Ketepatan dan urutan langkah",
      description: "Langkah-langkah benar dan berurutan secara logis.",
    },
    {
      key: "control_structures",
      label: "Representasi proses dan struktur kendali",
      description:
        "Proses, percabangan, dan perulangan direpresentasikan dengan tepat (pseudocode/flowchart).",
    },
    {
      key: "completeness",
      label: "Kelengkapan dan konsistensi",
      description:
        "Rancangan lengkap (termasuk kasus batas) dan tidak saling bertentangan.",
    },
  ],
  implement: [
    {
      key: "syntax",
      label: "Sintaks dan konstruksi Python",
      description: "Sintaks benar dan konstruksi Python yang dipakai sesuai.",
    },
    {
      key: "logic",
      label: "Implementasi proses dan struktur kendali",
      description:
        "Proses, percabangan, dan perulangan diimplementasikan dengan benar.",
    },
    {
      key: "design_consistency",
      label: "Konsistensi dengan rancangan",
      description: "Kode sesuai dengan algoritma yang dirancang siswa.",
    },
    {
      key: "completeness",
      label: "Kelengkapan dan kemampuan dijalankan",
      description: "Program lengkap dan dapat dijalankan sampai selesai.",
    },
  ],
  test: [
    {
      key: "test_cases",
      label: "Ketepatan kasus uji",
      description: "Kasus uji yang dipakai sesuai dan mencakup kasus penting.",
    },
    {
      key: "comparison",
      label: "Perbandingan output harapan dan aktual",
      description: "Output harapan dan aktual dibandingkan dengan benar.",
    },
    {
      key: "diagnosis",
      label: "Diagnosis kesalahan",
      description: "Kesalahan didiagnosis berdasarkan bukti yang tersedia.",
    },
    {
      key: "correction",
      label: "Perbaikan dan uji ulang",
      description: "Perbaikan dilakukan dan diuji ulang.",
    },
  ],
};

export const stageMaxScore = (stage: StageId) =>
  RUBRIC[stage].length * CRITERION_MAX_SCORE;
