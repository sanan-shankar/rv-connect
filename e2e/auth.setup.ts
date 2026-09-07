import { test as setup, expect } from "@playwright/test";
import { assertSameOriginAfterNavigation } from "../scripts/qa/local-base-url.mjs";
import { devLoginContext } from "../scripts/qa/_dev-login.mjs";

const AUTH_FILE = "e2e/.auth/admin.json";

/* One login for the whole suite. Uses the same local sign-in every
 * screenshot script uses (src/app/api/dev-login/route.ts): POST the address
 * plus DEV_LOGIN_SECRET, get a NextAuth JWT cookie back. Saved to disk so the
 * 30-odd visual checks below do not each pay for a sign-in.
 *
 * Through `_dev-login.mjs`, which exists to own exactly this and ships
 * `devLoginContext` for Playwright and nothing else. This file was the tenth
 * hand-copy of the block that helper was written to delete -- the one file
 * nobody thought of as a QA script -- and three behaviours had already
 * diverged: the helper refuses to follow a redirect (a proxy that does not
 * treat /api/dev-login as public fails loudly instead of reporting a
 * confusing missing cookie), it knows both cookie names rather than trusting
 * `storageState` to catch whatever is there, and its 404 message names all
 * three causes. Its `requireSecret` throws the better message when
 * DEV_LOGIN_SECRET is missing, so that check is gone from here too.
 *
 * This replaced /api/auth/admin-login, which needed no secret at all and
 * existed on the live site (security audit C1-b). */
setup("authenticate as admin", async ({ page, baseURL }) => {
  await page.goto("/");
  /* The cookie is about to be minted for whatever origin we are on. If a
   * redirect moved us off loopback, stop before that happens. The helper does
   * not navigate, so this stays here and stays first. */
  assertSameOriginAfterNavigation(baseURL!, page.url());

  await devLoginContext(page.context(), baseURL!);

  /* Prove the cookie actually authenticates rather than trusting the 200:
   * / redirects to /feed only for a signed-in member. */
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/feed/);

  await page.context().storageState({ path: AUTH_FILE });
});
