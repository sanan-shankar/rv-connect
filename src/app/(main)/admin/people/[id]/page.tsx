import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PersonDetail } from "@/components/admin/people/person-detail";
import { PUBLISHED_ONLY } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Person",
};

/**
 * Everything about one member, and everything you can do to them.
 *
 * A PAGE and not a dialog or a sheet, per the design system: "a dialog is for
 * something done in seconds... anything immersive gets a page". Editing
 * somebody's details is not seconds. It is also then linkable, which is what
 * lets the Overview worklist point straight at a person.
 */
export default async function AdminPersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      photoUrl: true,
      birdOverride: true,
      accountType: true,
      batchType: true,
      batchYear: true,
      yearJoined: true,
      yearLeft: true,
      admissionNumber: true,
      role: true,
      verifyState: true,
      verifyMethod: true,
      verifiedAt: true,
      emailVerified: true,
      isBlocked: true,
      photoTrusted: true,
      adminNote: true,
      createdAt: true,
      places: {
        select: { placeId: true, label: true, city: true, lat: true, lng: true },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!user) notFound();

  // Counted, not fetched. What this page needs to say about their content is
  // "how much", with a link to Content filtered to them for the rest.
  const [posts, comments, photos, contributions, reportsAgainst, mail] = await Promise.all([
    prisma.post.count({ where: { authorId: id, ...PUBLISHED_ONLY } }),
    prisma.comment.count({ where: { authorId: id, isHidden: false } }),
    prisma.photo.count({ where: { uploaderId: id, isHidden: false } }),
    prisma.contribution.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { userId: id, status: "paid" },
    }),
    prisma.report.count({ where: { reportedUserId: id } }),
    prisma.outboundEmail.findMany({
      where: { userId: id },
      select: {
        id: true,
        kind: true,
        status: true,
        attempts: true,
        lastError: true,
        createdAt: true,
        sentAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <PersonDetail
      person={{
        id: user.id,
        name: user.name,
        email: user.email,
        photoUrl: user.photoUrl,
        birdOverride: user.birdOverride,
        accountType: user.accountType,
        batchType: user.batchType,
        batchYear: user.batchYear,
        yearJoined: user.yearJoined,
        yearLeft: user.yearLeft,
        admissionNumber: user.admissionNumber,
        role: user.role,
        verifyState: user.verifyState,
        verifyMethod: user.verifyMethod,
        verifiedAt: user.verifiedAt?.toISOString() ?? null,
        emailConfirmedAt: user.emailVerified?.toISOString() ?? null,
        isBlocked: user.isBlocked,
        photoTrusted: user.photoTrusted ?? false,
        adminNote: user.adminNote,
        createdAt: user.createdAt.toISOString(),
        places: user.places,
      }}
      stats={{
        posts,
        comments,
        photos,
        contributionCount: contributions._count,
        contributionPaise: contributions._sum.amount ?? 0,
        reportsAgainst,
      }}
      mail={mail.map((m) => ({
        id: m.id,
        kind: m.kind,
        status: m.status,
        attempts: m.attempts,
        lastError: m.lastError,
        createdAt: m.createdAt.toISOString(),
        sentAt: m.sentAt?.toISOString() ?? null,
      }))}
    />
  );
}
