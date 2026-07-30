/* eslint-disable react-hooks/purity --
   Async Server Component: Date.now() builds the week window for a Prisma query
   on the server, not during a React render. */
import { Feather, Users } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RailCard } from "./rail-card";
import { PUBLISHED_ONLY } from "@/lib/posts";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Below this, the week reads as quiet rather than alive -- hide rather than
// report on the silence.
const MIN_POSTS = 3;
const MIN_AUTHORS = 2;

/**
 * "Signs of life": a small, honest read on how alive the valley has been
 * this week -- sitewide (main feed + groups), since it only ever surfaces
 * aggregate counts, never content. Appears last in the rail, and only when
 * the numbers genuinely say something; a quiet week hides the module
 * entirely instead of shipping a sad, low count.
 */
export async function PulseModule() {
  const weekPosts = await prisma.post.findMany({
    where: {
      isHidden: false,
      ...PUBLISHED_ONLY,
      createdAt: { gte: new Date(Date.now() - WEEK_MS) },
    },
    select: { authorId: true },
  });

  const postCount = weekPosts.length;
  const authorCount = new Set(weekPosts.map((p) => p.authorId)).size;

  if (postCount < MIN_POSTS || authorCount < MIN_AUTHORS) return null;

  return (
    <RailCard label="Signs of life">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          {/* Tint trio, rotated (colour protocol): leaf for posts, sky for
              people, never two of one tint in a card. The old canopy-wash
              pairing is dead. */}
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-leaf/30 bg-leaf/[0.07] text-leaf">
            <Feather className="h-4 w-4" />
          </span>
          <p className="text-[13px] leading-snug text-foreground">
            <span className="font-heading text-[17px] font-semibold">{postCount}</span>{" "}
            posts shared this week
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-sky/35 bg-sky/[0.10] text-sky">
            <Users className="h-4 w-4" />
          </span>
          <p className="text-[13px] leading-snug text-foreground">
            <span className="font-heading text-[17px] font-semibold">{authorCount}</span>{" "}
            people behind them
          </p>
        </div>
      </div>
    </RailCard>
  );
}
