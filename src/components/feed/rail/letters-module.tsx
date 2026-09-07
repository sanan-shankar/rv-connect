/* eslint-disable react-hooks/purity --
   This is an async Server Component: the body runs once per request on the
   server to build a Prisma query, not inside a React render pass, so Date.now()
   here is not the impurity the rule is guarding against. */
import Link from "next/link";
import { Feather } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/prisma";
import { batchLine, letterTitle, metaLine, plainExcerpt, readMinutes } from "@/lib/utils";
import { RailCard } from "./rail-card";
import { AUTHOR_IN_GOOD_STANDING, PUBLISHED_ONLY, batchScopeWhere } from "@/lib/posts";
import { cityScopeWhere } from "@/lib/city-scope";
import type { RailViewer } from "./rail-viewer";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * "This week in Letters": the newest Letter posted in the trailing 7 days
 * THAT THIS VIEWER MAY READ. Hides entirely outside that window rather than
 * reaching back for something stale, which is what the module's own name
 * promises.
 *
 * The audience filters are not optional decoration. This query used to run with
 * no viewer at all, so a letter written for one city -- or for one batch -- had
 * its title, its opening 160 characters and its author shown to every member on
 * /feed, and anyone outside that audience who clicked it hit the reading page's
 * own check and got a 404. A teaser to a locked door, for as long as that letter
 * was the newest of the week (bug audit B-045). Same two fragments the letters
 * index and loadPosts already apply.
 */
export async function LettersModule({ viewer }: { viewer: RailViewer }) {
  const letter = await prisma.post.findFirst({
    where: {
      kind: "letter",
      isHidden: false,
      ...PUBLISHED_ONLY,
      // Same standing rule as the index it teases from (audit Low 78).
      ...AUTHOR_IN_GOOD_STANDING,
      createdAt: { gte: new Date(Date.now() - WEEK_MS) },
      ...(viewer.isAdmin
        ? {}
        : {
            AND: [cityScopeWhere(viewer.cities)],
            ...batchScopeWhere(viewer.batch),
          }),
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

  const minutes = readMinutes(letter.content);

  return (
    <RailCard label="This week in Letters">
      <Link
        href={`/letters/${letter.id}`}
        // The -m-1/p-1 pair exists to give this block a highlight box, so the
        // hover is now the state layer inside it rather than hover:opacity-80,
        // which dimmed the headline and excerpt instead of lighting the row.
        className="-m-1 block rounded-md p-1 state-layer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
          {metaLine(letter.author.name, batchLine(letter.author), `${minutes} min read`)}
        </p>
      </Link>
    </RailCard>
  );
}
