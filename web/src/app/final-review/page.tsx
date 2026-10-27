"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { StudentGate } from "@/components/AsyncState";
import { Shell } from "@/components/Shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mascot } from "@/components/Mascot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLearning } from "@/features/learning/LearningProvider";
import { cases } from "@/lib/mock-data";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";

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
      <main className={cn(containerCls, "pb-12 pt-6 sm:pt-10")}>
        <div className="flex flex-col-reverse items-center gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">
              Perjalanan selesai
            </p>
            <h1 className="mt-2 font-heading text-3xl font-bold sm:text-4xl">
              Kamu sudah membangun solusi dari awal.
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Gunakan ringkasan ini untuk melihat prosesmu, bukan hanya jawaban
              akhirnya.
            </p>
          </div>
          <Mascot
            variant="fullbody"
            alt="Maskot PyScaffold"
            className="w-36 shrink-0 sm:w-44"
          />
        </div>
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
              {error && (
                <Alert variant="destructive">
                  <AlertDescription role="alert">{error}</AlertDescription>
                </Alert>
              )}
              <Button onClick={save}>
                {saved ? "Tersimpan ✓" : "Simpan refleksi"}
              </Button>
            </CardContent>
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
