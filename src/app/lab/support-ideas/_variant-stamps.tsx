"use client";

/* Concept 4 of 4: "Stamps". The charming one.
 *
 * Two rows of seven is a sheet of stamps. Once you see that you cannot unsee it,
 * and it fixes the thing the shipped page never solved: the reward is abstract.
 * "You can pick your own bird" is a sentence. A sheet of fourteen bird stamps
 * with one of them claimed is a thing you can want.
 *
 * So the birds are not a gallery here, they are the picker. Click one and the
 * button says which bird you are claiming. That is the whole interaction and it
 * needs no instructions.
 *
 * The perforation is a real path, not a border trick: STAMP_PATH punches
 * half-circle notches along all four edges. mask-composite was the first try and
 * is still uneven across browsers, and a stamp with a straight edge is a white
 * tile. */

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { BirdGlyphV2 } from "@/components/common/bird-avatar-v2";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import {
  AMOUNTS,
  Amounts,
  ConceptFrame,
  Costs,
  PLATE,
  Pledge,
  SectionTop,
  SeeTheRest,
  TrustNote,
  inr,
} from "./_shared";

/* The stamp is drawn in its own 100 x 118 space and scaled by the grid, so one
   path serves every size. Real stamps are taller than they are wide; square ones
   read as coasters. */
const SW = 100;
const SH = 118;
const PERF = 4.4; // notch radius

/* Notches along one edge, walking clockwise round the shape. `n` is picked per
   edge so the pitch lands near 11 units, which is roughly the tooth spacing on
   an Indian definitive and, more to the point, the spacing at which teeth stop
   reading as a wobble and start reading as perforation. */
function edge(from: [number, number], to: [number, number], n: number): string {
  const [x1, y1] = from;
  const [x2, y2] = to;
  const dx = (x2 - x1) / n;
  const dy = (y2 - y1) / n;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  let d = "";
  for (let i = 0; i < n; i++) {
    const cx = x1 + dx * (i + 0.5);
    const cy = y1 + dy * (i + 0.5);
    d += ` L ${(cx - ux * PERF).toFixed(2)} ${(cy - uy * PERF).toFixed(2)}`;
    // sweep-flag 0 bites INTO the shape on a clockwise walk. A 1 here bulges the
    // notches outward and gives a flower rather than a stamp.
    d += ` A ${PERF} ${PERF} 0 0 0 ${(cx + ux * PERF).toFixed(2)} ${(cy + uy * PERF).toFixed(2)}`;
  }
  d += ` L ${x2} ${y2}`;
  return d;
}

const STAMP_PATH =
  `M 0 0` +
  edge([0, 0], [SW, 0], 9) +
  edge([SW, 0], [SW, SH], 11) +
  edge([SW, SH], [0, SH], 9) +
  edge([0, SH], [0, 0], 11) +
  " Z";

function Stamp({
  species,
  seed,
  name,
  chosen,
  faded,
  onChoose,
  onPoint,
}: {
  species: number;
  seed: string;
  name: string;
  chosen: boolean;
  faded: boolean;
  onChoose: () => void;
  onPoint: () => void;
}) {
  const clipId = useMemo(() => `stamp-clip-${species}`, [species]);

  return (
    <button
      type="button"
      onClick={onChoose}
      onPointerEnter={onPoint}
      aria-pressed={chosen}
      aria-label={name}
      /* No hover transform: the sheet stays flat and the claimed stamp is marked
         by colour. The press sink is the one movement, because that is feedback
         for something you did. The fade runs at 360ms, not the 150 it started
         at, which flickered as the pointer crossed the sheet. */
      className="relative block w-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring active:scale-[0.97]"
      style={{
        aspectRatio: `${SW} / ${SH}`,
        opacity: faded ? 0.4 : 1,
        transition: "opacity 360ms cubic-bezier(0.16, 1, 0.3, 1), transform 150ms ease-out",
      }}
    >
      {/* drop-shadow, not box-shadow: it follows the perforated PATH, so the
          shadow has teeth too. A box shadow would draw a plain rectangle behind
          a scalloped stamp and give the whole sheet away. */}
      <svg
        viewBox={`0 0 ${SW} ${SH}`}
        className="block h-full w-full"
        style={{ filter: "drop-shadow(0 2px 4px rgb(36 26 18 / 0.10))" }}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={STAMP_PATH} />
          </clipPath>
        </defs>
        {/* Float white, the one pure-white surface in the system, which is
            exactly right for paper sitting on the tan page. */}
        <path d={STAMP_PATH} fill="var(--color-float)" />
        <g clipPath={`url(#${clipId})`}>
          {/* The engraved frame. Canopy once the stamp is claimed. */}
          <rect
            x={7}
            y={7}
            width={SW - 14}
            height={SH - 14}
            fill="none"
            stroke={chosen ? "var(--color-canopy)" : "var(--color-border)"}
            strokeWidth={chosen ? 1.6 : 1}
            className="transition-[stroke,stroke-width] duration-200 ease-out"
          />
          {/* Centred inside the engraved frame, not inside the stamp. The
              frame is inset 7 on every side, so a 78-unit glyph sits at
              (100-78)/2 across and 7+(104-78)/2 down. The first cut used the
              stamp's own midline and left twice as much white below the bird as
              above it. */}
          <g transform={`translate(${(SW - 78) / 2} ${7 + (SH - 14 - 78) / 2}) scale(0.78)`}>
            <BirdGlyphV2 seed={seed} px={100} speciesOverride={species} />
          </g>
        </g>
      </svg>

      {chosen && (
        <motion.span
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRINGS.snappy}
          className="absolute -right-1 -top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-canopy text-white shadow-[0_4px_10px_-6px_var(--color-canopy)]"
          aria-hidden
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </motion.span>
      )}
    </button>
  );
}

