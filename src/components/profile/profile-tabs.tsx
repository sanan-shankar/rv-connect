"use client";

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { SPRINGS } from "@/components/common/motion";

type TabKey = "posts" | "about" | "photos" | "saved";

/**
 * Profile main-column tabs (Posts / About / Photos / Saved) with an active underline.
 * Content for each tab is passed in so the server can render About/Photos and
 * the Posts tab can be the shared client feed. "Saved" is owner-only: it is only
 * rendered when `showSaved` is set (the viewer is looking at their own profile),
 * because saved posts are private.
 */
export function ProfileTabs({
  posts,
  about,
  photos,
  saved,
  showPhotos,
  showSaved,
}: {
  posts: ReactNode;
  about: ReactNode;
  photos: ReactNode;
  saved?: ReactNode;
  showPhotos: boolean;
  showSaved?: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("posts");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "posts", label: "Posts" },
    { key: "about", label: "About" },
    ...(showPhotos ? [{ key: "photos" as const, label: "Photos" }] : []),
    ...(showSaved ? [{ key: "saved" as const, label: "Saved" }] : []),
  ];

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Profile sections"
        className="mb-4 flex gap-0.5 border-b border-border"
      >
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={`relative px-3.5 py-2.5 text-[13.5px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98] ${
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
        {tab === "posts" && posts}
        {tab === "about" && about}
        {tab === "photos" && showPhotos && photos}
        {tab === "saved" && showSaved && saved}
      </div>
    </div>
  );
}
