---
name: Screenshot Auth Workflow
description: Take screenshots of authenticated pages using the local dev-login route. Use when you need to screenshot any page behind login (feed, groups, directory, profile, settings, admin).
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

1. `scripts/qa/screenshot-auth.mjs` reads `ADMIN_EMAIL` and `DEV_LOGIN_SECRET` from `.env`
2. Signs in from Node via `scripts/qa/_dev-login.mjs`, which POSTs to
   `http://localhost:3000/api/dev-login` and copies only the resulting HttpOnly
   cookie into the browser (the secret never enters page JavaScript)
3. Sets the `authjs.session-token` cookie on the browser
4. Navigates to the target URL and screenshots

## Prerequisites

- Dev server must be running: `npm run dev` (start in background if not running)
- `.env` must contain `ADMIN_EMAIL` and `DEV_LOGIN_SECRET` (`openssl rand -base64 32`).
  `NEXT_PUBLIC_ADMIN_EMAIL` is gone: it compiled the owner's address into the public
  browser bundle (security audit C1-c)
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

**Do not keep a list here.** `scripts/qa/crawl.mjs`'s `routes` array is the
maintained one, and it is checked every time somebody runs `npm run verify:crawl`;
this list was not, so it went on naming `/groups`, `/groups/[id]` and `/settings`
for weeks after those routes were deleted. An agent following it screenshots 404s.

Read the array, or just run `npm run verify:crawl`, which visits every one of them
signed in and prints the status. `/donate` is in there deliberately: it survives
only as a redirect to `/support`.

## Public Routes (use regular `scripts/qa/screenshot.mjs`)
- `/` — Landing page
- `/login` — Login page
- `/signup` — Signup page
