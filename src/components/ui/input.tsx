import * as React from "react"
import { FIELD_FOCUS, FIELD_INVALID } from "@/components/ui/field-focus"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        // Focus is the BOX lighting up — border to ring-leaf plus the soft
        // 3px halo — the same material ComboboxInputGroup already wears, so
        // a form that mixes a search box with plain inputs (the onboarding
        // register card) shows ONE focus treatment. It replaced an
        // offset-2 outline that floated a rectangle 2px outside the box
        // (owner, 2026-08-18: "the green outline isn't the box outline but
        // actually bigger than the box outline"). THIS IS THE RECIPE for
        // every plain boxed field — textarea and the select trigger wear it
        // verbatim, pinned by focus-recipe.test.mjs. (Floating-label fields
        // are the other family: their focus state is the caret plus the
        // rising label, by the 2026-08-14 "no green outline on boxes" call.)
        //
        // `focus-visible:`, not the `focus:` an earlier round used: browsers
        // treat text-entry widgets as ALWAYS focus-visible (MDN: "when a
        // text box needing user input has focus, focus is indicated"), so on
        // a field the two are identical — and one pseudo-class across fields
        // and buttons beats a special case. The transparent outline is not
        // decoration: forced-colors mode (Windows High Contrast) drops
        // box-shadow entirely, and recolours this outline to a visible
        // system colour — without it the field has no focus state there.
        `h-10 w-full min-w-0 rounded-[var(--radius-input)] border border-input bg-transparent px-3 py-2 text-base transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground ${FIELD_FOCUS} disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 ${FIELD_INVALID} md:text-sm dark:bg-input/30 dark:disabled:bg-input/80`,
        className
      )}
      {...props}
    />
  )
}

export { Input }
