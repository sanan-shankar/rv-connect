# RV Connect — Feature Ideas & Backlog

> Parked ideas. Diff against `docs/spec/DESIGN-SYSTEM.md` and `docs/ROADMAP.md` before acting; some
> items may already be decided/rejected.

A living list. Nothing here is committed. It mixes what we already have, what you've
asked for, and ideas I think could earn their place. Skim it, cross out what you hate,
star what you love. (Written with no em dashes, per house style.)

Legend: [have] exists today · [ask] you asked for · [idea] my suggestion · (star) high value

---

## 1. Identity & profiles
- [have] Basic profile (name, batch, posts list).
- [ask] (star) Rich profile page: cover photo, avatar, bio, current city, role/company,
  contact links, "Batch of 'XX", house, years attended. Tabs for Posts / About / Photos.
- [idea] "Where are they now" block: city plus a small map pin. Feeds the directory's real
  purpose (finding someone from your school in any city you travel to).
- [x] Bird-themed avatars as the default. SUPERSEDED 2026-07-01: shipped as fully deterministic
  (hash-assigned from `User.id`, 50 species), not a user-facing picker — "pick your bird" does not
  apply. Photo upload and manual override remain the only escape hatches. Initials are the legacy
  fallback only.
- [idea] Verified-alumni checkmark (admin-approved) so the directory stays trustworthy.
- [idea] "Open to" tags: mentoring, hiring, hosting visitors, coffee in my city.
- [idea] Gentle, dismissable profile-completeness nudge, to enrich the directory over time.

## 2. The directory (the reason to join) (star)
- [have] Directory list with search/filter by batch.
- [ask] (star) A genuinely useful people-finder: search by name, batch, city, profession, house.
- [idea] Map view: pins of alumni by city worldwide. "12 alumni in Berlin."
- [idea] "In this city" so a traveller can instantly find locals.
- [idea] Batch pages: a page per graduating batch with everyone in it (great for reunions).
- [have] **Profession browse, LLM-tagged** (shipped 2026-08-28). `User.professionTags`, a
  text[] nobody types, written by a hand-run pass (`scripts/dev/tag-professions-*.mjs`,
  `.claude/skills/tag-professions/SKILL.md`) on the owner's own subscription. The vocabulary,
  the rules for creating a tag and the three caps are in `src/lib/profession-tags.ts`.
  Multi-tag, so a status and a field share one column: the medical student is
  `["studying","healthcare"]` -- the owner's call, against a "student" boolean, *"not that
  scalable"*. Built at 63 members rather than the 150 first guessed, because the display
  floor makes an early run safe: a tag is offered only at five people and only the twelve
  largest are offered, so today exactly one clears and the control hides itself rather than
  show a dropdown of one. Buckets appear on their own as the membership grows, with no
  re-run. Changing the vocabulary -- add, split, merge, remove -- needs no migration.
- [idea] Privacy controls: choose what's visible in the directory vs private.

## 3. Feed & posts
- [have] Posts, comments, likes, comment-likes, mentions, polls, post images, search/sort.
- [ask] Pagination / infinite scroll (don't load everything at once).
- [ask] Smaller search bar that expands into filters on focus.
- [idea] Post types: photo, poll, event, "letter" (long-form), milestone (new job, marriage,
  baby, book), memory ("on this day at RV...").
- [idea] A small, tasteful set of reactions beyond the heart (not emoji soup).
- [idea] Saved / bookmarked posts.
- [idea] "On this day" memories resurfaced from the archive.
- [idea] Official "Alumni Office" account for announcements (already mocked in the rail).

## 4. Letters (the Letterloop-style feature) (star)
- [ask] (star) Group newsletters: a group runs a recurring "letter" where members answer
  prompts, and the answers are compiled and sent out on a schedule. This is the Letterloop core.
- [idea] Prompt rounds: organiser sets questions, members submit before a deadline, a compiled
  issue is published to the group and emailed.
- [idea] Issue archive per group (read past letters).
- [idea] Cadence options (monthly, quarterly), reminders, gentle nudges to contribute.
- [idea] Cross-batch letters ("Class of '09 quarterly") and themed ones ("Founders' Week").

## 5. Groups
- [have] Groups with membership and a group feed.
- [idea] Group types: batch, city, interest (Birders of RV), cause (Alumni Fund), official.
- [idea] Group roles (organiser/member), join requests, private vs open groups.
- [idea] Each group can host its own Letters series and Events.

## 6. Events
- [idea] (star) Events with date, location, RSVP, attendee list, cover image (rail teases this).
- [idea] Founders' Week / reunions as first-class events with photo galleries afterward.
- [idea] City meetups posted by local alumni ("RV dinner in Berlin, next Thursday").
- [idea] Add-to-calendar, reminders.

## 7. Photos & memory
- [idea] Shared photo albums per event / batch / Founders' Week.
- [idea] An archive of old campus photos (banyan, Rishi Konda, dorms) for nostalgia.
- [idea] Tag people in photos (ties into the directory).

## 8. Giving / Alumni Fund
- [have] Donate page.
- [idea] Campaign cards with progress bars (mocked in feed), named funds (reading room,
  scholarships), transparent totals, a thank-you wall.

## 9. Onboarding & auth
- [have] Email + password (local), admin bypass, trivia gate.
- [ask] Kill magic links everywhere (ship the password auth to production).
- [idea] Invite-only / request-an-invite flow to keep it private and trusted.
- [idea] Animated hoopoe on the password field (covers eyes when hidden, peeks when shown),
  replacing the static owl.
- [idea] A warmer verification ("which house, which year") that feels like a memory, not a CAPTCHA.

## 10. Notifications & presence
- [have] Notification bell plus unread count.
- ~~[idea] Weekly digest email ("what you missed in the valley").~~ REJECTED (locked decision):
  explicitly "NO weekly digest email."
- [idea] Mention, reply, RSVP, and new-letter notifications.
- [idea] An `actor {id, name}` field on Notification, so the row can show the person's bird and
  link their name to their profile. Today the name is baked into the message string
  (`"X liked your comment"`), which is why notification rows were the one identity surface the
  2026-08-13 clickable-avatars pass could not link.

## 11. Delight & identity (the "feels like RV" layer)
- [idea] The hoopoe as a recurring motif (mark, empty states, loading).
- [idea] Bird-watching flavour: a "sighting" post type ("4 hoopoes near the banyan").
- [idea] Seasonal warmth (Founders' Week banner, monsoon mood).
- [idea] Quiet, purposeful micro-animations (like pop, bell shake, page fade, hoopoe).

## 12. Admin & trust
- [have] Reports, user management, report management.
- [idea] Moderation queue and gentle community guidelines (a school community, not the internet).
- [idea] Admin tools to verify alumni, merge duplicates, manage batches/houses.

---

## Open design questions (for the next feedback round)
- Avatars: refined initials vs illustrated valley-birds vs photo-first?
- Batch display: subtle small-caps under the name vs a quiet chip vs something new?
- Posts: every post its own tile, a ruled "sheet" of entries (Almanac style), or a hybrid?
- How much blue / cool accent to introduce for vibrancy without losing the calm?

---

## Data to collect (even when not shown on the profile)
- House per year, class sections, admission number, years joined and left, profession, sports-day
  stats, and RV trivia answers. Gather these quietly at signup or profile completion even when a
  field is never shown publicly. Later they power insights like "you have X in common" and
  house-switch patterns across batches. Moved here 2026-07-02 from the owner feedback checklist
  (its "Data to collect" section) when that file was consolidated into bugs.md.