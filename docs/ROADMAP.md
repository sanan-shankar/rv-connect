# RV Alumni — MVP Build Roadmap

_Synthesized by the architecture workflow (wpud23338). Source of truth for build order, decisions, component inventory, and data model._

# RV Alumni — MVP Build Plan (ships to Render)

This is the single, contradiction-free build plan synthesized from all area specs. It is light-mode-first, modular-reuse-first, and ordered so shared pieces land before the surfaces that consume them. No em dashes anywhere in shipped copy.

---

## 1. DECISION LOG

### Naming and identity
- **Long-form post type is "Letters."** A Letter is a `Post` with `kind="letter"` (title + serif reading view), not a new model. Reuses the shared composer and feed. Warm, single-author, on-brand.
- **Recurring newsletter feature (Letterloop-style), working name "Catch-ups."** ("Roundups" rejected by owner: not self-evident. Alternatives: Circles, Almanac.) Many-author, scheduled, archived; a single instance is an "issue." First-run needs a one-line explanation of what it is. Distinct from "Letters" (long-form post). Name is just a label, easy to swap.
- **Photo archive is "The Valley Collection"** (route `/collection`, sidebar label "Collection"). Frames it as a communal, place-not-people body of work; no collision with the profile "Photos" tab or with "Letters."
- **Default avatar is a procedurally generated valley bird** (12 species x 16 discs x 4 variations = 768 combos), deterministic from `User.id`, off-white silhouette on a saturated disc. Photo upload overrides; initials are the legacy fallback only.
- **Directory default landing is a dual-mode browse surface with Map as the default tab** (Map | Batches), never an alphabetical list. The world map is the distinctive draw and has no alphabetical bias.

### Scope and platform
- **Dark mode is parked for MVP. Ship light-only.** Remove the toggle, set `forcedTheme="light"`, keep `.dark` scaffolding unshipped. Light mode is the brand's character.
- **Deploy to Render on an always-on Starter Web Service (~7 USD/mo).** Kills cold starts, the top slowness cause for an infrequently-checked site. Never the free tier for the app.
- **Database moves to Render Postgres, co-located in the app's region.** Removes the per-query remote-HTTP tax. Start free for launch, move to cheapest paid persistent instance the moment real data lands. Keep the Prisma singleton; no connection pooler for MVP (long-running Node process).
- **Image storage stays on Vercel Blob** even after compute moves to Render (Render disks are ephemeral). Wrap `put`/`del` in a one-file `src/lib/storage.ts` shim for a future R2 drop-in.
- **Keep DB-backed sessions, co-located** (not a JWT migration now; the admin-login bypass is fragile).
- **Magic links removed.** Email + password primary; Resend stays for transactional mail. Delete `/verify` and `magic-link-sent.tsx`.

### Architecture
- **One `<Composer/>`, one `<Feed/>`, one `<PostCard/>` everywhere**, parameterized by `scope`. Biggest reuse fix.
- **`GroupPost` folds into `Post`** via nullable `groupId`. Group posts become real `Post` rows and inherit likes, comments, polls, reports, mentions for free.
- **A Roundup always belongs to a Group**; participants = members; privacy inherited. No standalone Roundups.
- **Feed pagination migrates to keyset (cursor) on `(createdAt, id)`** for recent sort, preserving `{posts, hasMore}`.
- **Cross-batch Letters is NOT a separate feature**; it is the `targetBatches` audience picker on a Letter plus arbitrary group membership for Roundups.

### Visual system
- **Surfaces dimmed and warmed; pure white only on floating modals.** Base `#E9E6DD`, surface `#FAF8F3`, recessed `#EFEBE1`, border `#DED9CC`, `--surface-float:#FFFFFF`.
- **Sidebar green darkens to `#235C49`**; active accent lit leaf `#34C759`.
- **Purposeful accents:** leaf primary `#1F8A4C`, office blue `#3F7CA6` (pop), cinnamon `#C2622F` (warm/"saved"), heart red `#E03A33`. 10-color avatar disc palette replaces the muddy browns.
- **The like-heart-flashes-black bug is fixed** by removing `color` from the universal transition and giving the heart an explicit non-transitioning red.

