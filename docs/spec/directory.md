# Spec: directory

Confirmed: no map library installed, no geo/lat-long fields, no house/section/tags model (only `tag` on Post). The `grep` matches for "house"/"map"/"geo" are incidental (CSS, dropdown words). I now have full grounding. Here is the complete spec.

---

# The Directory + World Map

## Design and architecture spec for RV Alumni

This is the core reason to join. Everything here is grounded in the real code: it extends the existing `/directory` route (`src/app/(main)/directory/page.tsx` + `directory-client.tsx`), reuses `ProfileCard` (`src/components/directory/profile-card.tsx`) and `UserAvatar` (`src/components/common/user-avatar.tsx`), and adopts the locked v2 visual language from `src/app/preview/v2/page.tsx`. No em dashes anywhere in copy.

---

## 1. The core problem and the decisions

The owner's three constraints, restated:

1. No default alphabetical list. The "two A's" person (Aarav Aggarwal) must not own the top of the page forever.
2. Search must be feature-rich but reveal complexity progressively. A casual user gets a single search box; a power user can summon batch, city, profession, tags, and house-history filters on demand.
3. A real, large, interactive world map of alumni, and it must solve the city-clustering problem where every Bengaluru alumnus stacks on one pixel.

### Decision 1: The default landing state is a dual-mode browse surface, not a list and not a blank box

The existing code already made a good call: when no filter is active it shows a **batch-year grid** (`batchYearCounts` buttons) instead of an alphabetical dump. We keep that instinct but elevate it. The directory index renders **two co-equal browse entries plus a prominent search**, never a flat list:

- A **search bar** pinned at the top (the single thing a casual user needs).
- A **mode switch** with two tabs: **Map** and **Batches**. (A third tab, **Recently joined**, is a small rail, not a tab; see below.)
- **Map is the default tab.** Rationale: the map is the single most distinctive, "wow", reason-to-explore artifact in the whole product, it has no alphabetical bias by construction, and it immediately communicates the scale and global reach of the community ("look how many of us are in London"). The batch grid is one tap away for the person who thinks in years, which is the other natural mental model for an alumni body.

We explicitly reject "show nothing until you search". A blank directory is hostile to the casual returning alumnus who has no specific name in mind and just wants to wander. The whole point of the directory is serendipity (rediscovering people you forgot about), and a blank box kills that. The map and batch grid both give a populated, explorable surface with zero typing while still avoiding the alphabetical-list trap.

### Decision 2: Progressive disclosure has exactly two tiers

- **Tier 1 (always visible):** one search input. It searches across name, city, workplace, job title, and tags in a single query. Plus a single "Filters" toggle button (this already exists in `directory-client.tsx`).
- **Tier 2 (on demand, behind the Filters toggle):** a filter rail with batch-year range, city, profession/industry, house, and tags. Hidden by default, expands inline. This matches the existing `showFilters` pattern, just with more controls.

A casual user never sees Tier 2 unless they ask for it. This is the "feature-rich but progressive" requirement satisfied literally.

### Decision 3: Results are never a raw alphabetical list

When a search or filter is active, results render as the existing `ProfileCard` grid, but the default sort is **relevance, then recency of joining, then batch-year descending**, never name-ascending. Name-ascending is available as an explicit sort option but is never the default. This is the direct fix for the "two A's" complaint. (Today the code does `orderBy: [{ name: "asc" }]` at `page.tsx:56`. That changes. See section 6.)

---

## 2. Information architecture and routes

The directory lives under the authenticated `(main)` route group (everything there requires auth, per `AGENTS.md`). It uses the flush green sidebar and ruled-sheet content area from v2.

```
/directory                          Index. Search + [Map | Batches] tabs. Map is default.
/directory?view=batches             Batch grid (the year browser).
/directory?view=map                 Explicit map (also the default when no view param).
/directory?q=ananya                 Search results grid (relevance sorted).
/directory?year=2009                Drill into one batch -> results grid.
/directory?city=Bengaluru           Drill into one city -> results grid.
/directory?industry=Technology      Profession filter.
/directory?house=Krishna            House filter (new).
/directory?tag=mentoring            Tag filter (new).
/directory?lat=12.97&lng=77.59&...  Map pan/zoom state for shareable links (optional).
/directory/map                      Optional dedicated fullscreen route (see 4.7).
/profile/[id]                       Existing profile page. Cards and map pins link here.
```

