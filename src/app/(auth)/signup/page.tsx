import { turnstileSiteKey } from "@/lib/turnstile";
import SignupClient from "./signup-client";

/** Same one-job server wrapper as the login page: carry the Turnstile
 *  site key from env to the client form as a prop. */
export default function SignupPage() {
  return <SignupClient turnstileSiteKey={turnstileSiteKey()} />;
}
