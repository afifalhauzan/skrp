"use client";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { useLearning } from "@/features/learning/LearningProvider";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const { student, mode } = useLearning();
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div
          className={cn(containerCls, "flex h-14 items-center justify-between")}
        >
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-base font-semibold"
          >
            <Logo className="size-8" />
            PyScaffold
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/mission" />}
              nativeButton={false}
            >
              Misi belajar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/final-review" />}
              nativeButton={false}
            >
              Perjalanan saya
            </Button>
          </nav>
          <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
            {student && (
              <span
                data-testid="student-badge"
                className="font-medium text-foreground"
              >
                {student.name ?? "Siswa"} · {student.studentCode}
              </span>
            )}
            <span
              title={
                mode === "mock"
                  ? "Mode mock: data hanya tersimpan di browser ini, bukan di server."
                  : ""
              }
            >
              {mode === "mock" ? "Mode mock (lokal)" : ""}
            </span>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t bg-background">
        <div
          className={cn(
            containerCls,
            "flex flex-col gap-2 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          <p className="flex items-center gap-2">
            <Logo className="size-6" />
            <span>
              <span className="font-heading font-semibold text-foreground">
                PyScaffold
              </span>{" "}
              · Media pembelajaran algoritma dan Python untuk SMA kelas XII
            </span>
          </p>
          <nav className="flex gap-4">
            <Link href="/mission" className="hover:text-foreground">
              Misi belajar
            </Link>
            <Link href="/final-review" className="hover:text-foreground">
              Perjalanan saya
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Masuk
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

type ButtonProps = React.ComponentProps<typeof Button>;
export function LinkButton({
  href,
  ...props
}: Omit<ButtonProps, "render" | "nativeButton"> & { href: string }) {
  return (
    <Button render={<Link href={href} />} nativeButton={false} {...props} />
  );
}
