"use client";

import { signOut } from "next-auth/react";
import { endPostHogIdentity } from "@/components/analytics/posthog-client";

/* The one way out of the site, for every button that signs a member out.
 *
 * It exists so that ending the session and ending the analytics identity
 * cannot come apart: two buttons called next-auth's signOut directly and
 * neither told PostHog, so whoever used the browser next was filed under the
 * member who had left (bug audit 3, T7b-21). posthog-rule.test.mjs fails if
 * anything else imports signOut from next-auth/react. */
export function signOutOfSite(): Promise<void> {
  endPostHogIdentity();
  return signOut({ callbackUrl: "/" });
}