All filter state lives in the URL query string. This is already the established pattern (`directory-client.tsx` uses `useSearchParams` and `router.push`), it makes every directory state shareable and back-button friendly, and it lets the server component do the data fetching. We keep it.

### The map as a tab vs a separate page

The map is rendered **inline as a tab inside `/directory`** by default, AND offered as a fullscreen mode. The inline version is sized to fill the content column at a generous height (see 4.1). A "Fullscreen" button promotes it to an overlay (or the `/directory/map` route) that fills the viewport edge to edge, hiding the sidebar. Rationale: the map needs room to breathe and is a destination in itself, but forcing a route change for the default view would make the directory feel empty on first load. Inline-by-default, fullscreen-on-demand gives both.

---

## 3. Data model deltas (Prisma)

The current `User` model (`prisma/schema.prisma:10-46`) has `currentCity` (free text), `workplace`, `jobTitle`, `batchType`, `batchYear`, `yearJoined`, `yearLeft`, `admissionNumber`, `avatarColor`. It has **no** geocoordinates, **no** structured city, **no** house data, and **no** tags. The owner explicitly wants house PER YEAR, class sections, profession, and tags. Here are the concrete deltas.

### 3.1 Location: structured city reference with cached coordinates

Free-text `currentCity` is the root of the clustering problem and a search problem ("Bangalore" vs "Bengaluru" vs "bangalore, india" are three different strings today). We introduce a **canonical `City` table** and keep `currentCity` only as a denormalized display string for backward compatibility.

```prisma
model City {
  id          String  @id @default(cuid())
  name        String                 // canonical display name, e.g. "Bengaluru"
  asciiName   String                 // for accent-insensitive search, e.g. "bengaluru"
  country     String                 // "India"
  countryCode String                 // ISO-2, "IN", drives flag + region grouping
  admin1      String?                // state/region, "Karnataka"
  lat         Float                  // city centroid
  lng         Float
  population   Int?                  // optional, lets us bias geocoding to the bigger city
  userCount    Int     @default(0)   // denormalized count, maintained on profile save
  createdAt    DateTime @default(now())

  users User[]

  @@unique([asciiName, countryCode])   // dedupe "bangalore"/"Bangalore" within a country
  @@index([country])
  @@index([userCount])
}
```

And on `User`:

```prisma
model User {
  // ... existing fields ...
  cityId        String?
  city          City?   @relation(fields: [cityId], references: [id])
  // currentCity String?  // KEEP as a denormalized display label; written from City.name on save.
  // ... existing fields ...
  houseHistory  HouseYear[]
  profileTags   ProfileTag[]
}
```

Why both `cityId` and the existing `currentCity` string:

- `cityId` gives us a single canonical point with `lat`/`lng` for the map, a stable key for the city filter dropdown, and dedupe.
- We do not drop `currentCity`. It stays as a denormalized snapshot of `City.name` so the existing `ProfileCard`, profile page, and feed rail (`v2` "New in the directory") keep working with zero query changes, and so a user can store a city we have not geocoded yet (free text fallback). The save action writes both: it resolves the typed city to a `City` row (creating one via geocoding if needed) and copies the canonical name into `currentCity`.

This is the "city reference with lat/long" the brief asked for, with a free-text safety net. Coordinates are stored on `City`, not on `User`, so 200 Bengaluru alumni share one geocode lookup and one centroid, never 200 lookups.

### 3.2 House history (house PER YEAR)

Rishi Valley assigns houses, and the owner specifically wants house per year, because alumni changed houses across their time in the valley. A single `house` string cannot express that. We model it as a child table.

```prisma
model HouseYear {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  year   Int                 // calendar year, e.g. 2007
  house  String              // canonical house name; validated against a known set
  // optional: section String?  // class section if the owner wants per-year sections too

  @@unique([userId, year])    // one house per user per year
  @@index([house])
}
```

