#!/usr/bin/env node
/**
 * Seed the curated WhatsApp community stories (docs/content/whatsapp-curation/picks.json)
 * into the live feed, published under the site's Anonymous profile.
 *
 * Excludes "A Creative Artist" (the Sivarajan portrait) entirely per the owner's final-review
 * call; see docs/content/whatsapp-curation/overflow.md ("Cut at Final Review") for the note.
 * Seeds the other 16 picks: the original 11, plus the five added on 2026-09-16 to bring the
 * letters to ten (see PIECES for the running order, which is the point of them). "Gerry
 * Balcombe" is seeded as a POST carrying only its opening memory, its twelve replies seeded
 * as comments beneath it (see gerryOpeningOnly below); "The Banyan Tree" drops the line that
 * repeated its own title. Kinds follow the 300-word line (LETTER_MIN_WORDS in src/lib/utils.ts,
 * owner 2026-09-17): five pieces seeded as letters became posts and "The Hippy Rebellion"
 * became a letter, moved in the database directly (docs/history/progress-2026-09.md). "The Big Banyan Tree Mural" attaches the 3 best of 4 candidate
 * photos (verified by eye, see MURAL_IMAGES below); the 4th (a cluttered workshop/fabrication
 * shot, not the finished Dining Hall install) is skipped.
 *
 * WRITES THROUGH THE GENERATED PRISMA CLIENT ONLY — never raw pg SQL for these inserts.
 * `Post.createdAt` is `timestamp without time zone`; rows written via raw `pg` read back
 * 5h30 (IST) skewed through the app's own Prisma read path (docs/planning/bugs.md #6). The
 * app's Prisma write+read path is self-consistent, so going through `src/generated/prisma`
 * here (like the app itself does) avoids that trap entirely.
 *
 * Env is loaded by hand (.env then .env, same precedence as scripts/dev/run-sql.mjs)
 * BEFORE any import that could construct a client or read R2 config, since this is a
 * standalone script — nothing auto-loads .env files the way Next.js does. The Prisma client
 * and the storage shim are pulled in via dynamic `import()` (not static imports, which are
 * hoisted above this file's own top-level code and would run before loadEnv()).
 *
 * Images: this DB is shared with production, so image bytes must land in Cloudflare R2, not
 * the local-dev filesystem. The mural photos are pushed through the exact same pipeline the
 * real upload route uses (src/app/api/upload/route.ts): sharp resize-to-1920-inside + WebP80,
 * then `putImage()` from src/lib/storage.ts (same bucket, same `uploads/{year}/{month}/{cuid}.webp`
 * key layout, same public URL shape). If R2 credentials are not present in env, the script
 * seeds only the text-only pieces and loudly skips the mural post rather than ever writing an
 * image URL that could 404 in production.
 *
 * Idempotent: every piece gets a deterministic id ('seed-wa-' + a slug of its title/opening
 * words). A rerun finds the existing row by id and skips it, so it's safe to run repeatedly.
 *
 * Usage (from repo root): npx tsx scripts/dev/seed-curated-content.ts
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "./_env.mjs";

loadEnv();

if (!process.env.DATABASE_URL) {
  console.error("[seed-curated-content] No DATABASE_URL found in .env. Aborting.");
  process.exit(1);
}

const HAS_R2 = !!(
  process.env.R2_ACCOUNT_ID &&
  process.env.R2_ACCESS_KEY_ID &&
  process.env.R2_SECRET_ACCESS_KEY &&
  process.env.R2_BUCKET &&
  process.env.R2_PUBLIC_BASE_URL
);

// ─── Picks source data ────────────────────────────────────────────────────────

type Pick = {
  title: string;
  body: string;
  format: "post" | "letter";
  media: string[];
  sourceNote: string;
};

const PICKS_PATH = resolve(process.cwd(), "docs/content/whatsapp-curation/picks.json");
const picks: Pick[] = JSON.parse(readFileSync(PICKS_PATH, "utf8"));

function findPick(opts: { title?: string; bodyStartsWith?: string }): Pick {
  const found = picks.find(
    (p) =>
      (opts.title !== undefined && p.title === opts.title) ||
      (opts.bodyStartsWith !== undefined && p.body.startsWith(opts.bodyStartsWith))
  );
  if (!found) {
    throw new Error(`Could not find picks.json entry for ${JSON.stringify(opts)}`);
  }
  return found;
}

/**
 * "Gerry Balcombe" is not a story with replies attached, it IS a pasted WhatsApp
 * thread: one opening memory and twelve answers, each signed with a name. Seeded
 * as a feed POST carrying the opening memory, with the twelve replies seeded as
 * comments under it (owner, 2026-09-16: "let the text be the post and then the
 * replies which will also be anonymous can just be comment ... this is the type
 * of content that we'd want to be showing as a post instead of a letter").
 *
 * The signatures go with them. Every other piece here is published unsigned under
 * the Anonymous account, and a signed line under an anonymous byline reads as a
 * contradiction rather than as attribution.
 */
