"use client";
import { containerCls } from "@/lib/ui";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Clock, Users } from "lucide-react";
import { LinkButton, Shell } from "@/components/Shell";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCase } from "@/lib/data";
import { loadProgress } from "@/lib/persistence";
import { cn } from "@/lib/utils";

const artifacts = [
  "Spesifikasi masalah: tujuan, input, proses, output, batasan",
  "Rancangan logika percabangan (flowchart dan pseudocode)",
  "Program Python yang dapat dijalankan",
  "Tabel hasil pengujian untuk beberapa skenario",
];
export default function Mission() {
  const router = useRouter();
  const [name, setName] = useState("");
  useEffect(() => {
    const p = loadProgress();
    if (!p.loggedIn) router.replace("/login");
    else setName(p.studentName);
  }, [router]);
  const item = getCase("case-1");
  return (
    <Shell>
      <main className={cn(containerCls, "space-y-4 pb-12 pt-6 sm:pt-10")}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Kasus 1 aktif</Badge>
          <Badge variant="secondary">Orientasi masalah</Badge>
          <Badge variant="outline">
            <Users /> {name ? `${name} · ` : ""}XII MIPA 1
          </Badge>
          <Badge variant="outline">
            <Clock /> 45 menit
          </Badge>
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold leading-tight sm:text-3xl">
            Misi 1: {item.title}
          </h1>
        </div>
        <Card>
          <CardHeader>
            <CardDescription>
              Konteks dunia nyata · Pos gerbang Mall Grand Metro
            </CardDescription>
          </CardHeader>
          <CardContent className="leading-7">
            Pengelola parkir pusat perbelanjaan Grand Metro membutuhkan sistem
            terkomputerisasi untuk menghitung biaya parkir kendaraan roda empat
            (mobil) dan roda dua (motor). Selama ini pencatatan manual sering
            menimbulkan antrean dan selisih tarif. Kamu ditugaskan membangun
            program Python yang menghitung biaya secara otomatis berdasarkan
            jenis kendaraan dan lama jam parkir dengan aturan bertingkat.
          </CardContent>
        </Card>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Tujuan misi</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-6">
              Menghasilkan program Python yang berfungsi dan lolos pengujian
              seluruh skenario data uji tanpa galat perhitungan.
              <p className="mt-3 text-muted-foreground">
                Kriteria lulus: semua skenario uji berhasil.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Hasil yang dikumpulkan</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm leading-6">
                {artifacts.map((a) => (
                  <li key={a} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                    {a}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              <strong className="text-foreground">Butuh bantuan?</strong> Di
              setiap tahap ada tombol &quot;Minta petunjuk&quot; di panel
              samping. Progresmu tersimpan otomatis.
            </p>
            <LinkButton href="/learn/case-1/understand" size="lg">
              Mulai misi: tahap 1 <ArrowRight />
            </LinkButton>
          </CardContent>
        </Card>
      </main>
    </Shell>
  );
}