For the directory filter we do not need per-year granularity in the query: "show me everyone who was ever in Krishna House" is `users where ANY houseYear.house = 'Krishna'`. The per-year detail is shown on the profile (a small timeline like "Krishna 2003 to 2006, then Aditi 2006 to 2009"). The house list should be a fixed enum in code (the real RV house names), with a "Don't remember" path that simply records no `HouseYear` row, honoring the owner's "always offer don't remember" rule.

### 3.3 Tags (interest and intent tags)

The v2 profile already shows soft tags ("Open to mentoring", "Hosting visitors", "Coffee in Bengaluru") at `preview/v2/page.tsx:348-352`, but they are hardcoded. We make them real and searchable.

```prisma
model ProfileTag {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  slug   String              // canonical, e.g. "open-to-mentoring"
  label  String              // display, e.g. "Open to mentoring"

  @@unique([userId, slug])
  @@index([slug])
}
```

Tags come from a **curated starter set** (Open to mentoring, Hosting visitors, Hiring, Looking for work, Happy to give career advice, Up for a campus walk) plus a small number of free tags. Curated tags keep the filter dropdown meaningful at scale; fully free tags would fragment into 600 one-off strings. Slugs dedupe casing.

### 3.4 Profession

`workplace` (used as "industry" in onboarding, see `onboarding/page.tsx:69-91`) and `jobTitle` already exist and are sufficient. We do not add a new model. We do treat the onboarding industry `<select>` list as the canonical profession enum for the filter dropdown. Note the current code conflates "industry" and "workplace" (the field is literally named `workplace` but populated from an industry select). The spec recommendation: rename the user-facing label to "Field of work" everywhere and keep using `workplace` as the column to avoid a migration, OR add a dedicated `industry` column. Either is fine; the directory filter reads whichever column holds the enum value.

### 3.5 Migration and backfill plan (SQLite local, Postgres on Render)

1. `npx prisma db push` adds `City`, `HouseYear`, `ProfileTag`, and `User.cityId`.
2. A one-time backfill script geocodes every distinct existing `currentCity` string into a `City` row and links users. Geocoding source: a **bundled offline gazetteer** (see 4.5), so the backfill runs with no network and no API key, which matters on Render. Unmatched strings stay as `currentCity` text with `cityId = null` and surface in an admin "needs geocoding" list.
3. `City.userCount` is recomputed at the end of the backfill and thereafter incremented/decremented in the profile-save server action whenever a user's `cityId` changes.

---

## 4. The world map

This is the centerpiece. The requirements: zoomable, interactive, large/fullscreen, solves city clustering, works on Render with no heavy or paid dependency, reuses the shared avatar.

### 4.1 Layout and sizing

- **Inline (default tab):** the map fills the main content column (the `minmax(0,1fr)` column from `.v2-inner`) at `height: min(72vh, 720px)`, with rounded corners matching `--r-card` (18px) and the v2 card shadow. The right rail (`318px`) still shows "New in the directory" and a live "Top cities" list so the page is not just one big rectangle.
- **Fullscreen:** a "View fullscreen" button (top-right of the map, a `v2-iconbtn` style) promotes the map to a fixed overlay covering the viewport, sidebar hidden, with a floating search/filter pill top-left and a close affordance top-right. Escape closes it. This is where someone actually explores.
- **Mobile (390x844):** map height `52vh`, controls collapse to a single floating "Filters" FAB and a bottom sheet (reuse `src/components/ui/sheet.tsx`) for the city drilldown list. Pins use larger touch targets (min 44x44 tap area even if the dot is smaller). Per the project's hard rule, both viewports get screenshotted during implementation.

### 4.2 Tech approach: MapLibre GL JS with a free vector style, with an SVG fallback. Recommendation: start with the lightweight SVG approach for MVP.

I evaluated three options against "must work on Render, no heavy paid deps, zoomable, interactive, handles clustering at scale":

