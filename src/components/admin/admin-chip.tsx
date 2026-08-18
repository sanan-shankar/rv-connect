import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  The panel's four states, and the only four colours it may use.
 *
 *  Straight off the colour protocol's approved tint trio (rule 4), plus the
 *  destructive red for the one register that is genuinely wrong. The old
 *  panel invented its tones per component, which is how "Verified" and
 *  "Confirmed" ended up different shades of the same idea.
 *
 *  What each register MEANS, so a section cannot pick by eye:
 *
 *    good   leaf        settled. Nothing to do.
 *    warn   cinnamon    waiting on something. Not wrong, not finished.
 *    bad    destructive failed, or flagged by a person. Needs a human.
 *    idle   secondary   a true blank. No claim either way.
 *    info   sky         a system fact, not a judgement (a role, a kind).
 *
 *  Sky is the administrative register everywhere in this app already
 *  (ModerationDialog's icon bubble), which is why it carries the facts that
 *  are neither good nor bad rather than a fifth invented colour.
 * ------------------------------------------------------------------ */

export type ChipTone = "good" | "warn" | "bad" | "idle" | "info";

const TONE: Record<ChipTone, string> = {
  good: "border-leaf/30 bg-leaf/[0.07] text-leaf",
  warn: "border-cinnamon/30 bg-cinnamon/[0.07] text-cinnamon",
  bad: "border-destructive/30 bg-destructive/[0.08] text-destructive",
  idle: "border-border bg-secondary text-muted-foreground",
  info: "border-sky/35 bg-sky/[0.10] text-sky",
};

export function Chip({
  label,
  tone = "idle",
  icon: Icon,
  className,
}: {
  label: string;
  tone?: ChipTone;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] font-medium",
        TONE[tone],
        className
      )}
    >
      {Icon && <Icon className="size-3 shrink-0" strokeWidth={2} aria-hidden />}
      {label}
    </span>
  );
}
