"use client";

/* The supporter's bird picker on /support.
 *
 * Appears in place of the fourteen-bird preview once a member's paid
 * contributions reach the perk threshold, and shows the WHOLE wearable
 * collection: all fifty minus the two reserved (the mascot Hoopoe and the
 * owner's Roller), every glyph with its name, the same presentation as the
 * public /birds gallery so nothing here reads like a different product.
 *
 * Choosing is two deliberate steps, because an avatar change lands everywhere
 * at once and a stray tap must not do that. Tapping a bird only SELECTS it:
 * the cell takes the canopy selection wash (the app's one green state) and a
 * confirmation strip rises below the grid with the bird at full size, its
 * name, and what confirming means. Only "Make it my bird" writes anything.
 * Tapping the selected bird again, or "Never mind", puts the strip away.
 *
 * The member's current bird is marked "Yours" and they can re-pick any time;
 * the perk is standing, not one-shot, so there is nothing to meter. */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BirdGlyphV2 } from "@/components/common/bird-avatar-v2";
import { EASE_OUT_SMOOTH, SPRINGS } from "@/components/common/motion";
import { chooseBird } from "@/app/(main)/support/actions";
import { WEARABLE_SPECIES, seedFacingRight } from "./plate-data";

export function BirdPicker({ currentSlug }: { currentSlug: string | null }) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const current = WEARABLE_SPECIES.find((s) => s.slug === currentSlug) ?? null;
  const choice = WEARABLE_SPECIES.find((s) => s.slug === selected) ?? null;

  function confirm() {
    if (!choice || pending) return;
    startTransition(async () => {
      const res = await chooseBird(choice.slug);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`You are now the ${choice.name}.`);
      setSelected(null);
      // The page re-reads birdOverride server-side, so the "Yours" mark, the
      // sidebar avatar and everything else move together with no client-side
      // bookkeeping to drift out of date.
      router.refresh();
    });
  }

  return (
    <div>
      <p className="mt-[var(--space-xs)] max-w-[54ch] leading-relaxed text-foreground">
        {current ? (
          <>
            You are wearing the <span className="font-medium">{current.name}</span>. Pick a
            different bird whenever you like.
          </>
        ) : (
          <>Thank you for contributing. Pick any bird in the collection to wear as your avatar.</>
        )}
      </p>

      <ul className="mt-[var(--space-m)] grid grid-cols-4 gap-x-[var(--space-xs)] gap-y-[var(--space-s)] sm:grid-cols-5 md:grid-cols-7">
        {WEARABLE_SPECIES.map(({ index, name, slug }) => {
          const isCurrent = slug === currentSlug;
          const isSelected = slug === selected;
          return (
            <li key={slug}>
              <button
                type="button"
                aria-pressed={isSelected}
                aria-label={isCurrent ? `${name} (your current bird)` : name}
                onClick={() => setSelected(isSelected ? null : slug)}
                className={cn(
                  "flex w-full flex-col items-center gap-[var(--space-xxs)] rounded-[var(--radius-md)] p-[var(--space-xs)] text-center",
                  "transition-[background-color] duration-150 ease-out",
                  "active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  // Selection is the app's one canopy wash; everything idle
                  // hovers through the state layer like any other control.
                  isSelected ? "bg-canopy/10" : "state-layer"
                )}
              >
                <span className="relative block w-full max-w-[72px]">
                  <span className="block aspect-square w-full [&>svg]:h-full [&>svg]:w-full">
                    <BirdGlyphV2 seed={seedFacingRight(index)} px={72} speciesOverride={index} />
                  </span>
                  {isCurrent && (
                    <span
                      className="absolute -right-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-canopy text-white shadow-[0_4px_10px_-6px_var(--color-canopy)]"
                      aria-hidden
                    >
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "text-[12px] leading-snug",
                    isSelected ? "font-medium text-canopy" : "text-muted-foreground"
                  )}
                >
                  {name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* The are-you-sure. Nothing has happened yet when this is visible; the
          strip exists so the write is always its own deliberate click. */}
      <AnimatePresence initial={false}>
        {choice && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.24, ease: EASE_OUT_SMOOTH }}
            className="mt-[var(--space-m)] flex flex-wrap items-center gap-[var(--space-m)] rounded-[var(--radius-md)] bg-mist p-[var(--space-m)]"
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
                  : "This becomes your avatar everywhere on the site."}
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
