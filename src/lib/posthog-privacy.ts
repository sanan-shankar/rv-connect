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
 *  into one is as often as not a classmate's name. The words are kept, from
 *  the site's own table, in the admin panel's "What people search for". */
export const MASKED_QUERY_PARAMS = ["q"];

/** `url` with each masked word's value replaced, in the same `q=<masked>` form
 *  posthog-js uses for its own. String work only, so a malformed address
 *  cannot throw inside a capture. */
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

type Bag = Record<string, unknown> | undefined;
type Captured = { properties?: Bag; $set?: Bag; $set_once?: Bag } | null;

/**
 * posthog-js's `before_send`: masks the search words in every address an event
 * carries.
 *
 * `custom_personal_data_properties` already masks them in every URL the
 * library builds itself, but not in the referrer, which is the browser's own
 * string passed through as it came. A result opened in a new tab, or a
 * sign-out from a search, arrives with the search page as its referrer, query
 * and all. So every property whose name ends in `url` or `referrer`, on the
 * event and on the person (`$initial_referrer` and the session's entry ones
 * are built by prefixing), is masked here; one already masked comes out the
 * same.
 */
export function maskSearchWords<T extends Captured>(event: T): T {
  if (!event) return event;
  for (const bag of [event.properties, event.$set, event.$set_once]) {
    if (!bag) continue;
    for (const key of Object.keys(bag)) {
      const value = bag[key];
      if (typeof value === "string" && /(url|referrer)$/.test(key)) bag[key] = maskQuery(value);
    }
  }
  return event;
}
