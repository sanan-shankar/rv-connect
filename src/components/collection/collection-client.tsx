"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Plus, SlidersHorizontal } from "lucide-react";
import { Heart, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActiveFilterChips, type ActiveChip } from "@/components/common/filters/active-filter-chips";
import { FacetSearchSelect } from "@/components/common/filters/facet-search-select";
import { FacetSelect, SortPill } from "@/components/common/filters/facet-select";
import { FilterSheet } from "@/components/common/filters/filter-sheet";
import { ResultCount } from "@/components/common/filters/result-count";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { appendUnseen } from "@/lib/append-page";
import { WHEN_OPTIONS, COLLECTION_SORT_OPTIONS } from "@/lib/collection-facets";
import { loadPhotos, type PhotoData } from "@/app/(main)/collection/actions";
import { formatDisplayDate } from "@/lib/utils";

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

type SortBy = "newest" | "oldest" | "loved" | "wander";

function Tile({ photo, onOpen }: { photo: PhotoData; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={photo.caption ?? `Photograph by ${photo.uploader.name}`}
      // Hover is the caption scrim below, so no state-layer here (a tint over
      // a photograph is noise). The press only needed an answer: opacity, not
      // a transform, because the tile must not move under the cursor.
      className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[var(--radius-md)] border border-border bg-paper text-left transition-opacity duration-150 active:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbUrl}
        alt={photo.caption ?? ""}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className="w-full rounded-[var(--radius-md)]"
      />
      {!photo.approved && (
        <span className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10.5px] font-semibold text-background">
          Pending review
        </span>
      )}
      <div className="pointer-events-none absolute inset-0 flex items-end bg-gradient-to-t from-black/65 via-black/0 to-black/0 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="w-full p-3 text-white">
          {photo.caption && (
            <p className="line-clamp-2 text-[13px] font-medium leading-snug">{photo.caption}</p>
          )}
          <div className="mt-1 flex items-center gap-1 text-[11.5px] text-white/85">
            <Heart size={12} weight="fill" className="text-heart" />
            {photo.loveCount}
            <span className="ml-auto truncate">{photo.uploader.name}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

/** Map a Collection photo onto the shared viewer's shape. The permalink page
 *  (love, moderation, tags) stays one press away via the viewer's open-page
 *  action. */
function toViewerImage(p: PhotoData) {
  return {
    src: p.url,
    alt: p.caption ?? undefined,
    caption: p.caption,
    author: { id: p.uploader.id, name: p.uploader.name },
    date: formatDisplayDate(p.createdAt),
    href: `/collection/${p.id}`,
  };
}

