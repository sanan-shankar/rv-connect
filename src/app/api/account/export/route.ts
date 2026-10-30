import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { IS_DEMO } from "@/lib/demo";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { writeAudit } from "@/lib/audit";
import { reportSwallowed } from "@/lib/report-error";
import {
  EXPORT_PAGE,
  EXPORT_PROFILE,
  EXPORT_SECTIONS,
  LEFT_OUT,
  exportDocument,
  firstWords,
  postLabel,
  type ExportSection,
  type ExportSectionName,
} from "@/lib/account-export-rule";

/**
 * The member's own data, as one downloadable JSON file (audit M35, GDPR
 * Art. 15 and 20). Reached from "Request your data" on their own profile.
 *
 * Strictly self-service: the session decides WHOSE data, and no parameter
 * exists to ask for anyone else's. The file carries everything the site keeps
 * about the member (the owner's ruling, bug audit 3 Q24): every column of
 * their row, a section for each of their tables, and what the site recorded
 * about them, visits, searches, pages opened and the bell included. What it
 * leaves out on purpose is `LEFT_OUT` in account-export-rule.ts, each with its
 * reason, written into the file as `leftOut`: the secrets that open the
 * account (the password's hash, the session counter, the emailed sign-in
 * links), the admins' own note and their mark on a photograph set aside,
 * reports others filed about the member, a Catch-up's invitation key, and an
 * email's text. account-export-rule.test.mjs fails the build when a column or
 * a table of the member's is in neither place. Deleted comments are rows kept
 * only as thread structure with the content already blanked, so they are
 * excluded rather than exported as identical "[deleted]" stubs.
 *
 * Every row keeps its id, so the file's own references resolve: a comment's
 * `postId` matches a post's `id` when the post is theirs. A row pointing at
 * something that is not theirs carries a few words of it in `on` (T6-03).
 *
 * STREAMED, a page at a time (audit M48). It used to run ten unbounded
 * findMany calls in parallel, hold every row in memory at once and then
 * `JSON.stringify` the lot into a single pretty-printed string. Capping the
 * queries was not an option: an export that silently omits half a person's
 * data is worse than a slow one, and this is the request the law says must be
 * complete. So each table is walked in key order in pages, the stream asks for
 * the next page only when the response has taken the last one (`pull`), and
 * a failure part of the way through ends the file in words (`exportDocument`).
 */

/** The keyset arguments every id-ordered page shares.
 *
 *  It takes the caller's `where` rather than sitting beside it, because the
 *  cursor belongs IN the filter: `cursor: { id }` names a row and needs that
 *  row to still be inside the filtered set, and answers nothing at all when it
 *  is not (measured on this stack -- see src/lib/keyset.ts). A member's own row
 *  can leave the set during their own export; `id > after` is a comparison
 *  against a value and does not care.
 *
 *  Spread rather than AND-ed, unlike keyset.ts's fragment: no filter below
 *  carries an `id` of its own, and the one with a top-level `OR` (the admin
 *  messages) has nothing for an `id` key to overwrite. */
function keyset<W extends object>(where: W, after: string | null) {
  return {
    where: after ? { ...where, id: { gt: after } } : where,
    orderBy: { id: "asc" } as const,
    take: EXPORT_PAGE,
  };
}

/** What each section needs from the route: its page reader, and its key when
 *  the table has no id of its own. */
type SectionReader = Omit<ExportSection, "name">;

/**
 * Every section's reader, by its name in the file. `satisfies` makes a section
 * named in EXPORT_SECTIONS without a reader here, or a reader for a name that
 * is not there, a type error, so the schema-walking test's list and this one
 * cannot drift apart.
 */
