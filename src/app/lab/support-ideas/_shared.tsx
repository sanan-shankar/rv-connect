"use client";

/* Everything the four Support concepts have in common: the copy, the money, the
   fourteen birds, and the blocks that are identical in all four. Kept here so a
   concept can never quietly invent its own numbers or its own wording, and so a
   change lands in all four at once. What a concept owns is the ARRANGEMENT.

   Owner notes folded in, 2026-08-18:
     - no "actually" in front of costs
     - no "A few people chipping in comfortably covers the whole month"
     - no "If it has helped you find an old friend or a lost batchmate..."
     - no "Fourteen of the fifty", no "One time, never a subscription"
     - the site is never called "Rishi Valley" here, it is "this site"
     - the button is Contribute, not Chip in. The register is formal.
     - the second bar has to say plainly that it is the build cost coming back */

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { birdFor } from "@/lib/avatar";
import { BirdGlyphV2, SPECIES_FULL_NAMES } from "@/components/common/bird-avatar-v2";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Words and money
 * ------------------------------------------------------------------ */

/* Four facts, set as four LINES rather than run together as a paragraph.
   As prose the block broke wherever the measure happened to run out, which put
   the fold in the middle of "not for / profit" and made the most important
   sentence on the page look accidental. One sentence to a line means every break
   is a full stop.
   Every line is short enough to survive a 390px screen without wrapping, which
   is why "and it is not for profit" was cut loose into its own sentence rather
   than left hanging off the first. It is a better line on its own anyway. */
export const PLEDGE = [
  "This site is not for profit and will always be free to use.",
  "Donations are much appreciated and go towards running and improving it for everyone.",
  "Anything left over goes to the school.",
];

export const SEGMENTS = [
  { label: "Hosting", value: 1950, color: "var(--color-canopy)" },
  { label: "Domain", value: 250, color: "var(--color-cinnamon)" },
  { label: "Photos", value: 90, color: "var(--color-sky)" },
];

export const MONTHLY = SEGMENTS.reduce((sum, s) => sum + s.value, 0); // 2290

export const BUILD_COST = 400000;
export const BUILD_RECOVERED = 0;

/* ₹76. The month strip in the Days concept rests on this, so it is derived from
   the monthly bill rather than typed. A 30-day month: the point is the scale,
   not a calendar. */
export const DAYS_IN_MONTH = 30;
export const PER_DAY = Math.round(MONTHLY / DAYS_IN_MONTH);

export const AMOUNTS = [500, 1000, 2000, 3430, 5000];
export const MIN_RUPEES = 100;

export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ *
 *  The fourteen birds
 * ------------------------------------------------------------------ */

/* The fourteen the owner picked (2026-08-18), laid out to show off how
 * different from each other they are.
 *
 * The order is neither his listing order nor the species order. It is arranged,
 * and the arrangement rests on one fact about a two-row grid: two cells touch,
 * side by side or corner to corner, exactly when their COLUMNS are less than two
 * apart. Rows do not come into it. So keeping look-alikes off each other is a
 * question of column spacing and nothing else.
 *
 * Their real disc colours, read off the rendered glyphs rather than guessed at:
 *
 *   Avadavat    #C0392B red        Kite          #A8431F rust
 *   Munia       #7A3A23 dark brown Dove          #D2977E salmon
 *   Owlet       #8C7B66 tan        Oriole        #E8B82E gold
 *   Leafbird    #4FA63C green      Pitta         #4FA05E green
 *   P-r Sunbird #277C49 dark green WT Kingfisher #1F9FB2 teal
 *   Verditer    #46A9BE cyan       C Kingfisher  #1FA6D6 blue
 *   P Sunbird   #5A3E7A purple     Cormorant     #2A2A30 near black
 *
 * Four look-alike sets fall out of that: three greens, three teal-to-blues,
 * three reds and browns, and two pale muted ones. Each set is spread across
 * columns at least two apart, so no member of a set ever touches another:
 *
 *   reds    columns 1, 3, 5        teal to blue  columns 2, 4, 6
 *   greens  columns 3, 5, 7        pale muted    columns 1 and 7
 *
 * That leaves the three one-of-a-kind birds, gold, purple and black, for
 * columns 2, 4 and 6, where they break up the cool run.
 *
 * Reading across it gives red, cyan, green, gold, dark brown, teal, salmon on
 * top, and tan, black, rust, blue, green, purple, dark green below. No two
 * neighbours share a hue, every column pairs a warm bird with a cool one, and
 * three columns land on near complementaries: green over rust, gold over blue,
 * salmon over dark green.
 *
 * The Avadavat opens because a saturated red circle is the strongest thing to
 * land on. The two washed-out birds, the Owlet and the Dove, sit on opposite
 * corners so they balance each other instead of dulling one end. The Cormorant
 * is the single dark note, placed early in the bottom row the way a full stop
 * lands in a sentence. The Common Kingfisher draws larger than the rest of the
 * set, so it goes mid-row where it reads as the centre of the plate rather than
 * as a mistake at an edge.
 *
 * Names, not indices. The row this replaces was a list of raw indices, and when
 * the Indian Roller was reserved the numbers shifted and one bird spent weeks
 * captioned as another. A name that no longer exists throws here, at module
 * load, which is deterministic: if it renders once in dev it cannot fail in
 * production. */
