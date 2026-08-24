import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArrowLeft, Feather } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IdentityRow } from "@/components/common/identity-row";
import { LetterTitle } from "@/components/letters/letter-title";
import { LetterEngagement } from "@/components/letters/letter-engagement";
import { LetterImages } from "@/components/letters/letter-images";
import { canViewPost } from "@/lib/post-visibility";
import { batchLine, formatDisplayDate, letterTitle, metaLine, parseJsonArray, renderRichText, VALLEY_TIME_ZONE } from "@/lib/utils";
import { recordView } from "@/lib/content-view";

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
    // Only what the TITLE needs: `canViewPost` below fetches the audience
    // columns itself, so listing them here too was a second copy of a select
    // that has to stay in step with a rule this file no longer implements.
    select: { title: true, content: true, kind: true },
  });
  if (!letter || letter.kind !== "letter") return { title: "Letter" };

  /* The SAME rule the page body uses, for the same reason (audit M31). This
     had its own copy of three of the four audience checks and omitted
     `targetBatches`, so a letter written for one batch put its title in the
     browser tab, the history and every link preview for everybody else.
     A tab title is a smaller leak than the letter, which is exactly why it
     is the one that gets forgotten. */
  const visible = await canViewPost(id, session.user);
  if (!visible.ok) return { title: "Letter" };

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
      _count: { select: { comments: { where: { isHidden: false, deletedAt: null } }, likes: true } },
      likes: { where: { userId: session.user.id }, select: { id: true } },
      bookmarks: { where: { userId: session.user.id }, select: { id: true } },
    },
  });

  /* Existence and kind only. `isHidden` used to be tested here too, ABOVE
     canViewPost -- which quietly cancelled both of the exemptions the rule
     grants above its own isHidden refusal: an admin following the Open link
     from /admin/content got a 404 on the letter they were moderating, and the
     author of a hidden letter had no route to it at all, since a hidden letter
     is filtered out of the feed and the letters index as well (audit C-002).
     The rule below refuses a hidden letter to everybody else, which is all
     this line was ever for. */
  if (!letter || letter.kind !== "letter") notFound();

  /* One rule, not four hand-rolled checks (audit M31).
   *
   * This page used to test draft, then group membership, then city scope,
   * each written out again here because "this page reads the row directly
   * instead of through loadPosts". It tested three of the four things the
   * feed tests and quietly omitted the fourth: `targetBatches`. So a letter
   * written for one batch was hidden from every feed and readable by anybody
   * who had the link, which is the whole of what audience targeting is for.
   *
   * `canViewPost` is the same decision the feed, the bookmarks and the
   * comment paths all use, it is unit-tested without a database, and it
   * already exempts the author (so a draft still previews for the person
   * writing it). A fifth audience rule added a year from now lands here for
   * free; another copy of three of them would not.
   *
   * A 404 for every refusal, so a letter's existence is never revealed by a
   * different error.
   */
  const isDraft = letter.status === "draft";
  const visible = await canViewPost(id, session.user);
  if (!visible.ok) notFound();

  /* The read side of "read click-through rates": a letter's hearts say who
     reacted, this says who actually opened it. Fires down here, after every
     visibility check above, on purpose (bug audit Low 87): this call used to
     sit right after the fetch, above the draft/group/city-scope gates, so a
     member who was about to be turned away by one of those still had a view
     recorded against a letter they were refused. after(), not the old
     `void`, for the same reason as every other site in this cluster (bug
     audit Lows 25/35/44/72/77/82) -- a bare fire-and-forget write races the
     response and Vercel can drop it the instant that response streams. */
  after(() => recordView(session.user.id, "letter", letter.id));

  const images = parseJsonArray(letter.images);
  const words = letter.content.trim().split(/\s+/).filter(Boolean).length;
  const readMinutes = Math.max(1, Math.round(words / 200));

  return (
    // A reading measure (line length), not a page width: the column itself is
    // the shell's. Centered inside it so the text sits under its own title.
    <article className="mx-auto max-w-[680px]">
      <Link
        href={letter.groupId ? `/groups/${letter.groupId}` : "/letters"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        {letter.groupId ? "Back to group" : "All letters"}
      </Link>

      {/* An admin and the author are the only two people this rule lets past a
          hidden letter, and until now the page said nothing about it: the
          author saw their removed letter looking exactly like a live one
          (audit C-002). Same shape as the draft notice below it, in the
          destructive tone, because this is the one thing on the page the
          reader did not choose. */}
      {letter.isHidden && (
        <div className="mb-6 rounded-[var(--radius-md)] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <span className="font-medium text-destructive">
            Removed by a moderator. Only you and the moderators can see this.
          </span>
        </div>
      )}

      {isDraft && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-cinnamon/30 bg-cinnamon/10 px-4 py-3 text-sm">
          <span className="font-medium text-cinnamon">Draft, only visible to you.</span>
          <Link
            href="/letters"
            className="rounded-sm font-semibold text-cinnamon underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
              timeZone: VALLEY_TIME_ZONE,
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          )
        }
        metaClassName="leading-none"
      />

      <div
        className="mt-7 whitespace-pre-wrap font-heading text-[16px] leading-[1.8] text-foreground [&_a]:font-sans [&_strong]:font-bold"
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
