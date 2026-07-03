import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Feather } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IdentityRow } from "@/components/common/identity-row";
import { LetterTitle } from "@/components/letters/letter-title";
import { LetterEngagement } from "@/components/letters/letter-engagement";
import { formatBatch, renderRichText, parseJsonArray } from "@/lib/utils";

// Untitled letters fall back to their first line / opening words rather than a
// literal "Untitled letter" placeholder.
function letterTitle(title: string | null, content: string) {
  if (title && title.trim()) return title.trim();
  const firstLine = content
    .replace(/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g, "$1")
    .split(/\n/)
    .map((l) => l.trim())
    .find(Boolean);
  if (!firstLine) return "A letter";
  return firstLine.length > 90 ? firstLine.slice(0, 90).trimEnd() + "..." : firstLine;
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
        select: { id: true, name: true, avatarColor: true, batchType: true, batchYear: true },
      },
      _count: { select: { comments: true, likes: true } },
      likes: { where: { userId: session.user.id }, select: { id: true } },
      bookmarks: { where: { userId: session.user.id }, select: { id: true } },
    },
  });

  if (!letter || letter.kind !== "letter" || letter.isHidden) notFound();

  // Group letters are private to members.
  if (letter.groupId) {
    const membership = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: letter.groupId, userId: session.user.id } },
      select: { id: true },
    });
    if (!membership) notFound();
  }

  const images = parseJsonArray(letter.images);
  const words = letter.content.trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.round(words / 200));

  return (
    <article className="mx-auto max-w-[680px]">
      <Link
        href={letter.groupId ? `/groups/${letter.groupId}` : "/letters"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <ArrowLeft className="h-4 w-4" />
        {letter.groupId ? "Back to group" : "All letters"}
      </Link>

      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
        <Feather className="h-3.5 w-3.5" />
        Letter
        <span className="text-muted-foreground/70">· {readMinutes} min read</span>
      </div>

      <LetterTitle title={letterTitle(letter.title, letter.content)} />

      <IdentityRow
        user={{ id: letter.author.id, name: letter.author.name }}
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
          <>
            {formatBatch(letter.author.batchType, letter.author.batchYear)} ·{" "}
            {new Date(letter.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </>
        }
        metaClassName="leading-none"
      />

      <div
        className="mt-7 whitespace-pre-wrap font-heading text-[17px] leading-[1.8] text-foreground [&_a]:font-sans [&_strong]:font-bold"
        dangerouslySetInnerHTML={{ __html: renderRichText(letter.content) }}
      />

      {images.length > 0 && (
        <div className="mt-8 space-y-4">
          {images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={img}
              alt=""
              loading="lazy"
              className="w-full rounded-xl border border-border object-cover"
            />
          ))}
        </div>
      )}

      <LetterEngagement
        postId={letter.id}
        groupId={letter.groupId}
        initialLiked={letter.likes.length > 0}
        initialLikeCount={letter._count.likes}
        initialBookmarked={letter.bookmarks.length > 0}
        initialCommentCount={letter._count.comments}
      />
    </article>
  );
}