| Option | Zoom/pan | Clustering | Bundle/runtime | Paid? | Verdict |
|---|---|---|---|---|---|
| **A. Inline SVG world (TopoJSON + d3-geo)** | Manual pan/zoom via transform | We implement clustering ourselves (we want this anyway, see 4.3) | Small. `topojson-client` + `d3-geo` are a few tens of KB; the world geometry at 110m resolution is ~100KB gzipped and bundled, no tiles | Free, fully offline | **Recommended for MVP.** No external tile host, nothing to break on Render, full control of the aesthetic so it matches the warm v2 palette exactly. |
| **B. MapLibre GL JS + free raster/vector style** | Native, buttery | Built-in GeoJSON clustering (`cluster: true`) | Larger (~200KB+ for maplibre-gl) and needs a tile/style URL. Free demo tiles exist but rate-limited; self-hosting tiles is heavy | Free lib, but good tiles usually cost money or need self-hosting | Phase 2 upgrade if we outgrow the SVG. Tile dependency is the risk on a small Render box. |
| **C. Leaflet + OSM raster tiles** | Native | Plugin (`Leaflet.markercluster`) | Medium. Depends on OSM tile servers (usage-policy limited, not for production load) | Tiles effectively require a paid provider for real traffic | Rejected. Tile dependency and OSM usage policy are exactly the "heavy/paid dep" the brief warns against. |

**Decision: ship MVP with Option A, the inline SVG world map.** It is the only option with zero external runtime dependency, which is the safest possible answer to "must work on Render". The community is invite-only and modest in size, so a custom-rendered SVG with a few hundred pins is trivially performant. The aesthetic control is a real win: a tile map (Leaflet/MapLibre default styles) would clash with the ecru/leaf-green warmth of v2, whereas an SVG we paint ourselves uses `--surface`, `--border`, `--sidebar` green for landmasses, and the brand accent for pins. We design the clustering layer (4.3) to be map-engine agnostic so that if the community grows and wants true street-level zoom, we can swap the SVG renderer for MapLibre later without changing the data pipeline. This is the "scalable but not over-engineered" balance the owner asked for.

Concrete libraries to add (all small, well under the 200MB rule, none paid):
- `d3-geo` (projection + path generation) and `topojson-client` (decode the world geometry).
- A world atlas TopoJSON at 110m resolution, bundled as a static asset under `public/` so it ships with the app and needs no fetch from a third party.
- Pan/zoom via a thin `d3-zoom` binding on the SVG `g` transform, or a hand-rolled wheel/drag handler to keep the dependency surface tiny. `d3-zoom` is the pragmatic choice.

Projection: **`geoNaturalEarth1`** or `geoEqualEarth`. Both are visually pleasant world projections that avoid the Greenland-is-huge Mercator distortion, which matters because RV alumni cluster in India, the Gulf, the UK, and North America, and we want those regions to read at honest relative sizes.

### 4.3 Solving city clustering (the central map problem)

The problem: everyone who typed "Bengaluru" resolves to one `City` centroid (12.9716, 77.5946). At country zoom, 200 alumni land on one pixel. Three layered techniques, all driven off the `City` table:

**4.3.1 Aggregate to city points with counts (primary).** The map never plots one pin per user. It plots **one pin per `City`**, sized and labeled by `City.userCount`. A pin for Bengaluru with 212 alumni is a larger disc reading "212"; a pin for a town with 1 alumnus is a small dot. This is computed server-side as a cheap `groupBy cityId` (or directly from the denormalized `City.userCount`), so the payload to the client is "list of cities with lat, lng, count", not thousands of users. At a realistic community size this is a few hundred points, tiny.

Pin sizing uses a `d3-scaleSqrt` (area proportional to count, so a 200-count city is not 200x the diameter of a 1-count city). Pin color: brand leaf green by default, with the alumni-office blue accent for the largest few cities so the eye finds the hubs.

**4.3.2 Zoom-dependent superclustering (secondary).** When fully zoomed out, even city pins overlap (Bengaluru, Mysuru, Chennai merge in southern India). We run a **distance-based supercluster keyed to the current zoom level**: cities within N screen-pixels of each other at the current zoom collapse into a single super-pin showing the combined count and a region label ("South India, 540"). As the user zooms in, super-pins split back into individual city pins. This is the same idea Mapbox/Leaflet clustering use, implemented over our own points. The well-known `supercluster` library (the one MapLibre/Mapbox use under the hood) is tiny, framework-agnostic, takes GeoJSON points with a `count` weight, and returns clusters per zoom/bbox. We use it as the clustering engine regardless of whether the renderer is SVG or, later, MapLibre. This keeps clustering independent of the map engine, honoring the modular/reuse principle.

