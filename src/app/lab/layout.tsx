import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import "./lab.css";

/**
 * The dev/preview rooms are admin-only (audit M19; owner decision: "/lab is
 * admin only"). `proxy.ts` no longer lists /lab as public, so reaching here
 * already requires a session — this enforces the second half, the admin role.
 *
 * A non-admin gets `notFound()`, not a redirect or a 403: a 404 hides that the
 * tree exists at all, which is the right posture for a surface whose whole
 * content is internal (the room index, and /lab/everything's audit log of
 * quoted source paths). Admins (including the dev-login tooling account) pass
 * straight through.
 */
export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (session?.user?.role !== "admin") notFound();
  return <>{children}</>;
}
