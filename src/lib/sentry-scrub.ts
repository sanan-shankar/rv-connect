import type { Event } from "@sentry/nextjs";

/* ------------------------------------------------------------------ *
 *  What an error report may carry out of this site.
 *
 *  `sendDefaultPii: false` (src/instrumentation.ts) used to mean no
 *  cookies, no request headers, no IP address. Since Sentry 10 it does not:
 *  "off" now resolves to deny lists that only the tracing code reads, and
 *  the request-data integration treats anything but `false` as "include".
 *  So every server error, every reportSwallowed() inside a request and
 *  every sampled trace carried the member's live session cookie (a bearer
 *  credential, good for up to 90 days), the raw cookie header, Vercel's
 *  city, latitude, longitude and postcode headers, the referrer, and the
 *  query string, which is where directory searches live. Only the
 *  IP-named headers were removed (bug audit 3, T8b-14, reproduced through
 *  the installed SDK on 10.70 and again on 10.76).
 *
 *  This is the last word, run as `beforeSend` and `beforeSendTransaction`
 *  on each event as it is about to leave, whatever a given SDK version
 *  decided to collect. It KEEPS a short list rather than removing a long
 *  one: the next header nobody has heard of (Vercel keeps adding them) is
 *  dropped because it is not on the list, not because someone remembered
 *  to deny it.
 *
 *  Do not swap this for Sentry's own `dataCollection` option. Supplying it
 *  at all resets every key left out of it to the permissive default
 *  (@sentry/core, resolveDataCollectionOptions.js), so a partial setting
 *  sends more than no setting.
 *
 *  Written not to throw: Sentry drops an event whose `beforeSend` throws,
 *  which is the safe way round for privacy and the wrong way for the
 *  alarm. sentry-scrub.test.mjs pushes a poisoned request through the
 *  installed SDK, so a shape change on upgrade fails the gate first.
 * ------------------------------------------------------------------ */

/** The request headers a report keeps. Each answers a debugging question,
 *  and none says who the member is or where they are. A header joins only
 *  with its question written beside it. */
const KEPT_HEADERS = new Set([
  "host", // which address was hit: production, a preview URL, www or bare
  "user-agent", // which browser, for the failure only one of them has
  "content-type", // a page load, a form post or a Server Action call
  "next-action", // WHICH Server Action failed, as an opaque build hash
  "rsc", // a client-side navigation rather than a full page load
  "next-router-prefetch", // a prefetch nobody clicked, where error storms start
]);

/** The same headers as tracing spells them (`http.request.header.user_agent`;
 *  a cookie becomes `http.request.header.cookie.<name>`, kept by nothing). */
const HEADER_ATTRIBUTE = /^http\.(?:request|response)\.header\.(.+)$/;
const KEPT_HEADER_ATTRIBUTES = new Set([...KEPT_HEADERS].map((h) => h.replace(/-/g, "_")));

/** Span and breadcrumb fields that hold an address. The path stays: it is
 *  what says where the failure was. */
const URL_FIELDS = new Set(["url", "url.full", "url.path", "http.url", "http.target"]);

/** Fields that hold nothing but the part after `?` or `#`. */
const QUERY_FIELDS = new Set(["url.query", "http.query", "url.fragment", "http.fragment"]);

/** An invite link's last segment is itself the key to a Catch-up
 *  (src/app/catchups/join/[token]), so it goes the way of a cookie. */
const INVITE_TOKEN = /(\/catchups\/join\/)[^/\s]+/;

/** An address, or a "GET /path?query" name, without its search or fragment
 *  (search terms, filters, a mailed `?token=`) and without an invite key. */
export function cleanUrl(url: string): string {
  return url.replace(/[?#]\S*/, "").replace(INVITE_TOKEN, "$1[token]");
}

function scrubFields(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const fields = data as Record<string, unknown>;
  for (const key of Object.keys(fields)) {
    const header = HEADER_ATTRIBUTE.exec(key);
    if (header ? !KEPT_HEADER_ATTRIBUTES.has(header[1]) : QUERY_FIELDS.has(key)) {
      delete fields[key];
      continue;
    }
    const value = fields[key];
    if (URL_FIELDS.has(key) && typeof value === "string") fields[key] = cleanUrl(value);
  }
}

/** Rebuilt rather than trimmed: cookies, query_string, data and env, and
 *  any field a later SDK adds, are left behind by construction. */
function scrubRequest(request: NonNullable<Event["request"]>): Event["request"] {
  const headers: Record<string, string> = {};
  for (const [name, value] of Object.entries(request.headers ?? {})) {
    if (KEPT_HEADERS.has(name.toLowerCase())) headers[name] = value;
  }
  return {
    method: request.method,
    url: typeof request.url === "string" ? cleanUrl(request.url) : undefined,
    headers,
  };
}

/** `beforeSend` and `beforeSendTransaction` (src/instrumentation.ts).
 *  Cleans the event in place and returns it. */
export function scrubEvent<T extends Event>(event: T): T {
  if (event.request) event.request = scrubRequest(event.request);

  // onRequestError files the path as Next hands it over, query included.
  const nextjs = event.contexts?.nextjs;
  if (nextjs && typeof nextjs.request_path === "string") nextjs.request_path = cleanUrl(nextjs.request_path);

  // Traces carry the request again, as span attributes and in names.
  scrubFields(event.contexts?.trace?.data);
  if (Array.isArray(event.spans)) {
    for (const span of event.spans) {
      scrubFields(span?.data);
      if (span?.op?.startsWith("http") && typeof span.description === "string") {
        span.description = cleanUrl(span.description);
      }
    }
  }
  if (typeof event.transaction === "string") event.transaction = cleanUrl(event.transaction);

  // An outgoing call's breadcrumb (a link preview, say) names the address it fetched.
  if (Array.isArray(event.breadcrumbs)) for (const crumb of event.breadcrumbs) scrubFields(crumb?.data);

  return event;
}
