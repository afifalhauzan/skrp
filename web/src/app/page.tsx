import { Button, Shell } from "@/components/Shell";
export default function Home() {
  const stages = [
    [
      "01",
      "Memahami Masalah",
      "Dekomposisi narasi soal menjadi parameter terstruktur: tujuan spesifik, variabel input, output yang diharapkan, serta batasan logika sistem.",
    ],
    [
      "02",
      "Merancang Algoritma",
      "Memvisualisasikan alur eksekusi logika dalam bentuk bagan alir terstandar atau pseudocode sebelum baris kode program dieksekusi.",
    ],
    [
      "03",
      "Implementasi Python",
      "Menuliskan sintaksis Python 3 dengan editor interaktif, menjalankan kode secara langsung, serta membaca output terminal dan pesan kesalahan.",
    ],
    [
      "04",
      "Pengujian & Perbaikan",
      "Menguji ketangguhan program dengan berbagai skenario data uji, menganalisis ketidaksesuaian hasil aktual vs harapan, serta memperbaiki bug.",
    ],
  ];
  return (
    <Shell>
      <main className="mx-auto max-w-[1232px] px-6 pb-16 pt-8">
        <section className="grid gap-10 border border-[#e3eaf1] bg-white p-8 md:p-10 lg:grid-cols-[1.35fr_1fr]">
          <div>
            <p className="blueprint-label inline-block px-3 py-2">
              [ Media Pembelajaran Python Kelas XII SMA ]
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ink md:text-[32px]">
              Kuasai Pemrograman Python Melalui Pemecahan Masalah Terstruktur
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#5b5b5b]">
              Aplikasi pembelajaran berbasis Scaffolding Bertahap yang
              mendampingi siswa SMA kelas XII memahami masalah nyata, merancang
              algoritma sistematis, menulis kode Python, hingga pengujian dan
              perbaikan mandiri dengan dukungan bantuan cerdas kontekstual.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Button href="/login">[ Mulai Belajar → ]</Button>
              <Button href="/login" variant="secondary">
                [ Masuk dengan Kode Akses ]
              </Button>
            </div>
          </div>
          <div className="bg-[#eef4fa] p-4">
            <div className="border border-white bg-white p-3">
              <p className="blueprint-label px-2 py-2">
                FIG 1.0 · SKEMA ALUR PROSES PEMBELAJARAN
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  ["NODE_01", "Dekomposisi"],
                  ["NODE_02", "Algoritma"],
                  ["NODE_03", "Sintaksis Python"],
                  ["NODE_04", "Verifikasi Uji"],
                ].map(([node, label]) => (
                  <div key={node} className="bg-[#e9eef5] p-3">
                    <p className="font-mono text-[10px] text-muted">{node}</p>
                    <p className="mt-2 text-sm font-bold">{label}</p>
                    <p className="mt-2 font-mono text-[10px] text-muted">
                      • Input & Output
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex justify-between bg-black px-2 py-2 font-mono text-[10px] uppercase tracking-widest text-white">
                <span>[ Engine: scaffolding_adaptif_bert ingkat ]</span>
                <span>Status: Ready</span>
              </div>
            </div>
          </div>
        </section>
        <h2 className="mt-12 text-xl font-bold text-ink">
          Empat Tahap Pembelajaran Terstruktur
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stages.map(([number, title, description]) => (
            <div
              key={number}
              className="min-h-[270px] border border-[#e3eaf1] bg-white p-4"
            >
              <div className="flex justify-between text-lg font-bold">
                <span>{number}</span>
                <span className="blueprint-label px-2 py-1">
                  TAHAP_{number}
                </span>
              </div>
              <h3 className="mt-9 text-base font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#5b5b5b]">
                {description}
              </p>
            </div>
          ))}
        </div>
      </main>
    </Shell>
  );
}
