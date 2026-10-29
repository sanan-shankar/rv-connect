import test, { after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
/* The default import, not `import * as`: under plain Node this is a CommonJS
   build, and a namespace import misses every name it re-exports (flush, close,
   captureException). Next's bundler sees the whole object either way. */
import Sentry from "@sentry/nextjs";

import { onRequestError, sentryOptions } from "../instrumentation.ts";
import { scrubEvent } from "./sentry-scrub.ts";

/* Bug audit 3, T8b-14: since Sentry 10, `sendDefaultPii: false` no longer kept
   a member's session cookie, Vercel's location headers, the referrer or the
   query string off an event. These tests send a poisoned request through the
   installed SDK with the site's own options and read what would have left.

   Nothing leaves: the DSN is a dummy and the transport records envelopes in
   memory. Every value that must not survive contains LEAK, so one search of
   each event finds any of them. */
const LEAK = "LEAKED";

const KEPT = { host: "rishivalley.space", "user-agent": "test-browser/1.0", "next-action": "7f3a" };

const POISONED = {
  cookie: `__Secure-authjs.session-token=${LEAK}-session; rv-visit=${LEAK}-visit; rv_trivia_id=${LEAK}-trivia`,
  "x-vercel-ip-city": `${LEAK}-city`,
  "x-vercel-ip-latitude": `${LEAK}-lat`,
  "x-vercel-ip-longitude": `${LEAK}-lon`,
  "x-vercel-ip-postal-code": `${LEAK}-postcode`,
  // Named by no deny list, Sentry's or ours: only a keep-list drops it.
  "x-vercel-oidc-token": `${LEAK}-oidc`,
  "x-forwarded-for": `${LEAK}-ip`,
  referer: `https://rishivalley.space/directory?q=${LEAK}-referer`,
  "accept-language": `${LEAK}-language`,
  ...KEPT,
};

const sent = [];
Sentry.init({
  ...sentryOptions,
  enabled: true, // off outside Vercel; on here, but...
  dsn: "https://public@o1.ingest.de.sentry.io/1", // ...never the real project...
  transport: () => ({
    // ...and nothing leaves this process at all.
    send: async (envelope) => {
      sent.push(envelope);
      return { statusCode: 200 };
    },
    flush: async () => true,
  }),
  tracesSampleRate: 1, // every trace, so the trace path is always exercised
});
after(() => Sentry.close(2000));

/** Every error and trace that reached the transport, as it would be sent. */
function delivered() {
  return sent
    .flatMap(([, items]) => items)
    .filter(([header]) => header.type === "event" || header.type === "transaction")
    .map(([, payload]) => (typeof payload === "string" ? JSON.parse(payload) : payload));
}
const message = (event) => event.exception?.values?.[0]?.value;

test("T8b-14: an error filed by onRequestError leaves without the cookie, the location or the search", async () => {
  onRequestError(
    new Error("render failed"),
    { path: `/directory?q=${LEAK}-search`, method: "GET", headers: POISONED },
    { routerKind: "App Router", routePath: "/directory", routeType: "render" }
  );
  await Sentry.flush(2000);

  const event = delivered().find((e) => message(e) === "render failed");
  assert.ok(event, "the error itself must still be reported");
  assert.deepEqual(event.request.headers, KEPT, "only the keep-list's headers, and all of them");
  assert.equal(event.request.cookies, undefined);
  assert.equal(event.contexts.nextjs.request_path, "/directory");
  assert.equal(event.contexts.nextjs.router_path, "/directory");
  assert.equal(JSON.stringify(event).includes(LEAK), false, JSON.stringify(event, null, 1));
});

test("T8b-14: a swallowed report inside a request, and the request's own trace, carry none of it either", async () => {
  const server = http.createServer((req, res) => {
    // An outgoing call's breadcrumb names the address it fetched.
    Sentry.addBreadcrumb({
      category: "http",
      type: "http",
      data: { url: `https://api.example.com/v1?term=${LEAK}-crumb`, "http.query": `term=${LEAK}-crumb` },
    });
    Sentry.startSpan(
      {
        name: `GET /directory?q=${LEAK}-name`,
        op: "http.server",
        forceTransaction: true,
        attributes: {
          "http.target": `/directory?q=${LEAK}-target`,
          "url.full": `https://rishivalley.space/directory?q=${LEAK}-full`,
          "url.query": `q=${LEAK}-query`,
        },
      },
      () => {
        Sentry.startSpan(
          {
            name: `GET https://api.example.com/v1?term=${LEAK}-child`,
            op: "http.client",
            attributes: { "url.full": `https://api.example.com/v1?term=${LEAK}-child` },
          },
          () => {}
        );
        // reportSwallowed's own call (src/lib/report-error.ts).
        Sentry.captureException(new Error("swallowed failure"), {
          tags: { swallowed: "true", area: "catchups" },
          extra: { step: "test" },
        });
      }
    );
    res.end("ok");
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  await new Promise((resolve, reject) => {
    http
      .get({ host: "127.0.0.1", port: server.address().port, path: `/directory?q=${LEAK}-search`, headers: POISONED }, (res) => {
        res.resume();
        res.on("end", resolve);
      })
      .on("error", reject);
  });
  await new Promise((resolve) => server.close(resolve));
  await Sentry.flush(2000);

  const swallowed = delivered().find((e) => message(e) === "swallowed failure");
  assert.ok(swallowed, "the swallowed report must still be filed");
  assert.equal(swallowed.tags.swallowed, "true");
  // The request was there to leak (the positive control), and left clean.
  assert.equal(swallowed.request.url, "http://rishivalley.space/directory");
  assert.deepEqual(swallowed.request.headers, KEPT);
  assert.equal(swallowed.request.cookies, undefined);
  assert.equal(swallowed.request.query_string, undefined);
  assert.equal(JSON.stringify(swallowed).includes(LEAK), false, JSON.stringify(swallowed, null, 1));

  const trace = delivered().find((e) => e.type === "transaction");
  assert.ok(trace, "the trace must still be sent");
  assert.equal(trace.transaction, "GET /directory");
  assert.deepEqual(trace.request.headers, KEPT);
  const data = trace.contexts.trace.data;
  assert.equal(data["http.target"], "/directory");
  assert.equal(data["url.full"], "https://rishivalley.space/directory");
  assert.equal(data["url.query"], undefined);
  assert.deepEqual(
    Object.keys(data).filter((k) => k.startsWith("http.request.header.")).sort(),
    ["http.request.header.host", "http.request.header.next_action", "http.request.header.user_agent"]
  );
  const [child] = trace.spans;
  assert.equal(child.description, "GET https://api.example.com/v1");
  assert.equal(child.data["url.full"], "https://api.example.com/v1");
  assert.equal(JSON.stringify(trace).includes(LEAK), false, JSON.stringify(trace, null, 1));
});

test("T8b-14: a Catch-up invite link's key is not filed with an error on the join page", async () => {
  onRequestError(
    new Error("join failed"),
    { path: `/catchups/join/${LEAK}-invite?from=mail`, method: "GET", headers: { host: "rishivalley.space" } },
    { routerKind: "App Router", routePath: "/catchups/join/[token]", routeType: "render" }
  );
  await Sentry.flush(2000);

  const event = delivered().find((e) => message(e) === "join failed");
  assert.ok(event, "the error itself must still be reported");
  assert.equal(event.contexts.nextjs.request_path, "/catchups/join/[token]");
  assert.equal(JSON.stringify(event).includes(LEAK), false);
});

test("T8b-14: the scrubber never throws on a shape it did not plan for", () => {
  /* Sentry drops an event whose beforeSend throws: an odd shape must cost the
     report nothing. */
  const odd = [
    {},
    { request: {} },
    { request: { headers: null, url: 5 } },
    { spans: "not a list", breadcrumbs: [null, { data: null }], contexts: { trace: null, nextjs: { request_path: 1 } } },
    { spans: [null, { op: "http.client" }], transaction: 7 },
  ];
  for (const event of odd) assert.doesNotThrow(() => scrubEvent(event), JSON.stringify(event));
});
