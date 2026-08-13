"use client";

import type { ComponentProps } from "react";
import { FloatField } from "@/components/common/float-field";
import { cn } from "@/lib/utils";

/**
 * A plain year field: digits only, no up/down spinner arrows. The owner:
 * "no one needs to add or subtract years; the arrows send you to 1926."
 * Renders as `type="text"` (never `type="number"`) with `inputMode="numeric"`
 * so mobile still shows the numeric keypad, and strips any non-digit
 * keystroke client-side. Every year field in the app (batch, year joined/left,
 * houses) should use this instead of a bare numeric input.
 *
 * Renders through FloatField (the calm signup material) since signup is its
 * one consumer today; if a bordered-Input surface ever needs a year field,
 * add a variant here rather than re-typing the digit rule at the call site.
 */
export function YearInput({
  className,
  value,
  onValueChange,
  maxLength = 4,
  ...props
}: Omit<ComponentProps<typeof FloatField>, "onChange"> & {
  onValueChange: (value: string) => void;
}) {
  return (
    <FloatField
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      maxLength={maxLength}
      value={value}
      onChange={(e) => onValueChange(e.target.value.replace(/\D/g, "").slice(0, maxLength))}
      className={cn("tabular-nums", className)}
      {...props}
    />
  );
}
