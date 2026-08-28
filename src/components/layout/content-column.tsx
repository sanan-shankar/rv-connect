"use client";

import { usePathname } from "next/navigation";

/* ------------------------------------------------------------------ *
 *  The page column. Exactly TWO modes, chosen by route, decided in
 *  this one file (owner, 2026-07-30).
 *
 *  WIDE - flush against the sidebar, filling the screen.
 *    The content's distance from the sidebar EQUALS its distance from
 *    the top (both are the shell's own padding: 20 / 28 / 40px), and
 *    the right margin is that same padding, so nothing is wasted. For
 *    two-column surfaces (Feed, Catch-ups) and for the ones that just
 *    want the room (Directory, the Collection, the bird gallery, the
 *    admin tables). Capped at 1600 so it does not sprawl on a 27".
 *
 *  CENTERED - one single column, centered in the space beside the
 *    sidebar. For everything that reads top to bottom: Letters,
 *    Support, About, Your profile (settings), Reach out,
 *    a member's profile. Text inside is still left-aligned; it is the
 *    COLUMN that is centered.
 *
 *  No page declares its own page-level width any more. A page may
 *  still set a narrower READING measure inside the centered column
 *  (the letter reader's 680px line length), which is a typographic
 *  choice, not a layout one.
 * ------------------------------------------------------------------ */

/** Route prefixes that take the wide column. Everything else is centered. */
const WIDE_ROUTES = [
  "/feed",
  "/directory",
  "/collection",
  "/catchups",
  "/admin",
  "/birds",
  // The picker is the bird gallery with behaviour on top; same grid, so it
  // must get the same column or the two pages stop being one layout.
  "/pick-bird",
];

/**
 * Single-column surfaces that happen to live under a wide section, and so
 * have to opt back out: the "Start a Catch-up" form, where one narrow form
 * would otherwise sit stranded against the left edge of a 1100px band.
 *
 * `/collection/<id>` used to be here, as a detail view rather than a gallery.
 * It is not a detail view any more -- since the 2026-08-28 viewer rebuild the
 * route renders the Collection itself with the viewer already open on that
 * photograph, so a narrow column would have left the river behind the viewer
 * laid out differently from the one at /collection.
 */
const CENTERED_EXCEPTIONS = ["/catchups/new"];

function isWideRoute(pathname: string): boolean {
  if (CENTERED_EXCEPTIONS.some((r) => pathname === r || pathname.startsWith(r))) return false;
  return WIDE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

export function ContentColumn({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className={isWideRoute(pathname) ? "w-full max-w-[1600px]" : "mx-auto w-full max-w-3xl"}>
      {children}
    </div>
  );
}
