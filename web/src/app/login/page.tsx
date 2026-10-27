"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Shell } from "@/components/Shell";
import { useLearning } from "@/features/learning/LearningProvider";
import { ApiClientError } from "@/lib/api";
import { MOCK_STUDENTS } from "@/lib/api/fixtures";

const CODE_FORMAT = /^PY\d{3,}$/;

export default function Login() {
  const router = useRouter();
  const { login, mode } = useLearning();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (!CODE_FORMAT.test(value)) {
      setError("Format kode siswa tidak sesuai. Contoh: PY001.");
      return;
    }
    setBusy(true);
    try {
      await login(value);
      router.push("/mission");
    } catch (err) {
      if (err instanceof ApiClientError && err.isNotFound) {
        setError(
          "Kode siswa tidak ditemukan. Periksa kembali kode dari gurumu.",
        );
      } else if (err instanceof ApiClientError && err.isRetryable) {
        setError("Server tidak dapat dihubungi. Coba lagi sebentar lagi.");
      } else {
        setError("Tidak dapat masuk saat ini. Coba lagi.");
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <Shell>
      <main className="mx-auto grid min-h-[calc(100vh-81px)] max-w-5xl place-items-center px-6 py-16">
        <Card className="w-full max-w-md">
          <p className="mb-3 text-sm font-bold text-teal">
            Selamat datang kembali
          </p>
          <h1 className="text-3xl font-bold text-navy">Masukkan kode siswa</h1>
          <p className="mt-3 text-sm leading-6 text-muted">
            Gunakan kode siswa yang diberikan guru untuk membuka perjalanan
            belajar.
          </p>
          <form onSubmit={submit} className="mt-7">
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-bold text-navy"
            >
              Kode siswa
            </label>
            <input
              id="code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              placeholder="Contoh: PY001"
              autoComplete="off"
              className="w-full rounded-xl border border-[#d8e4dd] px-4 py-3 uppercase outline-none focus:border-teal focus:ring-2 focus:ring-mint"
            />
            {error && (
              <p role="alert" className="mt-3 text-sm font-bold text-coral">
                {error}
              </p>
            )}
            <Button type="submit" disabled={busy}>
              {busy ? "Memeriksa…" : "Masuk ke pembelajaran →"}
            </Button>
          </form>
          <p className="mt-5 text-xs leading-5 text-muted">
            Kode siswa hanya mengenali catatan belajarmu; ini bukan kata sandi
            dan belum merupakan autentikasi.
            {mode === "mock" && (
              <>
                {" "}
                Mode mock · kode contoh:{" "}
                {MOCK_STUDENTS.map((s) => s.studentCode).join(" · ")}
              </>
            )}
          </p>
        </Card>
      </main>
    </Shell>
  );
}
