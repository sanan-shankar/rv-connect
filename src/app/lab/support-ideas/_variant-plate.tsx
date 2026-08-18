"use client";

/* Concept 1 of 4: "Plate". The chill one.
 *
 * This is the shipped page with its hierarchy sorted out. The complaint it
 * answers (owner, 2026-08-18): heading, grey text, subheading, body text, then
 * boxes repeating the same stack inside themselves, then chips doing a fifth
 * thing. Twelve text sizes on one page.
 *
 * The fix is one rule. Every section is a card, every card opens with the same
 * line, and nothing outside a card is a heading. So the page has three levels
 * and no more: the page title, the card title, and body.
 *
 * The birds are the middle card, at full size on paper, and they are the only
 * loud thing on the page. */

import { useState } from "react";
import { Tree } from "@phosphor-icons/react/dist/ssr";
import {
  Amounts,
  BirdPlate,
  ConceptFrame,
  ContributeButton,
  Costs,
  MIN_RUPEES,
  Pledge,
  SectionTop,
  SeeTheRest,
  TrustNote,
  inr,
} from "./_shared";

function Card({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card-elevated rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
      <SectionTop title={title} aside={aside} />
      {children}
    </section>
  );
}

export default function PlateVariant() {
  const [amount, setAmount] = useState(1000);

  return (
    <ConceptFrame>
      <header className="mb-[var(--space-xl)]">
        <div className="flex items-center gap-[var(--space-s)]">
          <span
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-leaf/30 bg-leaf/[0.07] text-leaf"
            aria-hidden
          >
            <Tree size={26} weight="duotone" />
          </span>
          <h1 className="font-heading text-[30px] leading-none tracking-[-0.02em] text-foreground">
            Support
          </h1>
        </div>
        {/* Not a grey subtitle. These three sentences are the reason the page
            exists, so they are set in the reading colour at a reading size. */}
        <Pledge />
      </header>

      <div className="flex flex-col gap-[var(--space-l)]">
        <Card title="Costs">
          <Costs />
        </Card>

        <Card title="Pick your bird" aside={<SeeTheRest />}>
          <p className="mt-[var(--space-xs)] max-w-[54ch] leading-relaxed text-foreground">
            Anyone who contributes picks their own bird, instead of the one they were given.
          </p>
          <BirdPlate />
        </Card>

        <Card
          title="Contribute"
          aside={<span className="text-sm text-muted-foreground">From {inr(MIN_RUPEES)}</span>}
        >
          {/* The "PICK AN AMOUNT" caps label is gone. The card is called
              Contribute and the row is five rupee figures; a label above it was
              saying the same thing a third time. */}
          <Amounts value={amount} onChange={setAmount} />
          <ContributeButton amount={amount} />
          <TrustNote />
        </Card>
      </div>
    </ConceptFrame>
  );
}
