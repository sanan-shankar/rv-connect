import Link from "@/components/common/link";
import { NO_CAPTURE } from "@/lib/posthog-privacy";

/** A person's name as a link to their profile. Used everywhere a name appears.
 *  NO_CAPTURE, so a tap on it never hands the name to PostHog (bug audit 3,
 *  T7b-22). */
export function PersonName({
  user,
  className = "",
}: {
  user: { id: string; name: string };
  className?: string;
}) {
  return (
    <Link
      href={`/profile/${user.id}`}
      // No state layer: this is a name set INSIDE a line of prose, and a tint
      // box behind it would break the line box every other name in the feed
      // sits in. The rule is the hover. active:opacity-70 is the press it was
      // missing, matched to the avatar it stands beside (identity-row.tsx), so
      // tapping either half of an identity row feels like one target.
      className={`${NO_CAPTURE} font-semibold text-foreground transition-opacity duration-150 hover:underline focus-visible:outline-none focus-visible:underline active:opacity-70 ${className}`}
    >
      {user.name}
    </Link>
  );
}
