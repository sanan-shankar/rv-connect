import { Sidebar, type SidebarUser } from "./sidebar";
import { KonamiEggs } from "./konami-eggs";

/**
 * AppShell: flush full-height sidebar + a warm content column with a faint
 * valley atmosphere behind it. Replaces the old top Navbar + fixed background
 * image + max-w-7xl wrapper.
 *
 * Pass `rightRail` to switch the content into the contract's 3-column layout
 * (main + a 318px rail) at >=1180px, collapsing to a single column below.
 */
export function AppShell({
  user,
  unreadCount,
  rightRail,
  children,
}: {
  user: SidebarUser;
  unreadCount: number;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-background md:flex">
      {/* Fixed valley back-layer: covers the window at any desktop size (cover =
          as zoomed-out as it can be while still filling) and NEVER scrolls. The
          content layer scrolls over it. Sidebar + content sit above it (z-10). */}
      <div
        aria-hidden
        className="valley-tree pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-[0.11]"
        style={{ backgroundImage: "url(/images/landing.jpeg)" }}
      />
      <KonamiEggs />
      <Sidebar user={user} unreadCount={unreadCount} />
      {/* pb on mobile clears the fixed bottom tab bar */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {rightRail ? (
          <div className="mx-auto grid w-full max-w-[1280px] flex-1 grid-cols-1 gap-x-[30px] px-5 pb-16 pt-6 sm:px-7 lg:px-9 lg:py-7 min-[1180px]:grid-cols-[minmax(0,1fr)_318px]">
            <main className="min-w-0">{children}</main>
            {/* On the contract the rail starts level with the composer, not the
                page header, so it carries its own top offset. */}
            <aside className="hidden min-[1180px]:block">{rightRail}</aside>
          </div>
        ) : (
          <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 py-6 sm:px-7 lg:px-10 lg:py-8">
            {children}
          </main>
        )}
      </div>
    </div>
  );
}
