import type {
  CaseDefinition,
  FlowEdge,
  FlowNode,
  Flowchart,
  ProblemSpec,
  ProgressState,
  StageId,
} from "./types";

export const stages: { id: StageId; label: string; short: string }[] = [
  { id: "understand", label: "Pahami masalah", short: "01" },
  { id: "design", label: "Rancang algoritma", short: "02" },
  { id: "implement", label: "Implementasi Python", short: "03" },
  { id: "test", label: "Uji & perbaiki", short: "04" },
];
export const cases: CaseDefinition[] = [
  {
    id: "case-1",
    number: 1,
    title: "Sistem otomasi perhitungan tarif parkir progresif",
    subtitle: "Misi awal",
    support: "HIGH",
    context:
      "Pengelola parkir pusat perbelanjaan Grand Metro membutuhkan sistem terkomputerisasi untuk menghitung biaya parkir kendaraan berdasarkan jenis kendaraan dan lama jam parkir.",
    goal: "Buat program Python yang menghitung biaya parkir mobil atau motor dengan aturan tarif bertingkat.",
    expected:
      "Program menerima jenis kendaraan dan lama parkir, lalu menampilkan biaya parkir yang sesuai.",
    tests: [
      {
        id: "t1",
        input: "mobil, 2 jam",
        expected: "Tarif: 10000",
        actual: "Tarif: 10000",
        passed: true,
      },
      {
        id: "t2",
        input: "motor, 4 jam",
        expected: "Tarif: 7000",
        actual: "Tarif: 7000",
        passed: true,
      },
    ],
  },
  {
    id: "case-2",
    number: 2,
    title: "Koleksi buku kelas",
    subtitle: "Misi lanjutan",
    support: "MODERATE",
    context:
      "Perpustakaan kelas perlu menghitung denda berdasarkan jumlah hari keterlambatan pengembalian buku.",
    goal: "Buat program yang menghitung denda secara terstruktur menggunakan percabangan.",
    expected:
      "Program menerima jumlah hari terlambat dan menampilkan denda yang sesuai.",
    tests: [
      {
        id: "t1",
        input: "3 hari",
        expected: "Denda: 3000",
        actual: "Denda: 3000",
        passed: true,
      },
      {
        id: "t2",
        input: "0 hari",
        expected: "Denda: 0",
        actual: "Denda: 0",
        passed: true,
      },
    ],
  },
  {
    id: "case-3",
    number: 3,
    title: "Data kebun sekolah",
    subtitle: "Misi mandiri",
    support: "LOW",
    context:
      "Tim kebun mencatat tinggi tanaman setiap minggu untuk mencari nilai rata-rata pertumbuhannya.",
    goal: "Buat program yang menghitung rata-rata dari beberapa data tinggi tanaman.",
    expected:
      "Program menerima daftar tinggi tanaman dan menampilkan nilai rata-ratanya.",
    tests: [
      {
        id: "t1",
        input: "10, 12, 14",
        expected: "Rata-rata: 12",
        actual: "Rata-rata: 12",
        passed: true,
      },
      {
        id: "t2",
        input: "8, 9, 10, 11",
        expected: "Rata-rata: 9.5",
        actual: "Rata-rata: 9.5",
        passed: true,
      },
    ],
  },
];
export const blankSpec: ProblemSpec = {
  goal: "",
  input: "",
  process: "",
  output: "",
  constraints: "",
};
export const defaultCode = `# Tulis solusi kamu di sini
harga_1 = 5000
harga_2 = 7000
harga_3 = 8000
uang = 25000

total = harga_1 + harga_2 + harga_3
print(f"Total: {total}")`;
const ai = (
  id: string,
  kind: FlowNode["kind"],
  label: string,
  x: number,
  y: number,
): FlowNode => ({ id, kind, label, x, y, origin: "ai" });
const link = (
  source: string,
  target: string,
  sourceHandle = "b",
  targetHandle = "t",
  label?: string,
): FlowEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  sourceHandle,
  targetHandle,
  label,
});
/** Draf awal flowchart per kasus; dapat digantikan respons BE/AI dengan bentuk yang sama. */
export const flowchartDrafts: Record<string, Flowchart> = {
  "case-1": {
    nodes: [
      ai("s", "start", "Mulai", 200, 0),
      ai("i", "io", "Baca jenis kendaraan & lama parkir", 200, 90),
      ai("d", "decision", "Mobil?", 200, 190),
      ai("m", "process", "Hitung tarif mobil", 0, 320),
      ai("o", "process", "Hitung tarif motor", 400, 320),
      ai("p", "io", "Tampilkan tarif", 200, 440),
      ai("e", "end", "Selesai", 200, 530),
    ],
    edges: [
      link("s", "i"),
      link("i", "d"),
      link("d", "m", "l", "t", "Ya"),
      link("d", "o", "r", "t", "Tidak"),
      link("m", "p", "b", "l"),
      link("o", "p", "b", "r"),
      link("p", "e"),
    ],
  },
  "case-2": {
    nodes: [
      ai("s", "start", "Mulai", 200, 0),
      ai("i", "io", "Baca jumlah hari terlambat", 200, 90),
      ai("e", "end", "Selesai", 200, 420),
    ],
    edges: [link("s", "i")],
  },
  "case-3": {
    nodes: [
      ai("s", "start", "Mulai", 200, 0),
      ai("e", "end", "Selesai", 200, 420),
    ],
    edges: [],
  },
};
export const getFlowchartDraft = (caseId: string): Flowchart =>
  flowchartDrafts[caseId] ?? { nodes: [], edges: [] };
export const initialProgress = (): ProgressState => ({
  loggedIn: false,
  studentName: "",
  activeCaseId: "case-1",
  completedStages: {},
  problemSpecs: {},
  pseudocode: {},
  flowchart: {},
  code: {},
  execution: {},
  tested: {},
  reflection: "",
});
export const getCase = (id: string) =>
  cases.find((item) => item.id === id) ?? cases[0];
