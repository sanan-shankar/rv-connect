# config-ui - adversarial verification notes (refactor audit 2)

Verifier charter: globals.css, Tailwind, next.config, package.json, the shadcn `ui/` primitives.
Tree state when verified: HEAD = `74cc61a` ("fix(retention): notifications are kept 30 days,
everywhere"), exactly **one** commit past the audit baseline `72b5a1d`, and that commit touches
retention, not anything in this cluster. `git status --short` clean for `src/app/globals.css`,
`src/components/ui/`, `next.config.ts`, `package.json` (the `image-viewer.tsx` WIP noted in the
session-start snapshot is gone; `git show HEAD:...image-viewer.tsx` line 542 is the same line the
findings cite). `src/app/globals.css` is byte-identical to the copy in both scratch build
worktrees, so every build measurement below is measuring today's source.

Findings verified: bundle-build-02, bundle-build-10, dead-code-04, dead-code-08,
dependency-diet-01, lab-02, shell-primitives-04, -05, -06, -08, -10, -11.

---

## The CSS pair: lab-02 vs bundle-build-02 (they overlap; lab-02's number is the right one)

**Ground truth I re-measured myself.**

| chunk | raw | gzip -9 |
|---|---|---|
| `.scratch/audit2-build/.next/static/chunks/32v74upyu8cz7.css` (with lab) | 238,434 | 33,684 |
| `.scratch/audit2-build-nolab/.next/static/chunks/2y2xr433bn8gd.css` | 164,037 | 24,937 |
| delta | **-74,397 (-31.2 %)** | **-8,747 (-26.0 %)** |

The experiment is clean: `diff -rq --exclude=node_modules --exclude=.next --exclude=.git`
between the two worktrees reports only `Only in audit2-build/src/app: lab` and
`Only in audit2-build/public: lab` (the latter is 1.9 MB of `.webp` only, which Tailwind does
not scan). `docs/`, `progress.md`, `scripts/` and `e2e/` are present in BOTH, so the delta is
purely `src/app/lab/**`.

I then diffed the two sheets at rule level (brace-depth parser, leaf rules only):
**3,134 leaf rules with lab, 2,109 without; 1,043 rules / 73,787 bytes present only in the lab
build** (18 rules / 4,172 bytes exist only in the no-lab build, because Tailwind merges selector
lists differently when a class disappears — e.g. `.text-cinnamon,.text-cinnamon\/65` collapses).
73,787 - 4,172 + separators reconciles with the 74,397-byte file delta.

I confirmed the sheet really is on every page: `grep -rlo "32v74upyu8cz7.css" .next/server/`
returns **100** route manifests, including `/`, `(auth)`, `(policies)`, `(main)/feed`, i.e. the
signed-out landing page too.

**Tailwind 4.2.2** (`node -p "require('./node_modules/tailwindcss/package.json').version"`), and
the negated-source syntax exists in this build: `node_modules/tailwindcss/dist/lib.js` parses
`@source` and pushes `{base, pattern, negated: N}`. So `@source not "./lab"` is real here.

`scripts/qa/lab-audit.mjs` only walks for `page.tsx` (`else if (entry === "page.tsx")`, line 45),
so adding `src/app/lab/lab.css` cannot trip the lab-registry gate. Both reports say this; both
are right.

### bundle-build-02's two corrections

1. **Its lab number is ~13.6 KB low.** It attributes 874 rules / 60.8 KB raw / 7.2 KB gz to
   lab, from a token-classification heuristic. The direct build diff — which is exactly what
   `@source not "./lab"` does — says 1,043 rules / 74,397 B raw / 8,747 B gz. A
   token classifier that says "this class also appears in a non-lab file" over-keeps, because
   Tailwind's extractor and a whitespace tokenizer do not agree on candidates. Use lab-02's
   figure.
2. **Its docs number is inflated, and two of its five examples are wrong.** The MECHANISM is
   real and I confirmed it: Tailwind scans markdown at the project root, and
   `h-[86dvh]` (only in `progress.md:3167`), `min-w-[640px]` and `pt-[106px]` appear **nowhere**
   in `src` yet are compiled into the shipped sheet. But `-mb-[58px]` is
   `src/app/lab/profiles/_variant-terrace.tsx:313` and `h-[188px]` is
   `src/app/lab/landings/_variant-noticeboard.tsx:716` — both are lab source, not docs. A strict
   lower bound (a rule whose class does not appear as a literal substring anywhere under `src`)
   gives **26 rules / 1,749 bytes**, not 51 rules / 5.1 KB. So step (1) is still worth doing —
   it is one word on line 1 and it stops every future audit report from growing the production
   stylesheet, which is a genuinely funny failure mode — but it buys ~1.7 KB raw, not 5.1 KB,
   and the two steps are not additive the way the finding adds them (74,397 already contains
   everything lab).

### Which set of steps is safer

lab-02's. bundle-build-02's step 2 proposes `@import "tailwindcss/utilities.css" layer(utilities)
source("./")` inside `lab.css`; lab-02 proposes `@import "tailwindcss" source(none); @source "./";`
plus `@reference "../globals.css";`. Both are guesses at the incantation (both say so), but
lab-02's is the documented v4 shape and it states the failure mode honestly (`@reference` may
pull more than the theme). Merge them as: **lab-02's mechanism + bundle-build-02's
`source("../")` on line 1**, quoting lab-02's 74.4 KB / 8.7 KB as the saving.

