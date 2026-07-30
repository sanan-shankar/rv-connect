import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Feather } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IdentityRow } from "@/components/common/identity-row";
import { LetterTitle } from "@/components/letters/letter-title";
import { LetterEngagement } from "@/components/letters/letter-engagement";
import { LetterImages } from "@/components/letters/letter-images";
import { canViewCityScope } from "@/lib/city-scope";
import { batchLine, formatDisplayDate, metaLine, renderRichText, parseJsonArray, letterTitle } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return { title: "Letter" };

  const letter = await prisma.post.findUnique({
    where: { id },
    select: {
      title: true,
      content: true,
      kind: true,
      isHidden: true,
      groupId: true,
      cityScope: true,
      status: true,
      authorId: true,
    },
  });
  if (!letter || letter.kind !== "letter" || letter.isHidden) return { title: "Letter" };

  // A draft is only ever visible to its own author; never leak its title
  // (even indirectly, via the tab title) to anyone else.
  if (letter.status === "draft" && letter.authorId !== session.user.id) {
    return { title: "Letter" };
  }

  // Group letters are private to members; do not leak the title to non-members.
  if (letter.groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: letter.groupId, userId: session.user.id } },
      select: { id: true },
    });
    if (!membership) return { title: "Letter" };
  }

  // Same city-scope visibility rule as the page body: do not leak the title.
  if (!(await canViewCityScope(letter.cityScope, session.user))) return { title: "Letter" };

  return { title: letterTitle(letter.title, letter.content) };
}

export default async function LetterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return null;

  const letter = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { id: true, name: true, avatarColor: true, photoUrl: true, birdOverride: true, accountType: true, batchType: true, batchYear: true },
      },
      _count: { select: { comments: { where: { isHidden: false } }, likes: true } },
      likes: { where: { userId: session.user.id }, select: { id: true } },
      bookmarks: { where: { userId: session.user.id }, select: { id: true } },
    },
  });

  if (!letter || letter.kind !== "letter" || letter.isHidden) notFound();

  // A draft is only ever visible to its own author: a preview of a letter
  // still being written, not a published page. Everyone else gets the same
  // 404 as a letter that doesn't exist, so a draft's existence is never
  // revealed by a different error.
  const isAuthor = letter.authorId === session.user.id;
  const isDraft = letter.status === "draft";
  if (isDraft && !isAuthor) notFound();

  // Group letters are private to members.
  if (letter.groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: letter.groupId, userId: session.user.id } },
      select: { id: true },
    });
    if (!membership) notFound();
  }

  // City-scoped letters: same visibility rule as the feed query, checked here
  // too since this page reads the row directly instead of through loadPosts.
  if (!(await canViewCityScope(letter.cityScope, session.user))) notFound();

  const images = parseJsonArray(letter.images);
  const words = letter.content.trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.round(words / 200));

  return (
    // A reading measure (line length), not a page width: the column itself is
    // the shell's. Centered inside it so the text sits under its own title.
    <article className="mx-auto max-w-[680px]">
      <Link
        href={letter.groupId ? `/groups/${letter.groupId}` : "/letters"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="h-4 w-4" />
        {letter.groupId ? "Back to group" : "All letters"}
      </Link>

      {isDraft && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-cinnamon/30 bg-cinnamon/10 px-4 py-3 text-sm">
          <span className="font-medium text-cinnamon">Draft, only visible to you.</span>
          <Link
            href="/letters"
            className="rounded-sm font-semibold text-cinnamon underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Continue editing
          </Link>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
        <Feather className="h-3.5 w-3.5" />
        Letter
        <span className="text-muted-foreground/70">· {readMinutes} min read</span>
      </div>

      <LetterTitle title={letterTitle(letter.title, letter.content)} />

      <IdentityRow
        user={{ id: letter.author.id, name: letter.author.name, photoUrl: letter.author.photoUrl, birdOverride: letter.author.birdOverride }}
        avatarSize="md"
        avatarHref={`/profile/${letter.author.id}`}
        avatarLabel={letter.author.name}
        className="mt-5 border-b border-border pb-6"
        name={
          <Link
            href={`/profile/${letter.author.id}`}
            className="font-semibold leading-none text-foreground hover:underline"
          >
            {letter.author.name}
          </Link>
        }
        meta={
          /* metaLine drops the dot beside an empty segment (the Anonymous
             profile's batch line), so an archive letter reads as just its
             date. Month stays long-form: the reading page's unhurried
             register, vs the index's short month. */
          metaLine(
            batchLine(letter.author),
            new Date(letter.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          )
        }
        metaClassName="leading-none"
      />

      <div
        className="mt-7 whitespace-pre-wrap font-heading text-[17px] leading-[1.8] text-foreground [&_a]:font-sans [&_strong]:font-bold"
        dangerouslySetInnerHTML={{ __html: renderRichText(letter.content) }}
      />

      <LetterImages
        images={images}
        author={{
          id: letter.author.id,
          name: letter.author.name,
          photoUrl: letter.author.photoUrl,
          birdOverride: letter.author.birdOverride,
        }}
        date={formatDisplayDate(letter.createdAt)}
      />

      {/* A draft hasn't been published yet, so there is nothing to like,
          comment on, bookmark, or share -- that all starts once it's out. */}
      {!isDraft && (
        <LetterEngagement
          postId={letter.id}
          groupId={letter.groupId}
          initialLiked={letter.likes.length > 0}
          initialLikeCount={letter._count.likes}
          initialBookmarked={letter.bookmarks.length > 0}
          initialCommentCount={letter._count.comments}
          viewerIsAdmin={session.user.role === "admin"}
        />
      )}
    </article>
  );
}