function gerryOpeningOnly(body: string): string {
  const END = "It was fun.";
  const at = body.indexOf(END);
  if (at < 0) {
    throw new Error("gerryOpeningOnly: opening memory not found; source text may have changed.");
  }
  // The "Btw..." opener referred to a message above it in a chat that is not here.
  return body.slice(0, at + END.length).replace(/^Btw\.\.\.\s*/, "");
}

/** The twelve replies, in thread order, verbatim but for their stripped signatures. */
const GERRY_REPLIES: string[] = [
  "Jerry and Maureen Balcombe! He was an amazing artist! His watercolors are still up in the staff room.",
  "I never saw him painting... He was already in his 60s when I met him the first time in 1999.",
  "But he was so athletic... we were shocked.",
  "Really? We all used to get our portraits done every time he came!",
  "Ohhh ya... He used to draw our faces in cartoon shapes... It was so funny... He used to sign underneath it.",
  "Thanks for that... Memories which I forgot are coming back to me.",
  "And he used to make us sing songs during junior school assemblies...\n\nBluenose, the ocean knows her name\nSailors know how proud a ship was she\nBluenose, leading in the wind\nRacing ev'ry way on the sea",
  "Gerry passed a few years ago I believe. He was awesome.",
  "From Canada. A lovely painter, story teller, guitarist cum singer, and footballer. He visited junior houses on a turn basis, generally just before or after dinner.",
  "Haha, I used to also write to him so I could collect UK stamps. I think I still have those letters somewhere at my parents' place. I was recently in the village of Balcombe in the UK and was thinking about him. \u{1F60A}",
  "Still have many stamps and coins he gave me, and also the pic he made of me!",
  "Gerry died Nov 2014.",
];

/**
 * "The Banyan Tree" opened by repeating its own title, which the reading page
 * already prints above it in 40px (owner, 2026-09-16: "that's in the title
 * anyway so we don't have to say that").
 */
function dropBanyanTitleLine(body: string): string {
  const PREFIX = "The Banyan Tree\n\n";
  if (!body.startsWith(PREFIX)) {
    throw new Error("dropBanyanTitleLine: body no longer opens with its title.");
  }
  return body.slice(PREFIX.length);
}

/** Noon IST as a JS Date (IST = UTC+5:30, no DST), so the calendar date reads the same
 *  regardless of whether it's later interpreted as IST or UTC (see file header re: bug #6). */
function noonIST(year: number, month1to12: number, day: number): Date {
  return new Date(Date.UTC(year, month1to12 - 1, day, 6, 30, 0));
}

// The 4 candidate mural photos, verified by reading each with the Read tool before writing
// this script. Best 3 attached (sharp, well-framed, show the finished Dining Hall install);
// the workshop/fabrication shot is skipped (cluttered background, not the described install).
const MURAL_DIR = "WhatsApp/WhatsApp Chat - RVS Alumni";
const MURAL_IMAGES = [
  // Straight-on hero shot: symmetric framing, clean lit wall, no obstruction.
  `${MURAL_DIR}/00008510-PHOTO-2026-07-08-13-21-34.jpg`,
  // Full wide shot from a slight angle; a hand reaches in at the edge but the piece reads
  // clearly and it usefully shows scale.
  `${MURAL_DIR}/00008454-PHOTO-2026-07-07-21-05-20.jpg`,
  // Macro detail: painted ants, chameleon, butterflies on the bark — backs up the post's
  // "the details are stunning" line.
  `${MURAL_DIR}/00008458-PHOTO-2026-07-07-21-06-12.jpg`,
];
// Skipped: 00008512-PHOTO-2026-07-08-13-21-35.jpg — workshop/fabrication backdrop (bricks,
// a cluttered tool table, cardboard box), not the finished Dining Hall installation.

