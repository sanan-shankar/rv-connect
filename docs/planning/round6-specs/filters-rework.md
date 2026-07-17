# Filters Rework: Directory + Collection

> Round 6 design spec. Author: design lead. Date: 2026-07-18. Deliverable is this
> spec only; no code was edited. Grounded in the live code (`src/components/directory/*`,
> `src/components/collection/*`, `src/app/(main)/directory/*`, `src/app/(main)/collection/actions.ts`,
> `prisma/schema.prisma`, `src/lib/collection.ts`, `src/lib/houses.ts`) and in screenshots of both
> current filter bars taken this session.
>
> Read alongside `docs/spec/DESIGN-SYSTEM.md` (tokens, pills, canopy, warm surfaces) and
> `docs/spec/directory.md` (the two-tier progressive-disclosure decision, which this spec keeps).
> Assumes the shared dropdown primitive is being aligned at the primitive level by another agent
> today, so this spec builds on aligned `Select`/`Popover`.

---

## 1. The problem, made concrete

The owner's verdict on the current filters: "so unintuitive, really dog shit." The screenshots this
session show exactly why.

**Directory (Tier-2 rail, screenshot):**

```
[ all  v ]   [ Technology  v ]   [ Batch from ]  [ Batch to ]        (up/down)  [ relevance  v ]
```

- The first control reads a naked "**all**". It is actually the City filter. Nothing on screen says so.
- The second reads "**all**" when empty (here "Technology" because a value was forced). It is Profession,
  and its option list is built from `distinct workplace`, so free-typed workplaces bleed in. The owner's
  demo account had an organisation ("Valley School") show up as a profession.
- "**Batch from**" / "**Batch to**" are two bare inputs, not one labelled range.
- The sort reads "**relevance**", which actually sorts by most-recent. The word is dishonest.
- Root cause of the naked words: the pill trigger echoes the raw option **value** ("all", "relevance")
  instead of a human label, and there is no field label anywhere. See section 4 for the fix that makes
  this class of bug impossible.

**Collection (toolbar, screenshot):**

```
[ Search captions and birds... ]   [ all  v ]   [ all  v ]   [ all  v ]   [ newest  v ]   [ + Contribute ]
```

- Three identical naked "**all**" dropdowns (Subject, Part of school, Era). Nobody can tell them apart.
- Sort reads a bare "newest".
- The search placeholder promises "birds", but the bird/species picker (and the "what is in it" subject
  picker) are being **removed from upload today**, so that half of the promise is going away.

Both bars fail the same test: **no control tells you what it does, and no control tells you what it is
currently set to in words.**

---

## 2. Design principles (what "intuitive and a powerhouse" means here)

1. **Every control is a labelled-value pill.** A facet is never a naked "All". It always reads its own
   name, and when set it reads its name plus its value: `City`, then `City: Bangalore`. This is
   requirement 1, taken literally.
2. **Honest words only.** Sort options say what they do: `Newest`, `Name A-Z`. The word "Relevance" is
   deleted, value and label. When a search is typed, the honest default is `Best match`.
3. **Facets compose and stay visible.** A set pill shows its value inline and carries an `x` to remove
   just that facet. `Clear all` resets everything in one tap. A live result count sits above the results.
4. **Progressive disclosure, but nothing hidden is unlabelled.** Directory keeps its locked two-tier
   shape (search always visible; the long-tail facets behind a `More filters` toggle), but the two
   highest-value facets (Profession, City) are promoted to always-visible, and everything inside the
   toggle is a labelled pill. Collection has few enough facets to show them all inline.
5. **One shared filter kit.** Both pages render the same components off a per-page facet config. The kit
   is the single source of "what filters exist".
6. **Warm, canopy, pill.** Idle pills sit on `--card`/`--secondary` warm surface with a `--border`
   hairline. Set pills tint canopy (`#235C49`). Full `rounded-full`. Focus ring is the single Leaf ring.
   Press uses `SpringPress` (transform/opacity only, no `transition-all`).

