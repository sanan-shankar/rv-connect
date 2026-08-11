import { checkResetLink } from "@/components/auth/email-actions";
import { ResetPasswordClient } from "./reset-client";

export const metadata = { title: "Set a new password" };

/**
 * The reset link's landing page.
 *
 * A server component so the token is judged BEFORE anything paints: someone
 * arriving on a dead link should see "this link has run out, here is a new
 * one" immediately, not a password form that fails after they have chosen a
 * password and typed it twice.
 *
 * The check deliberately does not spend the token (`consume: false`); it is
 * burned by `resetPassword` when the new password is actually submitted.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const link = await checkResetLink(token ?? "");
  return <ResetPasswordClient token={token ?? ""} link={link} />;
}
