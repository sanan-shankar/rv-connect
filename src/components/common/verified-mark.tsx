import { Leaf } from "lucide-react";

/**
 * A quiet verified marker: a small leaf next to the name, no label until hover
 * or focus. Leaf-green for alumni, office-blue for teachers. Nothing at all for
 * unverified, pending, or flagged users (absence is the signal).
 */
export function VerifiedMark({
  user,
  size = 13,
}: {
  user: { verifyState?: string | null; accountType?: string | null };
  size?: number;
}) {
  if (user.verifyState !== "verified") return null;

  const isTeacher = user.accountType === "teacher" || user.accountType === "ex_teacher";
  const label =
    user.accountType === "teacher"
      ? "Verified teacher"
      : user.accountType === "ex_teacher"
        ? "Verified former teacher"
        : "Verified member";

  return (
    <span
      className="group relative inline-flex shrink-0 cursor-default rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      tabIndex={0}
      role="img"
      aria-label={label}
    >
      <Leaf
        style={{ width: size, height: size }}
        className={isTeacher ? "text-sky" : "text-leaf"}
        aria-hidden
        strokeWidth={2.2}
      />
      <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
        {label}
      </span>
    </span>
  );
}
