import { containerCls } from "@/lib/ui";
import { ArrowRight } from "lucide-react";
import { LinkButton, Shell } from "@/components/Shell";
import { Mascot } from "@/components/Mascot";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const stages = [
  [
    "01",
    "Memahami masalah",
    "Menguraikan soal menjadi tujuan, input, proses, output, dan batasan.",
  ],
  [
    "02",
    "Merancang algoritma",
    "Menyusun alur logika sebagai flowchart dan pseudocode sebelum menulis kode.",
  ],
  [
    "03",
    "Implementasi Python",
    "Menulis kode Python di editor, menjalankannya, lalu membaca output dan pesan error.",
  ],
  [
    "04",
    "Uji & perbaiki",
    "Membandingkan hasil aktual dengan harapan, lalu memperbaiki kesalahan.",
  ],
];
export default function Home() {
  return (
    <Shell>
      <main className={cn(containerCls, "pb-12 pt-6 sm:pt-10")}>
        <Card className="p-0">
          <CardContent className="grid gap-8 p-5 sm:p-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
            <div>
              <Badge variant="secondary">
                Media pembelajaran Python berbasis Scaffolding · Kelas XII SMA
              </Badge>
              <h1 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Kuasai Python melalui pemecahan masalah terstruktur
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Dari memahami masalah sampai kode berhasil dijalankan, kamu
                bakal belajar langkah demi langkah. Ada teman belajar yang siap
                kasih petunjuk saat kamu butuh. Makin lama, kamu makin jago
                menyelesaikannya sendiri!
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href="/login" size="lg">
                  Mulai belajar <ArrowRight />
                </LinkButton>
              </div>
            </div>
            <Mascot
              variant="fullbody"
              alt="Maskot PyScaffold sedang menulis kode"
              className="mx-auto w-48 sm:w-56 lg:w-64"
            />
          </CardContent>
        </Card>
        <h2 className="mt-10 font-heading text-xl font-semibold">
          Empat tahap pembelajaran
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map(([n, title, description]) => (
            <Card key={n}>
              <CardHeader>
                <Badge variant="outline" className="w-fit">
                  Tahap {n}
                </Badge>
                <CardTitle className="mt-2">{title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                {description}
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </Shell>
  );
}
