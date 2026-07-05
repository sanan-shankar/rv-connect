# Letterloop Research (for the "Catch-ups" feature)

Research date: 2026-07-05. Sources are Letterloop's marketing site (letterloop.co),
their Intercom help center (help.letterloop.co), the iOS App Store and Google Play listings,
a Pratt IXD design critique, and Product Hunt / blog reviews. Where a number could not be
pinned down or sources disagreed, that is called out inline.

Letterloop's one-line pitch: "a fun way to have a group newsletter without the work." A small,
trusted group answers a handful of curated questions on a schedule, and the answers are compiled
into a single beautiful issue that everyone reads and reacts to. It is deliberately "anti-feed":
a small fixed set of people, slow and intentional, private by default.

---

## 1. Core loop mechanics (setup, ownership, members, invites)

- **Unit of the product**: a "Letterloop" is one private group newsletter. It produces a series
  of "Issues" over time. The people in it are "members."
- **Owner**: the creator owns the Letterloop. The **Owner** is specifically the person who
  *sponsors* (pays for) it. Ownership can be transferred ("Give Owner Status"). One account can
  create and manage an unlimited number of Letterloops.
- **Admins**: the owner can promote members to **Admin**. Admins choose which questions go in each
  issue, manage members, edit the schedule, send manual reminders, view issue progress, and can
  disable commenting. Multiple admins are allowed.
- **Members**: everyone else. They answer questions, submit question ideas, react, and comment.
- **Setup flow** (from the onboarding described in help + the Pratt critique):
  1. Name the Letterloop.
  2. Set frequency and the delivery time; pick the topic/questions for the first issue.
  3. Choose sections (it recommends 3 to 5 sections and 3 to 10 participants, but lets you deviate).
  4. Build the members list.
  5. Write a **short personal invite note** that is sent to everyone you invite.
  6. Confetti confirmation screen + confirmation email as feedback.
- **Member limit**: up to **50 members** per Letterloop.
- **Adding members**: "+ Add Member" on the Members tab. Members can be added at any time, even
  after the loop has started. Optional toggle to notify existing members when someone joins.
- **Removing members**: ellipsis menu next to a name -> "Remove Member." (What happens to their
  past answers is not documented.)
- **Editing member emails**: admins cannot edit a member's email directly; the workaround is
  remove-and-re-add, or the member edits their own email under Profile.
- **Invites, two ways**:
  - **Email invite** with the personal note.
  - **Invite by link**: anyone with the link joins by entering their email. No extra steps.
    The link can be **reset or revoked**. Guidance: only share with people you trust.

---

## 2. The full issue cycle

**Who writes questions.** Both. The admin curates from Letterloop's library or writes custom
questions, and **any member can submit a question** (the admin decides which submitted questions
to include). Members submit questions three ways: from the dashboard ("Submit Question"), via an
email prompt sent **one day after an issue is delivered**, or via a "Submit a question" button at
the bottom of each delivered issue. Admins can also actively "**Request questions from members**,"
which emails everyone a link; those submissions attach to that specific upcoming issue.

**How questions are chosen per issue.** Each cycle Letterloop **auto-suggests a couple of
questions**. The admin can swap them, add library questions, or add custom ones, and drag to
reorder (grip icon). Questions are grouped into sections (see below).

**The window.** The standard cycle is a **7-day answer window**:
1. Admin picks the questions (or accepts suggestions).
2. Members get an email asking them to answer within 7 days.
3. Reminders go to non-responders during the window.
4. At the end of 7 days, answers are compiled and the issue is delivered to everyone.

**Reminder cadence.** Automatic reminders are sent only to members who have not yet replied
(anyone who already answered stops getting nudged). The documented schedule is an initial prompt
plus up to three "gentle nudge" reminders:
- Reminder 1: **3 days out**
- Reminder 2: **2 days out**
- Reminder 3: **1 day out**
(One help article frames this as "up to 3 reminders" within the 7 days; another phrasing counts
the initial prompt and says "4 emails." Treat it as: 1 opening prompt + up to 3 dated nudges,
tied to days-remaining before delivery.) Admins can also fire a **manual reminder** at any time
to everyone who has not replied, which bypasses members' reminder-off settings.

