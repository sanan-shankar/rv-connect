/* ------------------------------------------------------------------ *
 *  seedDemo(): write the demo world.
 *
 *  Shared by two callers, which is why it lives here rather than in the
 *  script that first needed it:
 *    - scripts/demo/seed-demo.mts, run by hand to build the database, and
 *    - POST /api/demo/reset, run nightly by cron and by the "Reset the
 *      demo" button in the demo bar.
 *
 *  It is a FULL rewrite, not a repair: everything is deleted and written
 *  again from the data files. That is the only version of reset whose
 *  correctness is obvious. A cleverer one that swept "rows a visitor
 *  made" would have to know, for every table, what the seeded state was
 *  and what a visitor is allowed to have changed about it, and it would
 *  be wrong the first time somebody unhearted a seeded post. A rewrite
 *  cannot drift.
 *
 *  Every row gets a deterministic `demo-` id. Nothing here relies on
 *  that any more, now that reset is a full rewrite, but it makes the
 *  database legible when something goes wrong: any cuid in the demo
 *  database was made by a visitor.
 * ------------------------------------------------------------------ */

import type { PrismaClient } from "@/generated/prisma/client";
import { CITY_COORDS } from "@/lib/city-coords";
import { pictureFor } from "@/lib/catchup-pictures";
import { sourceOf, tagsOf, withParents } from "@/lib/profession-tags";
import { ALL_DEMO_PEOPLE, type DemoPerson } from "./people";
import {
  CATCHUP_KEEPER,
  CATCHUP_MEMBERS,
  CATCHUP_META,
  CATCHUP_ROUND_1,
  CATCHUP_ROUND_2,
  DEMO_LETTERS,
  DEMO_PHOTOS,
  DEMO_POSTS,
  type DemoPrompt,
} from "./content";
import { DEMO_PLACES } from "./places";
import { DEMO_USER_ID } from "@/lib/demo";
import { VALLEY_TIME_ZONE } from "@/lib/utils";

const uid = (slug: string) => (slug === "visitor" ? DEMO_USER_ID : `demo-u-${slug}`);
const pid = (slug: string) => `demo-post-${slug}`;
const phid = (slug: string) => `demo-photo-${slug}`;

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);
const hoursAfter = (base: Date, h: number) => new Date(base.getTime() + h * 36e5);

function housesJson(person: DemoPerson): string | null {
  if (!person.houses?.length || !person.yearJoined) return null;
  const start = person.yearJoined;
  return JSON.stringify(person.houses.map((house, i) => ({ year: start + i, house })));
}

export interface SeedResult {
  users: number;
  posts: number;
  comments: number;
  photos: number;
  entries: number;
}

/**
 * How long the reset's write phase may run before Postgres gives up and
 * rolls the whole thing back. Prisma's own default (5s) is sized for a
 * request-path transaction, not a ~40-statement rewrite of a whole
 * database, and undershooting here would abort a perfectly healthy reset
 * from a slower connection -- the hand-run `seed-demo.mts` script, a cold
 * pooler connection -- which is a worse outcome than the one this is fixing.
 * The nightly cron and the button in the demo bar are the only two callers,
 * so there is no request-latency budget this is competing with.
 */
const SEED_TRANSACTION_TIMEOUT_MS = 30_000;