---

## bundle-build-10 and dead-code-04 (the `.hoopoe .wing` block) - both need the same correction

Exact lines at HEAD: comment `672`, rules `673-681`. dead-code-04's `672-681` is right;
bundle-build-10's `673-682` includes a blank line and drops the comment.

Compiled cost, measured: the five rules occupy **304 bytes** in the shipped sheet
(`grep -o '\.hoopoe[^{]*{[^}]*}'`). bundle-build-10 said ~350; close enough.

The shipped-login half of the claim is CONFIRMED: `/login` renders
`src/components/mascot/hoopoe.tsx:1354`, `className={\`hoopoe-mascot ${className}\`}`, and that
component ships its own `<style>` (`:1493-1501`, `.hoopoe-mascot [data-part]{transform-box:
view-box !important}` …). `.hoopoe` never matches `.hoopoe-mascot`. Nothing in
`src/components/auth/**` sets a `hoopoe` class.

**But the block is NOT unreferenced.** `/lab/v2` — the room CLAUDE.md calls "the approved look" —
renders it:

- `src/app/lab/v2/page.tsx:40` `<svg className={\`hoopoe${covered ? " covered" : ""}\`} …>`
- `:50-51` `<circle className="eye" …>` ×2
- `:54-55` `<path className="wing wing-l" …>` / `"wing wing-r"`

Its own inline stylesheet (`:786-790`) redeclares `.hoopoe .wing { transition }`,
`.hoopoe .wing-l/-r { transform-origin }` and the two `:not(.covered)` rotations — but it does
**not** declare `.hoopoe .eye { transition: opacity … }`, `.hoopoe.covered .eye { opacity: 0 }`,
or `transform-box: view-box`. Delete globals.css:673-681 outright and `/lab/v2`'s eye-cover
delight stops working (the eyes never hide), and its `transform-origin: 24px 37px` values —
which are view-box user units — lose the `transform-box` they were written against.

So: right that no member downloads a byte they use; wrong that it is dead. The fix is
**move, not delete**: lift the `.eye` pair and `transform-box: view-box` into lab/v2's own
`<style>` string, then remove all five rules from globals.css. Same saving, no lab regression.
Note also that neither finding's proposed gate would have caught this — `npm run visual` has no
lab route in `ROUTES`, so a fix session must open `/lab/v2` as admin and type in the password
field.

### dead-code-04's second half (the token pairs) - clean confirm

