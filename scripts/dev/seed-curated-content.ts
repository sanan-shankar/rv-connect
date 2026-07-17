#!/usr/bin/env node
/**
 * Seed the curated WhatsApp community stories (docs/content/whatsapp-curation/picks.json)
 * into the live feed, published under the site's Anonymous profile.
 *
 * Excludes "A Creative Artist" (the Sivarajan portrait) entirely per the owner's final-review
 * call; see docs/content/whatsapp-curation/overflow.md ("Cut at Final Review") for the note.
 * Seeds the other 11 picks. "Gerry Balcombe" is seeded with its fragmented tail trimmed (see
 * trimGerryBalcombe below). "The Big Banyan Tree Mural" attaches the 3 best of 4 candidate
 * photos (verified by eye, see MURAL_IMAGES below); the 4th (a cluttered workshop/fabrication
 * shot, not the finished Dining Hall install) is skipped.
 *
 * WRITES THROUGH THE GENERATED PRISMA CLIENT ONLY — never raw pg SQL for these inserts.
 * `Post.createdAt` is `timestamp without time zone`; rows written via raw `pg` read back
 * 5h30 (IST) skewed through the app's own Prisma read path (docs/planning/bugs.md #6). The
 * app's Prisma write+read path is self-consistent, so going through `src/generated/prisma`
 * here (like the app itself does) avoids that trap entirely.
 *
 * Env is loaded by hand (.env.local then .env, same precedence as scripts/dev/run-sql.mjs)
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

// ─── Env: load .env.local then .env into process.env, precedence matching ────
// ─── scripts/dev/run-sql.mjs, before any dynamic import touches DATABASE_URL ──

function loadEnvFile(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const file of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!(m[1] in vars)) vars[m[1]] = v;
    }
  }
  return vars;
}

const loadedEnv = loadEnvFile();
for (const [k, v] of Object.entries(loadedEnv)) {
  if (!(k in process.env)) process.env[k] = v;
}

if (!process.env.DATABASE_URL) {
  console.error("[seed-curated-content] No DATABASE_URL found in .env.local/.env. Aborting.");
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
 * Orchestrator decision #2: trim "Gerry Balcombe"'s fragmented ending. Removes the
 * "Ya... In 2016." aside, "Does anyone have a pic of him?", and the bare "Gerry Balcombe"
 * line; ends on Ansuman Nayak's stamps-and-pic line followed by wanderer's closing note.
 */
function trimGerryBalcombe(body: string): string {
  let out = body;
  out = out.replace(
    "— Sidharth Tiwari\n\nYa... In 2016.\n— Abyisheik\n\nHaha,",
    "— Sidharth Tiwari\n\nHaha,"
  );
  out = out.replace(
    "Still have many stamps and coins he gave me, and also the pic he made of me!\n— Ansuman Nayak\n\nDoes anyone have a pic of him?\n— Abyisheik\n\nGerry Balcombe 💖\n\nGerry died Nov 2014.\n— wanderer",
    "Still have many stamps and coins he gave me, and also the pic he made of me!\n— Ansuman Nayak\n\nGerry died Nov 2014.\n— wanderer"
  );
  if (out === body) {
    throw new Error("trimGerryBalcombe: expected substrings not found — source text may have changed.");
  }
  return out;
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
  tag: string | null;
  createdAt: Date;
  pick: Pick;
  bodyOverride?: (body: string) => string;
  attachMuralImages?: boolean;
};

const PIECES: SeedPiece[] = [
  {
    id: "seed-wa-what-a-small-world",
    kind: "letter",
    tag: null,
    createdAt: noonIST(2025, 9, 13),
    pick: findPick({ title: "What a Small World" }),
  },
  {
    id: "seed-wa-a-story-about-rv-and-nicobar",
    kind: "letter",
    tag: null,
    createdAt: noonIST(2025, 10, 9),
    pick: findPick({ title: "A story about RV. And Nicobar." }),
  },
  {
    id: "seed-wa-my-own-self-created-mt-kailash",
    kind: "letter",
    tag: null,
    createdAt: noonIST(2025, 12, 26),
    pick: findPick({ title: "My Own Self-Created Mt Kailash" }),
  },
  {
    id: "seed-wa-that-beautiful-walk-in-the-darkness",
    kind: "letter",
    tag: null,
    createdAt: noonIST(2026, 5, 29),
    pick: findPick({ title: "That Beautiful Walk in the Darkness" }),
  },
  {
    // json title is "" (format: post); picks.md calls this "June 12, 1966".
    id: "seed-wa-june-12-1966",
    kind: "post",
    tag: "campus-memory",
    createdAt: noonIST(2026, 6, 12),
    pick: findPick({ bodyStartsWith: "Today, June 12th, happens to be the exact date" }),
  },
  {
    // json title is "" (format: post); picks.md calls this "The Hippy Rebellion".
    id: "seed-wa-the-hippy-rebellion",
    kind: "post",
    tag: "campus-memory",
    createdAt: noonIST(2025, 11, 29),
    pick: findPick({ bodyStartsWith: 'One more "Chinna Katha" to post from my memory bank' }),
  },
  {
    // json has no title key (format: post); picks.md calls this "The Dispensary Window & the Cobra".
    id: "seed-wa-the-dispensary-window-and-the-cobra",
    kind: "post",
    tag: "campus-memory",
    createdAt: noonIST(2025, 11, 29),
    pick: findPick({ bodyStartsWith: "Mine is this: a friend (who shall remain nameless)" }),
  },
  {
    id: "seed-wa-the-banyan-tree",
    kind: "letter",
    tag: null,
    createdAt: noonIST(2025, 11, 22),
    pick: findPick({ title: "The Banyan Tree" }),
  },
  {
    // json has no title key (format: post); picks.md calls this "The Big Banyan Tree Mural".
    // sourceNote spans 07/07/2026-08/07/2026; createdAt uses the first (start) date.
    id: "seed-wa-the-big-banyan-tree-mural",
    kind: "post",
    tag: "campus-memory",
    createdAt: noonIST(2026, 7, 7),
    pick: findPick({ bodyStartsWith: "There is a mind-boggling 3D mural" }),
    attachMuralImages: true,
  },
  {
    // json title is "" (format: post); picks.md calls this "Going to Rishi Valley".
    id: "seed-wa-going-to-rishi-valley",
    kind: "post",
    tag: "campus-memory",
    createdAt: noonIST(2025, 5, 24),
    pick: findPick({ bodyStartsWith: "Going to Rishi Valley is like going home." }),
  },
  {
    id: "seed-wa-gerry-balcombe",
    kind: "letter",
    tag: null,
    createdAt: noonIST(2025, 5, 23),
    pick: findPick({ title: "Gerry Balcombe" }),
    bodyOverride: trimGerryBalcombe,
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

    const title = piece.kind === "letter" ? piece.pick.title : null;

    const created = await prisma.post.create({
      data: {
        id: piece.id,
        authorId: "anonymous",
        kind: piece.kind,
        title,
        content,
        tag: piece.tag,
        images,
        isHidden: false,
        createdAt: piece.createdAt,
        updatedAt: piece.createdAt,
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
