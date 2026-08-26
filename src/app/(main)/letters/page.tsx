import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Feather, MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { DraftsStrip } from "@/components/letters/drafts-strip";
import { Button } from "@/components/ui/button";
import { IdentityRow } from "@/components/common/identity-row";
import { getViewerCities } from "@/lib/city-scope";
import { batchLine, formatDisplayDate, letterTitle, metaLine, plainExcerpt, readMinutes } from "@/lib/utils";
import {
  AUTHOR_IN_GOOD_STANDING,
  PUBLISHED_ONLY,
  VISIBLE_COMMENT,
  audienceWhere,
} from "@/lib/posts";
import { IDENTITY_SELECT } from "@/lib/people-select";

export const metadata: Metadata = {
  title: "Letters",
};

/**
 * How many letters one page of the index holds.
 *
 * It used to be a flat `take: 40` with nothing after it, so the forty-first
 * letter simply stopped existing: no link, no count, no way to know anything
 * was missing (bug audit M47). Twenty per page with a keyset link at the foot
 * keeps the whole archive reachable and the page light. Keyset rather than an
 * offset because letters are published while people read: an offset page 2
 * would repeat or skip a letter the moment a new one lands above it.
 */
const LETTERS_PER_PAGE = 20;

export default async function LettersPage({
  searchParams,
}: {
  searchParams: Promise<{ before?: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  /* The cursor is the createdAt of the last letter on the previous page. A
     value that is not a date is ignored rather than reaching Prisma as an
     Invalid Date, which throws and 500s the page -- the same trap M23 sprang on
     the directory's numeric params. */
  const { before } = await searchParams;
  const cursor = before ? new Date(before) : null;
  const olderThan = cursor && !Number.isNaN(cursor.getTime()) ? cursor : null;

  const isAdmin = session.user.role === "admin";
  const viewerCities = isAdmin ? [] : await getViewerCities(session.user.id);
  // Reused below for the composer's "Show to" audience control (same list, no
  // second query -- getViewerCities already returns it in position order).
  const lettersQuery = prisma.post.findMany({
    where: {
      kind: "letter",
      isHidden: false,
      groupId: null,
      // Drafts are never public, even to the person browsing their own
      // batch/city -- they only ever show in the "Your drafts" strip below.
      ...PUBLISHED_ONLY,
      // A blocked member's letters leave the index with them (audit Low 78).
      ...AUTHOR_IN_GOOD_STANDING,
      /* The SHARED audience builder, which spells out the author exemption
         on both arms (audit C-008). This index hand-rolled the two fragments
         and omitted it, so an author who published a letter scoped to their
         own city and later removed that city from their profile lost sight of
         their own letter -- while it stayed readable to everybody still in
         that city. The feed has carried the exemption since M30; this page is
         the surface the letter actually lives on. */
      ...audienceWhere(session.user, viewerCities),
      ...(olderThan ? { createdAt: { lt: olderThan } } : {}),
    },
    include: {
      author: {
        /* No `verifyState`, and that is consistent rather than an omission:
           this byline is `metaLine(batchLine(author), date)` and never draws
           a verified leaf, so the column would be fetched and dropped. */
        select: {
          ...IDENTITY_SELECT,
          avatarColor: true,
          accountType: true,
          batchType: true,
          batchYear: true,
        },
      },
      _count: { select: { comments: { where: VISIBLE_COMMENT }, likes: true } },
    },
    orderBy: { createdAt: "desc" },
    // One extra, purely to answer "is there another page" without a count.
    take: LETTERS_PER_PAGE + 1,
  });

  // The viewer's own in-progress letters. Author-only by construction (this
  // query is always scoped to the signed-in session's own id), so this can
  // never leak someone else's unpublished draft.
  const draftsQuery = prisma.post.findMany({
    where: { kind: "letter", authorId: session.user.id, status: "draft" },
    select: { id: true, title: true, content: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  // Independent queries; no reason to serialize them.
  const [page, drafts] = await Promise.all([lettersQuery, draftsQuery]);
  const hasOlder = page.length > LETTERS_PER_PAGE;
  const letters = hasOlder ? page.slice(0, LETTERS_PER_PAGE) : page;
  const olderHref = hasOlder
    ? `/letters?before=${encodeURIComponent(letters[letters.length - 1].createdAt.toISOString())}`
    : null;

  return (
    <div>
      {/* No subtitle (owner, 2026-08-22): the letters below say what the page is. */}
      <PageHeader
        title="Letters"
        actions={
          /* Writing happens on its own page now (owner: "a whole page, so
             people can properly immerse themselves"); the index just points
             the way with the standard page-level canopy pill. Button's base-ui
             `render` swaps its element for the Link (buttonVariants itself is
             client-only and cannot be CALLED from this server component). */
          <Button variant="primary" nativeButton={false} render={<Link href="/letters/new" />}>
            <Feather className="h-4 w-4" />
            Write a letter
          </Button>
        }
      />

      <div className="space-y-5">
        {/* Only on a later page: the first page IS the latest. */}
        {olderThan && (
          <Link
            href="/letters"
            className="inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold text-canopy underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
          >
            <ArrowLeft size={15} />
            Back to the latest
          </Link>
        )}

        {drafts.length > 0 && (
          <DraftsStrip
            drafts={drafts.map((d) => ({
              id: d.id,
              title: d.title,
              updatedAt: d.updatedAt.toISOString(),
            }))}
          />
        )}

        {letters.length === 0 ? (
          <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-12 text-center">
            <Feather className="mx-auto h-8 w-8 text-leaf" />
            <p className="mt-3 font-heading text-lg tracking-tight text-foreground">
              No letters yet.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Be the first to write one. A letter is for the things too long for the feed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {letters.map((l) => (
              <Link
                key={l.id}
                href={`/letters/${l.id}`}
                // Card link: the canopy edge is the hover, the press sink is the
                // active state it was missing. 0.995 not 0.97, the same as the
                // message thread rows: a full-width card needs only a hint of
                // give, and a deeper scale on a tall card reads as the page
                // jumping. border-color is spelled out because
                // transition-property takes real property names and "colors"
                // is an ident that matches nothing, which would leave the edge
                // snapping. This was the first surface to get that right; the
                // other eleven have followed, and protocol-audit.mjs now
                // refuses the broken form outright.
                className="card-elevated group block rounded-[var(--radius)] border border-border bg-card p-5 transition-[border-color,transform] duration-200 hover:border-canopy/40 active:scale-[0.995] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
                  <Feather className="h-3.5 w-3.5" />
                  Letter
                  <span className="text-muted-foreground/70">· {readMinutes(l.content)} min read</span>
                  {l.cityScope && (
                    <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-sky/10 px-2 py-0.5 text-[10px] normal-case tracking-normal text-sky">
                      <MapPin className="h-2.5 w-2.5" />
                      {l.cityScope} only
                    </span>
                  )}
                </div>
                <h2 className="mt-2 font-heading text-2xl font-bold leading-snug tracking-[-0.01em] text-foreground group-hover:text-leaf">
                  {letterTitle(l.title, l.content, 80)}
                </h2>
                <p className="mt-2 line-clamp-2 text-[14.5px] leading-relaxed text-muted-foreground">
                  {plainExcerpt(l.content, 240)}
                </p>
                <div className="mt-3.5 flex items-center gap-2.5">
                  <IdentityRow
                    user={{ id: l.author.id, name: l.author.name, photoUrl: l.author.photoUrl, birdOverride: l.author.birdOverride }}
                    className="min-w-0 flex-1 gap-2.5"
                    textClassName="flex-1"
                    name={l.author.name}
                    nameClassName="truncate text-[13px] font-semibold leading-none text-foreground"
                    meta={
                      /* metaLine drops the dot beside an empty segment: the
                         Anonymous profile's batch line is "", so its letters
                         read as just the date (owner rule: a middle dot only
                         ever sits BETWEEN elements). batchLine, not
                         formatBatch, so teachers read "Teacher" rather than
                         silently losing their segment. */
                      metaLine(batchLine(l.author), formatDisplayDate(l.createdAt))
                    }
                    metaClassName="truncate leading-none"
                  />
                  <span className="ml-auto inline-flex items-center gap-1 text-sm font-semibold text-leaf opacity-0 transition-opacity group-hover:opacity-100">
                    Read
                    <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {olderHref && (
          /* A plain link, not a load-more button: this is an archive index, it
             is read rather than scrolled, and a link keeps the page a server
             component with a real URL somebody can bookmark or share. */
          <div className="pt-1">
            <Link
              href={olderHref}
              className="inline-flex items-center gap-1.5 rounded-full text-[13px] font-semibold text-canopy underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
            >
              Older letters
              <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
