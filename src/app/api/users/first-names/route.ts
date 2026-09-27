import { NextResponse } from "next/server";
import { vetLookupRequest } from "@/lib/api-gate";
import { prisma } from "@/lib/prisma";

/* ------------------------------------------------------------------ *
 *  The first names the composer recognises as it is written.
 *
 *  The owner, 2026-09-27, of tagging: "do it like iMessage, honestly,
 *  when you detect a name and then [...] it shows that it's clickable
 *  and then you tap on it and then you can select someone's name." A
 *  typed "Arjun" is underlined because somebody here is called Arjun;
 *  tapping it runs the ordinary people search (../search) for "Arjun".
 *
 *  Only the first word of each name, lowercased, deduplicated and
 *  sorted: enough to recognise a name, never enough to say whose it
 *  is. The same gate and the same people as the search it leads to,
 *  so it cannot show anybody the search would not. One request per
 *  composer per ten minutes, which the search's own rate limit covers.
 * ------------------------------------------------------------------ */

export async function GET() {
  const vet = await vetLookupRequest();
  if (!vet.ok) return vet.response;

  const rows = await prisma.user.findMany({
    where: { isBlocked: false, deletionRequestedAt: null },
    select: { name: true },
  });
  const names = new Set<string>();
  for (const { name } of rows) {
    const first = name?.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    // Three letters or more: "Al" or "Jo" would underline half of every post.
    if (first.length >= 3 && /^\p{L}+$/u.test(first)) names.add(first);
  }
  return NextResponse.json([...names].sort(), {
    headers: { "Cache-Control": "private, max-age=600" },
  });
}
