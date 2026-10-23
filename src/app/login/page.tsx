"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Shell } from "@/components/Shell";
import { loadProgress, saveProgress } from "@/lib/persistence";
export default function Login() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!["PY2026", "BELAJAR", "MALANG"].includes(code.trim().toUpperCase())) {
      setError("Kode belum dikenali. Coba PY2026 untuk masuk ke prototype.");
      return;
    }
    const p = loadProgress();
    saveProgress({ ...p, loggedIn: true, studentName: "Alya" });
    router.push("/mission");
  };
  return (
    <Shell>
      <main className="mx-auto grid min-h-[calc(100vh-81px)] max-w-5xl place-items-center px-6 py-16">
        <Card className="w-full max-w-md">
          <p className="mb-3 text-sm font-bold text-teal">
            Selamat datang kembali
          </p>
          <h1 className="text-3xl font-bold text-navy">Masukkan kode akses</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Gunakan kode yang diberikan guru untuk membuka perjalanan belajar.
          </p>
          <form onSubmit={submit} className="mt-7">
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-bold text-navy"
            >
              Kode akses
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="Contoh: PY2026"
              className="w-full rounded-xl border border-[#d8e4dd] px-4 py-3 uppercase outline-none focus:border-teal focus:ring-2 focus:ring-mint"
            />
            {error && (
              <p role="alert" className="mt-3 text-sm font-bold text-coral">
                {error}
              </p>
            )}
            <Button type="submit">Masuk ke pembelajaran →</Button>
          </form>
          <p className="mt-5 text-xs text-muted">
            Prototype code: PY2026 · BELAJAR · MALANG
          </p>
        </Card>
      </main>
    </Shell>
  );
}