**4.3.3 Jitter for intra-city disambiguation (tertiary, only when drilled in).** Jitter (randomly offsetting overlapping points) is the wrong tool at the aggregate level: it implies false precision (no, that alumnus does not live 2km northeast of city center) and it makes counts unreadable. So we **do not jitter the aggregate pins.** Jitter appears only in one place: when a user has zoomed in far enough that a single city pin would otherwise hide multiple people AND they have chosen to expand it, we can scatter the individual member avatars in a tight deterministic ring around the centroid (deterministic offset seeded by user id, so it does not jump on re-render). Even then, the better interaction is the drilldown list (next).

**4.3.4 City drilldown list (the real answer to "who is actually here").** Clicking any city pin opens a **city panel** (a side drawer on desktop using the rail space, a bottom `Sheet` on mobile) titled "Bengaluru, 212 alumni" containing a scrollable, paginated list of `ProfileCard`s (or a compact avatar+name+batch row variant) for that city. This is the honest, scalable way to answer "show me everyone in Bengaluru": a real list with search-within and batch-filter, reusing the exact same `ProfileCard` and `UserAvatar` components as the grid. The map answers "where", the drilldown answers "who". This is the cleanest resolution of the clustering problem: counts on the map, people in the panel.

So the full clustering answer is: **aggregate to cities with sqrt-scaled counted pins, supercluster overlapping cities by zoom, never jitter aggregates, and drill into a real paginated people-list per city.** Jitter is reserved for the rare zoomed-in expanded case and is deterministic.

### 4.4 Map interactions and states

- **Hover a pin:** tooltip with city name, count, and the top 3 alumni avatars (reusing `UserAvatar` at `sm`).
- **Click a pin:** open the city drilldown panel (4.3.4).
- **Click a supercluster:** zoom the map to fit that cluster's bounds (standard "click to expand").
- **Search while map is open:** the same Tier-1 search box filters which cities are lit. Typing "London" pans/zooms to London and highlights it. Typing a name pulls up that person and drops a single highlighted pin on their city.
- **Filters while map is open:** Tier-2 filters (batch range, house, profession, tags) recompute the pin counts live. "Show me Krishna House alumni" repaints the map with Krishna-only counts per city. This is the delightful, genuinely useful intersection of map and filters.
- **Empty/sparse states:** a city with alumni whose location we could not geocode does not vanish; an "Unmapped, 14 alumni" chip sits in the corner and opens a drilldown of users with `cityId = null`, nudging them (or an admin) to fix their city. This prevents people silently disappearing from the directory just because their city string did not geocode.
- **Loading state:** the map frame and a skeleton globe render immediately (reuse `src/components/ui/skeleton.tsx` and the existing `directory/loading.tsx` pattern), pins fade in (`opacity` only, per the no-`transition-all` rule).

### 4.5 Geocoding strategy (no paid API, Render-safe)

We must turn "Bengaluru, India" into lat/lng without a paid geocoding service and without a fragile network call on every signup. Approach:

- Bundle an **offline city gazetteer** as a static dataset (a trimmed GeoNames "cities with population > 5000" extract, which is public-domain CC-BY and a few MB as a compact JSON/SQLite asset). It maps `(asciiName, countryCode)` to `lat`, `lng`, `population`, `admin1`. This lives in `public/` or as a seed table and is queried in-process during the profile-save server action. Zero external calls, works identically on local SQLite and Render Postgres.
- Save flow: user types a city, an autocomplete (server action hitting the gazetteer) offers canonical matches ("Bengaluru, Karnataka, India"), they pick one, we upsert the `City` row from the gazetteer entry and set `cityId`. If they type something not in the gazetteer, we store the raw `currentCity` string with `cityId = null` (the "unmapped" bucket). This makes the city field both forgiving and structured, and it is where the autocomplete kills the "Bangalore vs Bengaluru" fragmentation at the source.
- We deliberately avoid live third-party geocoders (Google/Mapbox) because they are paid, rate-limited, and a network dependency on the signup hot path, all of which the brief and CLAUDE.md storage/dependency rules push against.

