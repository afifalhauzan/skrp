import { cn } from "@/lib/utils";

const mascots = {
  standby: { src: "/mascot/standby.svg", width: 589, height: 435 },
  thinking: { src: "/mascot/thinking.svg", width: 669, height: 529 },
  fullbody: { src: "/mascot/fullbody.svg", width: 557, height: 656 },
} as const;

export type MascotVariant = keyof typeof mascots;

/** Maskot PyScaffold. Size it with `className` (e.g. `w-24`); aspect ratio is kept. */
export function Mascot({
  variant,
  className,
  alt = "",
}: {
  variant: MascotVariant;
  className?: string;
  alt?: string;
}) {
  const m = mascots[variant];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={m.src}
      width={m.width}
      height={m.height}
      alt={alt}
      draggable={false}
      className={cn("h-auto select-none", className)}
    />
  );
}
