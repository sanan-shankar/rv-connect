import { NextRequest, NextResponse, after } from "next/server";
import { vetLookupRequest } from "@/lib/api-gate";
import { prisma } from "@/lib/prisma";
import { insensitive, escapeLike } from "@/lib/db-text";
import { logSearch } from "@/lib/search-log";
import { FULL_NAME_MAX } from "@/lib/utils";

/** Nobody's name is seven words. Four would do; six leaves room to be wrong. */
const MAX_SEARCH_TERMS = 6;

export async function GET(req: NextRequest) {
  // Names by query is the directory's Stage 1 capability wearing an API shape
  // (the harvesting half of audit M1), so it holds the same line.
  const vet = await vetLookupRequest();
  if (!vet.ok) return vet.response;

  /* Capped at the length of the longest name this app will store. A query
     cannot usefully be longer than the thing it is searching for, and a query
     string is public input: without this, `q` was read straight off the URL at
     whatever length the client felt like (audit M44). */
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, FULL_NAME_MAX);
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  // Every whitespace-separated token has to appear somewhere in the name, so
  // "afia sh" finds "Afia Shankar" and a trailing space never kills the match.
  //
  // Capped, because each token becomes its own ILIKE in an AND: "a b c d ..."
  // built one clause per word with no ceiling, so a crafted query handed
  // Postgres an arbitrarily large conjunction to plan and run. The extra words
  // are dropped rather than refused: every additional token only NARROWS the
  // result, so ignoring the tail returns a superset of what was asked for --
  // the safe direction for a name box, and invisible to anyone typing a real
  // name into it.
  const terms = q.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS);

  // Opt-in, so the default is the whole membership: a caller that forgets the
  // flag gets MORE people, not a silently narrowed list it cannot see is
  // narrowed. The Catch-ups pickers are the ones that pass it.
  const alumniOnly = req.nextUrl.searchParams.get("alumniOnly") === "1";

  const users = await prisma.user.findMany({
    where: {
      AND: terms.map((term) => ({ name: { contains: escapeLike(term), ...insensitive } })),
      isBlocked: false,
      // An account inside its deletion grace window (audit M35) is held out
      // of every people surface the same way a blocked one is.
      deletionRequestedAt: null,
      /* Teachers are held out only when the CALLER says so.
       *
       * This filter was unconditional, under a comment claiming the endpoint's
       * only consumers were the Catch-ups people surfaces. They were not: the
       * composer's @-mention dropdown is the third, and it is the only way to
       * insert a mention -- so a teacher, who is a first-class author here and
       * writes to the feed and the letters like anybody else, could never be
       * mentioned by name (bug-report-2 C-006).
       *
       * Catch-ups is an alumni feature (owner, 2026-08-18) and its two pickers
       * pass alumniOnly=1, which is where that rule belongs: with the surface
       * that has it, not with the endpoint every surface shares. */
      ...(alumniOnly ? { accountType: { notIn: ["teacher", "ex_teacher"] } } : {}),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      birdOverride: true,
      batchYear: true,
      // Returned whether or not the filter above is on, so the rows that
      // render this can call `batchLine()` and be right on their own terms. A
      // component whose output depends on a `where` clause in a different file
      // is one relaxed filter away from being wrong -- and that filter is now
      // relaxed by default.
      accountType: true,
    },
    take: 8,
  });

  /* Recorded here rather than in the browser: this endpoint already knows the
     query AND how many rows it found, and a zero-result search is the useful
     one -- somebody looking for a person this site could not show them.
     after(), not the old `void`: Vercel can freeze or tear down a serverless
     instance the instant the response streams, and a bare `void` write raced
     that teardown and silently lost the row (bug audit Lows 25/35/44/72/77/
     82/87 -- the reason /admin/analytics quietly undercounted with no error
     anywhere). after() keeps this same invocation alive until the write is
     done, so the search itself still returns the moment the rows are ready. */
  after(() =>
    logSearch({
      scope: "people",
      query: q,
      userId: vet.userId,
      results: users.length,
    })
  );

  return NextResponse.json(users);
}
