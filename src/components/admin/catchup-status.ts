import type { ChipTone } from "@/components/admin/admin-chip";
import { isEditionRunning } from "@/lib/catchups-core";

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
  ended: { label: "Ended", tone: "idle" },
};
/* No `paused` entry: nothing has paused a Catch-up since Editions stopped
   running on a rhythm (2026-10-17), a legacy row is read as active, and the
   reading room's `?? SERIES_STATUS.active` already says so. */

/** The four states an Edition moves through, in the words a person would use. */
export const EDITION_STATUS: Record<string, { label: string; tone: ChipTone }> = {
  draft: { label: "Not opened yet", tone: "idle" },
  /* Not a status of its own: a `collecting` row nobody has started, or one
     that fizzled (`isEditionRunning`). `editionChip` swaps it in, so a batch
     that has never pressed Start does not read as "Taking questions" with no
     box anywhere to take them in. */
  idle: { label: "Not running", tone: "idle" },
  collecting: { label: "Taking questions", tone: "info" },
  answering: { label: "Taking answers", tone: "info" },
  // A time capsule waiting out its year (build phase 14).
  sealed: { label: "Sealed", tone: "idle" },
  published: { label: "Sent out", tone: "good" },
};

/** The chip for one Edition, idle included. Both admin pages draw it. */
export function editionChip(ed: {
  status: string;
  questionsCloseAt: Date | string | null;
}): { label: string; tone: ChipTone } {
  if (ed.status === "collecting" && !isEditionRunning(ed)) return EDITION_STATUS.idle;
  return EDITION_STATUS[ed.status] ?? EDITION_STATUS.draft;
}
