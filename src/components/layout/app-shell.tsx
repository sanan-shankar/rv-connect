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
  return (
    <div className="relative min-h-screen bg-background md:flex">
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
      {/* pb on mobile clears the fixed bottom tab bar */}
      <div className="relative z-10 flex min-w-0 flex-1 flex-col pb-16 md:pb-0">
        {/* Two paddings with two jobs (owner, 2026-08-18).

            SIDES are fluid: the gap beside the tile used to shrink (auto
            margins), stall at a breakpoint padding, jump, and stall again;
            a clamp glides between the same endpoints (40px wide, 20px
            phones) so the gap narrows continuously to its floor and holds.
            3.5vw, not 3vw: the first rate had already dropped to ~34px at a
            ~1150px window, which read plainly tighter than the 40px that
            width always had ("even the sides are so small"). At 3.5vw the
            cap holds to ~1140px, so ordinary desktop windows keep their
            full gutter and the glide only begins once space is genuinely
            short.

            TOP AND BOTTOM keep the original stepped scale untouched: a first
            fluid pass shrank them too, which pulled every page's content up
            and clipped the profile bird overhanging its sheet ("even the
            freaking bird is cut off. keep the top margins as it was"). The
            2026-07-30 left-equals-top rule still holds where windows actually
            rest (both read 40px at lg+, 20px on phones); mid-resize the sides
            are allowed to glide while the top stands still. */}
        <main className="w-full flex-1 px-[clamp(1.25rem,3.5vw,2.5rem)] py-5 sm:py-7 lg:py-10">
          <ContentColumn>
            {notice}
            {children}
          </ContentColumn>
        </main>
      </div>
    </div>
  );
}