---

## 3. The data: what each page can actually facet on

### 3.1 Directory (from `prisma/schema.prisma` `User`, `UserPlace`, `src/lib/houses.ts`)

| Facet | Column / source | Match rule | Notes |
|---|---|---|---|
| **Profession** | `workplace` vs the **fixed 14-value enum** in onboarding | equality | First-class per owner. Option list is the enum, never `distinct workplace`, so orgs cannot bleed in. |
| **City** | `UserPlace[]` (the new N-cities model) | **EXISTS: any of the person's cities matches** | People now have unlimited cities; match ANY. Replaces the old `currentCity`/`secondaryCity` string pair. |
| **Batch** | `batchYear` | range gte/lte | One labelled range control replaces two bare inputs. |
| **House** | `houses` (JSON `[{year,house}]`); canonical 22 in `src/lib/houses.ts` | ever in that house (any year) | New facet the data already supports. |
| **Open to** | `openTo` (comma list) | list contains label | New facet; curated starter set. |
| **Type** | `accountType` (`alumnus` / `teacher` / `ex_teacher`) | equality / in-set | Alumni vs Teachers. Exists today (the Batches view already has a Faculty tile). |

Deliberately not faceted: `verifyState`, `batchType` (ISC/ICSE is derived and niche). Tier-1 search still
free-text matches name, any city, `workplace`, `jobTitle`, and `openTo` labels, so a workplace like
"Valley School" is still findable by typing, just not offered as a profession option.

### 3.2 Collection (from `Photo`, `src/lib/collection.ts`)

The uploader is being simplified today: the **"what is in it" (subject) picker and the bird/species
(freeTags) picker are being deleted**. The upload keeps Caption, Part of school (`area`), and a reworked
**When** (year/decade with precision). So filters must not depend on subject or birds.

| Facet | Column / source | Match rule | Notes |
|---|---|---|---|
| **When** | `era` decade buckets (and any new precise-year field) | equality on decade | The durable time axis. A precise year still filters into its decade. |
| **Part of school** | `area` (4 values) | equality | |
| **Caption search** | `caption` free text (optionally still ORs legacy `freeTags`) | contains | Keeps old bird names findable by typing without a bird dropdown. |
| **Sort** | `createdAt` / love count / random | order | Newest, Oldest, Most loved, A wander. |

**Dropped from the filter bar: Subject and any bird/species facet.** They would be dead axes (no new
data flows into them) and would reintroduce the exact clutter the owner is removing from upload. The
`subject`/`freeTags` columns stay in the DB for the legacy corpus, and caption search may keep ORing
`freeTags` so historical bird tags remain findable, but neither gets a dropdown.

---

## 4. The shared primitive: `FacetPill`

One component powers every facet on both pages. It is a full pill that **renders its own label and
value from props**, so it can never echo a raw value id (this is what kills the "all"/"relevance" bug at
the root; the fix does not depend on `<SelectValue>` behaving).

**States**

| State | Reads | Visual |
|---|---|---|
| Empty | `City` + chevron | `bg-secondary`, `border-border`, muted ink, chevron. |
| Open | `City` | same, plus the aligned dropdown panel; the panel's first row is always `Any city`. |
| Set | `City: Bangalore` + `x` | canopy: `border-canopy`, `text-canopy`, `bg-canopy/8`; chevron to change; `x` to clear this one facet. |
| Hover | (any) | `-translate-y-0.5`, slight surface lift (transform/opacity only). |
| Focus | (any) | single Leaf `focus-visible` ring. |
| Press | (any) | `active:scale-[0.97]` via `SpringPress`. |

**Value formatting** is owned by the pill, from the option label (never the slug):
`Profession: Arts & Media`, `House: Krishna`, `Batch: 2010 to 2018`, `When: 1990s`,
`Part of school: Senior School`, `Type: Teachers`.

