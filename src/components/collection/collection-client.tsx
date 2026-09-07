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
 *  photographs, and everything else -- the six buckets, the year
 *  rail, search, the order -- narrows what is already on the screen,
 *  in place, without navigating.
 *
 *  Three things carry that, each in its own file: <RiverControls> (the
 *  one line of controls that replaced a whole row of dropdown pills),
 *  <YearRail> (when, drawn as the archive's own shape rather than
 *  listed in a menu), and <PhotoRiver> (the justified rows and the
 *  year headings, shared with /lab/collection so the room shows the
 *  real thing).
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { SearchPill } from "@/components/layout/search-pill";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { useClosingDialog } from "@/components/common/use-closing-dialog";
import { useHeartToggle } from "@/components/posts/use-engagement";
import { appendUnseen, prependUnseen } from "@/lib/append-page";
import { PhotoStream } from "@/components/common/photo-rows";
import { cn } from "@/lib/utils";
import { LazyImageViewer } from "@/components/common/lazy-image-viewer";
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
import { HALVES, bandKeyOf, defaultOrderFor } from "@/lib/collection";
import { toViewerImage } from "@/lib/collection-viewer-image";
import type { PhotoScope } from "@/lib/photo-visibility-rule";
import type { ScopeFacts } from "@/app/(main)/collection/collection-data";
import { PhotoRiver, Tile, landAt, warmThumbs } from "./photo-river";
import { OrderMenu, RiverControls } from "./river-controls";
import { ScopeCaret } from "./scope-caret";
import { YearRail, type BandCount } from "./year-rail";
import { PhotoScrubber } from "./photo-scrubber";

/* ------------------------------------------------------------------ *
 *  Both open on a press and neither has any presence on the page until
 *  then, so /collection stops shipping them in its first load. Each is
 *  latched rather than gated straight off its open flag: once opened
 *  they stay mounted, which is what their close animations need.
 * ------------------------------------------------------------------ */
const ConfirmDialog = dynamic(
  () => import("@/components/common/confirm-dialog").then((m) => m.ConfirmDialog),
  { ssr: false }
);
const ContributeDialog = dynamic(
  () => import("./contribute-room").then((m) => m.ContributeDialog),
  { ssr: false }
);
const ModerationDialog = dynamic(
  () => import("@/components/admin/moderation-dialog").then((m) => m.ModerationDialog),
  { ssr: false }
);
const EditPhotoDialog = dynamic(
  () => import("./edit-photo-dialog").then((m) => m.EditPhotoDialog),
  { ssr: false }
);

/** The three strips a viewer can be browsing: the member's own queue, the
 *  river, and the single photograph a shared link landed on. */
type ViewerList = "pending" | "main" | "linked";

