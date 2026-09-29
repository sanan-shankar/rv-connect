/* ------------------------------------------------------------------ *
 *  A link somebody pasted into an answer, and what it may become.
 *
 *  Build phase 10 (spec.md 3.8). His words, brief 50: "The song thing
 *  shouldn't just work if the question has exactly taken from the set of
 *  questions that we have ... the thumbnail thing should work. Whenever
 *  they paste a link to a song, right?" And, widening it, 2026-09-14:
 *  "can't you show preview for any link even if they're not songs?"
 *
 *  So a link in the BODY of any answer is found, normalised and filed as
 *  one of three kinds: a Spotify item or a YouTube video, which keep the
 *  song card, or any other web page, which gets a plain link card built
 *  from the page's own title, site name and preview image.
 *
 *  This file is the PURE half: finding, normalising, classifying, the
 *  address refusal, reading a page's metadata and taking replaced links
 *  out of the text. No network and no database, so `node:test` can hold
 *  every rule (link-preview-core.test.mjs). The fetching half is
 *  `link-preview.ts`, which is server-only.
 *
 *  No relative VALUE imports, and there must never be one: node:test
 *  cannot resolve them (docs/TRAPS.md, "Testing").
 * ------------------------------------------------------------------ */

export type LinkKind = "spotify" | "youtube" | "link";

/** One link found in a body, where it sits and what it normalises to. */
export type FoundLink = {
  /** The characters as pasted, trailing punctuation already trimmed off. */
  raw: string;
  start: number;
  end: number;
  /** The key the preview is stored under. Null when the text looks like a
   *  link but is not one we would ever fetch (a private port, credentials,
   *  a 3,000-character monster); it stays an ordinary link. */
  url: string | null;
};

/** The longest url that is ever normalised. A real share link is under 300;
 *  2,000 is the de facto ceiling browsers and CDNs agree on. */
export const MAX_URL_LENGTH = 2000;

/* ── finding ───────────────────────────────────────────────────────── *
 *  ASCII url characters only. A share sheet percent-encodes everything
 *  else, and an emoji glued to the end of a paste ("...Xee😭") must not be
 *  swallowed into the url. The apostrophe is left out on purpose: people
 *  quote links far more often than a url contains one. */
const LINK_IN_TEXT = /https?:\/\/[A-Za-z0-9\-._~:/?#[\]@!$&()*+,;=%]+/gi;

/** Punctuation a sentence puts after a link, which is not part of it. A
 *  closing bracket counts only when the url did not open one itself, so a
 *  Wikipedia "Foo_(band)" survives and "(see https://x.com)" does not. */
function trimTail(s: string): string {
  let out = s;
  for (;;) {
    const last = out[out.length - 1];
    if (/[.,;:!?*]/.test(last)) {
      out = out.slice(0, -1);
      continue;
    }
    if (last === ")" || last === "]") {
      const open = last === ")" ? "(" : "[";
      const opens = out.split(open).length - 1;
      const closes = out.split(last).length - 1;
      if (closes > opens) {
        out = out.slice(0, -1);
        continue;
      }
    }
    return out;
  }
}

/** Every link in a body, in the order it appears. */
export function findLinks(body: string | null | undefined): FoundLink[] {
  if (!body) return [];
  const out: FoundLink[] = [];
  for (const m of body.matchAll(LINK_IN_TEXT)) {
    const raw = trimTail(m[0]);
    /* "https://" alone, or a scheme with nothing after it. */
    if (raw.length <= "https://".length) continue;
    const start = m.index ?? 0;
    out.push({ raw, start, end: start + raw.length, url: classifyLink(raw)?.url ?? null });
  }
  return out;
}

/* ── normalising and classifying ───────────────────────────────────── */

/** Query parameters that only ever say who shared a link, never what it is.
 *  Stripping them is what makes two members pasting the same page share one
 *  preview row. `si` is NOT on this list for ordinary pages (it means
 *  something on some sites); Spotify and YouTube drop every parameter
 *  because their canonical form is rebuilt from the id. */
const TRACKING_PARAM = /^(utm_[a-z_]+|fbclid|gclid|dclid|gbraid|wbraid|msclkid|igshid|mc_cid|mc_eid|_hsenc|_hsmi|mkt_tok)$/i;

const SPOTIFY_PATH =
  /^(?:\/intl-[a-z]{2}(?:-[a-z]{2})?)?\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,40})\/?$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);

