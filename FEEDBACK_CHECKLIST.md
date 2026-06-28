# Master Feedback Checklist

Every actionable item from the owner, tracked so nothing is missed. Keep this current.
Status: [x] done · [~] applying now (design lock) · [ ] planned for build · [P] parked/later · [D] decision

## Global look & theme
- [~] Light mode is too bright/white. Dim the background and make it slightly warmer (do not overshoot).
- [~] Surfaces are too pure-white; make cards a touch warmer/dimmer.
- [~] With a dimmer bg, make the sidebar green slightly darker for more contrast (current is a touch light).
- [~] Theme light/dark transition is too slow; speed it up (text fades in slowly, feels laggy).
- [x] Icons are loved (esp. the quill "Letters" icon). Keep the set.
- [x] Colors should be more vivid, at the level of the "alumni office blue" #3F7CA6 (not overboard).
  Avatar palette replaced with 10 vivid hues (docs/spec/color.md); UserAvatar fallback now #3F7CA6.
- [~] Add more RED presence in the UI even with no likes (a proper red/coral, not the drab brown).

## Auth / login
- [x] Login layout (big photo + centered form, no quote, no "Est. 1926").
- [~] Hoopoe: make it bigger and more obviously a HOOPOE (longer, more branched tail; clearer crest).
- [~] Hoopoe: on load, open eyes then close, so people notice the interaction.
- [~] Push the Sign in button slightly lower (more breathing room above it).
- [ ] Invite-only entry; keep the trivia/verification gate, warm tone. No magic links.

## Feed
- [x] Use the ruled SHEET layout (not separate tiles).
- [x] Bird avatars as default (not initials); photo upload overrides.
- [x] Need 500+ bird avatar variations (scalable to 1000), evenly distributed, well differentiated.
  640 combinations (16 species x 10 disc colours x 4 poses) from a salted FNV-1a hash of user.id,
  high-bit-sliced so the axes decorrelate (a real correlation bug between colour parity and pose
  parity was found and fixed). src/lib/avatar.test.mjs observes all 640 distinct triples evenly spread.
- [x] Bird glyphs must be CENTERED in their disc.
  Every silhouette is now authored balanced around (16,16) in a 0..32 viewBox; the old low-right
  translate(0.6,1.6) offset is gone. Verified on a 16-species contact sheet at 28/40/64/104px.
- [x] Search placeholder text should end in "..." and the search bar should be longer.
  Moved into the PageHeader as an expand-on-click pill (placeholder "Search the valley...", ~320px wide,
  noticeably longer/wider than the old inline bar); it expands into a live input on click. (SearchPill)
- [ ] Smaller search that expands into filters on focus; pagination so the feed scales (600+ posts/month).
- [x] Lower the right rail so "Coming up" aligns with the composer ("share memory") tile, not "New post".
  Feed now uses the 3-col shell (main + 318px rail); the rail carries a top offset (pt-[139px]) so its
  first card ("Coming up") lines up exactly with the composer tile (measured 171px == 171px), not the page
  header. The "Coming up" event card (cinnamon iPhone-calendar date chip + RSVP) is restored at the rail
  top, followed by "New in the directory" (bird avatars, names link to profiles) and "Your groups" (counts
  in office-blue). New post / search / bell live in the header, which stays inside the main column so the
  space beside it (above the rail) is header-only.
- [~] Use the freed space above the rail for something useful (TBD; add if a good idea fits).
- [x] Share icon: rounder/softer/approachable, not too sharp, not too vertical/compressed, "just right".
  Swapped ShareFat for the rounder ShareNetwork everywhere posts render it (post-card, letter-engagement).
- [x] New post button: tone the glow down ~20% (less "AI company").
  Primary/leaf button glow softened to 0 5px 13px -12px (tinted, restrained), applied in button.tsx.
- [x] New post button: the "+" must be vertically centered with the text and the content centered in the button.
  Button base is inline-flex items-center justify-center with even px-5; the + (17px) sits on the text
  baseline-centre and the icon+label group is centred in the pill. Verified on a 1440 crop.
- [x] Batch line: the "·" separator dot is too small; make it slightly bigger (not too big).
  Added .dotsep (1.15em, ink-soft) and applied it to post-card, profile, and footer separators.
- [~] Tighten name-to-batch spacing (Ananya was too loose; match the nicer Sanjana spacing).
- [x] Click any person's NAME in the feed to go to their profile (everywhere a name appears).
  Shared PersonName (Link to /profile/[id] with hover underline) now renders names in the feed,
  comments, and rails; avatars also link to the profile. UserAvatar deleted, BirdAvatar everywhere.
- [P] Reactions beyond the heart: only if great icons; small, tasteful, no emoji soup.
- [ ] Saved/bookmarked posts, with a cute colored bookmark animation.
- [P] "On this day" tile that swaps with the events tile depending on what is applicable (needs history DB first).

