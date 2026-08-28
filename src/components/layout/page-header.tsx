import { cn } from "@/lib/utils";
import { SearchPill } from "./search-pill";
import { NotificationBell } from "./notification-bell";
import { GuideDoor } from "@/components/guide/guide-door";

/**
 * PageHeader: the title block at the top of every main surface.
 *
 * Left: title + optional subtitle.
 * Right (actions slot): the expand-on-click search pill, the notification bell,
 * and a per-page primary CTA. This is what replaces the old always-on
 * search + filter row that used to sit above each feed.
 *
 * Pass `showSearch` to mount the search pill, `unreadCount` to mount the bell,
 * and `actions` for the page's primary call to action (e.g. "New post").
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
  subtitle,
  showSearch = false,
  unreadCount,
  actions,
  guide,
  children,
}: {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  /** Slug from GUIDE_AREAS. Turns the title into the way into that chapter. */
  guide?: string;
  unreadCount?: number;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const hasRight = showSearch || unreadCount !== undefined || actions || children;

  return (
    <header
      className={cn(
        "mb-6 flex flex-nowrap items-start justify-between gap-4",
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
        <h1 className="font-heading text-[30px] leading-[1.2] tracking-[-0.02em] text-foreground">
          {guide ? <GuideDoor area={guide}>{title}</GuideDoor> : title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {hasRight && (
        /* mt-px: the cap of a Libre Baskerville capital starts one pixel below
           its own line box at 30px/leading-none (measured off the rendered
           pixels, not the metrics), so a pill flush with the box top reads one
           pixel high against the letter beside it. */
        <div className="mt-px flex flex-nowrap items-center justify-end gap-2.5 shrink-0">
          {showSearch && (
            <div className="hidden sm:block">
              <SearchPill />
            </div>
          )}
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
