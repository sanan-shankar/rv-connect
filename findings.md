# Findings

## Current-state diagnosis (2026-06-26, from screenshots 20–26)
- **Landing**: evocative full-bleed valley photo, but headline/subtitle have no scrim → low
  contrast, hard to read. Plain white pill buttons. Feels unfinished.
- **Login / Signup**: render in DARK mode (headless Chrome reports dark OS pref + root layout
  `defaultTheme="system"`). One faint card in a near-black void (#0E1510). This is the
  "my computer's almost off" deadness. Signup uses a static owl on a trivia gate.
- **Feed / Directory / Profile**: a fixed blurred valley photo sits behind everything; cards are
  translucent glass (`bg-white/55 backdrop-blur-md`) → they dissolve into the blur. Result is the
  muddy "gray-green slob": no solid surface, low contrast, washed text. Single narrow centered
  column with dead space L/R. Top nav, not sidebar. Profile = bare letter-circle + name, no bio.

## What's good (keep)
- Next.js 16 + Prisma + features (posts, polls, groups, directory, mentions, reports) are solid.
- **Email+password auth is already implemented locally** (credentials provider + admin bypass).
  Production still emails magic links only because the new code isn't deployed to Vercel.
- Libre Baskerville (display) + Source Sans 3 (body) are already wired via CSS vars.
- LiftKit golden-ratio spacing tokens already in globals.css.

## Design tokens today
- Light: bg #F5F0E8, card #FFFFFF, primary #22A845 (electric green), ink #1A1A2E.
- Dark: bg #0E1510, card #151D18, primary #34C759.
- `.glass` = bg-white/55 dark:bg-white/[0.06] backdrop-blur-md (the muddy culprit).

## Tooling notes
- Puppeteer's bundled Chrome download is broken (448K, incomplete extraction). Use system Chrome:
  `PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"`.
- Admin user id (local dev.db): cmmz0vvws0000ynsg3ueb9scp (name "sanan", role admin).

## Subject research — Rishi Valley (design fuel)
Krishnamurti's valley school in Andhra Pradesh. Motifs: the ancient banyan, Rishi Konda hill,
bird-watching (hoopoe = founder's favourite bird; parakeets), rocky scrub-valley landscape,
hand-loom textiles, contemplative minimalism, study under trees, houses (e.g. "Krishna").
Aesthetic target: boutique, intimate, naturalist field-journal — NOT Instagram-for-the-masses.
