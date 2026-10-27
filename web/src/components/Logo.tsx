import { cn } from "@/lib/utils";

/** Logo PyScaffold: monitor dengan logo Python. Atur ukuran lewat `className` (mis. `size-8`). */
export function Logo({
  className,
  alt = "",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      {/* eslint-disable @next/next/no-img-element */}
      <img
        src="/logo-python.svg"
        alt=""
        draggable={false}
        className="absolute block max-w-none"
        style={{
          left: "31.62%",
          top: "27.57%",
          width: "35.41%",
          height: "35.42%",
        }}
      />
      <img
        src="/logo-monitor.svg"
        alt={alt}
        draggable={false}
        className="absolute block max-w-none"
        style={{
          left: "-1.08%",
          top: "0.27%",
          width: "101.08%",
          height: "101.08%",
        }}
      />
    </span>
  );
}
