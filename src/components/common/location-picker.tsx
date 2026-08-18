"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPinIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SpringPress } from "@/components/common/motion";
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
  ComboboxPortal,
  ComboboxPositioner,
  ComboboxStatus,
} from "@/components/ui/combobox";
import type { PlaceSearchResult } from "@/app/api/places/search/route";

/**
 * <LocationPicker> -- the reusable, gazetteer-backed city/town picker.
 *
 * Wraps the 234,934-row GeoNames `Place` table (via GET /api/places/search)
 * behind a combobox: type a few letters of a village, town, or city and get
 * back up to 8 disambiguated matches (village hits like Madanapalle work as
 * well as metros; homonyms like the many US "Northfield"s show their state
 * so you never pick the wrong one). If the gazetteer has no hit, a trailing
 * "Use it as typed" option always appears so nobody is ever blocked from
 * finishing a form over an obscure or misspelled place name -- it stores the
 * typed text as the label with `placeId: null`.
 *
 * Two modes, one shared search/keyboard-nav/loading-shimmer implementation:
 * - `mode="single"`: one selection. The input itself shows the chosen label.
 * - `mode="multi"`: an ordered, unlimited, removable chip list (used for a
 *   person's list of cities). A pick commits to a chip and puts the field
 *   down (popup closed, focus released); tapping the box starts the next one.
 *
 * Wiring to onboarding / settings / directory happens in a later phase; this
 * file is deliberately standalone with no page-specific knowledge.
 */

export interface PlaceSelection {
  placeId: number | null;
  /** Full disambiguated string shown in chips/inputs, e.g. "Madanapalle, Andhra Pradesh". */
  label: string;
  /** Short name used for search/matching (Post.cityScope); same as label for free-typed entries. */
  city: string;
  lat: number | null;
  lng: number | null;
}

