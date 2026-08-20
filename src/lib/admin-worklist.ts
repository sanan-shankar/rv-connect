/** One thing waiting for you, whatever kind of thing it is. */
export interface WorkItem {
  key: string;
  /** Which queue it came from. Drives the chip and the icon. */
  queue: "message" | "report" | "photo" | "flagged" | "verify" | "mail" | "catchup";
  /** The sentence. One line, plain, says what happened. */
  title: string;
  /** The supporting line, or null. */
  detail: string | null;
  /** Where the fix is. */
  href: string;
  /** ISO. Sorted newest first across every queue. */
  at: string;
}

export const QUEUE_LABEL: Record<WorkItem["queue"], string> = {
  message: "Message",
  report: "Report",
  photo: "Photo",
  flagged: "Flagged",
  verify: "Verify",
  mail: "Mail",
  catchup: "Catch-up",
};

/* Cinnamon for things a person is waiting on, destructive for things that
   are actually wrong, sky for a system fact. Same four registers as the
   chips everywhere else in the panel. */
export const QUEUE_TONE: Record<WorkItem["queue"], "warn" | "bad" | "info"> = {
  message: "warn",
  report: "bad",
  photo: "warn",
  flagged: "bad",
  // A person waiting at the door, not something wrong: same register as an
  // unapproved photo.
  verify: "warn",
  mail: "bad",
  catchup: "warn",
};
