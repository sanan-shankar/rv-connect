# shell-ui-guide - refactor audit 3 report

PARTIAL (checkpoint written mid-audit per _launch.md step 6; the final version replaces this).

Charter T09: the app shell (`src/components/layout/**`), the shadcn ui set (`src/components/ui/**`),
the guide (`src/components/guide/**`, `src/app/(main)/guide/**`, `about/**`), the PWA pieces
(`src/components/pwa/**`), the demo bar, the root app files, the `(main)` layout/template/error/
forbidden, `(policies)/**`, `src/app/lab/layout.tsx` and three libs (`back-closes.ts`,
`edge-light.ts`, `utils.ts`). Date 2026-09-24, HEAD `70570bcd`.

## Coverage (so far)
- Read fully: all 13 layout files, all 16 ui files except select/combobox/sonner/field-focus/
  focus-recipe.test (pending), all 12 guide files, both pwa files, demo-bar, root layout/error/
  not-found/globals.css/tailwind-theme.css, (main) layout/template/error/forbidden, about, guide
  pages, (policies) layout + _shared. Pending: utils.ts, back-closes.ts, edge-light.ts, the three
  policy pages, manifest/robots/sitemap/icon.svg, lab/layout.tsx.
- Uncommitted edits seen: none in territory.

## Findings drafted so far (titles only; full text in the final report)
1. The base-ui Button chain rides three first-load chunks; make the two root boundaries and
   dialog.tsx stop importing it (buttonVariants into a non-client module).
2. ui/input.tsx wraps base-ui Field.Control for nothing.
3. Two notification bells mount on /feed; each registers its own focus refresh.
4. InstallPromptCapture suppresses Chrome's install banner for every member; tile is admin-only.
5. ui/separator.tsx has one importer; fold into DropdownMenuSeparator, drop two custom variants.
6. Five hand-rolled pub/sub module stores.
7. SidebarUser.email never read; dialog DialogTrigger/showCloseButton dead; guide-areas href dead.
8. Stale comments (focus ring, accent hover, guide sidebar door, unread-store two-bells, etc.).
9. Guide Doorway / guide index / demo-bar hover-moves and hand-rolled CTAs.
10. --accent-foreground dead token; --primary duplicates --leaf; z-token migration went backwards.