## Heart (critical bug)
- [x] The like heart turns BLACK then fades to red. The heart must ALWAYS be red; only the size pops.
  Root cause: a global `* { transition: color }` in globals.css + fill icon flooding currentColor.
  Fixed: global transition already excludes color; Heart given explicit color #E03A33 + transition:none
  (resting 45% opacity duotone, liked solid fill) in post-card, comments-section, letter-engagement;
  pop animates transform only.

## Dark mode
- [D] Dark mode "loses character / feels corporate". Decision: ship LIGHT-ONLY for MVP; park a warmer
  "gray, not black" dark mode for a later, dedicated polish pass.

## Profile
- [x] BUG: the large profile avatar is cut off / the header tile is mis-spaced. Fix (avatar must not clip).
  104px BirdAvatar with ring lives in cover-body (not the clipped cover-photo), pulled up -mt-14 with
  relative z-[2]; cover photo raised to h-44 so the whole avatar sits inside the card. Verified 1440 + 390.
- [x] Remove the glow on profile elements.
  Reuses the foundation Button (restrained tinted shadow) and .card-elevated (neutral layered shadow); no
  --primary-tinted halos anywhere on the profile.
- [x] Drop the "5 groups" stat (irrelevant). Keep "42 posts" and "in the valley 2003 to 2009".
  Stats strip is exactly "N posts" + "In the valley YYYY to YYYY" (years only when both exist). Group count
  moved into the rail Groups card header "Groups (N)".
- [x] Header line order: batch, location, profession (do NOT show house publicly).
  metaParts = [batchLine, currentCity, jobTitle@workplace].filter(Boolean) joined with .dotsep; no house.
- [x] Tighten name-to-batch spacing on the cover.
  Name leading-[1.05], meta mt-[3px] so the two read as one stacked unit.
- [x] CTA rethink: Message vs Save contact is unclear; recommend the right primary CTA.
  Own profile: "Edit profile" (-> /settings). Others: "Get in touch" (dialog of the methods the person
  actually shared; disabled with helper text if none) + "Save contact" (.vcf vCard download). No fake inbox.
- [x] Details card beyond three items; the RIGHT full set (batch, based-in, profession, at-RV years, etc.),
  avoid the "AI always picks three" smell.
  Variable-length: at-RV years, batch (spelled ISC/ICSE YYYY), taught-subjects (teachers), based-in,
  profession, and admission no. gated "Private to you" for owner/admin only. Renders only present fields.
- [x] Contact: phone number, email, and any number of social links (Instagram, Facebook, X, LinkedIn, site),
  each clearly labeled with where it links.
  Rail Contact card lists email/phone/instagram/linkedin, each labeled with the value (mailto/tel/profile
  URL); same list powers the Get in touch dialog. Existing instagram/linkedin fields normalized to URLs.
- [x] About section WRITTEN BY THE USER.
  New nullable User.about (long-form); About tab "In their words" block renders it, with an owner empty-state
  prompt to /settings. Distinct from the short cover bio.
- [~] A prompted "school memories" area (favorite teacher + why, favorite anecdote, committees, captaincy /
  torchbearer, sports-day records, contributions). Needs structure brainstorming; do not clutter.
  About tab "The valley years" block scaffolds the prompts (teacher / favorite memory / committees) as
  dashed placeholder cards on the owner's own view, hidden on others'. Editing UI + a UserMemory store are
  flagged for the settings/onboarding pass.
- [P] "Person in focus" daily feature pulling from the memory answers.
- [x] Fix alignment: Details/Contact/Groups rail is long while About is short; align tab-content top with rail.
  Cols grid items-start; rail is lg:sticky lg:top-6; tabs row and first rail card share the same top edge.
  Groups capped at 5 with a count in the header so the rail no longer outruns short tabs.
- [x] "Open to" tags: keep; suggest tags (people will not invent their own).
  Soft leaf pills under the bio from new nullable User.openTo; a DEFAULT_OPEN_TO suggested set shows on the
  owner's own profile when none are set.
- [P] Profile-completeness nudge (gentle, dismissable).

## Directory (the core reason to join)
- [x] Do NOT default to an alphabetical list (the "two A's" person dominates). Default is the dual-mode browse
  surface (Map default tab + Batches), never a flat list. Results sort by recency, not name-asc.
- [x] Feature-rich search that reveals filters progressively; basic users get simple search (name/city/
  profession). Advanced facets (city, profession, batch range, sort) sit behind the Filters toggle.
