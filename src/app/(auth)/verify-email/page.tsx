import { auth } from "@/lib/auth";
import { confirmEmailToken, type ConfirmOutcome } from "@/components/auth/email-actions";
import { VerifyEmailClient } from "./verify-client";

export const metadata = { title: "Confirm your email" };

/**
 * Where a confirmation link lands.
 *
 * Public, and deliberately so: the link gets opened on whichever device has
 * the inbox on it, which is very often not the one that signed up. The token
 * is the proof, so there is nothing to log in for first. Requiring a session
 * here would strand exactly the people this flow is meant to help.
 *
 * The token is redeemed during render rather than behind a button. A
 * confirmation page with a "confirm" button on it asks somebody to click twice
 * to do one thing.
 */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await auth();

  // No token: somebody reached this URL without a link, usually from the
  // banner's "I never got it". Show the waiting state with a resend button
  // rather than an error, since nothing has actually gone wrong.
  const outcome: ConfirmOutcome | "waiting" = token
    ? await confirmEmailToken(token)
    : "waiting";

  return (
    <VerifyEmailClient
      outcome={outcome}
      signedIn={!!session?.user?.id}
      alreadyVerified={!!session?.user?.emailConfirmed}
    />
  );
}
