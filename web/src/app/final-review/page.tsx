"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StudentGate } from "@/components/AsyncState";
import { Button, Card, Shell } from "@/components/Shell";
import { useLearning } from "@/features/learning/LearningProvider";
import { cases } from "@/lib/mock-data";
export default function FinalReview() {
  return (
    <StudentGate>
      <FinalReviewContent />
    </StudentGate>
  );
}
function FinalReviewContent() {
  const router = useRouter();
  const learning = useLearning();
  const { reflection, setReflection } = learning;
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const save = async () => {
    setError("");
    try {
      await learning.saveReflection();
      setSaved(true);
    } catch {
      setError("Refleksi belum tersimpan. Periksa koneksi lalu coba lagi.");
    }
  };
  const leave = () => {
    if (learning.mode === "mock") learning.resetMock();
    else learning.logout();
    router.push("/");
  };
  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm font-bold text-teal">Perjalanan selesai</p>
        <h1 className="mt-3 text-4xl font-bold text-navy md:text-5xl">
          Kamu sudah membangun solusi dari awal.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          Gunakan ringkasan ini untuk melihat prosesmu, bukan hanya jawaban
          akhirnya.
        </p>
        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {cases.map((item) => (
            <Card key={item.id}>
              <p className="text-xs font-bold uppercase tracking-widest text-teal">
                Kasus {item.number}
              </p>
              <h2 className="mt-2 font-bold text-navy">{item.title}</h2>
              <p className="mt-4 text-sm text-muted">
                4 tahap selesai · dukungan {item.support}
              </p>
            </Card>
          ))}
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Card>
            <p className="text-xs font-bold uppercase tracking-widest text-teal">
              Yang sudah dikuasai
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-navy">
              <li>✓ Menguraikan masalah sebelum membuat kode</li>
              <li>✓ Menghubungkan algoritma dengan implementasi</li>
              <li>✓ Membaca bukti dari hasil pengujian</li>
            </ul>
          </Card>
          <Card>
            <p className="text-xs font-bold uppercase tracking-widest text-teal">
              Refleksi singkat
            </p>
            <label
              htmlFor="reflection"
              className="mt-4 block text-sm font-bold text-navy"
            >
              Apa satu hal yang ingin kamu latih lagi?
            </label>
            <textarea
              id="reflection"
              value={reflection}
              onChange={(e) => {
                setReflection(e.target.value);
                setSaved(false);
              }}
              rows={4}
              className="mt-2 w-full rounded-xl border border-[#d8e4dd] p-3 text-sm outline-none focus:border-teal"
            />
            {error && (
              <p role="alert" className="mt-2 text-sm font-bold text-coral">
                {error}
              </p>
            )}
            <Button onClick={save}>
              {saved ? "Tersimpan ✓" : "Simpan refleksi"}
            </Button>
          </Card>
        </div>
        <div className="mt-8 flex justify-end">
          <Button variant="ghost" onClick={leave}>
            {learning.mode === "mock" ? "Reset data mock & keluar" : "Keluar"}
          </Button>
        </div>
      </main>
    </Shell>
  );
}