export async function seedDemo(
  prisma: PrismaClient,
  log: (msg: string) => void = () => {},
): Promise<SeedResult> {
  // The whole rewrite runs as ONE Postgres transaction (bug audit M61).
  // It used to be ~40 independent statements, so a request landing mid-reset
  // could see the world half gone -- worst of all the User table cleared but
  // not yet rewritten, because that row is also the demo persona's identity:
  // losing it mid-request makes auth() return null for every concurrent page,
  // which sends the visitor to /login, a page with no way back in for them
  // (no password, no signup route, no /api/auth) in demo mode. Postgres never
  // shows an uncommitted write to another connection, so wrapping this in one
  // transaction means a concurrent reader sees the fully-old world or the
  // fully-new one and nothing in between, and a failure partway through rolls
  // back to the old world intact instead of leaving whichever statement got
  // furthest sitting there until the next successful reset.
  await prisma.$transaction(async (tx) => {
    // ── 1. Clear ──
    //
    // Deleting the Users would cascade to most of this, but the order is
    // spelled out for the foreign-key dependency graph (children before the
    // parents they reference), not to survive a failure -- a failure now
    // rolls the whole transaction back to the old world, so there is nothing
    // left mid-cascade to diagnose. Cheap either way: the demo database is
    // small by construction.
    log("Clearing...");
    await tx.pollVote.deleteMany({});
    await tx.pollOption.deleteMany({});
    await tx.commentLike.deleteMany({});
    await tx.comment.deleteMany({});
    await tx.like.deleteMany({});
    await tx.bookmark.deleteMany({});
    await tx.photoLove.deleteMany({});
    await tx.photo.deleteMany({});
    await tx.post.deleteMany({});
    await tx.notification.deleteMany({});
    await tx.catchupEntryLove.deleteMany({});
    await tx.catchupEntry.deleteMany({});
    await tx.catchupPrompt.deleteMany({});
    await tx.catchupEdition.deleteMany({});
    await tx.catchupPref.deleteMany({});
    await tx.catchup.deleteMany({});
    await tx.groupMember.deleteMany({});
    await tx.group.deleteMany({});
    await tx.userPlace.deleteMany({});
    // The gazetteer slice (see places.ts). Nothing sets a UserPlace.placeId
    // in this seed, so no foreign key ever points at these rows -- they can
    // be cleared and rewritten in any order relative to UserPlace above.
    await tx.place.deleteMany({});
    await tx.user.deleteMany({});

    // ── 2. People ──
    log(`Writing ${ALL_DEMO_PEOPLE.length} people...`);
    await tx.user.createMany({
      data: ALL_DEMO_PEOPLE.map((p) => {
        const faculty = p.accountType === "teacher" || p.accountType === "ex_teacher";
        return {
          id: uid(p.slug),
          name: p.name,
          // RFC 2606 reserves `.invalid` so it can never resolve. Nothing in
          // this database can be mistaken for a way to reach a real person.
          email: `${p.slug}@demo.invalid`,
          // No password hash at all: the demo deployment has no login (see
          // src/lib/auth.ts), so a credential would be liability with no use.
          password: null,
          emailVerified: new Date(),
          accountType: p.accountType ?? "alumnus",
          batchType: faculty ? null : (p.batchType ?? null),
          batchYear: faculty ? null : (p.batchYear ?? null),
          yearJoined: p.yearJoined ?? null,
          yearLeft: faculty ? null : (p.batchYear ?? null),
          gradeJoined: p.gradeJoined ?? null,
          taughtFrom: p.taughtFrom ?? null,
          taughtUntil: p.taughtUntil ?? null,
          subjects: p.subjects ?? null,
          currentCity: p.city,
          secondaryCity: p.secondCity ?? null,
          jobTitle: p.jobTitle ?? null,
          workplace: p.workplace ?? null,
          /* Authored here rather than left for the tagging pass. The demo is
             the public, no-login showcase and its Profession filter hides
             itself when no tag clears TAG_FLOOR, so an untagged seed would
             show a directory with the control missing. `withParents` for the
             same reason the applier calls it -- the seed must not be the one
             place a child tag arrives without its parent. */
          professionTags: withParents(tagsOf(p.professionTags ?? [])),
          professionTagSource: sourceOf(p.jobTitle ?? null, p.workplace ?? null),
          bio: p.bio ?? null,
          about: p.about ?? null,
          houses: housesJson(p),
          // Everyone is verified. The demo is not a moderation exhibit, and an
          // "unverified" badge on an invented person only raises a question the
          // visitor has no way to answer.
          verifyState: "verified",
          verifiedAt: new Date(),
          verifyMethod: "office_list",
          role: "member",
        };
      }),
    });

    // Cities, so the directory map has pins to cluster.
    const places: {
      id: string;
      userId: string;
      label: string;
      city: string;
      lat: number | null;
      lng: number | null;
      position: number;
    }[] = [];
    for (const p of ALL_DEMO_PEOPLE) {
      const cities = [p.city, p.secondCity].filter(Boolean) as string[];
      cities.forEach((city, i) => {
        const coords = CITY_COORDS[city];
        const label = city.replace(/\b\w/g, (c) => c.toUpperCase());
        places.push({
          id: `demo-place-${p.slug}-${i}`,
          userId: uid(p.slug),
          label,
          city: label,
          lng: coords?.[0] ?? null,
          lat: coords?.[1] ?? null,
          position: i,
        });
      });
    }
    await tx.userPlace.createMany({ data: places });

    // A small slice of the real Place gazetteer (bug audit M64), so the
    // "Where you are" editor's city search returns real matches instead of
    // the free-text fallback it silently falls back to on a miss. See
    // places.ts for why this is a hand-picked 29 rather than the real
    // 234,934-row import.
    log(`Writing ${DEMO_PLACES.length} places...`);
    await tx.place.createMany({
      data: DEMO_PLACES.map((p) => ({ ...p, asciiName: p.name })),
    });

    // ── 3. Posts, letters, and everything hanging off them ──
    const allPosts = [...DEMO_POSTS, ...DEMO_LETTERS];
    log(`Writing ${allPosts.length} posts and letters...`);

    await tx.post.createMany({
      data: allPosts.map((p) => {
        const createdAt = daysAgo(p.daysAgo);
        return {
          id: pid(p.slug),
          authorId: uid(p.author),
          kind: p.kind ?? "post",
          title: p.title ?? null,
          content: p.content,
          images: p.images?.length ? JSON.stringify(p.images) : null,
          status: "published",
          createdAt,
          updatedAt: createdAt,
        };
      }),
    });

    await tx.like.createMany({
      data: allPosts.flatMap((p) =>
        (p.likes ?? []).map((slug) => ({
          id: `demo-like-${p.slug}-${slug}`,
          userId: uid(slug),
          postId: pid(p.slug),
        })),
      ),
    });

    await tx.bookmark.createMany({
      data: allPosts.flatMap((p) =>
        (p.bookmarks ?? []).map((slug) => ({
          id: `demo-bm-${p.slug}-${slug}`,
          userId: uid(slug),
          postId: pid(p.slug),
          createdAt: daysAgo(p.daysAgo),
        })),
      ),
    });

    await tx.comment.createMany({
      data: allPosts.flatMap((p) =>
        (p.comments ?? []).map((c, i) => ({
          id: `demo-c-${p.slug}-${i}`,
          postId: pid(p.slug),
          authorId: uid(c.author),
          content: c.text,
          createdAt: hoursAfter(daysAgo(p.daysAgo), c.hoursAfter),
        })),
      ),
    });

    await tx.commentLike.createMany({
      data: allPosts.flatMap((p) =>
        (p.comments ?? []).flatMap((c, i) =>
          (c.likes ?? []).map((slug) => ({
            id: `demo-cl-${p.slug}-${i}-${slug}`,
            userId: uid(slug),
            commentId: `demo-c-${p.slug}-${i}`,
          })),
        ),
      ),
    });

    const pollPosts = allPosts.filter((p) => p.poll);
    await tx.pollOption.createMany({
      data: pollPosts.flatMap((p) =>
        p.poll!.options.map((text, i) => ({
          id: `demo-po-${p.slug}-${i}`,
          postId: pid(p.slug),
          text,
          position: i,
        })),
      ),
    });
    await tx.pollVote.createMany({
      data: pollPosts.flatMap((p) =>
        p.poll!.options.flatMap((text, i) =>
          (p.poll!.votes[text] ?? []).map((slug) => ({
            id: `demo-pv-${p.slug}-${i}-${slug}`,
            pollOptionId: `demo-po-${p.slug}-${i}`,
            userId: uid(slug),
            postId: pid(p.slug),
          })),
        ),
      ),
    });

    // ── 4. The Collection ──
    //
    // Served straight out of /public. The demo owns no bucket and needs none,
    // which is precisely why it can afford to refuse every upload.
    /* The hand-written banyan framings. There used to be a second source
       here -- `photos.generated.ts`, written by `scripts/demo/add-photos.mjs`
       from a `demo-photos/` folder at the repo root -- merged ahead of these.
       It never produced a photograph: the generated file was an empty array
       for its whole life, its one commit being the day it was created, and
       its documented working folder broke the closed-root rule. Deleted
       2026-09-08 on the owner's word ("2 delete it"). */
    const allPhotos = DEMO_PHOTOS;
    log(`Writing ${allPhotos.length} Collection photos...`);
    await tx.photo.createMany({
      data: allPhotos.map((ph, i) => ({
        id: phid(ph.slug),
        uploaderId: uid(ph.uploader),
        url: `/images/collection/${ph.file}.webp`,
        thumbUrl: `/images/collection/${ph.file}-thumb.webp`,
        width: ph.width,
        height: ph.height,
        caption: ph.caption,
        subject: ph.subject,
        era: ph.era,
        photoYear: ph.photoYear ?? null,
        photoMonth: ph.photoMonth ?? null,
        datePrecision: ph.datePrecision,
        approved: true,
        approvedAt: new Date(),
        approvedById: uid(ph.uploader),
        createdAt: daysAgo(18 + i),
      })),
    });
    await tx.photoLove.createMany({
      data: allPhotos.flatMap((ph) =>
        ph.loves.map((slug) => ({
          id: `demo-pl-${ph.slug}-${slug}`,
          userId: uid(slug),
          photoId: phid(ph.slug),
        })),
      ),
    });

    // ── 5. The Catch-up ──
    log("Writing the Catch-up...");
    await tx.group.create({
      data: {
        id: "demo-group",
        name: CATCHUP_META.groupName,
        creatorId: uid(CATCHUP_KEEPER),
        createdAt: daysAgo(120),
      },
    });
    await tx.groupMember.createMany({
      data: CATCHUP_MEMBERS.map((slug) => ({
        id: `demo-gm-${slug}`,
        groupId: "demo-group",
        userId: uid(slug),
        // "keeper" is the role isEffectiveKeeper() reads (src/lib/catchups.ts).
        role: slug === CATCHUP_KEEPER ? "keeper" : "member",
        joinedAt: daysAgo(120),
      })),
    });

    const demoPicture = pictureFor("demo-catchup");
    await tx.catchup.create({
      data: {
        id: "demo-catchup",
        groupId: "demo-group",
        createdById: uid(CATCHUP_KEEPER),
        title: CATCHUP_META.title,
        intro: CATCHUP_META.intro,
        cadence: CATCHUP_META.cadence,
        status: "active",
        // A bearer token in a database of invented people protecting a page
        // that shows a name and a member count. Named so nobody mistakes it
        // for a secret worth rotating.
        inviteToken: "demo-invite-token-not-a-secret",
        nextOpensAt: daysAgo(-20),
        // Every Catch-up has a photograph from the day it is made (spec 3.4),
        // including this one -- the demo is where most people meet the
        // feature. Picked off the id so a re-seed lands on the same one.
        pictureSrc: demoPicture.src,
        pictureFocus: demoPicture.focus,
        createdAt: daysAgo(120),
      },
    });

    async function writeEdition(
      edition: { theme: string; prompts: DemoPrompt[] },
      number: number,
      status: "published" | "answering",
      dates: {
        questionsCloseAt: Date;
        answersCloseAt: Date;
        publishedAt?: Date;
      },
    ) {
      await tx.catchupEdition.create({
        data: {
          id: `demo-ed-${number}`,
          catchupId: "demo-catchup",
          number,
          theme: edition.theme,
          status,
          questionsCloseAt: dates.questionsCloseAt,
          answersCloseAt: dates.answersCloseAt,
          publishedAt: dates.publishedAt ?? null,
          createdAt: dates.questionsCloseAt,
        },
      });

      await tx.catchupPrompt.createMany({
        data: edition.prompts.map((prompt, i) => ({
          id: `demo-pr-${number}-${i}`,
          editionId: `demo-ed-${number}`,
          authorId: uid(prompt.askedBy),
          text: prompt.text,
          category: prompt.category ?? null,
          source: "member",
          showAsker: prompt.showAsker ?? true,
          accepted: true,
          position: i,
          createdAt: dates.questionsCloseAt,
        })),
      });

      await tx.catchupEntry.createMany({
        data: edition.prompts.flatMap((prompt, i) =>
          prompt.entries.map((entry, j) => {
            const at = hoursAfter(dates.questionsCloseAt, 24 + j * 7);
            return {
              id: `demo-en-${number}-${i}-${j}`,
              editionId: `demo-ed-${number}`,
              promptId: `demo-pr-${number}-${i}`,
              authorId: uid(entry.author),
              body: entry.body,
              createdAt: at,
              updatedAt: at,
            };
          }),
        ),
      });

      await tx.catchupEntryLove.createMany({
        data: edition.prompts.flatMap((prompt, i) =>
          prompt.entries.flatMap((entry, j) =>
            (entry.loves ?? []).map((slug) => ({
              id: `demo-el-${number}-${i}-${j}-${slug}`,
              userId: uid(slug),
              entryId: `demo-en-${number}-${i}-${j}`,
            })),
          ),
        ),
      });
    }

    // Edition 1 finished and published five weeks ago: a complete artefact to
    // read, so the feature explains itself before anyone is asked to use it.
    await writeEdition(CATCHUP_ROUND_1, 1, "published", {
      questionsCloseAt: daysAgo(46),
      answersCloseAt: daysAgo(38),
      publishedAt: daysAgo(37),
    });

    // Edition 2 closes in four days, so the countdown reads live and there is an
    // obvious, low-stakes thing for the visitor to actually do. Held in one
    // variable (not called twice) so the notification below can name the
    // exact day this reset actually set, rather than drifting from it.
    const edition2AnswersCloseAt = daysAgo(-4);
    await writeEdition(CATCHUP_ROUND_2, 2, "answering", {
      questionsCloseAt: daysAgo(6),
      answersCloseAt: edition2AnswersCloseAt,
    });

    // ── 6. Notifications, so the bell is not a dead control ──
    await tx.notification.createMany({
      data: [
        {
          type: "like",
          message: "Gita Raman and 4 others loved your answer in The 2010s, loosely",
          link: "/catchups/demo-catchup",
          read: false,
          days: 0.2,
        },
        {
          type: "comment",
          message: "Shreya Joshi answered a question in The 2010s, loosely",
          link: "/catchups/demo-catchup",
          read: false,
          days: 1.1,
        },
        {
          type: "admin",
          // The real deadline is always reset-time + 4 days (see
          // edition2AnswersCloseAt above), which lands on a different weekday
          // depending on when the reset ran. A hard-coded "Friday" was
          // wrong six days out of seven (bug audit Low 68).
          message: `Edition 2 of ${CATCHUP_META.title} is open for answers until ${edition2AnswersCloseAt.toLocaleDateString("en-US", { weekday: "long", timeZone: VALLEY_TIME_ZONE })}`,
          link: "/catchups/demo-catchup",
          read: false,
          days: 2.4,
        },
        {
          type: "like",
          message: "Vikram Desai loved a photo you saved to the Collection",
          link: "/collection",
          read: true,
          days: 6,
        },
      ].map((n, i) => ({
        id: `demo-notif-${i}`,
        userId: DEMO_USER_ID,
        type: n.type,
        message: n.message,
        link: n.link,
        read: n.read,
        createdAt: daysAgo(n.days),
      })),
    });
  }, {
    timeout: SEED_TRANSACTION_TIMEOUT_MS,
    /* maxWait is how long to sit waiting for a POOL connection before giving
       up, and Prisma's default is 2s. The pool here is `max: 5` (see
       src/lib/prisma.ts), so a reset firing while a few visitors are mid-page
       could time out before it ever started -- and the failure would look
       identical to the transaction itself being too slow, which is a
       different problem with a different fix. Ten seconds, because the reset
       is a nightly job with nobody waiting on it, and giving up on a free
       connection is the one delay here that costs nothing. */
    maxWait: 10_000,
  });

  const [users, posts, comments, photos, entries] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.photo.count(),
    prisma.catchupEntry.count(),
  ]);
  return { users, posts, comments, photos, entries };
}