### 4.6 Privacy

Location is opt-in granularity. A user can show their city on the map, or set visibility to "country only" (their pin contributes to a country-level count but not a city pin), or hide from the map entirely while still appearing in search. This is one small `mapVisibility` enum on `User` (`city` | `country` | `hidden`, default `city`). The directory is invite-only and verified, so defaults can be open, but giving an "I do not want a pin on my exact city" escape is the respectful choice and trivial to honor in the aggregation query.

### 4.7 Why also offer `/directory/map`

A dedicated route gives a clean shareable, bookmarkable, deep-linkable fullscreen map (e.g. an admin shares "look at our London cluster"). The inline tab and the route render the same `<AlumniMap>` component with different chrome. This is pure reuse.

---

## 5. Reusable components (modularity)

The brief stresses modular reuse. Here is the component decomposition and what is shared.

**Reused as-is:**
- `UserAvatar` (`src/components/common/user-avatar.tsx`): every pin tooltip, drilldown row, and result card uses it. In v2 it gains the optional bird-glyph default and photo override (see `Avatar` in `preview/v2/page.tsx`); the directory consumes whatever the shared avatar becomes, it does not fork it.
- `ProfileCard` (`src/components/directory/profile-card.tsx`): the search/filter results grid and the city drilldown list both render this. One card, three contexts.
- `Sheet`, `Select`, `Input`, `Button`, `Skeleton`, `Card` from `src/components/ui/`: filters, mobile drawers, loading.

**New, but built for reuse:**
- `<AlumniMap points={cityPoints} onCityClick=... filters=... />`: the renderer. Engine-agnostic over the clustering layer. Used inline and fullscreen.
- `<MapClusterLayer>` / a `useSupercluster(points, zoom, bounds)` hook: clustering logic, independent of SVG vs MapLibre, so a future engine swap touches only the renderer.
- `<CityDrilldown city=... />`: the per-city people panel. Internally paginates and renders `ProfileCard`s. The same panel powers the "Unmapped" bucket.
- `<DirectoryToolbar>`: the Tier-1 search + Tier-2 filter rail, extracted from today's `directory-client.tsx`. It is shared between the Batches view, the Map view, and the results grid so search/filter state and UI are identical across all three. This is the single source of "what filters exist".
- A compact `ProfileRow` variant (avatar + name + batch + city, one line) for dense lists (tooltips, drilldown at scale). It is a thin layout over the same `UserAvatar` + `formatBatch`, not a new card.

**Cross-feature reuse:** the v2 feed rail already has a "New in the directory" card (`preview/v2/page.tsx:503-514`) and the profile shows location and house. Those consume the same `City`/`HouseYear` data and the same avatar. The directory does not own a private copy of any of this.

---

## 6. Search, sort, and the anti-alphabetical fix (server-side detail)

This replaces the logic in `src/app/(main)/directory/page.tsx` and the `/api/users/search` route.

**Tier-1 search across multiple columns.** Today the page only does `where.name = { contains: q }` (`page.tsx:20-21`) and the search API likewise only matches name (`api/users/search/route.ts:17`). We broaden Tier-1 to an OR across name, `currentCity`, `workplace`, `jobTitle`, and joined `profileTags.label`:

```ts
where.OR = [
  { name: { contains: q } },
  { currentCity: { contains: q } },
  { workplace: { contains: q } },
  { jobTitle: { contains: q } },
  { profileTags: { some: { label: { contains: q } } } },
]
```

Note: SQLite `contains` is case-sensitive by default in Prisma, and `mode: "insensitive"` is a Postgres-only feature. Since local is SQLite and prod is Postgres, the implementation should normalize: store an `asciiName`/lowercased search column (we already added `City.asciiName`) and query against lowercased input, OR gate `mode: "insensitive"` to the Postgres path. This is a real correctness edge the current single-column search quietly has too; worth fixing here.

