"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        aria-label="Toggle theme"
      >
        <Sun size={18} weight="duotone" />
      </button>
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 transition-transform duration-150"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun
        size={18}
        weight="duotone"
        className={`transition-[transform,opacity] duration-300 ease-out ${
          isDark ? "absolute rotate-90 scale-0 opacity-0" : "relative rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        size={18}
        weight="duotone"
        className={`transition-[transform,opacity] duration-300 ease-out ${
          isDark ? "relative rotate-0 scale-100 opacity-100" : "absolute -rotate-90 scale-0 opacity-0"
        }`}
      />
    </button>
  );
}
