"use client";

/* Concept 3 of 4: "Days". The one that answers "how much should I give".
 *
 * ₹2,290 a month is a number nobody can weigh. ₹76 a day is a number everybody
 * can. So this page turns the bill into thirty marks and lets you watch your
 * amount fill some of them in.
 *
 * Pick ₹1,000 and thirteen marks light up in cinnamon. That is the whole idea
 * and it needs no explaining: you can see what your money buys before you read a
 * word about it. Cinnamon rather than leaf for your share, because leaf beside
 * canopy is two greens a reader has to tell apart, and this is the one
 * comparison on the page that has to be instant.
 *
 * The covered figure is a stand-in here, nine days. On the real page it comes
 * from the same Contribution sum the shipped bar already reads. */

import { useState } from "react";
import { motion } from "motion/react";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";
import {
  Amounts,
  BirdPlate,
  ConceptFrame,
  ContributeButton,
  Costs,
  DAYS_IN_MONTH,
  PER_DAY,
  Pledge,
  SectionTop,
  SeeTheRest,
  TrustNote,
  inr,
} from "./_shared";

/* Days of this month already paid for. Placeholder; see the header note. */
const COVERED = 9;

export default function DaysVariant() {
  const [amount, setAmount] = useState(1000);

  const buys = Math.floor(amount / PER_DAY);
  const room = DAYS_IN_MONTH - COVERED;
  const inMonth = Math.min(buys, room);
  const beyond = buys - inMonth;

  const sentence =
    beyond > 0
      ? `${inr(amount)} covers the rest of this month, and ${beyond} days after it.`
      : `${inr(amount)} covers ${inMonth} more days.`;

  return (
    <ConceptFrame>
      <header className="mb-[var(--space-xl)]">
        <h1 className="font-heading text-[30px] leading-none tracking-[-0.02em] text-foreground">
          Support
        </h1>
        <Pledge />
      </header>

      {/* The thesis, said once, at a size that means it. */}
      <p className="font-heading text-[clamp(1.5rem,4vw,2rem)] leading-tight tracking-[-0.02em] text-foreground">
        Keeping this site up costs <span className="text-canopy">{inr(PER_DAY)} a day</span>.
      </p>

      <section className="card-elevated mt-[var(--space-l)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
        {/* Thirty marks, one per day. Filled from the left with what has come
            in, then your amount in cinnamon, then the days nobody has paid for
            yet. Each mark is a flex child, so the strip fits any width without
            arithmetic. */}
        <div
          className="flex h-14 items-stretch gap-[3px] sm:gap-1"
          role="img"
          aria-label={`${COVERED} of ${DAYS_IN_MONTH} days this month are covered. ${sentence}`}
        >
          {Array.from({ length: DAYS_IN_MONTH }, (_, i) => {
            const paid = i < COVERED;
            const mine = !paid && i < COVERED + inMonth;
            return (
              <motion.span
                key={i}
                className={cn(
                  "flex-1 rounded-full transition-colors duration-300 ease-out",
                  paid ? "bg-canopy" : mine ? "bg-cinnamon" : "bg-mist"
                )}
                /* The strip grows out of its baseline on first view, left to
                   right, so the reader watches the month get built rather than
                   finding it already there. */
                initial={{ scaleY: 0.14 }}
                whileInView={{ scaleY: 1 }}
                viewport={{ once: true }}
                transition={{ ...SPRINGS.gentle, delay: i * 0.012 }}
                style={{ transformOrigin: "50% 100%" }}
              />
            );
          })}
        </div>

        <div className="mt-[var(--space-s)] flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)] text-sm text-muted-foreground">
          <span>This month</span>
          <span className="inline-flex items-center gap-[var(--space-m)]">
            <span className="inline-flex items-center gap-[var(--space-xs)]">
              <span className="inline-block h-2 w-2 rounded-full bg-canopy" />
              covered
            </span>
            <span className="inline-flex items-center gap-[var(--space-xs)]">
              <span className="inline-block h-2 w-2 rounded-full bg-cinnamon" />
              yours
            </span>
          </span>
        </div>

        <p className="mt-[var(--space-m)] h-6 text-[15px] leading-6">
          <motion.span
            key={sentence}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.28, ease: EASE_OUT_SMOOTH }}
            className="font-medium text-foreground"
          >
            {sentence}
          </motion.span>
        </p>

        <Amounts value={amount} onChange={setAmount} tone="cinnamon" />
        <ContributeButton amount={amount} />
        <TrustNote />
      </section>

      <section className="mt-[var(--space-xl)]">
        <SectionTop title="Where it goes" />
        <Costs />
      </section>

      {/* Birds come last here, as the thank-you rather than the argument. */}
      <section className="mt-[var(--space-xl)]">
        <SectionTop title="Pick your bird" aside={<SeeTheRest />} />
        <p className="mt-[var(--space-xs)] max-w-[54ch] leading-relaxed text-foreground">
          Anyone who contributes picks their own bird, instead of the one they were given.
        </p>
        <BirdPlate />
      </section>
    </ConceptFrame>
  );
}
