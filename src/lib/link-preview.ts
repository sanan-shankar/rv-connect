/* ------------------------------------------------------------------ *
 *  Resolving a pasted link: the network half, server only.
 *
 *  The pure half -- finding, classifying, the address refusal, reading a
 *  page's tags, the stripping rule -- is `link-preview-core.ts`, with its
 *  tests. This file fetches, re-hosts the image and writes `LinkPreview`.
 *
 *  WHEN IT RUNS, and why never inside a render. A third-party site can take
 *  seconds to answer or never answer at all, and an Edition holds dozens of
 *  answers. So resolution is always scheduled with `after()`, which runs
 *  once the response has been sent:
 *
 *    on SAVE    `submitEntry` hands over the links in the body it just
 *               wrote, so an answer pasted during the week already has its
 *               card by the morning the Edition publishes.
 *    on READ    the reader's loader hands over any link with no row (every
 *               answer written before this phase shipped) or whose failed
 *               resolve is more than a day old. That page view prints the
 *               ordinary link; the next one has the card.
 *
 *  Neither path can make a page wait, and neither can make one fail: every
 *  function exported here swallows its own errors.
 *
 *  THE SERVER NOW FETCHES URLS A MEMBER TYPED, which is the classic
 *  server-side request forgery shape. What stands in the way, in order:
 *
 *   1. http(s) only, no credentials, ports 80 and 443 only
 *      (`classifyLink`, and again here on every hop).
 *   2. The address is checked AT CONNECT TIME, not beforehand. The socket's
 *      own `lookup` is replaced with one that resolves every address and
 *      refuses the host if ANY of them is private, loopback, link-local or
 *      metadata space (`isRefusedAddress`). Checking DNS first and then
 *      fetching by name would leave a window for a record that answers
 *      public the first time and 127.0.0.1 the second (DNS rebinding). A
 *      literal IP in the url never reaches `lookup` at all, so it is
 *      checked separately, and the connected socket's remote address is
 *      checked once more when the response arrives.
 *   3. Redirects are followed BY HAND, at most three, and every hop goes
 *      back through 1 and 2.
 *   4. Five seconds for the whole thing, all hops included.
 *   5. Bytes are counted AFTER decompression, so a small gzip bomb cannot
 *      unfold past the cap: 512 KB of a page (the tags live in <head>),
 *      64 KB of oembed JSON, 5 MB of image.
 *   6. Only the content type asked for is read: an HTML page for a link,
 *      JSON for oembed, an image for a thumbnail. Anything else is dropped
 *      unread.
 *   7. The demo never resolves at all. Its visitor is an anonymous stranger,
 *      and "make this server fetch a url of my choosing" is exactly the kind
 *      of capability the demo refuses strangers (the same reasoning that
 *      keeps it from taking an upload; docs/spec/demo.md).
 * ------------------------------------------------------------------ */

import "server-only";

