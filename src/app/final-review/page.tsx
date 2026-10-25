"use client";
import { containerCls } from "@/lib/ui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Shell } from "@/components/Shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cases, initialProgress } from "@/lib/data";
import { loadProgress, resetProgress, saveProgress } from "@/lib/persistence";
import { cn } from "@/lib/utils";

export default function FinalReview() {
  const router = useRouter();
  const [reflection, setReflection] = useState("");
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(initialProgress);
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
      <main className={cn(containerCls, "pb-12 pt-6 sm:pt-10")}>
        <p className="text-sm font-medium text-primary">Perjalanan selesai</p>
        <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">
          Kamu sudah membangun solusi dari awal.
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Gunakan ringkasan ini untuk melihat prosesmu, bukan hanya jawaban
          akhirnya.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {cases.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  Kasus {item.number}
                </Badge>
                <CardTitle className="mt-2">{item.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                4 tahap selesai · dukungan {item.support}
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Yang sudah dikuasai</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm leading-6">
                {[
                  "Menguraikan masalah sebelum membuat kode",
                  "Menghubungkan algoritma dengan implementasi",
                  "Membaca bukti dari hasil pengujian",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {t}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Refleksi singkat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="reflection">
                Apa satu hal yang ingin kamu latih lagi?
              </Label>
              <Textarea
                id="reflection"
                value={reflection}
                onChange={(e) => {
                  setReflection(e.target.value);
                  setSaved(false);
                }}
                rows={4}
              />
              <Button onClick={save}>
                {saved ? "Tersimpan ✓" : "Simpan refleksi"}
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="mt-8 flex justify-end">
          <Button variant="ghost" onClick={reset}>
            Mulai ulang dari awal
          </Button>
        </div>
      </main>
    </Shell>
  );
}
