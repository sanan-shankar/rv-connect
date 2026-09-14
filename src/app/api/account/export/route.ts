import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";

/**
 * The member's own data, as one downloadable JSON file (audit M35, GDPR
 * Art. 20). Reached from the quiet "Download your data" link in settings.
 *
 * Strictly self-service: the session decides WHOSE data, and no parameter
 * exists to ask for anyone else's. The file carries what the person gave the
 * site or wrote on it — profile, cities, posts, comments, likes, Collection
 * photographs, Catch-up answers, messages to the admin, reports they filed,
 * contribution records — and none of the operational columns (password hash,
 * credential epoch, admin notes) that are about the account rather than the
 * person. Deleted comments are rows kept only as thread structure with the
 * content already blanked, so they are excluded rather than exported as
 * fifteen identical "[deleted]" stubs.
 *
 * STREAMED, a page at a time (audit M48). It used to run ten unbounded
 * findMany calls in parallel, hold every row in memory at once and then
 * `JSON.stringify` the lot into a single pretty-printed string — so a member
 * with years of writing needed the whole history resident twice over (rows,
 * then the string) inside one serverless invocation, and the response had to
 * be materialised before a single byte could be sent. Capping the queries was
 * not an option: an export that silently omits half a person's data is worse
 * than a slow one, and this is the request the law says must be complete. So
 * neither end holds it all: each table is walked in id order in pages, and each
 * row is written out and dropped.
 */

/** Rows per query while walking a table. Big enough that an ordinary member is
 *  one round trip, small enough that no page is a memory problem. */
const PAGE = 500;

/**
 * Walk one table in id order, yielding rows and never holding more than a page.
 *
 * Keyset on the primary key rather than `skip`, because an offset walk re-scans
 * everything it has already passed — and because a row written while the export
 * runs must not shift the window and make a row appear twice.
 */
async function* paged<T extends { id: string }>(
  fetchPage: (after: string | null) => Promise<T[]>
): AsyncGenerator<T> {
  let after: string | null = null;
  for (;;) {
    const rows: T[] = await fetchPage(after);
    for (const row of rows) yield row;
    if (rows.length < PAGE) return;
    after = rows[rows.length - 1].id;
  }
}

/** The keyset arguments every paged query shares.
 *
 *  It takes the caller's `where` rather than sitting beside it, because the
 *  cursor belongs IN the filter: `cursor: { id }` names a row and needs that
 *  row to still be inside the filtered set, and answers nothing at all when it
 *  is not (measured on this stack -- see src/lib/keyset.ts). A member's own row
 *  can leave the set during their own export; `id > after` is a comparison
 *  against a value and does not care.
 *
 *  Spread rather than AND-ed, unlike keyset.ts's fragment: none of the ten
 *  filters below carries a top-level `OR` or an `id` of its own, so there is
 *  nothing for the merge to overwrite. */
