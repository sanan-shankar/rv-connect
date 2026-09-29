import type { Metadata } from "next";
import Link from "@/components/common/link";
import { ListChecks, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AlmostReady } from "@/components/catchups/almost-ready";
import { ArchivedShelf, type ArchivedRow } from "@/components/catchups/index/archived-row";
import { type ListCatchup } from "@/components/catchups/index/catchup-card";
import { CatchupShelf } from "@/components/catchups/index/catchup-shelf-view";
import { type ListEdition } from "@/components/catchups/index/edition-cover-card";
import { NothingHere } from "@/components/catchups/index/nothing-here";
import { catchupShelf, editionSlots } from "@/lib/catchup-shelf";
import { readEditionIds } from "@/lib/catchup-reads";
import { COVER_SHOTS } from "@/lib/catchup-pictures";
import { advanceDueCatchups, isMissingCatchupTable } from "@/lib/catchups";
import { catchupDisplayName, catchupStageLine } from "@/lib/catchups-core";
import type { CatchupStatus, EditionStatus } from "@/lib/catchups-types";
import { formatDayAndDate, formatDisplayDateLong, parseJsonArray } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Catch-ups",
};

/* ------------------------------------------------------------------ *
 *  /catchups -- a shelf of Catch-ups, each one its own photograph.
 *
 *  Rebuilt in build phase 6 from `_list.tsx` at /lab/catchups/sketches,
 *  which he approved, and from spec section 5, which he decided and
 *  nobody had drawn. `architecture.md` section 4 is the reasoning.
 *
 *  WHAT WENT, AND WENT RATHER THAN BEING RESTYLED:
 *
 *  THE RIGHT RAIL, and "Fresh off the press" with it -- the curved
 *  divider, the padding-less hover, the teaser truncated twice, the
 *  empty Edition promoted above an Edition with 133 answers, and the
 *  fact that on a phone the whole rail was `display: none` and always
 *  had been (recon I9, section 12). Its job was to say what is new to
 *  read; a Catch-up showing its own state says that better, in the place
 *  you were already looking. That also answers I1 -- "sort out the stuff
 *  in the left column and the stuff on the right" -- by removing the
 *  right column.
 *
 *  THE VIEW BUTTON, THE THREE DOTS, THE ROW OF BIRDS AND "+18", EVERY
 *  COUNT, AND THE EDITION NUMBER. A card is a door and its whole
 *  rectangle is the target, so there is nothing to right-align beside
 *  anything; and "that's pretty much all the information this is giving
 *  me, because I am not identifying the birds or the people" (brief 23).
 *
 *  THE THREE-COLUMN SORT INTO SHELVES. Two remain: what you are in, and
 *  what you filed away. The thirty-day bin went in build phase 5 with
 *  the word Delete.
 *
 *  ONE QUERY SHAPE, AND ONE FEWER THAN THERE WAS. The old page read
 *  EVERY member of every group the viewer is in, with no `take`, to draw
 *  a five-avatar cluster on each card -- flagged in build phase 4 as
 *  something a batch group (everyone from a year, growing on its own)
 *  would eventually make expensive. The drawn card has no birds on it at
 *  all, so the honest fix was deleting the query rather than bounding
 *  it. 39 rows and 0.4ms became 0.
 * ------------------------------------------------------------------ */

/** Forward-only urgency order: whatever wants something from you first, then
 *  whatever there is to read, then the quiet ones. */
const STATUS_PRIORITY: Partial<Record<EditionStatus, number>> = {
  answering: 0,
  collecting: 1,
  draft: 2,
  published: 3,
  sealed: 3,
};

/** The two real date voices, handed to the pure copy helper so the app spells
 *  a day one way (both are pinned to the valley's own clock). */
const DATE_VOICE = { dayAndDate: formatDayAndDate, longDate: formatDisplayDateLong };

