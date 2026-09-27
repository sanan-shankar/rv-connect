# Charter: shell-ui-guide (T09)
Report: `work/agents/shell-ui-guide.md`. See `_header.md`.

## Territory (read every file in full)
- `src/components/layout/**` (13 files, ~2,695), `src/components/ui/**` (16, ~1,757 — the shadcn
  set), `src/components/guide/**` (12, ~824, incl. the `chapters/index.tsx` barrel),
  `src/components/pwa/**` (2, ~328), `src/components/demo/**` (1)
- `src/app/layout.tsx`, `error.tsx`, `not-found.tsx`, `globals.css` (690 lines),
  `tailwind-theme.css`, `manifest.ts`, `robots.ts`, `sitemap.ts`, `icon.svg`, `apple-icon.png`
  (T10 owns the art), `src/app/(main)/layout.tsx`, `template.tsx`, `error.tsx`, `forbidden.tsx`,
  `about/**`, `guide/**`, `(policies)/**`, `src/app/lab/layout.tsx` (read for what the shell shares)
- `src/lib/`: `back-closes.ts` (224), `edge-light.ts` (145), `utils.ts` (551)

## Specs and context
`docs/spec/DESIGN-SYSTEM.md` (all of it), `docs/spec/guide.md`, `docs/spec/apple-edge-light.md`.
Commits: `9c018561` (the header glass rests in the bell's circle and opens as a pill), `d632b8f3`,
`efb95a3e` (feed bell in the top bar), `0651abd3`, `334d7907` (back closes overlays),
`c2ac10f4`.

## Leads from the orchestrator
- `globals.css`: audit 2 found no dead tokens; three weeks of work since. Grep every `--token` for
  a consumer (src + lab). Same for `tailwind-theme.css`.
- `src/components/ui/`: which of the 16 shadcn files are imported by nothing outside `ui/`?
- `edge-light.ts` in shipped `src/lib`: is the Apple edge-light experiment shipped, or lab-only
  (then it belongs beside the lab)?
- `template.tsx` under `(main)`: why a template and not a layout? What does it cost per navigation?
- `utils.ts` at 551 lines: a grab-bag? List its exports with caller counts.
- The guide chapters barrel: does it defeat tree-shaking for the guide's chunk?
- Search: the header pill and its data path (`api/users/search` etc. are T05/T12); is there a
  second search UI anywhere?

## Questions
1. What every route pays for in the shell (`(main)/layout.tsx`): each client component mounted on
   every page, with its bundle cost (L03 will measure; you say what is there and why).
2. The six signatures per file.

## Cross-lens leads (from the tracked-weight report, landed 02:13 — confirm, do not assume)
- `src/components/layout/app-shell.tsx:66` (anchor: the `.valley-tree` backdrop) references the 498 KB
  hero JPEG through a raw CSS `url()` at 9 % opacity on every member's first signed-in page — a
  dedicated small export is the lens's finding 06; you own the shell, so say what the backdrop is for
  and whether it needs the hero at all.