export type ClassifiedLink = { kind: LinkKind; url: string; videoId?: string };

/**
 * Parse, refuse, and file a pasted link. Null means "not something we would
 * ever fetch", which is not an error: the text stays an ordinary link.
 *
 * Refused here, before any network: anything that is not http(s), a url
 * carrying a username or password, and any explicit port other than 80 or
 * 443 (a port is how a request is aimed at an internal service that happens
 * to share a public address). Private ADDRESSES are refused later, in the
 * fetcher, because a hostname only becomes an address when DNS answers.
 */
export function classifyLink(raw: string): ClassifiedLink | null {
  if (!raw || raw.length > MAX_URL_LENGTH) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (urlRefused(u)) return null;

  const host = u.hostname.toLowerCase();

  if (host === "open.spotify.com") {
    const m = SPOTIFY_PATH.exec(u.pathname);
    if (m) return { kind: "spotify", url: `https://open.spotify.com/${m[1]}/${m[2]}` };
  }

  const videoId = youtubeId(u, host);
  if (videoId) {
    return { kind: "youtube", url: `https://www.youtube.com/watch?v=${videoId}`, videoId };
  }

  u.hash = "";
  for (const key of [...u.searchParams.keys()]) {
    if (TRACKING_PARAM.test(key)) u.searchParams.delete(key);
  }
  let url = u.toString();
  /* `new URL("https://x.com/?")` keeps the bare "?" once every parameter is
     gone; the two spellings are the same page and must share one row. */
  if (url.endsWith("?")) url = url.slice(0, -1);
  if (url.length > MAX_URL_LENGTH) return null;
  return { kind: "link", url };
}

/**
 * The shape of a url the server will never request, checked on the pasted link
 * AND on every redirect hop (link-preview.ts), from this one function so the
 * two can never drift: not http(s), credentials in it, a port other than 80 or
 * 443, a dotless host ("localhost", an intranet name), or a literal IP in
 * refused space. A HOSTNAME's addresses are checked at connect time instead.
 */
export function urlRefused(u: URL): boolean {
  if (u.protocol !== "http:" && u.protocol !== "https:") return true;
  if (u.username || u.password) return true;
  if (u.port && u.port !== "80" && u.port !== "443") return true;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host) return true;
  const literal = /^[\d.]+$/.test(host) || host.includes(":");
  if (literal) return isRefusedAddress(host);
  return !host.includes(".");
}

/** watch?v=, youtu.be/, /shorts/, /live/ and /embed/, on www, m. and
 *  YouTube Music. Every form of one video normalises to the same row. */
