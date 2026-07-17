import type { Metadata } from "next";
import Link from "next/link";
import { Tree } from "@phosphor-icons/react/dist/ssr";
import { SupportContribute } from "@/components/support/support-contribute";
import { CostBar } from "@/components/support/cost-bar";

export const metadata: Metadata = {
  title: "Support",
  description: "Help keep the Rishi Valley community running.",
};

// Owner may later opt into publishing the one-time build cost on this page
// (a figure around $3,000 went into designing and building the site itself).
// Until that's confirmed, the page only acknowledges it in a sentence below,
// with no number attached.

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
          A real, one-time cost went into designing and building the site
          itself. What is below is not that. This is just the small monthly
          bill for keeping it running, in rupees, exactly as it is.
        </p>
        <CostBar />
        <p className="mt-[var(--space-s)] text-sm leading-relaxed text-muted-foreground">
          A few people chipping in comfortably covers the whole month.
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
