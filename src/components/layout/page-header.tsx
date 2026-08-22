import { cn } from "@/lib/utils";
import { SearchPill } from "./search-pill";
import { NotificationBell } from "./notification-bell";

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
 * The search pill only ever searches posts (see `SearchPill`); searching for
 * people is the directory's job.
 */
export function PageHeader({
  title,
  subtitle,
  showSearch = false,
  unreadCount,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  unreadCount?: number;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const hasRight = showSearch || unreadCount !== undefined || actions || children;

  return (
    <header
      className={cn(
        // items-center, not items-start: the 30px title top-aligned against
        // the 40px action row used to leave 10px of dead space under the
        // title before mb-6 even started, which read as the title floating
        // too far from whatever sat below the header (owner, 2026-08-22, on
        // Feed: "feed is very separated from the blue bird ... quite loose
        // and visually unbalanced"). mb-6 itself is untouched -- it already
        // matches --space-l, the deliberate token for this nav-to-content
        // relationship; the asymmetry was accidental, not the spacing value.
        "mb-6 flex flex-nowrap items-center justify-between gap-4",
        // Centering the row (above) is correct for every page, but it has a
        // side effect ONLY on a page with a right cluster: the 30px title,
        // centered against the 40px action row beside it, sits 5px below the
        // row's own top edge -- which is otherwise flush with the shell's
        // padding, so the title ends up 5px further from that padding than
        // its own left edge is (owner, 2026-08-22: "Feed has equal margin on
        // top as the left, right now it's 10% more on top ... move feed,
        // notification and new post cta all up a bit"). -mt-[5px] cancels
        // exactly that, pulling the whole row (title AND buttons together,
        // as asked) up by the amount centering pushed the title down.
        // Conditional on hasRight, not a flat correction: a page with no
        // right cluster (Directory, Collection) has nothing to center the
        // title against, so its top edge already sits flush with the
        // padding on its own -- shifting it too was measured and wrong
        // (overshot 5px past the left-edge baseline the first time this
        // landed).
        hasRight && "-mt-[5px]"
      )}
    >
      <div className="min-w-0">
        {/* Every main surface routes its title through here; no page hand-rolls
            its own heading (they used to drift across 4 variants). The weight is
            the face's own regular, NOT font-bold: owner, 2026-07-30, on a bolded
            trial, "it's all a bit thicker, this is way too overpowering". */}
        <h1 className="font-heading text-[30px] leading-none tracking-[-0.02em] text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
      </div>
      {hasRight && (
        <div className="flex flex-nowrap items-center justify-end gap-2.5 shrink-0">
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