function youtubeId(u: URL, host: string): string | null {
  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.split("/")[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = /^\/(?:shorts|live|embed)\/([^/]+)\/?$/.exec(u.pathname);
      if (m) id = m[1];
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

/** Where each kind's metadata comes from. Spotify and YouTube answer a
 *  keyless oembed; an ordinary page is read for its own tags. */
export function oembedEndpoint(kind: "spotify" | "youtube", url: string): string {
  return kind === "spotify"
    ? `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`
    : `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
}

/** A video's still, derived from its id with no call and no key. hqdefault,
 *  not maxresdefault: maxres exists only for uploads above 720p and 404s
 *  silently for the rest. */
export const youtubeStill = (videoId: string) => `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

/* ── the address refusal ───────────────────────────────────────────── *
 *  The server now fetches urls a member typed, so it must never be turned
 *  into a way to reach something only the server can reach: loopback, the
 *  private ranges, link-local (which is where every cloud's metadata
 *  service lives, 169.254.169.254 and fd00:ec2::254), carrier-grade NAT,
 *  multicast, the documentation and benchmarking ranges, and every IPv6
 *  spelling that smuggles one of those inside it (mapped, compatible,
 *  NAT64, 6to4).
 *
 *  Written as an allow-by-exception over PUBLIC space rather than a list of
 *  private blocks: for IPv6 only 2000::/3 is global unicast today, so
 *  anything outside it is refused without needing a name. Anything that
 *  does not parse is refused too. */

type V4Block = [number, number]; // [network as uint32, prefix length]

const V4_REFUSED: V4Block[] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
].map(([ip, bits]) => [parseV4(ip as string)!, bits as number]);

function parseV4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    /* Strict decimal, no leading zeros: "0177.0.0.1" is octal to some
       resolvers and must not slip past as a public-looking string. The URL
       parser canonicalises hostnames already; this is for DNS answers. */
    if (!/^(0|[1-9]\d{0,2})$/.test(p)) return null;
    const v = Number(p);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

function v4Refused(n: number): boolean {
  return V4_REFUSED.some(([net, bits]) => {
    const size = 2 ** (32 - bits);
    return n >= net && n < net + size;
  });
}

/** Eight 16-bit groups, or null. Handles "::", an embedded IPv4 tail and a
 *  zone id. */
function parseV6(ip: string): number[] | null {
  let s = ip.replace(/^\[|\]$/g, "");
  const zone = s.indexOf("%");
  if (zone !== -1) s = s.slice(0, zone);
  /* A dotted IPv4 tail ("::ffff:10.0.0.1") becomes the two groups it is. */
  if (s.includes(".")) {
    const at = s.lastIndexOf(":");
    const v4 = at === -1 ? null : parseV4(s.slice(at + 1));
    if (v4 === null) return null;
    s = `${s.slice(0, at + 1)}${Math.floor(v4 / 65536).toString(16)}:${(v4 % 65536).toString(16)}`;
  }
  if (!/^[0-9a-fA-F:]+$/.test(s)) return null;

  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  let groups = head;
  if (halves.length === 2) {
    const rest = halves[1] ? halves[1].split(":") : [];
    const fill = 8 - head.length - rest.length;
    if (fill < 1) return null;
    groups = [...head, ...Array<string>(fill).fill("0"), ...rest];
  }
  if (groups.length !== 8) return null;
  const out: number[] = [];
  for (const g of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(g)) return null;
    out.push(parseInt(g, 16));
  }
  return out;
}

/**
 * True when the server must NOT connect to this address. Takes the textual
 * address DNS handed back (or the literal in a url), IPv4 or IPv6.
 */
export function isRefusedAddress(ip: string): boolean {
  const v4 = parseV4(ip);
  if (v4 !== null) return v4Refused(v4);

  const g = parseV6(ip);
  if (!g) return true;

  const embedded = (hi: number, lo: number) => hi * 65536 + lo;
  const zeroTo = (n: number) => g.slice(0, n).every((x) => x === 0);

  /* ::ffff:a.b.c.d (mapped) and ::a.b.c.d (compatible, which also covers ::
     and ::1): the IPv4 rules decide. */
  if (zeroTo(5) && (g[5] === 0xffff || g[5] === 0)) return v4Refused(embedded(g[6], g[7]));
  /* 64:ff9b::/96, the well-known NAT64 prefix: the IPv4 inside decides. */
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) {
    return v4Refused(embedded(g[6], g[7]));
  }
  /* 2002::/16, 6to4: the IPv4 in groups 1-2 decides. */
  if (g[0] === 0x2002) return v4Refused(embedded(g[1], g[2]));

  /* Only 2000::/3 is global unicast. ULA fc00::/7, link-local fe80::/10,
     multicast ff00::/8, 64:ff9b:1::/48 and 100::/64 all fall outside it. */
  if ((g[0] & 0xe000) !== 0x2000) return true;
  /* Inside it: 2001::/23 (IETF protocol assignments, Teredo among them),
     2001:db8::/32 (documentation) and 3fff::/20 (documentation, 2024). */
  if (g[0] === 0x2001 && g[1] < 0x0200) return true;
  if (g[0] === 0x2001 && g[1] === 0x0db8) return true;
  if (g[0] === 0x3fff && g[1] < 0x1000) return true;
  return false;
}

/* ── reading a page ────────────────────────────────────────────────── */

export type PageMeta = { title: string | null; siteName: string | null; image: string | null };

const ENTITY: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name[0] === "#") {
      const code = name[1] === "x" || name[1] === "X" ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return ENTITY[name.toLowerCase()] ?? whole;
  });
}

