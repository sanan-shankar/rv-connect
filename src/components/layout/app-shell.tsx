import { Sidebar, type SidebarUser } from "./sidebar";
import { Footer } from "./footer";

/**
 * AppShell: flush full-height sidebar + content column with a faint valley atmosphere.
 * Replaces the old top Navbar + fixed background image + max-w-7xl wrapper.
 */
export function AppShell({
  user,
  unreadCount,
  children,
}: {
  user: SidebarUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background md:flex">
      <Sidebar user={user} unreadCount={unreadCount} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* faint valley behind content; subtle enough not to hurt readability */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-[center_28%] opacity-[0.06]"
          style={{ backgroundImage: "url(/images/landing.jpeg)" }}
        />
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
}
