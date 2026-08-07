/* ------------------------------------------------------------------ *
 *  seedDemo(): write the demo world.
 *
 *  Shared by two callers, which is why it lives here rather than in the
 *  script that first needed it:
 *    - scripts/demo/seed-demo.ts, run by hand to build the database, and
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
import { GENERATED_PHOTOS } from "./photos.generated";
import { DEMO_USER_ID } from "@/lib/demo";

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

export async function seedDemo(
  prisma: PrismaClient,
  log: (msg: string) => void = () => {},
): Promise<SeedResult> {
  // ── 1. Clear ──
  //
  // Deleting the Users would cascade to most of this, but the order is
  // spelled out so that a failure halfway through leaves a diagnosable
  // state rather than a half-cascaded one. Cheap either way: the demo
  // database is small by construction.
  log("Clearing...");
  await prisma.pollVote.deleteMany({});
  await prisma.pollOption.deleteMany({});
  await prisma.commentLike.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.bookmark.deleteMany({});
  await prisma.photoLove.deleteMany({});
  await prisma.photo.deleteMany({});
  await prisma.post.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.catchupEntryLove.deleteMany({});
  await prisma.catchupEntry.deleteMany({});
  await prisma.catchupPrompt.deleteMany({});
  await prisma.catchupEdition.deleteMany({});
  await prisma.catchupPref.deleteMany({});
  await prisma.catchup.deleteMany({});
  await prisma.groupMember.deleteMany({});
  await prisma.groupInvite.deleteMany({});
  await prisma.group.deleteMany({});
  await prisma.userPlace.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.user.deleteMany({});

  // ── 2. People ──
  log(`Writing ${ALL_DEMO_PEOPLE.length} people...`);
  await prisma.user.createMany({
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
  await prisma.userPlace.createMany({ data: places });

  // ── 3. Posts, letters, and everything hanging off them ──
  const allPosts = [...DEMO_POSTS, ...DEMO_LETTERS];
  log(`Writing ${allPosts.length} posts and letters...`);

  await prisma.post.createMany({
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

  await prisma.like.createMany({
    data: allPosts.flatMap((p) =>
      (p.likes ?? []).map((slug) => ({
        id: `demo-like-${p.slug}-${slug}`,
        userId: uid(slug),
        postId: pid(p.slug),
      })),
    ),
  });

  await prisma.bookmark.createMany({
    data: allPosts.flatMap((p) =>
      (p.bookmarks ?? []).map((slug) => ({
        id: `demo-bm-${p.slug}-${slug}`,
        userId: uid(slug),
        postId: pid(p.slug),
        createdAt: daysAgo(p.daysAgo),
      })),
    ),
  });

  await prisma.comment.createMany({
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

  await prisma.commentLike.createMany({
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
  await prisma.pollOption.createMany({
    data: pollPosts.flatMap((p) =>
      p.poll!.options.map((text, i) => ({
        id: `demo-po-${p.slug}-${i}`,
        postId: pid(p.slug),
        text,
        position: i,
      })),
    ),
  });
  await prisma.pollVote.createMany({
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
  // The hand-written banyan framings, plus anything the owner has dropped
  // into demo-photos/ and run scripts/demo/add-photos.mjs over. Generated
  // ones come first so the newest real photographs lead the Collection.
  const allPhotos = [...GENERATED_PHOTOS, ...DEMO_PHOTOS];
  log(`Writing ${allPhotos.length} Collection photos...`);
  await prisma.photo.createMany({
    data: allPhotos.map((ph, i) => ({
      id: phid(ph.slug),
      uploaderId: uid(ph.uploader),
      url: `/images/collection/${ph.file}.webp`,
      thumbUrl: `/images/collection/${ph.file}-thumb.webp`,
      width: ph.width,
      height: ph.height,
      caption: ph.caption,
      subject: ph.subject,
      area: ph.area,
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
  await prisma.photoLove.createMany({
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
  await prisma.group.create({
    data: {
      id: "demo-group",
      name: CATCHUP_META.groupName,
      description: CATCHUP_META.intro,
      // Groups are no longer user-facing; the row survives only as the
      // membership container under a Catch-up, so it is never browseable.
      visibility: "private",
      creatorId: uid(CATCHUP_KEEPER),
      createdAt: daysAgo(120),
    },
  });
  await prisma.groupMember.createMany({
    data: CATCHUP_MEMBERS.map((slug) => ({
      id: `demo-gm-${slug}`,
      groupId: "demo-group",
      userId: uid(slug),
      // "keeper" is the role isEffectiveKeeper() reads (src/lib/catchups.ts).
      role: slug === CATCHUP_KEEPER ? "keeper" : "member",
      joinedAt: daysAgo(120),
    })),
  });

  await prisma.catchup.create({
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
      createdAt: daysAgo(120),
    },
  });

  async function writeRound(
    round: { theme: string; prompts: DemoPrompt[] },
    number: number,
    status: "published" | "answering",
    dates: {
      questionsCloseAt: Date;
      answersCloseAt: Date;
      publishAt: Date;
      publishedAt?: Date;
    },
  ) {
    await prisma.catchupEdition.create({
      data: {
        id: `demo-ed-${number}`,
        catchupId: "demo-catchup",
        number,
        theme: round.theme,
        status,
        questionsCloseAt: dates.questionsCloseAt,
        answersCloseAt: dates.answersCloseAt,
        publishAt: dates.publishAt,
        publishedAt: dates.publishedAt ?? null,
        createdAt: dates.questionsCloseAt,
      },
    });

    await prisma.catchupPrompt.createMany({
      data: round.prompts.map((prompt, i) => ({
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

    await prisma.catchupEntry.createMany({
      data: round.prompts.flatMap((prompt, i) =>
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

    await prisma.catchupEntryLove.createMany({
      data: round.prompts.flatMap((prompt, i) =>
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

  // Round 1 finished and published five weeks ago: a complete artefact to
  // read, so the feature explains itself before anyone is asked to use it.
  await writeRound(CATCHUP_ROUND_1, 1, "published", {
    questionsCloseAt: daysAgo(46),
    answersCloseAt: daysAgo(38),
    publishAt: daysAgo(37),
    publishedAt: daysAgo(37),
  });

  // Round 2 closes in four days, so the countdown reads live and there is an
  // obvious, low-stakes thing for the visitor to actually do.
  await writeRound(CATCHUP_ROUND_2, 2, "answering", {
    questionsCloseAt: daysAgo(6),
    answersCloseAt: daysAgo(-4),
    publishAt: daysAgo(-5),
  });

  // ── 6. Notifications, so the bell is not a dead control ──
  await prisma.notification.createMany({
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
        message: "Round 2 of The 2010s, loosely is open for answers until Friday",
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

  const [users, posts, comments, photos, entries] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.comment.count(),
    prisma.photo.count(),
    prisma.catchupEntry.count(),
  ]);
  return { users, posts, comments, photos, entries };
}
