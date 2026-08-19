import { test as setup, expect } from "@playwright/test";
import { assertSameOriginAfterNavigation } from "../scripts/qa/local-base-url.mjs";

const AUTH_FILE = "e2e/.auth/admin.json";

/* One login for the whole suite. Uses the same local sign-in every
 * screenshot script uses (src/app/api/dev-login/route.ts): POST the address
 * plus DEV_LOGIN_SECRET, get a NextAuth JWT cookie back. Saved to disk so the
 * 30-odd visual checks below do not each pay for a sign-in.
 *
 * This replaced /api/auth/admin-login, which needed no secret at all and
 * existed on the live site (security audit C1-b). */
setup("authenticate as admin", async ({ page, baseURL }) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error(
      "ADMIN_EMAIL missing from .env -- authenticated QA cannot run. " +
        "See CLAUDE.md > Screenshots.",
    );
  }
  const devLoginSecret = process.env.DEV_LOGIN_SECRET;
  if (!devLoginSecret) {
    throw new Error(
      "DEV_LOGIN_SECRET missing from .env -- authenticated QA cannot run. " +
        "Generate one with `openssl rand -base64 32`. See CLAUDE.md > Screenshots.",
    );
  }

  await page.goto("/");
  /* The cookie is about to be minted for whatever origin we are on. If a
   * redirect moved us off loopback, stop before that happens. */
  assertSameOriginAfterNavigation(baseURL!, page.url());

  const res = await page.request.post("/api/dev-login", {
    data: { email: adminEmail, secret: devLoginSecret },
  });
  expect(
    res.ok(),
    `dev-login returned ${res.status()}. A 404 means NODE_ENV is production, ` +
      `DEV_LOGIN_SECRET is unset/short, or it did not match. Is the dev server up ` +
      `and ADMIN_EMAIL a real account?`,
  ).toBeTruthy();

  /* Prove the cookie actually authenticates rather than trusting the 200:
   * / redirects to /feed only for a signed-in member. */
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/feed/);

  await page.context().storageState({ path: AUTH_FILE });
});
