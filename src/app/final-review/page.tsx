"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Shell } from "@/components/Shell";
import { cases } from "@/lib/mock-data";
import { loadProgress, resetProgress, saveProgress } from "@/lib/persistence";
export default function FinalReview() {
  const router = useRouter();
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(loadProgress());
  useEffect(() => {
    const p = loadProgress();
    if (!p.loggedIn) router.replace("/login");
    else {
      setProgress(p);
      setReflection(p.reflection);
    }
  }, [router]);
  const save = () => {
    const next = { ...progress, reflection };
    saveProgress(next);
    setProgress(next);
    setSaved(true);
  };
  const reset = () => {
    resetProgress();
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
            <Button onClick={save}>
              {saved ? "Tersimpan ✓" : "Simpan refleksi"}
            </Button>
          </Card>
        </div>
        <div className="mt-8 flex justify-end">
          <Button variant="ghost" onClick={reset}>
            Reset prototype state
          </Button>
        </div>
      </main>
    </Shell>
  );
}
