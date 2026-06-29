# RV Alumni — Brutally Honest Audit (real app vs `/preview/v2` contract)

Audited on branch `redesign`, dev server :3000. Verdicts trust only screenshots + code, NOT the FEEDBACK_CHECKLIST `[x]` marks.

## Overall verdict: MOSTLY matches the contract.

This is **not** a broken app. The owner's "looks broken / drifted" complaint is real but **localized**, not global. Feed, Profile, Login, Directory, Support and Collection all render correctly and closely track the contract layout: warm dim background (`#EBE6D7`), faint valley tree behind content, ruled-sheet feed, header search pill + bell + New post inline, right rail lowered to composer level, large overlapping (non-clipped) profile avatar with tabs + About + Details/Contact rail, photo-split light login with hoopoe, and a working zoomable world map defaulting to map/browse. The core "broken" bug bait — the heart "black-then-red" flash — is genuinely fixed in code. The real drift is: (1) the brand **logo mark was silently changed** from the contract's leaf-disc to a mountain-peaks scribble (everywhere: sidebar, login, landing); (2) the **landing "Sign in" button is still a glassmorphism translucent pill**, the exact thing the owner asked to remove; (3) the **landing page throws a dev runtime error** ("1 Issue" indicator visible); (4) **junk/test seed data** ("asdfasdf" group, placeholder duplicate photos) leaks into rail/collection and makes it *feel* unfinished. So: the bones match; the felt "brokenness" is logo swap + glass button + a landing error + scruffy data.

Screenshot pairs captured (in `temporary screenshots/`):
- CONTRACT: `screenshot-241-contract-feed.png`, `screenshot-242-contract-profile.png`, `screenshot-243-contract-login.png`
- REAL: `screenshot-247-real-feed.png`, `screenshot-248-real-profile.png`, `screenshot-244-real-login.png`, `screenshot-245-real-landing.png`, `screenshot-249-real-directory.png`, `screenshot-251-real-support.png`, `screenshot-252-real-collection.png`
- MOBILE: `screenshot-250-real-feed-mobile-mobile.png`, `screenshot-246-real-login-mobile.png`

---

## Global — VERDICT: PASS
- Background is warm dim `#EBE6D7` (globals.css `--background: #EBE6D7`), reads correctly in every screenshot. NOT too white. [pass]
- Faint valley tree behind content present (`app-shell.tsx`: landing.jpeg at `opacity-[0.16]`, `bg-[center_28%]`). Visible in feed/directory/collection. [pass]
- Cards are warm-white, not pure white. [pass]
- [P1] Brand logo mark drifted from contract. Contract `/preview/v2` uses `LeafMark` (leaf-disc + vein). Real app uses `PeaksMark` (mountain-peaks scribble) in `sidebar.tsx:69`, login and landing nav. Same identity element changed app-wide without it being a logged decision. This is the single most visible "this looks different from the approved look" gap.
- [P2] `navbar.tsx` still carries an old glassmorphism header (`bg-white/55 backdrop-blur-md`) — appears unused by the shell but is dead/risky styling.

## Feed — VERDICT: PASS
- Header is correct: wide search PILL ("Search the valley...") + bell + green "New post" inline with the "Feed" title. [pass]
- Posts are a single RULED SHEET with hairline dividers (not tiles, not the old big-composer + exposed filter row). Composer is the slim "Share a memory..." pill on top. [pass]
- Right rail shows "Coming up" + "New in the directory" + "Your groups", and its top aligns to the composer, not the page header (`app-shell.tsx` aside carries its own top offset). [pass]
- Bird avatars are centered in their discs (`bird-avatar.tsx` glyphs balanced around 16,16 in a 0..32 viewBox). [pass]
- [P1] Junk seed data: "Your groups" rail shows a test group **"asdfasdf"**. Looks broken/unfinished to the owner. Reseed demo data.
- [P2] "New in the directory" rows are inconsistent — some show "· Chennai" / "· Bengaluru" with no batch, while contract shows "Batch of '12 · Bengaluru". Caused by sparse seed users, but reads as a layout bug.
- [P2] Unliked heart renders pale pink (opacity 0.45 by design). Intentional and consistent, but worth confirming the owner likes the pink resting state.

## Profile — VERDICT: PASS
- Cover photo + LARGE avatar overlapping, NOT clipped/cut-off (the exact bug the checklist claimed fixed — it really is). [pass]
- Name + batch/city/profession line in correct order (batch, location, profession; house not shown publicly). [pass]
- Tabs Posts / About / Photos present and rendered. [pass]
- "Open to" tags present (Open to mentoring / Hosting visitors / Career chats). [pass]
- Details rail (in-valley years, ISC, based-in, profession) + Contact rail (email) + Groups. Posts list present. [pass]
- [P2] On own profile the primary CTA is "Edit profile" (correct); the contract's "Message / Save contact" is for *other* people's profiles — could not verify the other-person CTA in this pass (only own profile screenshotted). Recommend a second screenshot of a `@demo.valley.test` profile.
- [P1] Same "asdfasdf" junk group appears in the profile Groups rail.