async function loadIndexData(userId: string) {
  // Lazy read-time advance (spec 2.4): bring every stale Edition in the
  // viewer's groups current before building the cards below. Never throws.
  await advanceDueCatchups(userId);

  const memberships = await prisma.groupMember.findMany({
    /* Only groups that HAVE a Catch-up (owner's call, 2026-08-21). A group
       without one used to get a row saying "No Catch-up here yet" with a
       "Start one" button that minted a SECOND group of the same name; he was
       offered the choice between fixing the button and dropping the row, and
       took the row. */
    where: { userId, group: { catchup: { isNot: null } } },
    select: {
      group: {
        select: {
          id: true,
          name: true,
          catchup: {
            select: {
              id: true,
              status: true,
              /* The Catch-up's own name, which a Keeper may now change
                 (`renameCatchup`, build phase 7). This card printed
                 `group.name` bare, so a renamed Catch-up kept its old name
                 here for ever while its home and its browser tab showed the
                 new one -- `revalidatePath("/catchups")` had nothing to
                 invalidate INTO. `catchupDisplayName` is the one spelling of
                 this fallback and every other surface already uses it. */
              title: true,
              pictureSrc: true,
              pictureFocus: true,
              /* The viewer's own copy state, and only the viewer's: the
                 relation filter is what makes archiving personal (bug audit
                 B-063). At most one row, by the unique on (catchupId, userId). */
              prefs: { where: { userId }, select: { archivedAt: true } },
              editions: {
                orderBy: { number: "desc" },
                take: 1,
                select: {
                  id: true,
                  status: true,
                  answersCloseAt: true,
                  publishedAt: true,
                  // A sealed time capsule's opening day, for its stage line.
                  publishAt: true,
                },
              },
            },
          },
        },
      },
    },
  });

  type Row = {
    card: ListCatchup;
    archived: boolean;
    editionStatus: EditionStatus | null;
  };

  const rows: Row[] = [];
  for (const { group } of memberships) {
    // Unreachable: the `where` above only returns groups that have one. Kept
    // as the narrowing Prisma's optional relation requires, and as a refusal
    // rather than a differently-shaped card if that filter ever changes.
    if (!group.catchup) continue;
    const catchupStatus = group.catchup.status as CatchupStatus;
    const raw = group.catchup.editions[0] ?? null;
    const edition = raw ? { ...raw, status: raw.status as EditionStatus } : null;
    rows.push({
      archived: catchupShelf(group.catchup.prefs[0] ?? null) === "archived",
      editionStatus: edition?.status ?? null,
      card: {
        catchupId: group.catchup.id,
        name: catchupDisplayName(group.catchup.title, group.name),
        stage: catchupStageLine(catchupStatus, edition, DATE_VOICE),
        picture: { src: group.catchup.pictureSrc, focus: group.catchup.pictureFocus },
      },
    });
  }

  const live = rows.filter((r) => !r.archived);
  live.sort((a, b) => {
    const pa = STATUS_PRIORITY[a.editionStatus ?? "draft"] ?? 50;
    const pb = STATUS_PRIORITY[b.editionStatus ?? "draft"] ?? 50;
    if (pa !== pb) return pa - pb;
    return a.card.name.localeCompare(b.card.name);
  });

  const archived: ArchivedRow[] = rows
    .filter((r) => r.archived)
    .map((r) => ({ catchupId: r.card.catchupId, name: r.card.name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  /* ── the spare slots (spec section 5) ──────────────────────────────
     The grid holds four things. Catch-up cards come first; the remainder is
     filled with the most recent Editions, newest first, from whichever
     Catch-ups they belong to. An archived Catch-up is off the shelf, so its
     Editions are off it too. */
  const slots = editionSlots(live.length);
  let editions: ListEdition[] = [];
  if (slots > 0) {
    const covers = await prisma.catchupEdition.findMany({
      where: { status: "published", catchupId: { in: live.map((r) => r.card.catchupId) } },
      orderBy: { publishedAt: "desc" },
      take: slots,
      select: {
        id: true,
        publishedAt: true,
        catchup: {
          select: {
            pictureSrc: true,
            pictureFocus: true,
            title: true,
            group: { select: { name: true } },
          },
        },
      },
    });

    /* The photographs, in a second query rather than as a nested `entries`
       select: the biggest live Edition has 143 entries and a cover needs
       three urls off the front of it. Bounded by the number of entries that
       carry a photograph at all, which is 30 on that Edition and 0 on three
       of the five published ones.

       Together with the read marks, because neither depends on the other and
       they are two round trips to a pooler in Mumbai on a page nobody is
       looking at yet. */
    const editionIds = covers.map((c) => c.id);
    const [withPhotos, read] = await Promise.all([
      editionIds.length > 0
        ? prisma.catchupEntry.findMany({
            where: { editionId: { in: editionIds }, images: { not: null } },
            orderBy: { createdAt: "asc" },
            select: { editionId: true, images: true },
          })
        : [],
      readEditionIds(userId, editionIds),
    ]);
    const photosByEdition = new Map<string, string[]>();
    for (const entry of withPhotos) {
      const have = photosByEdition.get(entry.editionId) ?? [];
      if (have.length >= COVER_SHOTS) continue;
      have.push(...parseJsonArray(entry.images));
      photosByEdition.set(entry.editionId, have);
    }

    editions = covers
      .filter((c) => c.publishedAt !== null)
      .map((c) => ({
        editionId: c.id,
        publishedAt: c.publishedAt as Date,
        // The cover caps itself; this just stops a forty-photograph Edition
        // shipping forty urls to the browser to draw three.
        photos: (photosByEdition.get(c.id) ?? []).slice(0, COVER_SHOTS),
        // "we'd have to show the date and from which catch up it is if there's
        // more than one catch up." With one, saying so is the same fact twice.
        fromName:
          live.length > 1
            ? catchupDisplayName(c.catchup.title, c.catchup.group.name)
            : null,
        fallback: { src: c.catchup.pictureSrc, focus: c.catchup.pictureFocus },
        read: read.has(c.id),
      }));
  }

  return { cards: live.map((r) => r.card), archived, editions };
}

export default async function CatchupsPage() {
  const session = await auth();
  if (!session?.user) return null;
  const isAdmin = session.user.role === "admin";

  let data: Awaited<ReturnType<typeof loadIndexData>> | null = null;
  try {
    data = await loadIndexData(session.user.id);
  } catch (err) {
    if (!isMissingCatchupTable(err)) throw err;
  }

  if (!data) {
    return (
      <div>
        <PageHeader guide="catchups" title="Catch-ups" />
        <AlmostReady />
      </div>
    );
  }

  const empty = data.cards.length === 0 && data.archived.length === 0;

  return (
    /* The page's own width, and it is the home's too: past it a television
       gets air on the right rather than a 2,000-pixel line. That is the fault
       he named in his very first sentence about this page (brief 1): "if
       you're on a widescreen or on a TV or something, they just expand and
       take up the whole space. It's not a very scalable, nicely fitting
       thing." The header is inside it, so the CTA lands flush with the cards'
       right edge -- the same rule the rail grid used to enforce. */
    <div className="max-w-[1096px]">
      <PageHeader
        title="Catch-ups"
        guide="catchups"
        actions={
          <>
            {/* The admin's way into every Catch-up on the site, not just the
                ones they are in: the shelf below is memberships, and an admin
                is usually in none of them. `hidden sm:inline-flex` is measured
                -- at 390 the header has 33px of slack and the smallest circle
                in the app plus its gap is 42, so it wraps the title onto two
                lines. On a phone the admin sidebar's own entry is one tap
                from the hamburger. */}
            {isAdmin && (
              <Link href="/admin/catchups" className="hidden sm:inline-flex">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Every Catch-up on the site"
                  title="Every Catch-up on the site"
                >
                  <ListChecks className="h-4 w-4" />
                </Button>
              </Link>
            )}
            {/* The app's standard pill, `default` (h-10, px-4). It was `sm`
                here and he caught it: "the Start a Catch-up pill is a smaller
                pill than every other, than a standard-sized pill in this app."
                A page's primary action is never a size down from the app's. */}
            <Link href="/catchups/new" className="inline-flex">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                Start a Catch-up
              </Button>
            </Link>
          </>
        }
      />

      {empty ? (
        <NothingHere />
      ) : (
        /* ONE box around the shelf and the row under it, and it is not
           decoration. `e2e/visual.spec.ts` masks this page past its header by
           marking the first run of elements that starts clear of it, and as
           two siblings the grid and the Archived row were marked separately --
           which left the 8px between them unmasked, comparing live page
           background on every run. A suite that cries wolf is worse than no
           suite (its own docblock says so). One wrapper, one box, no seam. */
        <div>
          {/* The shelf is a client component because it owns membership: a
              card leaving has to be animated out, and the Undo in its toast
              outlives the card that raised it. Its grid, its two up and the
              reasoning for both are on LIST_GRID. */}
          <CatchupShelf cards={data.cards} editions={data.editions} />
          <ArchivedShelf rows={data.archived} />
        </div>
      )}
    </div>
  );
}
