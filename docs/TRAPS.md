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

**Two expression indexes exist that Prisma cannot see** — `lower(email)` on User and
`lower(city)`/`lower(asciiName)` on Place/UserPlace. `migrate diff` will always want to recreate
them. Do not "fix" it.

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

**`.pw-browsers/` holds a WebKit build, and it is the only way to test Safari from here.**
`PLAYWRIGHT_BROWSERS_PATH=$PWD/.pw-browsers` with playwright's `webkit` reproduces Safari's engine;
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

## Serving images

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

**The direct-upload PUT goes to `<account>.r2.cloudflarestorage.com`, not to the public host.** It
needs its own `connect-src` entry. Without one the browser refuses the PUT, the client catches it,
and every upload silently falls back through the server and its ~4.5MB body cap -- which is the one
thing presigning exists to avoid. It was in exactly that state until 2026-08-21.

## Layout

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
