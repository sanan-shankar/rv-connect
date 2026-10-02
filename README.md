# Alumni Connect

Alumni Connect is a website for a school's alumni. They can find each other, post, share old photos and message each other. It's been running for one school since July, and just over 400 alumni have joined so far. I've been working on it since March, about 1,000 hours in total.

Most schools don't have anything like this. Alumni usually end up in a WhatsApp group for their own batch, which is fine for keeping up with your own year but no help if you want to find anyone else. Old photos stay on whoever's phone they were taken on, and if you move to a new city there's no easy way to find out who from school already lives there. The site only runs for one school right now, but apart from the content and the sign-up questions nothing in it is tied to that school, so any school could use it.

## Features

- A feed with posts, comments, polls and mentions
- A directory with a world map of where everyone lives, which you can filter by batch or profession
- A photo collection of about 2,000 photos, sorted by year
- Letters, for longer pieces of writing
- Catch-ups, a newsletter that a group writes together
- A support page where members can help cover running costs
- Private messages
- Profiles, with one of 50 bird drawings as the default picture
- A question at sign-up that only someone from the school would know the answer to, so strangers can't join
- Admin tools for approving photos, moderating posts and handling reports

## Stack

- Next.js 16, React and TypeScript, styled with Tailwind CSS
- Postgres on Supabase, through Prisma
- Auth.js for accounts, with Upstash for rate limiting
- Cloudflare R2 for photographs, resized with Sharp
- d3-geo for the map
- Vercel for hosting, with Sentry for errors and Playwright for the visual tests

To run it locally, see [docs/SETUP.md](docs/SETUP.md).
