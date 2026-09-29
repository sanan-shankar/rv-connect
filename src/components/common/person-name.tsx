import Link from "@/components/common/link";

/** A person's name as a link to their profile. Used everywhere a name appears. */
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
      className={`font-semibold text-foreground transition-opacity duration-150 hover:underline focus-visible:outline-none focus-visible:underline active:opacity-70 ${className}`}
    >
      {user.name}
    </Link>
  );
}
