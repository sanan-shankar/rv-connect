# How everyone else solved this

Owner, in the brief, ¶7: *"I'm not going to give you answers, okay? I'm going to tell you the
constraints and then I want you to find a solution shape, because there's so many different ways
you can go about. I want you to critically think about each way. Research what other people do.
Research what Letterloop does and pick the best way."*

This file is that research. Written 2026-09-05 by eight researchers working in parallel, one
shape each, assembled into one document. Sources sit at the end of each part.

**A note on confidence.** Three marks run through the whole file.

- **[measured]** means somebody opened the thing in a browser or called the endpoint and read the
  number off the screen. Take these as facts about 2026-09-05.
- **[company]** means the company published it themselves: a help page, an engineering post, an
  API reference, a release note. Strong, but it describes what they say they do.
- **[secondary]** means third-party writing: a review, a critique, a blog, a community thread.
  The shape of the answer is reliable. The exact numbers and labels may already have drifted.

Where a researcher could not get evidence, they said so rather than guessing, and every one of
those admissions is collected in **The gaps** at the bottom. Read that section before you build
anything that leans on a number in here.

---

## The problem is eight problems

We had been treating "Catch-ups is bad" as one problem. It is eight, and each one lands on a
different part of the product:

1. **How Letterloop looks and moves.** The product we are rebuilding against, measured rather
   than remembered. Bears on **a Catch-up's home**, and on the shape of a published Round.
2. **A short list of a few important things, on any screen width.** Two or three items is an
   awkward number for any layout. Bears on **the list on /catchups**.
3. **A long, multi-author document read on a phone, with navigation.** Where am I, and how do I
   get somewhere else. Bears on **the published Round on a phone**.
4. **Layout engines that adapt to the content they receive.** One short answer, one six-paragraph
   answer, nine photographs, and one page to put them on. Bears on **the magazine and the PDF**.
5. **Who is in this, and who wrote in.** Two different questions that one control usually answers
   badly. Bears on **the people panel**.
6. **Archive, delete, mute, leave, pause, end.** Six words, and how other products keep the count
   down. Bears on **the lifecycle verbs**.
7. **Link previews for songs, and shared photo walls.** Somebody pastes a link mid-sentence, and
   many people drop photos in one place. Bears on **song previews and the photo wall**.
8. **Producing a beautiful PDF from a web layout, without a server of our own.** Which engine
   makes pages, and where it runs. Bears on **the export**.

---

## How Letterloop looks and moves

`docs/planning/letterloop-research.md` (2026-07-05) already covers the mechanics. This is only
the look and the movement. Three kinds of evidence. The marketing site and its sample issue,
which I opened and measured in a browser **[measured]**. The six App Store screenshots, which I
downloaded and read; four are real UI and two are staged composites **[measured]**. And the help
centre, which Letterloop rewrote in July and August 2026 and which is unusually specific about
controls **[company]**.

### The colours and type it ships

The marketing site body is `rgb(243, 238, 231)`, `#F3EEE7`, warm paper **[measured]**. Headings
are Source Serif Pro 700, the h1 at 45px/58.5px. Body copy is DM Sans at `rgb(51,51,51)`. The
primary button is a dusty terracotta rectangle with a 5px radius and 10px/18px padding
**[measured]**. Inside the sample issue everything switches to Source Serif Pro: the question is
20px/32px black, answers are 16px/27px, the answer block is `rgb(250, 245, 241)` `#FAF5F1` with
19px padding and a `border-radius` of **0px**, and the author's name is bold `rgb(19, 63, 99)`
navy, set inline with a colon before the answer text **[measured]**. Photos sit at full column
width with square corners and no crop.

Two things follow. Letterloop is already a warm-paper product, so warmth is not what beats it.
And its issue has no rounding, no avatars and no shadow: identity is a coloured first name.

### The home screen and the loop screen

On web you land on a Dashboard that lists your Letterloops, click one, and get a left sidebar
with Issues, Members, Album, Theme and Settings **[company]**. On mobile the same route reads
"From Home, open the Letterloop and select Settings" **[company]**. An August 2026 release note
adds "quick actions for all your Letterloops on the Home screen" and "an extended timeline view
of your Issue on each Letterloop screen" **[company]**. So Home is a list of containers and
everything real is one level down. I could not find a picture of either screen.

### An issue on a phone

From the App Store screenshot of the real reader **[measured]**: a banner photo runs full bleed at
the top; a circular cream badge holding a serif "L" straddles the banner's bottom edge, centred;
below it the loop name in bold serif, then "Issue No.1 • Saturday, May 13th" in bold, then a
hairline rule. The first section head is "✨ Questions", emoji plus bold serif, left aligned. Then
one tinted card per question. Inside the card: "**Alex asked:** What have you been enjoying this
past month?", a hairline, then every reply as running text, name in bold blue, colon, answer.
Under a reply sits a row of white reaction pills (❤️ 1, 😊 1, 😄 1) with "2 comments ›" in
terracotta at the right end of the same row. No avatar appears anywhere in the issue.

The scroll cost, measured on the public sample: four members, one question plus four sections
(Photo Wall, One Good Thing, Shout-Outs, On Your Mind), 762 words, four photos. That is **5,866px
of scroll in a 617px window, about 9.5 screens** **[measured]**. The issue closes with "✍️ The
next issue of Nakamura Musings will be delivered on: Monday, September 21st".

### Moving between sections on a phone

There is no mechanism. I checked the sample issue for sticky or fixed elements and for links
inside the body: **zero of each** **[measured]**. Sections 101 documents ordering and a
title-plus-emoji heading, and nothing about jumping **[company]**. The only structural control is
Filter and Sort, upper right on web and a filter icon on mobile: filter by member (only members
with replies appear), and Sort Responses as Default, A → Z or Z → A, which reorders replies
inside each question or section for you alone. It only appears when the issue uses the current
format and has at least one reply **[company]**. The Pratt critique asks for list view, grid view
and a widescreen mode for readability **[secondary]**. So the reader's only tools are the
scrollbar and filtering down to one person.

### Photos, the Album, music

Photo Wall shows submissions "edge to edge" with a required single-line caption. A Standard
section is text followed by one inline image or video **[company]**. Measured, that means one
photo per card at full column width, caption inside the same card beneath it, stacked. At 1440px
the issue stays the same narrow email column, so a single photo fills the screen. This is the
concrete meaning of "too fixed".

The Album is their best screen **[measured, real UI]**: a native header with a back chevron and
the loop name at left and "Album" centred; a three-column grid where each cell is a white card
holding a square-cropped photo, then the member's name in bold, then "Issue #70", then a muted
date; month dividers set as uppercase letterspaced type ("NOVEMBER 2025") over a hairline; videos
get a white circular play button. Help confirms newest first, grouped by date, tap for a
fullscreen viewer, arrow keys on web and swipe on mobile, and a "View in Issue" action back to the
original reply **[company]**.

Music only works inside a Music section: contributors search Spotify in the composer, may add more
than one track, and get an optional one-line caption **[company]**. A link pasted into an ordinary
answer is just a link.

### Reactions, comments, members, progress

Reactions are per reply, per section reply and per poll, never per issue. Web hover reveals 👍 ❤ 😂
plus a plus icon for the full picker. iOS taps an add-reaction icon. Android offers "Add reaction"
and "+". Each reaction renders as a pill with a count, press-and-hold or hover shows who reacted,
and your own has a blue outline on web **[company]**. Comments use a "Share a comment (type @ for
mentions)" field. On web a Thread drawer keeps the field, media, formatting and Share together,
and Android restores your place in the list after posting **[company]**.

The Members screen shows an avatar, a name, and role labels (Owner, Admin, Contributor, Reader),
with Sort on web and a filter-and-sort control on mobile, and a three-dot row menu holding Edit
Profile, Make Reader / Make Contributor, Make Admin / Make Member, Resend Invitation, Make Owner
and Remove Member. The cap is 50 and web shows "Member limit reached (50)". For a large roster the
advice is to set roles carefully and "use Issue progress to identify missing responses instead of
messaging the whole roster" **[company]**. Reply progress itself is three taps deep, at Issues →
Options → View reply progress, called Reply Completion on web and Reply Progress on mobile, and
shows each expected contributor with a replied check or an outstanding mark **[company]**.

### PDF, Mementos, themes

**PDF**: three-dot Options on a delivered issue → Download PDF. It renders asynchronously and "can
take a minute", arrives as `Letterloop Issue No.[number].pdf`, and is a snapshot in which
comments, reactions and video playback "do not behave as they do in the live Issue". A later reply
or edit does not update a file you already saved **[company]**.

**Mementos**: mobile app only. Share action on the issue, or on your own reply, then Share
Memento. Swipe through designs, use Shuffle when a design can rotate through questions, photos,
branding or music, wait for the preview to render, then Save, Messages, Stories or Copy
**[company]**.

**Themes**: Theme → Edit theme. Presets "such as Classic, Cozy, or Evening" (the 2026-07 file
recorded seven names, so either the set shrank or the article lists examples). Header Design is
Logo, Banner, Logo & Banner or None. Details holds colours, typography and dividers. There is a
live preview, autosave and a brief Undo that restores colours, fonts, divider and header but not
replaced images. Switching a preset on web overwrites your logo and banner **[company]**. Themes
change colour, type, divider and header. **No theme changes the layout.** Every theme is the same
single column of tinted cards.

### Where it is clumsy

Send Now is buried in the three-dot menu and icons have no tooltips, so people do not know
features exist **[secondary]**. The help centre documents its own broken control: if the member
ellipsis menu will not open on iPhone or iPad, "use Letterloop on the web for that member change"
**[company]**. The August 2026 release notes fix "a sign-in bug that could make your Letterloops
disappear", photo upload reliability, photo removal from the Photo Wall, and birthday dismissals
not syncing across devices **[company]**. And the empty-round rule is silent and harsh: "if nobody
replies, Letterloop deletes the Issue and pauses the Letterloop" **[company]**. Support is widely
called slow **[secondary]**.

### What this means for us

Keep the shape, refuse the container. The question-first card, everyone's replies stacked inside
one card per question, with reactions and a comment count on the same row as the reply, is why an
issue reads as one conversation instead of a stack of profiles: take that. Then beat Letterloop on
the two things it has no answer for. **Identity**: their attribution is a blue first name, and our
bird avatars give every reply a fixed 32px anchor, which is what makes a nine-screen scroll
skimmable rather than a wall. **Navigation**: they have nothing, and paragraph [17] asks for
exactly the missing thing, something you tap on a phone that takes over part of the screen and
moves you between sections. Build that as a section rail with the round's sections and each
member's answered state, and we are past the floor on the one axis their own critics name.

Do not copy the single fixed column. Letterloop's issue is an email, so one narrow column is all
it can ever be, and paragraph [50]'s "too fixed" is that constraint showing through: a photo wall
that can only stack, and a Spotify card that only appears because an admin added a Music section
in advance. We render in a browser, so the photo wall can be a real grid at desktop width and a
link can become a card wherever it is pasted. Their Album is worth transplanting almost verbatim,
three-up cards with name, round number and date under each photo, month dividers, tap to
fullscreen, "View in Issue" back to the reply, because it is the one screen where they beat their
own newsletter and it matches the Collection work we already did. Take the closing "the next round
arrives on" line too. It costs nothing and it is the only forward motion in their whole issue.

Two or three catch-ups per person is the reason their Home screen is wrong for us. A Dashboard
that lists containers earns its place when a user owns twelve loops. With two or three it is an
empty room you walk through, which is the complaint in paragraph [18] about not knowing what
"home" is. Land the reader on the current round and make the other one or two a rail, a pair of
covers, or a switcher in the header. And refuse four of their choices outright: deleting a round
nobody answered and silently pausing the catch-up; a theme system that only recolours; a PDF that
goes stale the moment someone edits; and reply progress hidden three taps inside an Options menu
when it is the one number an organiser opens the app to see.

**Sources**