### Delight and trust
- **Sanctioned easter eggs spread across surfaces:** hoopoe-covers-eyes on auth, bird-avatar chirp on your own avatar, bookmark ribbon sweep, living loading scene (max 2 routes), hardened like-pop, event-triggered bell-shake. All `transform`/`opacity`, reduced-motion-safe, no audio by default.
- **Verified marker is non-obvious:** small tinted leaf glyph after the name (green alumni / office-blue teachers), tooltip on hover/focus, nothing for unverified/pending/flagged.

---

## 2. SHARED COMPONENT INVENTORY (build first)

**Shell/nav**
- `<AppShell rightRail?>` — flush green sidebar + content + optional rail; rail presence switches 3-col (1180px, `minmax(0,1fr) 318px`) vs 2-col (1040px); background image inside `.content`. Replaces `Navbar + max-w-7xl + Footer`.
- `<Sidebar active user>` (client, `usePathname`) — `#235C49`, sticky full-height. Order: Feed, Directory, Groups, Collection, Letters, Roundups, Events, About; bottom user chip + gated Admin. Below `md`: bottom tab bar + More sheet.
- `<PageHeader title subtitle actions>` — shared head; hosts `<NotificationBell>` + expand-on-click search pill; per-page primary CTA.

**Identity**
- `<BirdAvatar user={{id,name,photoUrl?,avatarColor?,avatarSpecies?}} size ring? interactive?>` — server by default; precedence photo > manual > hash; `size` token (28/40/64/104) or px; `interactive` opts into client chirp (self only); links name+avatar to `/profile/[id]`. FNV-1a hash, salted per axis, chi-square test. Supersedes `UserAvatar`.
- `<PersonName user>` — name as `Link` to profile, hover underline.
- `<VerifiedMark user>` — quiet leaf glyph + `<RevealTooltip>` or nothing.

**Posts**
- `<Composer scope placeholder? collapsed? onPosted?>` — single editor; `scope = post | {group,groupId} | letter`; keeps collapse/expand, markdown `wrapSelection`, mentions, image upload, polls, tags; letter mode adds title + audience picker, drops polls; adds "From the Collection" via `<CollectionPicker>`.
- `<Feed scope showControls? sheet? initialPosts? emptyState?>` — single list; `scope = all | {group} | {author} | letters | {tag}`; one `loadPosts(scope,cursor)`; infinite scroll + no-JS fallback; auto-animate on prepend; filters behind disclosure; "new since last here" divider from `lastSeenAt`.
- `<PostCard post variant? showGroupBadge?>` — `variant = card | sheet | letter-full`; like/comments/poll/markdown/images/report dropdown + bookmark; profile-links name+avatar.
- `<CommentsSection> <PollDisplay> <PollCreator> <MentionDropdown>` — existing, reused (comments adopt `<BirdAvatar>`+`<PersonName>`).

**Right-rail kit:** `<RailCard> <RailEventItem> <RailPersonRow> <RailGroupRow> <RailFact> <EventCard variant>` (event card doubles as the rail event item).

**Buttons/inputs/tags/utilities:** shadcn `button/card/dialog/select/sheet/tabs/skeleton/badge/tooltip` (reuse; card gets layered tinted shadow); `<RememberableField>` ("I don't remember"); `<RevealTooltip>`; `<AccountTypeToggle>`; `<CollectionPicker>`; `<SectionReveal>` (landing motion primitive, reduced-motion + no-JS safe); `<PeaksMark tone size>` (shared logo). Post-tag enum stays; Collection adds a faceted taxonomy.

---

## 3. DATA MODEL DELTAS (consolidated Prisma)

