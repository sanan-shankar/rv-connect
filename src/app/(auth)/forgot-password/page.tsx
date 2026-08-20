import { turnstileSiteKey } from "@/lib/turnstile";
import { ForgotPasswordClient } from "./forgot-client";

export const metadata = { title: "Forgot your password?" };

/** Loose enough to prefill a field with, strict enough not to echo junk into
 *  the page. Real validation is the server's job; this only decides whether
 *  what arrived in the URL is worth putting in the box. */
function looksLikeEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * A server component purely so `?email=` can be read without a Suspense
 * boundary or a hydration mismatch on the input's value.
 *
 * The sign-in form passes whatever you had already typed when you gave up on
 * your password, so this page opens with the box filled in. Asking somebody to
 * type the same address twice, ten seconds apart, on the screen they reached
 * BECAUSE something already went wrong, is the sort of thing that makes an app
 * feel like it is not paying attention (owner, 2026-08-12).
 */
export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const prefill = email && looksLikeEmail(email) ? email : "";
  return <ForgotPasswordClient initialEmail={prefill} turnstileSiteKey={turnstileSiteKey()} />;
}