interface LocationPickerBaseProps {
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

export type LocationPickerProps = LocationPickerBaseProps &
  (
    | {
        mode: "single";
        value: PlaceSelection | null;
        onChange: (value: PlaceSelection | null) => void;
      }
    | {
        mode: "multi";
        value: PlaceSelection[];
        onChange: (value: PlaceSelection[]) => void;
      }
  );

type PlaceOption =
  | { kind: "place"; result: PlaceSearchResult }
  | { kind: "freeText"; text: string };

function optionKey(option: PlaceOption): string {
  return option.kind === "place" ? `place-${option.result.id}` : "free-text";
}

function toSelection(option: PlaceOption): PlaceSelection {
  if (option.kind === "place") {
    const { result } = option;
    return {
      placeId: result.id,
      label: result.label,
      city: result.name,
      lat: result.lat,
      lng: result.lng,
    };
  }
  return { placeId: null, label: option.text, city: option.text, lat: null, lng: null };
}

function isSameSelection(a: PlaceSelection, b: PlaceSelection): boolean {
  if (a.placeId != null && b.placeId != null) return a.placeId === b.placeId;
  return a.label.trim().toLowerCase() === b.label.trim().toLowerCase();
}

// Splits the server's "Name, Admin1, Country" label into a bold primary line
// (the place name) and a muted secondary line (everything disambiguating
// it), so "Northfield" in Minnesota and New Jersey read as clearly different
// rows without resorting to an em dash.
function splitLabel(label: string): { primary: string; secondary: string } {
  const [primary, ...rest] = label.split(", ");
  return { primary, secondary: rest.join(", ") };
}

/**
 * Base UI change-reasons that mean "the person edited the text themselves"
 * (see `@base-ui/react/utils/reason-parts`). Every other reason is the library
 * echoing a highlighted or selected option's label back into the box, which
 * multi mode must ignore. Kept as an allowlist, not a denylist, so a library
 * upgrade that adds a new echo reason fails safe (input clears) rather than
 * silently reintroducing the stuck-label bug.
 */
const TYPING_REASONS: ReadonlySet<string> = new Set([
  "input-change",
  "input-paste",
  "input-clear",
]);

const DEBOUNCE_MS = 250;

function usePlaceSearch(query: string) {
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      abortRef.current?.abort();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clears the result list the moment the query empties, before any request is issued.
      setResults([]);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(`/api/places/search?q=${encodeURIComponent(trimmed)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
        .then((data: PlaceSearchResult[]) => {
          if (requestIdRef.current !== requestId) return;
          setResults(data);
        })
        .catch((err) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          if (requestIdRef.current !== requestId) return;
          setResults([]);
        })
        .finally(() => {
          if (requestIdRef.current === requestId) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading };
}

export function LocationPicker(props: LocationPickerProps) {
  const { placeholder, disabled, className, id } = props;
  const ariaLabel = props["aria-label"];

  const initialQuery = props.mode === "single" ? (props.value?.label ?? "") : "";
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastAppliedRef = useRef<PlaceSelection | null>(props.mode === "single" ? props.value : null);

  // Keep the input text in sync when the caller resets/changes `value` from
  // the outside (e.g. loading a saved profile), without fighting live typing.
  useEffect(() => {
    if (props.mode !== "single") return;
    if (props.value !== lastAppliedRef.current) {
      setQuery(props.value?.label ?? "");
      lastAppliedRef.current = props.value;
    }
  }, [props.mode, props.value]);

  const { results, loading } = usePlaceSearch(query);

  const options = useMemo<PlaceOption[]>(() => {
    const placeOptions: PlaceOption[] = results.map((result) => ({ kind: "place", result }));
    const trimmed = query.trim();
    if (trimmed && !loading && results.length === 0) {
      placeOptions.push({ kind: "freeText", text: trimmed });
    }
    return placeOptions;
  }, [results, query, loading]);

  const handleInputValueChange = useCallback(
    (value: string, eventDetails: { reason?: string }) => {
      // Multi mode's box is a SEARCH field, never a value display: the picked
      // cities live in the chips above it. So the only thing allowed to put
      // text in it is the person typing.
      //
      // Base UI echoes an option's label back into the input on several other
      // reasons -- `item-press` when you click a row, `list-navigation` when
      // you arrow onto one, `input-blur` when focus leaves. Guarding only
      // `item-press` (the previous behaviour) meant a click-selected city
      // cleared but an arrow-then-Enter one left "Chennai, Tamil Nadu" sitting
      // in the box. That leftover label is then re-queried, and since the
      // places API prefix-matches on the bare name it returns nothing, so the
      // just-added city reports "not found". Allowlisting the typing reasons
      // fixes every path at once rather than playing whack-a-mole per reason.
      if (props.mode === "multi") {
        const reason = eventDetails.reason;
        if (reason != null && !TYPING_REASONS.has(reason)) {
          setQuery("");
          return;
        }
      }
      setQuery(value);
    },
    [props.mode]
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
  }, []);

  const handlePick = useCallback(
    (option: PlaceOption | null) => {
      if (!option) return;
      const selection = toSelection(option);
      if (props.mode === "single") {
        lastAppliedRef.current = selection;
        props.onChange(selection);
        return;
      }
      // Belt and braces alongside the reason allowlist above: a commit is the
      // authoritative "this city is now a chip" moment, so empty the search box
      // here too. Also covers a duplicate pick, which adds no chip and would
      // otherwise leave the box stuck on a label that finds nothing.
      setQuery("");
      // A pick finishes the gesture: the chip is the confirmation, and the
      // field goes quiet until deliberately tapped again. The blur is what
      // drops the mobile keyboard; without it the cleared, still-focused box
      // reads as "now type your next city", which nobody asked it to do.
      // rAF so it lands after Base UI's own focus handling on popup close.
      requestAnimationFrame(() => inputRef.current?.blur());
      if (!props.value.some((existing) => isSameSelection(existing, selection))) {
        props.onChange([...props.value, selection]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.mode, props.value]
  );

  const itemToStringLabel = useCallback(
    (option: PlaceOption) => (option.kind === "place" ? option.result.label : option.text),
    []
  );

  function removeChip(index: number) {
    if (props.mode !== "multi") return;
    props.onChange(props.value.filter((_, i) => i !== index));
  }

  function clearSingle() {
    if (props.mode !== "single") return;
    lastAppliedRef.current = null;
    props.onChange(null);
    setQuery("");
  }

  const showClear = props.mode === "single" && query.trim().length > 0;

  const statusText = loading
    ? "Searching places..."
    : query.trim()
      ? `${results.length} place${results.length === 1 ? "" : "s"} found`
      : "";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {props.mode === "multi" && props.value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {props.value.map((place, index) => (
            <li key={place.placeId != null ? `place-${place.placeId}` : `${place.label}-${index}`}>
              {/* Sky tint from the protocol's chip trio (places = sky, matching
                  the Directory's label colour; the drab canopy/10 pairing is dead). */}
              <span className="inline-flex max-w-72 items-center gap-1.5 rounded-full border border-sky/35 bg-sky/[0.10] py-1 pr-1.5 pl-3 text-sm font-medium text-sky">
                <span className="truncate">{place.label}</span>
                <SpringPress
                  as="button"
                  onClick={() => removeChip(index)}
                  className="grid size-5 shrink-0 place-items-center rounded-full text-canopy/70 outline-none transition-colors duration-150 hover:bg-canopy/20 hover:text-canopy active:bg-canopy/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-canopy"
                  {...({ type: "button", "aria-label": `Remove ${place.label}` } as object)}
                >
                  <XIcon className="size-3" strokeWidth={2.5} />
                </SpringPress>
              </span>
            </li>
          ))}
        </ul>
      )}

      <Combobox<PlaceOption>
        items={options}
        filter={null}
        multiple={false}
        inputValue={query}
        onInputValueChange={handleInputValueChange}
        onValueChange={handlePick}
        open={open}
        onOpenChange={handleOpenChange}
        itemToStringLabel={itemToStringLabel}
        autoHighlight
        disabled={disabled}
      >
        <ComboboxInputGroup>
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <ComboboxInput
            ref={inputRef}
            id={id}
            placeholder={
              placeholder ?? (props.mode === "single" ? "Search for a city or town" : "Add a city or town")
            }
            aria-label={ariaLabel ?? (props.mode === "single" ? "City" : "Add a city")}
          />
          {showClear && (
            <SpringPress
              as="button"
              onClick={clearSingle}
              // state-layer, not hover:bg-accent: this x sits INSIDE the search
              // input group, whose own surface differs by form (a card in
              // settings, a Float panel in a dialog). --accent could not serve
              // both -- it read +2.06 dL* on one and inverted to -2.42 on the
              // other. The ink tint composites over whichever it lands on.
              className="state-layer grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors duration-150 hover:text-foreground active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              {...({ type: "button", "aria-label": "Clear city" } as object)}
            >
              <XIcon className="size-3.5" />
            </SpringPress>
          )}
        </ComboboxInputGroup>

        <ComboboxPortal>
          <ComboboxPositioner>
            <ComboboxPopup>
              <ComboboxStatus>{statusText}</ComboboxStatus>
              {loading ? (
                <div className="flex flex-col gap-1 p-1" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-11 rounded-[10px] skeleton-warm" />
                  ))}
                </div>
              ) : (
                <>
                  <ComboboxList>
                    {(option: PlaceOption) => {
                      const isPlace = option.kind === "place";
                      const { primary, secondary } = isPlace
                        ? splitLabel(option.result.label)
                        : { primary: `Use "${option.text}"`, secondary: "Not in our list -- we'll save it as typed" };
                      return (
                        <ComboboxItemRow key={optionKey(option)} option={option} primary={primary} secondary={secondary} />
                      );
                    }}
                  </ComboboxList>
                  {/* Only in the tree when there is truly nothing to list:
                      rendered unconditionally, Base UI kept the element
                      mounted beside real results, and its py-6 padding sat
                      under the rows as a blank white band (owner: "massive
                      white space under the rishi valley place"). */}
                  {options.length === 0 && (
                    <ComboboxEmpty>
                      {query.trim() ? "No matches yet -- keep typing" : "Start typing a city or town"}
                    </ComboboxEmpty>
                  )}
                </>
              )}
            </ComboboxPopup>
          </ComboboxPositioner>
        </ComboboxPortal>
      </Combobox>
    </div>
  );
}

// Split out so each row's icon can vary by option kind while the shared
// ComboboxItem carries the highlighted/hover/active styling from the ui
// primitive (kept as plain CSS transform transitions rather than SpringPress:
// this element's click/keyboard selection is owned by the combobox's own
// listbox interaction model, so it isn't wrapped in a second, independent
// gesture library).
function ComboboxItemRow({
  option,
  primary,
  secondary,
}: {
  option: PlaceOption;
  primary: string;
  secondary: string;
}) {
  return (
    <ComboboxItem value={option}>
      <div className="flex items-center gap-2">
        {option.kind === "place" ? (
          <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : (
          <PlusIcon className="size-3.5 shrink-0 text-cinnamon" aria-hidden />
        )}
        <span className="truncate text-sm font-medium text-foreground">{primary}</span>
      </div>
      {secondary && <span className="pl-5.5 text-xs text-muted-foreground">{secondary}</span>}
    </ComboboxItem>
  );
}
