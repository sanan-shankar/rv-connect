/**
 * Where this site lives, once.
 *
 * It was a string literal in seven places: the proxy's canonical redirect, the
 * link builder in `email.ts`, and four of the five URLs an email carries. This
 * project has already paid for that shape -- `docs/TRAPS.md` records that
 * moving the public IMAGE host was five changes and not one -- and the cost of
 * being wrong here is a member clicking a dead link in an email, which is the
 * one surface in this app with no undo.
 *
 * **This file imports nothing, and must not start.** `src/proxy.ts` is bundled
 * for the edge runtime, which is why it says it cannot import `demo.ts`; the
 * obstacle there is that module's own dependencies, not the directory. A bare
 * constant is edge-safe, and stays so only while it has no imports.
 *
 * Not `appUrl()`, which is a different question. That one answers "where
 * should a link I am minting right now point", and in development with sending
 * suppressed the answer is localhost. This answers "what is the production
 * origin", which has one answer everywhere.
 */
export const CANONICAL_ORIGIN = "https://rishivalley.space";
