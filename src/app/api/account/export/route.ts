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
 */
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

  const [user, places, posts, comments, likes, photos, catchupEntries, adminMessages, reportsFiled, contributions] =
    await Promise.all([
      prisma.user.findUnique({
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
      }),
      prisma.userPlace.findMany({
        where: { userId },
        orderBy: { position: "asc" },
        select: { label: true, city: true, lat: true, lng: true },
      }),
      prisma.post.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "asc" },
        select: { kind: true, title: true, content: true, images: true, status: true, createdAt: true },
      }),
      prisma.comment.findMany({
        where: { authorId: userId, deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: { content: true, postId: true, createdAt: true },
      }),
      prisma.like.findMany({
        where: { userId },
        select: { postId: true },
      }),
      prisma.photo.findMany({
        where: { uploaderId: userId },
        orderBy: { createdAt: "asc" },
        select: {
          url: true,
          caption: true,
          area: true,
          era: true,
          photoYear: true,
          photoMonth: true,
          approved: true,
          createdAt: true,
        },
      }),
      prisma.catchupEntry.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "asc" },
        select: { body: true, images: true, songUrl: true, songTitle: true, createdAt: true },
      }),
      prisma.adminMessage.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: "asc" },
        select: { body: true, createdAt: true },
      }),
      prisma.report.findMany({
        where: { reporterId: userId },
        orderBy: { createdAt: "asc" },
        select: { reason: true, targetType: true, status: true, createdAt: true },
      }),
      prisma.contribution.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        select: { amount: true, currency: true, status: true, method: true, createdAt: true, paidAt: true },
      }),
    ]);

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await writeAudit({
    actorId: userId,
    action: "account.export",
    targetType: "user",
    targetId: userId,
  });

  const body = {
    exportedAt: new Date().toISOString(),
    site: "Rishi Valley alumni website (rishivalley.space)",
    note: "Amounts are in paise. Image URLs point at the site's storage and stay live only while the content exists.",
    profile: user,
    places,
    posts,
    comments,
    likes,
    collectionPhotos: photos,
    catchupAnswers: catchupEntries,
    messagesToAdmin: adminMessages,
    reportsFiled,
    contributions,
  };

  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": 'attachment; filename="rishi-valley-your-data.json"',
      "cache-control": "no-store",
    },
  });
}
