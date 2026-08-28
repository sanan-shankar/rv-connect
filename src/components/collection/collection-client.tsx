"use client";

/* ------------------------------------------------------------------ *
 *  The Valley Collection: a river of photographs.
 *
 *  The owner set the problem himself and answered half of it: *"is the
 *  plan that I see a bunch of folders because that would, I guess, be
 *  the most organized. Right. I click it, see a bunch of folders, and
 *  then I can click and find the thing I want. But also that is the most
 *  boring... many people aren't using this app that regularly, they just
 *  want to see some nice pictures... we don't want them to navigate a
 *  lot."* And the constraint: *"we don't want it to look like Google
 *  drive or one drive or Dropbox. It's not a file manager. It should
 *  still be a delightful image viewer and archive."*
 *
 *  So: PHOTOGRAPHS FIRST, ALWAYS. Organisation is a lens over them and
 *  never a gate in front of them. There is no folder screen at any
 *  point. /collection opens straight onto justified rows of
 *  photographs, and everything else -- the six buckets, the decade
 *  rail, search, the order -- narrows what is already on the screen,
 *  in place, without navigating.
 *
 *  Three things carry that, each in its own file: <RiverControls> (the
 *  one line of controls that replaced a whole row of dropdown pills),
 *  <DecadeRail> (when, drawn as the archive's own shape rather than
 *  listed in a menu), and <PhotoRiver> (the justified rows and the
 *  decade headings, shared with /lab/collection so the room shows the
 *  real thing).
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SearchPill } from "@/components/layout/search-pill";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { useHeartToggle } from "@/components/posts/use-engagement";
import { appendUnseen } from "@/lib/append-page";
import { PhotoStream } from "@/components/common/photo-rows";
import type { ViewerImage } from "@/components/common/image-viewer";
import {
  adminRemovePhoto,
  deleteOwnPhoto,
  loadPhotos,
  togglePhotoLove,
  type PhotoData,
  type RiverFilters,
  type RiverOrder,
  type RiverPage,
} from "@/app/(main)/collection/actions";
import { areaLabel, bucketLabel } from "@/lib/collection";
import { PhotoRiver, Tile } from "./photo-river";
import { RiverControls } from "./river-controls";
import { DecadeRail, DecadeStrip, type DecadeCount } from "./decade-rail";

/* ------------------------------------------------------------------ *
 *  Both open on a press and neither has any presence on the page until
 *  then, so /collection stops shipping them in its first load. Each is
 *  latched rather than gated straight off its open flag: once opened
 *  they stay mounted, which is what their close animations need.
 * ------------------------------------------------------------------ */
const ImageViewer = dynamic(
  () => import("@/components/common/image-viewer").then((m) => m.ImageViewer),
  { ssr: false }
);
const ContributeDialog = dynamic(
  () => import("./contribute-dialog").then((m) => m.ContributeDialog),
  { ssr: false }
);
const ConfirmDialog = dynamic(
  () => import("@/components/common/confirm-dialog").then((m) => m.ConfirmDialog),
  { ssr: false }
);
const ModerationDialog = dynamic(
  () => import("@/components/admin/moderation-dialog").then((m) => m.ModerationDialog),
  { ssr: false }
);

/** The three strips a viewer can be browsing: the member's own queue, the
 *  river, and the single photograph a shared link landed on. */
type ViewerList = "pending" | "main" | "linked";

/** Map a Collection photograph onto the shared viewer's shape.
 *
 *  Everything /collection/[id] used to be a separate page for is in here now:
 *  the love, the buckets, the Where line and the uploader's own delete. The
 *  owner on that page: "I don't know if we even need that page... That another
 *  page isn't even pretty."
 *
 *  The date is when the photograph was TAKEN, at whatever precision the
 *  contributor gave, and nothing at all when they gave none -- never
 *  `createdAt`, which is the day somebody scanned it. */
function toViewerImage(p: PhotoData, isAdmin: boolean): ViewerImage {
  return {
    src: p.url,
    alt: p.caption ?? undefined,
    caption: p.caption,
    author: { id: p.uploader.id, name: p.uploader.name },
    date: p.takenLabel,
    where: p.area ? areaLabel(p.area) : null,
    tags: [...p.subject.map(bucketLabel), ...p.freeTags],
    href: `/collection/${p.id}`,
    loved: p.loved,
    loveCount: p.loveCount,
    canRemove: p.isOwn || isAdmin,
    removeLabel: p.isOwn ? "Delete this photo" : "Remove this photo",
  };
}