import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { createHash } from "node:crypto";
import type { LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { IS_DEMO } from "@/lib/demo";
import { directUploadAvailable, putImage } from "@/lib/storage";
import { sharpImage } from "@/lib/image";
import { reportSwallowed } from "@/lib/report-error";
import {
  classifyLink,
  isRefusedAddress,
  tidy,
  urlRefused,
  needsResolve,
  oembedEndpoint,
  parsePageMeta,
  youtubeStill,
  TITLE_CAP,
  SITE_CAP,
  type ClassifiedLink,
} from "@/lib/link-preview-core";

const TOTAL_BUDGET_MS = 5000;
const MAX_HOPS = 3;
const CAP = { html: 512 * 1024, json: 64 * 1024, image: 5 * 1024 * 1024 } as const;
type Want = keyof typeof CAP;

/** At most this many links resolved per call, and this many at once. An
 *  Edition with forty pasted links fills in over two or three page views
 *  rather than opening forty sockets from one render's `after()`. */
const MAX_PER_CALL = 16;
const CONCURRENCY = 4;

/** The size the preview image is stored at. The card draws it at 92x52 CSS
 *  pixels; 480 covers that at retina with room for a bigger card later, and
 *  a 480px WebP is a few kilobytes. */
const THUMB_BOX = 480;

/* Some sites turn away a request with no user agent at all. This one says
   what it is and where it comes from, the way every link unfurler does. */
const USER_AGENT = "Mozilla/5.0 (compatible; RishiValleyLinkPreview/1.0; +https://rishivalley.space)";

class Refused extends Error {}

/** The socket's own DNS lookup, refusing a host if ANY answer is private.
 *  `all` is honoured both ways because Node's happy-eyeballs connect asks
 *  for every address and a plain connect asks for one. */
function guardedLookup(
  hostname: string,
  options: { all?: boolean; family?: number },
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
): void {
  dnsLookup(hostname, { all: true, family: options.family ?? 0 }, (err, addresses) => {
    if (err) return callback(err, [], 0);
    if (addresses.length === 0 || addresses.some((a) => isRefusedAddress(a.address))) {
      return callback(new Refused(`refused address for ${hostname}`) as NodeJS.ErrnoException, [], 0);
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

function acceptable(want: Want, contentType: string): boolean {
  const type = contentType.split(";")[0].trim().toLowerCase();
  if (want === "html") return type === "text/html" || type === "application/xhtml+xml";
  if (want === "json") return type === "application/json" || type.endsWith("+json") || type === "text/javascript";
  return type.startsWith("image/") && type !== "image/svg+xml";
}

type Got = { url: string; contentType: string; body: Buffer };

/** One GET, SSRF-guarded, redirects followed by hand. Null on anything short
 *  of a 200 of the wanted type; never throws. */
async function guardedGet(start: string, want: Want): Promise<Got | null> {
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let current = start;
  for (let hop = 0; hop <= MAX_HOPS; hop += 1) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      return null;
    }
    if (urlRefused(u)) return null;

    const left = deadline - Date.now();
    if (left <= 0) return null;
    const step = await getOnce(u, want, left).catch(() => null);
    if (!step) return null;
    if ("redirect" in step) {
      try {
        current = new URL(step.redirect, u).toString();
      } catch {
        return null;
      }
      continue;
    }
    return step;
  }
  return null;
}

function getOnce(u: URL, want: Want, budget: number): Promise<Got | { redirect: string } | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: Got | { redirect: string } | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req.destroy();
      resolve(v);
    };
    const client = u.protocol === "https:" ? https : http;
    const req = client.get(
      u,
      {
        lookup: guardedLookup as unknown as LookupFunction,
        agent: false,
        headers: {
          "user-agent": USER_AGENT,
          accept:
            want === "html" ? "text/html,application/xhtml+xml" : want === "json" ? "application/json" : "image/*",
          "accept-encoding": "gzip, deflate, br",
          "accept-language": "en",
        },
      },
      (res) => {
        /* Belt to the lookup's braces: whatever the socket actually reached. */
        const remote = res.socket.remoteAddress;
        if (remote && isRefusedAddress(remote)) return done(null);

        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400 && res.headers.location) {
          return done({ redirect: res.headers.location });
        }
        if (status !== 200) {
          return done(null);
        }
        const contentType = String(res.headers["content-type"] ?? "");
        if (!acceptable(want, contentType)) {
          return done(null);
        }
        const declared = Number(res.headers["content-length"] ?? 0);
        if (want !== "html" && declared > CAP[want]) {
          return done(null);
        }

        const encoding = String(res.headers["content-encoding"] ?? "").toLowerCase();
        let stream: Readable = res;
        if (encoding === "gzip" || encoding === "x-gzip") stream = res.pipe(zlib.createGunzip());
        else if (encoding === "deflate") stream = res.pipe(zlib.createInflate());
        else if (encoding === "br") stream = res.pipe(zlib.createBrotliDecompress());

        const chunks: Buffer[] = [];
        let size = 0;
        /* A page is read only as far as its </head>: the tags are all there,
           and a news page's body can be a megabyte of nothing we use. The last
           few bytes of the previous chunk are rechecked in case the tag
           straddles two chunks. */
        let tail = "";
        stream.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > CAP[want]) {
            /* A page is allowed to be cut short -- its <head> is what we came
               for. JSON and an image are not: half of either is garbage. */
            if (want === "html") {
              chunks.push(chunk.subarray(0, chunk.length - (size - CAP[want])));
              return done({ url: u.toString(), contentType, body: Buffer.concat(chunks) });
            }
            return done(null);
          }
          chunks.push(chunk);
          if (want === "html") {
            const seen = tail + chunk.toString("latin1");
            if (/<\/head\s*>/i.test(seen)) {
              return done({ url: u.toString(), contentType, body: Buffer.concat(chunks) });
            }
            tail = seen.slice(-16);
          }
        });
        stream.on("end", () => done({ url: u.toString(), contentType, body: Buffer.concat(chunks) }));
        stream.on("error", () => done(null));
      },
    );
    req.on("error", () => done(null));
    const timer = setTimeout(() => done(null), budget);
  });
}