export function CollectionClient({
  pending,
  areaOptions,
  hasApprovedPhotos,
  firstPage,
}: {
  pending: PhotoData[];
  areaOptions: string[];
  hasApprovedPhotos: boolean;
  /** Page 0 of the default view, queried on the server (see the page's own
   *  comment for why). Every later page, and every page under a filter, still
   *  comes from the action. */
  firstPage: { photos: PhotoData[]; hasMore: boolean; total: number };
}) {
  const [photos, setPhotos] = useState<PhotoData[]>(firstPage.photos);
  const [total, setTotal] = useState(firstPage.total);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(firstPage.hasMore);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  /* True from the first open onward, never back to false: see the note above
     the two dynamic imports. */
  const [dialogMounted, setDialogMounted] = useState(false);
  const [viewerMounted, setViewerMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // Which strip the full-screen viewer is browsing (the pending strip and the
  // approved grid are separate sets), and where in it.
  const [viewer, setViewer] = useState<{ list: "pending" | "main"; index: number } | null>(null);
  // Memoized so the whole (paginated, unbounded) photo list isn't re-mapped
  // on every unrelated re-render while the viewer sits closed.
  const viewerImages = useMemo(
    () => (viewer?.list === "pending" ? pending : photos).map(toViewerImage),
    [viewer?.list, pending, photos]
  );

  const [area, setArea] = useState("");
  const [era, setEra] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const areaFacetOptions = useMemo(() => areaOptions.map((a) => ({ value: a, label: a })), [areaOptions]);
  /* Bumped whenever the query behind this grid changes, so a "Load more"
     already in the air can tell that its page no longer belongs to what is on
     screen. The feed and the directory have carried this since audit Low 75 /
     M36; the Collection was the one list of the three without it (audit
     C-179). */
  const listGeneration = useRef(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const fetchPage = useCallback(
    (p: number) =>
      loadPhotos({
        page: p,
        area: area || undefined,
        era: era || undefined,
        search: search || undefined,
        sortBy,
      }),
    [area, era, search, sortBy]
  );

  /* The fetch effect below would otherwise re-ask the server, on mount, the
     question it has already answered into `firstPage`. Held against the
     IDENTITY of the first `fetchPage` rather than a one-shot boolean: a
     boolean also has to survive StrictMode's double-invoked mount effect in
     development, and would then either fetch there and not in production or
     need a second guard. `useCallback` hands back a new function whenever the
     filters, sort or search change -- including when they change BACK to the
     defaults, which should refetch rather than re-show a seed that is by then
     minutes old. So this skips exactly one query and no others. */
  const seededFetch = useRef(fetchPage);

  useEffect(() => {
    if (seededFetch.current === fetchPage) return;
    let cancelled = false;
    listGeneration.current += 1;
    // Re-arms the skeleton when the filters change, so changing a filter never leaves the previous results sitting on screen as though they matched.
    setLoading(true);
    setPage(0);
    (async () => {
      // callAction: a rejected fetch (deploy skew, dropped network, expired
      // session) used to leave `loading` true forever and the grid stuck on
      // skeletons with no way out (audit B-042).
      const data = await callAction(() => fetchPage(0));
      if (cancelled) return;
      if ("error" in data) {
        toast.error(data.error);
        setLoading(false);
        return;
      }
      setPhotos(data.photos);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  async function handleLoadMore() {
    /* The query this page belongs to. Change a filter, the sort or the search
       while a "Load more" is in the air and the page that comes back answers
       the PREVIOUS question: appending it interleaved two different result
       sets, took the old query's total, and left `page` counting against the
       new filters so every later page was fetched at the wrong offset (audit
       C-179). The effect above has already loaded the new first page, so
       dropping the stale one is the whole fix. */
    const generation = listGeneration.current;
    const next = page + 1;
    setLoadingMore(true);
    try {
      const data = await callAction(() => fetchPage(next));
      if (generation !== listGeneration.current) return;
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      setPhotos((prev) => appendUnseen(prev, data.photos));
      setHasMore(data.hasMore);
      setTotal(data.total);
      setPage(next);
    } finally {
      // finally, not a trailing statement: a rejected page used to leave
      // "Load more" disabled for the rest of the session (audit B-042).
      setLoadingMore(false);
    }
  }

  function clearAll() {
    setSearchInput("");
    setSearch("");
    setArea("");
    setEra("");
    setSortBy("newest");
  }

  const hasFilter = !!(area || era || search);
  // Truly empty: nothing has ever been added, no filter is even active.
  // Distinct from filtered-to-zero (photos exist, the active filters just
  // don't match any of them).
  // Resolved from the server-computed `hasApprovedPhotos` prop, not the
  // client-side `photos`/`loading` fetch state: that fetch only starts after
  // mount, so gating this on it flashed the toolbar in on first paint, then
  // hid it once the fetch resolved to zero. This is knowable before first
  // paint instead, so there's nothing to flash.
  const trulyEmpty = !hasFilter && pending.length === 0 && !hasApprovedPhotos;
  const noMatches = !loading && hasFilter && photos.length === 0;

  const activeChips: ActiveChip[] = [];
  if (era) {
    const option = WHEN_OPTIONS.find((o) => o.value === era);
    activeChips.push({ key: "era", label: `When: ${option?.label ?? era}`, onClear: () => setEra("") });
  }
  if (area) {
    activeChips.push({
      key: "area",
      label: `Part of school: ${area}`,
      onClear: () => setArea(""),
    });
  }

  // Shared between the desktop bar and the mobile FilterSheet (which stacks
  // both facets full-width) so neither rewrites the same two facet configs.
  function renderFacets(fullWidth: boolean) {
    const className = fullWidth ? "w-full" : undefined;
    return (
      <>
        <FacetSelect
          label="When"
          value={era}
          onChange={setEra}
          options={WHEN_OPTIONS}
          anyLabel="Any time"
          className={className}
        />
        <FacetSearchSelect
          label="Part of school"
          value={area}
          onChange={setArea}
          options={areaFacetOptions}
          anyLabel="Anywhere on campus"
          searchPlaceholder="Search..."
          className={className}
        />
      </>
    );
  }

  return (
    <div>
      {/* Toolbar: search + When + Part of school + Sort all fit inline on
          desktop (few enough facets, no "More filters" toggle needed).
          When the collection is truly empty (no approved photos at all),
          none of that filter chrome has anything to act on, so only the
          Contribute CTA renders. */}
      <div className="mb-2 flex flex-wrap items-center gap-2.5">
        {!trulyEmpty && (
          <div className="relative min-w-[200px] flex-1">
            <MagnifyingGlass
              weight="regular"
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search captions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-10 rounded-full border-border bg-card pl-10"
            />
          </div>
        )}

        {!trulyEmpty && (
          <div className="hidden items-center gap-2.5 lg:flex">
            {renderFacets(false)}
            <SortPill value={sortBy} onChange={(v) => setSortBy(v as SortBy)} options={COLLECTION_SORT_OPTIONS} />
            {hasFilter && (
              <button
                type="button"
                onClick={clearAll}
                className="shrink-0 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-semibold text-canopy underline-offset-2 transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Only rendered once photos/pending exist -- when trulyEmpty, the
            empty-state card below carries the one Contribute CTA instead of
            duplicating it here. */}
        {!trulyEmpty && (
          <Button
            variant="primary"
            className="hidden rounded-full lg:inline-flex"
            onClick={() => {
              setDialogMounted(true);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Contribute
          </Button>
        )}

        {/* Mobile (<1024px): Sort + Filters(N) + a Contribute icon button. */}
        {!trulyEmpty && (
          <div className="flex w-full items-center gap-2.5 lg:hidden">
            <SortPill
              value={sortBy}
              onChange={(v) => setSortBy(v as SortBy)}
              options={COLLECTION_SORT_OPTIONS}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              // Same pill as the Directory's Filters button, same fix: the
              // bg-secondary to bg-accent swap was one ladder rung and read as
              // nothing, so the neutral hover is the state layer now.
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border bg-secondary px-4 text-[13px] font-medium text-foreground transition-transform duration-150 state-layer active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <SlidersHorizontal className="size-3.5" aria-hidden />
              Filters
              {activeChips.length > 0 && <span className="opacity-80">· {activeChips.length}</span>}
            </button>
            <Button
              variant="primary"
              size="icon"
              className="shrink-0 rounded-full"
              onClick={() => {
              setDialogMounted(true);
              setDialogOpen(true);
            }}
              aria-label="Contribute a photo"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {!trulyEmpty && activeChips.length > 0 && (
        <ActiveFilterChips chips={activeChips} onClearAll={clearAll} className="mb-3 lg:hidden" />
      )}

      {!trulyEmpty && !loading && (
        <ResultCount
          count={total}
          singular="photo"
          plural="photos"
          className="mb-4 text-sm text-muted-foreground"
        />
      )}

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClearAll={clearAll}
        hasActive={hasFilter}
        showLabel={`Show ${total} ${total === 1 ? "photo" : "photos"}`}
      >
        {renderFacets(true)}
      </FilterSheet>

      {trulyEmpty ? (
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-14 text-center">
          <p className="font-heading text-xl tracking-tight text-foreground">
            The collection is just beginning.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            The first photographs of the valley will live here: the banyan, Rishi Konda, the
            birds, the light. Add the first one.
          </p>
          <Button
            variant="primary"
            className="mt-5 rounded-full"
            onClick={() => {
              setDialogMounted(true);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Contribute a photo
          </Button>
        </div>
      ) : noMatches ? (
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-14 text-center">
          <p className="font-heading text-xl tracking-tight text-foreground">
            No photos match these filters.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            Try widening When, or clear a filter.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {activeChips.length > 0 && <ActiveFilterChips chips={activeChips} className="justify-center" />}
            <Button variant="outline" className="rounded-full" onClick={clearAll}>
              Clear all
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => setSortBy("wander")}>
              A wander
            </Button>
          </div>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                Awaiting review
              </h2>
              <div className="[column-gap:0.75rem] columns-2 sm:columns-3 lg:columns-4">
                {pending.map((p, i) => (
                  <Tile key={p.id} photo={p} onOpen={() => {
                    setViewerMounted(true);
                    setViewer({ list: "pending", index: i });
                  }} />
                ))}
              </div>
            </div>
          )}
          <div className="[column-gap:0.75rem] columns-2 sm:columns-3 lg:columns-4">
            {photos.map((p, i) => (
              <Tile key={p.id} photo={p} onOpen={() => {
                setViewerMounted(true);
                setViewer({ list: "main", index: i });
              }} />
            ))}
          </div>

          {viewerMounted && (
            <ImageViewer
              images={viewerImages}
              initialIndex={viewer?.index ?? 0}
              open={viewer !== null}
              onClose={() => setViewer(null)}
            />
          )}
          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-full"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      {dialogMounted && <ContributeDialog open={dialogOpen} onOpenChange={setDialogOpen} />}
    </div>
  );
}
