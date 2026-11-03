"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLearning } from "@/features/learning/LearningProvider";
import { containerCls } from "@/lib/ui";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const { student, mode, logout } = useLearning();
  const router = useRouter();
  const signOut = () => {
    logout();
    router.push("/login");
  };
  const displayName = student?.name ?? "Siswa";
  return (
    <div className="flex min-h-screen flex-col bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div
          className={cn(
            containerCls,
            "flex h-14 items-center justify-between gap-2",
          )}
        >
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-base font-semibold"
          >
            <Logo className="size-8" />
            <span className="hidden sm:inline">PyScaffold</span>
            <span className="sr-only sm:hidden">PyScaffold</span>
          </Link>
          <nav className="flex min-w-0 items-center gap-0.5 text-sm sm:gap-1">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/mission" />}
              nativeButton={false}
              className="px-2 text-xs sm:px-3 sm:text-sm"
            >
              Misi belajar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/final-review" />}
              nativeButton={false}
              className="px-2 text-xs sm:px-3 sm:text-sm"
            >
              Perjalanan saya
            </Button>
          </nav>
          {student && (
            <>
              {/* Desktop: name, mode and a visible "Keluar" button. */}
              <div className="hidden items-center gap-3 text-xs text-muted-foreground md:flex">
                <span
                  data-testid="student-badge"
                  className="font-medium text-foreground"
                >
                  {displayName} · {student.studentCode}
                </span>
                <span
                  title={
                    mode === "mock"
                      ? "Mode mock: data hanya tersimpan di browser ini, bukan di server."
                      : ""
                  }
                >
                  {mode === "mock" ? "Mode mock (lokal)" : ""}
                </span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut /> Keluar
                </Button>
              </div>
              {/* Mobile: the name stays visible on the button; the menu holds the details and "Keluar". */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Menu akun ${displayName}`}
                        data-testid="student-menu"
                        className="max-w-28"
                      />
                    }
                  >
                    <UserRound />
                    <span
                      data-testid="student-badge-mobile"
                      className="truncate"
                    >
                      {displayName}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-52">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="space-y-0.5">
                        <span className="block text-sm font-medium text-foreground">
                          {displayName}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {student.studentCode}
                          {mode === "mock" ? " · Mode mock (lokal)" : ""}
                        </span>
                      </DropdownMenuLabel>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={signOut}>
                      <LogOut /> Keluar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
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
