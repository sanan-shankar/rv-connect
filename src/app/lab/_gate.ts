import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * The lab's admin check, called by `layout.tsx` AND at the top of every
 * server-rendered room.
 *
 * The layout alone is navigation, not authorisation. The App Router renders
 * only the segments a request's router-state tree marks as changed, and that
 * tree is sent by the client: a hand-crafted RSC request claiming /lab is
 * already on screen starts the render at the page, below the layout, so the
 * layout's check never runs (bug audit 3, L2-01; proved on a public route).
 * Several rooms read real members' rows -- one private Catch-up's answers and
 * photographs among them -- so each room checks for itself, as every /admin
 * page already does (B-024). `gate-coverage.test.mjs` requires it of every
 * lab page that renders on the server.
 *
 * `notFound()`, not a 403: a 404 hides that the tree exists at all, which is
 * the right posture for a surface whose whole content is internal.
 */
export async function requireLabAdmin(): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== "admin") notFound();
}
