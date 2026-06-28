import type { Metadata } from "next";
import { Tree } from "@phosphor-icons/react/dist/ssr";
import { SupportContribute } from "@/components/support/support-contribute";

export const metadata: Metadata = {
  title: "Support",
  description: "Help keep the RV Alumni network in the valley alive.",
};

// The owner's real recurring costs, in plain language. Honesty is the whole
// point of this page; these are the figures from the infra plan, not inflated.
const COSTS = [
  {
    label: "Server (always on)",
    detail: "Render, kept warm so the first visit each day is not slow",
    amount: "about ₹600 / month",
  },
  {
    label: "Database",
    detail: "Where every profile, post, and photo lives",
    amount: "about ₹550 / month",
  },
  {
    label: "Image storage and delivery",
    detail: "Hosting and serving the photos people share",
    amount: "a few hundred, usage based",
  },
  {
    label: "Email",
    detail: "Sign-in links and invites",
    amount: "small, most months free",
  },
  {
    label: "Domain name",
    detail: "Renewed once a year",
    amount: "about ₹1,000 / year",
  },
];

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
          @media (prefers-reduced-motion: reduce) {
            .support-motif { animation: none !important; }
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
          RV Alumni runs on a small monthly bill. If it has helped you find an
          old friend or a lost batchmate, you can help keep it going. There is no
          pressure, and the site is always free to use.
        </p>
      </header>

      {/* Honest cost breakdown, as a ruled sheet so it reads like the feed */}
      <section aria-labelledby="costs-heading" className="mb-[var(--space-xl)]">
        <h2
          id="costs-heading"
          className="mb-[var(--space-s)] font-heading text-xl font-bold tracking-tight text-foreground"
        >
          What it actually costs
        </h2>
        <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
          {COSTS.map((c) => (
            <div
              key={c.label}
              className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)] border-b border-border px-[var(--space-l)] py-[var(--space-m)] last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-foreground">{c.label}</p>
                <p className="mt-[var(--space-xxs)] text-sm leading-relaxed text-muted-foreground">
                  {c.detail}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                {c.amount}
              </p>
            </div>
          ))}
          <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)] bg-mist px-[var(--space-l)] py-[var(--space-m)]">
            <p className="font-semibold text-foreground">All in</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              roughly ₹1,200 to ₹1,500 a month to run
            </p>
          </div>
        </div>
        <p className="mt-[var(--space-s)] text-sm leading-relaxed text-muted-foreground">
          These are the real numbers, not rounded up. A few people chipping in is
          enough to cover the whole thing.
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

      {/* What support pays for */}
      <section aria-labelledby="why-heading">
        <h2
          id="why-heading"
          className="mb-[var(--space-s)] font-heading text-xl font-bold tracking-tight text-foreground"
        >
          What your support pays for
        </h2>
        <p className="leading-relaxed text-foreground">
          Your contribution keeps the directory, the feed, the groups, and the
          Valley Collection running, with no ads and no one selling your details.
          It stays invite only, built for this community and no one else.
          Supporting is never a requirement to be here.
        </p>
        <p className="mt-[var(--space-m)] text-sm leading-relaxed text-muted-foreground">
          Thank you to everyone quietly keeping this going.
        </p>
      </section>
    </div>
  );
}
