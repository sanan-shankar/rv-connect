import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cardOf,
  classifyLink,
  findLinks,
  isRefusedAddress,
  needsResolve,
  parsePageMeta,
  RETRY_AFTER_MS,
  stripReplacedLinks,
  urlRefused,
} from "./link-preview-core.ts";

/* ------------------------------------------------------------------ *
 *  Link previews, the rules that can be wrong without anyone seeing.
 *
 *  WHY IT IS A TEST. Two of these fail silently and one fails
 *  dangerously. A normalisation slip means two members pasting the same
 *  song get two rows and one of them never resolves; a stripping slip is
 *  F38/F39, where a member's whole answer vanished from the page with
 *  nothing to say so; and a gap in the address refusal is the server
 *  fetching its own cloud metadata on a member's say-so. None of them
 *  shows up in a screenshot of a page that looks fine.
 * ------------------------------------------------------------------ */

/* ── normalisation ─────────────────────────────────────────────────── */

test("a Spotify paste loses its share parameters and its intl prefix", () => {
  const want = "https://open.spotify.com/track/3IuSgREoO5y88HdIcE2Xee";
  for (const raw of [
    "https://open.spotify.com/track/3IuSgREoO5y88HdIcE2Xee?si=r8aopSV2RFaSes3FE0JXuQ&utm_source=copy-link",
    "https://open.spotify.com/intl-de/track/3IuSgREoO5y88HdIcE2Xee",
    "http://open.spotify.com/track/3IuSgREoO5y88HdIcE2Xee/",
  ]) {
    assert.deepEqual(classifyLink(raw), { kind: "spotify", url: want }, raw);
  }
  assert.equal(classifyLink("https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk")?.kind, "spotify");
});

test("every spelling of one YouTube video is one row", () => {
  const want = { kind: "youtube", url: "https://www.youtube.com/watch?v=RUz1pZ_LujU", videoId: "RUz1pZ_LujU" };
  for (const raw of [
    "https://youtu.be/RUz1pZ_LujU?si=KziWjAtI4tiEWOUJ",
    "https://www.youtube.com/watch?v=RUz1pZ_LujU&t=42s",
    "https://m.youtube.com/watch?v=RUz1pZ_LujU",
    "https://music.youtube.com/watch?v=RUz1pZ_LujU&list=RDAMVM",
    "https://youtube.com/shorts/RUz1pZ_LujU",
    "https://www.youtube.com/live/RUz1pZ_LujU",
  ]) {
    assert.deepEqual(classifyLink(raw), want, raw);
  }
  /* Not a video: a channel page is an ordinary link, never a song card. */
  assert.equal(classifyLink("https://www.youtube.com/@thebeths")?.kind, "link");
});

test("an ordinary page keeps its path and query and loses only tracking", () => {
  assert.deepEqual(classifyLink("https://Example.com/a/b?id=7&utm_source=x&fbclid=abc#section"), {
    kind: "link",
    url: "https://example.com/a/b?id=7",
  });
  assert.equal(classifyLink("https://example.com/?utm_medium=share")?.url, "https://example.com/");
});

test("what is never fetched: other schemes, credentials, odd ports, no dot", () => {
  for (const raw of [
    "ftp://example.com/file",
    "javascript:alert(1)",
    "https://user:pass@example.com/",
    "http://example.com:8080/admin",
    "http://localhost/",
    "http://intranet/",
    `https://example.com/${"a".repeat(2100)}`,
  ]) {
    assert.equal(classifyLink(raw), null, raw);
  }
});

/* ── finding ───────────────────────────────────────────────────────── */

test("a link is found without the sentence's punctuation or an emoji glued on", () => {
  const body = 'Try (https://example.com/a_(b)) and https://example.com/x. Also "https://example.com/q"😭';
  assert.deepEqual(
    findLinks(body).map((f) => f.raw),
    ["https://example.com/a_(b)", "https://example.com/x", "https://example.com/q"],
  );
  assert.deepEqual(findLinks("no links here"), []);
  assert.deepEqual(findLinks(null), []);
});

/* ── the address refusal ───────────────────────────────────────────── */

test("private, loopback, link-local and metadata addresses are refused", () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "255.255.255.255",
    "::",
    "::1",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "::ffff:169.254.169.254",
    "64:ff9b::a9fe:a9fe",
    "2002:7f00:1::",
    "fd00:ec2::254",
    "fe80::1%en0",
    "ff02::1",
    "2001:db8::1",
    "[::1]",
    "0177.0.0.1",
    "not an address",
  ]) {
    assert.equal(isRefusedAddress(ip), true, ip);
  }
});

test("public addresses are allowed, including the edges of the private blocks", () => {
  for (const ip of [
    "1.1.1.1",
    "8.8.8.8",
    "172.15.255.255",
    "172.32.0.1",
    "192.169.0.1",
    "100.128.0.1",
    "2606:4700:4700::1111",
    "2a00:1450:4001:80b::200e",
    "::ffff:8.8.8.8",
  ]) {
    assert.equal(isRefusedAddress(ip), false, ip);
  }
});

/* ── the stripping rule (F38, F39) ─────────────────────────────────── */

const SONG = "https://open.spotify.com/track/1KpAjuTO2M9eYnaGz6uoTc";