function keyset<W extends object>(where: W, after: string | null) {
  return {
    where: after ? { ...where, id: { gt: after } } : where,
    orderBy: { id: "asc" } as const,
    take: PAGE,
  };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  if (IS_DEMO) {
    return NextResponse.json(
      { error: "The demo persona is invented; there is no data of yours to export." },
      { status: 403 },
    );
  }
  const userId = session.user.id;

  const allowed = await rateLimit("export", userId);
  if (!allowed.ok) {
    return NextResponse.json(
      { error: "You have exported your data a few times already today. Try again tomorrow." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      displayEmail: true,
      phone: true,
      phones: true,
      instagram: true,
      linkedin: true,
      facebook: true,
      links: true,
      bio: true,
      about: true,
      workplace: true,
      jobTitle: true,
      accountType: true,
      batchType: true,
      batchYear: true,
      yearJoined: true,
      yearLeft: true,
      gradeJoined: true,
      admissionNumber: true,
      taughtFrom: true,
      taughtUntil: true,
      subjects: true,
      houses: true,
      currentCity: true,
      secondaryCity: true,
      photoUrl: true,
      coverPhoto: true,
      verifyState: true,
      verifiedAt: true,
      consentAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await writeAudit({
    actorId: userId,
    action: "account.export",
    targetType: "user",
    targetId: userId,
  });

  /* Every collection in the file, in the order they are written. Each one is a
     page-fetcher; `id` is selected only to drive the keyset and is stripped
     before the row is written, so the file's shape is exactly what it was. */
  const sections: Array<[string, (after: string | null) => Promise<{ id: string }[]>]> = [
    [
      "places",
      (after) =>
        prisma.userPlace.findMany({
          select: { id: true, label: true, city: true, lat: true, lng: true },
          ...keyset({ userId }, after),
        }),
    ],
    [
      "posts",
      (after) =>
        prisma.post.findMany({
          select: {
            id: true,
            kind: true,
            title: true,
            content: true,
            images: true,
            status: true,
            createdAt: true,
          },
          ...keyset({ authorId: userId }, after),
        }),
    ],
    [
      "comments",
      (after) =>
        prisma.comment.findMany({
          /* `entryId` beside `postId` since build phase 9: a comment hangs
             off a post OR off a Catch-up answer, and exporting only the first
             gave a member a file that silently omitted everything they had
             written in a Catch-up. */
          select: { id: true, content: true, postId: true, entryId: true, createdAt: true },
          ...keyset({ authorId: userId, deletedAt: null }, after),
        }),
    ],
    [
      "likes",
      (after) =>
        prisma.like.findMany({
          select: { id: true, postId: true },
          ...keyset({ userId }, after),
        }),
    ],
    [
      "collectionPhotos",
      (after) =>
        prisma.photo.findMany({
          select: {
            id: true,
            url: true,
            caption: true,
            era: true,
            photoYear: true,
            photoMonth: true,
            approved: true,
            createdAt: true,
          },
          ...keyset({ uploaderId: userId }, after),
        }),
    ],
    [
      "catchupAnswers",
      (after) =>
        prisma.catchupEntry.findMany({
          select: {
            id: true,
            body: true,
            images: true,
            songUrl: true,
            songTitle: true,
            // A recorded answer is the member's own voice; it goes in their
            // copy of their data like everything else they wrote (phase 12).
            audioUrl: true,
            audioSeconds: true,
            audioIsAuto: true,
            createdAt: true,
          },
          ...keyset({ authorId: userId }, after),
        }),
    ],
    [
      /* The questions they ASKED, not just the answers they wrote (audit
         C-078). `CatchupPrompt.authorId` is a real member FK and the text is
         entirely theirs -- often the most personal thing in an Edition -- and it
         was the one authored relation this file's own "what the person gave
         the site or wrote on it" promise did not keep. `showAsker` travels
         with it, because whether they asked anonymously is part of what they
         chose. */
      "catchupQuestions",
      (after) =>
        prisma.catchupPrompt.findMany({
          select: {
            id: true,
            text: true,
            category: true,
            showAsker: true,
            createdAt: true,
          },
          ...keyset({ authorId: userId }, after),
        }),
    ],
    [
      "messagesToAdmin",
      (after) =>
        prisma.adminMessage.findMany({
          select: { id: true, body: true, createdAt: true },
          ...keyset({ authorId: userId }, after),
        }),
    ],
    [
      "reportsFiled",
      (after) =>
        prisma.report.findMany({
          select: { id: true, reason: true, targetType: true, status: true, createdAt: true },
          ...keyset({ reporterId: userId }, after),
        }),
    ],
    [
      "contributions",
      (after) =>
        prisma.contribution.findMany({
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            method: true,
            createdAt: true,
            paidAt: true,
          },
          ...keyset({ userId }, after),
        }),
    ],
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (text: string) => controller.enqueue(encoder.encode(text));
      try {
        /* Written by hand rather than stringified whole, because the whole is
           the thing that must never exist in memory. Two-space indentation is
           kept: this file is meant to be openable by the person who asked for
           it, not only by a program. */
        write("{\n");
        write(`  "exportedAt": ${JSON.stringify(new Date().toISOString())},\n`);
        write('  "site": "Rishi Valley alumni website (rishivalley.space)",\n');
        write(
          '  "note": "Amounts are in paise. Image URLs point at the site\'s storage and stay live only while the content exists.",\n'
        );
        write(`  "profile": ${JSON.stringify(user, null, 2).replace(/\n/g, "\n  ")},\n`);

        for (const [name, fetchPage] of sections) {
          write(`  ${JSON.stringify(name)}: [`);
          let first = true;
          for await (const row of paged(fetchPage)) {
            const { id: _id, ...rest } = row;
            void _id;
            write(`${first ? "" : ","}\n    ${JSON.stringify(rest)}`);
            first = false;
          }
          write(first ? "]" : "\n  ]");
          write(name === sections[sections.length - 1][0] ? "\n" : ",\n");
        }

        write("}\n");
        controller.close();
      } catch (err) {
        /* The headers have already gone, so there is no status code left to
           change: the download simply ends early, which is visible as a JSON
           file that will not parse. Logged so the cause is findable. */
        console.error("[export] stream failed", err);
        controller.error(err);
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="rishi-valley-your-data.json"',
      "cache-control": "no-store",
    },
  });
}
