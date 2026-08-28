/* ------------------------------------------------------------------ *
 *  Where a Turnstile token is allowed to be spent.
 *
 *  Its own dependency-free file for the reason every `*-rule.ts` here is
 *  one: node:test cannot load a module with relative value imports, and
 *  turnstile.ts pulls in node crypto and next/headers. The rule is the
 *  part worth pinning, so the rule is the part that lives alone.
 *
 *  Why the rule exists at all. A Turnstile SITE KEY is public — it ships
 *  in the HTML — so the only thing stopping anyone embedding our widget
 *  on their own page is the hostname list in the Cloudflare dashboard.
 *  That list is the whole of the origin enforcement.
 *
 *  On 2026-08-28 the list had to be widened. Every past deployment lives
 *  at its own `rv-alumni-<hash>.vercel.app` URL, unknowable in advance,
 *  and none of them were on the list, so the widget refused to run
 *  (Cloudflare's 110200) and the owner could not sign in to any of them
 *  to see how the site used to look. The only entry that covers them is
 *  `vercel.app`, and Turnstile matches subdomains — which hands the key
 *  to every site on that domain.
 *
 *  So the narrowing moved here, where it can be tighter than a list:
 *  a token is good only on the host it was solved on. A token farmed on
 *  someone-else.vercel.app is then worth nothing at rishivalley.space,
 *  and nothing needs editing when a deployment URL changes.
 * ------------------------------------------------------------------ */

/**
 * A host reduced to the form the two sides can be compared in: lowercased,
 * port removed, `www.` removed. Null when there is nothing to compare.
 *
 * The port goes because siteverify reports a bare hostname while a Host
 * header carries `:3000` locally. The `www.` goes because the apex and the
 * www alias are one site to a member and would otherwise be a lockout the
 * day a www record is added — cheap now, expensive to diagnose later.
 */
export function normaliseHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const host = raw.trim().toLowerCase().split(":")[0];
  if (!host) return null;
  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * May a token solved on `solvedOn` be spent by a request that arrived on
 * `arrivedOn`?
 *
 * Unknown on either side is a PASS. The Host header is not something this
 * app controls, and siteverify is not contractually obliged to return a
 * hostname; a bot check that locks members out of sign-in the day a proxy
 * rewrites a header would be a worse failure than the farming it prevents.
 * Same fail-open posture as the unreachable-Cloudflare branch in
 * turnstile.ts, and as rate-limit.ts.
 */
export function sameOrigin(solvedOn: string | null | undefined, arrivedOn: string | null | undefined): boolean {
  const a = normaliseHost(solvedOn);
  const b = normaliseHost(arrivedOn);
  if (!a || !b) return true;
  return a === b;
}
