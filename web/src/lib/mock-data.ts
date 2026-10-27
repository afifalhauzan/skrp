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
    exploration: {
      ideas: [
        {
          title: "Banyak transaksi parkir",
          description:
            "Jika kamu punya daftar transaksi (jenis kendaraan dan lama parkir), hitung tarif setiap transaksi lalu jumlahkan sebagai total pendapatan parkir.",
          strategies: ["Perulangan"],
          sampleData: "mobil, 3\nmotor, 5\nmobil, 8",
        },
        {
          title: "Cari transaksi tertentu",
          description:
            "Temukan transaksi dengan parkir terlama, tarif tertinggi, atau yang memenuhi syarat tertentu dengan memeriksa transaksi satu per satu.",
          strategies: ["Brute force (pencarian linear)"],
        },
      ],
      fit: "Menghitung satu tarif dari aturan yang pasti tidak membutuhkan rekursi, greedy, maupun divide and conquer, jadi tidak perlu dipaksakan di kasus ini.",
    },
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
    subtitle: "Misi lanjutan",
    support: "MODERATE",
    context:
      "Sebuah toko daring menghitung ongkos kirim paket berdasarkan layanan pengiriman dan berat paket.",
    scenario:
      "Toko daring sekolah menjual produk kerajinan siswa ke berbagai kota. Admin menghitung ongkos kirim secara manual dari tabel tarif, sehingga sering terjadi salah hitung. Kamu diminta membuat program Python yang menghitung ongkos kirim sebuah paket berdasarkan layanan (reguler atau express) dan beratnya, dengan tarif per kilogram yang berubah setelah batas berat tertentu dan batas biaya maksimum.",
    place: "Gudang pengemasan toko daring",
    minutes: 15,
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
    exploration: {
      ideas: [
        {
          title: "Banyak paket",
          description:
            "Jika ada daftar paket (layanan dan berat), hitung ongkos kirim setiap paket lalu jumlahkan sebagai total ongkos kirim.",
          strategies: ["Perulangan"],
          sampleData: "reguler, 3\nexpress, 7\nreguler, 12",
        },
        {
          title: "Cari paket tertentu",
          description:
            "Temukan paket terberat, paket dengan ongkos kirim tertinggi, atau paket yang memenuhi kriteria tertentu dengan memeriksa paket satu per satu.",
          strategies: ["Brute force (pencarian linear)"],
        },
        {
          title: "Urutkan paket",
          description:
            "Urutkan daftar paket berdasarkan berat atau ongkos kirim, lalu bandingkan cara kerja beberapa algoritma pengurutan.",
          strategies: ["Bubble Sort", "Merge Sort (divide and conquer)"],
        },
      ],
      fit: "Kasus ini tidak memiliki masalah pemilihan kombinasi atau struktur bertingkat yang alami, jadi greedy dan rekursi tidak disarankan.",
    },
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
    subtitle: "Misi mandiri",
    support: "LOW",
    context:
      "Perpustakaan sekolah menghitung denda keterlambatan pengembalian berdasarkan jenis koleksi dan jumlah hari terlambat.",
    scenario:
      "Perpustakaan sekolah meminjamkan buku, majalah, dan koleksi referensi. Setiap jenis koleksi memiliki tarif denda berbeda, dan petugas sering keliru menghitungnya saat antrean panjang. Kali ini kamu mengerjakan hampir sepenuhnya sendiri: tentukan langkah penyelesaiannya, lalu buat program Python yang menghitung denda dari jenis koleksi dan jumlah hari terlambat.",
    place: "Meja sirkulasi perpustakaan sekolah",
    minutes: 20,
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
    exploration: {
      ideas: [
        {
          title: "Banyak transaksi pengembalian",
          description:
            "Jika ada daftar transaksi (jenis koleksi dan hari terlambat), hitung denda setiap transaksi lalu jumlahkan sebagai total denda.",
          strategies: ["Perulangan"],
          sampleData: "buku, 5\nmajalah, 2\nreferensi, 10",
        },
        {
          title: "Cari transaksi tertentu",
          description:
            "Temukan transaksi dengan keterlambatan terlama, denda tertinggi, atau yang memenuhi kriteria tertentu dengan memeriksa transaksi satu per satu.",
          strategies: ["Brute force (pencarian linear)"],
        },
        {
          title: "Urutkan transaksi",
          description:
            "Urutkan daftar transaksi berdasarkan hari terlambat atau besar denda, lalu bandingkan cara kerja beberapa algoritma pengurutan.",
          strategies: ["Bubble Sort", "Merge Sort (divide and conquer)"],
        },
      ],
      fit: "Menghitung denda dari aturan per jenis koleksi tidak membutuhkan rekursi atau greedy, jadi tidak perlu dipaksakan di kasus ini.",
    },
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
  "case-2": `# Kasus 2: ongkos kirim paket
layanan = input("Layanan (reguler/express): ")
berat = int(input("Berat paket (kg): "))

# TODO: hitung ongkir sesuai aturan (tarif per kg, batas berat, biaya maksimum)
ongkir = 0

print(f"Ongkir: {ongkir}")
`,
  "case-3": `# Kasus 3: denda keterlambatan perpustakaan
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
      ai("i", "io", "Baca layanan dan berat paket", 200, 90),
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
