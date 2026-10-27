"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Shell } from "@/components/Shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLearning } from "@/features/learning/LearningProvider";
import { ApiClientError } from "@/lib/api";
import { MOCK_STUDENTS } from "@/lib/api/fixtures";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";

const CODE_FORMAT = /^(PY\d{3,}|VALIDATOR\d{3})$/;

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
      <main
        className={cn(containerCls, "grid place-items-center py-10 sm:py-16")}
      >
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardDescription>Selamat datang kembali</CardDescription>
            <CardTitle className="font-heading text-2xl">
              Masukkan kode siswa
            </CardTitle>
            <CardDescription>
              Gunakan kode siswa yang diberikan guru untuk membuka perjalanan
              belajar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode siswa</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError("");
                  }}
                  placeholder="Contoh: PY001"
                  className="h-10 uppercase"
                  autoComplete="off"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription role="alert">{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={busy}
              >
                {busy ? "Memeriksa…" : "Masuk ke pembelajaran"}
              </Button>
            </form>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
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
          </CardContent>
        </Card>
      </main>
    </Shell>
  );
}