type SeedPiece = {
  id: string;
  kind: "post" | "letter";
  createdAt: Date;
  pick: Pick;
  bodyOverride?: (body: string) => string;
  /** A letter whose pick has no title of its own. */
  title?: string;
  attachMuralImages?: boolean;
  /** Seeded as comments under the piece, by the same Anonymous account. */
  comments?: string[];
};

/* ─── The running order ──────────────────────────────────────────────────────
 * Both surfaces that show these sort newest-first, so `createdAt` IS the reading
 * order: the letters index lists them in it, the feed interleaves the posts
 * through it. The owner asked (2026-09-16) that the order be designed for
 * somebody who sits down and reads all ten in one go, so these dates are chosen
 * rather than inherited from when each was posted to WhatsApp.
 *
 * That order was built for ten letters. On 2026-09-17 the owner drew the line
 * between the two at 300 words, which took the four short letters and the
 * Banyan Tree down to posts and brought the Hippy Rebellion up, so six remain:
 *
 *    1  Plucked Out of Coorg
 *    2  That Beautiful Walk in the Darkness
 *    3  My Own Self-Created Mt Kailash
 *    4  The Last Event of the Day
 *    5  The Hippy Rebellion
 *    6  What a Small World              still the closer
 *
 * The dates were left as they were, so 3 and 4 are now two 5k+ pieces side by
 * side, which the original order had ruled out. The mural post keeps the top
 * of the anonymous pile (owner: "let the mural post on feed not be pushed
 * down"). Nothing here is dated later than the real members' posts of Aug 2026.
 * ─────────────────────────────────────────────────────────────────────────── */
