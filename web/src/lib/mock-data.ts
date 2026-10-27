import type {
  CaseDefinition,
  FlowEdge,
  FlowNode,
  Flowchart,
  ProblemSpec,
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
    scenario:
      "Pengelola parkir pusat perbelanjaan Grand Metro membutuhkan sistem terkomputerisasi untuk menghitung biaya parkir kendaraan roda empat (mobil) dan roda dua (motor). Selama ini pencatatan manual sering menimbulkan antrean dan selisih tarif. Kamu ditugaskan membangun program Python yang menghitung biaya secara otomatis berdasarkan jenis kendaraan dan lama jam parkir dengan aturan bertingkat.",
    place: "Pos gerbang Mall Grand Metro",
    minutes: 15,
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
    title: "Koleksi buku kelas",
    subtitle: "Misi lanjutan",
    support: "MODERATE",
    context:
      "Perpustakaan kelas perlu menghitung denda berdasarkan jumlah hari keterlambatan pengembalian buku.",
    scenario:
      "Perpustakaan kelas menyimpan puluhan buku yang dipinjam bergantian. Petugas perpustakaan sering lupa menghitung denda ketika buku dikembalikan terlambat, dan besarnya denda berbeda-beda antarpetugas. Kamu diminta membuat program Python yang menghitung denda dari jumlah hari keterlambatan, dengan tarif yang berubah setelah beberapa hari dan batas denda maksimum.",
    place: "Perpustakaan kelas",
    minutes: 15,
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
        label: "Terlambat 15 hari (kena batas maksimum)",
        stdin: "15",
        expected: "Denda: 20000",
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
    scenario:
      "Tim kebun sekolah mencatat tinggi tanaman cabai setiap minggu. Data disalin tangan ke buku catatan, dan menghitung rata-rata pertumbuhannya memakan waktu. Kali ini kamu mengerjakan hampir sepenuhnya sendiri: tentukan sendiri langkah penyelesaiannya, lalu buat program Python yang menghitung rata-rata dari sejumlah data tinggi tanaman.",
    place: "Kebun sekolah",
    minutes: 20,
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
export const blankSpec: ProblemSpec = {
  goal: "",
  input: "",
  process: "",
  output: "",
  constraints: "",
};
/** Kode awal per kasus; dapat digantikan draf/bantuan dari BE/AI lewat progress.code[caseId]. */
export const codeDrafts: Record<string, string> = {
  "case-1": `# Kasus 1: tarif parkir progresif
jenis = input("Jenis kendaraan (mobil/motor): ")
jam = int(input("Lama parkir (jam): "))

# TODO: hitung tarif sesuai aturan (jam pertama, jam berikutnya, batas maksimum)
tarif = 0

print(f"Tarif: {tarif}")
`,
  "case-2": `# Kasus 2: denda keterlambatan buku
hari = int(input("Jumlah hari terlambat: "))

# TODO: hitung denda dengan percabangan
denda = 0

print(f"Denda: {denda}")
`,
  "case-3": `# Kasus 3: rata-rata tinggi tanaman
# Tulis solusi kamu di sini
`,
};
/** Contoh isi input() per kasus (satu baris per input()): diambil dari tes pertama. */
export const stdinDrafts: Record<string, string> = Object.fromEntries(
  cases.map((c) => [c.id, c.tests[0]?.stdin ?? ""]),
);
export const getCodeDraft = (caseId: string) => codeDrafts[caseId] ?? "";
export const getStdinDraft = (caseId: string) => stdinDrafts[caseId] ?? "";
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
export const getCase = (id: string) =>
  cases.find((item) => item.id === id) ?? cases[0];
