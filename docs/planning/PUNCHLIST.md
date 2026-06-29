# RV Alumni — Authoritative Punch-List

> **Reframe (read first):** A fresh-server ground-truth pass on 2026-06-27 proved the app **mostly matches** the approved `/preview/v2` contract. The owner's earlier "everything is broken" was largely a **stale 2.7GB `.next` cache** rendering the OLD pre-rebuild app, not current code. Feed, login, other-people profiles, landing (with a SOLID green Sign-in button), and the directory world map all **PASS**. This is therefore a **targeted-fix campaign, not a rebuild**. The single biggest REAL bug is the owner's OWN profile page crashing on a null `.id`.

---

## Verified current state (ground truth, 2026-06-27)

| Surface | Verdict | One-line note |
|---|---|---|
| foundation | partial | Warm-dim shell, flush green sidebar, fast border-only transitions all correct; tree overlay too strong, bg a touch bright. |
| feed | partial | Ruled-sheet posts, rail, keyset pagination work; heart bug genuinely fixed. Avatar overrides ignored; bookmark has no animation. |
| profile (other) | pass | Cover, un-clipped bird avatar, tabs, open-to tags, CTAs all match contract. |
| profile (own) | **fail** | Crashes server-side: `m.group.id` dereferences null for an orphaned GroupMember row. **P0.** |
| auth-login | pass | Photo-split, animated hoopoe, no magic links, trivia gate present. Minor: dead "Forgot?" link. |
| signup-onboarding | partial | Warm look + account-type logic work; trivia is client-only toy, no invite enforcement, thin profile-completion. |
| landing | pass | Solid green Sign-in (no glass), calm hero, 5 real WebP shots, reduced-motion-safe. |
| directory | partial | World map with counted clustered pins works (owner's "broken" was cache ghost). Filters swap to grid instead of re-filtering map. |
| groups | partial | Create/join/invite/role-names/group-feed all work. Missing per-group newsletter/events. |
| letters-catchups | partial | Letters fully built and working. Catch-ups is an unbuilt ComingSoon stub. |
| collection-misc-admin | partial | Collection/Support/Admin/About/Settings built. Em dash in About, no avatar upload, Events is a stub. |
| delight | partial | Like-pop + hoopoe real. Bell-shake only in preview mock; avatar chirp / bookmark sweep / loading scene unbuilt. |
| logo | partial | Deliberate placeholder. App mark is a generic zigzag, not the real two-massif skyline trace. |

---

## Real bugs to fix (verified true now)

Grouped P0 → P1 → P2. `(foundation)` = touches a shared file/primitive (must land in B-FOUNDATION first).

### P0

| # | Bug | Evidence | Fix | foundation | Effort |
|---|---|---|---|---|---|
| 1 | **Own profile crashes** — `m.group.id` dereferences null for an orphaned GroupMember row (admin `sanan` has a GroupMember pointing at a missing Group). | `src/app/(main)/profile/[id]/page.tsx:418,419,422,424`; include at :61-64 yields `m.group === null`; section gated on `:409` length>0 then throws at :418. | Filter null groups before render: `const groups = user.groupMemberships.filter((m) => m.group)`; map over `groups`; gate on `groups.length > 0`. | no | S |

### P1

| # | Bug | Evidence | Fix | foundation | Effort |
|---|---|---|---|---|---|
| 2 | Uploaded photo + manual avatar override ignored in feed post headers. | `post-card.tsx:161` passes `{id,name}` only; `feed/actions.ts:457-466` author select omits `photoUrl`,`avatarSpecies`. | Add `photoUrl`,`avatarSpecies` to author select + `PostData.author` type; pass full author to `BirdAvatar`. | yes | S |
| 3 | Em dash in About copy violates no-em-dash rule. | `src/app/(main)/about/page.tsx:70` ("genuine connection — not another WhatsApp"). | Replace with comma/period. | no | S |
| 4 | Settings has no avatar / profile-photo upload. | `src/components/settings/settings-form.tsx` has no file input/ImagePlus. | Add photo upload (Sharp→WebP, contribute-dialog pattern) to Edit Profile. | no | M |
| 5 | No invite-only enforcement anywhere; signup is wide open. | `auth/actions.ts:8-69` (`registerUser` never validates invite); `proxy.ts:9` no `/join`. | Add Invite/InviteRedemption model; require valid unredeemed code before user create. | no | L |
| 6 | Trivia gate is client-only/decorative, not server-checked or rate-limited. | `auth/trivia-gate.tsx:7-15` hardcodes 2 Qs, compares answer in browser; `onPass` just advances state. | Move bank + check server-side; record `triviaPassedAt`; add light rate-limit. | no | M |
| 7 | Bell-shake does not exist in the real notification bell. | `notification-bell.tsx:76,100` only `active:scale-95`; keyframe lives only in `preview/v2/page.tsx:664-665`. | Port `@keyframes` bell wobble to globals.css; trigger on unread-count increment (transform-origin top), not hover. | no | M |
| 8 | App-wide logo mark does not trace the real skyline (generic 5-point zigzag). | `peaks-mark.tsx:24` straight-line path vs `Inspiration/bodi-middle-rishi.png`. | Retrace with curved (C) segments: rounded left hill → wide central saddle → dominant center-right summit → lower right shoulder. | yes | M |

### P2

| # | Bug | Evidence | Fix | foundation | Effort |
|---|---|---|---|---|---|
| 9 | Valley tree overlay too prominent (0.16 vs 0.09). | `app-shell.tsx:32` `opacity-[0.16]` vs contract `.v2-bg` `opacity:.09`. | Lower to `opacity-[0.08]`/`[0.09]`. | yes | S |
| 10 | Page bg marginally brighter than spec/contract. | `globals.css:75` `--background:#EBE6D7` vs contract `#E7E1D3` / spec `#E9E6DD`. | Set `--background:#E9E6DD` (or `#E7E1D3`). | yes | S |
| 11 | Stale shadcn Card primitive still pure-white glass + flat shadow (unused, but a footgun). | `ui/card.tsx:15` `bg-white/55 backdrop-blur-md ... shadow-sm`. | Repoint to `bg-card/border-border/.card-elevated` (or delete). | no | S |
| 12 | Bookmark/save has no animation. | `post-card.tsx:332-341` toggles weight/color only, no transition. | Add brief transform/opacity pop (or cinnamon sweep) mirroring `animateLike`. | yes | M |
| 13 | "New in directory" rail drops photoUrl/avatarSpecies overrides. | `feed-rail.tsx:85-88` passes only `avatarColor`; select :22-30 omits them. | Select + pass `photoUrl`,`avatarSpecies` to `BirdAvatar`. | no | S |
| 14 | Admin Tools card unstyled (legacy shadcn Card, amber palette). | `admin-profile-tools.tsx:70` `border-amber-500/30 bg-amber-50/50`. | Restyle to `card-elevated rounded-[var(--radius)] border-border bg-card` + leaf/cinnamon tokens. | no | M |
| 15 | "Forgot?" link is a dead self-link. | `login/page.tsx:127` `href="/login"`. | Point to a real reset route or remove until reset exists. | no | S |
| 16 | Hoopoe tail is a single straight rect, not the "branched tail" owner asked for. | `hoopoe.tsx:24-26`. | Replace with 2-3 splayed banded feathers. | no | S |
| 17 | Hoopoe crest uses rect tips (faint dots), small/subtle. | `hoopoe.tsx:19-20` rect vs `preview/v2:54` circle. | Use rounded crest tips and/or enlarge spokes. | no | S |
| 18 | Hoopoe intro is plain covered-toggle, not settle+blink choreography. | `login/page.tsx:23-28` flips intro after 1100ms; no blink/translateY. | Add one-shot eye scaleY blink + translateY+opacity settle on mount. | no | M |
| 19 | Onboarding still collects `admissionNumber` though spec moved it to profile. | `validators.ts:14`; `auth/actions.ts:30-33`. | Drop from signupSchema + registerUser; collect in profile-completion. | no | S |
| 20 | `/verify` route + dead magic-link path not removed as decided. | `src/app/(auth)/verify/page.tsx` (just redirect); `proxy.ts:9` lists `/verify`. | Delete route + remove from publicPaths. | no | S |
| 21 | Directory filters do not re-filter the map; they swap to the grid. | `directory-client.tsx:221` (`hasFilter ? grid : browse`). | When filter active in map view, recompute cityPins from filtered set; keep AlumniMap. | no | L |
| 22 | City filter uses exact free-text equality (Bangalore vs Bengaluru fragments). | `directory/page.tsx:60`. | Normalize currentCity both sides (or query variant set). | no | M |
| 23 | Directory search case-sensitive on SQLite (no `mode:insensitive`). | `directory/page.tsx:42-47`. | Add `mode:"insensitive"` gated to Postgres, or lowercase-normalize column. | no | M |
| 24 | Directory results silently capped at 60, no Load more. | `directory/page.tsx:147` `take:60`. | Add cursor pagination / Load more (auto-animate append). | no | L |
| 25 | Batch-added group members get no notification. | `groups/actions.ts:35-49` (no Notification on batch add). | Create group_invite-style notification per non-creator batch member. | no | S |
| 26 | Groups Browse section vanishes when all public groups joined (no empty state). | `groups/page.tsx:91` wraps whole section in length>0. | Render a short "nothing to browse" hint instead of removing. | no | S |
| 27 | Empty-title letters show literal "Untitled letter". | `letters/page.tsx:82`; `letters/[id]/page.tsx:63`. | Fall back to excerpt/first line per letters.md §2.6. | no | S |
| 28 | Collection seed art reads as duplicate tiles (only 6 moods). | `gt-collection.png`; `prisma/seed-collection.mjs` MOODS/RATIOS = 6. | Add per-photo variation (hue jitter / seed offset keyed to photo id). | no | S |
| 29 | Bookmark toggle uses leaf not cinnamon, no ribbon-sweep/color-flood. | `post-card.tsx:332-341`. | Animate clipped fill (scaleY 0→1 from bottom, cinnamon) + settle pop on save. | yes | M |
| 30 | Dead `landing-client.tsx` carries OLD glassmorphism Sign-in + wrong CTA copy. | `src/components/landing-client.tsx:49,51-56` (never imported). | Delete the file. | no | S |
| 31 | Two divergent logo traces exist; refined `preview/logo` RIDGE never promoted. | `preview/logo/page.tsx:6` (curved RIDGE) vs `peaks-mark.tsx:24` (zigzag). | Pick the curved RIDGE as canonical; use in peaks-mark.tsx. | yes | S |
| 32 | No solid white-fill logo variant wired into the app; only outline ships. | `peaks-mark.tsx:23-29` single stroked path. | Add a fill (closed silhouette) variant + outline/solid prop. | yes | S |
| 33 | Tallest peak placement ambiguous vs photo (far-right not center-right). | `peaks-mark.tsx:24` peak at x52/63 (~83%) vs photo ~55%. | Place dominant summit at ~50-58% of width. | yes | S |

---

## Genuinely unbuilt / stub features

The real remaining roadmap (nothing here is "broken" — it was never built).

| Feature | Area | Effort | Notes |
|---|---|---|---|
| **Catch-ups newsletter** (Letterloop-parity) | letters/groups | L | `/catchups` is a static ComingSoon. No Roundup/RoundupIssue/RoundupQuestion/RoundupAnswer models, no rounds/deadline/answering/compile/publish, no per-group archive, no cadence presets, no scheduler/Resend. |
| Member-submitted prompts, photo-wall answers, manual nudge roster | catch-ups | L | All of letters.md §3.4-3.7 absent (no UI, no model). |
| Per-group newsletter (Roundup) + group-scoped events | groups | L | Checklist 128 second clause; group feeds reuse shared feed (done) but no group newsletter/events. |
| **Events feature** | misc | L | `events/page.tsx` is ComingSoon only; no post-a-gathering/date/place/RSVP. |
| Community vouching (verification Track 2) | signup | L | No Vouch model / vouchForUser / vouchCount / "I know this person" button. Tracks 1 (admin) + 3 (flag→report) ARE built. |
| Profile-completion depth: house-per-year picker, class sections, admission no, memory prompts | onboarding/settings | L | onboarding collects 7 generic fields; no HouseYear model, no sections field, no memory prompts UI. |
| `<RememberableField>` "I don't remember" shared control | onboarding | M | Spec §4/8 shared optional-year control; does not exist. |
| Teacher tenure + avatar collection in profile flow | onboarding | M | Schema has taughtFrom/Until/subjects but flow never collects; no avatar upload step. |
| "Request an invite" / JoinRequest path | signup | M | No JoinRequest model; `/signup` has no request-an-invite form. |
| Password reset flow | auth | M | "Forgot?" affordance present in design; no reset page. |
| Memory prompts editable (UserMemory model + settings UI) | profile | L | profile renders MEMORY_PROMPTS as static dashed stubs ("coming to settings"). |
| "View as visitor" CTA on own profile | profile | M | Spec §3; only Edit profile button renders. |
| Person-in-focus data plumbing (UserMemory + featureOptOut + lastFeaturedAt) | profile | L | None of these fields exist; daily spotlight blocked at data layer. |
| Directory: House + Tag (Tier-2) facets | directory | L | Only city/profession/batch-range/sort exist; no HouseYear/ProfileTag queried. |
| Directory: live map search (pan/zoom to typed city) | directory | L | Search routes to grid; no programmatic pan-to-city. |
| Directory: map hover tooltip with top-3 avatars | directory | M | `alumni-map.tsx:281-288` renders text label only. |
| Directory: full gazetteer / canonical City model + autocomplete | directory | L | `city-coords.ts` is a ~70-city hand-curated stand-in; spec wants City table + GeoNames + save-time autocomplete. |
| Photos usable as post/profile/group covers | collection | M | Tiles link only to `/collection/[id]`; no reuse path. |
| Bird-avatar click chirp/wiggle easter egg | delight | M | `bird-avatar.tsx` has no onClick/interactive prop. |
| Living loading scene (bird among leaves) | delight | L | feed/directory `loading.tsx` render gray `animate-pulse` skeletons. |
| 3-5 tasteful delight moments beyond auth + shared keyframe layer | delight | L | Only like-pop is off-auth; no standardized shared keyframe layer. |
| Logo: faithful photo trace + solid-fill + gradient production variants | logo | M/S | Both current paths are placeholders; fill/gradient only demoed in `preview/logo`. |
| **Deploy** to Render + Render Postgres | infra | M | Local dev on SQLite per decisions; production deploy not yet done. |

---

## False `[x]` claims

Checklist items marked done that are not actually true.

| Claim | Reality |
|---|---|
| `docs/planning/FEEDBACK_CHECKLIST.md` Process: "No em dashes anywhere (followed silently)" `[x]` | `about/page.tsx:70` contains an em dash. |
| "Like-pop and bell-shake already in" `[x]` | Like-pop is real; **bell-shake is NOT** in real `notification-bell.tsx` — it only exists hover-triggered in the preview mock (`v2/page.tsx:664-665`). |

---

## Fork-sized batch plan

This is a **targeted-fix campaign**. Rule: **everything `touchesFoundation` lands in ONE sequential batch (B-FOUNDATION) committed FIRST** on `redesign`, before any parallel work — otherwise parallel forks editing shared files (globals.css, app-shell, post-card, peaks-mark) cause merge hell + re-drift. After foundation is frozen and committed, each remaining batch runs in **its own git worktree/branch off that frozen-foundation commit**, touching mostly its own files.

### B-FOUNDATION — shared primitives (SEQUENTIAL, FIRST)
- **Scope:** bugs #2 (feed author avatar select+pass), #8/#31/#32/#33 (logo: retrace curved RIDGE, fill+outline variants, peak placement), #9 (tree overlay 0.08), #10 (bg #E9E6DD), #12+#29 (bookmark cinnamon sweep+pop). #11 (repoint/delete stale Card primitive).
- **Files:** `globals.css`, `app-shell.tsx`, `components/posts/post-card.tsx`, `feed/actions.ts`, `components/layout/peaks-mark.tsx`, `components/ui/card.tsx`.
- **Dependencies:** none. **Parallel-safe:** NO (all forks branch off this).
- **Kickoff:** "On `redesign`, fix all foundation-tagged bugs in PUNCHLIST B-FOUNDATION (shared tokens, app-shell, post-card avatar+bookmark, peaks-mark logo, card primitive); tsc + screenshot feed/login/landing at 1440; commit as the frozen foundation."

### B-PROFILE — profile + admin tools (parallel)
- **Scope:** #1 (P0 own-profile crash null-group guard), #14 (admin tools restyle to warm tokens).
- **Files:** `profile/[id]/page.tsx`, `components/profile/admin-profile-tools.tsx`.
- **Dependencies:** B-FOUNDATION. **Parallel-safe:** yes.
- **Kickoff:** "In a worktree off frozen foundation, fix the P0 own-profile null-group crash and restyle AdminProfileTools to warm card tokens; verify own + other profile render at 1440."

### B-AUTH — login + signup + verify cleanup (parallel)
- **Scope:** #6 (server-side trivia + rate-limit), #15 (Forgot link), #16/#17/#18 (hoopoe tail/crest/intro), #19 (drop admissionNumber from signup), #20 (delete /verify + publicPaths).
- **Files:** `login/page.tsx`, `components/auth/hoopoe.tsx`, `components/auth/trivia-gate.tsx`, `auth/actions.ts`, `validators.ts`, `(auth)/verify/page.tsx`, `proxy.ts`.
- **Dependencies:** B-FOUNDATION. **Parallel-safe:** yes.
- **Kickoff:** "In a worktree off frozen foundation, harden the auth surface: server-check the trivia gate, fix the dead Forgot link, branch the hoopoe tail + round the crest + add the intro settle/blink, drop admissionNumber from signup, delete /verify. tsc + screenshot login at 1440."

### B-DIRECTORY — directory correctness (parallel)
- **Scope:** #21 (filters re-filter the map), #22 (city normalize), #23 (case-insensitive search), #24 (Load more pagination).
- **Files:** `directory/page.tsx`, `components/directory/directory-client.tsx`, `lib/city-coords.ts` (normalize helper).
- **Dependencies:** B-FOUNDATION. **Parallel-safe:** yes.
- **Kickoff:** "In a worktree off frozen foundation, make directory filters recompute map pins live, normalize city spellings, make search case-insensitive, and add Load more pagination. Screenshot map + filtered states at 1440."

### B-CONTENT — feed rail, groups, letters, collection (parallel)
- **Scope:** #13 (rail avatar overrides), #25 (batch-add notification), #26 (groups browse empty state), #27 (letter title fallback), #28 (collection seed variation).
- **Files:** `components/feed/feed-rail.tsx`, `groups/actions.ts`, `groups/page.tsx`, `letters/page.tsx`, `letters/[id]/page.tsx`, `prisma/seed-collection.mjs`.
- **Dependencies:** B-FOUNDATION. **Parallel-safe:** yes.
- **Kickoff:** "In a worktree off frozen foundation, fix the directory rail avatar overrides, notify batch-added group members, add a groups browse empty state, fall back letter titles to the excerpt, and vary collection seed art. tsc + screenshot feed/groups/letters/collection."

### B-COPY-DELIGHT — em dash, bell-shake, dead file (parallel, small)
- **Scope:** #3 (em dash in About), #7 (bell-shake on unread increment), #30 (delete landing-client.tsx). Fix both false `[x]` claims in `docs/planning/FEEDBACK_CHECKLIST.md`.
- **Files:** `about/page.tsx`, `components/layout/notification-bell.tsx`, `globals.css` (bell keyframe — **coordinate: if globals.css edit needed, fold into B-FOUNDATION instead**), `components/landing-client.tsx`, `docs/planning/FEEDBACK_CHECKLIST.md`.
- **Dependencies:** B-FOUNDATION (bell keyframe in globals.css). **Parallel-safe:** yes (but the keyframe addition is a foundation file — see Coordination).
- **Kickoff:** "In a worktree off frozen foundation, remove the About em dash, wire the real bell-shake on unread increment, delete dead landing-client.tsx, and correct the two false [x] checklist claims."

### B-SETTINGS-PROFILE — settings avatar upload (parallel)
- **Scope:** #4 (avatar/photo upload in settings Edit Profile, Sharp→WebP).
- **Files:** `components/settings/settings-form.tsx`, settings server action, blob/upload util.
- **Dependencies:** B-FOUNDATION. **Parallel-safe:** yes.
- **Kickoff:** "In a worktree off frozen foundation, add a Sharp→WebP avatar upload to the Settings Edit Profile form following the contribute-dialog pattern. Screenshot settings at 1440 + 390."

> **Deferred to a follow-up milestone (not in this campaign):** invite-only enforcement (#5) and all "genuinely unbuilt" features (Catch-ups, Events, vouching, profile-completion depth, directory facets/gazetteer, delight beats beyond bell, deploy). These are net-new builds, not targeted fixes; scope them as their own phased work after the fix campaign lands.

---

## Coordination

1. **Foundation sequential on `redesign`.** Run B-FOUNDATION to completion on the `redesign` branch, pass its verify gate, and **commit**. This is the frozen-foundation commit. No parallel work starts before this.
2. **One git worktree per parallel batch**, each branched off the frozen-foundation commit. Use `superpowers-using-git-worktrees`. Forks never edit each other's files.
3. **Shared-primitive escape hatch:** if any parallel fork discovers it needs to change a foundation file (`globals.css`, `app-shell.tsx`, `post-card.tsx`, `peaks-mark.tsx`, `ui/card.tsx`, `feed/actions.ts` author select), it **STOPS and flags it** rather than editing — the change is folded into B-FOUNDATION (or a foundation amendment) and re-frozen so forks rebase onto it. (Notably the bell-shake keyframe in B-COPY-DELIGHT — if it needs globals.css, move it into B-FOUNDATION.)
4. **Verify gate per batch:** `tsc` clean + screenshot the touched surface at 1440 (and 390 where mobile matters) + one interaction check (e.g. own-profile loads, heart stays red, bookmark animates, filter re-filters map). Read the PNG, do not assume.
5. **Per-batch bookkeeping:** update `docs/planning/PUNCHLIST.md` (check off fixed items) and `progress.md` at the end of each batch. Plain conventional commits, no AI attribution.
6. **Merge order:** rebase each finished fork onto latest `redesign`, run its verify gate again post-rebase, then merge. Foundation first, then forks in any order.
