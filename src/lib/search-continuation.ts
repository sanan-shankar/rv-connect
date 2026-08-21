/**
 * Is this search the same search, still being typed?
 *
 * The rule the search log needs and did not have (bug audit M25). The dedupe
 * in `search-log.ts` matched on an EXACT query string, so typing "Bengaluru"
 * into a live-filtering box wrote eight rows -- "Be", "Ben", "Beng", ... -- of
 * which seven are prefixes nobody searched for. The window was never the
 * problem; equality was, because each keystroke produces a different string.
 *
 * Two queries from the same person, in the same box, inside the window are one
 * search if either is a prefix of the other. That covers typing forward
 * ("Beng" -> "Bengal") and backspacing ("Bengal" -> "Beng") with one rule.
 *
 * Case- and space-insensitive at the edges, because a live box sends "beng"
 * and "Beng " as different strings on the way to the same word.
 *
 * Pure, and in its own file with no value imports, so `node --test` can load it
 * (search-log.ts imports Prisma).
 */
export function isSameSearch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return false;
  return x.startsWith(y) || y.startsWith(x);
}
