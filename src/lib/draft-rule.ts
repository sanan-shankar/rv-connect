/* What counts as a draft, in ONE place.
 *
 * "Save as draft" exists for letters only. `createPost` has to answer that
 * question twice, at two different moments and from two different sources:
 * once before the verified-member gate (from the raw FormData, because the
 * Zod parse has not happened yet) and once at the create (from the parsed
 * data). Those two answers were written out separately and drifted: the gate
 * read the `saveAsDraft` flag alone while the create demanded `kind ===
 * "letter"` too, so a submission carrying `saveAsDraft=true` with no `kind`
 * skipped the gate and then stored `status: "published"` -- an unverified
 * account publishing to the whole feed (audit C-122).
 *
 * One predicate, both call sites. They cannot disagree again.
 */
export function isLetterDraft(input: {
  kind?: string | null;
  saveAsDraft?: boolean | null;
}): boolean {
  return input.kind === "letter" && input.saveAsDraft === true;
}
