"use client";

/* Concept 2 of 4: "Aviary". The owner's own idea, taken seriously.
 *
 * Fifty birds already live on this site. Nearly every member is wearing one. So
 * this page puts them everywhere: a wood of glyphs behind the whole thing, and
 * everything you read floating over it on glass.
 *
 * EVERY piece of text sits on a panel, the title and the pledge included. That
 * is not decoration, it is the rule that makes the concept work at all. A first
 * pass left the header bare on the page and dimmed the birds behind it instead;
 * the owner's verdict was "no birds behind text ruins readability", and he was
 * right, because a 34%-opacity bird behind a sentence is still a bird behind a
 * sentence. Glass blurs what is under it, so the wood stays at full strength
 * everywhere and the words stay clean. Nothing on this page is read off bare
 * background.
 *
 * The only birds at full colour are the fourteen in the middle panel, which is
 * the argument in one look. Fifty in the trees, fourteen you can have, one of
 * them yours. */

import { useState } from "react";
import { SupportWood } from "@/components/support/wood";
import { cn } from "@/lib/utils";
import {
  Amounts,
  BirdPlate,
  ContributeButton,
  Costs,
  Pledge,
  SectionTop,
  SeeTheRest,
  TrustNote,
} from "./_shared";

/* The wood is the SHARED SupportWood (src/components/support/wood.tsx), the
   exact field that ships on /support, rendered full-bleed here because this
   room has no sidebar and its header sits on glass. One generator, so the lab
   record and the shipped page can never drift apart again (they did once:
   density fixes landed here and not there, and the owner noticed). */

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={cn(
        "glass card-elevated rounded-[var(--radius)] border border-border p-[var(--space-l)]",
        className
      )}
    >
      {children}
    </section>
  );
}

export default function AviaryVariant() {
  const [amount, setAmount] = useState(1000);

  return (
    /* `isolate` makes this root its own stacking context. SupportWood paints
       at -z-10, and a negative-z child renders BELOW the nearest stacking
       context's in-flow backgrounds: without the isolation that context is
       the page root, so the wood slid behind this div's opaque bg-background
       and 91 birds rendered invisibly. Inside the app shell the content div
       is already `relative z-10`, which is why /support never needed this. */
    <div className="isolate relative min-h-screen overflow-hidden bg-background">
      <SupportWood inset={false} />

      <div className="relative mx-auto w-full max-w-3xl px-5 py-10 sm:px-7 lg:px-10">
        <div className="flex flex-col gap-[var(--space-l)]">
          {/* The title gets a panel like everything else. In the wood, a plaque
              is the honest object for it. */}
          <Panel>
            <h1 className="font-heading text-[clamp(2rem,6vw,2.75rem)] leading-none tracking-[-0.025em] text-foreground">
              Support
            </h1>
            <Pledge />
          </Panel>

          <Panel>
            <SectionTop title="Costs" />
            <Costs />
          </Panel>

          <Panel>
            <SectionTop title="Pick your bird" aside={<SeeTheRest />} />
            <p className="mt-[var(--space-xs)] max-w-[54ch] leading-relaxed text-foreground">
              Anyone who contributes picks their own bird, instead of the one they were given.
            </p>
            <BirdPlate />
          </Panel>

          <Panel>
            <SectionTop title="Contribute" />
            <Amounts value={amount} onChange={setAmount} />
            <ContributeButton amount={amount} />
            <TrustNote />
          </Panel>
        </div>
      </div>
    </div>
  );
}