**Variants**

- `FacetSelect` (single choice, built on the aligned `Select`). For long lists (City, House) it opens a
  searchable panel (combobox-style: a search input at the top of the panel, then options).
- `RangeFacetPill` (Batch) opens a small `Popover` with `From` and `To` year selects plus optional decade
  quick-presets. Renders `Batch: 2010 to 2018`, `Batch: 2010 onward`, `Batch: up to 2005`.
- `SortPill` is a `FacetSelect` that is never removable (sort always has a value) and never shows an `x`.
  Reads `Sort: Newest`.

**`Clear all`** is a ghost/text button (canopy text, pill hover) that appears only when at least one
facet is set. It resets every facet and the search box to the default browse state.

---

## 5. Directory filter bar

Keeps the locked two-tier progressive-disclosure model from `docs/spec/directory.md`, with Profession
and City promoted to the always-visible tier (Profession first, per the owner: younger alumni will lean
on it hardest).

### 5.1 Desktop (>= 1024px), inline bar above the Map / Batches / People view tabs

Primary row (always visible):

```
+---------------------------------------------------------------------------------------------+
| (search icon)  Search people by name, city, or work.............................            |
+---------------------------------------------------------------------------------------------+
| [ Profession v ]  [ City v ]        [ Sort: Newest v ]        [ More filters v ]  Clear all |
+---------------------------------------------------------------------------------------------+
```

`More filters` reveals the secondary rail inline (spring height, opacity). It carries a count badge when
any secondary facet is set (`More filters . 2`). Secondary rail:

```
+---------------------------------------------------------------------------------------------+
| [ Batch v ]   [ House v ]   [ Open to v ]   [ Type v ]                                       |
+---------------------------------------------------------------------------------------------+
```

Active example (Profession + City + House set): the pills themselves are the removable active filters,
so there is no duplicate chip row on desktop.

```
| [ Profession: Technology  x ]  [ City: Bangalore  x ]   [ Sort: Newest v ]  [ More filters . 1 v ]  Clear all |
| [ Batch v ]   [ House: Krishna  x ]   [ Open to v ]   [ Type v ]                                              |
+--------------------------------------------------------------------------------------------------------------+
   42 people                                                                    <- count, above results
```

### 5.2 Mobile (390px)

Facets do not fit inline, so they move into a bottom sheet (reuse `src/components/ui/sheet.tsx`). The bar
keeps the always-useful controls; a chip strip surfaces the applied facets outside the sheet (because the
pills live inside it).

```
+-------------------------------------------+
| (search)  Search people...                |
+-------------------------------------------+
| [ Sort: Newest v ]        [ Filters . 2 ] |   <- Filters button shows active count
+-------------------------------------------+
| Profession: Technology x   City: Bangalore x |  <- horizontally scrollable removable chips
| House: Krishna x              Clear all      |
+-------------------------------------------+
   42 people
```

Tapping `Filters . 2` opens the sheet with the full labelled facet list stacked, and a sticky footer:

```
+-------------------------------------------+
|  Filters                             (x)  |
+-------------------------------------------+
|  Profession            Technology     >   |
|  City                  Bangalore      >   |
|  Batch                 Any            >   |
|  House                 Krishna        >   |
|  Open to               Any            >   |
|  Type                  Everyone       >   |
+-------------------------------------------+
|  Clear all            [ Show 42 people ]  |   <- sticky footer
+-------------------------------------------+
```

### 5.3 Exact labels and option lists

- **Profession** (top row: `Any profession`, then the fixed 14): Technology, Finance, Healthcare,
  Education, Arts & Media, Law, Government, Non-profit, Research, Consulting, Entrepreneurship,
  Agriculture, Student, Other. This list is provisional; a fuller controlled vocabulary is a backlog
  item (owner: "professions need a defined vocabulary eventually").
