# Round 6 owner feedback — master task plan (2026-07-18)

Source: owner voice-note prompt of 2026-07-17, initially truncated at 50k chars; the owner re-sent
the tail mid-session, so the full prompt is now captured. The 22-house list was never pasted — the
owner said to hunt it down; best-effort research + owner confirmation. Owner instruction: keep
going until the entire wave is done, no mid-way check-ins; feedback comes at the end.

Legend: [ ] open · [~] in progress · [x] done · [!] blocked/owner input

## Live status (2026-07-18, orchestrator notes)

- DONE: round-6 DB migration applied (displayEmail, birdOverride, Post.cityScope, Place,
  UserPlace + city seeding, Anonymous user with hoopoe). houses.ts = canonical 22 + alias map.
- RUNNING: foundation agent (schema sync, normalize.ts, GeoNames import);
  wave-1 workflow (13 lanes: sidebar, composer, feed-cards, notifications, catchups, landing,
  mascot, dropdowns, map, search, support, uploads, birds+analytics — each with review+fix+commit);
  whatsapp-curation workflow; falcon redesign agent; 4 design-spec agents (profile, walkthrough,
  filters, groups-rethink previews).
- H20 finding: rishivalley.space itself is healthy (200 apex; www/http 308 to apex). Stray
  rv-alumni.vercel.app landings = links minted with the old URL; NEXTAUTH_URL/AUTH_URL on Vercel
  likely still vercel.app (OWNER: fix in Vercel dashboard). Code fix queued: host-based 308 in
  src/proxy.ts middleware (wave 2).
- MCP note: claude.ai Supabase + Vercel connectors are authenticated to a different account than
  this project; DB work goes through scripts/dev/run-sql.mjs (DIRECT_URL), Vercel checks from
  outside.
- WAVE 2 queue (launch when wave 1 + foundation land, to avoid file collisions): location picker
  component first (standalone), then onboarding rework + profile rebuild + walkthrough build +
  filters build (need their specs) + admin moderation & city-scoped posts & host redirect lane.
- AFTER content workflow + falcon: my editorial review of picks, seed as Anonymous, Vihan bird
  reassignment, falcon assignment to Veda + Srihari.

## A. Foundation (schema + data, do first)

- [ ] A1. Real houses list: owner says 22 houses exist. Placeholder in `src/lib/houses.ts` (4 names).
      Research from WhatsApp chats + web; ship best-effort flagged list; owner confirms. Kaveri is
      confirmed one; must normalize alternate spellings (Kaveri/Cauvery/Kaveri House...). Old-era
      houses may be color-named (blue/red/green-and-white seen in chats).
- [ ] A2. Run houses column migration (pending-migration.sql section 1) via Supabase; move
      houses-step off localStorage.
- [ ] A3. Schema additions (ADDITIVE ONLY, raw SQL via Supabase MCP; `prisma db push` unusable, see
      bugs.md #11): `User.cities` (multi-city, unlimited, replaces currentCity/secondaryCity pair as
      the source of truth; keep old cols), `User.displayEmail`, `Post.cityScope` (city-scoped posts),
      Notification type for admin notes. Phone column already exists.
- [ ] A4. Location gazetteer: import GeoNames places (worldwide cities + Indian towns/villages incl.
      Madanapalle, Nellore) into a `Place` table; search endpoint with disambiguation
      (name, state, country, lat/lng). Powers the new location picker everywhere.

## B. Onboarding + sign-in rework

- [ ] B1. Replace "grade joined" ask with "Which batch are you in?" + info tooltip: "the year your
      12th-grade batch graduated from RV, even if you left earlier". Keep gradeJoined column; batch
      (batchYear) becomes the direct input.
- [ ] B2. Phone number collected at the very first step (email + password + phone), default +91,
      editable country code, no verification. People trust it more up-front.
- [ ] B3. Title-case normalization on save for names, cities, org, etc. (fix their mistakes).
- [ ] B4. Placeholder/example text must read clearly as an example (people think the gray "4" is
      typed in). Admission number example: 3430.
- [ ] B5. Field order: current city ABOVE admission number. "Occupation" not "Profession".
      Organization example "Apple", not "Rishi Valley School".
