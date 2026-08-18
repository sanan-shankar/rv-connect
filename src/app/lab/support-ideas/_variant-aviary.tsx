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
import { BirdGlyphV2, GALLERY_SPECIES } from "@/components/common/bird-avatar-v2";
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

/* The wood.
 *
 * A CSS GRID of square cells with one bird nudged inside each, not an absolute
 * scatter. Three things fall out of that, and all three were problems in the
 * first pass:
 *
 *   Birds cannot overlap. A bird is 42% of its cell and its centre never leaves
 *   the middle 42%, so its furthest edge reaches 63% of the way out and two
 *   neighbours can never touch, at any width.
 *
 *   Birds scale with the screen instead of being pinned in pixels. The first
 *   version capped them at a fixed clamp and a phone got 12px specks (owner:
 *   "waaay too small on mobile"). A cell is a fraction of the container, so a
 *   phone gets four fat columns and a laptop gets nine lean ones, and the bird
 *   is the same fraction of a cell in both.
 *
 *   The layout is even. Random placement clumps: a few birds land on top of each
 *   other and leave bald patches everywhere else.
 *
 * Roughly one cell in six is left empty so the wood has clearings, chosen by a
 * fixed hash rather than Math.random so the server and the client lay out the
 * same wood. Every number is rounded before it reaches a style attribute for the
 * same reason: React compares the server's style string to the client's numbers,
 * and `20.359622773614056%` against `20.3596%` is a hydration mismatch even
 * though it is the same place.
 *
 * 156 cells covers a tall page at nine columns and a taller one at four. What
 * runs past the bottom is clipped. */
const round = (n: number, places = 2) => Number(n.toFixed(places));

const WOOD = Array.from({ length: 156 }, (_, i) => {
  const h = (n: number) => (Math.sin((i + 1) * n) + 1) / 2;
  return {
    key: i,
    empty: h(91.7) < 0.17,
    species: GALLERY_SPECIES[(i * 13) % GALLERY_SPECIES.length].index,
    // Percent of the cell. 29 to 71 keeps a 42%-wide bird fully inside it.
    x: round(29 + h(78.233) * 42),
    y: round(29 + h(12.9898) * 42),
    scale: round(0.72 + h(43.7) * 0.42, 3),
    opacity: round(0.2 + h(19.31) * 0.14, 3),
    duration: round(26 + h(31.7) * 16, 1),
    delay: round(h(53.1) * -24, 1),
  };
});

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
    <div className="relative min-h-screen overflow-hidden bg-background">
      <style>{`
        @keyframes aviary-drift {
          0%   { transform: translate3d(0, 0, 0); }
          50%  { transform: translate3d(4%, -6%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>

      {/* Weather, not content: aria-hidden, because a screen reader listing 130
          unnamed birds would be worse than silence. */}
      <div
        className="pointer-events-none absolute inset-0 grid grid-cols-4 overflow-hidden sm:grid-cols-6 lg:grid-cols-9"
        aria-hidden
      >
        {WOOD.map((b) =>
          b.empty ? (
            <div key={b.key} className="aspect-square" />
          ) : (
            <div key={b.key} className="relative aspect-square">
              {/* Two nested spans on purpose. The outer one owns the centring
                  translate, the inner one owns the drift, because a keyframe
                  setting `transform` would otherwise wipe the centring out and
                  drop every bird a half-cell down and right. */}
              <span
                className="absolute block w-[42%] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${b.x}%`, top: `${b.y}%`, opacity: b.opacity }}
              >
                <span
                  className="block aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
                  style={{
                    transform: `scale(${b.scale})`,
                    animation: `aviary-drift ${b.duration}s ease-in-out ${b.delay}s infinite`,
                  }}
                >
                  <BirdGlyphV2 seed={`wood-${b.key}`} px={64} speciesOverride={b.species} />
                </span>
              </span>
            </div>
          )
        )}
      </div>

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
