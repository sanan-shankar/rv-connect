# The announcement window

A window that opens once over the Feed for every member: the twenty new birds and an ask for
support with the payment inline. Built 2026-10-29 and 2026-10-30, in three rounds with the owner
looking at each.

---

## 1. What the owner asked for

On 2026-10-29 the owner asked for a second screen that shows up once, the way the guide's first-run
tour does, and only the first time. It should not annoy people, and it should not run on the demo.
His ideas for it, which he was clear were ideas and not a page plan:

- The bird collection has grown, and the screen should show off all the birds, cute and bright, as
  a carousel of rows drifting in alternating directions.
- The site works as a web app on a phone: a button for Android, steps for iPhone.
- Nearly 600 members have joined, said in passing.
- A push to support the site. It is run completely not for profit; what people give goes towards
  what it cost to build and what it takes to keep running; it was built purely out of love for the
  Rishi Valley community; any support would be deeply appreciated. Remind people that giving lets
  them pick their own bird, now from many more birds.
- Whether to pay inline or send people to Support was his open question. Inline won, because a
  trip to another page is one more step between someone and giving.
- Keep the guide's layout, picture on one side and writing on the other, in a box of the same size,
  because a shared shape standardises the two.

He needs to summon it as often as he likes while testing, which a once-only window does not allow
on its own (section 2).

His rounds of feedback, in order:

1. **On the first version** (three pages, each idea under its own title): the bird carousel had too
   much empty space, and the birds included a mass of grey and brown ones, which he took as a lack
   of care given how carefully the Birds page order and the Support plate's twelve were chosen. The
   titles were dutiful rather than exciting, the separate pages were an invention he never asked
   for, the phone page read as work, and the stock-looking photograph did not belong.
