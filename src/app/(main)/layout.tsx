import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar will be added in Phase 3 */}
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