export function CollectionClient({
  pending,
  hasApprovedPhotos,
  scopeFacts,
  canSeeClass = false,
  myClassYear = null,
  firstPage,
  filters,
  isAdmin = false,
  autoApproved = false,
  roomLeft = 0,
  openPhoto = null,
}: {
  pending: PhotoData[];
  hasApprovedPhotos: boolean;
  /** The same three facts for EVERY half this member may read, because
   *  swapping halves happens in the browser and all three are per-half. The
   *  flat props above are the rendered half's, kept because that is what the
   *  permalink route and the tests pass; this is what a swap reads. */
  scopeFacts?: ScopeFacts;
  /** Whether this member may read a Class Collection at all: verified, with a
   *  batch year. Resolved server-side through the SAME `photoScopeWhere` the
   *  river and the permalink use, so the switch cannot offer a half the
   *  server would then refuse. */
  canSeeClass?: boolean;
  /** Their class, as four digits, or null. Only ever used to say which class
   *  is empty; the audience itself is never taken from the client. */
  myClassYear?: string | null;
  /** Whether this member's contributions go straight in, and how many more
   *  their account may hold. Both are things the contribute pop-up promises
   *  before a file is chosen, so both arrive with the page. */
  autoApproved?: boolean;
  roomLeft?: number;
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
  /* The other edge: a cursor for climbing back UP toward newer photographs,
     which only exists once the year rail has seeked mid-river. See
     `loadNewer` and the note on `RiverPage.topCursor`. */
  const [topCursor, setTopCursor] = useState<string | null>(firstPage.topCursor ?? null);
  const [bands, setBands] = useState<BandCount[]>(firstPage.bands ?? []);

  /* THE ORDER THE PHOTOGRAPHS ON SCREEN WERE FETCHED IN, which is a different
     fact from `order` below -- that one is the order that has been ASKED for.
     They part company for the second or two between pressing Chronological
     and the chronological page arriving, and everything the river draws about
     time has to follow this one rather than the request.
     Drawn from `order`, the river spent that second cutting an
     upload-ordered list into year chapters, which is where the duplicate
     section keys came from (see PhotoRiver) and why a year heading appeared
     under Newest at all. The rail lit the wrong year in the same window. */
  const [riverOrder, setRiverOrder] = useState<RiverOrder>(filters.order ?? "newest");

  /* The server has answered again -- a contribution landed and called
     `router.refresh()`, or the reader came back to this route. Re-seeding from
     the new prop is what makes a newly added photograph appear WITHOUT a
     reload, which is the owner's bug #15: "I just uploaded a photo. This is
     added to the collection, and it doesn't actually add to the collection.
     I'm guessing I have to reload for it to add. And when I reload, it adds."
     It did reload the server component; the grid was seeded from the prop
     once and never listened again.

     Adjust-during-render, React's own pattern, rather than an effect that
     would paint the stale river for a frame first.

     ONLY WHEN THE SERVER HAS SOMETHING THE RIVER LACKS. The prop also
     arrives, unasked, after every server action: Next re-fetches this
     route's tree once an action completes (measured -- one RSC GET per
     `loadPhotos` call, `navigateToUnknownRoute` in the trace, with
     PostHog's history patch sitting between Next's router and its own
     patched `replaceState`). Re-seeding blindly on each of those threw
     away every page the reader had scrolled into, and with a `?when=` in
     the address it was a closed loop: the server's page is seeked to that
     decade, so it carries a `topCursor`; adopting it re-armed the head
     sentinel; the prepend it fired was itself an action; and the tree came
     back again. The owner watched it run: "a weird loop of switching from
     2020s to undated ... forever until I reload." A server page whose every
     photograph is already on screen is not news, and is ignored.

     AND ONLY WHILE THE RIVER IS STILL THAT ONE PAGE. `firstPage` is page one
     and adopting it REPLACES the river, so a reader who has walked away from
     page one -- scrolled down into a second and a third, or climbed back up
     out of a seek -- loses every one of them and lands somewhere they did not
     ask to be. The owner, after taking a photograph down: "the page kinda
     reloaded when it should stay the same cause now i've lost track of where I
     was."

     Both cursors answer that, because they are how the river records having
     walked: `cursor` moves when a page arrives at the foot, `topCursor` when
     one arrives at the head. Still equal to the seed's and the river is the
     seed, so replacing it with its own successor costs nothing. Moved, and the
     server's page one is no longer a description of what is on screen. The
     price is that a contribution made from deep in a long river waits for the
     next visit to show up, which is the cheaper of the two disappointments. */
  const [seed, setSeed] = useState(firstPage);
  if (firstPage !== seed) {
    const walked = cursor !== seed.nextCursor || topCursor !== (seed.topCursor ?? null);
    setSeed(firstPage);
    // Asked through the shared dedupe rather than a Set of ids here, and the
    // helper's answer IS the question: would appending the server's page add
    // a single photograph the river does not already show?
    if (!walked && appendUnseen(photos, firstPage.photos).length > photos.length) {
      setPhotos(firstPage.photos);
      setCursor(firstPage.nextCursor);
      setTopCursor(firstPage.topCursor ?? null);
      setBands(firstPage.bands ?? []);
      setRiverOrder(filters.order ?? "newest");
    }
  }

  /* THE QUEUE IS PER HALF, so it is held per half. Kept as one record rather
     than one list reset on every swap: a list would have to be re-seeded at
     the exact moment `scope` changes, and getting that ordering wrong is how
     the valley's queue ended up drawn over the Class Collection. Indexed, it
     is simply always the right one. */
  const [queues, setQueues] = useState<Partial<Record<PhotoScope, PhotoData[]>>>(() => ({
    valley: scopeFacts?.valley.pending ?? [],
    class: scopeFacts?.class?.pending ?? [],
    [filters.scope ?? "valley"]: pending,
  }));
  const [prevPending, setPrevPending] = useState(pending);
  if (pending !== prevPending) {
    setPrevPending(pending);
    setQueues({
      valley: scopeFacts?.valley.pending ?? [],
      class: scopeFacts?.class?.pending ?? [],
      [filters.scope ?? "valley"]: pending,
    });
  }

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  /* ---------------- what is being asked for ---------------- */
  /* WHICH HALF of the Collection. A fifth query dimension beside the bucket,
     the search, the order and the seek -- deliberately NOT delivered as a new
     server-rendered `firstPage`, which would fight the reseed guard above
     instead of using it. Routed through `fetchPage` it inherits the whole
     apparatus for nothing: the dim-hold-swap, the thumbnail pre-warm, the
     landing rules and the URL sync (spec sec. 5.5). */
  const [scope, setScope] = useState<PhotoScope>(filters.scope ?? "valley");
  /* The half on screen's own facts. `scopeFacts` is the server's answer for
     every half this member may read; the flat props are the rendered half's,
     and stand in for a route that has not been taught the map. */
  const facts = scopeFacts?.[scope] ?? { pending, hasApprovedPhotos, roomLeft };
  const pendingPhotos = queues[scope] ?? facts.pending;

  const [bucket, setBucket] = useState(filters.bucket ?? "");
  const [order, setOrder] = useState<RiverOrder>(filters.order ?? "newest");
  const [searchInput, setSearchInput] = useState(filters.search ?? "");
  const [search, setSearch] = useState(filters.search ?? "");
  const [loadingNewer, setLoadingNewer] = useState(false);

  /* WHERE THE RIVER STARTS, which is the whole of what the year rail sets.
     It is not a filter and it does not narrow anything: the server reads it
     on the first page only, to pick the row to begin at, and ignores it on
     every page after (see `RiverFilters.band`). So it rides in the query state
     beside the bucket and the search rather than being fetched by hand --
     which is what makes pressing a year a single state change that the one
     query effect below already knows how to service, instead of a second
     copy of that fetch racing it. */
  const [seekBand, setSeekBand] = useState(filters.band ?? "");

  /* The year the rail LIGHTS, which is a different fact from the one above:
     where the reader currently is, read off the page as they scroll
     (`onActiveBandChange` -> `useActiveBand`). It parts company with
     `seekBand` the moment they scroll away from where they landed. */
  const [activeBand, setActiveBand] = useState(filters.band ?? "");

  /** A new bucket or a new search is a NEW RIVER, and a seek left over from
   *  the old one would start it in the wrong place -- or, if that year
   *  holds nothing under the new bucket, at no place at all: an empty grid
   *  for a bucket that is not empty. Both setters therefore clear it. */
  const chooseBucket = useCallback((next: string) => {
    setBucket(next);
    setSeekBand("");
  }, []);

  /** An order picked from the menu abandons the seek too. Left in state, a
   *  seek survived a trip through Newest and resurfaced the moment the
   *  reader came back to Chronological -- the archive opening at 1970s when
   *  they had asked for the archive. An order chosen by hand starts at its
   *  own head; only the rail's own press sets a year, and it sets the
   *  order with it (`seekTo`). */
  const chooseOrder = useCallback((next: RiverOrder) => {
    setOrder(next);
    setSeekBand("");
  }, []);

  /** The other half is not a filtered view of this one, it is a different
   *  archive -- so everything narrowing this one goes with it.
   *
   *  The seek for the reason above: a year seeked in the valley would
   *  otherwise resurface in a class that has no photographs in it. The bucket
   *  and the search because they are worse than stale, they are misleading:
   *  searching "banyan", switching, and meeting an empty page reads as an
   *  empty Class Collection rather than as a search that found nothing, and
   *  that is the first impression the feature gets exactly once. */
  const chooseScope = useCallback((next: PhotoScope) => {
    setScope(next);
    /* And the ORDER goes with them, to whatever that half opens on -- a
       class on Chronological, the valley on Newest. Everything else here is
       cleared because the other half is a different archive rather than a
       filtered view of this one, and the order it is read in is part of
       that. */
    setOrder(defaultOrderFor(next));
    setBucket("");
    setSearchInput("");
    setSearch("");
    setSeekBand("");
  }, []);

  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      // Guarded, because this timer also fires once on mount with nothing
      // changed -- and clearing the seek there would throw away the one a
      // `?when=` link arrived with before the reader had done anything.
      if (searchInput === search) return;
      setSearch(searchInput);
      setSeekBand("");
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [searchInput, search]);

  /* The view, in the address bar. Filtering does not navigate -- the river
     cross-fades in place -- but the state it lands in is written into the URL
     as it goes, so a bucket or a search is something you can send somebody,
     and the server renders their first page already filtered.
     `history.replaceState` rather than the router: this must not refetch the
     route, and Next supports exactly this for search params.

     `when` is the year the river was STARTED at, not one it is filtered to,
     so the link it makes opens the archive at that year with everything
     above and below it still there. It is cleared whenever the bucket or the
     search changes, so it can never describe a river it is no longer true of.

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
        scope === (asked.current.scope ?? "valley") &&
        bucket === (asked.current.bucket ?? "") &&
        search === (asked.current.search ?? "") &&
        order === (asked.current.order ?? "newest") &&
        seekBand === (asked.current.band ?? "");
      if (still) return;
      moved.current = true;
    }
    const q = new URLSearchParams();
    /* Named only when it is not the resting state, like `order` below -- so
       the Valley Collection keeps the bare /collection address it has always
       had, and only the class half carries a param. */
    if (scope === "class") q.set("scope", "class");
    if (bucket) q.set("bucket", bucket);
    if (search) q.set("q", search);
    if (seekBand) q.set("when", seekBand);
    if (order !== "newest") q.set("order", order);
    const qs = q.toString();
    window.history.replaceState(null, "", `/collection${qs ? `?${qs}` : ""}`);
  }, [scope, bucket, search, order, seekBand]);

  /* EVERY page of this river is asked for here, in both directions, and that
     is the point rather than a tidiness. `loadNewer` used to build its own
     call, and the one dimension it forgot was `scope` -- which the server
     reads as the Valley Collection, its safe default. So climbing back up out
     of a seek in the Class Collection prepended VALLEY photographs above the
     class ones, under the class heading: "it showed all the valley collection
     photos under the heading of class collection" (owner, 2026-09-02). It also
     drove the loop he saw before it, because each prepend made the next server
     page look like news to the re-seed guard below.

     One builder means a query dimension added later cannot be added to half
     the river. */
  const fetchPage = useCallback(
    (c: string | null, direction?: "newer") =>
      loadPhotos({
        cursor: c,
        direction,
        scope,
        bucket: bucket || undefined,
        search: search || undefined,
        order,
        /* Only the first page is ever seeked; the server ignores this the
           moment a cursor is present, so it can ride along on every page
           without the year leaking into what the river holds. */
        band: seekBand || undefined,
      }),
    [scope, bucket, search, order, seekBand]
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

  /** The flex row holding the river and the rail -- the landing target for a
   *  seek. Its top is the rail's flow position, which is what makes the
   *  "rail does not move" arithmetic possible. */
  const riverTop = useRef<HTMLDivElement>(null);

  /** The river's head as a scroll position: its top just below whatever is
   *  already pinned over the top of the viewport.
   *
   *  On a wide screen that is 24px, the rail's own `top-6`, and landing there
   *  is the one position where the rail does not move at all -- its flow
   *  offset equals its stuck offset. That number was hardcoded, and on a
   *  phone it was simply wrong: the app bar is 56px of sticky, so a pressed
   *  year landed 32px UNDERNEATH the bar and the reader arrived at a year
   *  they could not see. "2017 wasn't at the top of the page it was just
   *  above the top so not visible" (owner, 2026-09-02).
   *
   *  Measured off the bar itself rather than written down twice. Below its
   *  breakpoint the element is not rendered at all, so this reads 0 and falls
   *  back to the rail's 24 -- one expression, correct at both widths, and it
   *  follows the bar if the bar ever changes height. */
  const pinnedInset = useCallback(() => {
    const bar = document.querySelector("[data-app-bar]");
    return Math.max(24, Math.round(bar?.getBoundingClientRect().height ?? 0) + 8);
  }, []);

  const headOfRiver = useCallback(() => {
    const row = riverTop.current;
    if (!row) return 0;
    return Math.max(
      0,
      Math.round(row.getBoundingClientRect().top + window.scrollY) - pinnedInset()
    );
  }, [pinnedInset]);

  /** Where a given year's heading sits, as a scroll position -- the landing
   *  target for a seek now that a seek keeps the years above it. Null when
   *  that heading is not in the river, which is the caller's cue to fall back
   *  to the river's own head. */
  const topOfBand = useCallback(
    (key: string) => {
      if (!key) return null;
      const el = document.querySelector<HTMLElement>(`[data-band="${CSS.escape(key)}"]`);
      if (!el) return null;
      return Math.max(
        0,
        Math.round(el.getBoundingClientRect().top + window.scrollY) - pinnedInset()
      );
    },
    [pinnedInset]
  );

  /* ---------------- which way the reader is going ---------------- *
   *
   *  One boolean, and the head sentinel is the only thing that reads it.
   *  "Is the seam above me on screen" is not a good enough reason to fetch
   *  the year above: after a seek it is always on screen, which is how
   *  pressing 2020 could walk itself back to 2026 (see the observer below).
   *  "Is the reader moving toward it" is the real question, and only a
   *  scroll can answer it.
   *
   *  OUR OWN SCROLLS MUST NOT COUNT. Landing after a seek scrolls down;
   *  anchoring after a prepend scrolls down; both would otherwise register as
   *  travel the reader never made, and the anchor's is upward-adjacent enough
   *  to matter. `syncScrollWatch` is called immediately after each one, from
   *  the layout effect, so the scroll event that follows sees no delta and
   *  the direction survives untouched. It also parks the flag at false, which
   *  is what stops a prepend from arming the next prepend.
   * ---------------------------------------------------------------- */
  const lastScrollY = useRef(0);
  const movingUp = useRef(false);
  /** Whether the seam above the river is within reach, kept by the head
   *  observer below. A boolean it maintains rather than a decision it makes. */
  const headNear = useRef(false);
  /** The current `loadNewer`, so the scroll listener can call it without being
   *  torn down and rebuilt every time its dependencies change. */
  const pullNewer = useRef<() => void>(() => {});

  const syncScrollWatch = useCallback(() => {
    lastScrollY.current = window.scrollY;
    movingUp.current = false;
  }, []);

  /** Does the reader want the year above the one they are looking at?
   *
   *  Two ways to say yes, and the second is not a nicety. Travelling upward
   *  is the ordinary one. But a seek can land at the very top of the
   *  document -- a `?when=` link opens there, with nothing above the river
   *  but the page header -- and a reader who is already at zero HAS NO WAY
   *  to scroll up. Waiting for a gesture they cannot make stranded them at
   *  the year they had asked for with the page title where 2018 should be:
   *  "all the years above 2017 have disappeared" (owner, 2026-09-02).
   *
   *  So at the top of the document the absence of a gesture IS the request.
   *  It fires once: the page that arrives is anchored above them, which puts
   *  the scroll off zero, and from there the ordinary rule takes over. What
   *  it must never do is fire at a landing the reader can still climb out of
   *  by hand, which is why this is not simply "the seam is on screen". */
  const wantsNewer = useCallback(() => movingUp.current || window.scrollY <= 0, []);

  useEffect(() => {
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      // A dead band, because a trackpad emits sub-pixel jitter in both
      // directions and a single stray upward pixel is not a reader asking
      // for another page.
      if (y < lastScrollY.current - 2) movingUp.current = true;
      else if (y > lastScrollY.current + 2) movingUp.current = false;
      lastScrollY.current = y;
      /* THE PULL IS DECIDED HERE, not in the observer, and that is the whole
         point of this line. An IntersectionObserver reports TRANSITIONS: the
         seam enters range once, the callback runs once, and after a seek that
         one run happens at the landing when the reader is not moving. It then
         never fires again, because the seam never leaves range -- so scrolling
         up did nothing at all and the reader was stranded at the year they had
         pressed with the page title above it: "all the years above 2017 have
         disappeared ... above 2018 instead of 2018 is the title of the page.
         WHY" (owner, 2026-09-02). Asking on every scroll costs a ref read and
         answers the question the reader is actually asking with their finger. */
      if (headNear.current && wantsNewer()) pullNewer.current();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [wantsNewer]);

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
      /* HOLD THE OLD RIVER UNTIL THE NEW ONE IS READY TO BE SEEN. The rows
         used to swap the moment the data landed, and then every thumbnail
         arrived on its own schedule -- "a full reloading and things populate
         unevenly, it's not pretty" (owner). Decoding the first screenful
         first (bounded at 450ms, see `warmThumbs`) turns the change into
         one movement: the dim, then the new view, whole. */
      await warmThumbs(data.photos);
      if (cancelled) return;
      /* A SEEK ARRIVES WITH THE YEAR ABOVE IT ALREADY IN THE RIVER. The
         server sends it (see `RiverPage.above`), so the archive is continuous
         from the first frame instead of the reader landing against the page
         header and watching the years above trickle in behind them. */
      setPhotos(data.above?.length ? [...data.above, ...data.photos] : data.photos);
      setCursor(data.nextCursor);
      setTopCursor(data.topCursor ?? null);
      setBands(data.bands ?? []);
      // Committed WITH the photographs it describes, never before them.
      setRiverOrder(order);
      /* A new river, so the old scroll position is not a fact about it any
         more: back to the year asked for, or to nothing -- which the rail
         reads as "wherever the first photograph is" (see `railActive`). */
      setActiveBand(seekBand);
      setLoading(false);
      /* EVERY NEW RIVER STARTS AT ITS HEAD, and the head is one place. Not
         the top of the page: landing at scroll 0 moved the sticky rail from
         where it was pinned (top-6 below the viewport edge) back down to
         its flow position under the page header, so the very control being
         pressed lurched -- "the decade bar adjusts its position when you
         click, it goes to the top of the screen" (owner). The head is the
         one scroll position where the rail does not move AT ALL: its flow
         offset equals its stuck offset, i.e. the river's top sits exactly
         `top-6` (24px) below the viewport edge.

         A seek goes there unconditionally. It used to stay put for a reader
         who was above the head already, on the logic that the river's top
         was on their screen -- which put the year they had just asked for
         a third of the way down the page under the header and controls,
         while the same press from deeper landed it flush at the top:
         "sometimes I click 2000s and instead of 2000s being at the top it's
         partway down the screen ... where the decades take you depends on
         which mode you're in" (owner). One landing, every time.

         A change of bucket, search or order only PULLS UP to the head. It
         never scrolls a reader down away from the page header they may be
         reading, but a reader deep in a long river gets the new one from
         its start rather than from wherever the browser clamped them when
         a shorter river arrived -- which is "I switch to Newest and it
         scrolls to a point below, random". */
      /* Decided here, DONE after the commit. Whether to travel is a fact
         about where the reader is now, against the river they are looking
         at; where to land is a fact about the river that is about to
         replace it, which does not exist in the DOM yet. Scrolling now
         measured the old river -- a four-photograph page above a one-
         photograph seek grew the tail by the old, larger content's slack,
         and the moment the shorter river committed the browser clamped the
         scroll straight back to zero. `pendingLanding` carries the decision
         across to the layout effect below, which runs once the new river
         is laid out and before it is painted. */
      const wasDeep = window.scrollY > headOfRiver();
      pendingLanding.current = jump.current ? "seek" : wasDeep ? "pull" : null;
      // Which year to land ON, now that a seek is a scroll through a
      // continuous river rather than a landing at its head.
      landOn.current = jump.current ? seekBand : "";
      jump.current = false;
    })();
    return () => {
      cancelled = true;
    };
    // Neither `seekBand` nor `order` can change without changing `fetchPage`
    // with it; both are listed because this body reads them, not because
    // either can move on its own.
  }, [fetchPage, seekBand, order, headOfRiver]);

  const more = useCallback(async () => {
    // ...and not while one is arriving at the head, for the reason given on
    // `loadNewer`: the scroll correction cannot tell the two apart.
    if (!cursor || loadingMore || loadingNewer || loading) return;
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
  }, [cursor, loadingMore, loadingNewer, loading, fetchPage]);

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

  /* ---------------- the year rail's seek ---------------- */

  /** Set while a press on the rail is waiting for its page, so the query
   *  effect knows to land the reader at the top when it arrives. A ref
   *  rather than state: it changes what that one fetch DOES, not what the
   *  page looks like, and it must not cause a render of its own. */
  const jump = useRef(false);


  /* Pressing a year. Two state changes and nothing else -- no fetch here:
     `seekBand` is part of the query, so the effect above sees a new
     `fetchPage` and services this exactly the way it services a new bucket,
     with the same generation guard, the same cross-fade and the same single
     round trip.

     It also turns the order to Chronological, because that is the only order
     with a date spine to seek along: "1956" means nothing in a river sorted
     by upload date or by love. The rail stays visible in every order
     regardless -- it is a picture of the archive's shape, which is worth
     having at rest -- and pressing it is what commits to reading in time. */
  const seekTo = useCallback(
    (key: string) => {
      /* Pressing the year the river already starts at changes no state, so
         no fetch is coming to do the travelling -- but it is still a request
         to go back to the top of that year, and it is answered here. */
      if (key === seekBand && order === "taken") {
        window.scrollTo({ top: 0 });
        return;
      }
      jump.current = true;
      setSeekBand(key);
      setOrder("taken");
      setActiveBand(key);
    },
    [seekBand, order]
  );

  /* Climbing back out of a seek: the one place the river is walked UPWARD,
     toward newer photographs, prepended at the head instead of appended at
     the foot. `prependUnseen` is `appendUnseen`'s own mirror, same
     guarantee reversed (see its docblock). */
  const scrollAnchor = useRef<{ height: number; top: number; seam: number } | null>(null);
  const loadNewer = useCallback(async () => {
    /* Never while a page is arriving at the FOOT, and `more` returns the
       same courtesy. The correction below reads one number -- how much
       taller the document got -- and attributes all of it to content that
       landed above; if an append committed in the same frame, its height
       would be counted too and the reader would be shoved down by it. The
       two directions are therefore never in the air at once. Nothing is
       lost by waiting: both observers re-arm as these flags settle. */
    /* `loading` too: while a NEW river is in the air, `topCursor` still
       belongs to the old one. Fetching from it returns a page cut at a
       position in an archive nobody is looking at any more, and the
       generation guard below only catches the pages that were already in
       flight when the query changed -- not one started afterwards from a
       stale cursor. Same reasoning on `more`. */
    if (!topCursor || loadingNewer || loadingMore || loading) return;
    const mine = generation.current;
    setLoadingNewer(true);
    try {
      const data = await callAction(() => fetchPage(topCursor, "newer"));
      if (mine !== generation.current) return;
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      /* The whole feel of this: the photograph under the reader's eye must
         not move when a page arrives ABOVE it. Measured before the DOM
         changes and corrected in a layout effect below, before the browser
         paints -- a `requestAnimationFrame` correction runs one frame too
         late and the jump is visible for it. */
      const scroller = document.scrollingElement;
      if (scroller)
        scrollAnchor.current = {
          height: scroller.scrollHeight,
          top: scroller.scrollTop,
          /* WHERE THE PAGE IS ABOUT TO BE INSERTED. The correction assumes
             every pixel the document gains was added above the reader, which
             is true of everyone reading the river and false of the one person
             who has scrolled off the top of it: for them the new page lands
             BELOW, and correcting by its height shoves them out of the header
             and back into photographs they had just left. That is the second
             half of "it brings me down". */
          seam: (head.current?.getBoundingClientRect().top ?? 0) + scroller.scrollTop,
        };
      setPhotos((prev) => prependUnseen(data.photos, prev));
      setTopCursor(data.topCursor ?? null);
    } finally {
      setLoadingNewer(false);
    }
  }, [topCursor, loadingNewer, loadingMore, loading, fetchPage]);

  useEffect(() => {
    pullNewer.current = () => void loadNewer();
  }, [loadNewer]);

  /** The blank after the river that `landAt` may grow -- see its docblock. */
  const tail = useRef<HTMLDivElement>(null);

  /** A landing the query effect decided on and this layout effect carries
   *  out once the new river is in the DOM: "seek" goes to the head
   *  unconditionally, "pull" only because the reader was deep. */
  const pendingLanding = useRef<"seek" | "pull" | null>(null);
  /** The year that landing is for, "" when it is not for one. */
  const landOn = useRef("");

  useLayoutEffect(() => {
    /* A new river has just committed. Reset the blank the old one may have
       needed, then land -- measured against THIS river, which is the whole
       point of doing it here rather than where the decision was made. */
    if (pendingLanding.current) {
      pendingLanding.current = null;
      /* AND THE ANCHOR GOES WITH IT. A prepend that committed in the same
         pass as a landing left its {height, top} sitting in the ref, measured
         against a river that no longer exists; the next page to arrive then
         "corrected" the scroll by the difference between two unrelated
         documents and threw the reader somewhere arbitrary. A landing
         supersedes an anchor by definition -- it is a decision about where
         the reader should be, and the anchor is a decision about where they
         should STAY. */
      scrollAnchor.current = null;
      if (tail.current) tail.current.style.height = "0px";
      /* The pressed year's own heading, or the river's head when there is no
         year to aim at (a bucket, a search, an order). The two used to be the
         same thing because a seek started the river at the year pressed; now
         that it keeps the years above, the head of the river is one page
         EARLIER than where the reader asked to be. */
      const want = topOfBand(landOn.current) ?? headOfRiver();
      landOn.current = "";
      landAt(want, tail.current);
      syncScrollWatch();
      return;
    }
    if (!scrollAnchor.current) return;
    const { height, top, seam } = scrollAnchor.current;
    scrollAnchor.current = null;
    const scroller = document.scrollingElement;
    if (!scroller) return;
    // Above the seam, nothing that arrived is above the reader, so there is
    // nothing to correct for and moving them would be the bug rather than
    // the fix.
    if (top < seam) return;
    landAt(top + (scroller.scrollHeight - height), tail.current);
    syncScrollWatch();
  }, [photos, headOfRiver, topOfBand, syncScrollWatch]);

  /* The mirror of the foot sentinel: sits above the river, so a page that
     exists above the fold gets pulled in and scroll-anchored into place
     before the reader ever scrolls far enough to see the seam. Only ever
     mounted where `topCursor` can be truthy at all -- a seek short of the
     newest year -- so this is a no-op everywhere else. */
  const head = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = head.current;
    if (!el || !topCursor) return;
    const io = new IntersectionObserver(
      (entries) => {
        /* ONLY WHEN THE READER HAS ASKED (see `wantsNewer`), and this is the
           whole difference between a seam that fills itself and a page that
           runs away from you.

           A seek lands the reader AT the head of the river, which is exactly
           where this sentinel lives -- so on arrival it is on screen, it
           fired, `loadNewer` prepended the year above, that page put the
           sentinel back in range, and it fired again. Press 2020 and the
           river climbed back to 2026 on its own while you watched, with the
           rail lighting whatever it ended on: "when i'm on newest and i click
           2021 ... it goes to chron but brings 2022 to the top of the page
           but the siderail says 2026" (owner, 2026-09-02). Measured before
           the fix: three of six seeks landed on the wrong year.

           Nobody who has just asked to start at 2020 wants 2021 fetched over
           their head. They want it the moment they reach for it -- which is a
           fact about the reader, not about what is on screen. `movingUp` is
           false at every landing and after every prepend (see
           `syncScrollWatch`), so the chain cannot start itself; a real upward
           flick sets it and the seam fills ahead of them exactly as before.

           This callback is only half of it. An IntersectionObserver reports
           transitions, and after a seek the seam enters range once and never
           leaves, so this runs once -- at the landing, when the answer is no
           -- and never again. The scroll listener asks the same question on
           every scroll, which is what actually lets a reader climb out. */
        headNear.current = entries.some((e) => e.isIntersecting);
        if (headNear.current && wantsNewer()) void loadNewer();
      },
      /* FURTHER AHEAD THAN THE FOOT'S, and for a reason the foot does not
         have: a page appended below the fold is invisible until the reader
         arrives, so 1200px of warning is plenty. Climbing UP, the reader is
         travelling toward the edge at flick speed and the page has a round
         trip to make -- 1200px is under two frames of a fast flick, so they
         reached the empty edge, met the page header where the previous year
         should be, and were then pushed back down when it landed. "I still
         hit the title then the photos load and it brings me down" (owner,
         2026-09-02). 3000px is roughly two pages of warning at this page
         size, which is what it takes to stay in front of a hand. */
      { rootMargin: "3000px 0px" }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      headNear.current = false;
    };
  }, [topCursor, loadNewer, wantsNewer]);

  /* Latched: once opened the pop-up stays mounted, which is what its close
     animation needs, and what lets a half-filled wall survive a stray press
     on the backdrop. */
  const [contributing, setContributing] = useState(false);
  const [contributeMounted, setContributeMounted] = useState(false);
  const openContribute = () => {
    setContributeMounted(true);
    setContributing(true);
  };

  /* ---------------- the viewer ---------------- */
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
  /* BOTH HOLD THEIR PHOTOGRAPH PAST THE CLOSE, which is what lets the dialog
     material's own exit run instead of the panel blinking out of existence --
     see use-closing-dialog.ts, which is where the whole argument lives.

     The edit carries WHICH STRIP as well as which photograph: an edit made
     from the pending queue or from a shared link has to be written back into
     the list it came from, exactly as the heart is. */
  const removing = useClosingDialog<PhotoData>();
  const editing = useClosingDialog<{ list: ViewerList; photo: PhotoData }>();

  const listFor = useCallback(
    (list: ViewerList) => (list === "pending" ? pendingPhotos : list === "linked" ? linked : photos),
    [pendingPhotos, linked, photos]
  );
  const setListFor = useCallback(
    (list: ViewerList, next: (prev: PhotoData[]) => PhotoData[]) => {
      // The queue is per half, so a write to it goes to the half on screen --
      // which is the only one the viewer can be showing a "pending" strip of.
      if (list === "pending")
        setQueues((prev) => ({ ...prev, [scope]: next(prev[scope] ?? []) }));
      else if (list === "linked") setLinked(next);
      else setPhotos(next);
    },
    [scope]
  );
  // Memoized so the whole (paginated, unbounded) list isn't re-mapped on every
  // unrelated re-render while the viewer sits closed.
  const viewerList = viewer ? listFor(viewer.list) : photos;
  const viewerImages = useMemo(
    () => viewerList.map((p) => toViewerImage(p, isAdmin)),
    [viewerList, isAdmin]
  );

  /* ---------------- mounted closed, so they can open ---------------- *
   *
   *  All three dialogs below are dynamic()'d off the first paint, which is
   *  right: /collection is a gallery and should not ship a form nobody has
   *  asked for. But a chunk that arrives AFTER its dialog has been asked to
   *  open mounts the panel ALREADY OPEN, and a panel that has never been
   *  closed has no closed state to animate out of. Measured on rAF, cold: the
   *  first press of the pencil produced a quarter-second of nothing and then
   *  a dialog at full opacity, no fade, no rise -- while every later press got
   *  the whole material. `import()`ing them early does not fix it; the loader
   *  the bundler hands `dynamic()` is its own.
   *
   *  So the target is resolved from what the VIEWER is showing, not from what
   *  has been pressed. The moment a photograph this member may change is on
   *  screen, the dialogs render CLOSED -- which costs nothing on the page (a
   *  closed dialog puts no portal in the DOM) and everything in feel: the
   *  chunk lands, the root mounts closed, and pressing the pencil is a flag
   *  flip with a real closed state behind it. A held subject always wins, so
   *  nothing moves under a dialog that is already open.
   * ------------------------------------------------------------------ */
  const canEditHere = viewer ? viewerImages[viewer.index]?.canEdit ?? false : false;
  const editTarget =
    editing.subject ??
    (canEditHere && viewer
      ? { list: viewer.list, photo: viewerList[viewer.index] }
      : null);
  const removeTarget = removing.subject ?? editTarget?.photo ?? null;

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
    // Every queue, not the one on screen: the viewer can be open on a
    // photograph from either half (a shared link), and a row that is gone is
    // gone from both.
    setQueues((prev) => ({
      valley: (prev.valley ?? []).filter((p) => p.id !== id),
      class: (prev.class ?? []).filter((p) => p.id !== id),
    }));
    setLinked((prev) => prev.filter((p) => p.id !== id));
    setViewer(null);
    removing.close();
  }

  /* ---------------- what to draw ---------------- */
  // A year is not in this list any more: seeking to one can never return
  // an empty river (the rail only ever offers a year that already holds a
  // photograph), so it is not a "query" that can leave the grid with
  // nothing to show.
  const hasQuery = !!(bucket || search);
  // Truly empty: nothing has ever been added, no filter is even active.
  // Distinct from filtered-to-zero. Resolved from the server-computed
  // `hasApprovedPhotos`, not from client fetch state, which only settles after
  // mount and so flashed the controls in on first paint and out again.
  const trulyEmpty = !hasQuery && pendingPhotos.length === 0 && !facts.hasApprovedPhotos;
  const noMatches = !loading && hasQuery && photos.length === 0;

  /* What the rail lights, DERIVED rather than stored: the scrollspy's answer
     when it has one, else the year the top photograph belongs to, and
     nothing at all in the orders where a year is not a position. Derived
     because the fallback has to survive every route into a new list of
     photographs -- including the server re-seeding this component after a
     contribution, which replaces the river without anybody scrolling. And it
     earns its place: when one year fills the whole first page the
     scrollspy sits out entirely (`useActiveBand` has nothing to compare
     below two bands), so nothing else would light the rail at all. */
  const railActive =
    riverOrder === "taken" ? activeBand || (photos[0] ? bandKeyOf(photos[0]) : "") || "" : "";

  return (
    <div>
      <PageHeader
        guide="collection"
        /* THE TITLE IS THE WHOLE INDICATOR. No lock beside it, no line under
           it saying who can see this -- the owner cut both: "it's pretty
           obvious. please don't worsen the good things we have in
           collections." The word "Class" carries it, and two more elements
           saying it again is how a good page becomes a worse one. */
        title={HALVES[scope].title}
        /* The swap lives HERE, on the title, and nowhere else. The title is
           what says which half you are in, so it is the only honest place for
           the thing that changes it -- and it keeps the controls line exactly
           as it was, which is the whole point. */
        afterTitle={
          <ScopeCaret scope={scope} onScope={chooseScope} canSeeClass={canSeeClass} />
        }
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
                placeholder={HALVES[scope].searchLabel}
                label="Search photographs by caption, place or contributor"
                restLabel={HALVES[scope].searchLabel}
              />
            )}
            {!trulyEmpty && (
              /* A room with an address, not a modal. Twenty minutes with two
                 hundred photographs is not something to do inside a dialog
                 (spec sec. 8.2). */
              <>
                {/* One action, two controls, split at the breakpoint instead of
                    one pill with the word hidden inside it. A hidden label is
                    still a child, so the Button's optical centring saw a
                    leading icon and shaved 4px off the left: the phone got a
                    44x40 rounded rectangle with the plus off centre, next to a
                    search pill that is a true 40px circle. Below sm this is now
                    that same circle. */}
                <Button
                  variant="primary"
                  size="icon"
                  className="sm:hidden"
                  aria-label="Contribute a photograph"
                  onClick={openContribute}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button
                  variant="primary"
                  className="hidden sm:inline-flex"
                  onClick={openContribute}
                >
                  <Plus className="h-4 w-4" />
                  Contribute
                </Button>
              </>
            )}
          </>
        }
      />

      {trulyEmpty ? (
        /* THE SAME EMPTY STATE with different words, not a second component.
           Every class has none of these on its first day, so this is what the
           Class Collection IS for its first month -- but the shape that was
           right for the valley is right here too (spec sec. 6.3). */
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-14 text-center">
          <p className="font-heading text-xl tracking-tight text-foreground">
            {HALVES[scope].emptyTitle}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {HALVES[scope].emptyBody(myClassYear)}
          </p>
          <Button variant="primary" className="mt-5 rounded-full" onClick={openContribute}>
            <Plus className="h-4 w-4" />
            Add the first one
          </Button>
        </div>
      ) : (
        <>
          {/* HIDDEN ON A WIDE CLASS PAGE, where the order moves onto the
              river's own first line instead -- see the river row below. With
              no bucket line beside it this row is one short word on the right
              and an empty 1000px to its left, and it pushed the first year
              heading 42px down for nothing: "the 2026 can go further up.
              still too much space. maybe align the tops of that and the
              chronological" (owner, 2026-09-02).

              Kept below 1280px because there is no rail column down there for
              the order to sit beside, and the row is the only place it can
              be. */}
          <RiverControls
            scope={scope}
            bucket={bucket}
            onBucket={chooseBucket}
            order={order}
            onOrder={chooseOrder}
            className={cn(scope === "class" && "xl:hidden")}
          />
          {/* NO WAY TO JUMP BY DECADE BELOW 1280px, still. A scrolling line of
              decade words under the buckets shipped here once, in the one
              shape a narrow screen had room for, and the owner's read of it
              on a phone was flat: "remove the decades and undated thing from
              mobile, it looks really bad." Two words with no marks beside
              them carried none of what makes the rail worth having, and it
              is gone rather than kept unrendered -- a real scrubber down the
              right edge is a later, separate piece, not a smaller version of
              the thing he just rejected. */}

          {/* The controls sit closer to the river than the title sits to the
              controls (16px against the header's 24px), so the line of buckets
              reads as belonging to the photographs under it rather than
              floating between the two. It was 4px, which read as glued on. */}
          <div
            ref={riverTop}
            className={cn(
              "relative mt-4 flex items-start gap-6 xl:gap-8",
              /* No control row above it on a wide class page, so the river
                 starts where that row would have: the first year heading and
                 the order share a top edge, which is the alignment asked for.
                 `relative` is for the order that now hangs in this row's own
                 top-right corner. */
              scope === "class" && "xl:mt-0"
            )}
          >
            {scope === "class" && (
              <OrderMenu
                order={order}
                onOrder={chooseOrder}
                /* Out of flow, so it cannot push the year heading beside it
                   down again -- which is the whole point. Its right edge is
                   the content column's, the same pixel the valley's order
                   sits on, so swapping halves still does not move it. */
                className="absolute right-0 top-0 z-10 hidden xl:flex"
              />
            )}
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
                    {HALVES[scope].noResultsHint}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5 rounded-full"
                    onClick={() => {
                      setBucket("");
                      setSearchInput("");
                      setSearch("");
                      setSeekBand("");
                    }}
                  >
                    Show everything
                  </Button>
                </div>
              ) : (
                <>
                  {/* The head. The rail's own sentinel, pulling in whatever
                      sits above a seek before the reader scrolls into the
                      seam -- see `loadNewer`. A no-op everywhere `topCursor`
                      is not set, which is everywhere except just after one.

                      `-mb-px` cancels its own `h-px`, so it contributes
                      NOTHING to the layout. It keeps a real one-pixel box
                      because that is what an IntersectionObserver needs to
                      see (a zero-height target has zero area, which the spec
                      leaves ambiguous) -- but the foot sentinel can afford
                      that pixel at the end of the river and this one cannot
                      at the start: unmargined, it pushed the entire grid
                      down by exactly 1px, which the visual suite caught on
                      both viewports. */}
                  <div ref={head} aria-hidden className="h-px -mb-px" />
                  <PhotoRiver
                    photos={photos}
                    order={riverOrder}
                    dimmed={loading}
                    onActiveBandChange={riverOrder === "taken" ? setActiveBand : undefined}
                    onOpen={(index) => {
                      setViewerMounted(true);
                      setViewer({ list: "main", index });
                    }}
                  />
                </>
              )}

              {/* The foot. A sentinel the observer watches, and a line that
                  says what is happening when it fires. */}
              <div ref={foot} aria-hidden className="h-px" />
              {cursor && (
                <p className="py-6 text-center text-[13px] text-muted-foreground">
                  {loadingMore ? "Gathering more..." : " "}
                </p>
              )}
              {/* Zero-height until a scroll position the river is too short
                  to reach is asked for; see `landAt`. */}
              <div ref={tail} aria-hidden />
            </div>

            {/* In EVERY order, because the marks are a picture of what the
                archive holds and that is worth having at rest -- but lit
                only in Chronological, where "which year am I in" is a
                question the river has an answer to. Pressing a mark in any
                other order turns the river to Chronological and travels
                there (see `seekTo`). */}
            <YearRail
              bands={bands}
              active={railActive}
              onSeek={seekTo}
              /* The order now sits at the top of this column on the class
                 side, so the rail starts below it rather than under it. 42px
                 is exactly the row that used to be there -- the control's own
                 26px line box plus this page's 16px between a control and
                 what it acts on -- so the rail's first mark stays on the
                 pixel it has always been on (measured at 1440: 147). Margin
                 only: `sticky` pins to `top-6` once the reader moves, so
                 nothing about the stuck position changes. */
              className={cn(scope === "class" && "xl:mt-[42px]")}
            />
          </div>

          {/* The same index, for a thumb. Below 1280px the rail's margin does
              not exist, so the phone gets a Google-Photos-style scrubber that
              is invisible until the river moves. Only in Chronological, where
              "which year am I in" is a question the river can answer -- see
              its own docblock. */}
          <PhotoScrubber
            bands={bands}
            active={railActive}
            onSeek={seekTo}
            inTimeOrder={riverOrder === "taken"}
          />
        </>
      )}

      {/* Outside the river's branches: a shared link opens the viewer on a
          photograph that may not be in this page of it at all, and an empty or
          filtered river must not swallow it. */}
      {viewerMounted && (
        <LazyImageViewer
          images={viewerImages}
          initialIndex={viewer?.index ?? 0}
          open={viewer !== null}
          onClose={() => setViewer(null)}
          /* "2 of 24" is a fact about a post and noise about an archive: the
             owner, on this counter, "I don't know if showing that two of two
             thing is important, at least in collection". */
          showCount={false}
          onToggleLove={handleToggleLove}
          onEdit={(i) => {
            const photo = viewer && viewerList[i];
            if (photo) editing.show({ list: viewer.list, photo });
          }}
        />
      )}

      {/* Taking a photograph down. The member's own is a plain confirm; an
          admin removing somebody else's takes the warm note, which is the same
          flow /collection/[id] carried and the same one the feed uses. */}
      {contributeMounted && (
        <ContributeDialog
          /* The destination, in the dialog's OWN title rather than a new line
             inside it. With no "move to the Valley Collection" -- the owner:
             "if they wanted it they could've just put it there instead" --
             the only correction for a misfile is delete and re-upload, so
             this title is the whole of the safeguard and it is read before a
             file is chosen (spec sec. 7.1, 7.3). */
          scope={scope}
          open={contributing}
          onOpenChange={setContributing}
          autoApproved={autoApproved}
          roomLeft={roomLeft}
        />
      )}

      {/* Retagging, recaptioning, redating -- the same three questions the
          contribute room asks, of a photograph already in the archive. It
          hands the taking-down straight back to the two dialogs below, which
          already own it. */}
      {editTarget && (
        <EditPhotoDialog
          open={editing.open}
          photo={editTarget.photo}
          onClose={editing.close}
          onSaved={(fields) => {
            patch(editTarget.list, editTarget.photo.id, (p) => ({ ...p, ...fields }));
            editing.close();
          }}
          /* Closed FIRST, and the confirmation raised a beat later, so the two
             panels hand over rather than stacking: one backdrop fading out
             under another fading in reads as a flicker and briefly doubles the
             scrim. 180ms is the exit ui/dialog.tsx draws. */
          onDelete={() => {
            const { photo } = editTarget;
            editing.close();
            window.setTimeout(() => removing.show(photo), 180);
          }}
        />
      )}

      {removeTarget?.isOwn && (
        <ConfirmDialog
          open={removing.open}
          onClose={removing.close}
          title="Delete this photograph?"
          description="It leaves the Collection for everyone, and the file itself is deleted. This cannot be undone."
          actionLabel="Delete"
          onConfirm={async () => {
            const res = await callAction(() => deleteOwnPhoto(removeTarget.id));
            if ("error" in res && res.error) return { error: res.error };
            forget(removeTarget.id);
            toast.success("The photograph has been taken down.");
          }}
        />
      )}
      {removeTarget && !removeTarget.isOwn && (
        <ModerationDialog
          open={removing.open}
          onClose={removing.close}
          itemLabel="photo"
          onConfirm={async (note) => {
            const res = await callAction(() =>
              adminRemovePhoto(removeTarget.id, note || undefined)
            );
            if ("error" in res && res.error) return { error: res.error };
            forget(removeTarget.id);
            return {};
          }}
        />
      )}
    </div>
  );
}
