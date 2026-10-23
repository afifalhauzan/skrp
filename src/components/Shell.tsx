"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <div className="min-h-screen">
      <header className="border-b border-[#d9e4ee] bg-[#f5faff]">
        <div className="mx-auto flex h-14 max-w-[1232px] items-center justify-between px-6">
          <Link
            href="/"
            className="font-mono text-xs font-bold uppercase tracking-widest text-ink"
          >
            [ PyScaffold ]
          </Link>
          <nav className="hidden items-center gap-7 font-mono text-[10px] uppercase tracking-widest text-muted md:flex">
            {path !== "/" && (
              <Link href="/mission" className="hover:text-ink">
                Misi belajar
              </Link>
            )}
            <Link href="/final-review" className="hover:text-ink">
              Perjalanan saya
            </Link>
          </nav>
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">
            ENV: MOCK_SANDBOX
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const cls = `inline-flex items-center justify-center px-5 py-3 font-mono text-[11px] uppercase tracking-widest transition ${variant === "primary" ? "bg-black text-white hover:bg-[#29323b]" : variant === "secondary" ? "bg-[#e9eef5] text-ink hover:bg-[#dfe8f2]" : "text-muted underline underline-offset-4 hover:text-ink"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`;
  return href ? (
    <Link className={cls} href={href}>
      {children}
    </Link>
  ) : (
    <button className={cls} onClick={onClick} type={type} disabled={disabled}>
      {children}
    </button>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-[#e2e9f0] bg-white p-6 ${className}`}>
      {children}
    </section>
  );
}
export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-sm font-bold text-navy">{children}</label>
  );
}