const PIECES: SeedPiece[] = [
  // The mural keeps the top of the pile.
  {
    // json has no title key (format: post); picks.md calls this "The Big Banyan Tree Mural".
    // sourceNote spans 07/07/2026-08/07/2026; createdAt uses the first (start) date.
    id: "seed-wa-the-big-banyan-tree-mural",
    kind: "post",
    createdAt: noonIST(2026, 7, 7),
    pick: findPick({ bodyStartsWith: "There is a mind-boggling 3D mural" }),
    attachMuralImages: true,
  },

  {
    id: "seed-wa-a-story-about-rv-and-nicobar",
    kind: "post",
    createdAt: noonIST(2026, 6, 28),
    pick: findPick({ title: "A story about RV. And Nicobar." }),
  },
  {
    id: "seed-wa-plucked-out-of-coorg",
    kind: "letter",
    createdAt: noonIST(2026, 6, 14),
    pick: findPick({ title: "Plucked Out of Coorg" }),
  },
  {
    // json title is "" (format: post); picks.md calls this "June 12, 1966".
    // Left on its own anniversary: the piece is about this exact date.
    id: "seed-wa-june-12-1966",
    kind: "post",
    createdAt: noonIST(2026, 6, 12),
    pick: findPick({ bodyStartsWith: "Today, June 12th, happens to be the exact date" }),
  },
  {
    id: "seed-wa-after-the-flash-flood",
    kind: "post",
    createdAt: noonIST(2026, 5, 30),
    pick: findPick({ title: "After the Flash Flood" }),
  },
  {
    id: "seed-wa-that-beautiful-walk-in-the-darkness",
    kind: "letter",
    createdAt: noonIST(2026, 5, 11),
    pick: findPick({ title: "That Beautiful Walk in the Darkness" }),
  },
  {
    id: "seed-wa-the-banyan-tree",
    kind: "post",
    createdAt: noonIST(2026, 4, 19),
    pick: findPick({ title: "The Banyan Tree" }),
    bodyOverride: dropBanyanTitleLine,
  },
  {
    // json has no title key (format: post); picks.md calls this "The Dispensary Window & the Cobra".
    id: "seed-wa-the-dispensary-window-and-the-cobra",
    kind: "post",
    createdAt: noonIST(2026, 4, 5),
    pick: findPick({ bodyStartsWith: "Mine is this: a friend (who shall remain nameless)" }),
  },
  {
    id: "seed-wa-my-own-self-created-mt-kailash",
    kind: "letter",
    createdAt: noonIST(2026, 3, 28),
    pick: findPick({ title: "My Own Self-Created Mt Kailash" }),
  },
  {
    id: "seed-wa-gerry-balcombe",
    kind: "post",
    createdAt: noonIST(2026, 3, 15),
    pick: findPick({ title: "Gerry Balcombe" }),
    bodyOverride: gerryOpeningOnly,
    comments: GERRY_REPLIES,
  },
  {
    id: "seed-wa-school-sick",
    kind: "post",
    createdAt: noonIST(2026, 3, 7),
    pick: findPick({ title: "School Sick" }),
  },
  {
    id: "seed-wa-the-last-event-of-the-day",
    kind: "letter",
    createdAt: noonIST(2026, 2, 15),
    pick: findPick({ title: "The Last Event of the Day" }),
  },
  {
    id: "seed-wa-best-of-five",
    kind: "post",
    createdAt: noonIST(2026, 1, 24),
    pick: findPick({ title: "Best of Five" }),
  },
  {
    // json title is "" (format: post); picks.md calls this "The Hippy Rebellion".
    id: "seed-wa-the-hippy-rebellion",
    kind: "letter",
    title: "The Hippy Rebellion",
    createdAt: noonIST(2026, 1, 10),
    pick: findPick({ bodyStartsWith: 'One more "Chinna Katha" to post from my memory bank' }),
  },
  {
    id: "seed-wa-what-a-small-world",
    kind: "letter",
    createdAt: noonIST(2025, 12, 20),
    pick: findPick({ title: "What a Small World" }),
  },
  {
    // json title is "" (format: post); picks.md calls this "Going to Rishi Valley".
    // The quiet tail of the whole pile.
    id: "seed-wa-going-to-rishi-valley",
    kind: "post",
    createdAt: noonIST(2025, 11, 30),
    pick: findPick({ bodyStartsWith: "Going to Rishi Valley is like going home." }),
  },
];
// Deliberately excluded: "A Creative Artist" (Harshad Parekh's Sivarajan portrait) — cut at
// final review per the owner's call. See docs/content/whatsapp-curation/overflow.md.

// ─── Main ──────────────────────────────────────────────────────────────────