const PLATE_NAMES = [
  // Row one
  "Red Avadavat",
  "Verditer Flycatcher",
  "Jerdon's Leafbird",
  "Indian Golden Oriole",
  "Tricolored Munia",
  "White-throated Kingfisher",
  "Laughing Dove",
  // Row two
  "Spotted Owlet",
  "Little Cormorant",
  "Brahminy Kite",
  "Common Kingfisher",
  "Indian Pitta",
  "Purple Sunbird",
  "Purple-rumped Sunbird",
];

/* Which way a bird faces is not a prop, it is the seed: BirdGlyphV2 mirrors the
   glyph when birdFor(seed).pose is 2 or 3, and pose is a salted hash of the seed
   string. Left on the shipped `birds-gallery-N` seeds the fourteen face
   whichever way the hash felt like, which is the last thing you want on a plate
   whose whole job is comparison.

   This walks `plate-<index>-<k>` upward until the pose lands on the side we
   want. Pure function of the index, so the server and the client agree and the
   plate never changes between renders, and a future species swap gets turned to
   face the same way as the rest with no hand-picked magic string.

   Everything faces RIGHT. A field guide plates its birds one way for a reason:
   hold the direction still and the differences between bills, crests and
   postures are the only thing left moving, which is exactly what this row is
   for. The Spotted Owlet is the one exception the set hands us for free, drawn
   head-on, so it ends up the single bird looking back at you. */
function seedFacingRight(index: number): string {
  for (let k = 0; k < 64; k++) {
    const seed = `plate-${index}-${k}`;
    if (birdFor(seed).pose < 2) return seed;
  }
  // Unreachable with a 4-value pose. The fallback only exists so a future pose
  // change cannot hang the module.
  return `plate-${index}-0`;
}

export const PLATE = PLATE_NAMES.map((name) => {
  const index = SPECIES_FULL_NAMES.indexOf(name);
  if (index < 0) throw new Error(`Unknown species on the support plate: ${name}`);
  return { name, index, seed: seedFacingRight(index) };
});

/* ------------------------------------------------------------------ *
 *  Shared blocks
 * ------------------------------------------------------------------ */

export function ConceptFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-h-screen bg-background", className)}>
      <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-7 lg:px-10">{children}</div>
    </div>
  );
}

export function Pledge() {
  return (
    <div className="mt-[var(--space-m)] space-y-[var(--space-xxs)] text-[17px] leading-[1.55] text-foreground">
      {PLEDGE.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  );
}

/* One heading shape. Baskerville at 20px in the face's own regular weight, not
   bold: the page title beside it is 30px regular, and a bolded 20 under a
   regular 30 reads heavier than its parent. The aside sits on the same line so
   a section never needs a second row to say one small thing. */
export function SectionTop({ title, aside }: { title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xs)]">
      <h2 className="font-heading text-xl leading-tight tracking-[-0.02em] text-foreground">
        {title}
      </h2>
      {aside}
    </div>
  );
}

/* The costs.
 *
 * Two goes at this failed the same way. A pair of 20px bars in a 250px card left
 * most of the card empty. Replacing them with a right-aligned list was worse:
 * across a 716px column the label sat at the far left and its number at the far
 * right, 500px apart, so nothing connected "Hosting" to "₹1,950" (owner: "an
 * even more poor use of space").
 *
 * So the bar carries its own biggest label. Hosting is 85% of the bill, which at
 * 44px tall is a block wide enough to hold "Hosting" and "₹1,950" inside it in
 * white, and white on canopy measures 7.78:1. The two small ones cannot: domain
 * is 78px wide, photos 28px, and white on cinnamon is 4.13:1 anyway, under the
 * 4.5 AA floor for small text. They get named underneath, right-aligned so each
 * sits beside its own segment.
 *
 * The asymmetry IS the finding. One block runs nearly the whole way across and
 * two slivers cling to the end, which tells you hosting is the bill and the rest
 * is rounding before you have read a single number. */
