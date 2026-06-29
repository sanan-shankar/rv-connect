"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PeaksMark } from "@/components/layout/peaks-mark";

export function LandingHero() {
  const [hovered, setHovered] = useState(false);

  return (
    <section
      className="relative flex min-h-dvh flex-col overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onTouchStart={() => setHovered(true)}
    >
      <Image
        src="/images/landing.jpeg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
        draggable={false}
      />
      {/* Hover-reactive wash for readability */}
      <div
        className="absolute inset-0 transition-colors duration-700 ease-in-out"
        style={{ backgroundColor: hovered ? "rgba(0,0,0,0.18)" : "rgba(0,0,0,0.03)" }}
      />
      {/* Top wash keeps the small white brand readable without dimming the whole photo. */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-40"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(20,30,22,0.34), rgba(20,30,22,0.16) 45%, transparent)",
        }}
      />
      {/* Constant bottom gradient so the headline and cue always have contrast */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, transparent 54%, rgba(20,30,22,0.36))",
        }}
      />

      {/* Brand, top-left */}
      <div
        className="relative z-10 flex items-center gap-2.5 px-8 pt-7 lg:px-16"
        style={{ filter: "drop-shadow(0 1px 6px rgba(20,30,22,0.55))" }}
      >
        <PeaksMark size={34} className="text-white" />
        <span className="mt-[2px] flex h-8 flex-col justify-between text-white">
          <span className="block font-heading text-[21px] font-bold leading-none tracking-tight">
            Rishi Valley
          </span>
          <span className="block text-[10.5px] uppercase leading-none tracking-[0.24em] text-white/85">
            Alumni
          </span>
        </span>
      </div>

      {/* Headline + actions */}
      <div className="relative z-10 flex flex-1 items-center">
        <div className="w-full px-8 lg:px-16">
          <div className="lg:grid lg:grid-cols-[111px_1fr] lg:gap-x-2.5">
            <div className="lg:col-start-2">
              <h1 className="font-heading text-4xl font-bold tracking-[-0.03em] text-white drop-shadow-lg sm:text-5xl lg:text-6xl md:whitespace-nowrap">
                Welcome back to the valley.
              </h1>
              <p className="mt-4 text-base leading-relaxed text-white/90 drop-shadow-md sm:text-lg md:whitespace-nowrap">
                A space for Rishi Valley alumni to reconnect, share stories, and find each other.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-[15px] font-semibold text-[#23241E] shadow-md transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
                >
                  Request an invite
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-white/55 bg-white/10 px-6 py-2.5 text-[15px] font-semibold text-white backdrop-blur-sm transition-colors duration-200 hover:bg-white/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/30"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="relative z-10 flex flex-col items-center gap-3 pb-7 text-white/80">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em]">See what&apos;s inside</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </div>
    </section>
  );
}