**Tier-2 filters** add to the `where`:
- `year` (existing) plus a `yearFrom`/`yearTo` **range** for batch spans, since alumni think "early 2000s", not one year.
- `city` becomes `cityId` (canonical) rather than the free-text equality at `page.tsx:25-26`.
- `industry` -> `workplace` (existing).
- `house` -> `houseHistory: { some: { house } }` (new).
- `tag` -> `profileTags: { some: { slug } }` (new).

**Default sort changes from name-asc to a non-alphabetical relevance order.** Concretely:
1. If `q` present: exact name prefix matches first, then other matches.
2. Then `createdAt` descending (newest members surface, which keeps the directory feeling alive and rewards recent joiners, directly answering the "two A's dominate forever" complaint).
3. Then `batchYear` descending.
4. Name-ascending is offered as an explicit user-selectable sort, never the default.

**Pagination at scale.** The owner expects clutter at scale (600 posts/month implies a non-trivial member count over years). The current `take: 100` (`page.tsx:57`) is a silent cap that just drops people. Replace with real cursor pagination (cursor on the composite sort key) and a "Load more" / infinite scroll using `@formkit/auto-animate` for the append transition (already a dependency). The city drilldown paginates the same way. Counts ("212 alumni") come from a cheap `count()` so the header is honest even when only 24 cards are loaded.

---

## 7. Edge cases and decisions

- **Single-person cities and privacy.** A city with exactly one alumnus plus that person being identifiable is fine (invite-only, verified community), but the `mapVisibility: "country"` option exists precisely for the person in a small town who does not want to be the only pin there.
- **"Don't remember" everywhere.** No `HouseYear` row, `cityId = null`, no tags: all are valid states. The profile and cards degrade gracefully (the existing `ProfileCard` already conditionally renders city/job at lines 33-48). The map's "Unmapped" bucket catches null-city users so they are never invisible.
- **Stale `userCount`.** Denormalized `City.userCount` can drift if a save path forgets to update it. Mitigation: it is recomputed in one place (the profile-save server action), plus a nightly/admin "recount cities" maintenance action. The map can also compute counts live via `groupBy` if we distrust the cache; the denormalized field is an optimization, not the source of truth.
- **Teachers, not just alumni.** Per the brief, past and present teachers can join even if they never studied at RV. A teacher has no ICSE/ISC `batchYear` in the normal sense. The directory must not assume everyone has a graduating batch. Decision: introduce a `memberType` (`alumnus` | `teacher`) and, for teachers, show "Faculty, taught 1998 to 2012" in place of "Batch of '09", and let the batch-year browser have a "Faculty" group alongside the year tiles. The `batchYear` column becomes nullable in practice for teachers (today it is non-null at `schema.prisma:25`; this needs to relax or teachers need a sentinel). The map and city logic are identical for teachers; only the batch dimension differs. Flag this as a schema change coordinated with whoever owns auth/onboarding.
- **Map with zero data.** Before backfill or in a fresh deploy, the map shows a friendly empty state ("The valley is just getting started. As alumni add their cities, they will appear here.") rather than a blank globe. Reuse the empty-state styling already in `directory-client.tsx:170-177`.
- **Performance ceiling.** SVG with a few hundred animated pins is fine. If pin count ever exceeds a couple thousand simultaneously visible (unlikely given clustering), we either rasterize pins to a single `<canvas>` overlay or trigger the MapLibre upgrade. The clustering layer already caps visible pins per zoom, so this is mostly theoretical.
- **No em dashes** in any of the copy strings above ("212 alumni", "View fullscreen", "South India, 540", "taught 1998 to 2012"); all ranges use "to".

---

## 8. Recommended default layout (the concrete answer)

When an authenticated user lands on `/directory` with no query params, they see, top to bottom, inside the v2 shell (flush green sidebar + ecru content with the faint landing-photo background):