- [ ] B6. Everything skippable and doable later (house, admission number, etc.).
- [ ] B7. House selection: satisfying UI (house + year, journey builds as you add; profile-style
      boxes-and-arrows). Real houses from A1. Alternate spellings accepted.
- [ ] B8. Sign-in/up copy: drastically less text, bigger, simple for old users. One paragraph max.
- [ ] B9. Full bird names everywhere ("Indian Roller" not "Roller").
- [ ] B10. "Proudly keep my bird" vs "Continue" do the same thing — collapse/clarify.
- [ ] B11. Don't force profile completion at the end / no repeated "finish profile" loop; profile
      editing taught in the walkthrough instead. Fix skip-state copy ("whatever you skipped is
      waiting" shows even when nothing skipped).
- [ ] B12. Bounce removal: photo-slide panel transition on /login-/signup join = simple
      ease-out swipe, no overshoot. Same for the alumni slide during joining.
- [ ] B13. Hoopoe first-flight jitter on "Join" click — preload/warm the flight layer so first run
      is as smooth as later ones.
- [ ] B14. Make the whole flow more fun and jolly (hubs step etc.), clear what buttons do.

## C. Walkthrough / tutorial V1 (big)

- [ ] C1. Section-by-section product tour: Feed, Directory, Collection, Catch-ups. Skip
      notifications/search explanations. Hoopoe is the MAIN character (big, flies between points).
      Possibly a bottom box / half-screen walkthrough UI rather than tiny tooltips.
- [ ] C2. Feed copy: share/read RV-relevant news, like/comment/reply; meaningful updates for
      everyone; NOT a WhatsApp replacement ("server costs would break" joke); WhatsApp = day-to-day
      spontaneous chat, this = the messages worth keeping/permanent. Never negative about the group.
- [ ] C3. Directory copy: find people by location or batch, filters, shout-out to profession
      (younger alumni networking).
- [ ] C4. Collection copy: "ever tried to Google good RV pictures?" pitch; many individual archive
      attempts, this is the shared one; high-quality meaningful photos only (of the school, not
      random friend pics); tag/caption for search; curators remove inappropriate; add responsibly.
- [ ] C5. Catch-ups: brief explanation.
- [ ] C6. Walkthrough re-accessible after signup: entry point in About ("go through the guide
      again"); walkthrough = the how-to-use guide, clubbed.

## D. Profile page rebuild (implement in main app, not preview)

- [ ] D1. Base = Dossier. About tab FIRST, then Posts (+Letters, one section two groups). No
      "write them a letter", no following.
- [ ] D2. Keep from Dossier: admission-number stamp, navigation, houses chain (colored boxes +
      arrows + years; must scale to 10 houses), Find-them socials block.
- [ ] D3. Keep from Letterhead: contact-card header density (batch, city, everything in one place).
      From current profile: click-the-bird, save contact (VCF), get in touch.
- [ ] D4. Header: name + batch of '23 + occupation + admission stamp; drop "entered in 4th grade"
      "at Rishi Valley for X" clutter from the header; houses chain just below; then About; then
      at-RV-years/cities/etc.
- [ ] D5. Email + phone prominent (the two key contact fields). Display-email override (see A3).
- [ ] D6. Cities: plain list of all their cities, no primary/secondary labels.
- [ ] D7. Add life/color: header pop or tasteful background image (owner will supply/crop stock
      images to cycle; build the slot). More lively than flat white — current page has more life
      than all five concepts.
- [ ] D8. Distinct wide vs mobile layouts, both beautiful, not the mobile layout stretched.
- [ ] D9. Edit profile rebuilt in conjunction: batch-first (no "worked out from 3 facts"), one
      modular location-picker piece reused everywhere, consistent naming (About, not bio/in-your-
      words mix), prompt to write About, less "work"-feeling, no forced sequence.

## E. Features

- [ ] E1. City-scoped posts: composer option to post only to members of a specific city; admin sees
      all regardless. Not in the tutorial (niche).
- [ ] E2. Admin moderation: delete ANY post/letter/comment/photo (not the whole account); optional
      short note to the author on delete ("don't share this type of content here") → lands in their
      notifications; clicking opens a nice "note from the admin" UI.
- [ ] E3. Display email override (profile shows it; login email unchanged underneath).
- [ ] E4. Vercel Analytics: install @vercel/analytics + wire in layout.
- [ ] E5. Groups rethink: owner unsure of groups' purpose (batch WhatsApp groups already exist;
      main real uses = batches + maybe locations + Catch-ups vehicle). Deliver several PREVIEW
      versions of how groups could work; groups must NOT be a top-3 nav category. Location-groups
      idea has the Madanapalle auto-group problem. Needs design exploration, owner picks.
- [ ] E6. WhatsApp content mining: read both _chat.txt exports (+ attached PDFs/docx; skip
      audio/video), find the genuinely sweet/high-quality stories (banyan-tree mural update with
      photo is a known example). Max ~10-12 posts/letters, quality bar absolute, fewer is fine.
      Copy-edit only (spelling/grammar; voice untouched). Post as "Anonymous" user with the hoopoe
      avatar. Attach relevant images where they exist. Overflow → compiled PDF for later.
- [ ] E7. Anonymous user gets hoopoe avatar; Vihan Shah (real signup) got the hoopoe wrongly —
      reassign his bird (no real person may have the hoopoe).
- [ ] E8. Peregrine falcon glyph: FRESH take (previous 3 refinements all made it worse). Cool,
      cohesive, matches the 50-species style. Verify visually and honestly this time. Then assign
      to Veda and Srihari's profiles; report how hard manual bird assignment is.
- [ ] E9. Composer: no live character count; gentle nudge toward Letters when a post runs long.

## F. Support page

- [ ] F1. One currency story (rupees-first), correct numbers: hosting ~$20/mo (no vendor names,
      just "hosting"), Cloudflare estimated for ~100 users, domain ~$30/yr.
- [ ] F2. Upfront dev cost: mention ~$3,000 upfront development OR "significant upfront cost" —
      decide phrasing (recommend the vaguer phrasing with the number available; pick one, flag to
      owner).
- [ ] F3. Brand colors (canopy/cinnamon/sky) instead of the current scheme; make the cost bar more
      prominent and fun, less serious-table.
- [ ] F4. UPI presets: no monthly ₹20; one-time ₹200 / ₹1,000 / ₹2,000-style presets, range
      200-5000, not too many choices. Investigate upi:// deep link actually opening GPay/PhonePe on
      mobile (report feasibility honestly).
- [ ] F5. Delete "what your support pays for"; end with "Thank you for your support". Stop using
      the word "quiet" in copy (owner: "so annoying").
- [ ] F6. Supporter perk: supporters may choose their bird avatar from the collection of 50 —
      hyperlink "collection" to the all-species page.
- [ ] F7. bugs.md #4: email cost row still mentions sign-in links; UPI handle placeholder — fold in.

## G. Layout / navigation

- [ ] G1. Sidebar: add Support entry (great icon matching set), ABOVE About.
- [ ] G2. Remove footer links (Rishi Valley School link etc.); move Feedback into the profile
      popup menu. Kill the bottom-of-page area ("no one's ever gonna see that").
- [ ] G3. Sidebar lockup (logo + "Rishi Valley") — visually centered in the rail, currently sits
      too far left. Keep relative positioning of logo/wordmark.

## H. Bug blitz (small, mostly independent)

- [ ] H1. Landing: bring back the bouncing scroll-down arrow below "see what's inside" (removed
      without being asked).
- [ ] H2. Landing: footer hoopoe's legs cut off ~70% of the time (standing behind leaves /
      render clipping); takes seconds to recover.
