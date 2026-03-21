"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export function LandingClient() {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      onMouseEnter={() => setHovered(true)}
    >
      {/* Full-screen hero background — priority preloads with the page */}
      <Image
        src="/images/landing.jpeg"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
        draggable={false}
      />
      {/* Overlay that transitions on hover for readability */}
      <div
        className="absolute inset-0 transition-colors duration-700 ease-in-out"
        style={{
          backgroundColor: hovered ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.05)",
        }}
      />

      {/* Content — vertically centred, left-aligned */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="mx-auto w-full max-w-7xl px-8 lg:px-16">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-white drop-shadow-lg sm:text-5xl lg:text-6xl">
            Welcome back to the valley.
          </h1>
          <p className="mt-3 whitespace-nowrap text-lg text-white/90 drop-shadow-md sm:text-xl">
            A space for Rishi Valley alumni to reconnect, share stories, and
            find each other.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-3 text-center font-semibold leading-normal text-gray-900 shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl"
            >
              Join the community
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/70 px-7 py-3 text-center font-semibold leading-normal text-white backdrop-blur-sm transition-all hover:border-white hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