- [measured] Letterloop marketing home page (colours, type, CTA) <https://www.letterloop.co/>
- [measured] See a Letterloop, the public sample issue (card colours, padding, radius, scroll length, absence of sticky nav or links) <https://www.letterloop.co/see-a-letterloop>
- [measured] Letterloop: Group Newsletters on the App Store (description, 702 ratings, Editors' Choice, release notes, six screenshots read directly) <https://apps.apple.com/us/app/letterloop-group-newsletters/id6468623700>
- [company] Help: Customize your theme <https://help.letterloop.co/en/articles/82-customize-your-theme>
- [company] Help: Find, filter, sort, and read past Issues <https://help.letterloop.co/en/articles/7-find-filter-sort-and-read-past-issues>
- [company] Help: React to an Issue <https://help.letterloop.co/en/articles/76-react-to-an-issue>
- [company] Help: Comment, mention, and reply <https://help.letterloop.co/en/articles/37-comment-mention-and-reply>
- [company] Help: Browse the Album <https://help.letterloop.co/en/articles/85-browse-the-album>
- [company] Help: Create and share a Memento <https://help.letterloop.co/en/articles/81-create-and-share-a-memento>
- [company] Help: Download an Issue as a PDF <https://help.letterloop.co/en/articles/35-download-an-issue-as-a-pdf>
- [company] Help: Manage members (includes the documented iOS ellipsis-menu failure) <https://help.letterloop.co/en/articles/1-manage-members>
- [company] Help: Use Letterloop with a large group (50-member cap, guidance at scale) <https://help.letterloop.co/en/articles/58-use-letterloop-with-a-large-group>
- [company] Help: Track Issue reply progress <https://help.letterloop.co/en/articles/8-track-issue-reply-progress>
- [company] Help: Control how responses are delivered and displayed (empty-issue deletion and auto-pause; web sidebar IA) <https://help.letterloop.co/en/articles/63-control-how-responses-are-delivered-and-displayed>
- [company] Help: Sections 101 <https://help.letterloop.co/en/articles/44-sections-101>
- [company] Help: Add custom, photo, and music Sections <https://help.letterloop.co/en/articles/45-add-custom-photo-and-music-sections>
- [secondary] Design Critique: Letterloop, Claire Jen, IXD@Pratt, 2025-02-18 <https://ixd.prattsi.org/2025/02/design-critique-letterloop/>
- [secondary] Letterloop reviews on Product Hunt <https://www.producthunt.com/products/letterloop/reviews>

---

## A short list of a few important things, on any screen width

Two or three items is an awkward number. A grid of squares leaves a stranded half row. A full
width rectangle stretches until the title sits at one end and a button at the other. Every product
below has met one of those and picked a side, and the same three moves keep coming back: fix the
size of the picture, fix the width of the list, and spend a wide screen on a second column instead
of on wider rows.

### WhatsApp

The phone chat list is one row per chat, full width, fixed height: avatar, name, one line of the
last message, a timestamp, and an unread count. There is no button on the row. The row is the
button. Everything else is a gesture: swipe left to archive, touch and hold for the full menu and
multi select **[secondary]**. Archived chats collapse into a single row, and since the 2021 "Keep
Chats Archived" setting, which ships on by default, an archived chat stays hidden and muted even
when a new message lands **[secondary]**.

On wide screens WhatsApp Web does not grow. The most popular user style for it only fires at
`@media screen and (min-width: 1441px)` and has to null out `max-width`, `margin` and `box-shadow`
on the app container to reach `100vw` **[secondary, read straight from the style's source]**. So
past roughly 1440px WhatsApp stops widening and floats a fixed frame with padding around it. The
cost is visible dead space and a small industry of extensions to remove it. The lesson is the row,
not the frame: no per row buttons, one line of status, and a list column that stops growing while
the conversation pane takes the rest.

### Telegram

Telegram's own announcement contains the single most useful sentence in this research: "Folders
become available in the interface when your chat list is long enough to start getting cluttered"
**[company]**. The organising chrome appears only when there is something to organise. Archiving
is a swipe left. An archived chat pops back out on a notification unless it is muted, and you hide
the archive row itself by swiping left on it, then pull the screen down to see it again
**[company]**. On desktop they did not widen the rows. They added a folder sidebar with icons,
because of "the extra space available on your computer screen" **[company]**. They also admit a
seam: on Android with folders on, swipe no longer archives, so archiving moves to a long press
bulk menu **[company]**. Two mental models for one action is exactly the confusion the owner is
complaining about.

### Apple Notes folders, and Journal

A folder row is a name, a count and a chevron. Actions live in gestures and one menu: swipe left
on a folder to delete, touch and hold to Rename or Move, drag one folder onto another to nest it;
on a note, swipe right to Pin, swipe left to Move **[company]**. The list's own menu holds View as
Gallery or View as List, Sort By, and Group By Date, and the choice is remembered per folder with
a global default in Settings **[company]**. Same content, two densities, no second screen. Journal
is the closest thing to a Catch-up: you "choose a journal, then tap +", entries scroll in one
column, and finding an old one is by category or by tapping a date on a calendar, not by a
navigation bar **[company]**. The cost of all this is discoverability: nothing on screen says a
swipe exists. The gain is a list with three items that looks intentional rather than thin, because
Apple never inflates the rows to fill the space.

### Apple Podcasts

Library then Shows is a grid where the square artwork is the whole card. Per show settings are
behind touch and hold: episode order, automatic download, Hide Played Episodes **[company]**.
Swipe right on an episode marks it played **[company]**. Apple says plainly that when several
shows appear together it falls back to show art rather than episode art **[company]**, so a row of
tiles never mixes two kinds of picture. The failure mode is honest: three followed shows make one
short row that looks sparse, and Apple's answer is not bigger tiles, it is more shelves under it
(Latest Episodes, Saved, Downloaded, Stations). A grid of squares only works when something sits
below it.

### Letterboxd lists

Read straight off the markup of a public lists page: each card is five overlapping posters at 70
by 105 pixels (`poster-list-overlapped`, `--poster-count: 5`), then the title, "20 films", a heart
with a like count, and one line of description **[measured]**. The posters and the title link to
the same URL. There is no View button. The Edit icon sits in an element classed `show-for-owner`,
so people who cannot edit never see it **[measured]**. Two things matter for us. First, the
picture is derived from the contents, so nobody has to upload a cover. Second, the poster width is
hard coded at 70px, so widening the window widens the text and never the picture, which is exactly
the stretch the owner is describing. The weakness: two lists that begin with the same films look
identical, and an empty list has no picture at all.

### Are.na channels

Loaded at a 500px viewport, an Are.na profile renders a channel as a full width square, 466 by 466
inside 17px margins, and offers a row of view switches labelled Channels, Blocks, Table, Index and
All **[measured]**. Every channel level action lives behind one "More" dropdown: Edit channel,
Download channel, Transfer ownership, Delete channel, with a keyboard shortcut for the same window
**[company]**. Adding people is its own button in the channel header, not in that menu
**[company]**. Status is not a badge but a state with three values, Private, Closed or Open
**[company]**. The cost of one dropdown is that nothing is one tap. The gain is that the card face
stays clean, which is the opposite of three dots parked in a corner.

### Spotify

The library is one list with a single icon that toggles grid or list, filter chips across the top,
a sort menu, pinning by swipe right or press and hold on mobile and right click on desktop, and
drag to set a custom order on desktop only **[company]**. "The app saves your sort and filter
options for your next sessions" **[company]**. The stated problem was volume: hundreds of saved
items, and a goal to "spend less time looking for content" **[company]**. That is not our problem,
and the owner's instinct to copy the square grid should be weighed against it. The more
transferable idea from the same work is pinning up to four items for instant access **[company]**:
when only a few things matter, the answer was a small fixed set at the top, not a grid.

### Notion galleries

A gallery card's picture is a setting, not a requirement. Card preview can be the page cover, the
page content (the first block, which may be an image or video), or a Files property, and "Fit
image" shows the whole image while turning it off crops to fill the frame **[company]**. Card size
has three steps, properties can be shown, hidden and reordered, and the card's Name can be
switched off entirely for image only cards **[company]**. This is the honest answer to "maybe the
catch-up could have a picture for it": decide where the picture comes from and what happens when
there is not one. Notion's own failure is the wide screen one, since it simply adds columns, so
three cards leave a ragged partial row.

### Slack

The sidebar is a fixed width column of text rows. Unread is weight and a badge. There is no button
on a row. Custom sections are made from the three dots on the Channels header, take a name and an
emoji, and are visible only to you **[company]**, and they are a paid feature **[company]**. The
emoji does all the identifying work that an avatar row fails to do. Slack's wide screen answer is
the same as WhatsApp's and Telegram's: the list column is capped, and every extra pixel goes to
the content beside it.

### What this means for us

Take the Letterboxd card, the Apple gesture model and the Telegram rule about when chrome appears.

Concretely. Make the Catch-up row a text forward row in a column with a maximum width, not a
square in a grid: a square wants a strong photograph, and a Catch-up has no single picture, while
a row carries a name, a state and a date well at any size. Give it a derived picture at a fixed
pixel size, Letterboxd style: the birds of the people who wrote in the last round, five of them,
overlapped, never scaling with the window. That answers paragraph 23 without dropping the birds,
because five recent writers are identifiable in a way that six alphabetical members out of twenty
three are not. Delete the View button and the three dots from the card face: the whole row opens
the Catch-up, as in WhatsApp, Notes and Letterboxd, and every other action lives in one menu, on
long press on mobile and a hover or right click menu on desktop, with owner only actions hidden
from people who cannot use them. Put one line of state where the unread badge would go, in words:
"Round 2 closes on Friday", "waiting on 9 people". At 1920px the column stops and the space goes
to a second column of content, which is what all three messengers do. Nothing stretches. Archived
Catch-ups leave the list entirely, and the row that leads to them is only rendered when at least
one exists, which is Telegram's rule generalised: with two Catch-ups there are no filters, no
tabs, no archive row and no empty shelf, and the screen is allowed to be short.

**Sources**

- [company] Telegram: Chat Folders, Archive, Channel Stats and More <https://telegram.org/blog/folders>
- [company] Spotify Newsroom: Listeners Can Explore Their Spotify Collections Faster and Easier With a New Your Library <https://newsroom.spotify.com/2021-04-29/listeners-can-explore-their-spotify-collections-faster-and-easier-with-a-new-your-library-2/>
- [company] Spotify Support: Sort and filter <https://support.spotify.com/us/article/sort-and-filter/>
- [company] Spotify Support: Your Library <https://support.spotify.com/us/article/your-library/>
- [company] Apple: Organize your notes in folders on iPhone (iPhone User Guide, iOS 26) <https://support.apple.com/en-gb/guide/iphone/ipha61270292/ios>
- [company] Apple: Get started with Journal on iPhone (iPhone User Guide, iOS 26) <https://support.apple.com/en-gb/guide/iphone/iph0e5ca7dd3/ios>
- [company] Apple: Organize your podcast library on iPhone (iPhone User Guide) <https://support.apple.com/en-gb/guide/iphone/iph4003ecb12/ios>
- [company] Apple Podcasts for Creators: iOS 17, what's new for Apple Podcasts (episode art falls back to show art when shows are shown together) <https://podcasters.apple.com/5303-ios-17-whats-new-apple-podcasts>
- [company] Notion Help: Gallery view databases in Notion <https://www.notion.com/help/galleries>
- [company] Are.na Help: Channels <https://help.are.na/docs/getting-started/channels.md>
- [company] Are.na Help: Settings and export (the More dropdown, download, transfer, delete) <https://help.are.na/docs/getting-started/channels/settings-and-export.md>
- [company] Slack Help Centre: Organise your sidebar with customised sections <https://slack.com/help/articles/360043207674-Getting-organized-with-the-sidebar>
- [measured] Letterboxd public lists page, card markup read directly (five overlapping 70x105 posters, show-for-owner Edit) <https://letterboxd.com/dave/lists/>
- [measured] Are.na profile channels view, geometry read in Chrome at a 500px viewport (466x466 channel card; Channels/Blocks/Table/Index/All switches) <https://www.are.na/are-na-team/channels>
- [secondary] WhatsApp Web Fullscreen Layout user style (CSS source shows the min-width 1441px override of max-width, margin and box-shadow) <https://userstyles.world/style/21774/whatsapp-web-fullscreen-layout>
- [secondary] whatsapp-web-fullscreen (Chrome extension that removes the margin around WhatsApp Web's chat screen) <https://github.com/shreyash-b/whatsapp-web-fullscreen>
- [secondary] TechRadar: Archived chats in WhatsApp now finally stay archived <https://www.techradar.com/news/archived-chats-in-whatsapp-now-finally-stay-archived>
- [secondary] Guiding Tech: What happens when you archive chats on WhatsApp <https://www.guidingtech.com/whatsapp-chat-archive/>
- [secondary] Engadget: Spotify makes it easier to navigate your library on the go <https://www.engadget.com/spotify-your-library-redesign-dynamic-filters-130056666.html>

---

## A long, multi-author document read on a phone, with navigation

Every product below answers four separate questions, and it helps to keep them separate: **where
am I**, **how do I get somewhere else**, **what happens to the chrome as I scroll**, and **what do
I do when one section is enormous**. Almost nobody solves all four with one control.

### Wikipedia

Desktop is the closest published match to our problem. Wikimedia moved the table of contents out
of the article body and into a sticky sidebar so readers could "navigate to different parts of the
page without having to scroll to the top of the page every time". The section you are in is shown
**in bold**, and "for screen widths smaller than 1000px, the ToC will collapse and the section
titles will be used as a ToC" **[company]**. Their qualitative testing in Argentina, Ghana and
Indonesia found "testers preferred persistent access", that "the best prototype was the persistent
one", and that "additions like bolding the title or the section helped with their orientation". Of
236 people shown prototypes, 110 were explicitly positive and 38 neutral **[company]**.

Mobile is the opposite decision, and I measured it. On `en.wikipedia.org/wiki/India?useformat=mobile`
every `h2` carries `mf-collapsible-heading`, there are 94 collapsible elements on the page, the
inline `#toc` is a 46px strip at the very top, and the page header computes to `position: static`,
so it scrolls away and never comes back **[measured]**. That is Wikipedia's phone answer: make the
document short by collapsing it, and offer no navigation at all once you are past the top. It is
exactly the failure the owner describes.

Wikimedia measured the cost of collapsing. In a December 2015 to January 2016 A/B test, readers
given expanded sections spent about 190 seconds reading per page at the 90th percentile against
146 seconds for the collapsed control, spent less time navigating (4 seconds against 6), and "tend
to scroll more sections into view than readers in the control group open" **[company]**. Collapsing
buys a short page and costs you reading.

### Discourse

This is the nearest thing to our shape in the wild: one long thread, many authors, hundreds of
entries. On desktop I measured a sticky right-gutter timeline 254px wide by 431px tall, with a
300px track and a 50px draggable handle whose cursor is `ns-resize`. It reads "1 / 31" at the top
of the topic and "11 / 31" halfway down, with the date at the handle and the dates of the first and
last post pinned to the ends of the track. The page header swaps in the topic title once you scroll
past it, so the sticky chrome answers "where am I" on its own **[measured]**.

On phones the same control shrinks to a small box at the bottom of the screen; tapping it opens the
full timeline **[secondary]**. When a user asked for it to be removed, staff answered that "it is
very useful for navigating larger topics, especially on smaller devices" and closed the request:
"this one is here to stay" **[secondary, Discourse Meta]**. The known complaint is honest and worth
copying down: with several posts on screen the counter is guessing which one you mean, so a reader
sees "post 1" while looking mostly at post 2.

The forty-entry question is answered structurally. Discourse never paginates and never renders the
whole topic. It keeps a moving window of posts mounted through a virtual DOM post stream, because
an ever-growing list of DOM elements is what kills long, image-heavy topics **[secondary]**.

### Apple Books

Two patterns, both quotable from Apple's own guide. First, jump-and-return: "Go back to previous
reading location: Tap the page, then tap the rounded arrow in the top-left corner of the page. Tap
the rounded arrow again, but in the top-right corner, to go back to your current location"
**[company]**. Two arrows, opposite corners, undo and redo for reading position. Second, the
scrubber: "To quickly move through a book, touch and hold Contents, then drag your finger left or
right; release your finger to go directly to that location in the book" **[company]**. All chrome
is hidden until you tap the page, so the reading area is edge to edge by default.

The cost is discoverability. Apple files the scrubber under "Tip", which is a fair admission that
nobody finds a touch-and-hold on their own.

### Kindle

Page Flip is "a reimagined Kindle navigation experience that makes it easy to explore books while
always saving your place". It lets you "view multiple pages at once to better locate a chart or
image" and "automatically saves a reader's place as they browse through the book" **[company]**.
Reports describe the saved page pinned to the side of the screen, and tapping it returns you
**[secondary]**. Separately, progress is expressed as time rather than position: time left in
chapter and time left in book, derived from the book's table of contents and the reader's own
measured pace **[secondary]**. It fails on two counts: Page Flip needs Enhanced Typesetting so it
is missing on many titles, and the time estimate needs a warm-up period before it is accurate.

### Apple News+ magazines

The most radical answer: an issue is not one scroll. "Page through an issue: Swipe left to go to
the next story, or swipe right to go to the previous story." "View the table of contents: When
you're reading a story, tap [the menu], then tap Go to Issue" **[company]**. Horizontal swipe moves
between sections, vertical scroll stays inside one, and the index is always one tap away from
wherever you are. Reports add that the cover thumbnail in the lower-left corner also opens the
contents **[secondary]**. The failure mode is that issues still shipped as plain PDFs lose all of
it **[secondary]**.

### iOS sheets, the primary source for "takes over part of the screen"

Apple's guidance names what the owner floated. Detents "specify particular heights at which a sheet
naturally rests. The system defines two detents: large is the height of a fully expanded sheet and
medium is about half of the fully expanded height." "In an iPhone app, consider supporting the
medium detent to allow progressive disclosure of the sheet's content." "Include a grabber in a
resizable sheet. A grabber shows people that they can drag the sheet to resize it; they can also
tap it to cycle through the detents." The important part: a sheet on iOS can be **nonmodal**,
where "people use its functionality to affect the parent view without dismissing the sheet", the
example being the Notes formatting sheet **[company]**. A nonmodal medium-detent sheet is a
navigator you can leave open while the page moves under it.

### iOS Photos

Touch and hold the timeline bar at the bottom of an album, drag, release to land. In Years view,
dragging horizontally across a tile changes its thumbnail and shows the month under the year, and
tapping the title enters at the month you scrubbed to **[secondary]**. The idea worth stealing is
the live preview under the finger: you see where you would land before you commit. The cost is the
same as Apple Books, a gesture with nothing on screen to say it is there.

### Notion

The desktop table of contents is a column of dashes at the right edge that expands into labels on
hover **[company, Notion's own announcement]**. It is a good minimap and it has no phone
equivalent: on mobile you get the inline `/toc` block, wherever the author happened to place it
**[secondary]**. A useful negative. Hover is not a phone gesture, and a minimap that only works
with a cursor is not an answer.

### The Pudding, on not fighting the scroller

Directly relevant to "disable the native scroller". Their responsive scrollytelling guidance says
do not size steps in `vh`, because "mobile browsers toggle the top and bottom navbars' position and
sizes whether you are scrolling up or down". Compute pixel heights from `window.innerHeight` on
load and on resize instead. And on swipe or tap steppers: they "override default scrolling behavior
and browser functionality, which I do not recommend" **[company]**.

### Sticky headers, generally

Nielsen Norman's guidance is the practical rule set: prefer a partially persistent header that
reappears when the user scrolls up by a few pixels, animate it over 300 to 400ms, and judge it on a
content-to-chrome ratio. They call The New Yorker's 13:1 on an iPhone 11 Pro reasonable and 2:1 not
**[secondary]**. Apple's own list guidance warns that an edge index and trailing-edge row controls
fight each other for the same swipe **[company]**, which matters if we put a question index down
the right edge next to hearts.

### Spotify lyrics, Substack, X

Spotify's lyrics view collapses position and jump into one screen: lines scroll in sync, the
current line is highlighted, and tapping a line seeks the song to it **[secondary]**. No index,
because the highlight is the index. Substack's app gives you a reading queue and swipe from post to
post, and nothing at all inside a post **[secondary]**. X loads thread replies in batches, ranks
rather than orders them, and buries some behind "show more replies" **[secondary]**. A reader has
no idea how far through anything they are. Both are the state we are already in.

### Revolut

The owner named it, so I looked hard, and I should say plainly that I could not find a published
Revolut design account of long-document navigation. They have nothing document-shaped in the app.
What is reported is that bottom sheets are their main secondary screen and that the tab bar is only
present on the three top-level screens, disappearing below that **[secondary]**. Treat "what if
Revolut did this" as a demand for a confident, full-width, physical control rather than a specific
pattern to copy.

### What this means for us

Three of these compose into one answer, and the composition matters more than any single pick.
**Take Apple News+'s structure**: a Round is not one scroll, it is a small set of questions, and
moving between questions should be a real act rather than a long thumb drag. **Take Discourse's
persistent indicator**: something small, always on screen, that says which question you are in and
how many are left, because that is the single thing the owner cannot get today once he has
scrolled. **Take the iOS nonmodal sheet as the thing it opens into**: a medium detent with a
grabber, listing the questions with the current one marked, tall enough to show all of them without
scrolling since a Round has maybe eight, not eighty. That is literally his "tap and then it takes
over a part of the screen", and it is Apple's documented component, which settles the tie in its
favour. Add Apple Books' return arrow, because jumping is only safe if coming back is free, and
this is a group where you read a friend's answer, jump to see a photo, and want your place back.

Two details from the research are warnings rather than picks. Do not disable the native scroller:
The Pudding's own writing says overriding it breaks browser behaviour, and mobile viewport height
moves under you as the toolbars hide, so anything measured in `vh` will drift. And do not collapse
the questions by default to make the page short: Wikimedia measured that exact trade and lost 44
seconds of reading per page at the 90th percentile for it. For a question with forty answers,
follow Discourse rather than X: keep the answers in order, render a window of them, and let the
indicator tell the reader they are 9 of 31 into that question, so the length is legible instead of
bottomless.

Everything here is cheap in our design system. The indicator can be a warm paper pill with the bird
avatar of whoever wrote the answer under the reader's thumb. The sheet can be the question list in
Libre Baskerville with the current one marked the way Wikipedia marks it, in bold, which their own
testers said helped them stay oriented.

**Sources**

- [company] Reading/Web/Desktop Improvements/Features/Table of contents (MediaWiki) <https://www.mediawiki.org/wiki/Reading/Web/Desktop_Improvements/Features/Table_of_contents>
- [company] Research: Collapsed vs uncollapsed section view on mobile web (Wikimedia Meta) <https://meta.wikimedia.org/wiki/Research:Collapsed_vs_uncollapsed_section_view_on_mobile_web>
- [measured] Wikipedia mobile rendering of the India article, inspected in Chrome (mf-collapsible-heading, 94 collapsible elements, static header, 46px inline TOC) <https://en.wikipedia.org/wiki/India?useformat=mobile>
- [measured] Discourse topic timeline measured live on Discourse Meta (sticky 254x431 gutter, 300px track, 50px ns-resize handle, "11 / 31", sticky title swap) <https://meta.discourse.org/t/time-to-reconsider-infinite-scroll/401984>
- [secondary] Remove topic timeline navigation on mobile (Discourse Meta, staff replies) <https://meta.discourse.org/t/remove-topic-timeline-navigation-on-mobile/257466>
- [secondary] Infinite scroll: is Discourse recycling DOM elements? (Discourse Meta) <https://meta.discourse.org/t/infinite-scroll-is-discourse-recycling-dom-elements/211069>
- [company] A tour of how the Widget (Virtual DOM) code in Discourse works <https://meta.discourse.org/t/a-tour-of-how-the-widget-virtual-dom-code-in-discourse-works/40347>
- [company] Read books in the Books app on iPhone (Apple iPhone User Guide, read in full) <https://support.apple.com/en-gb/guide/iphone/iphc1af7c57/ios>
- [company] Browse and read Apple News+ stories and issues on iPhone (Apple iPhone User Guide, read in full) <https://support.apple.com/en-gb/guide/iphone/iph4ff7c1fde/ios>
- [company] Sheets (Apple Human Interface Guidelines, read in full) <https://developer.apple.com/design/human-interface-guidelines/sheets>
- [company] Lists and tables (Apple Human Interface Guidelines, on edge indexes) <https://developer.apple.com/design/human-interface-guidelines/lists-and-tables>
- [company] Enhanced Typesetting and Page Flip (Amazon KDP help) <https://kdp.amazon.com/en_US/help/topic/GNY87A6WM6EK6YEE>
- [secondary] Amazon rolls out Page Flip for Kindle (TechCrunch) <https://techcrunch.com/2016/06/28/amazon-introduces-page-flip-for-kindle/>
- [secondary] Kindle's down-to-earth estimates of reading speed (Goodreads author blog) <https://www.goodreads.com/author_blog_posts/19325480-kindle-s-down-to-earth-estimates-of-reading-speed>
- [company] Responsive scrollytelling best practices (The Pudding) <https://pudding.cool/process/responsive-scrollytelling/>
- [secondary] Sticky Headers: 5 Ways to Make Them Better (Nielsen Norman Group) <https://www.nngroup.com/articles/sticky-headers/>
- [company] Notion announcement of the floating table of contents (expands on hover, right of the doc) <https://x.com/NotionHQ/status/1796287840713892328>
- [secondary] The new floating Notion table of contents / page navigation (Simple.ink) <https://www.simple.ink/guides/the-new-floating-notion-table-of-content-or-page-navigation>
- [company] View lyrics (Spotify support) <https://support.spotify.com/us/article/lyrics/>
- [company] Getting started on the Substack app (Substack support) <https://support.substack.com/hc/en-us/articles/19291693034004-Getting-started-on-the-Substack-app>
- [secondary] Why Twitter doesn't show all replies (Circleboom) <https://circleboom.com/blog/why-twitter-doesnt-show-all-replies-and-how-to-see-them/>
- [secondary] How to navigate the Photos app on iPhone and iPad (iMore) <https://www.imore.com/how-to-navigate-photos-iphone-ipad>
- [secondary] Our top 5 design principles at Revolut (Revolut blog; blocked to automated fetch, cited from search summary only) <https://blog.revolut.com/our-top-5-design-principles-at-revolut/>
- [secondary] Navigation patterns in mobile applications (UX Collective, describes Revolut hiding its tab bar below top level) <https://uxdesign.cc/navigation-patterns-in-mobile-applications-how-to-make-the-right-choice-fa3c228e5097>

---

## Layout engines that adapt to the content they receive

Every engine below answers the same question: given content of unknown shape and a page of known
shape, which arrangement do you use? Almost all of them answer it the same way, and it is not the
way the owner's phrase "a lot of if statements" first suggests. They generate many candidate
layouts, score each one with a weighted function, and take the winner. The if statements live
inside the score, not inside a branching tree of special cases.

### Flipboard: Pages, then Duplo

Flipboard's first engine, Pages (2010), shipped about 20 hand-drawn page layouts split into
portrait (768x1004) and wide (1024x748) **[company]**. Duplo, its 2014 replacement, keeps a
designer in the loop but only for parts: the designer supplies blocks and grid rules, and a
generator "assembles smaller pieces into larger layouts", building a tree of options "much like a
tree of valid chess moves". Duplo evaluates between 2,000 and 6,000 candidates per page, against
Pages' 20, pruning with branch and bound **[company]**.

The taste lives in the score. Duplo "computes the best pairings of content with slots, by
optimizing a fitness function built on dozens of individually-weighted heuristics". Four are named
and all four are worth stealing. **Text fill**: higher weight to text that fills 80% or more of its
frame. That is the direct answer to Cyan's three-centimetre tile at 15% used (¶31). **Image fit**:
higher weight to "images that best fit the frame with minimal crop and upsampled scaling that
doesn't exceed 120%". A hard upsample ceiling, expressed as a score rather than a rejection.
**Page flow**: Perlin noise across pages "to give an organic sense of variety to the types and
number of items on a page". Monotony is designed out by a noise function, not a random shuffle.
**Coherence on resize**: items already on a page get a bonus for staying together when the window
changes.

After a winner is chosen, Duplo refines: frames snap to a baseline grid, image frames resize to fit
the actual image, full-bleed frames extend to the page edge. Headlines step down a type scale, and
it targets a 1.61 width-to-height ratio **[company]**. Cost: nothing is published about solve time,
and the whole thing depends on a designer having authored the block vocabulary first.

### Apple News Format

The cleanest published version of "one document, many screens". An article declares a `Layout` with
`columns`, `width`, `gutter` (default 20 points) and `margin` (default 60). Each component gets a
`ComponentLayout` with a column start and span. Apple's own guidance: 7 columns is enough to
auto-resize for iPad, iPhone, Mac and Vision Pro; 20 columns "provides more detail for the layout
system and a better reading experience"; below 5 columns "there may not be sufficient information
for the layout system to automatically maintain your intended design when scaling down to smaller
devices". Their recommended default is 20 columns, 60 margin, 20 gutter, at 1024 points wide
**[company]**.

The adaptive part is `Condition`. Any component, layout or text style carries a conditional block
firing on `minViewportWidth`, `maxViewportWidth`, `minViewportAspectRatio`, `horizontalSizeClass`,
`preferredColorScheme`, `maxContentSizeCategory`, `platform` and more, including `hidden: true`.
Apple's own example hides a photo below 320 points **[company]**. This is a whole language for "a
lot of if statements" that needs no solver: declare one layout, then declare the exceptions.

### InDesign liquid layout and alternate layouts

The five liquid page rules are an honest inventory of what can happen to a frame when the page
changes: Scale, Re-center, Guide-based, Object-based, Controlled by Master. One rule per page.
Scale is the only rule that changes type size, so text distorts, and you get letterboxing whenever
old and new page ratios differ. Re-center only helps when the page grows; shrink it and content
crops. Guide-based lets a guide touching a frame decide which axis it may stretch on, and a text
frame set to Flexible Width gains columns as it widens. Object-based pins each frame to chosen page
edges **[secondary]**.

The lesson is negative as much as positive. Scale is the rule that ruins things, and Scale is
exactly what a naive HTML-to-PDF export does. Everything worth having is per-object intent: this
photo may stretch wider, this caption may not, this text frame may gain a column.

### Flickr justified layout, and Google Photos

This is the mixed-orientation answer, and it is open source. Flickr released the geometry engine in
2016. You pass an array of aspect ratios and get boxes back, with no rendering. Documented
defaults: `containerWidth` 1060, `containerPadding` 10, `boxSpacing` 10, `targetRowHeight` 320,
`targetRowHeightTolerance` 0.25, `showWidows` true, `fullWidthBreakoutRowCadence` false
**[company]**.

The rule: pick a target row height, scale each photo to it, add widths until the row overflows,
then scale the whole row down to fit the container. Every photo keeps its aspect ratio and nothing
is cropped; row height varies within tolerance. Flickr's version also checks whether it is better
to scale up with one fewer photo or down with the extra one **[secondary]**. `showWidows` names the
failure out loud: the last row will not be full, and you choose to show it short or drop it.
`fullWidthBreakoutRowCadence` is the anti-monotony lever, forcing a full-width photo every n rows.
Google Photos uses the same technique to keep aspect ratios in a full-width, scrubbable grid
**[secondary; their design post would not load for me]**.

### Pinterest's Masonry

Gestalt's Masonry is simple on purpose and says so: "pick the left-most column of shortest height
and put the item there", tracking an array of current column heights. Items render offscreen to be
measured, then get placed **[company]**. Its documented failures are the ones a Round will hit.
Item heights cannot change after first render, so a late image or an expanded caption "leads to
overlaps or gaps in the grid", and its uniform-row and default modes produce "additional
whitespace" when heights vary. Masonry also destroys reading order, which matters when a Round has
a sequence.

### Photo book engines, and print resolution

Blurb gives the concrete resolution rule. BookWright flags any image below 250 DPI **at its placed
size**; 250 to 300 is their ideal. Their recommended fix is to shrink the container until effective
DPI crosses 250, and they explicitly advise against upsampling **[company]**. That is the exact
mechanism ¶21 asks for. Do not decide a photo is the big one and then hope. Let its pixel count set
the largest frame it is allowed to occupy.

Photobook.ai's Layout SDK claims optimization across both pages of a spread so facing pages stay
coherent, handling of 4:3, 16:9, 1:1 and 2:1 sources, panoramas across a spread, collapsing of
burst shots ("20 shots that looks the same"), and salience logic so "faces are never cut off"
**[company, marketing, unverified]**.

### Newspaper auto-pagination, and pull quotes

PageSuite's auto-layout claims to "match each story to the most suitable template based on content
type, length, priority, imagery, and section rules", handle article jumps and overflow, do "fill
optimization" and "whitespace balance", render to PDF, and score the result against professional
criteria it does not publish **[company, marketing]**. Academic work on the same problem uses
simulated annealing to place ads first and flow text into what is left **[secondary]**.

Pull quote choice has no algorithm in print practice, only rules of thumb worth encoding: roughly
one per 400 to 600 words, or a break every 350 to 500 words; place it 2 to 4 paragraphs away from
where the line actually sits so nobody reads it twice; keep it short and edit it down
**[secondary]**.

### Squarespace and Medium: the small-rule version

Squarespace offers six gallery layouts and one adaptive switch: set aspect ratio to Auto and
"images rearrange to create the best fit on the page". In Grid: Masonry "the order is automatically
determined by the aspect ratio of your images", and masonry is what they recommend for mixed tall
and wide photos, because grid and slideshow impose a uniform crop **[company]**. Medium caps an
image grid at three per row **[secondary]**. Both prove that four named layouts plus one
shape-driven chooser gets most of the way with no solver at all.

### Letterloop

Thinner than expected. Letterloop publishes almost nothing about issue design beyond "the replies
are presented in a fun and beautiful newsletter delivered to everyone's inbox", plus themes as a
one-tap style swap **[company]**. The Pratt critique's hardest finding is a content limit, not a
layout one: "Letterloop only allows users to upload one photo per question, which can disrupt the
storytelling experience" **[secondary]**. Letterloop avoids the hard layout problem by refusing the
input that causes it. We are choosing to accept that input, so we own the problem they ducked.

### What this means for us

Take Duplo's **shape** and refuse its scale. Candidate generation plus a weighted score is the
right architecture, because it turns "a hundred things that could go wrong" into a hundred scoring
terms rather than a hundred nested branches, and because adding a rule later costs one term instead
of a rewrite. But a Round is maybe 8 questions and 15 answers each, not an infinite feed: enumerate
a few hundred candidates per page, not six thousand.

Steal four scoring terms close to verbatim. Text fill at 80% or better, which is the rule that
stops Cyan's one-line answer from being handed a full frame. An upsample ceiling of 120%, so a
small photo simply cannot win a large slot. Blurb's 250 DPI at placed size, run backwards, so each
photo's pixel count sets the biggest frame it may occupy. And Perlin-style variety across pages, so
page 4 does not look like page 3.

Split the two renderings. The web Round should be Apple News Format's declarative model: a fixed
column grid (their 20 columns, 60 margin, 20 gutter is a good starting point) plus conditional
overrides on viewport width. Mobile first falls out of that, and it needs no solver, so it stays
fast. The magazine PDF, portrait, is where the candidate-and-score engine runs, once, at publish
time.

For the photo wall and for any answer carrying several photos, use Flickr's justified layout, not
masonry. It preserves every aspect ratio without cropping, packs tall and wide photos in the same
row, and its `showWidows` and breakout-row cadence are already the two controls we need. Masonry's
documented failure, heights changing after render and producing overlaps and gaps, is exactly what
a captioned answer with a More button does.

Pull quotes need no model. Pick by measurable signal: the shortest complete sentence inside a
length band, drawn from a well-liked answer, one per page at most, never from an answer under some
minimum length, and never on the same page as its own body text. Openers can work the same way: the
question itself is the headline, and the highest-scoring photo in that question is the opener image
if it clears the DPI gate.

Two things fit this group specifically. The bird avatars are the recurring mark a magazine wants
and the feed never uses well: sized by slot, they give each page a visual rhythm and answer the
owner's complaint in ¶23 and ¶27 that a row of birds carries no information. And warm paper plus
two or three Catch-ups per person means the volume is low enough to afford an expensive solve and a
real proof step: render, score, and if the score is below a floor, fall back to a plain, safe
template rather than shipping a bad page.

Finally, write the failure list from the sources, because these are the named ones: the short last
row, the upsampled photo, the one-line answer given a full frame, the same template two pages
running, a crop that eats a face, a caption that grows after layout is fixed, and a question nobody
answered.

**Sources**

- [company] Layout in Flipboard for Web and Windows (Duplo and Pages) <https://about.flipboard.com/engineering/layout-in-flipboard-for-web-and-windows/>
- [company] Apple News Format: Layout object <https://developer.apple.com/documentation/applenewsformat/layout>
- [company] Apple News Format: Condition object <https://developer.apple.com/documentation/applenewsformat/condition>
- [company] Apple News Format: ConditionalComponentLayout <https://developer.apple.com/documentation/applenewsformat/conditionalcomponentlayout>
- [company] Liquid and alternate layouts in InDesign (Adobe help) <https://helpx.adobe.com/indesign/using/alternate-layouts-liquid-layouts.html>
- [secondary] InDesign How-to: Using Liquid Layout (CreativePro) <https://creativepro.com/indesign-how-using-liquid-layout/>
- [company] Justified Layout by Flickr, configuration and defaults <https://flickr.github.io/justified-layout/>
- [company] Our Justified Layout Goes Open Source (code.flickr.com) <https://code.flickr.net/2016/04/05/our-justified-layout-goes-open-source/>
- [company] flickr/justified-layout on GitHub <https://github.com/flickr/justified-layout>
- [secondary] Building the Google Photos Web UI (Google Design) <https://medium.com/google-design/google-photos-45b714dfbed1>
- [company] Pinterest Gestalt: Masonry README <https://github.com/pinterest/gestalt/blob/master/packages/gestalt/src/Masonry/README.md>
- [company] Why do my pictures have a low resolution warning in BookWright? (Blurb) <https://support.blurb.com/hc/en-us/articles/207792436-Why-do-my-pictures-have-a-low-resolution-warning-in-BookWright>
- [company] Image resolution guidelines (Blurb help centre) <https://support.blurb.com/hc/en-us/articles/207795026-Image-resolution-guidelines>
- [company] Photobook.ai Layout SDK <https://photobook.ai/technology/layout/>
- [company] PageSuite Automated Page Layout <https://www.pagesuite.com/auto-layout/>
- [secondary] Optimizing web newspaper layout using simulated annealing <https://link.springer.com/content/pdf/10.1007/BFb0100543.pdf>
- [secondary] Employing Aesthetic Principles for Automatic Photo Book Layout (Sandhaus, Rabbath, Boll, MMM 2011) <https://link.springer.com/chapter/10.1007/978-3-642-17832-0_9>
- [secondary] Pull Quotes: 5 Rules for Selecting Quotes That Draw Readers In <https://rivereditor.com/blogs/generate-pull-quote-journalism>
- [secondary] Basics of Magazine Layout Design: pull quotes <https://people.wou.edu/~visuanod/magazine_layout/pullquote.html>
- [company] Gallery sections (Squarespace Help Center) <https://support.squarespace.com/hc/en-us/articles/360035636332-Gallery-sections>
- [secondary] Medium Image Guideline <https://jeffreywang1183.medium.com/medium-image-guideline-b0e2c4947d90>
- [company] Letterloop: The Newsletter for Friends, Families and Teams <https://www.letterloop.co/>
- [secondary] Design Critique: Letterloop (IXD@Pratt) <https://ixd.prattsi.org/2025/02/design-critique-letterloop/>
- [company] Designing for mobile and tablet devices (Readymag Help) <https://help.readymag.com/hc/en-us/articles/15149524826651-Designing-for-mobile-and-tablet-devices>

---

## Who is in this, and who wrote in

Two different questions get answered by one control in most products, and badly. "Who is in this
group" is a roster: stable, boring, needed rarely. "Who wrote in" is a state: it changes daily, and
it is the reason you opened the page. Almost every product that does this well separates them. The
ones that fail, ours included, stack five faces and a number and call it both.

### The avatar group, as design systems actually specify it

Microsoft's Fluent 2 documents three layouts: spread (default), stack ("a more condensed
configuration in which the avatars overlap each other") and pie ("used in cases where space is
extremely limited"). Overflow kicks in "when there are more than five people or groups to
represent", and the fifth slot becomes a count. And Fluent says the overflow avatar "can generally
display a popup menu with a detailed list of people", so the component's own spec treats the stack
as a lead-in to a list, not a substitute for one. It also warns the pie "can't display activity or
presence" **[company]**. Atlassian describes its equivalent only as avatars "grouped together in a
stack or grid" **[company]**. Ant Design's `maxCount` reserves one of the shown slots for the
overflow indicator, so five visible means four people **[secondary]**. Matt Webb's survey of
facepiles found Notion caps visible avatars at five while recording up to thirty, with the "+4"
revealing names on hover, and argues an avatar "is not merely an illustration, it is a stand-in for
the actual thing" **[secondary]**. The takeaway is consistent with the owner's complaint: past
five, a facepile is a number. Every system that ships one attaches names to it on hover or tap.

### WhatsApp group info

Tap the group name to open Group info, scroll to Participants. The count is in the section header.
Admins are listed first with an "Admin" badge, then everyone else alphabetically. A search control
sits next to the list so you can find one person by name or number instead of scrolling
**[secondary, from WhatsApp Help Center summaries; see gaps]**. Cost: a 40 person group is a 40 row
scroll with no summary. Failure: alphabetical order is meaningless in a group you already know,
which is exactly the owner's "why am I only seeing the people whose names start with A".

### Apple: iMessage group details and Shared Albums

iMessage puts a small overlapping cluster of participant photos at the top of the thread. Tapping
it opens details, where the full list appears as rows **[secondary]**. Shared Albums is stricter:
participants live behind the album name, and the labels are "Add Participants" (iOS 18 and later,
previously "Invite People"), "Resend Invitation" and "Remove Subscriber". You tap a person's name
to reach the actions **[company]**. Two things are worth stealing. First, the roster is one level
down, never on the main screen. Second, invitation state is visible per person, so a pending invite
reads differently from a member. Apple never shows a preview of the list plus the list.

### Slack channel members

The channel header carries a small avatar row and a member count. Clicking either opens channel
details. Adding is buried on purpose: Slack's own instruction is "Click the member icon in the top
right", then "Add people"; on mobile, tap the channel name, then "Add" **[company for the labels,
secondary for the header composition]**. Cost: new members have to learn that the count is a
button. Benefit: one control does "see everyone" and "add someone", the add form has a type ahead,
and the header stays a header. Nothing about membership occupies vertical space in the reading
area.

### Discord's member list

Desktop keeps a permanent right rail, grouped by hoisted role then by online status, names left
aligned with a small avatar. On mobile the same list is a swipe away, not on screen. Above roughly
1,000 members Discord stops listing offline people at all **[secondary; community posts, no
official article]**. The lesson for a group of 20 to 40 is the grouping, not the rail: Discord
sorts by something that matters (role, presence) before it sorts alphabetically, so the top of the
list is always the useful part.

### Partiful's guest list

Partiful is the closest analogue to a Round, because the interesting fact is a response, not
membership. Guests "can only see the 'Going' and 'Maybe' lists". They cannot see who was invited,
and they cannot see who RSVP'd "Can't Go" **[company]**. Hosts see "the names of the guests who
have RSVP'd to your event, as well as their RSVP status" **[company]**. Display is a setting, not a
given: "Show Guest List" and "Show Guest Count" (the count is labelled "# Going" on the page), plus
"Anonymize guest list for your guests" and "Hide guest count for your guests" **[company]**. Why:
seeing who is already in is social proof that pulls the undecided in **[secondary]**. Failure:
non-responders are invisible, so nobody feels missing. Luma runs the same shape with explicit
statuses (Going, Invited, Not Going, Waitlisted) and a "Guest List" toggle **[company]**.

### Google Calendar attendees

Each guest is a row with a status glyph: tick for yes, cross for no, question mark for maybe,
nothing for no answer. A summary line above the list reads like "3 yes, 1 no, 2 awaiting", and the
guest section is collapsed behind "X guests" on mobile. Seeing the list at all is a permission,
defaulting to "Invite others, see guest list" **[secondary]**. This is the cheapest known way to
show "who wrote in" for 30 people: one summary line, then rows only if you ask.

### Doodle and When2meet

Both invert the layout. Doodle is a table with options as columns and respondents as rows, marked
Yes, No or "If need be", with a per column count above the responses **[company]**. When2meet shows
an availability heatmap and, on hovering a cell, names exactly who is available and who is not
**[secondary]**. Neither shows a roster anywhere. Membership is implied entirely by who has
answered, and the count is attached to the question rather than to the group. For a Catch-up with
eight questions, that is a real option: show per question participation instead of a people panel.

### Notion's share menu

One field at the top ("type a name or email"), then rows of people, each with a permission dropdown
(Full access, Can edit, Can comment, Can view) and "Invite" to commit **[company]**. The whole
thing is a popover, so it never competes with the page. The pattern worth copying is the ordering:
the input is first, the list is second, and there is no preview of the list elsewhere.

### Strava clubs

The members section lists members and marks each one's status as administrator or owner. "View all
members" opens the full list, and a three dot control on a row does the admin actions. For large
clubs, the list "will only display the other members you follow" **[company]**. That last rule is
the most interesting idea here: when a list is too long to be identifiable, show the part that is
identifiable to *you* rather than the alphabetical head of it.

### Instagram Close Friends

The list is one directional. Only the owner can see it. Members are not notified when added and
cannot see who else is on it. The green ring or star marks the content, never a roster
**[secondary]**. Proof that a membership list can be a fact the product knows and mostly does not
draw.

### Letterloop itself

Roles are Owner, Admin, Contributor and Reader. When an Issue launches it "creates reply records
only for Contributors". Owners and Admins can track which members have already replied, and send up
to three automatic nudges plus manual ones via "Send Reminders" on the ellipsis next to the Current
Issue. Members who never answer still receive the compiled issue **[company]**. So even the product
we are improving on treats "who replied" as an admin tracking view, separate from membership, and
does not put a roster on the reading page.

### What this means for us

Three patterns fit, and one should be dropped. Drop the facepile as an identity device: Fluent's
own spec says the fifth slot becomes a number and the names live in a menu, so a row of birds plus
"+18" is doing exactly what it was designed to do, which is count. Keep the birds where a bird sits
next to a name, at 20 to 24px, in a wrapping list of name chips. Thirty chips wrap into four or
five lines on a 390px screen, and every one of them identifies somebody, which no stack of five
ever will.

Second, make the visible fact "who wrote in", on the Google Calendar model: one summary line,
states not a roster, list only on tap. In a batch Catch-up nobody can leave or be added, so
membership is not news and participation is. Naming the people who have not answered yet is the one
thing Partiful gets wrong and Letterloop gets right, and with 20 to 40 people who all know each
other, a short "still to write" list is both the useful information and the nudge.

Third, put the roster one level down and let one control own it, as Slack and Apple both do: the
count is the button, the panel opens with a search field first and the list second, and there is no
preview anywhere else. Order it by relevance, not alphabet, in Strava's spirit: this round's
writers first, then your own batch, then the rest. Keep the leaf on the Keeper and put it on the
person's row, the way WhatsApp's "Admin" and Strava's owner label sit inline. Drop "started it".
For a person's two or three Catch-ups this is not a browsing problem, so no tile, no grid, no
dialog: a line of text that expands. The empty state says what a Round will look like rather than
showing an empty roster, and a one-person Catch-up says who to invite and offers the one control
that does it.

**Sources**

- [company] Avatar group usage, Fluent 2 Design System (React) <https://fluent2.microsoft.design/components/web/react/core/avatargroup/usage>
- [company] Avatar group, Atlassian Design System <https://atlassian.design/components/avatar-group/>
- [secondary] Avatar, Ant Design <https://ant.design/components/avatar/>
- [secondary] Facepile review, PartyKit sketchbook (Matt Webb) <https://interconnected.org/more/2023/partykit/facepiles.html>
- [secondary] How to see group members, WhatsApp Help Center <https://faq.whatsapp.com/7179561392143247/?cms_platform=web>
- [secondary] How to change group admin settings, WhatsApp Help Center <https://faq.whatsapp.com/526742385997912/?cms_platform=web>
- [company] How to use Shared Albums in Photos on your iPhone, iPad and Mac, Apple Support <https://support.apple.com/en-us/108314>
- [company] Add and remove people in a shared album in Photos on iPhone, Apple Support <https://support.apple.com/guide/iphone/add-and-remove-people-in-a-shared-album-ipha8f8fc3c5/ios>
- [company] Have a group conversation in Messages on iPhone, Apple Support (iOS 18) <https://support.apple.com/guide/iphone/group-conversations-iphb10c80fc5/18.0/ios/18.0>
- [company] Add people to a channel, Slack Help Center <https://slack.com/help/articles/201980108-Add-people-to-a-channel>
- [secondary] Organizing offline people on servers, Discord support community <https://support.discord.com/hc/en-us/community/posts/360042624791-Organizing-offline-people-on-servers>
- [secondary] Why Your Discord Member List Looks Smaller (Explained) <https://blog.communityone.io/discord-sidebar-member-count-explained/>
- [company] Can guests see who's been invited to the event?, Partiful Help Center <https://help.partiful.com/hc/en-us/articles/34608228303131-Can-guests-see-who-s-been-invited-to-the-event>
- [company] What information can I see about my guests?, Partiful Help Center <https://help.partiful.com/hc/en-us/articles/26505837944731-What-information-can-I-see-about-my-guests>
- [company] Can I hide the guest list or guest count on the party page?, Partiful Help Center <https://help.partiful.com/hc/en-us/articles/26503238663195-Can-I-hide-the-guest-list-or-guest-count-on-the-party-page>
- [company] What features are available to change in my Event Settings?, Partiful Help Center <https://help.partiful.com/hc/en-us/articles/28895223149979-What-features-are-available-to-change-in-my-Event-Settings>
- [company] Managing Guest List section index, Partiful Help Center <https://help.partiful.com/hc/en-us/sections/30470926071195--Managing-Guest-List>
- [company] Event Guest List, Luma Help <https://help.luma.com/p/event-guest-list>
- [company] Invite people to your Calendar event, Google Calendar Help <https://support.google.com/calendar/answer/37161?hl=en&co=GENIE.Platform%3DDesktop>
- [secondary] How to See Who Accepted a Google Calendar Invite <https://www.usecarly.com/blog/how-to-see-who-accepted-a-google-calendar-invite/>
- [company] How does the 'if-need-be' group poll response work?, Doodle Help Center <https://help.doodle.com/en/articles/9457343-how-does-the-if-need-be-group-poll-response-work>
- [secondary] The Ultimate Guide to When2Meet, SavvyCal <https://savvycal.com/articles/when2meet/>
- [company] Sharing and permissions settings in Notion, Notion Help Center <https://www.notion.com/help/sharing-and-permissions>
- [company] Clubs on Strava, Strava Help Center <https://support.strava.com/hc/en-us/articles/216918347-Clubs-on-Strava>
- [company] Clubs on the Mobile App, Strava Help Center <https://support.strava.com/en-us/articles/15401837-clubs-on-the-mobile-app>
- [secondary] Instagram Close Friends: Full Guide, Unfollr <https://www.unfollr.com/blog/instagram-close-friends-guide>
- [company] How Letterloop works, Letterloop Help Center <https://help.letterloop.co/en/articles/12-how-letterloop-works>
- [company] Track Issue reply progress, Letterloop Help Center <https://help.letterloop.co/en/articles/8-view-issue-progress>
- [company] Send reminders to your members to reply, Letterloop Help Center <https://help.letterloop.co/en/articles/11-send-reminders-to-your-members-to-reply>

---

## Archive, delete, mute, leave, pause, end

Ten products, and almost none of them has six verbs. What they have is two axes, and they keep the
count low by never letting a verb sit on both. **Personal verbs** change only your view (archive,
hide, mute, snooze, leave). **Shared verbs** change the thing itself for everybody (Slack's
archive, Notion's archive, Letterloop's pause and delete). The products people call simple are the
ones where every verb sits on exactly one axis and the word says which. The ones people find
confusing are the ones where the same word does both jobs, or where three personal verbs mean
nearly the same thing.

### WhatsApp

Archive is personal and it is also a mute. Tap and hold a chat, tap the archive icon, and it leaves
the Chats tab. Archived chats live behind a single **Archived** row at the top of the list, with a
number showing how many hold unread messages **[company]**. Since 2021 the default is that a new
message does not pull the chat back out. WhatsApp says plainly "You won't receive notifications for
archived chats unless you're mentioned or replied to. You can't adjust notifications for archived
chats", and an `@` appears next to Archived when someone did mention you **[company]**. Turning off
**Keep chats archived** reverts to the old behaviour and moves the Archived row to the bottom of
the list **[company]**.

Delete is not the twin verb the owner remembers. For a one to one chat, delete is one action. For a
**group**, WhatsApp's own instructions are: exit the group, then delete it. There is no delete
offered while you are a member, and "when you delete a chat, it can't be undone" **[company]**. So
for group threads WhatsApp effectively ships one verb, archive, plus an exit.

The group you cannot leave is the Community announcement group. "When you're in a community, you'll
be added to an announcement group." "You can't leave an announcement group unless you leave the
community. If you leave the announcement group, you'll also exit the community." The escape valve
WhatsApp lists for members is one line in the same article: "Mute notifications" **[company]**.
Cost: archived chats are easy to forget, which is why the mention badge had to be bolted on.

### Telegram

Swipe left to archive. The Archive is a row at the top of the chat list, and you can swipe that row
away too, then pull down to bring it back **[company]**. Telegram's original rule coupled two
verbs: "When an archived chat gets a notification, it will pop out of the folder and back into your
chat list. Muted chats will stay archived forever" **[company]**. That is the same problem WhatsApp
solved with one setting instead. Deleting a private chat offers "Also delete for" the other person.
Leaving or deleting a group only affects your own membership **[secondary]**.

### Slack

Four verbs, cleanly split. **Archive** is shared: the channel closes to new activity, disappears
from everyone's sidebar, history is retained and searchable on paid plans, and it can be restored
from the channel browser, members included. By default any member who is not a guest can archive a
channel they belong to **[company]**. **Delete** is shared and permanent: "Deleted channels are
permanently removed from a workspace, message history included", and the confirmation makes you
tick a box reading "Yes, permanently delete the channel" **[company]**. **Leave** is personal and
the channel carries on. **Mute** is personal: the name greys out, no unread badge appears, but a
mention still shows a badge without interrupting you **[secondary]**.

Slack also has a room nobody can leave. #general "is the only channel that members are
automatically added to and unable to leave", and the alternative offered is muting it **[company]**.

### Gmail

All four Gmail verbs are personal, and that is the trap. **Archive** removes a message from the
inbox, keeps it under All Mail, and "if someone replies to a message you archive, it returns to
your inbox" **[company]**. **Mute** is archive that stays put: "the replies you receive skip your
inbox and go directly to your archive", found with `is:muted`, returning only if the mail is
addressed to you directly **[company]**. **Snooze** removes it "temporarily" and brings it back at
a time you pick, under a Snoozed label **[company]**. **Delete** puts it in Trash for 30 days, then
it is gone with no recovery **[company]**. Four ways to make a thing go away, distinguished only by
when it comes back. Users famously cannot tell archive from delete, and Gmail's help centre still
has to run threads explaining the difference **[secondary]**.

### Apple Mail

The most economical answer found. Apple does not make you choose between archive and delete at the
moment of acting. It makes you choose once, in settings: **Move Discarded Messages Into** is set to
either Deleted Mailbox or Archive Mailbox, per account, and after that the swipe and the button do
that one thing **[company]**. The other verb is still reachable by touch and hold, but it is not on
screen competing for the tap. Two verbs collapse into one gesture plus a preference.

### Notion

Notion's archive is a property of the page, not a personal view. Archiving shows "a yellow Archived
banner at the top of the page", puts an archive icon after the name, archives all sub pages with
the parent, and hides the page from search by default. "Anyone with permission to edit a page can
archive or unarchive it", and you unarchive from the banner on the page itself, not from a separate
archive screen **[company]**. It is currently a Business and Enterprise beta. Trash is the other
verb: 30 days, restored with a curved arrow, "your page will return to where it was last in your
workspace" **[company]**. Cost: as a shared state it needs a banner on every archived page, which
is real screen furniture.

### Google Chat

**Hide** is personal and reversible by accident: hiding a direct message hides your copy only, and
"when you message them again, the conversation chat history shows up again" **[company]**.
**Delete** for a 1:1 "permanently hides the conversation history from your view. The content
remains visible to the other participant" **[company]**. That is a personal hide wearing the
scariest word in the vocabulary, and it is the clearest example in this set of a verb whose name
lies about what it does. **Leave a space** is the real exit, and you cannot rejoin unless someone
adds you or the space is discoverable; if you do rejoin you see all the history **[secondary]**.

### Discord

No archive at all, personal or shared. Mute a server or a channel, then turn on **Hide Muted
Channels** to drop them out of the sidebar entirely. Mentions and @everyone bypass a plain mute by
default. Leaving the server is the only exit, and getting back needs a new invite **[secondary;
Discord's own help article is behind a bot check]**.

### Instagram DMs

Three personal verbs, no archive. **Delete chat** is a two step confirm and "will only delete it
for you and it will still appear in the inbox of other people that are part of the conversation"
**[company]**. **Leave chat** lives in the group info sheet: "when you leave a group chat, you
won't get messages from the group unless someone adds you back" **[company]**, and the thread
records that you left **[secondary]**. **Mute messages** keeps you a member and writes nothing into
the conversation, so nobody can tell **[secondary]**.

### Letterloop

The closest product to ours, and it ships no archive and no mute. **Pause** is Owner or Admin only
and it is destructive in a way the word hides: it "deletes the active unsent Issue and its
in-progress content", stops future cycles, and keeps delivered history, members, questions,
Sections, theme and settings. The warning says so before you confirm, and confirming means pressing
Pause Letterloop twice **[company]**. Resuming "immediately creates a new In Progress Issue",
prompts contributors, and recalculates the schedule **[company]**. **Delete** is permanent, needs
the dialog to name the Letterloop, and is confirmed twice **[company]**. And the elegant bit: there
is one destructive slot in Settings, and the label depends on your role. "Only the Letterloop Owner
or another Admin can delete the Letterloop. Members without Admin permission see Leave Letterloop
instead, whether they are Contributors or Readers" **[company]**. One row, two words, no branching
menu.

### What this means for us

Three patterns fit, and they stack. First, **WhatsApp's coupling**: archive should also silence.
Nobody in this set ships archive and mute as separate personal verbs for a group and comes out
ahead. Gmail did and cannot explain the difference to its own users. That deletes "mute" from our
list before it is added. Second, **Letterloop's one destructive slot with a role dependent label**:
keepers see the shared verb that ends the thing, everyone else sees the personal one, and the menu
does not grow. That is how "end", "leave" and "remove" become one row instead of three. Third,
**Apple Mail's choose once**: if archive and delete both mean "stop showing me this", one of them
belongs on the tile and the other belongs one level down, not side by side on a card the size of a
Spotify square.

For a batch Catch-up nobody can leave, the precedent is unanimous: WhatsApp's announcement group
and Slack's #general both refuse the exit and both hand you a personal hide instead, so archive is
not a consolation prize there, it is the designed answer. On where archived things go, the owner's
complaint about an Archived section with a Put back button is exactly WhatsApp's fix: one row with
a count, not a section on the page. With two or three Catch-ups per person, even that row can be a
header filter.

And on confirmation, Apple's own rule settles it: "Avoid displaying alerts for common, undoable
actions, even when they're destructive... when people take an uncommon destructive action that they
can't undo, it's important to display an alert" **[company]**. Archive gets a toast with Undo and
no dialog. Delete gets a bin with a real window, the way Gmail and Notion both use 30 days, and
only ending a shared Catch-up earns a typed or named confirmation, which is what Slack and
Letterloop reserve theirs for. For alumni who open this two or three times a month, warm paper and
bird avatars on a phone, the win is not a cleverer archive. It is that the tile carries one verb,
the overflow carries one more, and the word on each says truthfully whether it changes the world or
only your screen.

**Sources**

- [company] How to archive or unarchive a chat or group | WhatsApp Help Center <https://faq.whatsapp.com/1426887324388733/?cms_platform=android&lang=en>
- [company] About community announcements | WhatsApp Help Center <https://faq.whatsapp.com/582420703681043/?cms_platform=android&lang=en>
- [company] How to delete chats | WhatsApp Help Center <https://faq.whatsapp.com/656690492499906/?cms_platform=android&lang=en>
- [company] Archived Chats, a New Design and More (Telegram blog) <https://telegram.org/blog/archive-and-new-design>
- [company] Archive or delete a channel | Slack Help Center <https://slack.com/help/articles/213185307-Archive-or-delete-a-channel>
- [company] Use the general channel to share announcements | Slack Help Center <https://slack.com/help/articles/220105027-Use-the-general-channel-to-share-announcements>
- [secondary] Mute channels and direct messages | Slack Help Center <https://slack.com/help/articles/204411433-Mute-channels-and-direct-messages>
- [company] Archive Gmail messages | Gmail Help <https://support.google.com/mail/answer/6576?hl=en&co=GENIE.Platform%3DDesktop>
- [company] Mute Gmail messages | Gmail Help <https://support.google.com/mail/answer/16594169?hl=en&co=GENIE.Platform%3DDesktop>
- [company] Snooze emails until later | Gmail Help <https://support.google.com/mail/answer/7622010?hl=en>
- [company] Delete or recover deleted Gmail messages | Gmail Help <https://support.google.com/mail/answer/7401?hl=en>
- [company] Delete emails on your iPhone or iPad | Apple Support <https://support.apple.com/en-us/102428>
- [company] Archive pages in Notion | Notion Help Center <https://www.notion.com/help/archive-pages>
- [company] Delete & restore content in Notion | Notion Help Center <https://www.notion.com/help/duplicate-delete-and-restore-content>
- [company] Hide or delete a 1:1 direct message | Google Chat Help <https://support.google.com/chat/answer/9224314?hl=en&co=GENIE.Platform%3DDesktop>
- [secondary] Join a space in Google Chat | Google Chat Help <https://support.google.com/chat/answer/7653963?hl=en&co=GENIE.Platform%3DDesktop>
- [secondary] How do I hide muted channels? | Discord Support <https://support.discord.com/hc/en-us/articles/213599277-How-do-I-hide-muted-channels>
- [company] Delete a chat on Instagram | Instagram Help Centre <https://help.instagram.com/1467256816910908>
- [company] Leave a group chat on Instagram | Instagram Help Centre <https://help.instagram.com/505087899649966>
- [company] Pause or reactivate a Letterloop | Letterloop Help Center <https://help.letterloop.co/en/articles/10-pause-or-reactivate-a-letterloop>
- [company] Delete a Letterloop | Letterloop Help Center <https://help.letterloop.co/en/articles/5-delete-a-letterloop>
- [company] Alerts | Apple Human Interface Guidelines <https://developer.apple.com/design/human-interface-guidelines/alerts>
- [secondary] WhatsApp Provides New Archive Options to Permanently Hide Noisy Group Chats | Social Media Today <https://www.socialmediatoday.com/news/whatsapp-provides-new-archive-options-to-permanently-hide-noisy-group-chats/604016/>
- [secondary] What Delete and Leave Group Mean in Telegram <https://iturrit.com/blog/delete-leave-group-telegram-guide>
- [secondary] How to Leave, Delete, or Remove Someone from an Instagram Group Chat | TechWiser <https://techwiser.com/how-to-leave-delete-or-remove-someone-from-an-instagram-group-chat/>

---

## Link previews for songs, and shared photo walls

Two shapes, one section. The first is: someone pastes a link mid-sentence and something good
happens. The second is: many people drop photos into one place and it reads well on a phone.

### iMessage rich links

Paste a URL alone in Messages and iOS replaces the bubble with a card: hero image, title, and the
bare domain under it. In iOS 18 the title strip took a colour sampled from the image instead of
flat grey **[secondary]**. Tapping it opens the link. Apple's own guidance for businesses sending
rich links is the interesting part: the image should be 240x240 with a 200kB ceiling, and rendering
depends on the image itself, so a small image under 150px wide becomes an icon beside text, a
square image becomes a square icon, and a wide image becomes a full-width bubble **[company]**. On
a URL inside a sentence Apple does not try to be clever. It says to "divide the content in 3
separate messages and generate the rich link message accordingly" **[company]**. That is the honest
answer to inline links: promote the link out of the sentence into its own block, and leave the
sentence alone.

Cost to the user: a paste inside a paragraph gets no card at all in the consumer app. Failure mode:
an unreachable page falls back to plain blue underlined text, which still works.

### Slack unfurls

Slack crawls any fully qualified URL in a posted message and "looks for common OpenGraph and X Card
metadata, and renders some micro-approximation of the content" **[company]**. The card sits under
the message, never inside it, with a coloured left rail, the site name and favicon, title,
description and thumbnail. The sentence text is untouched. Third-party testing puts the cap at five
unfurls per message and notes Slackbot reads only the first 32kB of the HTML head, so a page with
big inline styles above its meta tags silently never unfurls **[secondary]**. Apps can claim up to
five domains and replace the crawl with their own Block Kit card **[company]**.

The lesson: Slack never rewrites the author's text. The card is an appendix. That is what makes it
safe on a message with three links in one paragraph.

### Discord embeds

Same appendix model, with one user control worth stealing. Wrapping a URL in angle brackets,
`<https://example.com>`, suppresses the embed while leaving the link clickable, and the sender can
also hit "Suppress Embed" after posting **[secondary]**. Discord stacks up to ten embeds per
message **[secondary]**. The escape hatch matters: someone pasting four links to make a list does
not want four cards.

### Telegram previews

Telegram went the other way and made the preview editable. Since October 2023 the sender can change
the size of the media, place the preview above or below the message, and "select which link to
preview if there are several" **[company]**. One preview per message, chosen by the author, with
the whole preview area tappable **[company]**. The bot API exposes exactly those switches as
`prefer_small_media`, `prefer_large_media` and `show_above_text` **[secondary]**.

This is the best answer to "many links in one answer" that anyone has shipped. Rather than capping
at five or ten, it makes the author pick the one that deserves art.

### Notion

Notion asks. Paste a URL and you get a small menu: dismiss, bookmark, embed, or mention
**[company]**. A bookmark is a block with title, description and URL. A mention is inline and
subtler than a bookmark on purpose. An embed is live and resizable, and YouTube and Spotify get
their own dedicated blocks in the slash menu **[company]**. Notion routes roughly 1,900 domains
through Iframely **[company]**.

Cost: a decision on every paste. That is too much friction for a Catch-up answer, but the three-tier
idea (inline chip, card, live player) is right.

### The keyless endpoints, measured

**YouTube.** `https://www.youtube.com/oembed?url=...&format=json` needs no key. It returned title,
`author_name`, `author_url`, type, width, height, `thumbnail_url`, `thumbnail_width`,
`thumbnail_height` and an iframe `html` for `youtube.com/watch`, `youtu.be`, `/shorts/`,
`music.youtube.com/watch` and a playlist URL **[measured]**. Twenty-five rapid calls all returned
200 **[measured]**. A malformed video id returns HTTP 400 with the body "Bad Request"; a deleted or
unavailable video returns 404 **[measured]**. `format=xml` also works.

The thumbnail is the trap. `thumbnail_url` is always `hqdefault.jpg`, which is 480x360, a 4:3
frame, so every 16:9 video comes back letterboxed with black bars baked into the JPEG
**[measured]**. The true 16:9 files are `mqdefault.jpg` at 320x180 and `maxresdefault.jpg` at
1280x720, and `maxresdefault` 404s on older low resolution uploads (confirmed on two 2005 to 2007
videos) **[measured]**. So: try maxres, fall back to mq, never render the URL oEmbed hands you.
`maxwidth` clamps the iframe dimensions but does not change the thumbnail **[measured]**.

**Spotify.** `https://open.spotify.com/oembed?url=...` needs no key and returned html, `iframe_url`,
width 456, height (152 for a track, 352 for album, artist and playlist), version, `provider_name`,
`provider_url`, type "rich", title, `thumbnail_url`, and thumbnail dimensions of 300x300 for tracks
**[measured]**. A bad id returns 404 with an empty body. `maxwidth` is ignored and is not in the
docs **[measured, company]**.

There is no artist field. Spotify's own reference lists every field and artist is not among them
**[company]**. The artist is only on the page, in `og:description`, formatted "Rick Astley ·
Whenever You Need Somebody · Song · 1987", alongside `og:image` at 640x640 and `og:audio`, a 30
second mp3 preview **[measured]**. Cover art sizes are addressable by path prefix:
`ab67616d00004851` is 64px, `00001e02` is 300px, `0000b273` is 640px, all 200 **[measured]**.

**Apple Music.** No keyless oEmbed exists. Both `music.apple.com/api/v1/oembed` and
`embed.music.apple.com/oembed` return the web app's HTML shell rather than JSON **[measured]**.
What does work without a key is the iTunes Search API: a search returns `trackName`, `artistName`,
`collectionName`, `artworkUrl100` (the `100x100bb` in the path swaps to `600x600bb`), a 30 second
`previewUrl`, and `trackViewUrl` **[measured]**. The player at
`embed.music.apple.com/{storefront}/album/{albumId}?i={trackId}` loads with a 200 **[measured]**.

### Letterloop

Sections are typed: Standard, Photo Wall, and Music, with Spotify songs living only in the Music
section **[secondary, from `docs/planning/letterloop-research.md`]**. That is exactly the fixedness
the owner objected to. Photo Wall holds many photos and takes a multi-select, and Albums gathers
every photo and video from every issue into one place **[company]**.

### Partiful

Guests, not only hosts, upload. One "Upload Photos" button sits at the top of the Activity Feed,
anyone on the event can view and download, and the host kills the whole thing from Event Settings
under the Activity Feed tab **[company]**. No documented count or size limit **[company]**. One
button, one place, one off switch. Nothing else.

### Apple Shared Albums

Everything is capped and published: 5,000 photos and videos per album from all contributors, 100
subscribers, 200 comments per item, 1,024 characters per comment, 1,000 uploads per contributor per
hour and 10,000 per day, 200 albums **[company]**. Photos are reduced to 2,048px on the long edge,
panoramas to 5,400px wide, video to 15 minutes at 720p **[company]**. A public web link makes the
album readable with no account.

### Google Photos shared albums

Collaboration is one toggle: "choose whether others can add photos, comments, and likes." Turning
off Collaborate stops contributions **[company]**. Sharing is an unguessable URL that can be reset
to invalidate the old one **[company]**. Removing a person deletes their photos and comments with
them **[company]**.

### What this means for us

Take Slack's placement, Telegram's control, and Partiful's single button.

**Placement.** Never rewrite the sentence. A link stays a link inline, and the card renders under
the answer, in order of appearance. This is what makes previews work on any question, which is the
owner's whole point: the trigger is a URL, not a question kind. Apple's three-messages advice is
the same idea from the other side, and we get it free because we control the layout.

**Which links get art.** Telegram's rule beats a cap. Render the first music or video link in an
answer as a full card, and the rest as small inline chips (favicon, title, one line). Give the
author a way to demote or promote one, and a way to say "no card", which is Discord's angle
brackets by another name.

**The card itself.** Square art on the left, title, artist, and a small source mark. Artist is the
field that makes it read as a song rather than a URL, and Spotify's oEmbed does not give it, so the
resolver needs a second step: the page's `og:description` for Spotify, `author_name` for YouTube,
iTunes Search for Apple. Cache the resolved fields on the answer row at paste time, because a card
that refetches on every read will be slow and will eventually 404 on a deleted video. Store the
whole card, and if resolution fails, show the plain link. That is the soft failure, and it should
be the same shape whether the endpoint 400s, 404s or times out.

Do not iframe by default. Spotify's iframe is a fixed 152px tall, and stacking eight of them under
one Round is heavy on a phone and hands our page over to two third parties. Our own card, with our
paper and our type, tapped to open the real thing in a new tab, matches the design system and the
bird avatars. A play button is worth adding only where a keyless 30 second preview exists, which is
both Spotify (`og:audio`) and Apple (`previewUrl`), and never YouTube.

**The photo wall.** Make it a block that any question can carry, not a section type. Partiful is
the model: everyone in the Catch-up can add, the button sits in one obvious place, and an admin can
switch it off per Catch-up. On a phone, two columns; on desktop, justified rows so the bottoms line
up (the measurement work is already in `docs/planning/collection-rework/prior-art.md`). Tap opens
one photo full-bleed with swipe between, attributed to its bird avatar. Cap it the way Apple does,
out loud: a per-answer count and a long-edge resize, published in the UI rather than discovered by
failure. For two or three Catch-ups a person, per Round, a cap in the tens is generous and keeps a
Round readable.

**Sources**

- [measured] YouTube oEmbed endpoint, live responses (title, author_name, thumbnail_url, error codes, URL forms accepted) <https://www.youtube.com/oembed?url=https%3A//www.youtube.com/watch%3Fv%3DdQw4w9WgXcQ&format=json>
- [measured] YouTube thumbnail files, fetched and measured (default 120x90, mqdefault 320x180, hqdefault 480x360, sddefault 640x480, maxresdefault 1280x720) <https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg>
- [measured] Spotify oEmbed endpoint, live responses for track, album, artist and playlist <https://open.spotify.com/oembed?url=https%3A//open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT>
- [company] Spotify oEmbed reference (documented fields, no artist field, 404 only) <https://developer.spotify.com/documentation/embeds/reference/oembed>
- [measured] Spotify track page Open Graph tags, fetched (og:description carries artist, og:image 640x640, og:audio 30s preview) <https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT>
- [measured] iTunes Search API, keyless, live response (artistName, artworkUrl100, previewUrl, trackViewUrl) <https://itunes.apple.com/search?term=never+gonna+give+you+up+rick+astley&entity=song&limit=1>
- [measured] Apple Music web embed player, loads without a key <https://embed.music.apple.com/us/album/whenever-you-need-somebody/1558533900?i=1558534271>
- [company] Rich Link Messages, Apple Messages for Business (240x240 image, 200kB, three-messages guidance for a link inside a sentence) <https://register.apple.com/resources/messages/msp-rest-api/type-richlink>
- [secondary] Apple Messages rich link presentation in iOS 18 (colour-sampled title strip) <https://apple.gadgethacks.com/how-to/apple-messages-lets-you-switch-rich-link-previews-and-use-plain-text-urls-for-webpages-more-easily-heres-0385591/>
- [company] Unfurling links in messages, Slack Developer Docs (OpenGraph and X Card crawl, five app domains) <https://docs.slack.dev/messaging/unfurling-links-in-messages/>
- [secondary] Debugging Slack Link Unfurling (five unfurls per message, 32kB head limit) <https://blog.daveallie.com/slack-link-unfurling/>
- [secondary] Wrapping URLs in angle brackets to suppress Discord embeds <https://github.com/Samathingamajig/discord-paste-links-without-embeds/blob/main/README.md>
- [secondary] Discord embed limits cheat sheet (ten embeds per message, 6,000 characters across all) <https://blancodagoat.dev/guides/discord-embed-limits/>
- [company] Replies 2.0, Adjustable Link Previews, Name Colors and More, Telegram blog <https://telegram.org/blog/reply-revolution>
- [company] Telegram Messenger, link preview customization post <https://x.com/telegram/status/1722249718443712593>
- [secondary] LinkPreviewOptions (prefer_small_media, prefer_large_media, show_above_text) <https://docs.python-telegram-bot.org/en/v21.5/telegram.linkpreviewoptions.html>
- [company] Embed and connect other apps, Notion help (bookmark, embed, mention; ~1,900 domains via Iframely) <https://www.notion.com/help/embed-and-connect-other-apps>
- [company] How Letterloop works, Letterloop help centre (issue cycle, contributors vs readers, seven day window) <https://help.letterloop.co/en/articles/12-how-letterloop-works>
- [company] Letterloop marketing site and App Store listing (Photo Wall, multi-select, Albums) <https://www.letterloop.co/>
- [secondary] docs/planning/letterloop-research.md, this repo (Standard / Photo Wall / Music section types)
- [company] How do I upload photos to my event page?, Partiful Help Center <https://help.partiful.com/hc/en-us/articles/26984026098459-How-do-I-upload-photos-to-my-event-page>
- [company] Shared Album limits, Apple Support (5,000 items, 100 subscribers, 2,048px long edge, 720p video) <https://support.apple.com/en-us/108916>
- [company] How shared album controls give your photos more privacy, Google Photos Help <https://support.google.com/photos/answer/9789702>

---

## Producing a beautiful PDF from a web layout, without a server of our own

The set-up session's guess is sound, and the numbers back it. What follows checks each option
against the one thing the owner asked for in ¶21: a portrait PDF good enough that a Vogue designer
laid it out, shareable, later emailable.

**Split the question in two.** First, which engine turns the layout into pages. Second, where that
engine runs. Almost every failure report below is about the second question, not the first.

### Vercel's current limits, which decide everything else

From `vercel.com/docs/functions/limitations`, page `last_updated: 2026-08-24` **[company]**: Hobby
memory is 2 GB / 1 vCPU, both default and maximum; Pro and Enterprise go to 4 GB / 2 vCPU. Max
duration on Hobby is 300 s default *and* 300 s maximum; Pro gets 800 s, with a 1800 s beta.
Function bundle size is 250 MB uncompressed, with "large functions" up to 5 GB if fluid compute
with Active CPU is on. The killer detail nobody mentions: **request and response body are capped at
4.5 MB**, returning `413 FUNCTION_PAYLOAD_TOO_LARGE`. A magazine issue with a dozen photographs
will exceed that. So the PDF bytes must never come back through the function. Write to R2, return a
URL.

Pro rates **[company]**: Active CPU from $0.128/hour, Provisioned Memory from $0.0106/GB-hr,
invocations $0.60 per million. My arithmetic on those: a 20 s render at 2 GB with 8 s of real CPU
costs about $0.0004, four hundredths of a US cent. Hobby's included allowances are reported as 1M
invocations, 4 CPU-hours and 360 GB-hrs per month **[secondary]**; the docs table renders those
cells blank, so treat the exact figures as unconfirmed. Either way, two or three issues per person
per year is not a cost problem.

### @sparticuz/chromium with puppeteer-core on a Vercel function

Vercel's own knowledge base names this pair, saying stock `puppeteer` "exceeds Vercel Functions'
bundle size limitation of 250MB" and pointing at `puppeteer-core` plus `@sparticuz/chromium-min`
**[company]**.

I checked the npm registry directly **[measured]**: `@sparticuz/chromium` 149.0.0, published
2026-05-27, unpacks to 69.7 MB across 15 files. `@sparticuz/chromium-min` 149.0.0, same day,
unpacks to 46 KB across 11 files. That matters, because the common advice that `-min` is *required*
on Vercel is folklore. 69.7 MB sits comfortably inside 250 MB; the 50 MB figure in the README is
Lambda's zipped-upload ceiling, not Vercel's uncompressed one. `-min` buys smaller deploys at the
price of downloading and un-brotli-ing a pack into `/tmp` on every cold start.

The README asks for "at least 512 MB of RAM", with "1600 MB (or more) recommended" **[company]**.
Hobby's 2 GB clears that. It also warns that Lambda ships no system fonts, so the package bundles
Open Sans only. **Libre Baskerville and Source Sans 3 will not be there.** They have to be embedded
in the page as data URLs or shipped alongside.

What breaks, from reports **[secondary]**: cold start of two to four seconds just to boot Chrome,
plus a few more to decompress the pack; forgetting `browser.close()` leaves zombie Chromium
processes that poison a warm container; a race when several requests download the pack at once,
fixed by sharing one promise.

### Headless Chrome run by hand from a local script

The same puppeteer code, but the Chrome is the one already on the owner's Mac (the repo's
screenshot tooling already falls back to `/Applications/Google Chrome.app`, per CLAUDE.md gotcha
2). No cold start, no font problem, no 250 MB, no 4.5 MB response cap, no `-min` pack. It uploads
the finished PDF to R2 and writes the key back to the row. Cost: zero. It is an ordinary `scripts/dev/` script, not one of the hand-run passes that
`docs/spec/hand-run-passes.md` governs: nothing here judges a member's data or writes a judgment back.

### GitHub Actions as the runner

`ubuntu-latest` has Chrome preinstalled and any job can run for up to 6 hours **[company]**. GitHub
Free includes 2,000 minutes a month, Pro 3,000, and a Linux 2-core runner bills at $0.006/minute
beyond that **[company]**. A `workflow_dispatch` or repository-dispatch job that renders a round and
pushes it to R2 costs single-digit cents a year at this volume, and it runs without the owner's
laptop being open. The failure mode is that a private repo's minutes are charged to the owner, and
that debugging happens through logs rather than a browser.

### Cloudflare Browser Rendering

Cloudflare runs headless Chrome on its own network and exposes a REST `/pdf` endpoint
**[company]**. Free plan: 10 minutes of browser time per day, 3 concurrent browsers, one new
browser every 20 seconds, one Quick Action request every 10 seconds, 60 s browser timeout. Paid:
200 concurrent, 3 new browsers per second, 30 requests per second. Ten minutes a day is roughly
twenty renders a day, free, with no binary to ship and no cold start of ours. Images already live
in R2 on the same network. The blog post at ventura-digital reports Cloudflare Browser Rendering
driven through Durable Objects was rejected for "unreliable connectivity" **[secondary]**, so this
wants a small proof before it is trusted.

### Browserless and other hosted Chrome

Browserless sells connection time: free tier 1,000 units/month, 2 concurrent browsers, 2 minute
sessions; Prototyping $25/month for 20,000 units; a unit is up to 30 seconds of browser time
**[company]**. For two or three issues per person the free tier is plenty, but it puts a third
party between the page and the file, and the session cap means a slow render simply dies.

### Gotenberg

A Docker image, `docker run --rm -p 3000:3000 gotenberg/gotenberg:8`, that takes multipart form
data and returns a PDF, carrying its own Chromium, LibreOffice and fonts so you do not manage them
**[company]**. The Chromium route defaults to 8.5 x 11 inch paper with 0.39 inch margins and
accepts `preferCssPageSize`, `printBackground`, `waitDelay`, `waitForExpression` and `header.html`
/ `footer.html` **[secondary]**. It cannot run on Vercel; it needs a container somewhere. Real
report: issue #1348, a very large page fails with "Printing failed (-32000)" and "CompositePages:
Cannot create new shared memory region", still open **[secondary]**. That is Chrome's print
compositor running out of shared memory, and it is a container-sizing problem worth knowing about
wherever Chrome prints.

### Browser print CSS, and what Chrome actually supports

Chrome 131, shipped 30 October 2024, added generated content in all sixteen `@page` margin
at-rules, including the `page` and `pages` counters **[company]**. Explicitly still missing, each
with an open Chromium bug: `string-set` running headers, `target-counter()` cross-references,
footnotes via `float: footnote`, and `element()` references.

Puppeteer's `page.pdf()` defaults are traps **[company]**: `format` defaults to `letter`,
`printBackground` to `false`, `preferCSSPageSize` to `false`, `margin` to undefined. Helpfully,
`waitForFonts` defaults to `true` and `tagged` to `true`. Set `preferCSSPageSize: true` and
`printBackground: true` or the warm paper disappears and the page is US Letter.

One sharp real-world report: headless Chrome "will silently refuse to fetch any resources
referenced in your `@page` CSS rules, so your `url()` images are fully invisible", where the
graphical print dialog and Paged.js both render them. Base64 data URLs work **[secondary]**.

### Paged.js

A JavaScript polyfill for CSS paged media: `@page`, margin boxes, page numbers, running headers,
breaks, footnotes, started by Adam Hyde and maintained by Julien Taquet, Fred Chasen and Gijs de
Heij **[company]**. Its real weakness is exactly our layout style: no element can be split across
two blocks from a CSS grid, and `break-inside` is either ignored or misbehaves on flex parents and
flex items **[secondary]**. And I measured the registry **[measured]**: `pagedjs` 0.4.3 was last
published 2023-07-06, `pagedjs-cli` 0.4.3 on 2023-07-20 pinned to `puppeteer ^20.9.0`. Three years
without a release.

### @react-pdf/renderer, and pdfmake

`@react-pdf/renderer` 4.9.0, published 2026-08-27 **[measured]**, is alive and well maintained. It
uses Yoga for flexbox: rows, columns, wrapping, absolute positioning, custom fonts, SVG, page-break
control **[company]**. But it is a separate component vocabulary (`Document`, `Page`, `View`,
`Text`), so **none of our React components render into it**. No CSS grid. Recurring open issues
include content taller than one page getting squashed and overlapped at the bottom, and font
substitution failing at fragment boundaries **[secondary]**.

`pdfmake` 0.3.11, published 2026-06-12 **[measured]**, takes a JSON document definition and accepts
no HTML or CSS at all **[company]**. Excellent tables and page numbering; wrong tool for a
magazine.

### Prince and WeasyPrint

Prince is free for non-commercial use but stamps a Prince logo in the top right corner of the first
page, which you are forbidden from removing **[secondary]**. Commercial licensing starts around
$2,000/year for a site licence, $3,800 for a per-server licence **[company]**. That first-page logo
alone disqualifies it.

WeasyPrint is Python, BSD, with a CSS layout engine written for pagination **[company]**. It
supports grid comprehensively, `@page` margin boxes, `:left` / `:right` / `:first` / `:blank`, page
counters, `@font-face` with automatic subsetting. It does not support JavaScript, box shadows,
`writing-mode`, 3D transforms, subgrid, or `repeat(auto-fill)`, and its own docs say flexbox "works
for simple use cases but is not deeply tested". No JavaScript means no React and no shared
components.

### How Letterloop, Notion and Day One do it

**Letterloop** **[company]**: open a delivered Issue from Past Issues, three-dot Options menu,
Download PDF, and the file lands as `Letterloop Issue No.[number].pdf`. The render is asynchronous
and queued; the help page says it "can take a minute, especially for an Issue with many replies or
media items", and tells you not to start several exports at once. Only *delivered* Issues can be
exported. Comments, reactions and video playback do not behave as they do in the live Issue. It
warns that a downloaded PDF is a standalone copy anyone can forward. That is the whole shape of the
feature we want, and the owner's ¶21 asks for a better-looking version of it.

**Notion** **[company]**: PDF export offers a page format and a scale percent. Include subpages is
Business and Enterprise only. Custom emoji do not appear. Large exports arrive as an emailed link,
and workspace exports can take up to 30 hours. Most telling: "If a PDF export fails, Notion will
instead export as HTML." Even Notion cannot always make the PDF.

**Day One** **[company]**: Book Printing is iOS only, 5.5 x 8.5 inch, $19.99 for the first 50
colour pages then $0.10 a page, hard limit 384 pages with a soft limit of 359 when entries are
photo-heavy. The preview "shows each page as it will appear in the printed book", and there is no
PDF export of the book for printing. Multi-page PDFs print only their first page, videos print as a
single still, audio prints as a placeholder card. Day One is the one that treats layout as its own
designed artefact rather than a print of the screen, and it pays for that with a hard page ceiling
and an explicit rule for every media type it cannot lay out.

### What this means for us

Two patterns fit, and they are the same engine at different addresses.

**Chrome printing our own React components is the only option that keeps one set of components for
screen and for print.** Everything else (react-pdf, pdfmake, WeasyPrint, Prince) is a second
implementation of the magazine that would drift from the first within a month. For a group of
alumni with bird avatars, a warm paper palette, Libre Baskerville and Source Sans 3, and the
owner's ¶21 demand for layout rules that adapt to the content, we need the real CSS engine, real
web fonts, real images from R2. Chrome is that engine. Paged.js would give better paged-media
features on top, but it is unmaintained since 2023 and its grid and flex page-break behaviour is
exactly where our layouts live, so use it only if Chrome's own `@page` support proves insufficient
after a real test.

**Run it by hand from a local script first, exactly as the set-up session guessed.** (An ordinary
`scripts/dev/` script; the hand-run-passes protocol is for passes that judge members' data and write
it back, which this does not.) Zero cost, no cold start, our fonts already installed,
no 4.5 MB cap, and the owner gets to look at the file before anyone else does. That matters more
than automation for the first ten issues, because the whole point of ¶21 is that the layout has to
be judged, not just generated.

**Then promote it, and the second address is a judgement call between two cheap options.** A Vercel
function with `puppeteer-core` and `@sparticuz/chromium` is the fewest moving parts and stays inside
Hobby's 2 GB and 300 s, but it must embed both fonts as data URLs, must set `preferCSSPageSize:
true` and `printBackground: true`, must close the browser in a `finally`, and must write to R2 and
return a URL rather than the bytes. A GitHub Actions job is slower to trigger but has Chrome and
fonts already, six hours instead of five minutes, and no bundle limit at all. Given the owner wants
to "wire it up, emailing everyone the catch-up as soon as it's ready", Actions triggered by a
webhook when a Round closes is the lower-risk version of that, and Cloudflare Browser Rendering's
free 10 minutes a day is a third path worth one afternoon of proof since our images already sit on
Cloudflare.

**Storage and serving are settled.** R2 at $0.015/GB-month with free egress and a 10 GB free tier
**[company]** means a hundred issues of a few megabytes each cost nothing. Store one object per
Round keyed by round id plus a content hash so a regenerated layout does not overwrite the file
someone already has a link to, keep the bucket private, and serve through a route that checks
membership. Letterloop's own warning applies to us word for word: once it is downloaded, anyone who
receives it can forward it.

**One thing to decide early, from Day One's example.** Day One publishes a rule for every media
type it cannot lay out. Our magazine needs the same list before the first line of layout code: what
happens to a tall portrait photograph, to a landscape one, to a photo wall of nine, to a YouTube
link, to a two-word answer from Cyan and a six-paragraph answer from Mohini. The owner's ¶51 asks
for a fake catch-up filled with "literally every type of content we might come across". That
fixture is the specification for the PDF, not a test of it.

**Sources**

- [company] Vercel Functions Limits (doc last_updated 2026-08-24) <https://vercel.com/docs/functions/limitations>
- [company] Vercel Limits (doc last_updated 2026-09-03) <https://vercel.com/docs/limits>
- [company] Deploying Puppeteer with Next.js on Vercel (Vercel Knowledge Base) <https://vercel.com/kb/guide/deploying-puppeteer-with-nextjs-on-vercel>
- [company] Sparticuz/chromium README (Chromium for Serverless Platforms) <https://github.com/Sparticuz/chromium>
- [measured] npm registry metadata for @sparticuz/chromium, @sparticuz/chromium-min, @react-pdf/renderer, pdfmake, pagedjs, pagedjs-cli (versions, publish dates, unpacked sizes) <https://registry.npmjs.org/@sparticuz%2Fchromium>
- [secondary] Rendering PDFs on Vercel with Next.js (Marcel Fetten, ventura-digital) <https://www.ventura-digital.de/blog/rendering-pdfs-on-vercel-with-nextjs>
- [secondary] Why HTML to PDF with Puppeteer Keeps Breaking on Serverless (html2img, vendor blog) <https://html2img.com/articles/puppeteer-html-to-pdf-serverless/>
- [company] Puppeteer PDFOptions API reference <https://pptr.dev/api/puppeteer.pdfoptions>
- [company] Add content to the margins of web pages when printed using CSS (Chrome for Developers, 30 Oct 2024) <https://developer.chrome.com/blog/print-margins>
- [secondary] Chrome "Print to PDF" and headless --print-to-pdf aren't the same! (Andre Arko) <https://andre.arko.net/2025/05/25/chrome-headless-print-to-pdf/>
- [company] Paged.js home page <https://pagedjs.org/>
- [secondary] Paged.JS and CSS Flex / Grid (Think Drastic) <https://thinkdrastic.net/journal/2022/02/07/paged-js-and-css-flex-grid/>
- [company] @react-pdf/renderer home page <https://react-pdf.org/>
- [secondary] react-pdf open issues <https://github.com/diegomura/react-pdf/issues>
- [company] pdfmake documentation <https://pdfmake.github.io/docs/0.1/>
- [company] WeasyPrint documentation and supported features <https://doc.courtbouillon.org/weasyprint/stable/api_reference.html#supported-features>
- [company] Prince purchase and licensing page <https://www.princexml.com/purchase/>
- [secondary] Prince License FAQ (non-commercial logo terms) <https://www.princexml.com/purchase/license_faq/>
- [company] Browserless pricing <https://www.browserless.io/pricing>
- [company] Gotenberg introduction <https://gotenberg.dev/docs/getting-started/introduction>
- [secondary] Gotenberg issue #1348: Converting large html via url to PDF, Printing failed (-32000) <https://github.com/gotenberg/gotenberg/issues/1348>
- [company] Cloudflare Browser Rendering overview <https://developers.cloudflare.com/browser-rendering/>
- [company] Cloudflare Browser Rendering limits <https://developers.cloudflare.com/browser-rendering/platform/limits/>
- [company] Cloudflare R2 pricing <https://developers.cloudflare.com/r2/pricing/>
- [company] About billing for GitHub Actions <https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-actions>
- [company] GitHub Actions limits <https://docs.github.com/en/actions/reference/limits>
- [company] Letterloop help: Download an Issue as a PDF <https://help.letterloop.co/en/articles/35-download-an-issue-as-a-pdf>
- [company] Notion help: Export your content <https://www.notion.com/help/export-your-content>
- [company] Day One guides: Book Printing <https://dayoneapp.com/guides/day-one-ios/book-printing/>
- [secondary] Vercel pricing breakdown 2026 (Hobby included allowances) <https://costbench.com/software/developer-tools/vercel/free-plan/>

---

## The gaps

Every researcher wrote down what they could not verify. This is all of it, in one place, so the
design session knows which sentences above are load-bearing and which are a best guess. Nothing
here should be treated as settled.

### On how Letterloop looks and moves

1. **No screenshot of the Home or Dashboard screen** exists in any public source I found, so how
   multiple Letterloops are listed is known only from wording ("Dashboard", "your Letterloop
   listing", "quick actions for all your Letterloops on the Home screen") and not from pixels. The
   same holds for the "extended timeline view of your Issue on each Letterloop screen" named in the
   August 2026 release notes: I found the phrase, never the picture.
2. **No screenshot of the Members screen.** I have the fields and the row menu from the help
   centre, but nothing about density, avatar size, grouping or what 20 to 50 rows actually look
   like, and the help centre embeds no images at all.
3. **No sample PDF.** Its page size, orientation, column width, cover page and whether photos
   reflow are unknown. Only its filename pattern and the fact that it is a snapshot are documented.
4. **No Memento images.** Design count, aspect ratio and what Shuffle visibly changes are
   undocumented and unpictured.
5. **Theme preset names are unstable.** The 2026-07 file recorded seven (Classic, Minimal,
   Magazine, Evening, Diary, Postcard, Celebration); the current help article says "a preset such as
   Classic, Cozy, or Evening". I could not confirm the full current list or see any preset rendered.
6. **No motion evidence at all.** Nothing public describes Letterloop's transitions, easing,
   durations or loading states, and I could not sign in to observe them, so every claim above about
   how it moves is about navigation structure, not animation.
7. **The measured issue numbers come from the public marketing sample**, which is the emailed issue
   shown inside a Gmail mock, not the in-app reader. The in-app reader is known only from the App
   Store screenshot, which is a marketing crop.
8. **The staged App Store screenshots** (comment bubbles, tilted question cards) are illustration,
   not UI, and I have treated them as such.
9. **Google Play** returned 404 for the package id I tried. I did not confirm an Android listing
   URL.

### On a short list of a few important things

**Could not verify from WhatsApp itself.** faq.whatsapp.com and blog.whatsapp.com both return an
error page to non-browser clients, and every fetch attempt failed, so every WhatsApp claim in that
part (swipe to archive, touch and hold, the Keep Chats Archived default, the chat row's contents)
rests on third-party writing plus the CSS of a user style, not on WhatsApp's own words. Someone
with WhatsApp open should confirm the chat row's exact contents and the archive behaviour before
the design leans on it.

**Could not read Apple's Human Interface Guidelines.** The Layout and Collections pages render
client side, and the tutorials JSON endpoints answer 404, so there is no quotable Apple guidance
there on margins, readable width, or when to prefer a collection over a list. The Apple claims in
that part all come from the iPhone User Guide instead, which describes behaviour rather than
reasoning.

**No product was measured at a wide viewport.** A peer session was driving the shared Chrome
instance, so resizing the window would have disturbed its work; the one browser measurement taken
(Are.na) was at whatever width the window already was, 500px. So the wide-screen claims about
WhatsApp Web, Notion and Slack are inference from documentation and third-party sources, not
numbers. Nobody has yet measured what Spotify, Notion or Letterboxd actually do with two or three
items at 1920px, and that is the exact question, so it is worth ten minutes in a browser before the
design session commits.

**No published pixel values found** for WhatsApp Web's own max-width, Letterboxd's content column
cap, Are.na's channel grid breakpoints, or Notion's three card sizes. The user style proves
WhatsApp Web has a cap and roughly where it bites, not what the number is.

**No company statement found explaining why Apple puts per item actions behind touch and hold**
rather than on the row. The pattern is verifiable; the reasoning is not, and I have not attributed
one.

**Are.na's help documents do not say** whether a channel card shows a block count, collaborator
faces or a last updated time, and I did not verify those on the page itself. Do not assume they are
there.

**Letterboxd's five overlapping posters were confirmed on one profile only.** The count is set by a
CSS custom property, so it may vary by page or by list length. Every card on that page used five.

### On a long, multi-author document read on a phone

1. **Revolut.** No published Revolut account of long-document navigation exists that I could find,
   and their app has nothing document-shaped in it. Their own design-principles post returns 403 to
   automated fetch, so the two claims made about them (bottom sheets as the main secondary screen,
   tab bar only on the three top-level screens) rest on third-party writing, not on Revolut. If the
   owner has a specific Revolut screen in mind, someone should ask him which one; the phrase "what
   if Revolut did this" is more likely about confidence and physicality than about a copyable
   pattern.
2. **Alex Hollender's "Design notes on the 2023 Wikipedia redesign"** is the best account of why the
   sticky TOC won, and both Medium and uxdesign.cc return 403 or Cloudflare challenges. I used
   mediawiki.org's own feature page instead, which has the rationale and the prototype-testing
   numbers but not his narrative.
3. **No A/B numbers for the Vector 2022 sticky table of contents.** Wikimedia's repository page
   lists a "Sticky Header and Table of Contents User Testing" report (March 2021) but does not
   summarise it, and the widely repeated claim that the new TOC "increases deeper exploration of
   articles" has no percentage attached anywhere I could reach. The 236-participant prototype
   figures quoted above are qualitative prototype testing, not production A/B.
4. **Discourse mobile timeline not measured directly.** Another Claude session was driving the
   shared Chrome window, so I did not resize it to 390x844, and `?mobile_view=1` no longer switches
   Discourse's layout (it is width-based CSS now). The mobile description is from Discourse Meta
   staff replies, not from my own inspection. Worth 10 minutes with the MCP at 390x844 when the
   browser is free.
5. **No animation durations or spring parameters from Apple** for sheet detent transitions, the
   Books scrubber, or the Photos scrubber. Apple publishes the behaviour, never the numbers. The
   only timing figure in that whole part is NN/g's 300 to 400ms recommendation for a partially
   persistent header, which is guidance rather than measurement.
6. **iOS Photos scrubber details are all third-party.** Apple's own Photos help does not document
   the touch-and-hold timeline scrub or the Years-tile horizontal scrub. Someone should confirm the
   interaction on a real iPhone before the design leans on it.
7. **Apple News+ lower-left cover thumbnail** is third-party. Apple's guide documents only "tap
   [the menu], then tap Go to Issue". The always-visible thumbnail is the more interesting of the
   two and is the less verified one.
8. **Substack and Medium in-post navigation.** I found no evidence either app has any, which is
   probably because neither does, but absence of evidence here is weaker than the rest of the part.
   Nothing in it depends on this.
9. **Nothing was measured about how any of this performs with forty entries plus photographs**,
   which is our actual worst case. Discourse's virtual DOM post stream is the only sourced answer,
   and I have its existence, not its numbers.

### On layout engines

1. **Google Photos design post** returned HTTP 403. Everything said about Google Photos comes from
   search-result summaries of that post, not the post itself. Treat "60fps", "scrubbable" and the
   target row height as unverified.
2. **Eric Socolofsky's 2015 code.flickr.com post** explaining the justified layout internals is
   referenced by the 2016 open-source announcement but I could not locate it. The row-break decision
   (scale up with one fewer photo versus scale down with the extra one) is from a third-party
   summary, not Flickr. The config defaults ARE from Flickr's own docs and are solid.
3. **Adobe's own help pages for liquid layout timed out twice.** The five rules and their behaviour
   are from CreativePro, a well-regarded InDesign publication, plus search summaries of the Adobe
   pages. Adobe's exact wording and its own stated warnings are not verified. I also could not
   verify the Content Collector / linked content and Smart Text Reflow behaviour at all, which
   matters if we ever want one source flowing into several page sizes.
4. **Blurb's per-container pixel tables** returned HTTP 403. Only the 250 DPI threshold, the 250 to
   300 ideal band, the shrink-the-container fix and the do-not-upsample advice are confirmed, and
   those come from search summaries of Blurb's own help centre rather than the pages themselves.
5. **Apple Photos books**: discontinued in 2018 and never documented. No published account of how it
   chose photos per page or handled mixed orientation. Google Photos books likewise publish nothing
   about their auto-layout. Both dropped rather than guessed at.
6. **Letterloop publishes no documentation** of its themes, its issue layout rules, or any PDF or
   print export. The App Store and Google Play listings add nothing on layout. I found no evidence
   Letterloop has a PDF export at all. Confirming this would need a real account, which I did not
   have. (Note from the assembly: researcher one did find Letterloop's PDF help article, so this
   particular absence is answered above.)
7. **Kinfolk, Monocle and Cereal publish no grid specifications**, column counts or type scales.
   Third-party writing about them is aesthetic description with no measurements. Dropped rather than
   pad the part with unverifiable claims. If the design session wants real print grids, measuring a
   physical copy or a PDF issue is the only reliable route.
8. **Readymag dropped.** Its adaptation is manual breakpoints (mobile, tablet, desktop) plus a Scale
   Layout feature that proportionally scales the whole design, which is InDesign's Scale rule under
   another name. It does not adapt to content shape, so it does not answer the questions asked.
9. **Duplo's heuristic weights**: Flipboard names dozens of weighted heuristics but publishes only
   four, and only two actual numbers (80% text fill, 120% upsample ceiling). No solve time, no
   candidate-generation cost, no failure modes admitted.
10. **PageSuite's scoring criteria** are proprietary and unpublished. The claims are marketing copy
    with no numbers behind them.
11. **No source found, anywhere, for automatic pull quote selection implemented in software.** Every
    source is human editorial practice. The frequency numbers (one per 400 to 600 words, break every
    350 to 500 words, 2 to 4 paragraphs of separation) come from craft blogs, not from a
    publication's own style guide, so treat them as a starting band to tune rather than as
    established figures.
12. **Nothing verified about the content types a Round has that a magazine does not**: an embedded
    song, a video thumbnail, or a photo wall contributed by many people. That is genuinely new
    ground for us.

### On who is in this, and who wrote in

Nothing in that part is [measured]. The researcher did not open any of these products in a browser,
so every claim is documentation or third-party writing, not observation. If the design session
wants numbers (avatar sizes, how many chips fit at 390px, what Partiful's guest list actually looks
like), someone has to open them and measure.

1. **WhatsApp Help Center pages** return truncated body text to the fetcher, every time, on four
   different article IDs. The claims about Participants ordering, the "Admin" badge appearing first,
   and the participant search control come from search-engine summaries OF those official pages, not
   from the pages themselves. Treat as likely but unconfirmed.
2. **Atlassian's avatar group** default maxCount and the exact behaviour of its overflow menu. The
   docs page renders as navigation only to the fetcher; only the one-line component definition was
   confirmed. The Atlaskit package page was likewise empty.
3. **Letterloop's "Track Issue reply progress" article body would not load**, so the feature is known
   to exist and to be named that, but not what the screen shows: whether it is a list of names with
   ticks, a count, or a percentage. This is the single most relevant unknown for our "who wrote in"
   design.
4. **Partiful's and Luma's actual guest list rendering.** Both help centres document the toggles and
   the states thoroughly and describe the visual layout nowhere. Whether Partiful shows avatars,
   names, or both, and whether "Going" and "Maybe" are separate sections or one list, is
   undocumented publicly.
5. **Google Calendar's summary line wording** ("3 yes, 1 no, 2 awaiting") and the per-name status
   glyphs. The official page confirms only that responses and RSVP status are visible on the event.
   The specific format is from secondary write-ups.
6. **Discord's 1,000-member cutoff** for listing offline members has no official support article I
   could find, only community posts and third-party blogs. The number may be wrong or may have
   changed.
7. **iMessage group details in current iOS.** Apple's user guide pages render as table-of-contents
   only to the fetcher, so the description of the participant photo cluster at the top of a thread is
   secondary.
8. **No company statement from anyone explaining WHY a facepile is capped at five**, beyond Fluent's
   spec asserting it. The reasoning in that part is inferred from the specs, not quoted.

### On archive, delete, mute, leave, pause, end

1. **Discord is unverified against Discord.** support.discord.com is behind a Cloudflare bot check
   that blocked both plain HTTP and headless Chrome, so every Discord claim there (Mute Server, Hide
   Muted Channels, mentions bypassing mute, leave being the only exit) rests on third party writing.
   Treat the shape as reliable and the exact setting names as possibly stale.
2. **Marco Polo was dropped.** support.marcopolo.me showed articles for "delete a group", "delete a
   chat" and "leave group", but nothing indicating an archive or a mute, and none of it could be
   verified from a page actually read. It adds nothing this set does not already cover.
3. **Telegram's current archive behaviour.** The 2019 blog post is quoted verbatim and is
   company-grade, but Telegram changed how archive behaves again when Chat Folders shipped (their own
   bug tracker has a thread about chats staying archived when the notification comes from a chat in
   a folder). No current official page stating today's rule was found, so the "pops out unless
   muted" line may no longer be exactly right in 2026.
4. **Telegram delete and leave behaviour** ("Also delete for", leaving a group affecting only you)
   are secondary only. telegram.org/faq did not yield a quotable passage.
5. **Letterloop's Leave.** There is no standalone help article for Leave Letterloop; the only
   official statement is the one sentence inside the Delete article. So what leaving does to your
   past replies, whether the group is told, and whether you can be re-added are all unknown. That
   matters to us, because leaving a chosen-people Catch-up is exactly the case.
6. **Letterloop has no archive and no mute that could be found.** Its help centre index lists ten
   collections and none mentions either verb. Fairly confident this is a true absence, not a
   documentation hole, but the product was not signed into to confirm.
7. **Instagram**: unverified whether a deleted group chat reappears in your inbox when a new message
   arrives (Gmail-style) or stays gone. Instagram's article does not say, and it was not tested.
8. **Slack sidebar hiding**: muting greys the channel and suppresses badges, confirmed; whether
   Slack can drop muted channels out of the sidebar the way Discord can is not. The muting claims
   are from a third party summary, not Slack's own article, which was not fetched.
9. **Notion Archive is a Business and Enterprise beta**, per Notion's own page. Behaviour may change
   or vanish.
10. **Nothing in that part is [measured].** Help documentation was read, not running apps. Nobody
    signed in to WhatsApp, Slack, Notion, Letterloop or Instagram to watch a tap actually happen, so
    screen-level details (exact toast copy, whether an Undo appears, animation on archive) are
    absent. If the design session wants those, someone has to hold a phone.

### On link previews and photo walls

1. **X (Twitter) cards.** developer.x.com returned HTTP 402 Payment Required, so there is no primary
   source for the player card fields, image size rules or title and description character caps. The
   product was dropped rather than described from third-party guides. Worth one more attempt from an
   archived copy of the old developer.twitter.com card docs.
2. **Rate limits on the two oEmbed endpoints.** Neither Google nor Spotify publishes one, and a
   burst of 25 rapid calls to each from one IP returned 200 every time. That is not evidence of no
   limit, only that the limit is above 25. Do not design a bulk backfill on this. Test at the volume
   you actually intend before shipping one.
3. **Spotify oEmbed on podcast episodes and shows.** Only track, album, artist and playlist were
   tested.
4. **Whether YouTube oEmbed distinguishes "embedding disabled by the uploader" from "deleted".**
   Both cases that could be constructed returned 404, and no currently live video with embedding
   disabled could be found to test the third case. Assume 404 means "no card" and handle it as one
   failure.
5. **Google Photos shared album hard numbers.** The 20,000 item and 200 collaborator figures
   circulate only in Google's community forum threads, which are user posts, not Google's own
   documentation. They were left out. Google's own page documents the controls but not the caps.
6. **Letterloop's Photo Wall specifics**: per-issue photo count, file size ceiling, whether a reader
   as opposed to a contributor can add, and how the wall lays out on a phone. Their help centre has
   no Photo Wall article that could be found, and the marketing copy does not say. This would need a
   signed-in account to answer properly.
7. **Partiful's photo limits and its on-screen grid layout.** The help article explicitly does not
   state either. Both are answerable in about ten minutes by loading a public Partiful event page in
   the chrome-devtools MCP at 390x844 and reading the rects, which was not done because the brief
   said not to design and there was no live event URL.
8. **Pixieset and Flickr groups** were dropped as duplicative: the justified-rows layout question
   they answer is already measured in `docs/planning/collection-rework/prior-art.md`, with numbers.
9. **iOS 18's colour-sampled rich link title strip** is from a third-party how-to, not an Apple
   source. The behaviour is real but no Apple page describing it was found.

### On producing a PDF

1. **Hobby's exact included allowances.** vercel.com/docs/limits has a "Usage summary" table whose
   Hobby cells render blank through WebFetch. The figures quoted (1M invocations, 4 CPU-hours Active
   CPU, 360 GB-hrs Provisioned Memory, 100 GB Fast Data Transfer) come from third-party pricing
   trackers, not from Vercel. Check the dashboard.
2. **Whether Hobby is eligible for "large functions" (5 GB bundles).** The docs state the
   requirement as fluid compute with Active CPU enabled and do not name a plan gate, but they also
   do not say Hobby qualifies. Moot if we stay under 250 MB, which measured sizes say we will.
3. **How Letterloop actually renders its PDF.** The help centre describes the user-facing flow and
   the async queue but never says which engine. "Can take a minute" and a queue are consistent with
   headless Chrome, but that is inference, not evidence. Same for Notion: the HTML fallback on
   failure hints at a browser-based renderer, unconfirmed.
4. **Cloudflare Browser Rendering's paid per-hour price.** The limits page says "No limit /
   usage-based pricing" and points at a pricing page that was not loaded.
5. **A conflict on Day One.** A search summary claimed the book preview can be exported to PDF; the
   help page that was fetched says Day One "does not support direct PDF export for printing" and
   that the preview PDF cannot be exported. The fetched page won. Worth one minute in the app if it
   matters.
6. **Gotenberg's full Chromium option set and defaults.** gotenberg.dev/docs/routes and
   /docs/routes/chromium both 404'd. paperWidth 8.5in, paperHeight 11in and 0.39in margins come from
   secondary write-ups of the route, not the current docs page.
7. **No measured render time or output size for our own page.** Every second and megabyte in that
   part is somebody else's workload. Before choosing a runner, print one real Round locally with
   `page.pdf()` and record: wall-clock, peak RSS, file size, and whether Libre Baskerville and
   Source Sans 3 survived. That single measurement decides Vercel-function versus GitHub-Actions
   more reliably than any of the above.
8. **Prince's current licence wording.** princexml.com/download/ carries no licence text and the
   licence FAQ came only through a search summary. The "logo in the corner of the first page, which
   you may not remove" claim is second-hand. It is enough to rule Prince out, but do not quote it as
   verbatim.
9. **Vercel Hobby's non-commercial restriction.** Reported by secondary sources; it was not found in
   the docs page that was fetched. Probably irrelevant for an alumni site, flagged for completeness.
