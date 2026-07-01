"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PeaksMark } from "@/components/layout/peaks-mark";

/**
 * Slim sticky top bar that appears once the hero is scrolled past, so the
 * Sign in / Join affordances are one tap away during the long scroll. Hidden in
 * the fold so the hero stays pristine, and hidden again once the closing CTA
 * band comes into view, so the bottom of the page never shows the same pair
 * twice. Transform + opacity only.
 */
export function LandingNav() {
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const [atClosingCta, setAtClosingCta] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolledPastHero(window.scrollY > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    // The closing footer band already repeats Join / Sign in. Tuck the bar away
    // while it is on screen so a scrolled-to-bottom prospect sees only one pair.
    const cta = document.getElementById("closing-cta");
    const io = cta
      ? new IntersectionObserver(([entry]) => setAtClosingCta(entry.isIntersecting))
      : null;
    if (cta && io) io.observe(cta);

    return () => {
      window.removeEventListener("scroll", onScroll);
      io?.disconnect();
    };
  }, []);

  const visible = scrolledPastHero && !atClosingCta;

  return (
    <div
      aria-hidden={!visible}
      style={{ backgroundColor: "rgba(250, 248, 243, 0.82)", backdropFilter: "saturate(1.4) blur(12px)" }}
      className={`fixed inset-x-0 top-0 z-50 border-b border-border/70 transition-[opacity,transform] duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-leaf/50"
        >
          <PeaksMark size={15} variant="light" />
          <span className="font-heading text-[15px] font-bold tracking-tight text-foreground">
            Rishi Valley
          </span>
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-3 py-2 text-sm font-semibold text-foreground transition-colors duration-150 hover:text-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/40 active:scale-[0.98] sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-canopy px-5 py-2 text-sm font-semibold text-white shadow-sm transition-transform duration-150 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canopy/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.97]"
          >
            Join
          </Link>
        </div>
      </div>
    </div>
  );
}