/** One line, no control characters, capped. A title is printed as React text
 *  so nothing here is an escaping concern; it is a tidiness one. Used for a
 *  page's tags and for oembed's answers alike. The cap counts code points, so
 *  it never cuts an emoji in half. */
export function tidy(s: unknown, cap: number): string | null {
  if (typeof s !== "string" || !s) return null;
  const out = decodeEntities(s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  if (!out) return null;
  const points = Array.from(out);
  return points.length > cap ? `${points.slice(0, cap - 1).join("").trimEnd()}…` : out;
}

export const TITLE_CAP = 200;
export const SITE_CAP = 80;

/**
 * A page's own title, site name and preview image, from Open Graph first,
 * then Twitter's card tags, then `<title>`. Relative image urls are resolved
 * against the page's FINAL url (after redirects), which is the one the
 * browser would have used.
 *
 * EVERY PATTERN HERE IS BOUNDED, so the work grows with the page, not with
 * its square. The page is whatever a stranger's server sends, and the
 * unbounded versions backtracked: one `<meta` tag holding a long run of
 * letters made the attribute pattern retry every length at every position,
 * measured at 2.8 s for 40 KB and 11.9 s for 80 KB, about eight minutes at
 * the 512 KB the fetcher allows (bug audit 3, T2b-01 / L8-05). Regex work
 * cannot be interrupted, and Fluid runs other members' requests in the same
 * process, so the bound has to be in the patterns themselves. The caps sit
 * far above anything a real page writes: META_TAG_MAX for one whole tag,
 * ATTR_NAME_MAX for an attribute's name, TITLE_MAX for a `<title>`.
 */
const META_TAG_MAX = 2048;
const ATTR_NAME_MAX = 64;
const TITLE_MAX = 1024;
/* `[^<>]`, not `[^>]`: a tag also ends at the next `<`, so no stretch of the
   page is scanned by more than one opener. With `[^>]` a page of nothing but
   unclosed `<meta` openers still cost ~0.5 s at 512 KB, each opener reading
   2 KB ahead. A real attribute value with a raw `<` in it loses its tag. */
const META_TAG = new RegExp(`<meta\\b[^<>]{0,${META_TAG_MAX}}>`, "gi");
const META_ATTR = new RegExp(
  `([a-zA-Z_:.-]{1,${ATTR_NAME_MAX}})\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
  "g",
);
const TITLE_TAG = new RegExp(`<title\\b[^>]{0,256}>([^<]{0,${TITLE_MAX}})<\\/title\\s*>`, "i");

export function parsePageMeta(html: string, pageUrl: string): PageMeta {
  const headEnd = html.search(/<\/head\s*>/i);
  const head = headEnd === -1 ? html : html.slice(0, headEnd);

  const meta = new Map<string, string>();
  for (const tag of head.matchAll(META_TAG)) {
    const attrs = new Map<string, string>();
    for (const a of tag[0].matchAll(META_ATTR)) {
      attrs.set(a[1].toLowerCase(), a[2] ?? a[3] ?? a[4] ?? "");
    }
    const key = (attrs.get("property") ?? attrs.get("name") ?? "").toLowerCase();
    const content = attrs.get("content");
    /* First one wins: a page that lists og:image twice means the first. */
    if (key && content !== undefined && !meta.has(key)) meta.set(key, content);
  }
  const first = (...keys: string[]) => keys.map((k) => meta.get(k)).find((v) => v && v.trim());

  const titleTag = TITLE_TAG.exec(head)?.[1];
  const title = tidy(first("og:title", "twitter:title") ?? titleTag, TITLE_CAP);
  const siteName = tidy(first("og:site_name", "application-name"), SITE_CAP);

  let image: string | null = null;
  const rawImage = first("og:image:secure_url", "og:image", "og:image:url", "twitter:image", "twitter:image:src");
  if (rawImage) {
    try {
      const u = new URL(decodeEntities(rawImage.trim()), pageUrl);
      if ((u.protocol === "https:" || u.protocol === "http:") && u.toString().length <= MAX_URL_LENGTH) {
        image = u.toString();
      }
    } catch {
      image = null;
    }
  }
  return { title, siteName, image };
}

/* ── what the reader prints ────────────────────────────────────────── */

/** A stored preview, as the table holds it. */
export type PreviewRow = {
  url: string;
  kind: string;
  title: string | null;
  subtitle: string | null;
  thumbUrl: string | null;
  failedAt: Date | null;
};

/** What a card is drawn from. */
export type LinkCardView = {
  kind: LinkKind;
  url: string;
  title: string;
  subtitle: string | null;
  thumbUrl: string | null;
};

/** A failed resolve is tried again at most once a day. */
export const RETRY_AFTER_MS = 24 * 60 * 60 * 1000;

/** Whether this url should be (re)resolved: never seen, or failed more than
 *  a day ago. A preview that worked is kept; titles do not drift enough to
 *  pay for a refetch. */
export function needsResolve(row: Pick<PreviewRow, "failedAt"> | undefined, now: Date): boolean {
  if (!row) return true;
  return row.failedAt !== null && now.getTime() - row.failedAt.getTime() >= RETRY_AFTER_MS;
}

const KINDS: ReadonlySet<string> = new Set(["spotify", "youtube", "link"]);

const same = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

/** A row becomes a card only if it resolved AND has a title to print. A
 *  subtitle that only repeats the title is dropped: a school site whose
 *  og:site_name and og:title are both "RISHI VALLEY EDUCATION CENTRE" printed
 *  it twice, and the card's second line then falls back to the address,
 *  which is the thing that line is for. */
export function cardOf(row: PreviewRow | undefined): LinkCardView | null {
  if (!row || row.failedAt || !row.title || !KINDS.has(row.kind)) return null;
  return {
    kind: row.kind as LinkKind,
    url: row.url,
    title: row.title,
    subtitle: row.subtitle && !same(row.subtitle, row.title) ? row.subtitle : null,
    thumbUrl: row.thumbUrl,
  };
}

/**
 * THE FAIL-SOFT RULE, in one function. The body loses a link ONLY when a
 * card replaced it; every other link stays in the text, where the reader
 * prints it as an ordinary link.
 *
 * This is the inversion F38 and F39 were about: the lab's first resolver
 * stripped EVERY url, so an answer whose whole body was a Bandcamp link came
 * out as an empty string, produced no card, and was dropped from the page by
 * `said()` -- a member's whole answer gone with nothing on screen to say so.
 *
 * When a replaced link ends its line, a separator hanging in front of it
 * goes too ("burger by bbno$ - <link>" reads "burger by bbno$", with the
 * card under it). In the middle of a line only the link and one space go,
 * so nobody's punctuation is eaten.
 */
export function stripReplacedLinks(
  body: string | null | undefined,
  replaced: ReadonlySet<string>,
): { body: string; cards: string[] } {
  if (!body) return { body: "", cards: [] };
  const found = findLinks(body).filter((f) => f.url && replaced.has(f.url));
  if (found.length === 0) return { body, cards: [] };

  let out = "";
  let at = 0;
  for (const f of found) {
    let before = body.slice(at, f.start);
    const after = body.slice(f.end);
    const endsLine = /^[ \t]*(\r?\n|$)/.test(after);
    if (endsLine) before = before.replace(/(?:[ \t]+[-–—][ \t]*|:[ \t]*|[ \t]+)$/, "");
    out += before;
    at = f.end;
    if (!endsLine && /[ \t]$/.test(out)) {
      /* "listen to <link> today" -> "listen to today", one space not two. */
      const next = body.slice(at).match(/^[ \t]+/);
      if (next) at += next[0].length;
    }
  }
  out += body.slice(at);

  const cards: string[] = [];
  for (const f of found) if (!cards.includes(f.url!)) cards.push(f.url!);

  return {
    body: out
      .replace(/[ \t]+(\r?\n)/g, "$1")
      .replace(/(\r?\n){3,}/g, "\n\n")
      .trim(),
    cards,
  };
}

/** Link ranges for the renderer: every link that is left in a body after
 *  stripping, as [start, end) offsets. Handed to `renderRichText` so the
 *  text it links and the text this file strips come from ONE matcher. */
export function linkRanges(text: string): Array<[number, number]> {
  return findLinks(text).map((f) => [f.start, f.end]);
}