export function Costs() {
  const pct = (v: number) => (v / MONTHLY) * 100;

  return (
    <div>
      <div className="mt-[var(--space-m)] flex h-11 w-full gap-1 overflow-hidden rounded-full bg-mist p-1">
        <motion.div
          className="flex h-full w-full origin-left gap-1"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={SPRINGS.gentle}
        >
          {SEGMENTS.map((s, i) => (
            <div
              key={s.label}
              style={{ width: `${pct(s.value)}%`, background: s.color }}
              className="flex h-full items-center justify-between overflow-hidden rounded-full"
            >
              {/* Only the first segment is wide enough to say anything. */}
              {i === 0 && (
                <>
                  <span className="whitespace-nowrap pl-[var(--space-m)] text-[13px] font-semibold text-white">
                    {s.label}
                  </span>
                  <span className="whitespace-nowrap pr-[var(--space-m)] text-[13px] font-semibold tabular-nums text-white">
                    {inr(s.value)}
                  </span>
                </>
              )}
            </div>
          ))}
        </motion.div>
      </div>

      {/* The two slivers, named on their own line and right-aligned so each
          label sits under the end of the bar where its segment actually is.
          They shared a line with the total once and the ₹90 ended up touching
          the ₹2,290, which read as one number broken in half. */}
      <ul className="mt-[var(--space-s)] flex flex-wrap justify-end gap-x-[var(--space-m)] gap-y-[var(--space-xxs)] text-sm">
        {SEGMENTS.slice(1).map((s) => (
          <li key={s.label} className="inline-flex items-baseline gap-[var(--space-xs)]">
            <span
              className="inline-block h-2 w-2 shrink-0 translate-y-[-0.1em] rounded-full"
              style={{ background: s.color }}
            />
            <span className="text-foreground">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">{inr(s.value)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-[var(--space-s)] flex items-baseline justify-between gap-[var(--space-m)] border-t border-border pt-[var(--space-s)]">
        <p className="text-[15px] font-semibold text-foreground">Every month</p>
        <p className="font-heading text-2xl leading-none tabular-nums text-canopy">{inr(MONTHLY)}</p>
      </div>

      {/* The one-time build cost, and how much of it has come back. The shipped
          page showed a bar with no figures at either end, so nobody could tell
          what it was measuring. "₹0 of ₹4,00,000" answers that in one line and
          is the honest number. */}
      <div className="mt-[var(--space-l)] flex flex-wrap items-baseline justify-between gap-x-[var(--space-m)] gap-y-[var(--space-xxs)]">
        <p className="text-[15px] font-semibold text-foreground">
          Recovering what it cost to build
        </p>
        <p className="text-[15px] tabular-nums text-muted-foreground">
          {inr(BUILD_RECOVERED)} of {inr(BUILD_COST)}
        </p>
      </div>
      {/* Nothing has come back yet, so the fill is a circle resting at the left
          end. A fill whose minimum width equals its height reads as progress
          that has started, never as a knob on a rail. */}
      <div
        className="mt-[var(--space-s)] flex h-5 w-full overflow-hidden rounded-full bg-mist p-1"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={BUILD_COST}
        aria-valuenow={BUILD_RECOVERED}
        aria-label="Recovering what it cost to build the site"
      >
        <motion.div
          className="h-full rounded-full bg-canopy"
          style={{ width: `max(${(BUILD_RECOVERED / BUILD_COST) * 100}%, 12px)` }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={SPRINGS.gentle}
        />
      </div>
    </div>
  );
}

/* Two rows of seven.
 *
 * Fourteen names will not fit under seven columns at any width, so the plate
 * carries one caption line and that line names whichever bird the pointer is
 * over. Its height is reserved, so naming a bird never nudges the page. There is
 * no resting text in it: a standing "Fourteen of the fifty" was doing nothing
 * but filling the space it needed to reserve anyway.
 *
 * Pointing at one bird dims the other thirteen. Opacity only, never a transform,
 * and slowly: 620ms, up from the 150 it started at. At anything quicker, sweeping
 * across seven cells fired seven fades on top of each other and the row flickered
 * (owner, twice: "a bit fast and almost jittery", "slow down that animation").
 * Long enough that a fast sweep reads as one soft wave rather than a strobe. */
export function BirdPlate({ dim = 0.3 }: { dim?: number }) {
  const [over, setOver] = useState<number | null>(null);

  return (
    <div>
      <ul
        onPointerLeave={() => setOver(null)}
        className="mt-[var(--space-m)] grid grid-cols-7 gap-x-[var(--space-xs)] gap-y-[var(--space-s)] sm:gap-x-[var(--space-s)] sm:gap-y-[var(--space-m)]"
      >
        {PLATE.map(({ name, index, seed }, i) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ ...SPRINGS.gentle, delay: i * 0.03 }}
            onPointerEnter={() => setOver(i)}
          >
            {/* The dim lives on an inner element so it never fights the entrance
                for the same opacity channel. */}
            <span
              role="img"
              aria-label={name}
              className="block aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
              style={{
                opacity: over !== null && over !== i ? dim : 1,
                transition: "opacity 620ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <BirdGlyphV2 seed={seed} px={96} speciesOverride={index} />
            </span>
          </motion.li>
        ))}
      </ul>

      <p className="mt-[var(--space-m)] h-5 text-sm leading-5">
        {over !== null && (
          <motion.span
            key={PLATE[over].name}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: EASE_OUT_SMOOTH }}
            className="font-medium text-foreground"
          >
            {PLATE[over].name}
          </motion.span>
        )}
      </p>
    </div>
  );
}

export function SeeTheRest() {
  return (
    <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/birds" />}>
      See all 50
    </Button>
  );
}

/* The amount chips. `tone` is the only thing a concept changes: Days marks the
   selected amount in cinnamon because that is the colour its month strip fills
   in, and a chip that does not match the marks it lights up is a puzzle. */
export function Amounts({
  value,
  onChange,
  tone = "sky",
}: {
  value: number;
  onChange: (n: number) => void;
  tone?: "sky" | "cinnamon";
}) {
  const on =
    tone === "cinnamon"
      ? "border-cinnamon/40 bg-cinnamon/[0.10] text-cinnamon"
      : "border-sky/40 bg-sky/12 text-sky";

  return (
    <div className="mt-[var(--space-m)] flex flex-wrap gap-[var(--space-xs)]">
      {AMOUNTS.map((a) => (
        <button
          key={a}
          type="button"
          aria-pressed={value === a}
          onClick={() => onChange(a)}
          className={cn(
            "inline-flex items-center rounded-full border px-[var(--space-m)] py-[var(--space-s)] text-sm font-semibold tabular-nums",
            "transition-[background-color,border-color,color] duration-150 ease-out",
            "active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
            value === a
              ? on
              : "state-layer border-border bg-card text-muted-foreground hover:text-foreground"
          )}
        >
          {inr(a)}
        </button>
      ))}
      <button
        type="button"
        className="state-layer inline-flex items-center rounded-full border border-border bg-card px-[var(--space-m)] py-[var(--space-s)] text-sm font-semibold text-muted-foreground transition-[background-color,border-color,color] duration-150 ease-out hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        Other
      </button>
    </div>
  );
}

/* "Contribute ₹1,000", with no separator between the verb and the amount.
 *
 * The shipped button reads "Contribute · ₹1,000". The middle dot is the app's
 * separator for meta segments that have no grammar between them, a byline's
 * date and batch, and it was doing that job here on two things that are not
 * separate facts at all. "Contribute ₹1,000" is one verb phrase and needs
 * nothing between its halves. The amount keeps tabular numerals so the button
 * does not jitter as the figure changes width, and a slightly lighter weight so
 * the verb still leads. */
export function ContributeButton({
  amount,
  suffix,
}: {
  amount: number;
  suffix?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        "mt-[var(--space-m)] inline-flex h-12 w-full items-center justify-center gap-[0.3em] rounded-full bg-sky px-[var(--space-l)] text-[15px] font-semibold text-white sm:w-auto",
        "shadow-[0_6px_16px_-12px_var(--color-sky)]",
        "transition-[transform,filter] duration-150 ease-out",
        "hover:brightness-[1.06] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
      )}
    >
      Contribute
      <span className="font-medium tabular-nums">{inr(amount)}</span>
      {suffix}
    </button>
  );
}

/* One note under the button, carrying everything a payer needs to know before
   they press it. The standalone "One time, never a subscription." line above the
   button is folded in here: it was a second sentence in a third size saying
   something this note was already the right place for. */
export function TrustNote() {
  return (
    <p className="mt-[var(--space-m)] flex items-start gap-[var(--space-xs)] text-xs leading-relaxed text-muted-foreground">
      <ShieldCheck className="mt-[0.15em] h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        A single payment, nothing recurring. Razorpay handles it, so UPI, cards, netbanking and
        wallets all work from India or abroad, and we never see your details.
      </span>
    </p>
  );
}