**`Post` (central):** `groupId String?` + cascade relation; `kind String @default("post")` (post|letter|fund); `title String?`; letter content cap 20000 (app-level); indexes `(groupId,createdAt)`, `(authorId,createdAt)`, `(kind,createdAt)`, `(createdAt)`. **Remove `GroupPost`**, replace `Group.posts` with `Post[]`, data-migrate old rows.

**`User`:** `accountType` (alumnus|teacher|ex_teacher); make `batchType`/`batchYear` **nullable**; `taughtFrom/taughtUntil/subjects`; `verifyState/verifiedAt/verifiedById/verifyMethod/vouchCount`; `triviaPassedAt/triviaQuestion`; `invitedById` + self-relation; repurpose `avatarColor` as manual override (null it in migration) + add `avatarSpecies Int?`, `photoUrl String?`; `about/homeCity/classSection/showEmail/showPhone/featureOptOut/lastFeaturedAt/coverPhoto/photoTrusted/lastSeenAt/cityId`; retire `instagram`/`linkedin` after backfill. New relations to all models below.

**New identity/profile models:** `UserHouse` (house per year, `@@unique([userId,year])`), `UserLink` (kind/label/url/position), `UserMemory` (`@@unique([userId,prompt])`).

**New onboarding/verification:** `Invite`, `InviteRedemption` (`userId @unique`), `JoinRequest`, `Vouch` (`@@unique([voucherId,voucheeId])`).

**New Roundups:** `Roundup`, `RoundupIssue` (`@@unique([roundupId,number])`), `RoundupQuestion`, `RoundupAnswer` (`@@unique([questionId,authorId])`), `RoundupPref` (`@@unique([roundupId,userId])`).

**New Collection/directory/bookmarks:** `Photo` (3 rendition URLs + blurhash + dims + faceted tags + approval, `@@index([approved,isHidden,createdAt])`), `PhotoLove` (`@@unique([userId,photoId])`), `City` (`@@unique([asciiName,countryCode])`), `Bookmark` (`@@unique([userId,postId])`).

**Generalizations:** `Report` gains `targetType`, nullable `postId`, `reportedUserId` (folds flag-this-person + future photo reports into one queue). `Notification.type` gains roundup values (no schema change) + `@@index([userId,read])`. `Group` (and future `Event`) gains `coverPhoto`. **No `Contribution` model for MVP** (UPI-only). Image renditions use a URL-suffix convention (no `Post.images` change).

**Cleanup:** delete `pickAvatarColor()` + `AVATAR_COLORS`; drop random avatar write at signup; keep `getInitials()`.

---

## 4. PHASED ROADMAP

**Phase 0 — Foundation (platform/DB/infra).** Render Starter + Render Postgres same region; switch Prisma provider to `postgresql`, replace libSQL adapter (keep singleton); add `storage.ts` Blob shim; remove magic links + `/verify` + `magic-link-sent.tsx`; pre-size background to <30KB blurred WebP; add `(userId,read)` + `createdAt` indexes. **DoD:** always-on app on Render, login + admin bypass verified, clean `migrate deploy`, no magic-link refs.

**Phase 1 — Design system.** Apply token deltas (surfaces/sidebar/accents/`--surface-float`); universal transition -> `background-color`/`border-color` only at 120ms; `forcedTheme="light"` + remove toggle; new 10-color avatar palette; fix heart bug (explicit `#E03A33`, `transition:none`); fix `.dotsep`, bird centroid, button glow, `+` alignment; add global reduced-motion block. **DoD:** warm dim surfaces, no pure white, darker sidebar, heart red on first frame, no `transition-all`, OS dark cannot apply.

**Phase 2 — Shell + nav.** Build `<AppShell>/<Sidebar>/<PageHeader>`; swap `(main)/layout.tsx`; footer inside `.main`; mobile bottom bar; `<PeaksMark>`. **DoD:** all auth pages in flush shell, correct active state for nested routes, rail toggles grid, verified both viewports.

