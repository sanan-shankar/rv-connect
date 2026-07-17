"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { SPRINGS, FadeRise } from "@/components/common/motion";

type TabKey = "about" | "postsAndLetters" | "photos" | "saved";

/**
 * Profile main-column tabs. About is the default. Posts & Letters is one tab
 * (two labelled groups live inside its panel). Photos appears only when there
 * are photos; Saved is owner-only. An underline thumb slides between tabs
 * (layoutId + snappy spring); the panel content fades/rises on switch.
 */
export function ProfileTabs({
  about,
  postsAndLetters,
  photos,
  saved,
  showPhotos,
  showSaved,
}: {
  about: ReactNode;
  postsAndLetters: ReactNode;
  photos: ReactNode;
  saved?: ReactNode;
  showPhotos: boolean;
  showSaved?: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("about");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "about", label: "About" },
    { key: "postsAndLetters", label: "Posts & Letters" },
    ...(showPhotos ? [{ key: "photos" as const, label: "Photos" }] : []),
    ...(showSaved ? [{ key: "saved" as const, label: "Saved" }] : []),
  ];

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Profile sections"
        className="mb-5 flex gap-0.5 border-b border-border"
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`relative rounded-t-lg px-3.5 py-2.5 text-[13.5px] font-semibold transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] ${
                active ? "text-canopy" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="relative z-10">{t.label}</span>
              {active && (
                <motion.span
                  layoutId="profileTabThumb"
                  className="absolute inset-x-2.5 -bottom-px z-0 h-[2.5px] rounded-full bg-canopy"
                  transition={SPRINGS.snappy}
                />
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        <FadeRise key={tab} y={8}>
          {tab === "about" && about}
          {tab === "postsAndLetters" && postsAndLetters}
          {tab === "photos" && showPhotos && photos}
          {tab === "saved" && showSaved && saved}
        </FadeRise>
      </div>
    </div>
  );
}