export default function StampsVariant() {
  const [chosen, setChosen] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  const [amount, setAmount] = useState(AMOUNTS[1]);

  const shown = over ?? chosen;

  return (
    <ConceptFrame>
      <header className="mb-[var(--space-xl)]">
        <h1 className="font-heading text-[30px] leading-none tracking-[-0.02em] text-foreground">
          Support
        </h1>
        <Pledge />
      </header>

      {/* The sheet sits straight on the page, no card. White paper on tan is
          already its own edge, and a card round it would be a second frame
          around fourteen framed things. */}
      <section>
        <SectionTop title="Claim a bird" aside={<SeeTheRest />} />
        <p className="mt-[var(--space-xs)] max-w-[54ch] leading-relaxed text-foreground">
          Anyone who contributes picks their own bird, instead of the one they were given.
        </p>

        <div
          onPointerLeave={() => setOver(null)}
          className="mt-[var(--space-m)] grid grid-cols-7 gap-[var(--space-xs)] sm:gap-[var(--space-s)]"
        >
          {PLATE.map(({ name, index, seed }, i) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ ...SPRINGS.gentle, delay: i * 0.03 }}
            >
              <Stamp
                species={index}
                seed={seed}
                name={name}
                chosen={chosen === i}
                faded={shown !== null && shown !== i}
                onChoose={() => setChosen(chosen === i ? null : i)}
                onPoint={() => setOver(i)}
              />
            </motion.div>
          ))}
        </div>

        <p className="mt-[var(--space-m)] h-5 text-sm leading-5">
          {shown !== null && (
            <motion.span
              key={PLATE[shown].name}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: EASE_OUT_SMOOTH }}
              className="font-medium text-foreground"
            >
              {PLATE[shown].name}
            </motion.span>
          )}
        </p>
      </section>

      <section className="card-elevated mt-[var(--space-xl)] rounded-[var(--radius)] border border-border bg-card p-[var(--space-l)]">
        <SectionTop title="Contribute" />
        <Amounts value={amount} onChange={setAmount} />

        {/* The button carries the bird. This is the payoff of the sheet: the
            claim and the payment become one sentence, so nobody has to be told
            what picking a stamp did. */}
        <button
          type="button"
          className="mt-[var(--space-m)] inline-flex h-12 w-full items-center justify-center gap-[0.3em] rounded-full bg-sky px-[var(--space-l)] text-[15px] font-semibold text-white shadow-[0_6px_16px_-12px_var(--color-sky)] transition-[transform,filter] duration-150 ease-out hover:brightness-[1.06] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky sm:w-auto"
        >
          <motion.span
            key={chosen === null ? "plain" : PLATE[chosen].name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, ease: EASE_OUT_SMOOTH }}
          >
            {chosen === null
              ? `Contribute ${inr(amount)}`
              : `Contribute ${inr(amount)} and claim the ${PLATE[chosen].name}`}
          </motion.span>
        </button>

        <TrustNote />
      </section>

      <section className="mt-[var(--space-l)]">
        <SectionTop title="Costs" />
        <Costs />
      </section>
    </ConceptFrame>
  );
}
