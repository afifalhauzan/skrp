/**
 * Backend-owned definition of the three learning cases. The AI prompts, routing and
 * test evidence are built from THIS file, never from client-supplied data.
 * (The web app keeps its own copy for display; ids and support levels must match.
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
        label: "Mobil, 7 jam (batas maksimum)",
        stdin: "mobil\n7",
        expected: "Tarif: 20000",
      },
      {
        id: "t5",
        label: "Motor, 12 jam (batas maksimum)",
        stdin: "motor\n12",
        expected: "Tarif: 10000",
      },
    ],
  },
  {
    id: "case-2",
    number: 2,
    title: "Koleksi buku kelas",
    support: "MODERATE",
    goal: "Buat program yang menghitung denda secara terstruktur menggunakan percabangan.",
    expected:
      "Program menerima jumlah hari terlambat dan menampilkan denda yang sesuai.",
    rules: [
      "Tidak terlambat (0 hari): denda Rp0.",
      "Hari ke-1 sampai ke-3: Rp1.000 per hari.",
      "Mulai hari ke-4: Rp2.000 per hari (hari ke-1 sampai ke-3 tetap Rp1.000).",
      "Denda maksimum Rp20.000.",
      "Input: satu baris berisi jumlah hari terlambat (bilangan bulat, minimal 0).",
      "Output: satu baris dengan format Denda: <angka>, contoh Denda: 7000.",
    ],
    tests: [
      {
        id: "t1",
        label: "Tidak terlambat (0 hari)",
        stdin: "0",
        expected: "Denda: 0",
      },
      {
        id: "t2",
        label: "Terlambat 3 hari",
        stdin: "3",
        expected: "Denda: 3000",
      },
      {
        id: "t3",
        label: "Terlambat 5 hari",
        stdin: "5",
        expected: "Denda: 7000",
      },
      {
        id: "t4",
        label: "Terlambat 10 hari",
        stdin: "10",
        expected: "Denda: 17000",
      },
      {
        id: "t5",
        label: "Terlambat 15 hari (batas maksimum)",
        stdin: "15",
        expected: "Denda: 20000",
      },
    ],
  },
  {
    id: "case-3",
    number: 3,
    title: "Data kebun sekolah",
    support: "LOW",
    goal: "Buat program yang menghitung rata-rata dari beberapa data tinggi tanaman.",
    expected:
      "Program menerima daftar tinggi tanaman dan menampilkan nilai rata-ratanya.",
    rules: [
      "Input: satu baris berisi tinggi tanaman dalam cm, dipisah spasi (bisa desimal), minimal satu data.",
      "Output: satu baris dengan format Rata-rata: <angka> dibulatkan satu angka desimal, contoh Rata-rata: 12.0.",
    ],
    tests: [
      {
        id: "t1",
        label: "Tiga data bulat",
        stdin: "10 12 14",
        expected: "Rata-rata: 12.0",
      },
      {
        id: "t2",
        label: "Empat data (hasil desimal)",
        stdin: "8 9 10 11",
        expected: "Rata-rata: 9.5",
      },
      { id: "t3", label: "Satu data", stdin: "7", expected: "Rata-rata: 7.0" },
      {
        id: "t4",
        label: "Data desimal",
        stdin: "15.5 14.5 16",
        expected: "Rata-rata: 15.3",
      },
    ],
  },
];

export const CASE_ORDER: readonly string[] = CASES.map((c) => c.id);

export const getCaseConfig = (caseId: string): CaseConfig | undefined =>
  CASES.find((c) => c.id === caseId);

export const STAGES = ["understand", "design", "implement", "test"] as const;
