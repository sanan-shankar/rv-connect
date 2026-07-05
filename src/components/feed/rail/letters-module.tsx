import Link from "next/link";
import { Feather } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/prisma";
import { batchLine, letterTitle, plainExcerpt } from "@/lib/utils";
import { RailCard } from "./rail-card";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * "This week in Letters": the newest Letter posted to the main feed in the
 * trailing 7 days. Scoped to the main feed (groupId null) so a Letter
 * written inside a private group is never surfaced sitewide. Hides entirely
 * outside that window rather than reaching back for something stale, which
 * is what the module's own name promises.
 */
export async function LettersModule() {
  const letter = await prisma.post.findFirst({
    where: {
      kind: "letter",
      isHidden: false,
      groupId: null,
      createdAt: { gte: new Date(Date.now() - WEEK_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      content: true,
      author: {
        select: { name: true, accountType: true, batchType: true, batchYear: true },
      },
    },
  });

  if (!letter) return null;

  const readMinutes = Math.max(
    1,
    Math.round(letter.content.trim().split(/\s+/).filter(Boolean).length / 200)
  );

  return (
    <RailCard label="This week in Letters">
      <Link
        href={`/letters/${letter.id}`}
        className="-m-1 block rounded-md p-1 transition-opacity duration-150 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70"
      >
        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.06em] text-cinnamon">
          <Feather size={13} weight="fill" />
          New letter
        </span>
        <h4 className="mt-1.5 line-clamp-2 font-heading text-[15px] font-semibold leading-snug tracking-[-0.01em] text-foreground">
          {letterTitle(letter.title, letter.content)}
        </h4>
        <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
          {plainExcerpt(letter.content)}
        </p>
        <p className="mt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
          {letter.author.name} · {batchLine(letter.author)} · {readMinutes} min read
        </p>
      </Link>
    </RailCard>
  );
}
