import Link from "next/link";

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
      className={`font-semibold text-foreground hover:underline focus-visible:outline-none focus-visible:underline ${className}`}
    >
      {user.name}
    </Link>
  );
}
