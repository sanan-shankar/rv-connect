"use client";

/* ------------------------------------------------------------------ *
 *  ProfileShell - the page layout for the profile (rebuilt 2026-07 from
 *  the approved Dossier concept, replacing the old header+rail+tabs
 *  arrangement).
 *
 *  A clean contact-card header, the houses chain inside it, then
 *  Dossier's folder tabs attached to one padded folder card whose left
 *  padding edge every panel shares - so About, Posts & Letters, Photos
 *  and Saved never drift out of alignment with the tab row (that shared
 *  edge IS the alignment fix, not a CSS nudge). Admin tools live in a
 *  single collapsed disclosure at the very bottom, never a mid-page
 *  block. The page background/atmosphere comes from AppShell; this
 *  component is just the content column.
 *
 *  Desktop and mobile are deliberately different compositions: the wide
 *  view spreads the header into a business card and the About into two
 *  columns; the narrow view is the linear stack with sticky tabs.
 * ------------------------------------------------------------------ */

import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { Shield, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRINGS, FadeRise } from "@/components/common/motion";

/* Folder-tab silhouette: the diagonal bevel every physical file tab shares. */
const TAB_CLIP = "polygon(0 100%, 0 30%, 15% 0, 100% 0, 100% 100%)";

type TabKey = "about" | "posts" | "photos" | "saved";

function FolderTab({
  label,
  active,
  onSelect,
}: {
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      initial={false}
      animate={{ y: active ? 0 : 6 }}
      whileTap={{ scale: 0.96 }}
      transition={SPRINGS.snappy}
      style={{ clipPath: TAB_CLIP }}
      className={cn(
        "relative shrink-0 px-4 pb-[var(--space-xs)] pt-[var(--space-s)] text-center text-[11px] font-bold uppercase tracking-[0.09em] outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:px-6 sm:text-[13px]",
        active
          ? "z-10 -mb-px bg-card text-foreground"
          : "z-0 bg-mist text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
    </motion.button>
  );
}

function AdminDisclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-[var(--space-xl)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[12.5px] font-bold uppercase tracking-[0.12em] text-cinnamon transition-[colors,transform] duration-150 hover:border-cinnamon/40 hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]"
      >
        <Shield className="h-4 w-4" aria-hidden />
        Admin
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && (
        <FadeRise y={8} className="mt-[var(--space-m)]">
          {children}
        </FadeRise>
      )}
    </div>
  );
}

export function ProfileShell({
  headerNode,
  aboutNode,
  postsNode,
  photosNode,
  savedNode,
  adminNode,
  flagNode,
}: {
  headerNode: ReactNode;
  aboutNode: ReactNode;
  postsNode: ReactNode;
  photosNode: ReactNode | null;
  /** Owner-only Saved tab content; null hides the tab entirely. */
  savedNode?: ReactNode | null;
  adminNode: ReactNode | null;
  flagNode: ReactNode | null;
}) {
  const [tab, setTab] = useState<TabKey>("about");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "about", label: "About" },
    { key: "posts", label: "Posts & Letters" },
    ...(photosNode ? [{ key: "photos" as const, label: "Photos" }] : []),
    ...(savedNode ? [{ key: "saved" as const, label: "Saved" }] : []),
  ];
  // Guard: if the active tab lost its panel, fall back to About.
  const activeKey = tabs.some((t) => t.key === tab) ? tab : "about";

  return (
    <div className="w-full">
      {headerNode}

      {/* FOLDER: tabs + one padded body card. */}
      <div className="mt-[var(--space-l)] sm:mt-[var(--space-xl)]">
        <div
          role="tablist"
          aria-label="Profile sections"
          // `max-lg:top-14` parks the sticky tabs directly BELOW the mobile app
          // bar, not underneath it. The bar is `sticky top-0 z-40 h-14`
          // (layout/sidebar.tsx) while these tabs were also `top-0` at the much
          // lower `--z-elevated`, so on scroll the tab row slid under the bar
          // and visibly got clipped away. Reported as the tabs moving up and
          // down and getting cut out instead of the page just scrolling.
          className="relative z-10 flex gap-1 overflow-x-auto pl-[var(--space-m)] [scrollbar-width:none] max-lg:sticky max-lg:top-14 max-lg:z-[var(--z-elevated)] sm:pl-[var(--space-l)] [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((t) => (
            <FolderTab
              key={t.key}
              label={t.label}
              active={activeKey === t.key}
              onSelect={() => setTab(t.key)}
            />
          ))}
        </div>

        <div
          className="relative rounded-b-[var(--radius-xl)] rounded-tr-[var(--radius-xl)] border border-border bg-card"
          style={{ boxShadow: "0 1px 2px rgba(30,28,22,0.05), 0 22px 44px -30px rgba(30,28,22,0.42)" }}
        >
          <div className="px-[var(--space-l)] py-[var(--space-l)] sm:px-[var(--space-xl)] sm:py-[var(--space-xl)]">
            <FadeRise key={activeKey} y={10}>
              {activeKey === "about" && aboutNode}
              {activeKey === "posts" && <div className="max-w-[720px]">{postsNode}</div>}
              {activeKey === "photos" && photosNode}
              {activeKey === "saved" && savedNode}
            </FadeRise>
          </div>
        </div>
      </div>

      {/* Flag + admin, quiet at the very bottom. */}
      {(flagNode || adminNode) && (
        <div className="mt-[var(--space-l)]">
          {flagNode && <div className="px-1">{flagNode}</div>}
          {adminNode && <AdminDisclosure>{adminNode}</AdminDisclosure>}
        </div>
      )}
    </div>
  );
}
