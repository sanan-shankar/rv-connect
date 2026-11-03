## 2026-11-03 (images) — bug audit 3, unit O1: the image optimizer takes no query string, and only the folders it renders

C5-01, the cheapest way to spend Hobby's 5,000 image transformations a month, ships ahead of Phase
O's budget design. `npm run check` green; `npm run visual` 25 of 25 unchanged.

The door. A remote pattern in `next.config.ts` named only a protocol and a host, and Next admits any
query string when a pattern names no `search`. Vercel keys its image cache on the source URL, so
`<photo>?n=1`, `?n=2` and so on were each a new, metered transformation, signed out. The audit could
only call Vercel's half "likely"; one request settled it on production, before this change: a
never-seen `?c501=1` on a real avatar came back `x-vercel-cache: MISS`, age 0.

The premise, checked before narrowing anything. No stored image URL carries a query string (0 of
4,114 rows across every image column). next/image and image-cdn.ts reach only two folders:
`avatars/` (User.photoUrl, written only by updateAvatar) and `uploads/` (posts, letters, Catch-up
answers and uploaded Catch-up pictures, each held there by isUploadedImageUrl or ownedUploadUrls
before it is stored). The Collection, link previews, staging and voice answers all use a plain
`<img>` or nothing. So every pattern now pins `search: ""` and one of those two paths, and the
Collection's full-resolution originals can no longer be asked for at 3,840 px.

Proved after. On the dev server the same avatar with `?n=1` answers 400, as do a Collection original
and a foreign host; the bare avatar and upload answer 200. Signed in as the test account, every
optimizer request on /feed (7), a member's profile (1) and a published Edition (13) answered 200,
and the Collection and directory make none and show no broken image.

Two spellings no pattern can see, measured on both optimizers: a bare trailing `?` and a
`#fragment`. `next dev` keys each as a new entry; Vercel answered both from the bare URL's cached
copy (HIT, the same age), so production is safe from them. That difference went into TRAPS.md
("Serving images"), with the C5-01 shape. The three comments that called this door closed now say
what is open, and OPERATIONS.md's capacity paragraph says what is left.

The pin: `security-regressions.test.mjs` asks Next's own `hasRemoteMatch` over the evaluated config
(L9-01's loader), and a second test feeds it four loose shapes it must catch.

What it does not close. L5-11 stays open: each of today's 164 optimizer photos at each of the 16
permitted widths is still about 2,600 transformations, once per cache lifetime, and it grows with
every avatar. That is the budget design's image unit. Visible: nothing.