test("text is stripped ONLY where a card replaced the link", () => {
  const body = "Walked the ghat road. https://open.spotify.com/track/1KpAjuTO2M9eYnaGz6uoTc?si=8013&utm_source=copy-link";
  /* Nothing resolved: the body is untouched, every character of it. */
  assert.deepEqual(stripReplacedLinks(body, new Set()), { body, cards: [] });
  /* A different link resolved: still untouched. */
  assert.equal(stripReplacedLinks(body, new Set(["https://example.com/"])).body, body);
  /* This one resolved: it goes, and the words stay. */
  assert.deepEqual(stripReplacedLinks(body, new Set([SONG])), { body: "Walked the ghat road.", cards: [SONG] });
});

test("an answer that is ONLY an unresolved link keeps its link, so said() keeps the answer", () => {
  const body = "https://someband.bandcamp.com/track/a-song";
  assert.equal(stripReplacedLinks(body, new Set([SONG])).body, body);
});

test("an answer that is only a replaced link comes out empty, and the card is the answer", () => {
  assert.deepEqual(stripReplacedLinks(`${SONG}?si=x`, new Set([SONG])), { body: "", cards: [SONG] });
});

test("paragraphs close up, a dangling separator goes, mid-line punctuation stays", () => {
  const replaced = new Set([SONG, "https://open.spotify.com/track/3UbEemDEz6b6l5EBiswULJ"]);
  assert.equal(
    stripReplacedLinks(
      `I love this one.\n\n${SONG}?si=1\n\nAnd this.`,
      replaced,
    ).body,
    "I love this one.\n\nAnd this.",
  );
  assert.equal(
    stripReplacedLinks(
      `Nach Baliye!! ${SONG}?si=e \nburger by bbno$ - https://open.spotify.com/track/3UbEemDEz6b6l5EBiswULJ?si=f`,
      replaced,
    ).body,
    "Nach Baliye!!\nburger by bbno$",
  );
  assert.equal(stripReplacedLinks(`listen to ${SONG} today, really`, replaced).body, "listen to today, really");
});

test("one link pasted twice is one card", () => {
  assert.deepEqual(stripReplacedLinks(`${SONG} and again ${SONG}?si=2`, new Set([SONG])).cards, [SONG]);
});

/* ── reading a page ────────────────────────────────────────────────── */

test("Open Graph first, then Twitter, then <title>; the image resolves against the page", () => {
  const html = `<!doctype html><html><head>
    <title>Fallback &amp; title</title>
    <meta name="twitter:title" content="Twitter title">
    <meta property="og:title" content="The Beths &#8211; Straight Line Was A Lie">
    <meta content='Bandcamp' property='og:site_name'>
    <meta property="og:image" content="/art/cover.jpg">
    </head><body><meta property="og:title" content="not in head"></body></html>`;
  assert.deepEqual(parsePageMeta(html, "https://thebeths.bandcamp.com/track/x"), {
    title: "The Beths – Straight Line Was A Lie",
    siteName: "Bandcamp",
    image: "https://thebeths.bandcamp.com/art/cover.jpg",
  });
  assert.deepEqual(parsePageMeta("<title>\n  Just a title \n</title>", "https://a.com/"), {
    title: "Just a title",
    siteName: null,
    image: null,
  });
  assert.deepEqual(parsePageMeta("<p>nothing</p>", "https://a.com/"), { title: null, siteName: null, image: null });
  /* A javascript: image is never an image. */
  assert.equal(parsePageMeta('<meta property="og:image" content="javascript:alert(1)">', "https://a.com/").image, null);
});

/* ── what the reader prints ────────────────────────────────────────── */

test("a failed or titleless row is no card; a failure is retried after a day, not before", () => {
  const ok = { url: SONG, kind: "spotify", title: "Straight Line Was A Lie", subtitle: null, thumbUrl: null, failedAt: null };
  assert.equal(cardOf(ok)?.title, "Straight Line Was A Lie");
  assert.equal(cardOf({ ...ok, failedAt: new Date() }), null);
  assert.equal(cardOf({ ...ok, title: null }), null);
  assert.equal(cardOf({ ...ok, kind: "bandcamp" }), null);
  assert.equal(cardOf(undefined), null);

  const now = new Date("2026-09-14T12:00:00Z");
  assert.equal(needsResolve(undefined, now), true);
  assert.equal(needsResolve({ failedAt: null }, now), false);
  assert.equal(needsResolve({ failedAt: new Date(now.getTime() - RETRY_AFTER_MS + 1000) }, now), false);
  assert.equal(needsResolve({ failedAt: new Date(now.getTime() - RETRY_AFTER_MS) }, now), true);
});

test("the url-shape refusal is the same on a paste and on a redirect hop", () => {
  /* urlRefused is what guardedGet re-applies on every hop, so a redirect to
     any of these is refused exactly as pasting it would be. */
  for (const raw of [
    "http://127.0.0.1/",
    "http://169.254.169.254/latest/meta-data/",
    "http://[::1]/",
    "http://[::ffff:10.0.0.1]/",
    "http://localhost/",
    "https://example.com:8443/",
    "file:///etc/passwd",
    "http://2130706433/",
  ]) {
    assert.equal(urlRefused(new URL(raw)), true, raw);
  }
  for (const raw of ["https://example.com/", "http://8.8.8.8/", "https://[2606:4700:4700::1111]/"]) {
    assert.equal(urlRefused(new URL(raw)), false, raw);
  }
});
