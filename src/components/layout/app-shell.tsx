import { Sidebar, type SidebarUser } from "./sidebar";
import { KonamiEggs } from "./konami-eggs";
import { ContentColumn } from "./content-column";

/**
 * AppShell: flush full-height sidebar + a warm content column with a faint
 * valley atmosphere behind it. Replaces the old top Navbar + fixed background
 * image + max-w-7xl wrapper.
 *
 * The shell owns the page's padding and its column. Padding is EQUAL on all
 * four sides, so a title's distance from the sidebar is its distance from the
 * top. Which of the two columns a route gets (wide vs centered) is decided in
 * `content-column.tsx`; no page sets a page-level width itself.
 *
 * The old `rightRail` prop is gone: it was dead (no caller ever passed one),
 * and the surfaces that do have a rail build their own grid inside `children`.
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
    <div className="relative min-h-screen bg-background md:flex">
      {/* Fixed valley back-layer: covers the window at any desktop size (cover =
          as zoomed-out as it can be while still filling) and NEVER scrolls. The
          content layer scrolls over it. Sidebar + content sit above it (z-10).
          Its height comes from `.valley-tree` (100lvh, the LARGE viewport), not
          from this inset-0, so the image keeps one constant crop when the mobile
          keyboard opens and shrinks the dynamic viewport. */}
      <div
        aria-hidden
        className="valley-tree pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-[0.11]"
        style={{ backgroundImage: "url(/images/landing.jpeg)" }}
      />
      <KonamiEggs />
      <Sidebar user={user} unreadCount={unreadCount} />
      {/* pb on mobile clears the fixed bottom tab bar */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {/* Padding rule (owner, 2026-07-30): the title's distance from the
            left edge EQUALS its distance from the top, at every breakpoint. */}
        <main className="w-full flex-1 p-5 sm:p-7 lg:p-10">
          <ContentColumn>{children}</ContentColumn>
        </main>
      </div>
    </div>
  );
}
