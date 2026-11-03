import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT, read, decomment, balancedBody } from "./test-kit.mjs";

/* ------------------------------------------------------------------ *
 *  A link preview nobody's writing shows any more goes, with its
 *  thumbnail, and nothing else in the bucket ever can (bug audit 3,
 *  T2b-02).
 *
 *  The sweep runs as it is against a fake database and a fake bucket.
 *  Its key function is the real one from storage.ts, because "it can
 *  only ever name a thumbnail" is the promise that matters most here.
 * ------------------------------------------------------------------ */

const STORAGE = pathToFileURL(resolve(ROOT, "src/lib/storage.ts")).href;
const fake = { previews: [], posts: [], entries: [], deletedKeys: [], refuse: new Set(), r2: true };
globalThis.__previewSweep = fake;

const STUBS = {
  "@/lib/prisma": "export const prisma = globalThis.__previewSweep.prisma;",
  "@/lib/storage": [
    `export { linkPreviewKeyForUrl } from ${JSON.stringify(STORAGE)};`,
    "export const directUploadAvailable = () => globalThis.__previewSweep.r2;",
    "export const delImageByKey = async (key) => {",
    "  globalThis.__previewSweep.deletedKeys.push(key);",
    "  return !globalThis.__previewSweep.refuse.has(key);",
    "};",
  ].join("\n"),
};