**Skipping.** All questions are optional. A member can answer as many or as few as they like.
Even a member who answers **nothing** is still included in the final issue. There is no penalty.

**Closing / compiling.** At the end of the window the issue auto-compiles and sends. Admins can
override timing: **"Start Now"** sends immediately, and **"Edit Schedule"** changes the delivery
date. Compilation is automatic and effectively instant (no human prep time on Letterloop's side).

**Delivery format.** Email is the primary surface, plus web and mobile apps. Two delivery modes:
- **Individual delivery** (recommended): the issue is sent to each member separately. Better
  deliverability and a better in-app commenting experience.
- **Group delivery**: sent as one email with all members on CC, suited to teams who like
  reply-all email threads.

---

## 3. Frequency and schedule controls

- **Frequency options**: **Biweekly, Monthly, Quarterly**. There is explicitly **no weekly and no
  yearly** option. Changed under the **Schedule** tab (Frequency setting).
- **Delivery time**: customizable (the paid tier advertises "customizable delivery time and
  frequency"). Admins can reschedule, pause, or extend issues, and change a specific issue's
  delivery date via "Edit Schedule."
- **Timezone handling**: not documented. Delivery time is set per Letterloop; there is no visible
  per-member timezone feature.

---

## 4. Answering experience

- **Media supported**: text, **photos**, **videos**, **links**, and **Spotify songs** (via a Music
  section). Replies can mix media in any order.
- **Photos**: a dedicated **Photo Wall** section holds many photos; you can also attach a photo
  per question via a camera button. The Pratt critique flagged a historical limit of "one photo
  per question" as disrupting storytelling; the app has since added **Albums** that organize all an
  issue's photos and videos, softening that limit.
- **Anonymity**: not offered. Answers and reactions are attributed to the author and visible to
  the whole group. No anonymous-answer mode was found.
- **Editing after submit**: "You can edit your reply at any time." No deadline or edit-count limit
  is documented (so late edits appear to be allowed even around/after delivery).
- **Previews**: the admin can preview the issue before publishing; there is a per-question preview
  while customizing.

---

## 5. Reading experience (the issue itself)

- **Layout**: a polished, hierarchical newsletter. Content is organized **by section and by
  question**, with everyone's answers grouped under each question/section (question-first, not a
  page per person). Sections act like "chapters."
- **Reactions**: **any emoji** (not a fixed preset). Long-press on iOS, hover on web. Everyone can
  see everyone's reactions; tap again to remove yours.
- **Comments**: threaded **under each individual reply**, plus a comment thread for the whole
  issue. Supports **@mentions**. You can reply to the whole group or to one person's answer. By
  default every comment emails the whole group (notification preferences are adjustable; only
  admins can disable commenting entirely). In email you tap a "Reply in Letterloop" button; in the
  app there is a Comments bar.
- **Table of contents / navigation**: sections give "easy navigation between sections."
- **Archive**: **unlimited archive** of past issues ("View Past Letterloops"). Each issue can be
  **exported as a paginated PDF**. An **Activity Log** per issue exists for admins.
- **Mementos**: turn a moment from an issue (photos, issue details, music) into a designed,
  shareable card. A **Shuffle** button cycles layout/framing/visual variations without changing the
  content. Share via Save (camera roll), Messages, Instagram Stories, or Copy. This is the built-in
  "share a highlight outward" mechanic instead of ugly screenshots.

---

## 6. Customization

- **Loop-level**: name, and a header choice of centered logo / wide banner / logo + banner / no
  header. Logo min 200x200 square JPG/PNG; banner roughly 5:1 to 5:2.
- **Themes (7 presets)**: **Classic** (original style), **Minimal** (quiet, monochrome),
  **Magazine** (warm, editorial), **Evening** (dark, cozy), **Diary** (handwritten, notebook),
  **Postcard** (bright, playful), **Celebration** (colorful, for milestones).
- **Color controls**: background, section background, logo, header text, body text, section titles,
  author-name color.
- **Fonts**: separately for logo, issue title, and body; serif / sans-serif / handwritten /
  editorial options.
- **Dividers**: Line, Dashed, Rule.
- **Issue-level**: custom issue name, plus sections and questions. Customizations can be saved as
  templates.
- **Sections**: three types: **Standard**, **Photo Wall**, **Music** (Spotify). Default sections
  ship as "New Obsessions," "Questions," and "Photo Wall." Recommended: start with 2 to 3 sections.
- **Question types**: **text input**, **Poll** (interactive, results shown in the issue; exact
  single-vs-multi behavior not documented), and the **Music** section for song submissions.
- **Question sets / bank**: a searchable library of **600+ questions** (some listings say 800+),
  and a personal **Question Bank** where you save/edit unlimited questions and browse the library
  by theme. In-app there are **13 question sets**, including: Evergreen Topics, On The Self, On
  Childhood, On Self Improvement, On Career, On Relationships, On Wisdom, On Parenting, What If?,
  **Mad Libs**, **Most Likely To** (superlatives), **Team Icebreakers - Light**, and **Team
  Icebreakers - Thoughtful**. The public site groups questions into 8 categories: Check-in,
  Icebreakers, Random & Fun, Worldview & Life, Relationships, Work & Career, Self Reflection, and
  All Topics.
- **Special question types worth noting for us**: "Most Likely To" (group votes a superlative onto
  a member), "Mad Libs" (fill-in-the-blank), and Polls are the non-open-text formats that add play.

### Example questions (real, verbatim, by category)

**Check-in**
- How have you been lately?
- What's been on your mind a lot lately?
- What are you grateful for lately?
- What's a great piece of advice you recently received? Who was it from?
- Think of one of your big, lofty goals. What small step could you take today?
- What's a new skill or knowledge you're learning right now?
- What are you most proud of right now?
- How did you spend your most recent weekend?

**Icebreakers**
- If you had to choose a theme song for your life, what would it be?
- What's the most memorable dream or nightmare you've ever had?
- What skill of yours are you most proud of?
- Can you share an instance where your first impression of someone was completely wrong?
- What's a memorable lesson you've learned from a mistake you've made?

**Random & Fun / Most Likely To**
- If you could witness any event from the past, present, or future, what would it be?
- You can stop time for 24 hours. What do you do with this opportunity?
- What fictional character do you most relate to?
- Who here is most likely to dedicate their life trying to go to another planet?
- Who here is most likely to read every book in a school library?

**Worldview & Life**
- What aspects of how you were raised do you want to continue on to future generations?
- What's the most useless thing you've ever been taught in school?
- Who do you wish was still alive? Could be someone you've met, never met, anyone.
- What do you think all happy people have in common?

**Relationships**
- What community do you currently feel the most connected to?
- What was your relationship like with your siblings growing up?
- What are you working on in your relationships (with friends or with a partner)?
- What do you most need to hear right now, and from whom?

**Work & Career**
- What's one thing you wish you had known when you started your career?
- Explain your job to a 3 year old.
- What was your first job, and what did it teach you?
- Would the best version of yourself be in your current job?

**Self Reflection**
- Is there anything important you've been putting off? If so, why?
- What's something people often incorrectly assume about you?
- If you could ask your future self one thing, what would it be?
- What's one thing about you that hasn't changed in the last 10 years?
- What would you title your memoir?
- What is the dumbest but most innocent thing you believed as a child?

(These map cleanly onto an alumni/school context: childhood/school memories, "where are you now,"
worldview, and reunion-style icebreakers.)

---

## 7. Engagement and stickiness mechanics

- **The scheduled prompt is the core engine**: a recurring reason to show up, with dated nudges so
  people do not have to remember.
- **Reactions + threaded comments + @mentions** keep conversation going after delivery.
- **Mementos** create outward-shareable artifacts (soft social proof / re-engagement).
- **Team tier extras** (paid): **birthday and life-event celebration cards**, **admin
  announcements**, and an **automated question queue** (questions pre-loaded so issues never stall
  for lack of content).
- **"From You"**: a one-to-many mode where a single author writes to many readers (a solo
  newsletter), broadening use beyond round-robin Q&A.
- **Reviving a quiet loop**: manual reminders, "Start Now," "Request questions from members," and
  Pause/Resume so a loop can go dormant without being deleted. Confetti and confirmation emails
  add lightweight delight.

---

## 8. Logistics and edge cases

- **Members**: up to 50; onboarding suggests 3 to 10. No hard minimum was found, so a 2-person
  loop is possible.
- **Only a few people answer**: the issue still sends. Non-responders are still listed; questions
  are optional, so a sparse issue is normal and not treated as a failure.
- **Late submissions**: replies are editable "at any time" with no documented cutoff, so late or
  post-delivery edits appear allowed.
- **Muting / notification control**: each member chooses **All reminders (recommended)**, **Last
  reminder only** (24h before due), or **None**. Channels are email and iOS push. Turning
  reminders off does **not** block manual admin reminders. Only admins can disable commenting.
- **Pausing / leaving**: a Letterloop can be **Paused** (temporary) or **Deleted**; individual
  issues can be deleted. Members can be removed by an admin, and anyone can erase their own data.
- **Privacy model**: fully private; only invited members see the content and photos. Letterloop
  explicitly does **not moderate or screen content** and trusts the closed-group model. No ads, no
  data sale, no marketing use of data. Erase-your-data anytime.
- **Data export**: **per-issue PDF export** (paginated). No bulk/all-data export is documented.

---

## 9. Pricing and what gates where

- **Free**: the **first 2 issues** of any Letterloop, full-featured, no card required.
- **Standard** (friends/family): **$5/month**, **$50/year** (~$4.16/mo), or **$199 lifetime**.
  Only the **Owner** pays; all other members participate free. One subscription covers **all** the
  Letterloops that owner creates. Includes: continuing past 2 issues, customizable delivery time +
  frequency, unlimited member Q&A, full archive, reschedule/pause/extend, no ads.
- **Teams & Work**: **$50/month**. Adds a curated **team/workplace question bank**, **branded
  logo**, **admin announcements**, **birthday and life-event cards**, and an **automated question
  queue**.
- **What this tells us**: the high-value, retention-driving features are (a) simply continuing the
  cadence past the free trial, (b) the archive, and (c) the automation that keeps issues from
  stalling (auto-suggested/queued questions, reminders). The "team" delighters (birthday cards,
  announcements, branding) are the upsell layer.

---

## 10. What users praise and complain about

**Praise** (App Store 4.9 from ~668 reviews and an Apple Editors' Choice; Product Hunt 4.3/5):
- Feels "special and intimate"; deepens connection with each issue, especially across distance.
- "Anti-feed": small fixed group, slow and intentional, email forces a slower pace.
- Low-pressure and low-effort for the organizer; Letterloop handles scheduling, prompting, and
  formatting so "the organizer barely has to lift a finger after setup."
- "Creates the space for me and my friends to talk about our inner lives on our own terms."

**Complaints**:
- **Customer support** described as slow/subpar; some issues took months.
- **Email deliverability**: some members not receiving issues (a recurring pain for an
  email-centric product; less of a risk for us since we default to in-app).
- **Discoverability**: key actions (Send Now, etc.) buried in three-dot menus; missing tooltips on
  icons; the settings/feature-request UI feels cramped.
- **Media limits**: the historical one-photo-per-question constraint hurt storytelling (partly
  addressed by Photo Wall + Albums).

---

## 11. Recommendations for "Catch-ups"

Context and constraints for us: a Catch-up is created **from an existing group** in the Rishi
Valley app (so no invite/50-member setup flow to build), **notifications are in-app** first (email
possible later), and we already have **bird avatars, profiles, and photo handling**. User-facing
naming is "Rishi Valley," never "Alumni." Long-form posts are "Letters"; this newsletter feature
is "Catch-ups."

### Must-build (this is where the magic lives)
1. **The scheduled question cycle.** A Catch-up belongs to a group and runs on a recurring cadence:
   open an issue with a small set of questions, an **answer window**, then auto-compile and
   publish. This loop is the entire product; everything else is secondary.
2. **Curated question library + auto-suggest.** Ship a Rishi Valley-flavored question bank
   (childhood/school-at-the-Valley memories, "where are you now," worldview, reunion icebreakers)
   and auto-suggest a couple each cycle so an organizer can launch in one tap. Reuse the categories
   above. Allow custom questions and let members submit questions the admin curates.
3. **Optional answering with rich media, attributed.** Text + photos (lean on our existing photo
   pipeline and R2), attributed to the member with their **bird avatar**. All questions optional;
   non-responders still appear in the issue. Editable answers during the window.
4. **A beautiful compiled issue, organized by question/section.** Everyone's answers grouped under
   each question. This question-first layout (not a page-per-person) is what makes it feel like a
   shared newsletter rather than a profile dump. Match our warm ruled-sheet feed aesthetic.
5. **In-app reminder cadence tied to the window.** Mirror Letterloop: an opening notification plus
   up to three dated nudges (for example at 3, 2, 1 days before close), sent only to people who
   have not answered, plus a manual "nudge the group" for admins. Per-member reminder setting
   (All / last only / off).
6. **Reactions and comments on answers.** We already have LoveButton and comment patterns; allow
   emoji reactions and threaded comments per answer, with in-app notifications. This is the
   post-publish stickiness.
7. **Archive of past issues.** Every published Catch-up is browsable forever within the group.
   This compounding archive is a top-cited reason people stay.

### Nice-to-have (add once the core loop is proven)
- **Poll and "Most Likely To" question types** for playfulness and easy participation.
- **Music/Spotify section** (we already have Spotify MCP context in the ecosystem, but treat as
  later; a simple "link a song" is a cheaper first version).
- **Themes/cover customization** per Catch-up (we have a strong design system; a couple of tasteful
  presets, not seven, is enough).
- **Mementos** (shareable highlight cards) once there is content worth resharing; good for pulling
  lapsed alumni back.
- **Birthday / milestone prompts** auto-seeded from profile data.
- **Per-issue export (PDF)** for keepsakes and reunions.

### Skip or defer for an alumni-school context
- **Invite-by-email / invite-link / 50-member cap / roles setup**: a Catch-up inherits its
  membership and permissions from the existing group, so skip Letterloop's whole invite and
  member-management surface. Group admin = Catch-up admin.
- **Group-vs-individual email delivery modes and reply-all threads**: irrelevant when the primary
  surface is in-app. Revisit only if/when email delivery is added.
- **"From You" solo one-to-many mode**: we already have Letters for solo long-form; do not
  duplicate.
- **Anonymity**: Letterloop does not offer it and an alumni group is identity-first; skip.
- **Content moderation-by-trust-only**: our app has broader membership than a 10-person friend
  loop, so keep the app's normal reporting/moderation rather than Letterloop's zero-moderation
  stance.

### Pitfalls to design around
- **Reminder fatigue**: Letterloop pushes up to four emails per cycle. In-app, throttle hard,
  always give a real "last reminder only / off" control, and never nudge someone who already
  answered. Prefer a single well-timed nudge over a barrage.
- **Dead loops**: the biggest failure mode is an issue that opens to silence. Counter it the way
  the paid tier does: auto-queue/auto-suggest questions so issues never stall, keep cadence gentle
  (monthly fits alumni better than weekly), let admins Pause instead of abandon, and seed the first
  issue with an easy, warm icebreaker.
- **Empty-issue awkwardness**: decide the rule for "too few answers." Letterloop still ships;
  consider a soft minimum (for example auto-extend once, or hold if 0-1 answered) so the first
  published issue does not feel barren and discourage the group.
- **Frequency**: Letterloop deliberately omits weekly. For alumni, **monthly or quarterly** is the
  sweet spot; offer biweekly at most. Too-frequent cadence kills these loops.
- **Discoverability**: Letterloop hides key actions in three-dot menus and drew criticism for it.
  Surface "start now," "nudge," and "add question" as visible affordances, per our interactive-state
  rules.
- **Deliverability** (only relevant when email is added later): it is Letterloop's most common
  complaint. Starting in-app sidesteps it entirely.
