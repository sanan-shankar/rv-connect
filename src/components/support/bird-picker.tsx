"use client";

/* The picker on /pick-bird: the whole wearable collection, given room.
 *
 * The first cut of this lived inside a card on /support, 49 birds in seven
 * cramped columns; the owner's verdict was "one soup, can't really
 * appreciate each one because the one next to it is crowding it". So the
 * grid here runs at the /birds gallery's own scale, five columns at most
 * with 96px glyphs and a name under each, and it borrows the interaction he
 * singled out as "so nice" on the fourteen-bird plate: pointing at one bird
 * slowly dims the rest, so the one under the cursor gets the whole stage.
 *
 * Choosing is two deliberate steps, because an avatar change lands
 * everywhere at once and a stray tap must not do that. Tapping a bird only
 * SELECTS it (the canopy wash, the app's one green state, plus the press
 * sink every control in this app answers a tap with); a confirmation bar
 * then sticks to the bottom of the viewport with the bird, its name, and
 * what confirming means, so it stays reachable however far down the grid
 * the choice was made. Only "Make it my bird" writes. The member's current
 * bird wears a canopy check, and re-picking is allowed forever: the perk is
 * standing, so there is nothing to meter. */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { cn } from "@/lib/utils";
import { BirdGlyphV2 } from "@/components/common/bird-avatar-v2";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { chooseBird } from "@/app/(main)/support/actions";
import { WEARABLE_SPECIES, seedFacingRight } from "./plate-data";

export function BirdPicker({ currentSlug }: { currentSlug: string | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choice = WEARABLE_SPECIES.find((s) => s.slug === selected) ?? null;

  function confirm() {
    if (!choice || pending) return;
    startTransition(async () => {
      const res = await callAction(() => chooseBird(choice.slug));
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`You are now the ${choice.name}.`);
      setSelected(null);
      // Back to Support, done. The pick is spent, so this page's own gate
      // would bounce a member on the next visit anyway; walking them out
      // deliberately reads as completion rather than expulsion. refresh()
      // rides along so the sidebar avatar and the support page both show the
      // new bird immediately. (Admins are exempt from the gate and can
      // return to re-test.)
      router.refresh();
      router.push("/support");
    });
  }

  return (
    <div>
      {/* THE /birds LAYOUT, exactly: same columns, same gaps, same 96px
          glyph, same 13px muted name under every bird (owner: "use the birds
          of the valley layout... why have two separate layouts"). What this
          page adds on top is only behaviour: the plate's spotlight dim, the
          press sink, selection and the confirm bar. If the grid classes
          change in src/app/(main)/birds/page.tsx, change them here. */}
      <ul
        onPointerLeave={() => setOver(null)}
        className="grid grid-cols-2 gap-x-[var(--space-m)] gap-y-[var(--space-l)] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      >
        {WEARABLE_SPECIES.map(({ index, name, slug }) => {
          const isCurrent = slug === currentSlug;
          const isSelected = slug === selected;
          const hovered = over === slug;
          return (
            <li key={slug}>
              <motion.button
                type="button"
                aria-pressed={isSelected}
                aria-label={isCurrent ? `${name} (your current bird)` : name}
                onClick={() => setSelected(isSelected ? null : slug)}
                onPointerEnter={() => setOver(slug)}
                // The press sink every control in the app answers a tap
                // with; hover never moves it.
                whileTap={{ scale: 0.93 }}
                transition={SPRINGS.snappy}
                className={cn(
                  "flex w-full flex-col items-center rounded-[var(--radius-md)] p-[var(--space-s)] text-center",
                  "transition-[background-color] duration-150 ease-out",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  // NO dimming of the others here: with forty-nine birds it
                  // made comparing and choosing annoying (owner). Hover is
                  // the app's standard story instead: the state-layer tint on
                  // the cell you are over plus the name stepping up to the
                  // reading colour, which together say "clickable" without
                  // touching the rest of the grid. The fourteen-bird plate on
                  // /support keeps its spotlight; that page is a preview, not
                  // a choice among fifty. Selection stays the canopy wash.
                  isSelected ? "bg-canopy/10" : "state-layer"
                )}
              >
                <span
                  className="relative inline-grid shrink-0 place-items-center"
                  style={{ width: 96, height: 96 }}
                >
                  <BirdGlyphV2 seed={seedFacingRight(index)} px={96} speciesOverride={index} />
                  {isCurrent && (
                    <span
                      className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-canopy text-white shadow-[0_4px_10px_-6px_var(--color-canopy)]"
                      aria-hidden
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </span>
                {/* The /birds caption, always visible; it steps up to the
                    reading colour on hover and canopy once selected. */}
                <span
                  className={cn(
                    "mt-[var(--space-xs)] text-[13px] font-medium leading-snug transition-colors duration-150 ease-out",
                    isSelected ? "text-canopy" : hovered ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {name}
                </span>
              </motion.button>
            </li>
          );
        })}
      </ul>

      {/* The are-you-sure, stuck to the bottom of the viewport while a bird
          is selected so it is reachable from any row of the grid. Nothing
          has been written while this is visible. */}
      <AnimatePresence initial={false}>
        {choice && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.26, ease: EASE_OUT_SMOOTH }}
            className="glass card-elevated sticky bottom-[var(--space-m)] z-10 mt-[var(--space-l)] flex flex-wrap items-center gap-[var(--space-m)] rounded-[var(--radius-lg)] border border-border p-[var(--space-m)]"
          >
            <motion.span
              key={choice.slug}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={SPRINGS.snappy}
              className="block h-14 w-14 shrink-0 [&>svg]:h-full [&>svg]:w-full"
              aria-hidden
            >
              <BirdGlyphV2
                seed={seedFacingRight(choice.index)}
                px={56}
                speciesOverride={choice.index}
              />
            </motion.span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-semibold text-foreground">The {choice.name}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {choice.slug === currentSlug
                  ? "This is already your bird."
                  : "This becomes your avatar everywhere on the site. Changing it again takes another contribution."}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-[var(--space-xs)]">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="state-layer inline-flex h-10 items-center rounded-full border border-border bg-card px-[var(--space-m)] text-sm font-medium text-muted-foreground transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Never mind
              </button>
              <button
                type="button"
                onClick={confirm}
                disabled={pending || choice.slug === currentSlug}
                className={cn(
                  "inline-flex h-10 items-center gap-[var(--space-xs)] rounded-full bg-canopy px-[var(--space-l)] text-sm font-semibold text-white",
                  "shadow-[0_5px_13px_-12px_var(--color-canopy)]",
                  "transition-[transform,filter] duration-150 ease-out",
                  "hover:brightness-[1.08] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy",
                  "disabled:pointer-events-none disabled:opacity-50"
                )}
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Make it my bird
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
