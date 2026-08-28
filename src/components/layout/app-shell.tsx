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
  demo = false,
  notice,
  children,
}: {
  user: SidebarUser;
  unreadCount: number;
  /** A bar above the page content, inside the column so it lines up with the
   *  title beneath it. Today this is only the confirm-your-email notice; it is
   *  a slot rather than that component so the shell does not have to know
   *  about auth. Null for everyone whose address is confirmed, which is
   *  everybody after their first day. */
  notice?: React.ReactNode;
  /** True on the demo deployment. Passed down as a prop rather than read
   *  from `IS_DEMO`, because `DEMO_MODE` has no NEXT_PUBLIC_ prefix and so
   *  inlines as undefined in a client bundle: the Sidebar below is a client
   *  component and would silently see `false` if it imported the flag. */
  demo?: boolean;
  children: React.ReactNode;
}) {
  /* A flex COLUMN below md, a row from md up, and `dvh` rather than `screen`.
     All three exist so a page can hand a child the height that is actually left
     on the screen: the shell is the only thing that knows it. The directory map
     is the one surface using it -- it used to measure the window in JavaScript
     and set a pixel height, which meant the server rendered a 360px card that
     jumped to 700px the moment hydration ran. `dvh` and not `screen` (100vh)
     because 100vh on a phone is the LARGE viewport, i.e. taller than what you
     can see, which is the one thing that measurement got right. */
  return (
    <div className="relative flex min-h-dvh flex-col bg-background md:flex-row">
      {/* Fixed valley back-layer: covers the window at any desktop size (cover =
          as zoomed-out as it can be while still filling) and NEVER scrolls. The
          content layer scrolls over it. Sidebar + content sit above it (z-10).
          Its height comes from `.valley-tree` (100lvh, the LARGE viewport), not
          from this inset-0, so the image keeps one constant crop when the mobile
          keyboard opens and shrinks the dynamic viewport. */}
      {/* 0.09, down from 0.11 (owner 2026-07-30: the warm wash is one of the
          three stacked warmth sources; tone the sum down ~20%). The photo still
          reads as atmosphere at 0.09; at 0.11 it tinted every card above it. */}
      <div
        aria-hidden
        className="valley-tree pointer-events-none fixed inset-0 z-0 bg-cover bg-center opacity-[0.09] dark:opacity-[0.04]"
        style={{ backgroundImage: "url(/images/landing.jpeg)" }}
      />
      <KonamiEggs />
      <Sidebar user={user} unreadCount={unreadCount} demo={demo} />
      {/* No bottom padding on mobile any more. The `pb-16` here reserved 64px
          for "the fixed bottom tab bar", and there is no bottom tab bar: the
          mobile navigation is the drawer behind the header. So every page on a
          phone ended in an inch of nothing, below the last card (audit
          Low 15). */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* Padding rule (owner, 2026-07-30): the title's distance from the
            left edge EQUALS its distance from the top, at every breakpoint.

            This is the ORIGINAL stepped scale, restored in full. A fluid
            vw-clamp gutter was tried on 2026-08-18 to smooth the gap's
            shrink while a window narrows; it rendered near-zero margins on
            the owner's machine and was rejected outright ("revert all your
            changes to the margin between the tile and the sidebar"). Do not
            reintroduce viewport-unit padding here. */}
        <main className="flex w-full flex-1 flex-col p-5 sm:p-7 lg:p-10">
          <ContentColumn>
            {notice}
            {children}
          </ContentColumn>
        </main>
      </div>
    </div>
  );
}
