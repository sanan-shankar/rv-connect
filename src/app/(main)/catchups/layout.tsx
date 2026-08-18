import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Catch-ups is an alumni feature (owner, 2026-08-18: "remove catch ups for
 * teachers"): the rounds, batches-of-friends framing and its whole voice are
 * written for people who were students together. Teacher accounts have the
 * nav row hidden, but a bookmark, an old notification or a typed URL still
 * lands here, so the section itself turns them around. One layout guards
 * the index, the create form, every catch-up and every round at once.
 */
export default async function CatchupsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const type = session?.user?.accountType;
  if (type === "teacher" || type === "ex_teacher") redirect("/feed");
  return children;
}