**Phase 3 — Reusable post primitives (big reuse fix).** Migrate `Post` schema + migrate `GroupPost` rows; extend `loadPosts(scope,cursor)` + `groupId:null` guard + leak test; generalize `PostFeed->Feed`, `CreatePostForm->Composer`, `PostCard` variants; delete bespoke group UI; build `<BirdAvatar>`+`avatar.ts`+test+`<PersonName>`, swap all `UserAvatar` sites, delete `pickAvatarColor`; add `Bookmark` + `toggleBookmark` + card button. **DoD:** feed/group/profile through shared primitives, group posts full-featured, leak test passes, avatar distribution test passes, `UserAvatar` deleted, keyset pagination live.

**Phase 4 — Feed surface.** `/feed` 3-col shell + collapsed composer pill + rail; filters behind disclosure; catch-up divider; expand search pill; letter teasers. **DoD:** clean default, reveal-on-demand controls, infinite scroll + fallback, mobile drops rail.

**Phase 5 — Profile.** Profile deltas + UserHouse/UserLink/UserMemory; `<ProfileHeader>` (avatar overlap fix, batch/city/profession line, two-item stats, glows removed), rail cards (privacy-gated, admission number owner/admin only), `<ProfileAbout>` (prose + prompted memories), tabs with Posts = `<Feed scope=author>`; CTA Edit profile / Get-in-touch + vCard; sticky rail, mobile relocates rail above tabs; reserve verified slot; person-in-focus data. **DoD:** no cut-off avatar, no "undefined to undefined," variable-length Details, labeled gated contacts, admission number never serialized to others, marker renders, mobile keeps Details/Contact.

**Phase 6 — Directory + map.** `City` + `cityId`/`mapVisibility`/`memberType`; offline gazetteer geocode + autocomplete + backfill; Map-default tabs; `<AlumniMap>` (d3-geo/topojson/d3-zoom) + `useSupercluster` (counted city pins, sqrt scale, no aggregate jitter) + `<CityDrilldown>` + Unmapped bucket + fullscreen; broaden Tier-1 search + relevance sort + cursor pagination; Tier-2 filters behind toggle; Faculty facet. **DoD:** no alphabetical default, counted/clustered pins, pin opens paginated people list, filters repaint map live, case-insensitivity handled, both viewports verified.

**Phase 7 — Groups.** Rewrite `/groups/[id]` onto shared `<Composer>/<Feed>/<PostCard>`; group rail (Members/About); extract `<GroupHeader>/<GroupCard>`; drop `GroupPost` model once unused. **DoD:** full-featured gated group feeds, members link to profiles, `GroupPost` deleted.

**Phase 8 — Letters + Roundups.** Letters: composer mode, feed teaser, `/letters`, `/letters/[id]` (no new infra). Roundups: models + group-scoped CRUD (curate/answer/suggest/compile/archive) shipping **manual cadence first**, then Render Cron tick (`/api/roundups/tick`, secret-guarded) + Resend emails + `RoundupPref` + prompt-library seed. **DoD (Letters):** writes/reads through shared primitives, teaser + permalink, audience picker. **DoD (Roundups):** full manual issue end-to-end; tick opens/reminds/publishes; emails + bell notifications work.

**Phase 9 — The Valley Collection.** `Photo`+`PhotoLove`; extend upload to 3 WebP renditions + blurhash + dims, raise cap to 15MB, reject HEIC; masonry `/collection` with faceted filters + "A wander" + lazy thumb/LQIP; `/collection/[id]` detail + backlinks; approval gate via Photo queue tab in `/admin` (declined purged from Blob); `<CollectionPicker>` into composer/covers; admin seeds 40-60 founding photos; feed rail card. **DoD:** thumbnails-only grid, working filters + queue, declined photos purged, picker reuses photos without re-upload, mobile masonry verified.

