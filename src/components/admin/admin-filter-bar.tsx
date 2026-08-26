"use client";

import { useCallback, useState, useTransition, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  FilterButton,
  FilterPopover,
  FilterSheet,
  SentenceLine,
  type SentenceToken,
} from "@/components/common/filters";

/* ------------------------------------------------------------------ *
 *  The toolbar over an admin list.
 *
 *  `components/common/filters/` shares the CONTROLS -- the popover, the
 *  sheet, the sentence line -- and People and Content each hand-built the
 *  same ~110-line assembly on top of them: the URL writer, the search box
 *  with its Enter-and-blur commit, the desktop popover paired with the
 *  mobile sheet around one facets closure, and the sentence with its clear.
 *  Sharing the parts but copying the assembly is how the two ended up with
 *  different behaviour behind an identical-looking bar.
 *
 *  What the two really differ in is data: where they live, what they call a
 *  row, and which facets they offer. That is what the props are. The facets
 *  stay a closure the caller writes, so neither page's panel becomes a
 *  configuration format.
 *
 *  ONE RECONCILED DIFFERENCE: People wrapped its navigations in
 *  `startTransition` and Content did not, so filtering People kept the list
 *  on screen while Content dropped to its skeleton. Both transition now.
 * ------------------------------------------------------------------ */

/**
 * The URL half. Held by the caller rather than the bar, because the caller's
 * facet controls and filter tokens both need `setParam`, and the bar renders
 * what they return.
 */
export function useAdminFilterParams(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const [draftQ, setDraftQ] = useState(q);

  /* The server owns the filtering, so a change is a navigation. Everything
     reading from `searchParams` therefore stays in one place: the URL is the
     state, which is also what makes a filtered view linkable. */
  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      const href = next.toString() ? `${basePath}?${next}` : basePath;
      startTransition(() => router.replace(href, { scroll: false }));
    },
    [router, searchParams, basePath]
  );

  const clearAll = useCallback(() => {
    setDraftQ("");
    startTransition(() => router.replace(basePath, { scroll: false }));
  }, [router, basePath]);

  return { q, draftQ, setDraftQ, setParam, clearAll };
}

export type AdminFilterParams = ReturnType<typeof useAdminFilterParams>;

export function AdminFilterBar({
  filters,
  searchPlaceholder,
  searchAriaLabel,
  facets,
  tokens,
  activeCount,
  count,
  singular,
  plural,
  maxTokens,
  sheetShowLabel,
  banner,
}: {
  filters: AdminFilterParams;
  searchPlaceholder: string;
  searchAriaLabel: string;
  /** Rendered twice, into the desktop popover and the mobile sheet, so the
   *  two breakpoints cannot offer different filters. */
  facets: (fullWidth: boolean, compact?: boolean) => ReactNode;
  /** The facet tokens. The search term adds its own; both lists wrote that
   *  one out identically. */
  tokens: SentenceToken[];
  /** Facets only, matching `tokens`: it is the number on the Filters button. */
  activeCount: number;
  count: number;
  singular: string;
  plural: string;
  maxTokens: number;
  sheetShowLabel: string;
  /** Anything belonging between the toolbar and the sentence. Content puts
   *  its waiting-photos pill here. */
  banner?: ReactNode;
}) {
  const { q, draftQ, setDraftQ, setParam, clearAll } = filters;
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const allTokens: SentenceToken[] = q
    ? [
        ...tokens,
        {
          key: "q",
          label: `"${q}"`,
          onClear: () => {
            setDraftQ("");
            setParam("q", "");
          },
        },
      ]
    : tokens;
  const hasFilter = allTokens.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
            aria-hidden
          />
          <Input
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setParam("q", draftQ.trim())}
            onBlur={() => draftQ.trim() !== q && setParam("q", draftQ.trim())}
            placeholder={searchPlaceholder}
            aria-label={searchAriaLabel}
            className="pl-9"
          />
        </div>
        {/* Same filter material as the Directory: one button, one panel, a
            popover on a desktop and the kit's bottom sheet on a phone. Both
            render the SAME facets, so "+N more" on the sentence below has
            somewhere real to lead. */}
        <div className="hidden lg:block">
          <FilterPopover
            open={panelOpen}
            onOpenChange={setPanelOpen}
            trigger={<FilterButton count={activeCount} onClick={() => setPanelOpen((v) => !v)} />}
          >
            {facets(true, true)}
          </FilterPopover>
        </div>
        <FilterButton count={activeCount} onClick={() => setSheetOpen(true)} className="lg:hidden" />
      </div>

      {banner}

      {/* The count row absorbs the active filters, so adding one costs no
          extra row. Same control the Directory and the Collection use. */}
      <SentenceLine
        count={count}
        singular={hasFilter ? "match" : singular}
        plural={hasFilter ? "matches" : plural}
        tokens={allTokens}
        onClearAll={clearAll}
        onOpenPanel={() => (window.innerWidth >= 1024 ? setPanelOpen(true) : setSheetOpen(true))}
        max={maxTokens}
      />

      <FilterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onClearAll={clearAll}
        hasActive={hasFilter}
        showLabel={sheetShowLabel}
      >
        {facets(true)}
      </FilterSheet>
    </div>
  );
}
