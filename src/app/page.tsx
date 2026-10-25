import { containerCls } from "@/lib/ui";
import { ArrowRight } from "lucide-react";
import { LinkButton, Shell } from "@/components/Shell";
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
                Media pembelajaran Python · Kelas XII SMA
              </Badge>
              <h1 className="mt-4 font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                Kuasai Python melalui pemecahan masalah terstruktur
              </h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Siswa dibimbing bertahap: memahami masalah nyata, merancang
                algoritma, menulis kode Python, lalu menguji dan memperbaikinya.
                Bantuan berkurang seiring siswa makin mandiri.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LinkButton href="/login" size="lg">
                  Mulai belajar <ArrowRight />
                </LinkButton>
                <LinkButton href="/login" size="lg" variant="outline">
                  Masuk dengan kode akses
                </LinkButton>
              </div>
            </div>
            <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              {stages.map(([n, title]) => (
                <li
                  key={n}
                  className="flex items-center gap-3 rounded-xl bg-muted p-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {n}
                  </span>
                  <span className="text-sm font-medium">{title}</span>
                </li>
              ))}
            </ol>
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
