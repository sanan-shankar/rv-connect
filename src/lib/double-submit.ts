/**
 * How long two identical writes count as one double submission.
 *
 * Several things a member creates are free text, so no unique index can dedupe
 * them, and the only other protection is a client's in-flight guard -- which
 * cannot see a second tab, a retried request, or a hand-made call (audit M35,
 * Low 29). Where that matters, the write looks for its own twin inside this
 * window and hands back the first one rather than making a second.
 *
 * Ten seconds is longer than any double tap or slow-connection retry, and far
 * shorter than a person deciding to say or start the same thing again on
 * purpose. One number, in one place, so the feed and Catch-ups cannot come to
 * different views of what "twice at once" means.
 *
 * No imports, so `node --test` can load anything that uses it.
 */
export const DOUBLE_SUBMIT_MS = 10_000;