registerHooks({
  resolve(specifier, context, next) {
    // The sweep's own storage import is the stand-in; storage.ts itself (for
    // the real key function) loads as it is.
    if (STUBS[specifier] && !context.parentURL?.startsWith("data:")) {
      return { url: `data:text/javascript,${encodeURIComponent(STUBS[specifier])}`, shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return next(pathToFileURL(resolve(ROOT, "src", `${specifier.slice(2)}.ts`)).href, context);
    }
    return next(specifier, context);
  },
});

const holds = (where, column, rows) =>
  rows.filter((r) => where.OR.some((c) => r[column].toLowerCase().includes(c[column].contains.toLowerCase())));

fake.prisma = {
  linkPreview: {
    findMany: async ({ where, take }) =>
      fake.previews.filter((p) => p.fetchedAt < where.fetchedAt.lt).slice(0, take),
    deleteMany: async ({ where }) => {
      const before = fake.previews.length;
      fake.previews = fake.previews.filter((p) => !(p.url === where.url && p.fetchedAt < where.fetchedAt.lt));
      return { count: before - fake.previews.length };
    },
  },
  post: { findMany: async ({ where }) => holds(where, "content", fake.posts) },
  catchupEntry: { findMany: async ({ where }) => holds(where, "body", fake.entries) },
};

const { sweepStaleLinkPreviews } = await import("./link-preview-retention.ts");
const { classifyLink } = await import("./link-preview-core.ts");
const { linkPreviewKeyForUrl } = await import("./storage.ts");

const NOW = new Date("2026-11-03T12:00:00Z");
const daysAgo = (n) => new Date(NOW.getTime() - n * 86_400_000);
const THUMBS = "https://images.rishivalley.space/link-previews/2026/07";
const norm = (raw) => classifyLink(raw).url;

function world() {
  fake.deletedKeys = [];
  fake.refuse = new Set();
  fake.r2 = true;
  fake.previews = [
    // Stale, and nobody's writing holds it any more: goes, with its picture.
    { url: norm("https://example.com/gone"), thumbUrl: `${THUMBS}/a.webp`, fetchedAt: daysAgo(120) },
    // Stale, but an answer still pastes it, under another tracking tag.
    { url: norm("https://www.example.com/kept?utm_source=email"), thumbUrl: `${THUMBS}/b.webp`, fetchedAt: daysAgo(120) },
    // Stale, held by a post as a short youtu.be link of the same video.
    { url: norm("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), thumbUrl: `${THUMBS}/c.webp`, fetchedAt: daysAgo(200) },
    // Fresh and unheld: a letter between saves keeps its card.
    { url: norm("https://example.com/recent"), thumbUrl: `${THUMBS}/d.webp`, fetchedAt: daysAgo(10) },
    // Stale, unheld, and the bucket refuses its picture today.
    { url: norm("https://example.com/stuck"), thumbUrl: `${THUMBS}/e.webp`, fetchedAt: daysAgo(120) },
    // Stale, unheld, a failed resolve with no picture at all.
    { url: norm("https://example.com/failed"), thumbUrl: null, fetchedAt: daysAgo(120) },
  ];
  fake.entries = [{ body: "Still worth a read: https://www.example.com/kept?utm_source=whatsapp" }];
  fake.posts = [{ content: "The one we sang https://youtu.be/dQw4w9WgXcQ at the reunion" }];
  fake.refuse.add("link-previews/2026/07/e.webp");
}

test("a stale preview no body holds goes with its thumbnail; every other one stays", async () => {
  world();
  const swept = await sweepStaleLinkPreviews({ keepDays: 90, now: NOW });
  assert.deepEqual(swept, { removed: 2, kept: 2, stillPending: 1 });
  assert.deepEqual(
    fake.previews.map((p) => p.url).sort(),
    [norm("https://www.example.com/kept"), norm("https://example.com/recent"), norm("https://example.com/stuck"), norm("https://www.youtube.com/watch?v=dQw4w9WgXcQ")].sort(),
  );
  assert.deepEqual(fake.deletedKeys, ["link-previews/2026/07/a.webp", "link-previews/2026/07/e.webp"]);
});

test("a dry run decides the same and deletes nothing", async () => {
  world();
  const swept = await sweepStaleLinkPreviews({ keepDays: 90, now: NOW, dryRun: true });
  assert.equal(swept.removed, 3, "a dry run counts what a real run would take, the refused one included");
  assert.equal(fake.previews.length, 6);
  assert.deepEqual(fake.deletedKeys, []);
});

test("a process that cannot reach the bucket deletes nothing at all", async () => {
  world();
  fake.r2 = false;
  const swept = await sweepStaleLinkPreviews({ keepDays: 90, now: NOW });
  assert.deepEqual(swept, { removed: 0, kept: 0, stillPending: 0 });
  assert.equal(fake.previews.length, 6);
});

test("the thumbnail key can only ever name a link preview", () => {
  const LIVE = "https://images.rishivalley.space";
  assert.equal(linkPreviewKeyForUrl(`${LIVE}/link-previews/2026/07/a.webp`), "link-previews/2026/07/a.webp");
  for (const url of [
    `${LIVE}/uploads/u1/2026/10/x.webp`,
    `${LIVE}/avatars/u1/2026/10/x.webp`,
    `${LIVE}/collection/u1/2026/10/x.webp`,
    `${LIVE}/staging/u1/2026/10/x.jpg`,
    `${LIVE}/audio/u1/2026/10/x.webm`,
    `${LIVE}/link-previews/../uploads/u1/x.webp`,
    "https://evil.test/link-previews/2026/07/a.webp",
    "/link-previews/2026/07/a.webp",
    null,
  ]) {
    assert.equal(linkPreviewKeyForUrl(url), null, `${url} was given a key`);
  }
});

test("the sweep reaches the bucket only through that key, and the nightly pass runs it", () => {
  const src = decomment(read("src/lib/link-preview-retention.ts"));
  assert.doesNotMatch(src, /\bdelImage\s*\(|\bkeyForUrl\s*\(/, "the preview sweep reaches the bucket some other way than linkPreviewKeyForUrl");
  assert.match(src, /const key = linkPreviewKeyForUrl\(row\.thumbUrl\);[\s\S]*delImageByKey\(key\)/);
  const sweep = balancedBody(decomment(read("src/lib/retention.ts")), "export async function runRetentionSweep") ?? "";
  assert.match(sweep, /sweepStaleLinkPreviews\(\{ keepDays: PREVIEW_KEEP_DAYS \}\)/, "the nightly sweep no longer clears stale previews");
});
