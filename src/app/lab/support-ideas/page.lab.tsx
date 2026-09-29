"use client";

/* ------------------------------------------------------------------ *
 *  Four ways to ask — Support page concepts.
 *
 *  The room is the harness only: the sticky switcher and the four
 *  cards that explain what you are about to look at. Every concept
 *  lives in its own ./_variant-<key>.tsx and takes no props. They all
 *  pull the same copy, the same rupees and the same fourteen birds out
 *  of ./_shared, so a difference you see between two of them is a
 *  design difference and never a data one.
 *
 *  Deep links for screenshots: append ?v=<key>, e.g.
 *    http://localhost:3000/lab/support-ideas?v=stamps
 *  Keys: plate | aviary | days | stamps. Anything else falls back to
 *  plate, and clicking a tab rewrites ?v= so the address bar always
 *  matches what is on screen.
 * ------------------------------------------------------------------ */

import { Suspense } from "react";
import Link from "@/components/common/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { PeaksMark } from "@/components/layout/peaks-mark";
import { SPRINGS, SpringPress } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import PlateVariant from "./_variant-plate";
import AviaryVariant from "./_variant-aviary";
import DaysVariant from "./_variant-days";
import StampsVariant from "./_variant-stamps";

const CONCEPTS = [
  {
    key: "plate",
    label: "Plate",
    tag: "the calm one",
    line: "The page you have, with its hierarchy sorted out. Three cards, one heading shape, and the birds are the only loud thing on it.",
    Component: PlateVariant,
  },
  {
    key: "aviary",
    label: "Aviary",
    tag: "birds behind everything",
    line: "Fifty birds drift behind the whole page, pale and slow. The only ones at full colour are the fourteen you can have.",
    Component: AviaryVariant,
  },
  {
    key: "days",
    label: "Days",
    tag: "₹76 a day",
    line: "The bill as thirty marks, one per day. Pick an amount and watch it fill some of them in. You see what your money buys before you read anything.",
    Component: DaysVariant,
  },
  {
    key: "stamps",
    label: "Stamps",
    tag: "a sheet of fourteen",
    line: "Two rows of seven is a sheet of stamps. Click one and the button says which bird you are claiming, so the reward stops being a sentence.",
    Component: StampsVariant,
  },
] as const;

type ConceptKey = (typeof CONCEPTS)[number]["key"];

function isConceptKey(value: string | null): value is ConceptKey {
  return !!value && CONCEPTS.some((c) => c.key === value);
}

function SupportIdeasRoom() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("v");
  const active: ConceptKey = isConceptKey(requested) ? requested : CONCEPTS[0].key;
  const activeConcept = CONCEPTS.find((c) => c.key === active)!;
  const Active = activeConcept.Component;

  function select(key: ConceptKey) {
    const next = new URLSearchParams(params.toString());
    next.set("v", key);
    router.replace(`/lab/support-ideas?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Slim and always there, so you can flip concepts from anywhere down
          the page instead of scrolling back to the top. */}
      <header className="glass sticky top-0 z-[var(--z-elevated)] flex flex-wrap items-center gap-[var(--space-s)] border-b border-border px-[var(--space-m)] py-[var(--space-s)]">
        <Link
          href="/lab"
          className="state-layer inline-flex shrink-0 items-center gap-[var(--space-xs)] rounded-full border border-border bg-card px-[var(--space-s)] py-1.5 text-[12.5px] font-semibold text-muted-foreground transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <PeaksMark size={16} />
          Lab
        </Link>

        <nav className="flex flex-1 flex-wrap items-center gap-[var(--space-xs)]" aria-label="Concept">
          {CONCEPTS.map((c) => {
            const on = c.key === active;
            return (
              <SpringPress
                key={c.key}
                as="button"
                onClick={() => select(c.key)}
                aria-pressed={on}
                className={cn(
                  "rounded-full border px-[var(--space-m)] py-1.5 text-[13px] font-semibold",
                  "transition-[background-color,border-color,color] duration-150 ease-out",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  on
                    ? "border-transparent bg-canopy text-white shadow-[0_5px_13px_-12px_var(--color-canopy)]"
                    : "state-layer border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {c.label}
              </SpringPress>
            );
          })}
        </nav>
      </header>

      {/* What you are looking at. Short, because the concepts below say it
          better than any paragraph can. */}
      <div className="mx-auto w-full max-w-3xl px-5 pb-[var(--space-l)] pt-[var(--space-xl)] sm:px-7 lg:px-10">
        <h1 className="font-heading text-[clamp(1.9rem,5vw,2.4rem)] leading-none tracking-[-0.025em] text-foreground">
          Four ways to ask
        </h1>
        <p className="mt-[var(--space-m)] max-w-[58ch] text-[17px] leading-[1.7] text-foreground">
          Support today opens with a heading, then grey text, then a subheading, then body text,
          then boxes that repeat the same stack inside themselves. Twelve text sizes on one page,
          and nothing tells you which one to read first.
        </p>
        <p className="mt-[var(--space-s)] max-w-[58ch] leading-relaxed text-muted-foreground">
          Here are four ways out. All four carry the same words, the same rupees and the same
          fourteen birds, so anything you see different between them is a design decision.
        </p>

        <ul className="mt-[var(--space-l)] grid gap-[var(--space-s)] sm:grid-cols-2">
          {CONCEPTS.map((c) => {
            const on = c.key === active;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => select(c.key)}
                  aria-pressed={on}
                  className={cn(
                    "h-full w-full rounded-[var(--radius)] border p-[var(--space-m)] text-left",
                    "transition-[background-color,border-color] duration-150 ease-out",
                    "active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    on
                      ? "card-elevated border-canopy/35 bg-card"
                      : "state-layer border-border bg-card/60"
                  )}
                >
                  <span className="flex items-baseline gap-[var(--space-xs)]">
                    <span className="font-heading text-lg leading-tight tracking-[-0.02em] text-foreground">
                      {c.label}
                    </span>
                    <span className="text-[13px] text-muted-foreground">{c.tag}</span>
                  </span>
                  <span className="mt-[var(--space-xs)] block text-sm leading-relaxed text-muted-foreground">
                    {c.line}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-[var(--space-l)] text-sm leading-relaxed text-muted-foreground">
          Below is the live concept at the width it would really ship at. No sidebar, so give it the
          extra 248px in your head. The bird plate reacts to a pointer, the amounts are clickable,
          and in Stamps so are the stamps.
        </p>
      </div>

      {/* A hairline where the room stops and the product starts. */}
      <div className="border-t border-border" />

      <main>
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRINGS.gentle}
        >
          <Active />
        </motion.div>
      </main>
    </div>
  );
}

export default function SupportIdeasPage() {
  // useSearchParams needs a Suspense boundary in a client component; see
  // node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SupportIdeasRoom />
    </Suspense>
  );
}
