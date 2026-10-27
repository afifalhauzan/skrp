/**
 * Backend-owned definition of the three learning cases. The AI prompts, routing and
 * test evidence are built from THIS file, never from client-supplied data.
 * (The web app keeps its own copy for display (web/src/lib/mock-data.ts); ids, titles,
 * rules and tests must match, which web/tests/cases-sync.test.ts enforces. Optional
 * algorithmic-strategy exploration lives only in the web copy: it is never graded.
 * Expose with GET /api/cases.)
 */
import type { SupportLevel } from "@skrp/shared";

export interface CaseTest {
  id: string;
  label: string;
  stdin: string;
  expected: string;
}

export interface CaseConfig {
  id: string;
  number: number;
  title: string;
  /** Macro scaffolding level of this case. */
  support: SupportLevel;
  goal: string;
  expected: string;
  rules: string[];
  tests: CaseTest[];
}

export const CASES: readonly CaseConfig[] = [
  {
    id: "case-1",
    number: 1,
    title: "Sistem otomasi perhitungan tarif parkir progresif",
    support: "HIGH",
    goal: "Buat program Python yang menghitung biaya parkir mobil atau motor dengan aturan tarif bertingkat.",
    expected:
      "Program menerima jenis kendaraan dan lama parkir, lalu menampilkan biaya parkir yang sesuai.",
    rules: [
      "Mobil: jam pertama Rp5.000, setiap jam berikutnya Rp3.000.",
      "Motor: jam pertama Rp2.000, setiap jam berikutnya Rp1.000.",
      "Tarif maksimum per hari: mobil Rp20.000, motor Rp10.000.",
      "Input: baris 1 jenis kendaraan (mobil atau motor), baris 2 lama parkir dalam jam (bilangan bulat, minimal 1).",
      "Output: satu baris dengan format Tarif: <angka>, contoh Tarif: 8000.",
    ],
    tests: [
      {
        id: "t1",
        label: "Mobil, 1 jam",
        stdin: "mobil\n1",
        expected: "Tarif: 5000",
      },
      {
        id: "t2",
        label: "Mobil, 2 jam",
        stdin: "mobil\n2",
        expected: "Tarif: 8000",
      },
      {
        id: "t3",
        label: "Motor, 4 jam",
        stdin: "motor\n4",
        expected: "Tarif: 5000",
      },
      {
        id: "t4",
        label: "Mobil, 7 jam (kena batas maksimum)",
        stdin: "mobil\n7",
        expected: "Tarif: 20000",
      },
      {
        id: "t5",
        label: "Motor, 12 jam (kena batas maksimum)",
        stdin: "motor\n12",
        expected: "Tarif: 10000",
      },
    ],
  },
  {
    id: "case-2",
    number: 2,
    title: "Kalkulator ongkos kirim paket",
    support: "MODERATE",
    goal: "Buat program Python yang menghitung ongkos kirim satu paket berdasarkan layanan pengiriman dan berat paket.",
    expected:
      "Program menerima layanan dan berat paket, lalu menampilkan ongkos kirim yang sesuai.",
    rules: [
      "Reguler: Rp8.000 per kg untuk 5 kg pertama, lalu Rp6.000 per kg untuk kilogram berikutnya.",
      "Express: Rp15.000 per kg untuk 5 kg pertama, lalu Rp12.000 per kg untuk kilogram berikutnya.",
      "Ongkos kirim maksimum per paket: reguler Rp100.000, express Rp180.000.",
      "Input: baris 1 layanan (reguler atau express), baris 2 berat paket dalam kg (bilangan bulat, minimal 1).",
      "Output: satu baris dengan format Ongkir: <angka>, contoh Ongkir: 58000.",
    ],
    tests: [
      {
        id: "t1",
        label: "Reguler, 1 kg",
        stdin: "reguler\n1",
        expected: "Ongkir: 8000",
      },
      {
        id: "t2",
        label: "Reguler, 5 kg (tepat di batas berat)",
        stdin: "reguler\n5",
        expected: "Ongkir: 40000",
      },
      {
        id: "t3",
        label: "Reguler, 8 kg (melewati batas berat)",
        stdin: "reguler\n8",
        expected: "Ongkir: 58000",
      },
      {
        id: "t4",
        label: "Express, 3 kg",
        stdin: "express\n3",
        expected: "Ongkir: 45000",
      },
      {
        id: "t5",
        label: "Express, 10 kg",
        stdin: "express\n10",
        expected: "Ongkir: 135000",
      },
      {
        id: "t6",
        label: "Reguler, 20 kg (kena batas maksimum)",
        stdin: "reguler\n20",
        expected: "Ongkir: 100000",
      },
      {
        id: "t7",
        label: "Express, 15 kg (kena batas maksimum)",
        stdin: "express\n15",
        expected: "Ongkir: 180000",
      },
    ],
  },
  {
    id: "case-3",
    number: 3,
    title: "Kalkulator denda keterlambatan perpustakaan",
    support: "LOW",
    goal: "Buat program Python yang menghitung denda keterlambatan berdasarkan jenis koleksi dan jumlah hari terlambat.",
    expected:
      "Program menerima jenis koleksi dan jumlah hari terlambat, lalu menampilkan denda yang sesuai.",
    rules: [
      "Denda per hari: buku Rp1.000, majalah Rp500, referensi Rp2.000.",
      "Tidak terlambat (0 hari): denda Rp0.",
      "Jika terlambat, denda minimum Rp1.000 meskipun hasil perhitungan lebih kecil.",
      "Denda maksimum: buku Rp20.000, majalah Rp10.000, referensi Rp40.000.",
      "Input: baris 1 jenis koleksi (buku, majalah, atau referensi), baris 2 jumlah hari terlambat (bilangan bulat, minimal 0).",
      "Output: satu baris dengan format Denda: <angka>, contoh Denda: 5000.",
    ],
    tests: [
      {
        id: "t1",
        label: "Buku, tidak terlambat",
        stdin: "buku\n0",
        expected: "Denda: 0",
      },
      {
        id: "t2",
        label: "Buku, terlambat 5 hari",
        stdin: "buku\n5",
        expected: "Denda: 5000",
      },
      {
        id: "t3",
        label: "Majalah, terlambat 1 hari (kena denda minimum)",
        stdin: "majalah\n1",
        expected: "Denda: 1000",
      },
      {
        id: "t4",
        label: "Majalah, terlambat 3 hari",
        stdin: "majalah\n3",
        expected: "Denda: 1500",
      },
      {
        id: "t5",
        label: "Referensi, terlambat 10 hari",
        stdin: "referensi\n10",
        expected: "Denda: 20000",
      },
      {
        id: "t6",
        label: "Buku, terlambat 30 hari (kena batas maksimum)",
        stdin: "buku\n30",
        expected: "Denda: 20000",
      },
      {
        id: "t7",
        label: "Referensi, terlambat 25 hari (kena batas maksimum)",
        stdin: "referensi\n25",
        expected: "Denda: 40000",
      },
    ],
  },
];

export const CASE_ORDER: readonly string[] = CASES.map((c) => c.id);

export const getCaseConfig = (caseId: string): CaseConfig | undefined =>
  CASES.find((c) => c.id === caseId);

export const STAGES = ["understand", "design", "implement", "test"] as const;
