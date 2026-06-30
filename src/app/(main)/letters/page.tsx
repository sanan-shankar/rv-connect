import Link from "next/link";
import { ArrowRight, Feather } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { LetterComposer } from "@/components/letters/letter-composer";
import { BirdAvatar } from "@/components/common/bird-avatar";
import { formatBatch } from "@/lib/utils";

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
  return firstLine.length > 80 ? firstLine.slice(0, 80).trimEnd() + "..." : firstLine;
}

export default async function LettersPage() {
  const session = await auth();
  if (!session?.user) return null;

  const userBatch = `${session.user.batchType}-${session.user.batchYear}`;
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
    },
    include: {
      author: {
        select: { id: true, name: true, avatarColor: true, batchType: true, batchYear: true },
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

      {/* "Dear friend" signature flourish. A handwritten line draws on under the
          title via SVG stroke-dashoffset (the established Letters draw technique),
          with a small cinnamon quill that fades in after. Pure CSS keyframes so it
          works inside this server component without a client child. transform/opacity
          and stroke-dashoffset only. Scoped to .letters-flourish so nothing leaks. */}
      <style>{`
        .letters-flourish { --draw: 220; }
        .letters-flourish-line { display: inline-flex; align-items: flex-end; gap: 9px; }
        .letters-flourish-word {
          font-family: var(--font-display, Georgia, serif);
          font-size: 1.0625rem;
          font-style: italic;
          letter-spacing: 0.01em;
          color: var(--color-cinnamon);
          opacity: 0;
          transform: translateY(4px);
          animation: lettersFlourishWord 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.05s both;
        }
        .letters-flourish-stroke {
          stroke-dasharray: var(--draw);
          stroke-dashoffset: var(--draw);
          animation: lettersFlourishDraw 1.05s cubic-bezier(0.4, 0, 0.2, 1) 0.18s forwards;
        }
        .letters-flourish-quill {
          opacity: 0;
          transform-box: view-box;
          transform-origin: 6px 18px;
          animation: lettersFlourishQuill 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.8s both;
        }
        @keyframes lettersFlourishWord {
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lettersFlourishDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes lettersFlourishQuill {
          0%   { opacity: 0; transform: rotate(-8deg); }
          55%  { opacity: 1; transform: rotate(9deg); }
          80%  { transform: rotate(-3deg); }
          100% { opacity: 1; transform: rotate(0deg); }
        }
      `}</style>
      <div className="letters-flourish -mt-1 mb-5 select-none" aria-hidden>
        <span className="letters-flourish-line">
          <span className="letters-flourish-word">Dear friend,</span>
          <svg width="118" height="22" viewBox="0 0 118 22" fill="none">
            <path
              className="letters-flourish-stroke"
              d="M2 14 C26 6, 52 6, 78 12 C92 15, 104 13, 116 5"
              stroke="var(--color-cinnamon)"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
          <svg
            className="letters-flourish-quill"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M19 4c-7 0-12 4-13 12l-2 4 4-2c8-1 12-6 11-14Z"
              fill="var(--color-cinnamon)"
              opacity="0.92"
            />
            <path
              d="M16 7C12 9 9 12 7 16"
              stroke="var(--color-leaf)"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.65"
            />
          </svg>
        </span>
      </div>

      <div className="space-y-5">
        <LetterComposer />

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
                </div>
                <h2 className="mt-2 font-heading text-2xl font-bold leading-snug tracking-[-0.01em] text-foreground group-hover:text-leaf">
                  {letterTitle(l.title, l.content)}
                </h2>
                <p className="mt-2 line-clamp-2 text-[14.5px] leading-relaxed text-muted-foreground">
                  {excerpt(l.content)}
                </p>
                <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-3.5">
                  <BirdAvatar user={{ id: l.author.id, name: l.author.name }} size="sm" />
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-[13px] font-semibold text-foreground">
                      {l.author.name}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {formatBatch(l.author.batchType, l.author.batchYear)} ·{" "}
                      {new Date(l.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
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
