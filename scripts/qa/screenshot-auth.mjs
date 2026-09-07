// Screenshot a page behind login. `screenshot-auth.mjs <url> [label] [--mobile] [--full]`.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { shoot } from './_shoot.mjs';

process.chdir(resolve(dirname(fileURLToPath(import.meta.url)), '../..'));

// Load .env for ADMIN_EMAIL and DEV_LOGIN_SECRET. `quiet` because dotenv 17
// otherwise prints a banner on the stdout of every hand-run pass.
config({ path: '.env', quiet: true });

const args = process.argv.slice(2);
const mobile = args.includes('--mobile');
/* `--full` captures the whole page rather than the first viewport. Added for
   the Catch-ups sketch room (2026-09-06), whose phone drawings are one tall
   page each: a viewport shot showed the first 844px and nothing of the
   answers below the masthead, which was the part being judged.

   One trap, proved the same day: with `--mobile` (deviceScaleFactor 2) a
   page taller than about 8,000 CSS px that contains a `backdrop-filter`
   element captures as blank background from top to bottom, while the DOM
   is fine. The 2x bitmap passes Chrome's 16,384px compositing limit and the
   blurred layer takes the rest with it. Capture such a page at scale 1
   (15,951px came out whole) or in viewport-sized pieces. */
const full = args.includes('--full');
const filteredArgs = args.filter((a) => a !== '--mobile' && a !== '--full');

const url = filteredArgs[0] || 'http://localhost:3000/feed';
const label = filteredArgs[1] || '';

if (!process.env.ADMIN_EMAIL) {
  console.error('Error: ADMIN_EMAIL not found in .env');
  process.exit(1);
}

// A one-line failure, not a stack: the messages _dev-login throws already say
// which of the three causes it was, and this is a tool run by hand.
const shot = await shoot({
  url,
  authed: true,
  mobile,
  full,
  suffix: [label, mobile ? 'mobile' : ''].filter(Boolean).join('-'),
  // Streamed/Suspense content (feed posts, Collection tiles) resolves after
  // the network goes idle; without this the shot is of the skeleton.
  settleMs: 4000,
}).catch((e) => {
  console.error('Screenshot failed:', e.message);
  process.exit(1);
});

console.log(`Screenshot saved: ${shot.outPath} (${shot.viewport.width}x${shot.viewport.height})`);