- [x] World MAP of alumni (loved), zoomable/interactive, large. Counted sqrt-scaled city pins, zoom-based
  superclustering (India's cities merge at low zoom, split on zoom in), and a per-city people drilldown.
- [P] Privacy controls: hold off; every profile is visible for now.

## Groups
- [ ] Create your own groups and add anyone; public (browseable, auto-join) vs private (invite-only).
- [ ] Invite via @-tagging; invites arrive in notifications. Tagging/@ works throughout (posts and invites).
- [ ] Roles: organizer / member (find a more fun name if possible).
- [ ] Each group can host its own newsletter and events. Group feed reuses the shared feed UI.

## Letters: TWO distinct features (needs distinct names)
- [ ] Long-form POST TYPE ("letter"): written via the shared composer in any feed; renders without
  dominating the feed. Separate from the newsletter feature below.
- [ ] Newsletter feature (Letterloop-style): full Letterloop parity. Anyone can set questions; time periods;
  automated email reminders; UI for adding questions; songs/extras; per-group issue archive; cadence.
  Needs a backend for scheduled jobs + transactional email (Resend). Needs a DISTINCT name (not "letters").
  First-time intuitive description of what it is.
- [D] "Cross-batch letters" idea: owner skeptical; clarify or drop.

## Events
- [P] Keep small: a single tile that appears only when an event exists, opens details + RSVP; group-scoped
  possible; add-to-calendar via downloadable .ics (ref Calget.co). Not a big part of the UI.

## Photo archive (better name than "media library")
- [ ] A living visual memory of the PLACE (campus, banyan, Rishi Konda, birds, landscapes, ethos), not a
  personal photo dump. Anyone uploads; community tags/catalogs (birds, landscape, junior/senior, decade).
- [ ] Cost-aware (hosting is expensive): WebP via sharp, size caps, thumbnails, lazy load, admin approval.
- [ ] New sidebar item with a great icon and a warm name.
- [ ] Pictures usable as post images, profile and group/event covers.
- [P] Seeding/marketing plan to get contributions (owner wants help here).
- [P] Tagging PEOPLE in photos: not now; keep in mind.

## Onboarding, accounts, verification
- [ ] Signup MINIMAL: name, email, password, batch (grad year), years joined/left. Nothing more required.
- [ ] "Complete your profile" later: house PER YEAR (year-by-year, with clear "don't remember"), class
  sections (9A/9B), admission number (with "don't remember"), profession, socials, about, memory prompts.
- [ ] TEACHERS (past and present, even non-alumni) can register; account type alumnus / teacher / ex-teacher
  with a tag. Current students cannot.
- [ ] Verification: admin via office class lists + community vouching ("N people confirm they know X");
  a flag-this-person path folded into reporting. Non-obvious verified marker (hover reveals it).
- [P] Onboarding tutorial / coachmarks for older, less-technical users.

## Data to collect (even if not shown on profile)
- [ ] House per year, class sections, admission number, years joined/left, profession, sports-day stats,
  RV trivia answers. Use later for insights ("you have X in common", house-switch patterns). Not all shown.

## Landing page
- [ ] Keep the calm hero; make the page SCROLLABLE into a feature showcase that sells joining, using real
  app screenshots/embeds plus tasteful lively animations (birds hopping, scroll-reveal). Light mode.

## Delight / micro-interactions (as important as everything else)
- [~] Hoopoe on password (template): bigger, more obviously a hoopoe, opens then closes on load.
- [ ] 3 to 5 more tasteful moments across the UI, not just on auth.
- [ ] Bird avatar click -> tiny beak chirp/wiggle easter egg.
- [ ] Bookmark/save animation (bookmark sweeps over, gains color).
- [ ] Loading states: replace gray rectangles with a small lively scene (a bird hopping among leaves),
  not a "movie".
- [x] Like-pop and bell-shake already in.

## Logo
- [ ] Trace the three peaks (Bodikonda, Middle Peak, Rishikonda left-to-right) from bodi-middle-rishi.png
  into a simple standalone mark (white, maybe a gradient), balancing simple vs scratchy. Dedicated work later;
  start now with a first-pass trace. Leaf is the placeholder until then.

## Notifications & admin
- [ ] Notifications: mention/reply/RSVP/new-letter. Easy mark-as-read, good scroll UI. NO weekly digest email.
- [ ] Rich, easy admin tab (sole admin = owner): manage accounts, reports, verification, "play God".
- [ ] Community guidelines telling people how to use it (not a WhatsApp replacement). Placement TBD (not a
  whole new section; maybe within About).

## Giving / support
- [ ] SUPPORT page to fund the owner's hosting (distinct from school donations, which are dropped). UPI to
  start; nicer options later. Honest copy about costs.
- [P] Campaign cards with progress bars (good idea, parked).

## Infra / performance
- [ ] Turso+Vercel feels slow (pages and images). Moving deploy to RENDER. Make UX snappy; pay only for
  high-impact things. Plan: image strategy (WebP, sizes, CDN/caching, lazy), DB choice/region + Prisma
  pooling, Next caching. (See infra spec from the architecture workflow.)

## Architecture / reuse (do real thinking before building)
- [ ] One shared <Composer/> ("write a post" abstraction) reused everywhere (main feed, group feeds).
- [ ] One shared feed / post-list and post-card, reused by main feed, group feeds, and profile.
- [ ] Modular, lightweight, intuitive flow; design how users move between screens; reuse common pieces.

## Process
- [ ] Full MVP build, then push to GitHub (clean version control, commit like "redesign"), deploy to Render.
- [ ] Iterate: screenshot everything AND verify every interaction works (min 2 to 3 loops); zero sloppy bugs.
- [ ] Update ALL docs so future sessions are as smart (no re-explaining).
- [x] Desktop first; do not prioritize mobile yet.
- [x] No em dashes anywhere (followed silently).
- [x] Use the GSD workflow + meticulous task division.
