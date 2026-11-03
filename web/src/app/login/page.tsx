"use client";
import { FormEvent, useEffect, useState } from "react";
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
import { Label, RequiredNote } from "@/components/ui/label";
import { useLearning } from "@/features/learning/LearningProvider";
import { ApiClientError } from "@/lib/api";
import { MOCK_STUDENTS } from "@/lib/api/fixtures";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";

const CODE_FORMAT = /^(PY\d{3,}|VALIDATOR\d{3}|DUMMY\d{2})$/;

export default function Login() {
  const router = useRouter();
  const { login, mode, student } = useLearning();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in (the session is remembered): no need to enter the code again.
  useEffect(() => {
    if (student && !busy) router.replace("/final-review");
  }, [student, busy, router]);

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
      router.push("/final-review");
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
                <Label htmlFor="code" required>
                  Kode siswa
                </Label>
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
                  aria-required
                />
                <RequiredNote />
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
          </CardContent>
        </Card>
      </main>
    </Shell>
  );
}
