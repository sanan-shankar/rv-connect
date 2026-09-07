# Traps this codebase has already sprung

Facts about this stack that have each cost somebody a session. Every one was learned the hard way
and proved before it was written down. Read this before touching the database, a migration, a
scheduled job, or anything that looks like a race.

Tooling traps — the dev server, screenshots, the `.next` cache — live in `CLAUDE.md` under
"Gotchas". This file is the runtime: Postgres, Prisma, Next, Vercel.

---

## The database

**There is ONE Supabase database behind production and local dev.** No staging. It holds real
member rows. Reads are free; every write you test goes through the app under a throwaway account
created via the normal signup flow, deleted before you finish.

**THE DEMO HAS ITS OWN DATABASE AND IT DRIFTS.** On 2026-08-21 it was found fourteen migrations
behind and would have broken the demo deployment on the next push. Apply every manual migration to
BOTH: `node scripts/dev/run-sql.mjs <file>` and
`node scripts/dev/run-sql.mjs --env .env.demo <file>`. Nothing automates this.

**A rolled-back transaction is the safest way to prove a destructive behaviour** against the shared
database: `BEGIN; DELETE ...; SELECT counts; ROLLBACK;` through `run-sql.mjs`. It is how the group
cascade, the batch-group unique, the retention sweep and the comment-purge rules were each proved
without changing a row.

**`statement_timeout` does not work through Supavisor.** Proved twice: pg ships it as a startup
parameter and the pooler silently drops it. `SHOW statement_timeout` returns Supabase's own `2min`
and a `pg_sleep(3)` under `statement_timeout=1000` runs to completion. Client-side `query_timeout`
IS honoured and is what `src/lib/prisma.ts` sets. Do not add `statement_timeout` back; it would be
configuration that reads like a guard and is not one.

**`CREATE INDEX CONCURRENTLY` cannot be used with `run-sql.mjs`.** It sends the file as one simple
query, which Postgres wraps in an implicit transaction. Plain `CREATE INDEX IF NOT EXISTS` is fine
at this data size.

**`pg_trgm` lives in the `extensions` schema**, and the operator class is schema-qualified in the
migration, so the index does not depend on `search_path`.

**ELEVEN indexes exist that Prisma cannot see**, not the two this entry used to claim. They are
expression, trigram and partial indexes, none of which `schema.prisma` can express, so a
`prisma migrate diff` will always want to create or drop them. **Do not "fix" it, and do not
declare a plain `@@index` in their place** — a plain `@@index([lastSeenAt])` is a *different*
index from the partial one that exists, so adding it makes `migrate diff` propose dropping a live
index and building a worse one. The list, counted from `pg_indexes` on 2026-09-05, lives in the
header of `prisma/schema.prisma` with the migration file each one came from; keep it there rather
than here, so it sits beside the schema it corrects.

**The demo database has only seven of the eleven.** `Place_asciiName_idx`, `Place_name_idx`,
`UserPlace_city_idx` and `User_lastSeenAt_idx` are missing from it — the migrations that created
them predate the demo project, which was created on 2026-08-21. Nothing is broken at demo data
size; it is logged in `docs/planning/bugs.md`. Check both databases before assuming a hand-written
index is everywhere: `node scripts/dev/run-sql.mjs [--env .env.demo] --inline "SELECT indexname
FROM pg_indexes WHERE schemaname='public' AND (indexdef ILIKE '%lower(%' OR indexdef ILIKE
'%gin_trgm%' OR indexdef ILIKE '%WHERE%')"`.

## Prisma

**A partial unique index is sometimes the right instrument and Prisma cannot hold it.** Anything of
the form `UNIQUE (a, b) WHERE status IN (...)` has to be raw SQL, and then it becomes permanent
`migrate diff` noise. The Prisma-expressible alternative — a nullable sentinel column that is
cleared on every terminal transition — fails far worse the first time a transition forgets to clear
it. Weigh both before reaching for either.

**A `@@unique` can be actively harmful where a write assigns positions one row at a time.** Adding
`@@unique([editionId, position])` to `CatchupPrompt` would break its reorder, because swapping two
positions violates the constraint mid-transaction unless the constraint is DEFERRABLE — which
Prisma also cannot express. `UserPlace` takes the unique safely because its writer replaces the
whole set; a reorder does not.

**Do not depend on how an empty array compiles.** `notIn: []` is a tautology today, but a delete
whose scope hangs on that is one ORM upgrade away from silently deleting nothing. Add the clause
only when there is something to put in it.

