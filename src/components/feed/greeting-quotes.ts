/**
 * Short, well-known J. Krishnamurti quotations for the feed's greeting
 * strip. Only lines with verbatim primary sources in his published talks and
 * books (two popular but contested attributions were deliberately excluded;
 * do not re-add "sick society" or "observe without evaluating" - neither has
 * a verbatim primary source). Kept short on purpose --
 * a line worth carrying into the day, not a passage to read.
 *
 * Rotates deterministically by day of year (IST) via `quoteForToday` below.
 * Never touches Math.random.
 */
export const GREETING_QUOTES: readonly string[] = [
  "Truth is a pathless land, and you cannot approach it by any path whatsoever.",
  "The observer is the observed.",
  "The description is not the described.",
  "One is never afraid of the unknown; one is afraid of the known coming to an end.",
  "Freedom is at the very beginning, not at the end.",
  "The only freedom is the freedom from the known.",
  "It is truth that liberates, not your effort to be free.",
  "You can only be afraid of what you think you know.",
  "Without freedom, without the open mind, there can be no understanding.",
  "Freedom is to be a light to oneself.",
  "Tradition becomes our security, and when the mind is secure it is in decay.",
  "The constant assertion of belief is an indication of fear.",
] as const;

function dayOfYearIST(date: Date): number {
  // Read the IST calendar date via Intl rather than the server's local
  // time, so the quote turns over at IST midnight everywhere this runs.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const year = get("year");
  const month = get("month");
  const day = get("day");
  const start = Date.UTC(year, 0, 1);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000) + 1;
}

/** The quote for `date` (defaults to now), stable for every visitor on a given IST day. */
export function quoteForToday(date: Date = new Date()): string {
  const index = dayOfYearIST(date) % GREETING_QUOTES.length;
  return GREETING_QUOTES[index];
}
