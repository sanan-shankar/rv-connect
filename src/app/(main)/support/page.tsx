import type { Metadata } from "next";
import Link from "next/link";
import { Tree } from "@phosphor-icons/react/dist/ssr";
import { SupportContribute } from "@/components/support/support-contribute";
import { BuildFundBar, CostBar } from "@/components/support/cost-bar";

export const metadata: Metadata = {
  title: "Support",
  description: "Help keep the Rishi Valley community running.",
};

// The owner opted into publishing the one-time build cost: it now runs as a
// fundraiser-style bar (BuildFundBar, ₹4,00,000 goal) under the monthly bill.
// The amount recovered is a hand-maintained constant in cost-bar.tsx, since
// nothing tracks UPI contributions automatically.

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl pb-[var(--space-xl)]">
      {/* Hero */}
      <header className="mb-[var(--space-xl)]">
        <style>{`
          @keyframes support-sway {
            0%, 100% { transform: rotate(-2deg); }
            50% { transform: rotate(2deg); }
          }
        `}</style>
        <span
          className="inline-flex h-12 w-12 items-center justify-center rounded-[var(--radius-lg)] bg-leaf/10 text-leaf"
          aria-hidden
        >
          <span
            className="support-motif inline-flex"
            style={{ animation: "support-sway 6s ease-in-out infinite", transformOrigin: "50% 80%" }}
          >
            <Tree size={28} weight="duotone" />
          </span>
        </span>
        <h1 className="mt-[var(--space-m)] font-heading text-3xl font-bold tracking-[-0.02em] text-foreground">
          Keep the network in the valley alive.
        </h1>
        <p className="mt-[var(--space-s)] text-lg leading-relaxed text-muted-foreground">
          Rishi Valley runs on a small monthly bill. If it has helped you find an
          old friend or a lost batchmate, you can help keep it going. There is no
          pressure, and the site is always free to use.
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
        <p className="mt-[var(--space-s)] text-sm leading-relaxed text-muted-foreground">
          A few people chipping in comfortably covers the whole month.
        </p>
        <BuildFundBar />
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

      {/* The one perk for chipping in */}
      <section aria-labelledby="perk-heading" className="mb-[var(--space-xl)]">
        <h2
          id="perk-heading"
          className="mb-[var(--space-s)] font-heading text-xl font-bold tracking-tight text-foreground"
        >
          A little something back
        </h2>
        <p className="leading-relaxed text-foreground">
          Anyone who chips in gets to pick their own bird. Instead of the one
          you were given at random, choose any species from our{" "}
          <Link
            href="/preview/birds-rv"
            className="rounded-[2px] font-medium text-canopy underline decoration-canopy/40 underline-offset-2 transition-opacity duration-150 ease-out hover:decoration-canopy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
          >
            collection
          </Link>{" "}
          of 50, to wear as your avatar across the site.
        </p>
      </section>

      <p className="leading-relaxed text-foreground">Thank you for your support.</p>
    </div>
  );
}