**Adding a model no longer needs a dev-server restart.** `src/lib/prisma.ts` derives its cache key
from `Prisma.ModelName`, so the client rebuilds itself and logs
`[prisma] schema changed; rebuilding the dev client`. If you ever see
`Cannot read properties of undefined (reading 'findMany')` again, that mechanism has broken.

**npm's suggested audit fix can be a DOWNGRADE.** `npm audit fix --force` would take Prisma from
7.9.1 back to 6.12.0 and break the app. Read what a fix actually does.

## Next.js

**The NextAuth session is a JSON payload, so a `Date` on `session.user` arrives as a string.**
Adding `lastSeenAt: true` to the session callback's select and reading `session.user.lastSeenAt`
in the layout threw `lastSeenAt.getTime is not a function` on every authenticated render
(2026-09-05). `tsc` was happy: the declaration in `src/types/next-auth.d.ts` said `Date`, and
nothing checks that a declaration matches what survives serialisation. Put ISO strings on the
session and parse them at the reader. The only reason this was found in minutes rather than in
production is that `touchLastSeen`'s catch logs loudly in development — the guard CLAUDE.md
argues for, earning its keep.

**`after()` throws SYNCHRONOUSLY outside a request scope** (confirmed against the installed
next@16.3.1 source, error E468). A library function reachable from a non-request caller — a script,
a test, the seed — must use the `try { after(x) } catch { void x() }` shape that `scheduleDrain()`
carries.

**Setting a cookie in a Server Action re-renders the current page and its layouts**, by design, so
the UI reflects the new value. It is in the installed docs
(`01-app/01-getting-started/07-mutating-data.md`, "Cookies"). An action that only writes a cookie
is not free.

**React runs a child's effects before its parent's.** Anything a child needs initialised must not be
initialised in a parent's `useEffect` — the child will always find it missing, and if its deps never
change it will never retry. Module scope runs before every effect in the tree; that is the fix.

**`cache()` from React is the tool for the `generateMetadata` + page double-fetch.** Key it on
STRINGS. `auth()` returns a fresh object per call, so an object argument makes every call a cache
miss and the memo silently does nothing.

**A non-async export in a `"use server"` file breaks every importing route at RUNTIME**, and `tsc`
passes it clean ("Server Actions must be async functions"). Helpers in an actions file must be
module-private. Only `next-devtools`' `get_errors` catches this.

**Adding a plain `{ error: string }` to a server action's return union breaks narrowing** at every
call site. TypeScript synthesises `?: undefined` siblings for an action's own branches, which is
what lets `if (result.error)` then reach `result.comment`. `ActionFailureLike<T>` in
`src/lib/call-action.ts` is the fix; read it before touching it.

**Deleting a route leaves stale generated types** in `.next/types/validator.ts` from an old build,
and `tsconfig` includes them, so `tsc` fails on a route that no longer exists. Move that one
directory aside (`mv .next/types .next/types-stale-<date>`) rather than touching `.next` wholesale,
which another session may be mid-build in.

**Security headers must be gated to production, or Safari cannot load the dev server.** From
2026-08-20 (`b64e44a`) `next.config.ts` sent `Strict-Transport-Security` and the CSP's
`upgrade-insecure-requests` on every response, `next dev` included. WebKit applies
`upgrade-insecure-requests` to `localhost`; Chromium exempts it as a potentially-trustworthy origin.
So Safari re-requested every stylesheet, script and font over `https://localhost:3000`, which speaks
no https at all, and drew bare unstyled HTML -- with no error anywhere but the network tab, while
Brave looked perfect. Both headers hang off `isProd` now. Anything added there that pushes a browser
towards https belongs behind the same gate.

**Two things measured while proving that, so nobody repeats the work.** WebKit correctly IGNORES an
HSTS header that arrives over plain http, verified against a throwaway server on one port and a
second port on the same hostname: no pin is created, so clearing history is never the fix. And the
damage OUTLIVES the fix -- Safari kept serving the broken era from its cache long after the headers
were gone, through hard reloads and dev-server restarts, until Safari > Settings > Privacy > Manage
Website Data > localhost > Remove. If a browser-only failure survives a fix that curl says landed,
suspect that browser's cache before suspecting the code.