function decodeText(got: Got): string {
  const charset = /charset=([^;]+)/i.exec(got.contentType)?.[1]?.trim().replace(/["']/g, "");
  try {
    return new TextDecoder(charset || "utf-8").decode(got.body);
  } catch {
    return new TextDecoder("utf-8").decode(got.body);
  }
}

async function getJson(url: string): Promise<Record<string, unknown> | null> {
  const got = await guardedGet(url, "json");
  if (!got) return null;
  try {
    const data = JSON.parse(decodeText(got)) as unknown;
    return data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * The preview image, copied into our own bucket.
 *
 * WHY RE-HOST rather than point an <img> at the page's own image. Two
 * reasons, and either would decide it. The CSP's img-src names hosts, never
 * a wildcard (security-regressions.test.mjs pins it, audit C-134), and a
 * preview can come from any host on earth. And an <img> pointed at a host a
 * member chose is a read receipt: that host would learn the address of every
 * alumnus who opened the Edition. Copied once, at resolve time, the image is
 * served from images.rishivalley.space like every other photograph, and the
 * original host sees one request from our server and nothing about who reads.
 *
 * Decoded through `sharpImage`, the app's one decoder policy (pixel ceiling,
 * audit M14), and shrunk into a 480px box. Null when anything fails, or when
 * storage is the local filesystem: a `/link-previews/...` path written from a
 * laptop would be a broken image on production, which reads the same row.
 */
async function rehost(imageUrl: string, key: string): Promise<string | null> {
  if (!directUploadAvailable()) return null;
  const got = await guardedGet(imageUrl, "image");
  if (!got) return null;
  try {
    const webp = await sharpImage(got.body)
      .rotate()
      .resize(THUMB_BOX, THUMB_BOX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    return await putImage(webp, "link-previews", `${key}.webp`);
  } catch {
    return null;
  }
}

type Resolved = { kind: string; title: string | null; subtitle: string | null; thumbUrl: string | null };

/** Nothing worth a card. Every path with no title returns exactly this. */
const nothing = (kind: string): Resolved => ({ kind, title: null, subtitle: null, thumbUrl: null });

async function resolve(link: ClassifiedLink): Promise<Resolved> {
  const key = createHash("sha256").update(link.url).digest("hex").slice(0, 32);

  if (link.kind === "spotify" || link.kind === "youtube") {
    const data = await getJson(oembedEndpoint(link.kind, link.url));
    const title = tidy(data?.title, TITLE_CAP);
    if (!title) return nothing(link.kind);
    /* Spotify's keyless oembed carries no artist, and the platform's name is
       not a substitute for one (F33; R6: "we don't really need to say
       YouTube, because people can see that")). A YouTube still is derived
       from the id rather than trusted from the response. */
    const subtitle = link.kind === "youtube" ? tidy(data?.author_name, SITE_CAP) : null;
    const original =
      link.kind === "youtube"
        ? youtubeStill(link.videoId!)
        : typeof data?.thumbnail_url === "string"
          ? data.thumbnail_url
          : null;
    const thumbUrl = original ? await rehost(original, key) : null;
    return { kind: link.kind, title, subtitle, thumbUrl };
  }

  const page = await guardedGet(link.url, "html");
  if (!page) return nothing("link");
  const meta = parsePageMeta(decodeText(page), page.url);
  if (!meta.title) return nothing("link");
  const thumbUrl = meta.image ? await rehost(meta.image, key) : null;
  return { kind: "link", title: meta.title, subtitle: meta.siteName, thumbUrl };
}

/* One resolve per url at a time in this process, however many renders ask. */
const inflight = new Set<string>();

async function resolveAndStore(link: ClassifiedLink): Promise<void> {
  const now = new Date();
  let row: Resolved;
  try {
    row = await resolve(link);
  } catch (err) {
    reportSwallowed("link-preview", err, { step: "resolve" });
    row = nothing(link.kind);
  }
  const data = {
    ...row,
    /* A resolve that found no title is a failure, recorded so the reader
       retries it at most once a day instead of on every page view. */
    failedAt: row.title ? null : now,
    fetchedAt: now,
  };
  await prisma.linkPreview.upsert({ where: { url: link.url }, create: { url: link.url, ...data }, update: data });
}

/**
 * Resolve every link in `urls` that has no preview yet or failed more than a
 * day ago. Takes raw or normalised links; anything `classifyLink` refuses is
 * skipped. Never throws.
 */
export async function ensureLinkPreviews(urls: readonly string[]): Promise<void> {
  if (IS_DEMO || urls.length === 0) return;
  try {
    const links = new Map<string, ClassifiedLink>();
    for (const raw of urls) {
      const c = classifyLink(raw);
      if (c && !links.has(c.url)) links.set(c.url, c);
    }
    if (links.size === 0) return;

    const rows = await prisma.linkPreview.findMany({
      where: { url: { in: [...links.keys()] } },
      select: { url: true, failedAt: true },
    });
    const byUrl = new Map(rows.map((r) => [r.url, r]));
    const now = new Date();
    const due = [...links.values()]
      .filter((l) => needsResolve(byUrl.get(l.url), now) && !inflight.has(l.url))
      .slice(0, MAX_PER_CALL);
    /* Claimed before the first await, the whole batch at once: a link still
       waiting for a free worker must not look unclaimed to the next page view. */
    for (const link of due) inflight.add(link.url);

    let next = 0;
    const worker = async () => {
      while (next < due.length) {
        const link = due[next++];
        await resolveAndStore(link)
          .catch((err) => reportSwallowed("link-preview", err, { step: "store" }))
          .finally(() => inflight.delete(link.url));
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, due.length) }, worker));
  } catch (err) {
    reportSwallowed("link-preview", err, { step: "ensure" });
  }
}

/**
 * Schedule `ensureLinkPreviews` for after the response. The `try { after }
 * catch` shape because `after()` throws synchronously outside a request scope
 * (docs/TRAPS.md), and a script or a test must still be able to call the
 * code that calls this.
 */
export function scheduleLinkPreviews(urls: readonly string[]): void {
  if (urls.length === 0) return;
  const run = () => ensureLinkPreviews(urls);
  try {
    after(run);
  } catch {
    void run();
  }
}
