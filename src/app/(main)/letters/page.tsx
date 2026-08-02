import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Feather, MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { DraftsStrip } from "@/components/letters/drafts-strip";
import { Button } from "@/components/ui/button";
import { IdentityRow } from "@/components/common/identity-row";
import { getViewerCities, cityScopeWhere } from "@/lib/city-scope";
import { batchLine, formatDisplayDate, letterTitle, metaLine } from "@/lib/utils";
import { PUBLISHED_ONLY } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Letters",
};

function readTime(content: string) {
  return Math.max(1, Math.round(content.trim().split(/\s+/).filter(Boolean).length / 200));
}

function excerpt(content: string) {
  const plain = content
    .replace(/[*_#>`~]|\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 240 ? plain.slice(0, 240).trimEnd() + "..." : plain;
}

export default async function LettersPage() {
  const session = await auth();
  if (!session?.user) return null;

  const userBatch = `${session.user.batchType}-${session.user.batchYear}`;
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
      OR: [
        { targetBatches: null },
        { targetBatches: "" },
        { targetBatches: { contains: userBatch } },
      ],
      ...(isAdmin ? {} : { AND: [cityScopeWhere(viewerCities)] }),
    },
    include: {
      author: {
        select: { id: true, name: true, avatarColor: true, photoUrl: true, birdOverride: true, accountType: true, batchType: true, batchYear: true },
      },
      _count: { select: { comments: { where: { isHidden: false } }, likes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
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
  const [letters, drafts] = await Promise.all([lettersQuery, draftsQuery]);

  return (
    <div>
      <PageHeader
        title="Letters"
        subtitle="Longer pieces from the valley. Essays, tributes, travelogues, reflections."
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
                // jumping. border-color is spelled out rather than the repo's
                // usual `transition-[colors,...]`, because transition-property
                // takes real property names and "colors" is an ident that
                // matches nothing, which would leave the edge snapping.
                className="card-elevated group block rounded-[var(--radius)] border border-border bg-card p-5 transition-[border-color,transform] duration-200 hover:border-canopy/40 active:scale-[0.995] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
                  <Feather className="h-3.5 w-3.5" />
                  Letter
                  <span className="text-muted-foreground/70">· {readTime(l.content)} min read</span>
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
                  {excerpt(l.content)}
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
      </div>
    </div>
  );
}
