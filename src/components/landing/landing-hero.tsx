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
        style={{ backgroundColor: hovered ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.05)" }}
      />
      {/* Constant bottom gradient so the headline and cue always have contrast */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, transparent 50%, rgba(20,30,22,0.5))",
        }}
      />

      {/* Brand, top-left */}
      <div className="relative z-10 flex items-center gap-2.5 px-8 pt-7 lg:px-16">
        <PeaksMark size={16} className="text-white" />
        <span className="leading-tight text-white drop-shadow">
          <span className="block font-heading text-[16px] font-bold tracking-tight">
            Rishi Valley
          </span>
          <span className="block text-[9.5px] uppercase tracking-[0.22em] text-white/70">
            Alumni
          </span>
        </span>
      </div>

      {/* Headline + actions */}
      <div className="relative z-10 flex flex-1 items-center">
        <div className="mx-auto w-full max-w-7xl px-8 lg:px-16">
          <h1 className="max-w-2xl font-heading text-4xl font-bold tracking-[-0.03em] text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            Welcome back to the valley.
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 drop-shadow-md sm:text-lg">
            A quiet place for the people who grew up under the same trees. Find each other, share
            the valley, keep it close.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 font-semibold leading-normal text-gray-900 shadow-lg transition-transform duration-200 hover:scale-[1.02] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 active:scale-[0.98]"
            >
              Request an invite
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/70 px-8 py-3.5 font-semibold leading-normal text-white backdrop-blur-sm transition-[transform,background-color,border-color] duration-200 hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 active:scale-[0.98]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="relative z-10 flex flex-col items-center gap-1 pb-7 text-white/80">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em]">See what&apos;s inside</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </div>
    </section>
  );
}
