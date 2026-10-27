import type { StageId } from "./types";

/**
 * Shared Indonesian copy about the core task vs. optional exploration of
 * "strategi algoritmik". Case-specific ideas live in each case's `exploration`
 * (see mock-data.ts); this file only holds the wording used across screens.
 */

export const LABEL_CORE = "Tugas Inti";
export const LABEL_EXPLORATION = "Eksplorasi Opsional: Strategi Algoritmik";
export const BADGE_EXPLORATION = "Eksplorasi opsional";

/** General introduction of the learning media (landing page). */
export const INTRO_GENERAL =
  "Selain mempelajari pemrograman terstruktur melalui percabangan, perulangan, dan operasi perhitungan, kamu juga dapat mengeksplorasi strategi algoritmik untuk menyelesaikan masalah dengan pendekatan yang berbeda. Eksplorasi ini bersifat opsional dan disesuaikan dengan karakteristik setiap kasus.";

/** Full explanation of the optional section (mission briefing). */
export const EXPLORATION_INTRO =
  "Setelah menyelesaikan tugas inti, kamu dapat mencoba mengembangkan solusi dengan strategi algoritmik atau algoritma lain yang sesuai dengan masalah. Misalnya, brute force untuk memeriksa kemungkinan atau mencari data secara langsung, greedy untuk masalah yang sesuai, divide and conquer untuk membagi masalah menjadi bagian yang lebih kecil, serta algoritma pengurutan seperti Bubble Sort dan Merge Sort.";
export const EXPLORATION_NOT_REQUIRED =
  "Tidak semua strategi cocok untuk setiap kasus. Kamu tidak harus menggunakan strategi tertentu untuk menyelesaikan tugas inti.";
export const EXPLORATION_NOT_GRADED =
  "Eksplorasi tidak dinilai dan tidak memengaruhi penyelesaian tahap, penyelesaian kasus, maupun kasus berikutnya.";

/** One line for case cards. */
export const CASE_CARD_NOTE =
  "Tugas inti + eksplorasi opsional strategi algoritmik";

/** Instruction shown at the top of each stage workspace. */
export const STAGE_COPY: Record<StageId, string> = {
  understand:
    "Pahami masalah dan tuliskan spesifikasinya. Fokus dulu pada tugas inti; eksplorasi strategi algoritmik bersifat opsional dan baru relevan setelah kamu merancang dan menyelesaikan tugas inti.",
  design:
    "Rancang algoritma yang sesuai dengan spesifikasi masalah menggunakan pseudocode atau flowchart. Fokus pada ketepatan logika dan urutan penyelesaian. Jika ingin mencoba pendekatan lain, kamu dapat mengeksplorasi strategi algoritmik yang relevan dengan kasus ini.",
  implement:
    "Implementasikan algoritma yang telah kamu rancang ke dalam Python. Pastikan program sesuai dengan spesifikasi masalah dan dapat diuji. Penggunaan strategi algoritmik tambahan merupakan pilihan, bukan syarat untuk menyelesaikan tugas inti.",
  test: "Pengujian hanya memeriksa tugas inti. Kodemu dijalankan dengan setiap skenario di bawah, dan baris terakhir yang dicetak program harus sama persis dengan ekspektasi. Eksplorasi strategi algoritmik opsional tidak dinilai di tahap ini.",
};

/** Extra sentence for the study buddy, only where exploration is relevant. */
export const ASSISTANT_STRATEGY_HINT =
  "Selesaikan tugas inti dulu. Setelah itu, jika mau, kamu bisa menjelajahi strategi algoritmik opsional di bagian Eksplorasi Opsional; itu bukan syarat untuk lanjut.";
export const ASSISTANT_HINT_STAGES: StageId[] = ["design", "implement"];

/** Shown on the case review once the core task is done. */
export const COMPLETION_NOTE =
  "Tugas inti sudah selesai. Kamu masih bisa mencoba eksplorasi strategi algoritmik secara opsional; ini tidak memengaruhi penilaian maupun kasus berikutnya.";