## Login — VERDICT: PASS
- PHOTO-SPLIT light layout: big valley photo left, centered form right. NOT the old dark void. [pass]
- Hoopoe sits on the password field, "Welcome back", email + password + "Request an invite". [pass]
- Hoopoe is animated, NOT a snap: `hoopoe.tsx` gives wings a real spring transition (`transform 0.5s cubic-bezier(.34,1.5,.64,1)`), eyes fade; login page does an on-load peek (`intro` state, 1100ms timeout) then settles closed. Genuinely implemented. [pass]
- [P1] Logo mark in the top-left is the mountain-peaks scribble, not the contract's leaf-disc (same global drift).

## Landing — VERDICT: PARTIAL
- Hero is clean visually: full valley photo, "Welcome back to the valley", "Request an invite" + "Sign in", "See what's inside" scroll cue. Scrolls into a real feature showcase (`FeatureSection` x5 + `ShowcaseShot` + `TrustSection` + footer). [pass on structure]
- [P0] **The "Sign in" button IS still glassmorphism** — `landing-hero.tsx:77` uses `border-white/85 bg-white/12 ... hover:bg-white/22`, a blurred translucent pill. This is the exact "blurred/glassmorphism sign-in button" the owner asked to remove. Contradicts a direct owner instruction.
- [P0] **Landing page throws a runtime error**: the Next.js dev "1 Issue" error indicator is visible bottom-left in `screenshot-245-real-landing.png`. A page that errors in dev will likely error or degrade in prod. Must open the page, read the actual error (likely in a landing client component / `TrustSection` BirdAvatar or `landing-birds`), and fix.

## Directory — VERDICT: PASS
- World MAP renders (not blank/error): zoomable, sqrt-scaled cluster bubbles, +/- and Full screen controls. [pass]
- Default is Map/browse (Map/Batches toggle, Map active), NOT an alphabetical list. [pass]
- Progressive search bar + Filters. [pass]

## Support — VERDICT: PASS
- Present and clean: "Keep the network in the valley alive", honest itemized hosting costs (server/db/images/email/domain, "all in ₹1,200–1,500/mo"), UPI contribution. Distinct from school donations. [pass]

## Collection ("The Valley Collection") — VERDICT: PARTIAL
- Renders: masonry photo grid, search + filters + "Contribute". Layout correct. [pass on structure]
- [P1] Every tile is the **same placeholder banyan photo duplicated** (seed limitation). Looks broken/unfinished. Needs real or varied seed images before the owner reviews.

---

## False "done" claims (FEEDBACK_CHECKLIST marks `[x]` but NOT true in the real app)
- **Line 167 "Keep the calm hero; make page SCROLLABLE into a feature showcase":** structure exists BUT the page throws a dev runtime error and the hero "Sign in" button is still glassmorphism — so the landing is not actually shippable/clean. **Partially false.**
- **Implied "glow toned down / no AI-company glass":** the landing Sign-in glass pill survives. **False for landing.**
- Everything else marked `[x]` that I could verify is actually true: heart-always-red (line 63) ✅ real, profile-avatar-not-clipped (line 74) ✅ real, ruled sheet (line 24) ✅ real, bird avatars centered (line 30) ✅ real, login photo-split (line 17) ✅ real, lowered right rail (line 37) ✅ real, world map (line 120) ✅ real, no-alphabetical-default (line 116) ✅ real, support page (line 194) ✅ real, search placeholder "..." + longer (line 33) ✅ real. The checklist is more honest than feared — the gaps are the *landing* items and the *unlogged logo swap*.

## Recommended fix order
1. **[P0] Landing batch — real work.** Open `/` in the browser, read the "1 Issue" runtime error, fix it. Then replace the glassmorphism "Sign in" button in `landing-hero.tsx:77` with a solid/outline button matching the brand (no `bg-white/12`, no blur). This is the highest-leverage "looks broken" fix.
2. **[P1] Brand identity decision — small but app-wide.** Decide: leaf-disc (contract `LeafMark`) or peaks (`PeaksMark`). If the contract is law, swap `PeaksMark` back to the leaf mark in `sidebar.tsx`, login, and landing nav. One mark, used in ~3 places.
3. **[P1] Reseed demo data — small.** Kill the "asdfasdf" test group; add varied Collection images; backfill batch on directory entries. Makes the whole app *feel* finished without touching layout.
4. **Fine as-is (no real work):** Feed, Profile, Login interaction, Directory map, Support. These match the contract; do not re-touch.
5. **[P2] Cleanup:** remove/retire the dead glass `navbar.tsx`; capture a second screenshot of an *other* user's profile to confirm the Message/Save-contact CTA.
