"use client";
import { containerCls } from "@/lib/ui";
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
import { loadProgress, saveProgress } from "@/lib/persistence";
import { cn } from "@/lib/utils";

export default function Login() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!["PY2026", "BELAJAR", "MALANG"].includes(code.trim().toUpperCase())) {
      setError("Kode belum dikenali. Coba PY2026 untuk masuk.");
      return;
    }
    const p = loadProgress();
    saveProgress({ ...p, loggedIn: true, studentName: "Alya" });
    router.push("/mission");
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
              Masukkan kode akses
            </CardTitle>
            <CardDescription>
              Gunakan kode yang diberikan guru untuk membuka perjalanan belajar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kode akses</Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    setError("");
                  }}
                  placeholder="Contoh: PY2026"
                  className="h-10 uppercase"
                  autoComplete="off"
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" size="lg" className="w-full">
                Masuk ke pembelajaran
              </Button>
            </form>
            <p className="mt-4 text-xs text-muted-foreground">
              Kode akses: PY2026 · BELAJAR · MALANG
            </p>
          </CardContent>
        </Card>
      </main>
    </Shell>
  );
}
