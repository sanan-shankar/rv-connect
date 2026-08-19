import { test as setup, expect } from "@playwright/test";
import { assertSameOriginAfterNavigation } from "../scripts/qa/local-base-url.mjs";

const AUTH_FILE = "e2e/.auth/admin.json";

/* One login for the whole suite. Uses the same admin-login bypass the
 * screenshot scripts use (src/app/api/auth/admin-login/route.ts): POST the
 * ADMIN_EMAIL, get a NextAuth JWT cookie back. Saved to disk so the 30-odd
 * visual checks below do not each pay for a sign-in. */
setup("authenticate as admin", async ({ page, baseURL }) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    throw new Error(
      "ADMIN_EMAIL missing from .env -- authenticated QA cannot run. " +
        "See CLAUDE.md > Screenshots.",
    );
  }

  await page.goto("/");
  /* The cookie is about to be minted for whatever origin we are on. If a
   * redirect moved us off loopback, stop before that happens. */
  assertSameOriginAfterNavigation(baseURL!, page.url());

  const res = await page.request.post("/api/auth/admin-login", {
    data: { email: adminEmail },
  });
  expect(
    res.ok(),
    `admin-login returned ${res.status()}. Is the dev server up and ADMIN_EMAIL a real account?`,
  ).toBeTruthy();

  /* Prove the cookie actually authenticates rather than trusting the 200:
   * / redirects to /feed only for a signed-in member. */
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/feed/);

  await page.context().storageState({ path: AUTH_FILE });
});