**Phase 10 — Onboarding + auth + verification.** Invite/Redemption/JoinRequest/Vouch; `/join/[code]` (+ publicPaths); signup with `<AccountTypeToggle>` + conditional batch + `<RememberableField>`, admission number moved to profile-completion, server-side invite + trivia + `$transaction` redeem; trivia server-side + expanded bank, retire `BlinkingOwl`; `/profile/complete` progressive flow; three-track verification (admin office-list queue + community vouching auto-promote + flag via generalized `Report`); `<VerifiedMark>` everywhere; admin Verification + Invites tabs; grandfather existing users. **DoD:** no account without valid invite (server-enforced), teachers sign up batch-free, "don't remember" stores null, vouch promotes + notifies, flag in shared queue, marker subtle, existing users migrated.

**Phase 11 — Landing.** Split into server `page.tsx` + islands; keep calm full-`dvh` hero (CTAs "Request an invite"/"Sign in", fix `transition-all`); 7-section showcase led by directory with real Sharp-optimized screenshots; `<SectionReveal>` + parallax + sticky glass nav + 3 bird/leaf easter eggs; light-only; optional cached member counts. **DoD:** LCP <2s, CLS 0, legible with JS off + reduced motion, no em dashes, both viewports.

**Phase 12 — Support.** Static `/support` in `(main)`; honest ruled-sheet cost breakdown; UPI copy + QR + deep link + suggested chips; "card/international coming"; no-pressure invariant; office-blue reserved for the single primary action (add token first); no processor, no `Contribution` table; campaign-progress parked. **DoD:** UPI copy + fallback, QR dims+alt, mobile stacks, no-pressure copy preserved.

**Phase 13 — Polish + interactions.** Hoopoe redesign + load choreography; bird chirp (self, no audio); bookmark ribbon sweep; two-tier loading (shimmer everywhere + bird scene on feed/saved only); standardized like-pop; event-triggered bell-shake; `/saved` route reusing `<Feed>`. Run `/simplify`, `/impeccable`, LiftKit pass, VibeSec on auth/data/forms; 2 screenshot rounds each viewport. **DoD:** interactions reduced-motion-safe + event-correct (no hover-spam, no re-trigger), no audio, scene confined to 2 routes, audits pass P0/P1, commits carry no AI attribution.

---

## 5. RISKS / OPEN QUESTIONS for the owner

1. **Group-post visibility leak** is the top regression risk of folding `GroupPost` into `Post`. `loadPosts` must hard-enforce `groupId: null` for `scope=all`; dedicated test in Phase 3.
2. **Render free Postgres expires.** Confirm budget for the cheapest paid persistent instance (~6-7 USD/mo) before real data lands.
3. **Roundups need new infra** (Render Cron + ongoing Resend volume). Confirm acceptance; manual-cadence Roundups ship first and need neither.
4. **Verification cold start.** RESOLVED: owner releases in stages, so no day-one pile-up. Do NOT auto-grandfather; verification proceeds normally (admin office-list + community vouch + flag).
5. **Existing-user avatar churn.** Nulling `avatarColor` gives everyone a fresh deterministic bird; confirm that vs remapping old discs to the nearest new palette color.
6. **Roundups label.** Confirm "Roundups" as the final user-facing name (rejected: Seasons, Dispatches).
7. **Keep `originalUrl` (3000px) in Collection?** Doubles per-photo storage; recommend launching without it.
8. **Storage shim now or later?** Recommend the `storage.ts` shim before the Collection ships so nothing hard-codes Blob (future R2).
9. **Person-in-focus consent** is opt-out (default false), pushing a member's memory to everyone. Confirm opt-out (not opt-in) is acceptable.
10. **Teacher batch nullability** ripples into `auth.ts`, `next-auth.d.ts`, the directory `groupBy`, and the shared batchline; must land as one coordinated change in Phase 10 so no workstream assumes a non-null batch.
11. **Map dependencies** (`d3-geo`, `topojson-client`, `d3-zoom`, `supercluster`, world-atlas TopoJSON, trimmed GeoNames gazetteer) are small/free and fit the 200MB/5GB rules; confirm before adding.

Full plan written to `/private/tmp/claude-501/-Users-sanan-Documents-rv-alumni/d5fa1925-06df-4a12-ac6a-907f1c382f8e/scratchpad/BUILD_PLAN.md`.