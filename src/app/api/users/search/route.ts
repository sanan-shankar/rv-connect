import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@/lib/auth";
import { requireVerifiedEmail } from "@/lib/email-verification";
import { prisma } from "@/lib/prisma";
import { insensitive, escapeLike } from "@/lib/db-text";
import { rateLimit } from "@/lib/rate-limit";
import { logSearch } from "@/lib/search-log";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Names by query is the directory's Stage 1 capability wearing an API
  // shape (trust model; the harvesting half of audit M1), so it holds the
  // same line: no confirmed email, no names.
  const gate = await requireVerifiedEmail();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  // The read-heavy lookup endpoints share one throttle so a script cannot
  // hammer them the way every write path is already capped.
  const limited = await rateLimit("search", session.user.id);
  if (!limited.ok) {
    return NextResponse.json({ error: limited.error }, { status: 429 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  // Every whitespace-separated token has to appear somewhere in the name, so
  // "afia sh" finds "Afia Shankar" and a trailing space never kills the match.
  const terms = q.split(/\s+/).filter(Boolean);

  const users = await prisma.user.findMany({
    where: {
      AND: terms.map((term) => ({ name: { contains: escapeLike(term), ...insensitive } })),
      isBlocked: false,
      // An account inside its deletion grace window (audit M35) is held out
      // of every people surface the same way a blocked one is.
      deletionRequestedAt: null,
      // This endpoint's only consumers are the Catch-ups people surfaces,
      // and Catch-ups is an alumni feature (owner, 2026-08-18): teachers
      // cannot open the section, so offering them as invitees would only
      // create members who can never attend.
      accountType: { notIn: ["teacher", "ex_teacher"] },
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      avatarColor: true,
      photoUrl: true,
      birdOverride: true,
      batchYear: true,
      // Returned even though the filter above excludes teachers, so the rows
      // that render this can call `batchLine()` and be right on their own
      // terms. A component whose output depends on a `where` clause in a
      // different file is one relaxed filter away from being wrong.
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
      userId: session.user.id,
      results: users.length,
    })
  );

  return NextResponse.json(users);
}