export function CollectionClient({
  pending,
  hasApprovedPhotos,
  firstPage,
  filters,
  isAdmin = false,
  openPhoto = null,
}: {
  pending: PhotoData[];
  hasApprovedPhotos: boolean;
  /** Site moderation. An admin gets the remove-with-a-note flow on somebody
   *  else's photograph, which is what /collection/[id] used to carry. */
  isAdmin?: boolean;
  /** One photograph to open the viewer on at mount: /collection/[id] is no
   *  longer a page of its own, it is this page with the viewer already open
   *  (spec sec. 5). Null on /collection itself. */
  openPhoto?: PhotoData | null;
  /** The view this page was asked for, read off the URL and already applied
   *  to `firstPage` on the server. */
  filters: RiverFilters;
  /** Page one of that view, queried on the server rather than from an effect
   *  after mount: that round trip was 778ms of skeleton locally and 2.9
   *  SECONDS throttled. Every later page comes from the action. */
  firstPage: RiverPage;
}) {
  /* ---------------- the river ---------------- */
  const [photos, setPhotos] = useState<PhotoData[]>(firstPage.photos);
  const [cursor, setCursor] = useState<string | null>(firstPage.nextCursor);
  const [total, setTotal] = useState<number | undefined>(firstPage.total);
  const [decades, setDecades] = useState<DecadeCount[]>(firstPage.decades ?? []);

  /* The server has answered again -- a contribution landed and called
     `router.refresh()`, or the reader came back to this route. Re-seeding from
     the new prop is what makes a newly added photograph appear WITHOUT a
     reload, which is the owner's bug #15: "I just uploaded a photo. This is
     added to the collection, and it doesn't actually add to the collection.
     I'm guessing I have to reload for it to add. And when I reload, it adds."
     It did reload the server component; the grid was seeded from the prop
     once and never listened again.

     Adjust-during-render, React's own pattern, rather than an effect that
     would paint the stale river for a frame first. */
  const [seed, setSeed] = useState(firstPage);
  if (firstPage !== seed) {
    setSeed(firstPage);
    setPhotos(firstPage.photos);
    setCursor(firstPage.nextCursor);
    setTotal(firstPage.total);
    setDecades(firstPage.decades ?? []);
  }

  const [pendingPhotos, setPendingPhotos] = useState<PhotoData[]>(pending);
  const [prevPending, setPrevPending] = useState(pending);
  if (pending !== prevPending) {
    setPrevPending(pending);
    setPendingPhotos(pending);
  }

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  /* ---------------- what is being asked for ---------------- */
  const [bucket, setBucket] = useState(filters.bucket ?? "");
  const [era, setEra] = useState(filters.era ?? "");
  const [order, setOrder] = useState<RiverOrder>(filters.order ?? "newest");
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [search, setSearch] = useState(filters.search ?? "");

  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setSearch(searchInput), 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [searchInput]);

  /* The view, in the address bar. Filtering does not navigate -- the river
     cross-fades in place -- but the state it lands in is written into the URL
     as it goes, so a bucket, a decade or a search is something you can send
     somebody, and the server renders their first page already filtered.
     `history.replaceState` rather than the router: this must not refetch the
     route, and Next supports exactly this for search params.

     NOT UNTIL SOMETHING HAS ACTUALLY MOVED, and that guard is load-bearing
     rather than tidy. On /collection/<id> -- which is this same page with the
     viewer already open on one photograph -- writing the URL on mount rewrote
     it to /collection, and Next reads a replaceState as a navigation: it
     re-rendered the OTHER route, with no `openPhoto` in it, so a shared link
     landed on the archive with the photograph it named nowhere in sight.

     Comparing against the filters this page was asked for, rather than
     latching a ref on the first run, is also what makes it survive
     StrictMode's double-invoked mount effect in development -- which is
     exactly how the ref version let the write through. */
  const asked = useRef(filters);
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) {
      const still =
        bucket === (asked.current.bucket ?? "") &&
        era === (asked.current.era ?? "") &&
        search === (asked.current.search ?? "") &&
        order === (asked.current.order ?? "newest");
      if (still) return;
      moved.current = true;
    }
    const q = new URLSearchParams();
    if (bucket) q.set("bucket", bucket);
    if (era) q.set("when", era);
    if (search) q.set("q", search);
    if (order !== "newest") q.set("order", order);
    const qs = q.toString();
    window.history.replaceState(null, "", `/collection${qs ? `?${qs}` : ""}`);
  }, [bucket, era, search, order]);

  const fetchPage = useCallback(
    (c: string | null) =>
      loadPhotos({
        cursor: c,
        bucket: bucket || undefined,
        era: era || undefined,
        search: search || undefined,
        order,
      }),
    [bucket, era, search, order]
  );

  /* Bumped whenever the query behind this river changes, so a page already in
     the air can tell that it no longer belongs to what is on screen. The feed
     and the directory have carried this since audit Low 75 / M36; the
     Collection was the one list of the three without it (audit C-179). */
  const generation = useRef(0);

  /* The effect below would otherwise re-ask the server, on mount, the question
     it has already answered into `firstPage`. Held against the IDENTITY of the
     first `fetchPage` rather than a one-shot boolean: a boolean also has to
     survive StrictMode's double-invoked mount effect in development.
     `useCallback` hands back a new function whenever the filters change --
     including when they change BACK to the defaults, which should refetch
     rather than re-show a seed that is by then minutes old. */
  const seeded = useRef(fetchPage);

  useEffect(() => {
    if (seeded.current === fetchPage) return;
    let cancelled = false;
    generation.current += 1;
    setLoading(true);
    (async () => {
      // callAction: a rejected fetch (deploy skew, dropped network, expired
      // session) used to leave `loading` true forever and the grid stuck on
      // skeletons with no way out (audit B-042).
      const data = await callAction(() => fetchPage(null));
      if (cancelled) return;
      if ("error" in data) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      setPhotos(data.photos);
      setCursor(data.nextCursor);
      setTotal(data.total);
      setDecades(data.decades ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const more = useCallback(async () => {
    if (!cursor || loadingMore) return;
    const mine = generation.current;
    setLoadingMore(true);
    try {
      const data = await callAction(() => fetchPage(cursor));
      /* The page that came back answers the PREVIOUS question: appending it
         interleaved two result sets and left the cursor pointing into a list
         nobody is looking at (audit C-179). The effect above has already
         loaded the new first page, so dropping this one is the whole fix. */
      if (mine !== generation.current) return;
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      setPhotos((prev) => appendUnseen(prev, data.photos));
      setCursor(data.nextCursor);
    } finally {
      // finally, not a trailing statement: a rejected page used to leave the
      // control that asked for it disabled for the rest of the session
      // (audit B-042).
      setLoadingMore(false);
    }
  }, [cursor, loadingMore, fetchPage]);

  /* Batches arrive as you reach the bottom, which is what the owner noticed
     on his reference gallery: "it was lazy load... it doesn't load all the
     photos on the page... only when you reach the bottom, does it load the
     next batch." The sentinel sits a screen and a half early so the next
     batch is usually already there when the reader arrives.

     Self-correcting when nothing scrolls: if every photograph fits, the
     sentinel is on screen from the start, fires immediately, and keeps firing
     until the river is longer than the window or the cursor runs out. */
  const foot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = foot.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void more();
      },
      { rootMargin: "1200px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, more]);

  /* ---------------- the viewer ---------------- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMounted, setDialogMounted] = useState(false);
  const [viewerMounted, setViewerMounted] = useState(Boolean(openPhoto));
  const [viewer, setViewer] = useState<{ list: ViewerList; index: number } | null>(
    /* A shared link lands here with the viewer already open on its
       photograph, which is the whole of what /collection/[id] now does. It
       rides at the head of its own one-photograph list rather than being
       hunted for in the river: the river is page one of "newest", and a
       photograph somebody linked to is as likely to be four hundred rows
       down it. */
    openPhoto ? { list: "linked", index: 0 } : null
  );
  const [linked, setLinked] = useState<PhotoData[]>(openPhoto ? [openPhoto] : []);
  const [removing, setRemoving] = useState<PhotoData | null>(null);

  const listFor = useCallback(
    (list: ViewerList) => (list === "pending" ? pendingPhotos : list === "linked" ? linked : photos),
    [pendingPhotos, linked, photos]
  );
  const setListFor = useCallback(
    (list: ViewerList, next: (prev: PhotoData[]) => PhotoData[]) => {
      if (list === "pending") setPendingPhotos(next);
      else if (list === "linked") setLinked(next);
      else setPhotos(next);
    },
    []
  );
  // Memoized so the whole (paginated, unbounded) list isn't re-mapped on every
  // unrelated re-render while the viewer sits closed.
  const viewerList = viewer ? listFor(viewer.list) : photos;
  const viewerImages = useMemo(
    () => viewerList.map((p) => toViewerImage(p, isAdmin)),
    [viewerList, isAdmin]
  );

  /** Rewrite one photograph in whichever strip it belongs to. */
  const patch = useCallback(
    (list: ViewerList, id: string, change: (p: PhotoData) => PhotoData) => {
      setListFor(list, (prev) => prev.map((p) => (p.id === id ? change(p) : p)));
    },
    [setListFor]
  );

  /* The heart runs on the app's one optimistic toggle (`useHeartToggle`),
     which carries the three things a hand-rolled flip keeps forgetting: a ref
     that refuses a double tap in the same tick `disabled` would only catch on
     the next render (C-010/C-178), a rollback to where the count BEGAN, and
     adopting what the row actually says over what the tap assumed (C-133). */
  const loveTarget = useRef<{ list: ViewerList; photo: PhotoData } | null>(null);
  const fireLove = useHeartToggle(() => togglePhotoLove(loveTarget.current!.photo.id));

  function handleToggleLove(index: number) {
    if (!viewer) return;
    const photo = listFor(viewer.list)[index];
    if (!photo) return;
    loveTarget.current = { list: viewer.list, photo };
    /* Written back into the strip the photograph came from, so the river
       behind the viewer holds the same fact: a heart pressed full-screen is
       already lit on the tile when the viewer closes. */
    void fireLove({ liked: photo.loved, count: photo.loveCount }, ({ liked, count }) =>
      patch(viewer.list, photo.id, (p) => ({ ...p, loved: liked, loveCount: count }))
    );
  }

  /** A photograph is gone: out of every strip that holds it, and out of the
   *  viewer, which was showing the thing that no longer exists. */
  function forget(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
    setPendingPhotos((prev) => prev.filter((p) => p.id !== id));
    setLinked((prev) => prev.filter((p) => p.id !== id));
    setTotal((t) => (t === undefined ? t : Math.max(0, t - 1)));
    setViewer(null);
    setRemoving(null);
  }

  /* ---------------- what to draw ---------------- */
  const hasQuery = !!(bucket || era || search);
  // Truly empty: nothing has ever been added, no filter is even active.
  // Distinct from filtered-to-zero. Resolved from the server-computed
  // `hasApprovedPhotos`, not from client fetch state, which only settles after
  // mount and so flashed the controls in on first paint and out again.
  const trulyEmpty = !hasQuery && pendingPhotos.length === 0 && !hasApprovedPhotos;
  const noMatches = !loading && hasQuery && photos.length === 0;

  const openContribute = () => {
    setDialogMounted(true);
    setDialogOpen(true);
  };

  return (
    <div>
      <PageHeader
        guide="collection"
        title="The Valley Collection"
        actions={
          <>
            {!trulyEmpty && (
              /* The app's one expand-on-press search, in its live mode: the
                 icon rests on the title line and opens into a field, so the
                 box never eats a row of its own. It reads the caption, the
                 Where line, the old free tags and the contributor's name --
                 everything anybody wrote in prose (spec sec. 7.2). */
              <SearchPill
                value={searchInput}
                onChange={setSearchInput}
                placeholder="Search the Collection"
                label="Search photographs by caption, place or contributor"
                restLabel="Search the Collection"
              />
            )}
            {!trulyEmpty && (
              <Button variant="primary" className="rounded-full" onClick={openContribute}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Contribute</span>
              </Button>
            )}
          </>
        }
      />

      {trulyEmpty ? (
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-14 text-center">
          <p className="font-heading text-xl tracking-tight text-foreground">
            The collection is just beginning.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            The first photographs of the valley will live here: the banyan, Rishi Konda, the
            birds, the light. Add the first one.
          </p>
          <Button variant="primary" className="mt-5 rounded-full" onClick={openContribute}>
            <Plus className="h-4 w-4" />
            Contribute a photo
          </Button>
        </div>
      ) : (
        <>
          <RiverControls
            bucket={bucket}
            onBucket={setBucket}
            order={order}
            onOrder={setOrder}
            total={loading ? undefined : total}
          />
          <DecadeStrip decades={decades} value={era} onChange={setEra} className="mt-1" />

          {/* The controls sit closer to the river than the title sits to the
              controls (16px against the header's 24px), so the line of buckets
              reads as belonging to the photographs under it rather than
              floating between the two. It was 4px, which read as glued on. */}
          <div className="mt-4 flex items-start gap-6 xl:gap-8">
            <div className="min-w-0 flex-1">
              {pendingPhotos.length > 0 && (
                <div className="mb-6">
                  <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                    Awaiting review
                  </h2>
                  <PhotoStream photos={pendingPhotos} keyOf={(p) => p.id}>
                    {(p, i, cell) => (
                      <Tile
                        photo={p}
                        cell={cell}
                        onOpen={() => {
                          setViewerMounted(true);
                          setViewer({ list: "pending", index: i });
                        }}
                      />
                    )}
                  </PhotoStream>
                </div>
              )}

              {noMatches ? (
                <div className="rounded-[var(--radius)] border border-border bg-card p-14 text-center">
                  <p className="font-heading text-xl tracking-tight text-foreground">
                    Nothing here yet.
                  </p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                    {search
                      ? `No photograph mentions "${search}".`
                      : "No photograph has been filed under this."}{" "}
                    Try a wider bucket, or another decade.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5 rounded-full"
                    onClick={() => {
                      setBucket("");
                      setEra("");
                      setSearchInput("");
                      setSearch("");
                    }}
                  >
                    Show everything
                  </Button>
                </div>
              ) : (
                <PhotoRiver
                  photos={photos}
                  order={order}
                  dimmed={loading}
                  onOpen={(index) => {
                    setViewerMounted(true);
                    setViewer({ list: "main", index });
                  }}
                />
              )}

              {/* The foot. A sentinel the observer watches, and a line that
                  says what is happening when it fires. */}
              <div ref={foot} aria-hidden className="h-px" />
              {cursor && (
                <p className="py-6 text-center text-[13px] text-muted-foreground">
                  {loadingMore ? "Gathering more..." : " "}
                </p>
              )}
            </div>

            <DecadeRail decades={decades} value={era} onChange={setEra} />
          </div>
        </>
      )}

      {/* Outside the river's branches: a shared link opens the viewer on a
          photograph that may not be in this page of it at all, and an empty or
          filtered river must not swallow it. */}
      {viewerMounted && (
        <ImageViewer
          images={viewerImages}
          initialIndex={viewer?.index ?? 0}
          open={viewer !== null}
          onClose={() => setViewer(null)}
          /* "2 of 24" is a fact about a post and noise about an archive: the
             owner, on this counter, "I don't know if showing that two of two
             thing is important, at least in collection". */
          showCount={false}
          onToggleLove={handleToggleLove}
          onRemove={(i) => setRemoving(viewerList[i] ?? null)}
        />
      )}

      {/* Taking a photograph down. The member's own is a plain confirm; an
          admin removing somebody else's takes the warm note, which is the same
          flow /collection/[id] carried and the same one the feed uses. */}
      {removing?.isOwn && (
        <ConfirmDialog
          open
          onClose={() => setRemoving(null)}
          title="Delete this photograph?"
          description="It leaves the Collection for everyone, and the file itself is deleted. This cannot be undone."
          actionLabel="Delete"
          onConfirm={async () => {
            const res = await callAction(() => deleteOwnPhoto(removing.id));
            if ("error" in res && res.error) return { error: res.error };
            forget(removing.id);
            toast.success("The photograph has been taken down.");
          }}
        />
      )}
      {removing && !removing.isOwn && (
        <ModerationDialog
          open
          onClose={() => setRemoving(null)}
          itemLabel="photo"
          onConfirm={async (note) => {
            const res = await callAction(() => adminRemovePhoto(removing.id, note || undefined));
            if ("error" in res && res.error) return { error: res.error };
            forget(removing.id);
            return {};
          }}
        />
      )}

      {dialogMounted && <ContributeDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </div>
  );
}