1. **Header.** "Alumni Directory" in Libre Baskerville, subtitle "Find the people who grew up under the same trees." (reuses the existing header block at `page.tsx:78-84`, restyled to v2).
2. **Toolbar.** One search input (Tier 1) + a "Filters" toggle (Tier 2 hidden) + a sort menu. This is `<DirectoryToolbar>`.
3. **Mode tabs:** `[ Map ]  [ Batches ]`, Map selected by default.
4. **The map**, filling the content column at ~72vh, pins aggregated by city with counts, supercluster at low zoom, "View fullscreen" button top-right, "Unmapped (N)" chip bottom-left.
5. **Right rail:** "Top cities" (a live count list, clicking a city opens its drilldown) and "Recently joined" (the existing rail card, real data). The rail collapses below 1080px exactly as v2 already does.

Switching to **Batches** swaps the map for the existing year-tile grid (kept, but tiles restyled to v2 `glass` cards and including a "Faculty" tile). Typing in search or applying any filter swaps either view for the **relevance-sorted `ProfileCard` grid** with pagination. The map and the batch grid are the two zero-typing browse surfaces; search and filters are the targeted path; the city drilldown is how the map hands off to real people. Nothing, in any state, is a default alphabetical list.

---

## 9. Summary of concrete changes

| Area | Change | File(s) |
|---|---|---|
| Schema | Add `City`, `HouseYear`, `ProfileTag` models; `User.cityId`, `User.mapVisibility`, `User.memberType`; relax `batchYear` for teachers; keep `currentCity` as denormalized label | `prisma/schema.prisma` |
| Default layout | Map-default index with Map/Batches tabs; map fills screen when no search | `directory/page.tsx`, `directory-client.tsx` |
| Search | Broaden Tier-1 to name/city/workplace/jobTitle/tags OR; case-insensitivity normalization; relevance sort (not name-asc); cursor pagination replacing `take: 100` | `directory/page.tsx`, `api/users/search/route.ts` |
| Filters | Add batch-range, house, tag filters behind the existing Filters toggle; city becomes `cityId` | `directory-client.tsx` (extract `<DirectoryToolbar>`) |
| Map | New `<AlumniMap>` (SVG + `d3-geo` + `topojson-client`), `useSupercluster` clustering hook, `<CityDrilldown>` panel, fullscreen overlay and optional `/directory/map` route | new `src/components/directory/map/*` |
| Clustering | Aggregate-by-city counted pins (sqrt scale), zoom-based supercluster, no aggregate jitter, paginated city drilldown, "Unmapped" bucket | `useSupercluster` + `<CityDrilldown>` |
| Geocoding | Offline bundled gazetteer + city autocomplete in profile save; zero paid/network deps (Render-safe) | new gazetteer asset + save action |
| Reuse | `ProfileCard`, `UserAvatar`, `Sheet`, `Select`, `Skeleton` reused; new pieces built engine-agnostic | existing `src/components/common`, `src/components/ui` |

New dependencies (all small, none paid, all well under the 200MB rule): `d3-geo`, `topojson-client`, `d3-zoom`, `supercluster`, plus a bundled world-atlas TopoJSON and a trimmed GeoNames gazetteer as static assets. MapLibre GL is deliberately deferred to a possible phase 2 and is not required for MVP.

Relevant files read for grounding (all absolute): `/Users/sanan/Documents/rv-alumni/prisma/schema.prisma`, `/Users/sanan/Documents/rv-alumni/src/app/preview/v2/page.tsx`, `/Users/sanan/Documents/rv-alumni/src/app/(main)/directory/page.tsx`, `/Users/sanan/Documents/rv-alumni/src/components/directory/directory-client.tsx`, `/Users/sanan/Documents/rv-alumni/src/components/directory/profile-card.tsx`, `/Users/sanan/Documents/rv-alumni/src/components/common/user-avatar.tsx`, `/Users/sanan/Documents/rv-alumni/src/app/api/users/search/route.ts`, `/Users/sanan/Documents/rv-alumni/src/app/api/users-by-batch/route.ts`, `/Users/sanan/Documents/rv-alumni/src/lib/utils.ts`, `/Users/sanan/Documents/rv-alumni/src/lib/validators.ts`, `/Users/sanan/Documents/rv-alumni/src/app/(auth)/onboarding/page.tsx`.