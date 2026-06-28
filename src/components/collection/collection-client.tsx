"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Heart, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUBJECTS, AREAS, ERAS } from "@/lib/collection";
import { loadPhotos, type PhotoData } from "@/app/(main)/collection/actions";
import { ContributeDialog } from "./contribute-dialog";

type SortBy = "newest" | "oldest" | "loved" | "wander";

function Tile({ photo }: { photo: PhotoData }) {
  return (
    <Link
      href={`/collection/${photo.id}`}
      className="group relative mb-3 block break-inside-avoid overflow-hidden rounded-xl border border-border bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbUrl}
        alt={photo.caption ?? ""}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className="w-full"
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
    </Link>
  );
}

export function CollectionClient({ pending }: { pending: PhotoData[] }) {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [subject, setSubject] = useState("all");
  const [area, setArea] = useState("all");
  const [era, setEra] = useState("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
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
        subject: subject !== "all" ? subject : undefined,
        area: area !== "all" ? area : undefined,
        era: era !== "all" ? era : undefined,
        search: search || undefined,
        sortBy,
      }),
    [subject, area, era, search, sortBy]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setPage(0);
    fetchPage(0).then((data) => {
      if (cancelled) return;
      setPhotos(data.photos);
      setHasMore(data.hasMore);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  async function handleLoadMore() {
    const next = page + 1;
    setLoadingMore(true);
    const data = await fetchPage(next);
    setPhotos((prev) => [...prev, ...data.photos]);
    setHasMore(data.hasMore);
    setPage(next);
    setLoadingMore(false);
  }

  const empty = !loading && photos.length === 0 && pending.length === 0;

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <MagnifyingGlass
            weight="regular"
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search captions and birds..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 rounded-full border-border bg-card pl-10"
          />
        </div>
        <Select value={subject} onValueChange={(v) => setSubject(v ?? "all")}>
          <SelectTrigger className="h-10 w-[140px] rounded-full bg-card">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subjects</SelectItem>
            {SUBJECTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={area} onValueChange={(v) => setArea(v ?? "all")}>
          <SelectTrigger className="h-10 w-[140px] rounded-full bg-card">
            <SelectValue placeholder="Area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Anywhere</SelectItem>
            {AREAS.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={era} onValueChange={(v) => setEra(v ?? "all")}>
          <SelectTrigger className="h-10 w-[120px] rounded-full bg-card">
            <SelectValue placeholder="Era" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any era</SelectItem>
            {ERAS.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy((v ?? "newest") as SortBy)}>
          <SelectTrigger className="h-10 w-[136px] rounded-full bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="loved">Most loved</SelectItem>
            <SelectItem value="wander">A wander</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="leaf" className="rounded-full" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Contribute
        </Button>
      </div>

      {empty ? (
        <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-14 text-center">
          <p className="font-heading text-xl tracking-tight text-foreground">
            The collection is just beginning.
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            The first photographs of the valley will live here: the banyan, Rishi Konda, the
            birds, the light. Add the first one.
          </p>
          <Button variant="leaf" className="mt-5 rounded-full" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Contribute a photo
          </Button>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-5">
              <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
                Awaiting review
              </h2>
              <div className="[column-gap:0.75rem] columns-2 sm:columns-3 lg:columns-4">
                {pending.map((p) => (
                  <Tile key={p.id} photo={p} />
                ))}
              </div>
            </div>
          )}
          <div className="[column-gap:0.75rem] columns-2 sm:columns-3 lg:columns-4">
            {photos.map((p) => (
              <Tile key={p.id} photo={p} />
            ))}
          </div>
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

      <ContributeDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