- [ ] H3. Leaf-repel effect: back to gentle/slow/graceful interpolation (like 3-4 versions ago),
      not jittery/reactive.
- [ ] H4. Hoopoe loading sprite flashes for a frame on fast page loads — only show when the load is
      actually slow (delay-gate it); a couple of jumps minimum once shown; best effort.
- [ ] H5. Remove the hoopoe mail-delivery moment on the notification panel entirely.
- [ ] H6. 404 hoopoe: bigger (main-character sizing).
- [ ] H7. Comment rows: name line and meta line (4 days ago · Reply) too tight; avatar a bit
      bigger; rebalance vertical rhythm (split the difference, avatar not top-aligned dangle).
- [ ] H8. Save/bookmark icon stroke still thicker than siblings — final pass.
- [ ] H9. Composer focus: uneven outline (thicker corners) for the first second before the even
      green ring appears — even from the get-go.
- [ ] H10. Feed report flow: left green bar gets cut in half on report — fix.
- [ ] H11. Feed heart (post or comment) occasionally scroll-jumps the page to the top — hunt
      (likely focus/anchor or re-render + scroll restoration).
- [ ] H12. Composer caret bug (friend's machine): after typing then deleting all, caret sits at end
      of placeholder. Unreproducible locally; add a defensive fix (placeholder is real inline text?
      check contenteditable handling).
- [ ] H13. Notifications list: per-type icons (heart for likes, comment bubble for comments, etc.),
      not a wall of bells.
- [ ] H14. Directory map: mobile fullscreen has NO exit affordance — add one.
- [ ] H15. Image uploads: 20MB limit on posts AND collection; find and fix other silent failure
      causes ("failed" happens too often); nice-to-have upload progress indication.
- [ ] H16. Catch-ups: ask/answer/read arrows vertically centered on the circles (not icon+label
      block); "Fresh off the press" box aligned to start with the first catch-up.
- [ ] H17. Catch-ups suggested questions: rewrite — letterhead-style questions old friends actually
      ask (current set is cringe; "favorite song" too young-skewed, keep lower if at all).
- [ ] H18. Search scoping: search on Feed should search the feed (posts), not silently jump to
      directory people-search. Scope search to the surface you're on.
- [ ] H19. Filters rework, Directory + Collection (BIG): the all/all/all/relevance bars are
      unintuitive garbage (owner's words). Labeled selects, real sort names (newest ≠ relevance),
      profession filter first-class, no orgs leaking into professions. Make it an intuitive
      powerhouse. Design properly.
- [ ] H20. rishivalley.space sometimes lands on rv-alumni.vercel.app — check Vercel domain redirect
      config; likely dashboard-side; report findings.
- [ ] H21. Disable the fun fact shown when hovering the Rishi Valley icon (the sidebar lockup).
      DISABLE only — keep the code so it can return later.
- [ ] H22. Dropdown/select misalignment EVERYWHERE (report-post "select a reason", collection
      filter selects, etc.): the popover doesn't align with its trigger, corner rounding doesn't
      match, the hover-highlight inside is misaligned too; worse when it opens upward. Fix the
      shared select/dropdown primitive (offset, width, radius, item highlight inset) once.
- [ ] H23. Collection upload form rework: DELETE "contributor photo" and the "what's in it"
      pickers, delete bird/species-name field. Keep: Caption (free text), Part of school (free
      text box), and When = year dropdown with graceful precision (month if known > year > decade
      fallback instead of ±5 uncertainty).
- [ ] H24. Composer toolbar: photo button reads too small next to bold/italic/underline/strike —
      rebalance. Post button proportions feel off: unbold the label, rebalance size so it sits
      right among the small controls (compare against other CTAs that "look right").
- [ ] H25. Profile photo loads ~1s after the rest of the profile page — no pop-in allowed;
      preload/priority the avatar image so everything paints together.

## Z. Final pass (after everything is built and verified)

- [ ] Z1. Product-critique round, SUGGESTIONS ONLY (owner acts as filter, nothing implemented):
      what's not good, what should improve, what's overcomplicated, what could be rearranged,
      what's missing that alumni would find genuinely useful (owner seed idea: geo-marking posts).
      Full effort, honest opinions, delivered as a list for the owner to react to.

## Process

- Version control: atomic conventional commits per workstream, no AI attribution, commit as work
  lands. Never commit WhatsApp/ or recovery-codes.txt (now gitignored).
- Model tiers: Haiku mechanical, Sonnet implementation/review, Opus involved design decisions,
  Fable (orchestrator) crucial calls only.
- Screenshots: desktop 1440 + mobile 390, min 2 rounds, real Chrome path for Puppeteer.
- DB: additive SQL only via Supabase MCP (db push blocked by legacy tables, bugs.md #11).
- After each area: /simplify + security review where auth/data/forms touched.
