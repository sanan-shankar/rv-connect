import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";
import { GuideDoor } from "@/components/guide/guide-door";

/**
 * PageHeader: the title block at the top of every main surface.
 *
 * Left: title + optional subtitle.
 * Right (actions slot): the search glass that draws into a line, the bell,
 * and a per-page primary CTA. This is what replaces the old always-on
 * search + filter row that used to sit above each feed.
 *
 * Pass `search` a <SearchPill>, `unreadCount` to mount the bell, and
 * `actions` for the page's primary call to action (e.g. "New post").
 *
 * `search` takes the pill itself rather than a boolean, and that is a bundle
 * decision as much as a shape one. A server component that imports a client
 * component ships that module whether or not the branch renders, so a
 * `showSearch` boolean checked at runtime put SearchPill and its two Phosphor
 * icons into the first load of every route drawing a header -- twenty-six of
 * them, for a pill exactly one draws. Handing the node in leaves the import
 * with the page that wants it. The slot survives rather than folding into
 * `actions` because ORDER is fixed here: search, then bell, then the CTA, and
 * `actions` renders after the bell.
 *
 * The search pill only ever searches posts (see `SearchPill`); searching for
 * people is the directory's job.
 *
 * `guide` is the second, quiet half of the guide's door: pass a slug from
 * src/lib/guide-areas.ts and the title itself opens that chapter. It adds
 * nothing to the page at rest, which is the whole reason it lives on the
 * title and not in a corner (docs/spec/guide.md section 4).
 */
export function PageHeader({
  title,
  afterTitle,
  subtitle,
  search,
  unreadCount,
  actions,
  guide,
  children,
}: {
  title: string;
  /** A small mark rendered inline, immediately after the title's last word.
   *  For an affordance that belongs to the title itself rather than to the
   *  page's action cluster. Not a general slot: keep it to one glyph. */
  afterTitle?: React.ReactNode;
  subtitle?: string;
  /** The page's own <SearchPill>. See the note above on why it is a node. */
  search?: React.ReactNode;
  /** Slug from GUIDE_AREAS. Turns the title into the way into that chapter. */
  guide?: string;
  unreadCount?: number;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const hasRight = search || unreadCount !== undefined || actions || children;

  return (
    <header
      className={cn(
        "group/header mb-6 flex flex-nowrap items-start justify-between gap-4",
        /* items-START, not items-center (owner, 2026-08-28: "the search icon
           and filters sits higher than the directory text. make sure the top
           of the D aligns with the top of the pills").
           Centred, the 30px title sat in the middle of the 40px action row, so
           the two things at either end of this header began at different
           heights -- the pills 5px above the title's box, and 6px above the
           ink of its first capital. Aligning the TOPS is what the eye actually
           reads across a wide row, and it is also what the shell's own left
           padding does with the title's left edge.

           The -mt-[5px] that used to hang off `hasRight` went with it, and had
           to: it existed only to cancel the downward push centring gave the
           title (owner, 2026-08-22: "Feed has equal margin on top as the
           left"). With nothing pushed, there is nothing to cancel, and the
           title lands on exactly the same pixel it did before -- measured at
           1440: h1 box top 40 both ways. What moves is the action cluster,
           down 5px, which is the half the owner was pointing at. */
      )}
    >
      <div className="min-w-0">
        {/* Every main surface routes its title through here; no page hand-rolls
            its own heading (they used to drift across 4 variants). The weight is
            the face's own regular, NOT font-bold: owner, 2026-07-30, on a bolded
            trial, "it's all a bit thicker, this is way too overpowering". */}
        {/* `leading-[1.2]`, not `leading-none`. At 30px Libre Baskerville a
            line-height of 1.0 puts consecutive baselines 30px apart, and a
            descender reaching 8px below one baseline leaves about two pixels
            under the capital of the next -- fine for the single-line titles
            most surfaces have, and visibly cramped for the one that wraps.
            "The Valley Collection" wraps on a phone, and the owner: "move the
            word Collection a bit below, it's too close to The Valley."
            1.2 opens that to eight pixels of clearance.

            Changed HERE rather than passed in from the Collection: every main
            surface routes its title through this component precisely so they
            cannot drift (they were four variants once), and a `titleClassName`
            escape hatch is how that starts again. The cost is six pixels of
            height on single-line headers, which is the honest price of a
            leading that does not collide. */}
        {/* `afterTitle` is INSIDE the h1 and after the words on purpose. The
            Collection's swap caret is the only user, and it has to follow the
            last letter rather than sit at the end of the header: "The Valley
            Collection" wraps on a phone, and a mark anchored to the block
            would strand itself out to the right of "The Valley" with two
            lines of nothing under it. Inline, it follows "Collection" down to
            the second line where it belongs.

            It is deliberately not part of the GuideDoor: the words open the
            guide chapter, the mark beside them does its own thing, and
            nesting one button in another is both an accessibility error and
            a way to open the guide every time somebody swaps. */}
        {/* The title steps aside for an open search, and only on a phone.
            On a wide header the search pill grows into the gap between the
            title and the actions. At 390px there is no gap: the pill lands
            across "The Valley Collection" and cuts it off mid-word, which
            reads as a collision rather than a field. Opacity only, so the row
            never reflows and the title is exactly where it was when the pill
            closes.
            `group-has`, rather than a prop threaded through three call sites:
            all three pills are passed IN -- the feed's through `search`, the
            Collection's and the directory's through `actions` -- so this
            component holds no open/closed state to thread anywhere. All three
            are inside this header, and all three set data-search-open. */}
        <h1
          className={cn(
            "font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground",
            "transition-opacity duration-200 ease-out",
            "group-has-[[data-search-open]]/header:pointer-events-none group-has-[[data-search-open]]/header:opacity-0",
            "sm:group-has-[[data-search-open]]/header:pointer-events-auto sm:group-has-[[data-search-open]]/header:opacity-100"
          )}
        >
          {guide ? <GuideDoor area={guide}>{title}</GuideDoor> : title}
          {afterTitle}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {hasRight && (
        /* -mt-[3.5px]: the controls CENTRE on the title's capitals (owner,
           2026-09-14: "the search notification and new post icons seem lower
           than the Feed text ... make sure it appears on the same horizontal
           line"). Measured at 1440 and 390 on every header route: the cap of
           "Feed" runs 44.9 to its baseline at 68, centre 56.5, and the 40px
           row centred at 61 -- 4.5px low everywhere. The old mt-px aligned
           TOPS back when the title was leading-none; leading-[1.2] above
           dropped the letters 3px and left the controls behind. Centring on
           the cap rather than aligning tops is what reads as one line once
           the things beside the word are circles, not text-height pills. */
        <div className="-mt-[3.5px] flex flex-nowrap items-center justify-end gap-2.5 shrink-0">
          {search && <div className="hidden sm:block">{search}</div>}
          {unreadCount !== undefined && (
            // This is the preferred notifications entry point at every width,
            // including mobile. Sidebar suppresses its own mobile top-bar
            // bell on the routes that render this one (see sidebar.tsx) so
            // there is never a duplicate.
            <NotificationBell initialUnreadCount={unreadCount} variant="header" />
          )}
          {actions}
          {children}
        </div>
      )}
    </header>
  );
}
