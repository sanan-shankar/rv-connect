import { turnstileSiteKey } from "@/lib/turnstile";
import LoginClient from "./login-client";

export const metadata = { title: "Sign in" };

/**
 * A server wrapper for one job: the Turnstile site key lives in plain env
 * (not NEXT_PUBLIC_*, so it never bakes into the client bundle) and the
 * login form is a client component, so the key crosses here as a prop.
 * The site key is public by design — it is rendered into the widget — but
 * routing it through the server keeps dev/prod key selection in
 * src/lib/turnstile.ts, the same file the verifying side reads.
 */
export default function LoginPage() {
  return <LoginClient turnstileSiteKey={turnstileSiteKey()} />;
}
