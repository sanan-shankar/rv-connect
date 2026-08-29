import * as React from "react"
import { FIELD_FOCUS, FIELD_INVALID } from "@/components/ui/field-focus"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        `flex field-sizing-content min-h-16 w-full rounded-[var(--radius-input)] border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground ${FIELD_FOCUS} disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 ${FIELD_INVALID} md:text-sm dark:bg-input/30 dark:disabled:bg-input/80`,
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
