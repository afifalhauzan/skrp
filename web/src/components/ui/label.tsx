"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

function Label({
  className,
  required,
  children,
  ...props
}: React.ComponentProps<"label"> & {
  /** Marks the field as required with a red asterisk (read as "wajib diisi" by screen readers). */
  required?: boolean;
}) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span>
        {children}
        {required && (
          <>
            <span aria-hidden className="ml-0.5 font-bold text-destructive">
              *
            </span>
            <span className="sr-only"> (wajib diisi)</span>
          </>
        )}
      </span>
    </label>
  );
}

/** Legend for the asterisk; place it once near a form that has required fields. */
function RequiredNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)}>
      <span aria-hidden className="font-bold text-destructive">
        *
      </span>{" "}
      wajib diisi
    </p>
  );
}

export { Label, RequiredNote };