async function uploadMuralImages(): Promise<string[]> {
  const { putImage } = await import("@/lib/storage");
  const sharp = (await import("sharp")).default;
  const { createId } = await import("@paralleldrive/cuid2");

  const urls: string[] = [];
  for (const relPath of MURAL_IMAGES) {
    const abs = resolve(process.cwd(), relPath);
    if (!existsSync(abs)) {
      throw new Error(`Mural image not found on disk: ${abs}`);
    }
    const buffer = readFileSync(abs);
    // Same pipeline as src/app/api/upload/route.ts: resize-inside 1920x1920, WebP quality 80.
    const webpBuffer = await sharp(buffer)
      .resize(1920, 1920, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const id = createId();
    // Same subdir/key scheme as the real upload route: "uploads/{year}/{month}/{cuid}.webp".
    const url = await putImage(webpBuffer, "uploads", `${id}.webp`);
    urls.push(url);
    console.log(`  uploaded mural image -> ${url}`);
  }
  return urls;
}

async function main() {
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
  });

  console.log(`[seed-curated-content] R2 configured: ${HAS_R2 ? "yes" : "NO (mural post will be skipped)"}`);

  const anon = await prisma.user.findUnique({ where: { id: "anonymous" } });
  if (!anon) {
    throw new Error(
      'No User with id "anonymous" found. This script expects the Anonymous profile ' +
        "(email anonymous@rishivalley.space) to already exist."
    );
  }
  console.log(`[seed-curated-content] Anonymous user found: ${anon.name} <${anon.email}> (birdOverride=${anon.birdOverride})`);

  let muralUrls: string[] | null = null;

  const seeded: { id: string; title: string | null; kind: string; createdAt: Date }[] = [];
  const skippedExisting: string[] = [];
  const skippedNoR2: string[] = [];

  for (const piece of PIECES) {
    if (piece.attachMuralImages && !HAS_R2) {
      console.warn(
        `\n[seed-curated-content] *** SKIPPING "${piece.pick.title || piece.id}" — R2 credentials are not ` +
          "available in env, and this DB is shared with production. Refusing to write image URLs " +
          "that could 404. Seeding text-only pieces only. ***\n"
      );
      skippedNoR2.push(piece.id);
      continue;
    }

    const existing = await prisma.post.findUnique({ where: { id: piece.id }, select: { id: true } });
    if (existing) {
      console.log(`[seed-curated-content] SKIP (already exists): ${piece.id}`);
      skippedExisting.push(piece.id);
      continue;
    }

    let content = piece.pick.body;
    if (piece.bodyOverride) content = piece.bodyOverride(content);

    let images: string | null = null;
    if (piece.attachMuralImages) {
      if (!muralUrls) muralUrls = await uploadMuralImages();
      images = JSON.stringify(muralUrls);
    }

    const title = piece.kind === "letter" ? (piece.title ?? piece.pick.title) : null;

    const created = await prisma.post.create({
      data: {
        id: piece.id,
        authorId: "anonymous",
        kind: piece.kind,
        title,
        content,
        images,
        isHidden: false,
        createdAt: piece.createdAt,
        updatedAt: piece.createdAt,
        ...(piece.comments?.length
          ? {
              comments: {
                create: piece.comments.map((content, i) => ({
                  id: `${piece.id}-c${String(i + 1).padStart(2, "0")}`,
                  content,
                  authorId: "anonymous",
                  // Six minutes apart, the cadence a thread like this actually had.
                  createdAt: new Date(piece.createdAt.getTime() + (i + 1) * 6 * 60_000),
                })),
              },
            }
          : {}),
      },
      select: { id: true, title: true, kind: true, createdAt: true },
    });

    console.log(
      `[seed-curated-content] SEEDED ${created.kind.toUpperCase()} "${created.title ?? piece.pick.title}" ` +
        `(id=${created.id}, createdAt=${created.createdAt.toISOString()})`
    );
    seeded.push(created);
  }

  // ─── Verify end-to-end: read back counts ───────────────────────────────────
  const totalAnon = await prisma.post.count({ where: { authorId: "anonymous" } });
  const totalLetters = await prisma.post.count({ where: { authorId: "anonymous", kind: "letter" } });
  const totalPosts = await prisma.post.count({ where: { authorId: "anonymous", kind: "post" } });
  const muralRow = await prisma.post.findUnique({
    where: { id: "seed-wa-the-big-banyan-tree-mural" },
    select: { images: true },
  });

  // ─── Read-only lookups for the birds task (Veda / Srihari / Vihan Shah) ────
  const nameLookups = await prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: "Veda", mode: "insensitive" } },
        { name: { contains: "Srihari", mode: "insensitive" } },
        { name: { contains: "Vihan", mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, email: true },
  });

  console.log("\n" + "=".repeat(70));
  console.log(`[seed-curated-content] Seeded this run: ${seeded.length}`);
  for (const s of seeded) {
    console.log(`  - ${s.kind.padEnd(6)} ${s.id.padEnd(48)} ${s.createdAt.toISOString().slice(0, 10)}`);
  }
  console.log(`[seed-curated-content] Skipped (already existed): ${skippedExisting.length} ${skippedExisting.join(", ")}`);
  console.log(`[seed-curated-content] Skipped (no R2 creds): ${skippedNoR2.length} ${skippedNoR2.join(", ")}`);
  console.log(`[seed-curated-content] Total Anonymous posts in DB now: ${totalAnon} (letters=${totalLetters}, posts=${totalPosts})`);
  if (muralRow) {
    console.log(`[seed-curated-content] Mural post images (from DB): ${muralRow.images}`);
  }
  console.log(`[seed-curated-content] Name lookups for the birds task:`);
  for (const u of nameLookups) {
    console.log(`  - ${u.name} <${u.email}> id=${u.id}`);
  }
  console.log("=".repeat(70));

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[seed-curated-content] FATAL:", err);
  process.exitCode = 1;
});
