# Live naughty-strings pass (orchestrator, chrome-devtools, 2026-09-24 02:20–08:00 BST, with a gap 03:05–07:50 for the usage limit)

Account: "Audit TestBird" <sanan.shankar+audit3@gmail.com>, alumnus, batch 1980, email UNCONFIRMED for
the whole pass. Everything a Stage-0 member can type was driven through the real UI or a same-origin fetch
from the signed-in page. Write paths that need a confirmed member (posts, comments, letters, Catch-up
answers and questions, captions, contributions, messages to admins, reports) were NOT exercised live: the
account cannot be confirmed without reading a mailbox or writing SQL, and writing as Jerry would put text
in front of real members. Those inputs are argued from code by T1/T2b/T4a/T4b and the L6 lens.

| Surface | Input | Result | Verdict |
|---|---|---|---|
| Signup register step | Joined/Left/Batch 1968/1980/1980, consent | account created, joined Batch of 1980 group, verify row queued | clean |
| Onboarding "Occupation" | `O'Brien <b>bold</b> &amp; "quotes" 🐦‍⬛ test` | stored verbatim, title-cased to "…Test"; rendered as literal text (escaped); ZWJ bird one glyph | clean (escaping); note: titleCase alters a typed occupation |
| Onboarding "Organisation" | `Org U+202E reversed U+202C end` | stored with the controls; rendered "Org desrever End" | bidi controls stored and rendered raw |
| Onboarding admission number | 10001 | refused client-side (native max 10000) | clean |
| Onboarding admission number | 10000 | stored | clean |
| Onboarding houses step | Save & continue | (main) layout threw "timeout exceeded when trying to connect" → "Something went wrong"; Try again re-ran into it | O-03 family (pool exhaustion, one member) |
| Feed like (unconfirmed) | heart tap | refused: "Confirm your email address before you post. We sent you a link when you joined." | gate holds; copy says "post" for a like |
| Directory search (unconfirmed) | "Ananya" | "3 results" + "Confirm your email to browse the people" | names withheld; MATCH COUNT disclosed (V-O-A) |
| Directory search | Back after a search | URL unfiltered, "223 people", pill still "Ananya", People tab kept | T6-04 confirmed |
| Directory count | — | 223 = 221 members + anonymous system row + TestBird | T6-05 confirmed |
| Feed search URL | `%_'"<script>alert(1)</script>` | 200, rendered escaped | clean |
| Feed search URL | `a U+0000 b` | loadPosts 500 (Postgres 22021), toast "Check your connection", body "No posts match your search" | **O-06** |
| Directory search URL | `a U+0000 b` | `user.count()` 22021 | **O-06** |
| Collection search URL | `a U+0000 b` | `photo.findMany()` 22021 | **O-06** |
| Places search API | `Ban U+0000 g` | `$queryRaw` 22021, bare HTTP 500 | **O-06** |
| Places search API | `%%%%`, `____`, `Ban\`, 5,000×B, RTL, `O'Hare` | all 200, 0 rows (wildcards escaped, clamp holds) | clean |
| Directory URL | `?q=` 300×A + U+202E | 200, clamped | clean |
| Directory URL | `?type=xyz` | chip "xyz" drawn over the whole membership | T6-15 confirmed |
| Collection URL | `?q=` 8,000 chars | 200, "Nothing here yet" | clean |
| Collection URL | `?q=` 20,000 chars | 431 from the server before the app (header too large) | a shared link nobody can open; nothing worse (T4b-12) |
| Collection URL | `?when=9999&order=taken`, `?cursor=off~1e12`, `?scope=admin` | 200, valley river | clean fallbacks |
| Collection bucket press | "Birds" | ONE request (the action POST); no RSC refetch | T4b-08 refuted (main claim) |
| Profile "What you do" | 110 characters | input accepts (maxLength 120); save says "That is too long." (server 100) | T6-12 confirmed |
| Profile "About" | text with U+0000 | `user.update()` 22021; "That did not save. Check your connection." | **O-06 on a write path** |
| Profile name | `Audit U+202E TestBird` (unclosed) | stored (bytes e2 80 ae); page heading AND sidebar chip render "Audit driBtseT" | **V-O-B: a member's displayed name can spoof another string** |
| Contacts: phone | default "+91" box + `09845033712` (the printed Indian mobile form) | stored `+9109845033712` — the trunk zero kept after the country code, not a diallable international number | **V-O-C (commoner cousin of T6-09)** |
| Contacts: email row | (untouched) | the row shows the LOGIN address; the save stamped `displayEmail` with it | T6-06 confirmed |

Unresolved in the browser: none left open. Restored after the pass: name "Audit TestBird", occupation
"Auditor", About empty. The account is deleted in the close-out.

## Executed (not browser) — the sign-in `?next=` sanitizer, 2026-09-24 08:58 BST
The real `safeNextPath` (`src/lib/next-path.ts`) imported under Node 26 with `--experimental-strip-types`, fed
each payload through `URLSearchParams` exactly as the page reads it, and the result resolved against
`https://rishivalley.space/login`:
`//evil.example`, `/\evil.example`, `%2F%2Fevil.example`, `%252F%252Fevil.example`, `/%09/evil.example`,
`javascript:alert(1)`, `/%2F/evil.example` → all fall back to `/feed`. Accepted and still same-origin:
`/..//evil.example` (resolves to host rishivalley.space, pathname `//evil.example`, which Next's repeated-slash
redirect then normalises), `/∕evil.example` (U+2215) and `/／evil.example` (U+FF0F) (percent-encoded path
segments), `/ /evil.example`, a 10,000-character path. No payload leaves the origin. Caveat for the fix
sessions: any code that resolves a `next` value and then re-emits only its `pathname` as a Location would turn
`/..//evil.example` into the protocol-relative `//evil.example`; none does today (T8b-10 covers the proxy's `//`
admission). Verdict: clean.
