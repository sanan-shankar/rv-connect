import type { Metadata } from "next";
import Link from "next/link";
import { Tree } from "@phosphor-icons/react/dist/ssr";
import { SupportContribute } from "@/components/support/support-contribute";
import { CostBar } from "@/components/support/cost-bar";
import { BirdGlyphV2 } from "@/components/common/bird-avatar-v2";

export const metadata: Metadata = {
  title: "Support",
  description: "Help keep the Rishi Valley community running.",
};

// The owner opted into publishing the one-time build cost: it runs as the
// second section of CostBar's card, a sibling of the monthly breakdown
// rather than a note nested inside it (see cost-bar.tsx). The amount
// recovered is a hand-maintained constant in cost-bar.tsx, since nothing
// tracks UPI contributions automatically.

// A hand-picked set of species for the reward preview: colourful and visibly
// different from one another (not the first N indices), because the point of
// this row is to show the collection's variety, not just that it exists.
// Indices are positions in SPECIES_FULL_NAMES / ARCHES (bird-avatar-v2.tsx).
const REWARD_SPECIES = [
  { i: 5, name: "Indian Pitta" },
  { i: 3, name: "Indian Roller" },
  { i: 9, name: "Coppersmith Barbet" },
  { i: 20, name: "Black-hooded Oriole" },
  { i: 22, name: "Purple Sunbird" },
  { i: 26, name: "Asian Paradise Flycatcher" },
  { i: 37, name: "Red Avadavat" },
  { i: 41, name: "Black-rumped Flameback" },
  { i: 43, name: "Purple-rumped Sunbird" },
  { i: 44, name: "Tickell's Blue Flycatcher" },
];

export default function SupportPage() {
  return (
    <div className="pb-[var(--space-xl)]">
      {/* Hero */}
      <header className="mb-[var(--space-xl)]">
        <style>{`
          @keyframes support-sway {
            0%, 100% { transform: rotate(-2deg); }
            50% { transform: rotate(2deg); }
          }
        `}</style>
        {/* Motif and title share one line (owner, 2026-08-02: "move that
            support to the right of the icon, the same height where the icon is
            in that line"). items-center rather than baseline-align: the motif
            is a 48px tile, not a glyph, so it has no baseline to share, and
            optical centring is what actually reads as "the same line". */}
        <div className="flex items-center gap-[var(--space-s)]">
          <span
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-leaf/10 text-leaf"
            aria-hidden
          >
            <span
              className="support-motif inline-flex"
              style={{ animation: "support-sway 6s ease-in-out infinite", transformOrigin: "50% 80%" }}
            >
              <Tree size={28} weight="duotone" />
            </span>
          </span>
          {/* Same weight and size as every other page title (PageHeader's h1);
              this one keeps its own element because it sits beside the motif
              rather than in the shared header block. */}
          <h1 className="font-heading text-[30px] leading-none tracking-[-0.02em] text-foreground">
            Support
          </h1>
        </div>
        <p className="mt-[var(--space-s)] text-lg leading-relaxed text-muted-foreground">
          Rishi Valley runs on a small monthly bill. If it has helped you find an
          old friend or a lost batchmate, you can help keep it going. The site
          is always free to use.
        </p>
      </header>

      {/* Honest cost breakdown, led by the colorful bar rather than a ledger */}
      <section aria-labelledby="costs-heading" className="mb-[var(--space-xl)]">
        <h2
          id="costs-heading"
          className="mb-[var(--space-s)] font-heading text-xl font-bold tracking-tight text-foreground"
        >
          What it actually costs
        </h2>
        <p className="leading-relaxed text-foreground">
          Two numbers, in rupees, exactly as they are. The small monthly bill
          for keeping the site running, and the one-time cost that went into
          designing and building it.
        </p>
        <CostBar />
      </section>

      {/* The one perk for chipping in, shown before the ask so the reward is
          seen before the QR code, not after it */}
      <section aria-labelledby="perk-heading" className="mb-[var(--space-xl)]">
        <h2
          id="perk-heading"
          className="mb-[var(--space-s)] font-heading text-xl font-bold tracking-tight text-foreground"
        >
          A little something back
        </h2>
        <p className="leading-relaxed text-foreground">
          Anyone who chips in gets to pick their own bird, instead of the one
          you were given at random.
        </p>
        <ul className="mt-[var(--space-m)] grid grid-cols-4 gap-x-[var(--space-s)] gap-y-[var(--space-m)] sm:grid-cols-5">
          {REWARD_SPECIES.map(({ i, name }) => (
            <li key={i}>
              {/* A bare 72px grid cell, no disc behind the glyph: the mist
                  circle read as a border drawn around every bird, and a box
                  must earn its border (owner, 2026-07-30). The span survives
                  purely to carry the accessible name and hold the cell size. */}
              <span
                className="inline-grid place-items-center"
                style={{ width: 72, height: 72 }}
                role="img"
                aria-label={name}
              >
                <BirdGlyphV2 seed={`birds-gallery-${i}`} px={72} speciesOverride={i} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-[var(--space-m)] leading-relaxed text-foreground">
          Choose any species from the{" "}
          <Link
            href="/birds"
            className="rounded-[2px] font-medium text-canopy underline decoration-canopy/40 underline-offset-2 transition-opacity duration-150 ease-out hover:decoration-canopy active:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            full collection
          </Link>{" "}
          of 50, to wear as your avatar across the site.
        </p>
      </section>

      {/* Contribution panel, sitting over the fixed background via .glass */}
      <section aria-labelledby="contribute-heading" className="mb-[var(--space-xl)]">
        <h2
          id="contribute-heading"
          className="mb-[var(--space-s)] font-heading text-xl font-bold tracking-tight text-foreground"
        >
          Chip in over UPI
        </h2>
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
          <SupportContribute />
        </div>
      </section>

      <p className="leading-relaxed text-foreground">Thank you for your support.</p>
    </div>
  );
}