- **City** (`Any city`, then distinct `UserPlace.city`, ordered by frequency then A-Z, searchable panel).
- **Batch** (range popover: `From` and `To` year selects populated from the real min..max `batchYear`,
  newest first; optional decade quick-presets 2020s / 2010s / 2000s / 1990s). Empty reads `Batch`.
- **House** (`Any house`, then the 22 from `src/lib/houses.ts`: Golden, Silver, Neem, Raavi, Palm,
  Trishul, Kailash, Meru, Nilgiri, Red, Green, White, Blue, Malli, Takshila, Amaltash, Gulmohar,
  Alamanda, Duranta, Jacaranda, Krishna, Cauvery; searchable panel).
- **Open to** (`Any`, then curated: Open to mentoring, Hosting visitors, Career chats, Hiring, Looking
  for work, Campus walks).
- **Type** (`Everyone` default = no filter, `Alumni`, `Teachers`).
- **Sort** (`Newest` default, `Name A-Z`, `Name Z-A`, `Batch: newest first`, `Batch: oldest first`;
  when a search is present, add `Best match` as the default). The word "Relevance" is removed entirely.

Search placeholder: `Search people by name, city, or work.`

---

## 6. Collection filter bar

Few enough facets to show inline on desktop; no `More filters` toggle needed.

### 6.1 Desktop

```
+-----------------------------------------------------------------------------------------------+
| (search) Search captions...    [ When v ]  [ Part of school v ]  [ Sort: Newest v ]  [+ Contribute] |
+-----------------------------------------------------------------------------------------------+
   128 photos
```

Active example:

```
| (search) Search captions...  [ When: 1990s x ]  [ Part of school: Senior School x ]  [ Sort: Most loved v ]  Clear all   [+ Contribute] |
   19 photos
```

`Contribute` stays pinned far-right and is a primary canopy pill (unchanged intent).

### 6.2 Mobile (390px)

```
+-------------------------------------------+
| (search) Search captions...               |
+-------------------------------------------+
| [ Sort: Newest v ]   [ Filters . 1 ]  [+] |   <- [+] = Contribute icon button
+-------------------------------------------+
| When: 1990s x        Clear all            |   <- chip strip when active
+-------------------------------------------+
   19 photos
```

Sheet contents mirror desktop facets (When, Part of school) with the same sticky
`Clear all` / `Show N photos` footer.

### 6.3 Exact labels and option lists

- **When** (`Any time` default, then decade buckets: Pre-1960s, 1960s, 1970s, 1980s, 1990s, 2000s,
  2010s, 2020s, and `Undated`). Backed by `era` today; a photo carrying a precise year filters into its
  decade. If year-level filtering is wanted later, the When pill can grow a `Popover` with a year range,
  same pattern as Batch.
- **Part of school** (`Anywhere on campus` default, then Junior School, Senior School, Whole Campus,
  Off Campus).
- **Sort** (`Newest` default, `Oldest`, `Most loved`, `A wander`). Already honest; just gains the
  `Sort:` prefix.
- Search placeholder: `Search captions...` (drops the "and birds" promise).

---

## 7. Empty and zero-result states

Distinguish "nothing here yet" from "your filters matched nothing".

- **Collection, truly empty** (no approved photos at all): keep the current warm card, "The collection
  is just beginning." plus the Contribute CTA. No filter chrome shown.
- **Collection, filtered to zero** (photos exist, filters exclude them all): warm card, heading
  "No photos match these filters.", body "Try widening When, or clear a filter.", and render the active
  chips plus a `Clear all` button right there. Offer `A wander` as a one-tap escape to browsing.
- **Directory, People view, zero** (reuse the existing `NoResultsHoopoe`): heading "No one matches
  these filters.", body "Try removing a filter or clearing your search.", with the active facet chips and
  `Clear all` shown inline so removal is one tap from the empty state.
- **Directory, Map view, filtered to zero**: the existing map-empty card, retitled "No one on the map
  matches these filters." with `Clear all`.