function sectionReaders(userId: string) {
  /* A Catch-up's name where a row needs one: its own title, else the name of
     the group behind it (catchupDisplayName's rule, read here as two columns). */
  const catchupName = (title: string | null | undefined, groupName: string) => title?.trim() || groupName;

  return {
    "places": {
      page: (after) =>
        prisma.userPlace.findMany({
          select: { id: true, label: true, city: true, lat: true, lng: true, position: true, placeId: true, createdAt: true },
          ...keyset({ userId }, after),
        }),
    },
    "posts": {
      page: (after) =>
        prisma.post.findMany({
          select: {
            id: true,
            kind: true,
            title: true,
            content: true,
            images: true,
            // A poll's options are words the member wrote too.
            pollOptions: { select: { id: true, text: true, position: true }, orderBy: { position: "asc" } },
            targetBatches: true,
            cityScope: true,
            isHidden: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
          ...keyset({ authorId: userId }, after),
        }),
    },
    "comments": {
      page: (after) =>
        prisma.comment.findMany({
          /* `entryId` beside `postId` since build phase 9: a comment hangs
             off a post OR off a Catch-up answer, and exporting only the first
             gave a member a file that silently omitted everything they had
             written in a Catch-up. `on` says which, in words: the post's or
             the question's (T6-03). */
          select: {
            id: true,
            content: true,
            postId: true,
            entryId: true,
            parentId: true,
            isHidden: true,
            createdAt: true,
            post: { select: { kind: true, title: true, content: true } },
            entry: { select: { prompt: { select: { text: true } } } },
          },
          ...keyset({ authorId: userId, deletedAt: null }, after),
        }).then((rows) =>
          rows.map(({ post, entry, ...row }) => ({
            ...row,
            on: post ? postLabel(post) : entry ? `Answer to: ${firstWords(entry.prompt.text)}` : null,
          }))
        ),
    },
    "catchupAnswers": {
      page: (after) =>
        prisma.catchupEntry.findMany({
          select: {
            id: true,
            editionId: true,
            promptId: true,
            prompt: { select: { text: true } },
            body: true,
            images: true,
            // A recorded answer is the member's own voice; it goes in their
            // copy of their data like everything else they wrote (phase 12).
            audioUrl: true,
            audioSeconds: true,
            audioIsAuto: true,
            /* Whether it is sitting in a sealed time capsule, and until when
               (build phase 14). The answer itself IS included, and that is a
               decision, not an oversight: his 34b seals a capsule against
               READING it in the app, and this is a member's copy of their own
               data, the right of access the privacy page promises. It is out
               of band, asked for on purpose, and carries only their own words.
               Overturning it is the owner's call; it is one filter here. */
            edition: { select: { status: true, publishAt: true } },
            createdAt: true,
            updatedAt: true,
          },
          ...keyset({ authorId: userId }, after),
        }).then((rows) => rows.map(({ prompt, ...row }) => ({ ...row, question: prompt.text }))),
    },
    "catchupQuestions": {
      /* The questions they ASKED, not just the answers they wrote (audit
         C-078). `showAsker` travels with them, because whether they asked
         anonymously is part of what they chose. */
      page: (after) =>
        prisma.catchupPrompt.findMany({
          select: {
            id: true,
            editionId: true,
            text: true,
            category: true,
            source: true,
            showAsker: true,
            accepted: true,
            position: true,
            createdAt: true,
          },
          ...keyset({ authorId: userId }, after),
        }),
    },
    "collectionPhotos": {
      page: (after) =>
        prisma.photo.findMany({
          select: {
            id: true,
            url: true,
            thumbUrl: true,
            screenUrl: true,
            width: true,
            height: true,
            caption: true,
            subject: true,
            era: true,
            photoYear: true,
            photoMonth: true,
            datePrecision: true,
            exifYear: true,
            exifMonth: true,
            scope: true,
            classYears: true,
            approved: true,
            approvedAt: true,
            isHidden: true,
            createdAt: true,
            updatedAt: true,
          },
          ...keyset({ uploaderId: userId }, after),
        }),
    },
    "conversationsWithAdmins": {
      page: (after) =>
        prisma.adminThread.findMany({
          select: {
            id: true,
            subject: true,
            kind: true,
            status: true,
            reportId: true,
            lastMessageAt: true,
            createdAt: true,
          },
          ...keyset({ memberId: userId }, after),
        }),
    },
    "messagesWithAdmins": {
      /* The whole of each conversation, both sides, as the member reads it
         in Messages: an admin's reply was written to them. And anything they
         wrote in somebody else's thread, which only an admin can. */
      page: (after) =>
        prisma.adminMessage.findMany({
          select: { id: true, threadId: true, fromAdmin: true, body: true, imageUrl: true, createdAt: true },
          ...keyset({ OR: [{ thread: { memberId: userId } }, { authorId: userId }] }, after),
        }),
    },
    "likes": {
      page: (after) =>
        prisma.like.findMany({
          select: { id: true, postId: true, post: { select: { kind: true, title: true, content: true } } },
          ...keyset({ userId }, after),
        }).then((rows) => rows.map(({ post, ...row }) => ({ ...row, on: postLabel(post) }))),
    },
    "commentLikes": {
      page: (after) =>
        prisma.commentLike.findMany({
          select: { id: true, commentId: true, comment: { select: { content: true, deletedAt: true } } },
          ...keyset({ userId }, after),
        }).then((rows) =>
          rows.map(({ comment, ...row }) => ({
            ...row,
            // A deleted comment is a blanked row kept for its replies.
            on: comment.deletedAt ? "A comment since deleted" : `Comment: ${firstWords(comment.content)}`,
          }))
        ),
    },
    "photoLoves": {
      page: (after) =>
        prisma.photoLove.findMany({
          select: { id: true, photoId: true, photo: { select: { caption: true } } },
          ...keyset({ userId }, after),
        }).then((rows) =>
          rows.map(({ photo, ...row }) => ({
            ...row,
            on: photo.caption ? `Photograph: ${firstWords(photo.caption)}` : "Photograph",
          }))
        ),
    },
    "catchupLoves": {
      page: (after) =>
        prisma.catchupEntryLove.findMany({
          select: { id: true, entryId: true, entry: { select: { prompt: { select: { text: true } } } } },
          ...keyset({ userId }, after),
        }).then((rows) =>
          rows.map(({ entry, ...row }) => ({ ...row, on: `Answer to: ${firstWords(entry.prompt.text)}` }))
        ),
    },
    "pollVotes": {
      page: (after) =>
        prisma.pollVote.findMany({
          select: {
            id: true,
            postId: true,
            pollOptionId: true,
            pollOption: { select: { text: true } },
            post: { select: { kind: true, title: true, content: true } },
          },
          ...keyset({ userId }, after),
        }).then((rows) =>
          rows.map(({ pollOption, post, ...row }) => ({ ...row, choice: pollOption.text, on: postLabel(post) }))
        ),
    },
    "bookmarks": {
      page: (after) =>
        prisma.bookmark.findMany({
          select: {
            id: true,
            postId: true,
            createdAt: true,
            post: { select: { kind: true, title: true, content: true } },
          },
          ...keyset({ userId }, after),
        }).then((rows) => rows.map(({ post, ...row }) => ({ ...row, on: postLabel(post) }))),
    },
    "catchupMemberships": {
      page: (after) =>
        prisma.groupMember.findMany({
          select: {
            id: true,
            groupId: true,
            role: true,
            joinedAt: true,
            group: { select: { name: true, catchup: { select: { title: true } } } },
          },
          ...keyset({ userId }, after),
        }).then((rows) =>
          rows.map(({ group, ...row }) => ({ ...row, on: catchupName(group.catchup?.title, group.name) }))
        ),
    },
    "catchupSettings": {
      page: (after) =>
        prisma.catchupPref.findMany({
          select: {
            id: true,
            catchupId: true,
            reminderMode: true,
            archivedAt: true,
            catchup: { select: { title: true, group: { select: { name: true } } } },
          },
          ...keyset({ userId }, after),
        }).then((rows) =>
          rows.map(({ catchup, ...row }) => ({ ...row, on: catchupName(catchup.title, catchup.group.name) }))
        ),
    },
    "catchupsStarted": {
      // Not `inviteToken`: anyone holding it can join (LEFT_OUT).
      page: (after) =>
        prisma.catchup.findMany({
          select: {
            id: true,
            groupId: true,
            title: true,
            intro: true,
            status: true,
            pictureSrc: true,
            createdAt: true,
            updatedAt: true,
          },
          ...keyset({ createdById: userId }, after),
        }),
    },
    "groupsStarted": {
      page: (after) =>
        prisma.group.findMany({
          select: { id: true, name: true, batchYear: true, createdAt: true, updatedAt: true },
          ...keyset({ creatorId: userId }, after),
        }),
    },
    "editionsRead": {
      /* The one table here with no id: its key is (userId, editionId), so the
         walk is by Edition within this member's rows. */
      page: (after) =>
        prisma.catchupEditionRead.findMany({
          select: { editionId: true, readAt: true },
          where: after ? { userId, editionId: { gt: after } } : { userId },
          orderBy: { editionId: "asc" },
          take: EXPORT_PAGE,
        }),
      key: (row) => String(row.editionId),
    },
    "reportsFiled": {
      page: (after) =>
        prisma.report.findMany({
          select: {
            id: true,
            reason: true,
            targetType: true,
            postId: true,
            reportedUserId: true,
            status: true,
            createdAt: true,
          },
          ...keyset({ reporterId: userId }, after),
        }),
    },
    "photosApproved": {
      // Only an admin approves; the photographs are their contributors' own.
      page: (after) =>
        prisma.photo.findMany({
          select: { id: true, approvedAt: true },
          ...keyset({ approvedById: userId }, after),
        }),
    },
    "contributions": {
      page: (after) =>
        prisma.contribution.findMany({
          /* `refundedAmount` beside `amount`, because a partial refund leaves
             the row "paid" and only moves the paise (audit C-087): every other
             reader counts amount minus this, and the member's own copy reported
             the gross (bug audit 3, T8a-07). The two Razorpay ids are the only
             keys a member can quote to Razorpay or their bank about a payment. */
          select: {
            id: true,
            amount: true,
            refundedAmount: true,
            currency: true,
            status: true,
            method: true,
            failureReason: true,
            razorpayOrderId: true,
            razorpayPaymentId: true,
            createdAt: true,
            paidAt: true,
          },
          ...keyset({ userId }, after),
        }),
    },
    "notifications": {
      page: (after) =>
        prisma.notification.findMany({
          select: { id: true, type: true, message: true, link: true, read: true, createdAt: true },
          ...keyset({ userId }, after),
        }),
    },
    "emailsSent": {
      // The record of what was sent, not `payload`: a sign-in email's text is
      // a working link (LEFT_OUT).
      page: (after) =>
        prisma.outboundEmail.findMany({
          select: {
            id: true,
            kind: true,
            to: true,
            status: true,
            createdAt: true,
            sentAt: true,
            deliveredAt: true,
            bouncedAt: true,
            complainedAt: true,
          },
          ...keyset({ userId }, after),
        }),
    },
    "pagesOpened": {
      page: (after) =>
        prisma.contentView.findMany({
          select: { id: true, kind: true, targetId: true, count: true, firstAt: true, lastAt: true },
          ...keyset({ viewerId: userId }, after),
        }),
    },
    "searches": {
      page: (after) =>
        prisma.searchLog.findMany({
          select: { id: true, scope: true, query: true, results: true, createdAt: true },
          ...keyset({ userId }, after),
        }),
    },
    "visits": {
      page: (after) =>
        prisma.visit.findMany({
          select: {
            id: true,
            startedAt: true,
            endedAt: true,
            views: true,
            entryPath: true,
            lastPath: true,
            paths: true,
            referrer: true,
            device: true,
            os: true,
            browser: true,
            language: true,
            country: true,
            city: true,
            region: true,
          },
          ...keyset({ userId }, after),
        }),
    },
    "entryQuestions": {
      // The questions at the door before they joined, linked to the account
      // when it was made (trivia-log.ts).
      page: (after) =>
        prisma.triviaEvent.findMany({
          select: {
            id: true,
            questionId: true,
            kind: true,
            answer: true,
            how: true,
            matched: true,
            device: true,
            country: true,
            browserId: true,
            createdAt: true,
          },
          ...keyset({ userId }, after),
        }),
    },
  } satisfies Record<ExportSectionName, SectionReader>;
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

  const user = await prisma.user.findUnique({ where: { id: userId }, select: EXPORT_PROFILE });
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await writeAudit({
    actorId: userId,
    action: "account.export",
    targetType: "user",
    targetId: userId,
  });

  const readers: Record<ExportSectionName, SectionReader> = sectionReaders(userId);
  const chunks = exportDocument({
    head: {
      exportedAt: new Date().toISOString(),
      site: "Rishi Valley alumni website (rishivalley.space)",
      note:
        "Amounts are in paise; a contribution is worth its amount less its refundedAmount, the part handed back. " +
        "Image URLs point at the site's storage and stay live only while the content exists. " +
        "Every row keeps its id; a row pointing at something that is not yours says what it was in \"on\".",
      leftOut: LEFT_OUT,
      profile: user,
    },
    sections: EXPORT_SECTIONS.map(([, name]) => ({ name, ...readers[name] })),
    onError: (err) => reportSwallowed("export", err, { userId }),
  });

  /* Pulled, not pushed: the next piece is read from the database only when
     the response has taken the last one, so a slow download cannot pile the
     whole file up in the stream's queue. Two-space indentation is kept: this
     file is meant to be openable by the person who asked for it, not only by
     a program. */
  const encoder = new TextEncoder();
  /* Set when the member stops the download. A page being read at that moment
     still arrives, and handing it to a cancelled stream throws, which the catch
     below reported to Sentry as a failure on every download stopped part-way
     (write-path review of bug audit 3 unit B4). */
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await chunks.next();
        if (cancelled) return;
        if (next.done) controller.close();
        else controller.enqueue(encoder.encode(next.value));
      } catch (err) {
        if (cancelled) return;
        // exportDocument ends the file itself when a page fails; this is only
        // for a throw it could not catch, which can only end the download.
        reportSwallowed("export", err, { userId });
        controller.error(err);
      }
    },
    async cancel() {
      // The member stopped the download: stop reading the database too.
      cancelled = true;
      await chunks.return(undefined);
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