**Testing Safari from here means installing WebKit on demand, and deleting it afterwards.**
`PLAYWRIGHT_BROWSERS_PATH=$PWD/.pw-browsers npx playwright install webkit` -- about 300MB, gitignored,
and worth removing once the question is answered. Playwright's `webkit` reproduces Safari's engine;
chrome-devtools MCP cannot, because the whole class of bug is WebKit-versus-Chromium. A clean WebKit
loading the page perfectly is what proved the code innocent and moved the search into Safari's own
stored state. Note also that macOS blocks Safari's storage from the terminal outright (`Operation
not permitted` on `~/Library/Safari`, `~/Library/Cookies`, the Safari container), so that state can
only be read from Safari's own UI.

**`next dev` closes an idle keep-alive connection after six seconds and tells no one** (measured on
this server; `--keepAliveTimeout` exists only on `next start`). Chromium retries such a request on a
fresh socket; Safari reports "the server unexpectedly dropped the connection". Dev responses carry
`Connection: close` so there is never an idle socket to reuse. It does not touch hot reload: a
websocket upgrade never passes through `headers()`.

**A `loading.tsx` covers its own segment AND every segment below it, and the OUTER boundary is
the one that paints.** `letters/loading.tsx` sat beside `letters/page.tsx` and was therefore the
fallback for `/letters/new`, `/letters/<id>` and `/letters/<id>/edit` as well: pressing "Write a
letter" flashed three fake letter cards before the writing desk, and the three per-route skeletons
were dead files that had never once rendered (owner, 2026-08-30: "a lot of the letter loading
skeletons are messed up"). The fix is a route group — the index page and its skeleton move into
`letters/(index)/`, which the URL does not see and the fallback stops at. Eight segments needed it
(`letters/`, `letters/[id]/`, `catchups/`, `catchups/[catchupId]/`, `admin/` and its catchups,
messages and people tables, `collection/`, `messages/`) and seventeen skeletons came back to life.
**`src/lib/loading-boundary-rule.test.mjs` now fails the gate if a loading.tsx ever sits above
another one again**, which is the only reason this stays fixed: it is invisible in a file tree.

**A skeleton nobody can see is a skeleton nobody maintains.** `collection/[id]/loading.tsx` was
still drawing the detail page that the 2026-08-28 viewer rebuild deleted -- a back link over a 4/3
card in a narrow column, for a route that now renders the whole Collection with the viewer open.
Wrong for two days and unnoticeable, because the parent was painting over it. Expect the same of
any fallback the fix above uncovers: look at each one before trusting it.

**A loading frame can be photographed.** Serve only the FIRST FLUSH of the streamed document —
everything from React's `<div hidden id="S:0">` onwards is the resolved page — with JavaScript
disabled so hydration cannot tear down the truncated tree, and the fallback holds still for a
screenshot. `e2e/loading-fallbacks.spec.ts` is the worked example; it asserts rather than
photographs, because which skeleton shows is invisible in a diff.

**`route-bundle-stats.json` stops meaning what you think under
`experimental.turbopackChunking.generateComponentChunks`.** That diagnostic is where
`work/raw/route-js.mjs` and every bundle number in this project's audits come from. Turn the flag
on and every route's `firstLoadUncompressedJsBytes` drops from 774-1,230 KB to 431-440 KB, which
reads as a 65% cut and is not one: the component chunks the flag emits are fetched on the same
page load and simply are not counted as first-load. Measured in a real browser on `next start`,
the same flag made a cold /feed **1.0% heavier** (1,543,943 -> 1,558,255 B decoded). If you ever
change a chunking option, the gate is `performance.getEntriesByType("resource")` against a running
production server, never the JSON. (Audit 2 B9, 2026-09-05; the flag is not set and the experiment
is written up in that audit's ledger.)

## Serving images

**The Collection does NOT downscale, and `toDisplayWebp` will tell you it does.** Two sessions have
now read `src/lib/image.ts:63` -- a well-named, well-commented function whose docblock says *"The
display copy of an uploaded photograph: uprighted, boxed to 1920, WebP at 80"* -- and concluded that
the Collection stores 1920px copies. It does not. That function is the **feed's**, and its only
callers are `/api/upload` and `/api/upload/finalize`. The Collection's real encode is an anonymous
chain inside `contributePhotoDirect` (`src/app/(main)/collection/actions.ts`) using
`storedResizeBox` + `COLLECTION_WEBP_QUALITY`: **full resolution**, bounded only by a 40-megapixel
AREA cap that exists to stop a decompression bomb (audit M16) and touches almost nothing real. The
owner, 2026-09-02, on the second occurrence: *"this is the second time a session has hallucinated
that we're compressing collection photos why??"*

**One exception, added 2026-09-05, because a flat sentence is how the next session gets this wrong
in the other direction.** There are TWO contribute encodes. The direct-to-R2 path is the one above.
The **FormData fallback** at `collection/actions.ts:341-342` does `.resize(1600, 1600)` at q80 --
so a contributor who falls back gets a visibly smaller photograph than one who does not, and is
told nothing. That divergence is a real open question for the owner (2026-09-03 audit §4 #20), not
a design. Say "the direct path does not downscale" rather than "the Collection does not
downscale."

Two habits stop a third time. **Grep for the caller, not the name** -- a function that sounds like
the thing you are looking for is not evidence that it is the thing you are looking for. And **keep
"downscale" and "re-compress" as separate words**: the Collection re-compresses (lossy WebP over
already-lossy JPEG, a second generation) and never downscales, and a sentence that says "compress"
without saying which one is how this error gets made. They are also not interchangeable levers --
measured on the owner's album, capping the long edge at 4K costs the same bytes as dropping to q90
and deletes 60% of a 24MP photograph to do it.


**A PNG carries its EXIF somewhere sharp does not look.** `sharp.metadata().exif` comes back
**empty** for a PNG whose `DateTimeOriginal` exiftool reads without difficulty, and three photographs
in a 1,719-file album were filed undated because of it before anyone noticed -- the contribution
succeeds, so there is no symptom at all. PNG has two places to keep EXIF and libvips reads neither:
the modern `eXIf` chunk (PNG 1.5), and the one Apple and ImageMagick actually write, a DEFLATED
`zTXt` chunk keyed `Raw profile type APP1` holding the TIFF block **hex-encoded**. `exifFromPng` in
`src/lib/exif-date.ts` now finds both and hands the bytes to the same tag walk as every other format;
`exifBlockOf` in `collection-image.ts` is the one place that decides which source to use, so the two
readers cannot disagree about a file. **If you add a format, add it there, not at a call site** -- a
fallback only one reader got would mean a photograph dated in the archive and undated in the file it
hands back.

**Moving the public image host is FIVE changes, not one.** On 2026-08-21 serving moved from
`pub-<hash>.r2.dev` to `images.rishivalley.space`, and pointing `R2_PUBLIC_BASE_URL` at the new one
is only the first:

1. `R2_PUBLIC_BASE_URL` in Vercel (both projects -- the demo has its own).
2. **`img-src` in the CSP** (`next.config.ts`). Miss this and the browser refuses every photograph
   on the site. The only outward sign is a console line; the page just looks broken.
3. **`connect-src` in the same CSP**, because the photo viewer's Download button FETCHES the image
   rather than displaying it, and a fetch is governed by connect-src, not img-src.
4. `images.remotePatterns` in `next.config.ts`, for anything using `next/image`.
5. The addresses already in the database -- six columns across five tables. New uploads write the
   new host; everything written before that does not.

**Keep the old host working in code, not just in DNS.** `publicBaseFor` in `upload-shared.ts`
carries a list of every base this bucket has served from, and both `keyForUrl` and
`isUploadedImageUrl` read it. A URL the code cannot claim is a photograph whose bytes survive its
own deletion, silently and for ever, and nothing anywhere reports it.

**A bucket CORS policy does nothing on the `r2.dev` address.** Cloudflare applies it to custom
domains. That is why the Download button could not work before the move however the policy was
written.

**An R2 lifecycle rule matches a PREFIX, so temporary files must not share a folder with
permanent ones.** A Collection contribution PUTs the untouched original to storage the instant a
file is dropped and deletes it once the display copy exists; an abandoned drop never reaches that
delete. Those originals used to be minted under `collection/<userId>/...`, beside the archive's own
photographs, which made them **unreachable by any cleanup**: nothing in this app can enumerate the
bucket (audit C-063, deliberate), and the one mechanism that could -- a lifecycle rule -- would have
taken the real photographs with it. Sixty were found stranded on 2026-08-28 from a single day of
use, and it was not only wasted bytes: an untouched phone photograph still carries the GPS
coordinates written into it, which is the whole reason the successful path deletes it (M12), and one
was fetched over the open internet returning **HTTP 200**. They stage under `staging/` now.
**The general rule: if a folder can hold something permanent, no expiry rule can ever be pointed at
it.** Decide where temporary bytes live before writing the first one.

**The direct-upload PUT goes to `<account>.r2.cloudflarestorage.com`, not to the public host.** It
needs its own `connect-src` entry. Without one the browser refuses the PUT, the client catches it,
and every upload silently falls back through the server and its ~4.5MB body cap -- which is the one
thing presigning exists to avoid. It was in exactly that state until 2026-08-21.

## Layout

**A Turnstile site key only works on the hostnames listed in Cloudflare, and a Vercel deployment
URL is not one of them.** Every deployment gets its own `rv-alumni-<hash>.vercel.app` address, so
opening an old one to see how the site used to look gives "We couldn't confirm you're human" with
no checkbox to click — `interaction-only` means the widget is invisible when it fails exactly as
when it passes. Cloudflare is saying 110200, "domain not allowed". **An env var will not fix it:
Vercel bakes env vars in at build time, so nothing you change in code or config reaches a
deployment that already exists.** The Cloudflare hostname list is the only lever that applies
retroactively; `vercel.app` is on it now, and `turnstile-origin-rule.ts` is what keeps that safe.

**A flex item with `mx-auto` does not stretch — it shrink-wraps.** `align-self: stretch` applies
only when the cross-size is auto AND the cross-axis margins are not auto; auto margins absorb the
free space instead. Every page root in this app is a direct child of `ContentColumn`, which is a
flex COLUMN, so `mx-auto max-w-[760px]` (no `w-full`) sized the letter desk to its own contents:
an empty letter hugged its toolbar at 510px while a draft with prose in it filled the 760 cap —
the same page, two widths, depending on what had been typed into it (owner, 2026-08-30). The tell
is a box that fits its content suspiciously well. Write `mx-auto w-full max-w-*` on anything that
is a page root, and remember that percentage-width children (`w-3/4`, `w-full`) contribute NOTHING
to a shrink-to-fit width, so an all-percentage skeleton inside one collapses to its own padding.

**`overflow-hidden` on a wrapper that is usually empty costs you a `space-y` gap.** Hidden overflow
makes the element a block formatting context, and a BFC stops margins collapsing THROUGH it. The
Turnstile holder is 0px tall for everyone Cloudflare waves past, so rounding its corners with
`overflow-hidden rounded-*` made the login form's `space-y-3` pay 12px twice instead of once: the
form grew 12px and, being centred, every row slid 6px (measured 206px against 218px). Use
`clip-path: inset(0 round <radius>)` when you only want the corners — it paints identically and
does not touch layout. Nothing but `npm run visual` caught this; the page it broke was the one
nobody was looking at, because the widget it belongs to is invisible.

## Testing

**A testable module must have no relative VALUE imports.** `node:test` cannot resolve an
extensionless `./utils`, and `tsc` refuses `./utils.ts` without `allowImportingTsExtensions`.
Type-only imports are fine. If a pure module genuinely needs a helper, inject it as a parameter —
`contact-rows.ts` does. `node:test` cannot load a `.tsx` file at all; extract the pure part.

**Pin the property, not the instance.** A shape assertion that greps for a literal
(`/targetBatches/`) breaks the day the code is refactored into a shared helper, and the refactor was
an improvement. `cascade-rule.test.mjs` walks the whole Cascade graph rather than checking the two
columns an audit named; `valley-day.test.mjs` sweeps every file for a date rendered without a time
zone. Write them that way.

**A red `npm run visual` is a question, and the answer is in the pixels, not the picture.** A diff
image can look alarming when nothing has moved. Decode both PNGs and compare row by row — `node -e`
with `pngjs` gives the real answer in seconds, including the case where a page is simply N pixels
shorter and every shared pixel is identical.

**`Intl.Segmenter` is the right instrument for cutting text**, and it must be constructed ONCE at
module load. Constructing an Intl object is the expensive part of using one, and `getInitials` runs
per avatar.

## Working here

**Another session may share this checkout.** Stage by name, never `git add -A`. It has gone wrong
from both directions: uncommitted work swept into someone else's commit, and a file staged by name
for one reason carrying an unrelated edit with it. Check `git status` before staging.

**Avoid backticks in `git commit -m` strings** — zsh eats them. Use a heredoc.

**`npm run check` and a subagent's own gate at the same time will kill the process** (OOM, exit
137). Tell every agent explicitly not to run the full gate; give it `npx tsc --noEmit`,
`npx eslint <files>` and `node --test <files>` instead. Serialise the heavy gates.

**An agent's "passing" is a claim, not a result.** Two agent reports in one session each contained a
real defect — a hash function copied into a second file, and a security check dropped from a
rewritten query — and both had passed every gate. Read the diff yourself.

**A report can be right about the mechanism and wrong about the consequence.** Verify the scenario,
not just the mechanism, before changing code. And check a "confirmed live" clash against the data
that produced it: one substring-match finding reproduced perfectly against real rows, and the rows
turned out to be two names for one city that the code aliases on purpose.