2. **On the second version** (one page, a wall of birds on pastel tiles, each row one colour family
   on that family's complement):
   - The tiles' colours belonged to nothing else on the site.
   - The birds should be bigger, with maybe more rows, more like a beautiful jungle and never
     cramped.
   - Grouping like colours together is not colour thinking. It made the wall look ordered and
     manicured when it should feel abundant.
   - The motion was too fast, and the rows flickered to white now and then.
   - The phone part was an icon and a sentence on his laptop, with no way to add the app and no
     instructions. It has to handle every Android maker and browser, including the prompts some of
     them raise, and show a different message for each device.
   - The writing used too many kinds of type and too many sizes of gap.
   - The line about members without a photo was useless.
   - Mention the redrawn classics, such as the Paradise Flycatcher and the Peregrine Falcon.
   - New joiners should get the guide first and this window the next time they open the site
     fresh.
3. **On the third version** (the same wall on the sidebar's green): still too much ground between
   the birds, and none of the cute, cosy closeness of the birds on the Support page's plate. That
   plate is the bar.

Late on 2026-10-30 he took the phone part out: telling members the site works as an app, and
guiding each phone through installing it, will be its own announcement later, not mixed into this
one. The research for it is in `docs/planning/app-install/research.md`.

He also asked, mid-build, that every colour decision be judged with a keen eye for colour theory
and composition, the way an interior designer would compose a room. He asked to keep the Murukku
bird line after questioning it: it is the name the birds list he supplied gives the White-browed
Bulbul.

---

## 2. Who sees it, and when

- **Once per account.** `User.announcementSeenAt` records it. A member is due while that is null or
  older than `ANNOUNCEMENT_AT` (`src/lib/announcement.ts`), so a later announcement only has to move
  that date. The window is one page, so it counts as seen the moment it opens.
- **After the guide, never with it.** The Feed only offers the window once `guideSeenAt` is set,
  and the window waits for the next sitting when the guide's tour ended in this one: the tour
  writes when it ended into this tab's sessionStorage (`guide-tour.ts`), and `heldForTheGuide`
  compares that with the same browser's clock. A visit is one tab or one cold start of the
  installed app, and a tab left open for over twelve hours counts as a new one. An earlier cut
  compared the server's `guideSeenAt` with the browser's clock, which a phone with a fast clock
  could fool into showing the window straight after the tour.
- **Never on the demo.** The Feed's gate and the (main) layout's layer both check `IS_DEMO`.
- **The owner's replay.** `/feed?announcement=replay`, admin only, opens it whatever is recorded and
  records nothing. The guide's admin line links it beside "play the first-run tour again". The
  address drops its query on open, so a reload is an ordinary Feed.
- **The stamp lands, or is tried again.** The window stamps the account the moment it opens and,
  if the write does not land, tries twice more over ten seconds while the member reads. It never
  stamps from the browser's note alone: the e2e sign-in plants that note on the owner's account so
  the visual suite photographs the Feed, and a stamp sent on seeing it would spend his real
  showing (write-path review, 2026-10-31).
- A browser note in one-shot.ts covers the visit the server write can be outlived by, as the
  guide's tour note does. The action refuses on the demo before anything else, and the demo's
  Prisma guard refuses the column too (`demo.test.mjs`).
- **Proved end to end** on 2026-10-31 against the live dev server as the test account (Jerry
  Maguire), restored afterwards: an existing member sees it and is stamped at once; a reload, a new
  tab and a fresh browser on another device never show it again; a new joiner gets the guide alone,
  the same sitting stays shut after the guide, and the next tab shows the window once; a member
  who is not an admin cannot replay it.

---

## 3. The window

It wears the guide's window (`src/components/guide/guide-window.ts`): on a laptop a floating window
with the picture in the left 44%, on a phone a sheet with the picture as a band across the top, the
X over it, and a slim bar that fades in behind the X once the band has scrolled away.

One page and one voice on it. The second version still dressed each idea in its own type, so the
rules now are: one title; paragraphs at the guide's one size; the amounts and the Contribute button
at one height (44px); one gap between blocks (24px) and one between paragraphs (16px). On a phone
the sheet's footer holds the Contribute button, always in reach.

---

## 4. The wall

`src/components/announcement/bird-wall.tsx` draws it; `wall-birds.ts` chooses and orders the birds.

**The look is the Support plate set moving**: big round birds close together on the plate's own
warm card, each a full row tall with about a third of a bird between neighbours. Six rows on a
laptop, four bigger ones on a phone. Sizes vary a few percent and birds sit a hair off their line,
so the wall never settles into a grid, but only a little, because the plate is calm.

**The birds** are forty-five of the brightest: the owner's twelve from the plate, every new bird
with colour enough to hold its place, and every bird the words name (the dark Red-vented Bulbul
among them; on the cream its crimson vent and black crest read at once). The olive, brown and grey
birds sit out. The Roller is not on the Birds page, so it is not here either.

**The order is composed by hand**, with a measured palette for every bird (the five main colours of
each drawing in OKLab, from `scripts/dev/bird-sheet.mjs` renders) as a check on the eye:

- Every row is a mixed bunch: a hero or two (Hoopoe, Peafowl, Swamphen, Eagle-Owl, Paradise
  Flycatcher, Pitta, Flameback), a few stars, the rest in support.
- Neighbours differ in main colour, ideally as complements (the cobalt Peafowl beside the gold
  Oriole, the violet Swamphen beside the yellow Iora).
- Where possible a neighbour picks up the other's accent, so the row reads as one piece.
- Light and dark alternate, so no two dark birds touch.
- Look-alikes never share a row. The exception is the Pied and White-throated Kingfishers, which
  sit two apart and look nothing alike at a glance.
- The loop's seam counts as a neighbour.
- Each row is listed as it stands when the window opens, so the heroes start scattered.
- The phone's four rows hold every bird the words name.

**Motion.** Rows alternate direction and each bird faces the way its row travels (drawings face
right, so leftward rows are mirrored). The wall is only a picture: pointing at a bird used to pause
its row and show its name, and the owner had that removed. The speed is about 11 to 13px a second on a laptop, a third of the second version's.
**Every bird is its own layer**: the second version slid each row as one strip three copies long,
and Safari painted strips that wide in tiles that sometimes scrolled in blank, which was the flicker.
A bird's layer is no bigger than the bird and is painted once. The birds of a row share one lap and
one speed, so they keep their spacing, and each comes back round from the far side while out of
sight (`wall-left` and `wall-right` keyframes, lengths in row heights through container query
units). Only transform animates.

---

## 5. The words

Written through the humanizer, in the owner's voice for product copy (plain, one warm line on the
title).

- **Title:** "Twenty new birds just flew in!"
- **The birds:** the newcomers named (Indian Eagle-Owl, Grey-headed Swamphen, Common Iora and the
  Murukku bird), the collection at 70, and the redrawn classics (Paradise Flycatcher, Peregrine
  Falcon).
- **The ask:** ₹500 or more lets a member choose their own bird from all 70, then why the site needs
  support, the headcount in passing (`headcountPhrase`, computed live, "Nearly 600"), and the
  appreciation.

---

## 6. The ask

The Support page's own form (`support-contribute.tsx`, split into `useContribution`, `AmountChoice`,
`ContributeButton` and `SecureNote` so both surfaces share one payment path). A payment that goes
through lands on `/pick-bird` exactly as from Support, and that navigation closes the window. The
window leaves out the admission-number amount and the security note, both of which need a size of
type of their own, which is what this window is shedding.

---

## 7. Data

- `User.announcementSeenAt TIMESTAMP(3)`, added by
  `prisma/migrations-manual/2026-10-29-announcement-seen.sql` on both databases before the schema
  names it. "Download your data" carries it beside `guideSeenAt` (`account-export-rule.ts`).

---

## 8. Considered and not taken

- **A page per idea**, each with its own title (the first version). The owner's ideas were a list,
  not a structure.
- **Pastel tiles, each row one colour family on its complement** (the second version). Its colours
  belonged nowhere else on the site, and sorting like with like read as manicured.
- **The sidebar's canopy green as the ground** (the third version). It made the white birds glow,
  but it showed too much ground between the birds and lost the plate's cosiness.
- **Sending people to Support to pay.** Inline keeps giving to one step.
- **Resending the stamp from the browser's note** when the Feed still finds the account due. It
  healed a lost write, but the visual suite's planted note would have spent the owner's showing.
  Retrying while the window is open covers the common failures without it.
- **The site as an app on a phone, in this window.** It was built (a row per device, a QR code on
  laptops, a public `/app` page) and taken out at the owner's word, to come back as its own
  announcement.
