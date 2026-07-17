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
 * `searchScope` sets what the pill searches by default (Feed passes "posts");
 * see `SearchPill` for the Posts/People toggle.
 */
export function PageHeader({
  title,
  subtitle,
  showSearch = false,
  searchScope,
  unreadCount,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  searchScope?: "posts" | "people";
  unreadCount?: number;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const hasRight = showSearch || unreadCount !== undefined || actions || children;

  return (
    <header className="mb-6 flex flex-nowrap items-start justify-between gap-4">
      <div className="min-w-0">
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
              <SearchPill defaultScope={searchScope} />
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