- **Result count** sits above every populated result set: `42 people` / `128 photos`. When filtered it
  may read `42 results`; the `Clear all` affordance is how the user learns the unfiltered total.

---

## 8. Active-state and clear-all behaviour (summary)

- A set facet pill = the active-filter pill. It shows `Label: Value` in canopy and an `x` that removes
  only that facet. No separate chip row on desktop (the pills are the chips).
- On mobile, because pills live in the sheet, a horizontally scrollable **chip strip** under the search
  bar mirrors the set facets (each `Label: Value x`) plus `Clear all`.
- `Clear all` appears only when at least one facet is set; it resets all facets and the search box and
  returns to the default browse state (Directory: back to Map/Batches; Collection: Newest, all photos).
- The mobile `Filters` button carries a count badge (`Filters . 2`); Directory's `More filters` toggle
  carries a count badge for set secondary facets.
- Setting any Directory facet switches the view to People (existing `hasFilter` behaviour is kept).
- All transitions are transform/opacity with `SpringPress` / `EASE_*` from
  `src/components/common/motion.tsx`. The `More filters` reveal and the sheet use `AnimatePresence`
  with a real exit.

---

## 9. Component plan (shared vs page-specific)

New shared home: `src/components/common/filters/`.

**Shared (both pages):**

- `FacetPill` / `FacetSelect` (labelled-value pill; renders its own label + value; searchable panel for
  long lists). The atom.
- `RangeFacetPill` (Batch-style from/to popover with presets).
- `SortPill` (non-removable FacetSelect reading `Sort: X`).
- `FilterToolbar` (lays out search + primary pills + sort + optional `More filters` + `Clear all`;
  on mobile renders search + Sort + `Filters (N)` button that opens the sheet).
- `FilterSheet` (mobile bottom sheet over `src/components/ui/sheet.tsx`, rendering the same facet defs
  with the sticky `Clear all` / `Show N` footer).
- `ActiveFilterChips` (mobile chip strip; reusable anywhere pills are not shown).
- `ResultCount` (the "N people" / "N photos" line).
- `FacetDef` type + the config-array contract: `{ key, label, kind: 'select' | 'range' | 'multi',
  options?, placeholder, emptyLabel }`. This array is the single source of "what filters exist".

**Page-specific (thin):**

- `directory-facets.ts` and `collection-facets.ts`: the config arrays (labels, option sources).
- Option-list data: Directory fetches distinct `UserPlace.city` (with counts) and uses the static
  Profession/House/Open-to/Type lists; Collection uses the static When/Part-of-school lists.
- State binding: Directory keeps **URL query params** (SSR, shareable, back-button friendly, already
  the pattern). Collection uses local state today; recommend it adopt URL params too for shareable
  filtered views (nice-to-have, not required for this rework).

This generalises the `<DirectoryToolbar>` idea in `docs/spec/directory.md` section 5 into one kit that
Collection also consumes, so there is exactly one filter UI in the app.

---

## 10. Server implications (high level; the query layer exists)

Directory: `src/app/(main)/directory/where.ts` + `page.tsx` + `actions.ts`. Collection:
`src/app/(main)/collection/actions.ts`.

1. **City -> UserPlace ANY-of (the EXISTS clause).** Replace the `currentCity`/`secondaryCity`
   `contains` pair in `buildDirectoryWhere` with a relation `some` over `places`:
   `where.places = { some: { city: { in: variants } } }` (case-insensitive on Postgres). Tier-1 search
   `q` gains `{ places: { some: { city: { contains: q, ...insensitive } } } }` in its OR. The City
   **option list** switches from `distinct User.currentCity` to `distinct UserPlace.city` (with counts).
   `buildPins` in `page.tsx` also reads `places` instead of `currentCity`; plot each person's primary
   city (`position = 0`) once on the map so multi-city people are not double-counted, while the City
   filter still matches any of their cities.
