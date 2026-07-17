import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Feather, MapPin } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { LetterComposer } from "@/components/letters/letter-composer";
import { IdentityRow } from "@/components/common/identity-row";
import { getViewerCities, cityScopeWhere } from "@/lib/city-scope";
import { formatBatch, letterTitle } from "@/lib/utils";

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
  const letters = await prisma.post.findMany({
    where: {
      kind: "letter",
      isHidden: false,
      groupId: null,
      OR: [
        { targetBatches: null },
        { targetBatches: "" },
        { targetBatches: { contains: userBatch } },
      ],
      ...(isAdmin ? {} : { AND: [cityScopeWhere(viewerCities)] }),
    },
    include: {
      author: {
        select: { id: true, name: true, avatarColor: true, photoUrl: true, birdOverride: true, batchType: true, batchYear: true },
      },
      _count: { select: { comments: true, likes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Letters"
        subtitle="Longer pieces from the valley. Essays, tributes, travelogues, reflections."
      />

      <div className="space-y-5">
        <LetterComposer userPlaces={viewerCities} />

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
                className="card-elevated group block rounded-[var(--radius)] border border-border bg-card p-5 transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
                <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-3.5">
                  <IdentityRow
                    user={{ id: l.author.id, name: l.author.name, photoUrl: l.author.photoUrl }}
                    className="min-w-0 flex-1 gap-2.5"
                    textClassName="flex-1"
                    name={l.author.name}
                    nameClassName="truncate text-[13px] font-semibold leading-none text-foreground"
                    meta={
                      <>
                        {formatBatch(l.author.batchType, l.author.batchYear)} ·{" "}
                        {new Date(l.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </>
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
