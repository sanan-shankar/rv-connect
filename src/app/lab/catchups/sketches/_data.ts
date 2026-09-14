/* ------------------------------------------------------------------ *
 *  The real Edition, loaded once for every sketch.
 *
 *  Read-only, through the same loader the shipped reader uses
 *  (`loadPublishedEditionView`), so a sketch is drawn against exactly what
 *  a member sees today: the same anonymity rule, the same song rule, the
 *  same measured photographs. Nothing here writes, and nothing here
 *  advances an Edition's clock.
 *
 *  Which Edition: the published one with the most answers, which is "in the
 *  loop" Edition 1 (133 answers, 13 people, 11 questions) on the live
 *  database. Not pinned to its id, so a database without it (the demo)
 *  still renders something rather than a 404.
 * ------------------------------------------------------------------ */

import { prisma } from "@/lib/prisma";
import { loadPublishedEditionView } from "@/lib/catchups-edition-view";
import { askerVisible, catchupDisplayName } from "@/lib/catchups-core";
import { promptKind } from "@/lib/catchups-types";
import { IDENTITY_SELECT } from "@/lib/people-select";
import { batchLine } from "@/lib/utils";
import { resolveMedia, stripLinks } from "./_media";
import type { SketchEntry, SketchPerson, SketchEdition } from "./_types";

const MEMBER_SELECT = {
  role: true,
  user: {
    select: {
      ...IDENTITY_SELECT,
      batchYear: true,
      accountType: true,
      batchType: true,
    },
  },
} as const;

type MemberRow = {
  role: string;
  user: {
    id: string;
    name: string;
    photoUrl: string | null;
    birdOverride: string | null;
    batchYear: number | null;
    accountType: string | null;
    batchType: string | null;
  };
};

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

export async function loadSketchEdition(
  viewerId: string,
): Promise<SketchEdition | null> {
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
          group: {
            select: {
              id: true,
              name: true,
              members: { select: MEMBER_SELECT },
            },
          },
        },
      },
    },
  });
  if (!edition || !edition.publishedAt) return null;

  const view = await loadPublishedEditionView(edition.id, viewerId);
  if (!view) return null;

  const keeperId = edition.catchup.createdById;
  const byId = new Map<string, SketchPerson>();
  for (const m of edition.catchup.group.members as MemberRow[]) {
    byId.set(
      m.user.id,
      person(m.user, m.user.id === keeperId || m.role === "admin"),
    );
  }
  const members = [...byId.values()].sort((a, b) =>
    a.isKeeper === b.isKeeper
      ? a.name.localeCompare(b.name)
      : a.isKeeper
        ? -1
        : 1,
  );

  /* The reader's view carries a lighter person ref; look the full one up by
     id so every answer's author has a batch line and a Keeper flag. */
  const resolve = (ref: {
    id: string;
    name: string;
    photoUrl?: string | null;
    birdOverride?: string | null;
  }): SketchPerson =>
    byId.get(ref.id) ?? {
      id: ref.id,
      name: ref.name,
      batchYear: null,
      batchLine: "Member",
      photoUrl: ref.photoUrl ?? null,
      birdOverride: ref.birdOverride ?? null,
      isKeeper: false,
    };

  /* Resolve every pasted link in the Edition up front, in one wave, rather
     than per answer as it renders: seven links across four answers, and
     _media.ts caches them for the life of the process. */
  const mediaByEntry = new Map<
    string,
    Awaited<ReturnType<typeof resolveMedia>>
  >();
  await Promise.all(
    view.sections.flatMap((s) =>
      s.entries.map(async (e) => {
        const m = await resolveMedia(e.body);
        if (m.length) mediaByEntry.set(e.id, m);
      }),
    ),
  );

  const contributors: SketchPerson[] = [];
  const seen = new Set<string>();
  const questions = view.sections.map((s) => {
    /* The shared view has already applied the anonymity rule (a hidden
       asker arrives as null), so this cannot reveal anyone. It asks the one
       helper anyway, because every surface that decides an asker must, and
       `catchups-core.test.mjs` sweeps the renderers to make sure of it. */
    const asker =
      s.prompt.asker &&
      askerVisible(
        { showAsker: s.prompt.showAsker, authorId: s.prompt.asker.id },
        viewerId,
      )
        ? resolve(s.prompt.asker)
        : null;
    /* Only a member-written question names its asker. A library question's
       "author" is whoever picked it off a list, and "Asked by Siddhant" would
       be a lie about a prompt he chose rather than wrote. */
    const askedBy = s.prompt.source === "member" && asker ? asker.name : null;
    return {
      id: s.prompt.id,
      text: s.prompt.text,
      kind: promptKind(s.prompt.category),
      source: s.prompt.source,
      showAsker: s.prompt.showAsker,
      asker,
      askedBy,
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
          /* The song columns are dead (build phase 10). A link the real loader
             resolved is now taken OUT of `e.body`, so the room's own body
             resolver would never see it: the loader's song cards are handed
             over first, and the room's own finds fill in behind them. */
          song: null,
          media: [
            /* Every card, a page's included: the loader has already taken
               each of these links out of `e.body`, so dropping one here would
               lose it from the room altogether (F38). */
            ...e.links.map((l) => ({
              platform: l.kind,
              url: l.url,
              title: l.title,
              by: l.subtitle,
              art: l.thumbUrl,
            })),
            ...(mediaByEntry.get(e.id) ?? []).filter((m) => !e.links.some((l) => l.url === m.url)),
          ],
          text: stripLinks(e.body),
          loveCount: e.loveCount,
          lovedByViewer: e.lovedByViewer,
          createdAt: new Date(e.createdAt).toISOString(),
          commentCount: inventedCommentCount(e.id),
        };
      }),
    };
  });

  const viewer = byId.get(viewerId) ?? members[0];

  return {
    catchupId: edition.catchup.id,
    catchupName: catchupDisplayName(
      edition.catchup.title,
      edition.catchup.group.name,
    ),
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
