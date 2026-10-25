"use client";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
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
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </span>
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
          <p>
            <span className="font-heading font-semibold text-foreground">
              PyScaffold
            </span>{" "}
            · Media pembelajaran algoritma dan Python untuk SMA kelas XII
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
