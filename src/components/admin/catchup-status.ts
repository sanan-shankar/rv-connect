import type { ChipTone } from "@/components/admin/admin-chip";

/**
 * The Catch-up vocabulary the two admin pages chip.
 *
 * The list page and the reading room shipped six days apart and each wrote
 * these out, which is how the same "Paused" arrived grey on one page and
 * cinnamon on the other. Here rather than in `lib/catchups.ts`: that file is
 * member-facing, and these are the panel's words for the panel's chips.
 */

/** The Catch-up's own state, as opposed to an Edition's. */
export const SERIES_STATUS: Record<string, { label: string; tone: ChipTone }> = {
  active: { label: "Running", tone: "good" },
  paused: { label: "Paused", tone: "warn" },
  ended: { label: "Ended", tone: "idle" },
};

/** The five states an Edition moves through, in the words a person would use. */
export const EDITION_STATUS: Record<string, { label: string; tone: ChipTone }> = {
  draft: { label: "Not opened yet", tone: "idle" },
  collecting: { label: "Taking questions", tone: "info" },
  answering: { label: "Taking answers", tone: "info" },
  preparing: { label: "Being put together", tone: "warn" },
  published: { label: "Sent out", tone: "good" },
};