2. **Profession option list -> fixed enum.** Stop deriving options from `distinct workplace` (that is
   the org-bleed source). Serve the static 14-value list. The `where.workplace = value` match is
   unchanged. Free-text `workplace`/`jobTitle` stays in Tier-1 search.
3. **House.** `houses` is a JSON string. MVP: `where.houses = { contains: houseName }` (substring, a
   little loose). Clean path: the `HouseYear` child table proposed in `docs/spec/directory.md` section
   3.2, queried with `houseHistory: { some: { house } }`. Flagged as a tradeoff.
4. **Open to.** `where.openTo = { contains: label }` on the comma list. MVP-fine.
5. **Type.** `where.accountType = 'alumnus'` or `{ in: ['teacher','ex_teacher'] }`.
6. **Batch range.** Unchanged gte/lte on `batchYear`; only the UI presentation changes (one range pill).
7. **Sort.** Delete the `relevance` value and word. Default order stays `createdAt desc, batchYear desc,
   id asc`. Add `name` asc/desc and `batchYear` asc/desc. When `q` is present, keep name-prefix-first and
   label it `Best match`.
8. **Collection When / Part of school.** `where.era = value` and `where.area = value` unchanged. Drop
   `subject` and (optionally keep for search only) `freeTags` from the filter query. If a precise-year
   column is added by the upload rework, map decade buckets to year ranges.
9. **Counts.** Directory already returns `count(where)`. `loadPhotos` should also return a total count
   so Collection can show "N photos" (today it returns only `hasMore`).

---

## 11. Build checklist

1. Build the shared kit in `src/components/common/filters/`: `FacetPill`/`FacetSelect`,
   `RangeFacetPill`, `SortPill`, `FilterToolbar`, `FilterSheet`, `ActiveFilterChips`, `ResultCount`,
   `FacetDef`. Pills render their own label+value; canopy set-state; single Leaf focus ring; `SpringPress`.
2. Confirm against the aligned `Select`/`Popover` primitive (the parallel fix). The searchable panel
   (combobox) for City/House sits on top of it.
3. Write `directory-facets.ts` (Profession, City, Batch, House, Open to, Type, Sort) and
   `collection-facets.ts` (When, Part of school, Sort). Exact labels and options per sections 5.3 / 6.3.
4. Replace the Directory Tier-2 rail in `directory-client.tsx` with `FilterToolbar` (Profession + City +
   Sort always visible; Batch/House/Open to/Type behind `More filters`; active pills carry `x`; count
   above results; `Clear all`). Keep URL-param binding and the Map/Batches/People view logic.
5. Replace the Collection toolbar in `collection-client.tsx` with `FilterToolbar` (When + Part of school
   + Sort inline; caption search; `Contribute` pinned right). Remove the Subject and bird facets. Update
   the search placeholder to `Search captions...`.
6. Server: implement section 10 items 1-9. Priority order: (1) City -> UserPlace EXISTS, (2) Profession
   fixed-enum option list, (7) sort de-fake, then House/Open to/Type/Type, then Collection count.
7. Wire the mobile `FilterSheet` + `ActiveFilterChips` on both pages; `Filters` and `More filters` count
   badges.
8. Empty/zero states per section 7 (distinguish empty-collection from filtered-to-zero; chips + Clear all
   inside the zero state).
9. Screenshot desktop (1440) and mobile (390) for both pages, empty and active-filter states, minimum
   two rounds each. Verify at runtime (watch for `PrismaClientValidationError` on the new `places`/JSON
   queries), not just `tsc`.
10. Run `/simplify`. Security review is not required (read-only filter surface), but sanity-check that
    the new `places`/`houses` filters cannot leak blocked users (keep `isBlocked: false`).

Backlog (not this rework): a defined Profession controlled vocabulary; migrating `houses` JSON to a
`HouseYear` table; Collection filters in the URL for shareable filtered galleries; year-level When filter.
