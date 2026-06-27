# Task Plan — RV Alumni redesign + MVP build

## Source of truth
- **docs/ROADMAP.md** — the consolidated, phased build plan (decisions, shared components, data model, 13 phases).
- **docs/spec/** — deep specs per area (ia, letters, directory, profile, onboarding, color, delight, avatars, media, landing, infra).
- **FEEDBACK_CHECKLIST.md** — every owner instruction, itemized + tracked. Never ship with an open [~]/[ ] that was promised.
- **FEATURES.md** — feature backlog. **/preview/v2** — the approved look (reference while building).

## Goal
Apply the approved look to the real app and build the MVP, then push to GitHub and deploy to Render.
Light-mode-first, modular-reuse-first. No em dashes in shipped copy.

## Build order (status)
- [x] Phase 1 — Design system: warm/dim tokens, darker sidebar, vivid accents, light-only (forcedTheme),
      transition fix (heart never black), reduced-motion. Verified on /login + landing.
- [ ] Phase 2 — Shell + nav: AppShell + Sidebar (flush, corner-to-corner) + PageHeader; swap (main)/layout; mobile bar.
- [ ] Phase 3 — Reusable primitives: BirdAvatar (+avatar.ts hash, 12 species), PersonName, Composer, Feed, PostCard;
      schema: Post gains groupId/kind/title, fold in GroupPost; Bookmark; keyset pagination.
- [ ] Phase 4 — Feed surface (3-col, collapsed composer, rail, reveal-on-demand filters, catch-up divider).
- [ ] Phase 5 — Profile (cover, avatar overlap, batch/city/profession, UserHouse/UserLink/UserMemory, tabs, rail).
- [ ] Phase 6 — Directory + world map (City model, Map|Batches, clustered counted pins, progressive search).
- [ ] Phase 7 — Groups on shared primitives; drop GroupPost model.
- [ ] Phase 8 — Letters (post kind) + Roundups (Letterloop-style; manual cadence first, then Render Cron + Resend).
- [ ] Phase 9 — The Valley Collection (photo archive; 3 WebP renditions, faceted tags, admin approval, picker).
- [ ] Phase 10 — Onboarding + auth + verification: minimal signup, teacher accounts, invites, trivia, complete-profile,
      community vouch + admin office-list + flag-via-report; subtle verified mark.
- [ ] Phase 11 — Landing: calm hero + scrollable feature showcase with real screenshots + tasteful motion.
- [ ] Phase 12 — Support page (hosting costs, UPI + QR; no processor).
- [ ] Phase 13 — Polish + interactions: hoopoe, bird chirp, bookmark ribbon, living loading scene, like-pop,
      bell-shake; run /simplify, /impeccable, LiftKit, VibeSec; 2 screenshot rounds per viewport.
- [ ] Phase 0 (deploy) — Render always-on Starter + Render Postgres (same region); switch Prisma provider to
      postgresql; storage.ts Blob shim; remove magic links + /verify. Done near the end at deploy time.
      (Local dev stays on SQLite/libSQL so screenshots keep working; schema models are provider-agnostic.)

## Owner decisions parked (recommended defaults adopted, confirm later)
- Pay for cheapest Render Postgres once real data lands. "Roundups" as the final name. Grandfather the current
  trusted cohort as verified. Null avatarColor -> everyone gets a fresh deterministic bird. Launch Collection
  without 3000px originals. Person-in-focus parked (opt-out). Map deps (d3-geo/topojson/d3-zoom/supercluster) are
  small + free and within storage limits.

## Working rules
- Keep the dev server runnable and screenshot-verify every visible change (desktop first; mobile after look is locked).
- Verify interactions, not just screenshots. No sloppy bugs (e.g. black heart).
- Update docs as decisions change so any session can pick up cold.
