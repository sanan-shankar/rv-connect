/* ------------------------------------------------------------------ *
 *  The real Round, loaded once for every sketch.
 *
 *  Read-only, through the same loader the shipped reader uses
 *  (`loadPublishedRoundView`), so a sketch is drawn against exactly what
 *  a member sees today: the same anonymity rule, the same song rule, the
 *  same measured photographs. Nothing here writes, and nothing here
 *  advances a Round's clock.
 *
 *  Which Round: the published one with the most answers, which is "in the
 *  loop" Round 1 (133 answers, 13 people, 11 questions) on the live
 *  database. Not pinned to its id, so a database without it (the demo)
 *  still renders something rather than a 404.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import { loadPublishedRoundView } from "@/lib/catchups-round-view";
import { catchupDisplayName } from "@/lib/catchups-core";
import { promptKind } from "@/lib/catchups-types";
import { IDENTITY_SELECT } from "@/lib/people-select";
import { batchLine } from "@/lib/utils";
import type { SketchEntry, SketchPerson, SketchRound } from "./_types";

const MEMBER_SELECT = {
  role: true,
  user: { select: { ...IDENTITY_SELECT, batchYear: true, accountType: true, batchType: true } },
} as const;

type MemberRow = { role: string; user: { id: string; name: string; photoUrl: string | null; birdOverride: string | null; batchYear: number | null; accountType: string | null; batchType: string | null } };

function person(u: MemberRow["user"], isKeeper: boolean): SketchPerson {
  return {
    id: u.id,
    name: u.name,
    batchYear: u.batchYear,
    batchLine: batchLine(u),
    photoUrl: u.photoUrl,
    birdOverride: u.birdOverride,
    isKeeper,
  };
}

/** 0 to 4, stable per id, skewed so about two in five answers show none. */
function inventedCommentCount(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const n = h % 7;
  return n < 3 ? 0 : n - 2;
}

export async function loadSketchRound(viewerId: string): Promise<SketchRound | null> {
  const edition = await prisma.catchupEdition.findFirst({
    where: { status: "published" },
    orderBy: [{ entries: { _count: "desc" } }, { publishedAt: "desc" }],
    select: {
      id: true,
      number: true,
      publishedAt: true,
      catchup: {
        select: {
          id: true,
          title: true,
          cadence: true,
          createdById: true,
          nextOpensAt: true,
          group: { select: { id: true, name: true, members: { select: MEMBER_SELECT } } },
        },
      },
    },
  });
  if (!edition || !edition.publishedAt) return null;

  const view = await loadPublishedRoundView(edition.id, viewerId);
  if (!view) return null;

  const keeperId = edition.catchup.createdById;
  const byId = new Map<string, SketchPerson>();
  for (const m of edition.catchup.group.members as MemberRow[]) {
    byId.set(m.user.id, person(m.user, m.user.id === keeperId || m.role === "admin"));
  }
  const members = [...byId.values()].sort((a, b) =>
    a.isKeeper === b.isKeeper ? a.name.localeCompare(b.name) : a.isKeeper ? -1 : 1
  );

  /* The reader's view carries a lighter person ref; look the full one up by
     id so every answer's author has a batch line and a Keeper flag. */
  const resolve = (ref: { id: string; name: string; photoUrl?: string | null; birdOverride?: string | null }): SketchPerson =>
    byId.get(ref.id) ?? {
      id: ref.id,
      name: ref.name,
      batchYear: null,
      batchLine: "Member",
      photoUrl: ref.photoUrl ?? null,
      birdOverride: ref.birdOverride ?? null,
      isKeeper: false,
    };

  const contributors: SketchPerson[] = [];
  const seen = new Set<string>();
  const questions = view.sections.map((s) => ({
    id: s.prompt.id,
    text: s.prompt.text,
    kind: promptKind(s.prompt.category),
    showAsker: s.prompt.showAsker,
    asker: s.prompt.asker ? resolve(s.prompt.asker) : null,
    entries: s.entries.map((e): SketchEntry => {
      const author = resolve(e.author);
      if (!seen.has(author.id)) {
        seen.add(author.id);
        contributors.push(author);
      }
      return {
        id: e.id,
        author,
        body: e.body,
        images: e.images,
        photos: e.photos,
        song: e.song,
        loveCount: e.loveCount,
        lovedByViewer: e.lovedByViewer,
        createdAt: new Date(e.createdAt).toISOString(),
        commentCount: inventedCommentCount(e.id),
      };
    }),
  }));

  const viewer = byId.get(viewerId) ?? members[0];

  return {
    catchupId: edition.catchup.id,
    catchupName: catchupDisplayName(edition.catchup.title, edition.catchup.group.name),
    number: edition.number,
    publishedAt: edition.publishedAt.toISOString(),
    nextOpensAt: edition.catchup.nextOpensAt?.toISOString() ?? null,
    cadence: edition.catchup.cadence,
    members,
    contributors,
    questions,
    viewer,
  };
}
