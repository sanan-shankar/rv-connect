import { cache } from "react";
import type { Metadata } from "next";
import Link from "@/components/common/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArrowLeft, Feather } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { IdentityRow } from "@/components/common/identity-row";
import { LetterTitle } from "@/components/letters/letter-title";
import { LetterEngagement } from "@/components/letters/letter-engagement";
import { LetterImages } from "@/components/letters/letter-images";
import { LetterMenu } from "@/components/letters/letter-menu";
import { photoFactsFor } from "@/lib/image-record";
import { canViewPost } from "@/lib/post-visibility";
import { VISIBLE_COMMENT, withLinkCards } from "@/lib/posts";
import { batchLine, formatDisplayDate, letterTitle, metaLine, parseJsonArray, readMinutes, VALLEY_TIME_ZONE } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";
import { linkRanges, stripReplacedLinks } from "@/lib/link-preview-core";
import { LinkCard } from "@/components/common/link-card";
import { recordView } from "@/lib/content-view";
import { IDENTITY_SELECT } from "@/lib/people-select";

/* One read for the two functions Next runs on the same request. The metadata
   needs three columns of a row the page fetches in full a moment later, and
   used to make its own lookup for them; React's cache() collapses the pair.
   Keyed on the two strings, never on the session object -- auth() hands back a
   fresh object per call, which would miss the cache every time. */
const loadLetter = cache(async function loadLetter(id: string, viewerId: string) {
  return prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        /* No `verifyState`, and that is consistent rather than an omission:
           this byline is `metaLine(batchLine(author), date)` and never draws
           a verified leaf, so the column would be fetched and dropped. */
        select: {
          ...IDENTITY_SELECT,
          accountType: true,
          batchType: true,
          batchYear: true,
        },
      },
      _count: { select: { comments: { where: VISIBLE_COMMENT }, likes: true } },
      likes: { where: { userId: viewerId }, select: { id: true } },
      bookmarks: { where: { userId: viewerId }, select: { id: true } },
    },
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return { title: "Letter" };

  const letter = await loadLetter(id, session.user.id);
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

  const letter = await loadLetter(id, session.user.id);

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
  /* Shape, focal point and the smear that holds each photograph's place, so
     the page reserves the right space before a byte of them arrives. */
  const photos = await photoFactsFor(images);
  const minutes = readMinutes(letter.content);

  /* The same on-read trigger a Catch-up Edition's loader uses
     (catchups-edition-view.ts): a pasted link with no resolved preview yet,
     or one whose failed resolve is more than a day old, is scheduled to
     resolve after this response (never awaited) and prints as an ordinary
     link on THIS read; the next one has the card. One query, whether the
     letter carries one pasted link or none (withLinkCards, @/lib/posts).

     Cut server-side here, unlike a feed post's: this page has no edit form
     reading `letter.content` back out of it -- editing goes through its own
     `/letters/[id]/edit` query -- so there is no risk in handing the reader
     the already-cut body the way the Catch-up reader does. */
  const [withLinks] = await withLinkCards([{ id: letter.id, content: letter.content }]);
  const stripped = stripReplacedLinks(letter.content, new Set(withLinks.links.map((l) => l.url)));
  const displayBody = stripped.cards.length ? stripped.body : letter.content;
  const linksByUrl = new Map(withLinks.links.map((l) => [l.url, l] as const));
  const displayLinks = stripped.cards.map((url) => linksByUrl.get(url)!);

  return (
    // A reading measure (line length), not a page width: the column itself is
    // the shell's. Centered inside it so the text sits under its own title.
    <article className="mx-auto w-full max-w-[680px]">
      <Link
        href="/letters"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <ArrowLeft className="h-4 w-4" />
        All letters
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
          {/* The desk, not the index. This linked to /letters for as long as
              the notice has existed, so the one control on a draft's own page
              took its author to a list to find the draft again -- while the
              drafts strip on that list has always linked straight to
              /letters/[id]/edit. Same destination as the Edit row in the menu
              above. */}
          <Link
            href={`/letters/${letter.id}/edit`}
            className="rounded-sm font-semibold text-cinnamon underline underline-offset-2 hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Continue editing
          </Link>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
        <Feather className="h-3.5 w-3.5" />
        Letter
        <span className="text-muted-foreground/70">· {minutes} min read</span>
      </div>

      <LetterTitle title={letterTitle(letter.title, letter.content)} />

      {/* The byline and the letter's own menu share one row, the way a post
          card's header does: the "..." is chrome that belongs to the piece,
          so it sits beside the person who wrote it rather than joining the
          hearts and the share glyph at the foot. Centred in the band rather
          than top-aligned like the card's, because this avatar is a size up.

          No hairline under the band, and no padding holding one up (owner,
          2026-09-16: "it's doing nothing and it's barely even visible").
          DESIGN-SYSTEM.md's dialog rule is the general case -- sections are
          separated by space, never a hairline, widen the gap instead -- and a
          reading page is the purest instance of it: there is exactly one
          section break on the whole surface, so the line had nothing to
          disambiguate. It was also buying its invisibility expensively, at
          24px of pad above and 28px of margin below, which put 53px between
          the bird and the first word. The gap below is now the only thing
          marking the break, and it is one line of the body's own rhythm. */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <IdentityRow
          user={{ id: letter.author.id, name: letter.author.name, photoUrl: letter.author.photoUrl, birdOverride: letter.author.birdOverride }}
          avatarSize="md"
          avatarHref={`/profile/${letter.author.id}`}
          avatarLabel={letter.author.name}
          className="min-w-0 flex-1"
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
        <LetterMenu
          postId={letter.id}
          isOwn={letter.authorId === session.user.id}
          isDraft={isDraft}
          viewerIsAdmin={session.user.role === "admin"}
          content={letter.content}
          title={letter.title}
        />
      </div>

      {/* Skipped when the whole letter was one link that just became a card
          (displayBody === ""), the same fail-soft rule a Catch-up answer's
          tile follows. */}
      {displayBody && (
        <div
          className="mt-7 whitespace-pre-wrap break-words font-heading text-[16px] leading-[1.8] text-foreground [&_a]:font-sans [&_strong]:font-bold"
          dangerouslySetInnerHTML={{ __html: renderRichText(displayBody, { linkRanges }) }}
        />
      )}

      <LetterImages
        images={images}
        photos={images.map((url) => photos.get(url) ?? null)}
        author={{
          id: letter.author.id,
          name: letter.author.name,
          photoUrl: letter.author.photoUrl,
          birdOverride: letter.author.birdOverride,
        }}
        date={formatDisplayDate(letter.createdAt)}
      />

      {/* One card per pasted link that resolved, same shape as a Catch-up
          answer's stack (edition/reader.tsx's Tile). */}
      {displayLinks.length > 0 && (
        <div className="mt-8 space-y-2">
          {displayLinks.map((link) => (
            <LinkCard key={link.url} link={link} />
          ))}
        </div>
      )}

      {/* A draft hasn't been published yet, so there is nothing to like,
          comment on, bookmark, or share -- that all starts once it's out. */}
      {!isDraft && (
        <LetterEngagement
          postId={letter.id}
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
