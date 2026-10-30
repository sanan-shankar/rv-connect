/* ------------------------------------------------------------------ *
 *  What PostHog is never told about a person (bug audit 3, T7b-22).
 *
 *  posthog-js reads every click: the words on what was pressed, and every
 *  attribute on it and on each ancestor up to <body>, a link's href included.
 *  On this site that sent a classmate's name off a directory card, and the
 *  address or number itself off the mailto: and tel: rows of their "Get in
 *  touch" card, to an outside company under the identity of whoever tapped.
 *  The owner's ruling (2026-10-29): hide anything that shows a person, and
 *  keep the rest of the click.
 *
 *  Plain module, no imports: the unit gate runs tests with bare `node`, and
 *  rich-text.ts, which a test imports, needs the class below.
 * ------------------------------------------------------------------ */

/**
 * PostHog's own "do not read this" class. In posthog-js 1.418.1 a click with
 * it on the pressed element or any ancestor sends no `$autocapture` and no
 * `$rageclick` at all, dead clicks skip it, and session replay (off here)
 * would blank it, since it is replay's block class too. The library offers no
 * way to send the click without its words, so the click goes.
 *
 * A constant rather than the string, so a misspelling is a compile error
 * instead of a silent leak: a typo'd class is one PostHog never heard of.
 *
 * It goes on the outermost element that shows a person and nothing else: a
 * member card, a name, an avatar, a contact row. Not on a whole post or a
 * whole page, because the like button and the menu beside a name are clicks
 * the owner keeps. src/components/analytics/posthog-rule.test.mjs lists every
 * surface that carries it; a new one belongs in that list.
 */
export const NO_CAPTURE = "ph-no-capture";

/** The query words PostHog only ever sees as `<masked>`. `q` is every search
 *  box on the site (directory, feed, Collection, admin), and what people type
 *  into one is as often as not a classmate's name; the words are kept, from
 *  the site's own table, in the admin panel's "What people search for".
 *  `email` is a member's own address, which /forgot-password carries.
 *  `token` is the key in a password-reset or confirmation link, live until it
 *  is used (bug audit 3, B2 follow-up). The rest are the names a key, a code
 *  or a signature goes by: no link here uses them today, and one that starts
 *  to is masked before anyone remembers to add it. posthog-rule.test.mjs
 *  fails a query word the app reads or writes that looks like one of these
 *  and is not on the list. */
export const MASKED_QUERY_PARAMS = ["q", "email", "token", "code", "secret", "key", "sig", "signature"];

/** Routes whose next path segment is itself a key: a Catch-up invite,
 *  /catchups/join/<key> (src/app/catchups/join/[token]), which lets anyone
 *  holding it join. Kept as a prefix so the route keeps its shape: PostHog
 *  counts every invite page as /catchups/join/<masked>, one route, as many
 *  pageviews as before. posthog-rule.test.mjs fails a `[token]`-like folder
 *  under src/app that is not covered here. */
export const SECRET_PATH_PREFIXES = ["/catchups/join/"];

/* Each prefix matched raw and percent-encoded, because the invite page hands
   its own address to sign-up and sign-in as `?next=%2Fcatchups%2Fjoin%2F<key>`.
   The key ends at the next separator; an invite key is 32 hex digits. A prefix
   is plain path words, so it needs no escaping. */
const SECRET_SEGMENTS = SECRET_PATH_PREFIXES.map(
  (prefix) => new RegExp(`(${prefix.split("/").join("(?:/|%2F)")})[^/?#&%"'\\s;]+`, "gi")
);

/** `url` with each masked query word's value replaced, in the same
 *  `q=<masked>` form posthog-js uses for its own. String work only, so a
 *  malformed address cannot throw inside a capture. */
function maskQuery(url: string): string {
  const hash = url.indexOf("#");
  const head = hash === -1 ? url : url.slice(0, hash);
  const query = head.indexOf("?");
  if (query === -1) return url;
  const pairs = head
    .slice(query + 1)
    .split("&")
    .map((pair) => {
      const key = pair.split("=")[0];
      return MASKED_QUERY_PARAMS.includes(key) ? `${key}=<masked>` : pair;
    });
  return head.slice(0, query + 1) + pairs.join("&") + (hash === -1 ? "" : url.slice(hash));
}

/** Any invite key in `text`, wherever it sits: a path, a `next=`, a link's
 *  words. Specific enough to run over every string an event carries. */
function maskSegments(text: string): string {
  return SECRET_SEGMENTS.reduce((out, pattern) => out.replace(pattern, "$1<masked>"), text);
}

/** An address with its search words, emails and keys masked and its route
 *  left whole. */
export function maskUrl(url: string): string {
  return maskSegments(maskQuery(url));
}

type Bag = Record<string, unknown> | undefined;
type Captured = { properties?: Bag; $set?: Bag; $set_once?: Bag } | null;

/** A clicked link's address inside `$elements_chain`, as `href="..."` and
 *  `attr__href="..."`. */
const CHAIN_HREF = /(href=")([^"]*)/g;

/**
 * posthog-js's `before_send`: every address an event carries leaves with its
 * search words, emails and keys masked.
 *
 * `custom_personal_data_properties` masks the query words in every URL the
 * library builds itself, but not in the referrer, which is the browser's own
 * string passed through as it came, and never a key that is part of a path.
 * So every property whose name ends in `url`, `referrer` or `pathname`, on the
 * event and on the person (`$initial_referrer` and the session's entry ones
 * are built by prefixing), goes through maskUrl; so do the links in a click's
 * `$elements_chain` and `$elements`, and the page addresses heatmap data is
 * keyed by. Every other string loses any invite key it holds. One already
 * masked comes out the same, and nothing is dropped: the event, its route and
 * its count are what they were.
 */
export function maskEventUrls<T extends Captured>(event: T): T {
  if (!event) return event;
  for (const bag of [event.properties, event.$set, event.$set_once]) {
    if (!bag) continue;
    for (const key of Object.keys(bag)) {
      const value = bag[key];
      if (typeof value === "string") {
        if (/(url|referrer|pathname)$/.test(key)) bag[key] = maskUrl(value);
        else if (key === "$elements_chain") bag[key] = maskSegments(value.replace(CHAIN_HREF, (_, head: string, href: string) => head + maskUrl(href)));
        else bag[key] = maskSegments(value);
      } else if (key === "$elements" && Array.isArray(value)) {
        for (const element of value as Record<string, unknown>[]) {
          if (typeof element?.attr__href === "string") element.attr__href = maskUrl(element.attr__href);
        }
      } else if (key === "$heatmap_data" && value && typeof value === "object") {
        const byPage: Record<string, unknown[]> = {};
        for (const [page, points] of Object.entries(value)) {
          const masked = maskUrl(page);
          byPage[masked] = (byPage[masked] ?? []).concat(points);
        }
        bag[key] = byPage;
      }
    }
  }
  return event;
}