`grep -n` in `src/app/globals.css` gives exactly the cited lines: `27`
`--color-accent-foreground`, `33` `--color-primary-foreground`, `44` `--radius-3xl`, `107`/`281`
`--primary-foreground`, `146`/`294` `--accent-foreground`. Consumers in `src` outside
globals.css: `primary-foreground` **0**; `accent-foreground` **0** (all six grep hits are
`sidebar-accent-foreground`, a different, live token, used at `layout/sidebar.tsx:218,279` and in
`lab/spine-marker`); `rounded-3xl` **1**, and it is a specimen row in `src/app/lab/craft/
page.tsx:500` — which is why the finding correctly marks `--radius-3xl` as optional.
"~17 lines" checks out: 10 (block + comment) + 7 token lines.

---

## dead-code-08 == shell-primitives-06 (three dead Button variants) - confirmed, duplicates

Same three lines, and the line numbers are exact at HEAD: `button.tsx:113` `link:`, `:130`
`"icon-xs"`, `:132` `"icon-lg"`.

Exhaustive grep over `src` (lab included), `e2e/`, `scripts/`, every `*.test.mjs`:
`variant="link"` / `variant: "link"` → 0; `icon-xs` → 0 outside the definition; `icon-lg` → 0
outside the definition. `buttonVariants` has three real consumers
(`posts/create-post-form.tsx:1096,1130`, `catchups/home/library-picker-dialog.tsx:35-36` via
`VariantProps`), none of which names the three. No QA script or test pins them
(`grep '"link"\|icon-xs\|icon-lg' scripts/qa/*.mjs` → nothing). TypeScript is the gate, as
shell-primitives-06 says.

The two reports disagree on the contrast counts (dead-code-08: `primary` 64, `outline` 62;
shell-primitives-06: 68 and 76) and on **Class** (cheap vs structural). Immaterial; take
shell-primitives-06's write-up, it is the more careful one (it names the `focus-recipe.test.mjs`
pin and the DESIGN-SYSTEM §3 reason `link` would be *wrong* if used).

---

## dependency-diet-01 (drop the `shadcn` package) - confirmed, one line-number nit

I reproduced the lockfile reachability myself (npm hoisting honoured, walk from root deps,
subtract the graph reachable without `shadcn`):

```
total reachable 1082 · without shadcn 848 · exclusive to shadcn 234
```

