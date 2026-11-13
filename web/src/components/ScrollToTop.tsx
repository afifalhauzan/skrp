"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Never show the button before this many pixels, however short the page is. */
const MIN_SCROLL_PX = 300;
/** ...and only once this share of the scrollable distance has been covered. */
const SCROLL_RATIO = 0.2;

/**
 * Floating "back to top" button. It appears after the page has scrolled past 20% of its
 * scrollable height (and at least 300px), and fades out again near the top.
 */
export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const root = document.documentElement;
      const scrollable = root.scrollHeight - window.innerHeight;
      const threshold = Math.max(MIN_SCROLL_PX, scrollable * SCROLL_RATIO);
      setVisible(scrollable > MIN_SCROLL_PX && window.scrollY > threshold);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const toTop = () => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      onClick={toTop}
      aria-label="Kembali ke atas"
      title="Kembali ke atas"
      data-testid="scroll-to-top"
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={cn(
        "fixed bottom-4 right-4 z-40 grid size-11 place-items-center rounded-full bg-primary text-white shadow-lg ring-1 ring-black/5 transition duration-200 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:bottom-6 sm:right-6 sm:size-12",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      )}
    >
      <ArrowUp className="size-5" strokeWidth={2.5} />
    </button>
  );
}
