---
name: Screenshot Auth Workflow
description: Take screenshots of authenticated pages using the admin-login bypass. Use when you need to screenshot any page behind login (feed, groups, directory, profile, settings, admin).
trigger: When needing to screenshot or visually verify any authenticated page.
---

# Authenticated Screenshot Workflow

Most pages in this app require authentication. Use `scripts/qa/screenshot-auth.mjs` to capture them.

## Commands

### Authenticated Desktop Screenshot (1440x900)
```bash
node scripts/qa/screenshot-auth.mjs http://localhost:3000/feed
node scripts/qa/screenshot-auth.mjs http://localhost:3000/feed feed-desktop
```

### Authenticated Mobile Screenshot (390x844)
```bash
node scripts/qa/screenshot-auth.mjs http://localhost:3000/feed --mobile
node scripts/qa/screenshot-auth.mjs http://localhost:3000/feed feed-mobile --mobile
```

### Public Page Screenshot (no auth needed)
```bash
node scripts/qa/screenshot.mjs http://localhost:3000
node scripts/qa/screenshot.mjs http://localhost:3000/login login
```

## How It Works

1. `scripts/qa/screenshot-auth.mjs` reads `ADMIN_EMAIL` from `.env.local`
2. POSTs to `http://localhost:3000/api/auth/admin-login` to create a DB session
3. Sets the `authjs.session-token` cookie on the browser
4. Navigates to the target URL and screenshots

## Prerequisites

- Dev server must be running: `npm run dev` (start in background if not running)
- `.env.local` must contain `ADMIN_EMAIL` and `NEXT_PUBLIC_ADMIN_EMAIL`
- The admin email user must exist in the database

## Screenshot Review Protocol

1. Take screenshot (desktop)
2. Read the PNG with the Read tool — visually inspect
3. Make changes
4. Re-screenshot and compare — be specific about differences
5. **Minimum 2 rounds** before declaring done
6. Then take mobile screenshot and repeat the review cycle
7. **Skip screenshot iteration for animated elements** — animations produce different frames each capture

## Authenticated Routes
- `/feed` — Main social feed
- `/groups` — Group listing
- `/groups/[id]` — Individual group
- `/directory` — Alumni directory
- `/profile/[id]` — User profile
- `/settings` — User settings
- `/admin` — Admin panel (admin only)
- `/about` — About page
- `/donate` — Donate page

## Public Routes (use regular `scripts/qa/screenshot.mjs`)
- `/` — Landing page
- `/login` — Login page
- `/verify` — Magic link verify