**234 exactly**, matching the finding, and 234/1082 = 21.6 % exactly. Top exclusive packages
also match: `@ts-morph/common`, `web-streams-polyfill`, `msw`, `@modelcontextprotocol/sdk`,
`shadcn/node_modules/zod`, `tldts`, `@noble/curves`. Size: `du -sck` over the 234 paths gives
**81 MB** (and that double-counts nested `node_modules`); summing apparent file bytes excluding
nested trees gives 61 MB. The finding's **92.3 MB is high** — call it 60-80 MB. `du -sh
node_modules/shadcn` = 6.2 M, matching its own row.

`postcss-selector-parser`: I searched every package entry in the lockfile for a dependent —
exactly one, `('node_modules/shadcn', 'dependencies', '^7.1.0')`. So the override at
`package.json` overrides really does become parentless. Confirmed.

The variant table is exactly right. Counted in `src` (lab included):
`data-open` 1, `data-closed` 4, `data-disabled` 6, `data-horizontal` 2, `data-vertical` 2,
`data-checked`/`data-unchecked`/`data-selected`/`data-active`/`no-scrollbar` **0**. The
`separator.tsx:17` breakage it warns about is real — that one line is the only user of
`data-horizontal`/`data-vertical`, and those two map to `[data-orientation="…"]`, which no
native Tailwind `data-*` variant produces.
`grep -c "accordion-down\|accordion-up\|no-scrollbar"` on the built sheet = **0**, as claimed.

Copy ranges verified against `node_modules/shadcn/dist/tailwind.css` (95 lines): `data-open`
28-33, `data-closed` 35-40, `data-disabled` 62-67, `data-horizontal` 76-80, `data-vertical`
82-86. The finding's 28-41 / 62-68 / 76-87 are those blocks plus their trailing blank lines —
fine.

Nits: `"shadcn": "^4.1.0"` is `package.json:**83**`, not `:82`. Lockfile has 1083 `packages`
entries including the `""` root, so "1,082" is the dependency count, correct. `components.json`
history is exactly one commit (`d4ce9c4 feat: initial commit`) — confirmed. Nothing in
`scripts/`, `.github/` or `docs/OPERATIONS.md` references the package; the only two mentions
anywhere are `components.json:2` (`$schema` URL) and `CLAUDE.md:111`, both of which the
finding's step 5 already handles.

---

## shell-primitives-04 (`ui/card.tsx`) - confirmed, but two counts are wrong

Confirmed: the ONLY importer of `@/components/ui/card` in `src`, `e2e` or `scripts` is
`src/app/lab/location-picker/page.tsx:5` (the second grep hit,
`lab/everything/_findings.ts:601`, is a quoted string inside an evidence blob). `<CardHeader`,
`<CardTitle`, `<CardDescription`, `<CardContent` occur **8 times total, all 8 in that one lab
file**. `card-action`: one occurrence in the whole repo, the selector at `card.tsx:28` itself,
so `has-data-[slot=card-action]:grid-cols-[1fr_auto]` can never match — confirmed dead.
`<Card … size=` → **0** call sites, so the `size="sm"` variant and its four
`data-[size=sm]:` / `group-data-[size=sm]/card:` clauses (`:15,:28,:41,:63`) are dead —
confirmed. 75 lines — confirmed.

Corrections:
- **`card-elevated` is in 54 non-lab `.tsx` files, not 70.** 71 files repo-wide including lab.
  The finding's headline ("70 files hand-write its class string") and its body ("58 of them
  alongside `border` and `bg-card`") both over-count: of the 54 non-lab files, **51** also
  contain `bg-card`.
- Worth knowing before anyone greps: the many `<Card …>` hits under
  `src/app/lab/groups-rethink/**` are a **different** component,
  `export function Card` at `src/app/lab/groups-rethink/_shell.tsx:241`. They do not affect the
  claim, but they will look like counter-evidence to a fix session that greps for `<Card`.

Option (c) (delete the `card-action` selector and the whole `size="sm"` variant, keep the file)
is the safe autonomous slice and does not touch a lab room.

## shell-primitives-05 (thirteen pass-through wrappers) - confirmed count, refuted "one place"

The count is exact. Thirteen functions whose body is `<Primitive data-slot="x" {...props} />`:
`dialog.tsx` 3 (`:10-20`), `dropdown-menu.tsx` 2 (`:8-14`), `sheet.tsx` 4 (`:10-24`),
`popover.tsx` 3 (`:17-27`), `combobox.tsx` 1 (`:55-57`). The line ranges are right. The drift it
points at is real: `select.tsx:11` and `combobox.tsx:21` are bare `const X = Primitive.Root`
re-exports.

Two corrections, one of them load-bearing:

1. **`data-slot` is read in five places, not one, and three of them are outside CSS.** Live
   query selectors in ledgered QA tooling (`scripts/README.md:117-119`):
   - `scripts/qa/hover-probe.mjs:73` `'[data-slot="dropdown-menu-trigger"]'` ← **set only by one
     of the thirteen pass-throughs** (`DropdownMenuTrigger`)
   - `scripts/qa/hover-probe.mjs:74` `'[data-slot="dropdown-menu-item"]'`, `:86`
     `'button[data-slot="button"]'`
   - `scripts/qa/theme-shots.mjs:68` `'[data-slot="dropdown-menu-trigger"]'` ← same wrapper
   - `scripts/qa/drive.mjs:600` `'[data-slot="popover-content"]'`
   Option (a) as written (bare re-exports) therefore breaks `hover-probe.mjs` and
   `theme-shots.mjs` silently — neither is in `npm run check`, so the stated gate would pass.
   A fix session taking option (a) must either keep `DropdownMenuTrigger` as a wrapper or
   re-point those two selectors.
2. In CSS there are **three** `data-[slot=…]`/`has-data-[slot=…]` selectors, not two:
   `select.tsx:44` (live), `card.tsx:28` `has-data-[slot=card-action]` (dead, per -04) and
   `card.tsx:28` `has-data-[slot=card-description]` (live inside the lab room). And the kit
   stamps **54** `data-slot` attributes across `src/components/ui/*.tsx`, not "~30".

Option (b) — document the attribute and make the folder self-consistent — survives both
corrections intact and is the safer branch.

## shell-primitives-08 (`ui/combobox.tsx`) - confirmed; it recommends keeping

167 lines, one `export { … }` block listing exactly **10** names (`Combobox`,
`ComboboxInputGroup`, `ComboboxInput`, `ComboboxPortal`, `ComboboxPositioner`, `ComboboxPopup`,
`ComboboxList`, `ComboboxItem`, `ComboboxEmpty`, `ComboboxStatus`). The only importer is
`src/components/common/location-picker.tsx:19`; the other two grep hits
(`ui/menu-material.ts:5`, `common/filters/pill-shell.tsx:77`) are prose in comments. Saving as
stated: 0, recommendation is keep. Nothing to fix; carry it as a not-finding.

## shell-primitives-10 (z-index tokens) - confirmed exactly

`globals.css:50-56` is the comment (`50-53`, "Migrate ad-hoc z-* values onto these as they're
touched") plus `--z-elevated: 10` / `--z-floating: 30` / `--z-overlay: 50`. Non-lab consumers,
all four and no others: `catchups/answer/progress-rail.tsx:142` (`--z-elevated`),
`ui/combobox.tsx:74` (`z-(--z-floating)`), `collection/contribute-room.tsx:745` and
`common/image-viewer.tsx:542` (`--z-overlay`). Counts 1 / 1 / 2 — confirmed. The raw values it
lists are all present and at the cited lines: `dialog.tsx:39,66` z-50; `sheet.tsx:35,71` z-50;
`dropdown-menu.tsx:34,44` z-50; `select.tsx:90,100` z-50; `popover.tsx:40` z-50;
`sidebar.tsx:622` z-10, `:671` z-40; `konami-eggs.tsx:68` z-[120]. The values are identical to
the tokens, so the migration is textual, as it says.

## shell-primitives-11 (`--space-xxl`) - confirmed

`globals.css:89` `--space-xxl: 4.236em;`. Seven `var(--space-xxl)` hits in `src`: six in
`app/lab/**` (`landings/_variant-postcard.tsx:324,481,602`,
`profiles/_variant-dossier.tsx:450,519`, `profiles/_variant-terrace.tsx:652`) and exactly one
non-lab, `src/components/landing/showcase.tsx:154`. `showcase.tsx` is line 7 of
`raw/knip-repo-config.txt`'s unused-file list. Other rungs, occurrences outside lab: xxs 10,
xs 41, s 77, m 108, l 90, xl 25 (the finding says 78 and 92 for s and l — file-vs-occurrence
counting, immaterial). Correctly gated on the audit-1 landing-showcase owner decision.

---

## Cross-cluster notes for the compiler

- **bundle-build-02 and lab-02 are the same lever.** Ship lab-02's numbers and mechanism; fold
  in bundle-build-02's `source("../")` as a separate one-word step with a corrected ~1.7 KB
  saving. Do not add 60.8 + 5.1 and call it 65.9.
- **dead-code-08 and shell-primitives-06 are the same three lines.** One item.
- **bundle-build-10 and dead-code-04 overlap on the hoopoe block.** dead-code-04 has the right
  line range and carries the extra token findings; both need the `/lab/v2` correction and both
  proposed gates miss it.
- **shell-primitives-04 and -05 are coupled**: -05's "the attribute is read in one place" leans
  on -04 calling `card.tsx:28` dead. Only `has-data-[slot=card-action]` is dead there;
  `has-data-[slot=card-description]` is live in the lab room.
