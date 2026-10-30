/* ------------------------------------------------------------------ *
 *  The answering surface's decisions, as plain functions.
 *
 *  Each of these was once made inline in a component in a way that
 *  trapped a member (bug audit 3): a save that failed could not be
 *  retried the way its own red line said (T3-04). Pure and import-free,
 *  so answer-flow.test.mjs runs them with bare `node` (docs/TRAPS.md, "A
 *  testable module must have no relative VALUE imports").
 * ------------------------------------------------------------------ */

/**
 * Where one question's saves stand.
 *
 *  - "failed": the save got no answer it could act on. The network dropped,
 *    a deploy landed under the open tab, the session ran out, or the
 *    database hiccuped. The same save sent again can land, so the line
 *    says so, and the next blur or Next sends it again.
 *  - "refused": the server answered no, for a reason sending the same
 *    thing again cannot change: answering has closed, another device has
 *    saved since this page was drawn, the words are over the cap. The
 *    server's own sentence is the line, and nothing re-sends unchanged
 *    words on its own.
 */
export type SaveStatus = "idle" | "saving" | "saved" | "failed" | "refused";

/** Whether this question's last save landed, or is on its way. A save in
 *  flight counts: it usually lands, and a mark that flickered off on every
 *  blur would be worse than one that is briefly generous (audit M11). */
export function saveLanded(status: SaveStatus | undefined): boolean {
  return status !== "failed" && status !== "refused";
}

/**
 * Should a blur, a press of Next or a recording's words send the body?
 *
 * `lastSent` is what this card last handed to the save queue. Words that
 * have not changed are not sent again, unless the last save failed: that is
 * the retry "Not saved. Click away and back to try again." promises. Before
 * this, `lastSent` moved forward before the save and nothing ever moved it
 * back, so the promised retry did nothing until the member changed a letter,
 * and a member who left then lost the paragraph (T3-04).
 *
 * A refused save is not re-sent unchanged: the server would only say no
 * again. Changing the words sends them, which is how a member fixes an
 * answer that was over the cap.
 */
export function shouldFlush(value: string, lastSent: string, lastStatus: SaveStatus): boolean {
  if (lastStatus === "failed") return true;
  return value.trim() !== lastSent.trim();
}
