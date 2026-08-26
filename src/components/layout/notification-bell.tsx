"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Bell,
  HelpCircle,
  PenLine,
  Clock,
  BookOpen,
  Heart,
  MessageCircle,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Flag,
  HandHeart,
} from "lucide-react";
import { m } from "motion/react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { formatTimeAgo } from "@/lib/utils";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/app/(main)/notifications/actions";
import { useRouter } from "next/navigation";
import { SPRINGS, EASE_POP } from "@/components/common/motion";

interface NotificationBellProps {
  initialUnreadCount: number;
  /** "sidebar" = compact inline trigger; "header" = circular surface pill (contract feed). */
  variant?: "sidebar" | "header";
}

interface Notification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/**
 * Every `Notification.type` written anywhere in the app (feed/actions.ts,
 * groups/actions.ts, admin-actions.ts, collection/actions.ts,
 * catchups-notify.ts -- see `CatchupNotifyKind` in catchups-types.ts for the
 * five Catch-up kinds) maps to one glyph here. Unknown/future types fall back
 * to the plain `Bell` so a new type never renders blank.
 *
 * `heart: true` marks the two love/like kinds: the heart is ALWAYS
 * `#E03A33`, filled, painted with `transition: none` so it can never flash
 * through an inherited colour first (same rule as `LoveButton`).
 */
const NOTIFICATION_ICON_META: Record<string, { icon: typeof Bell; heart?: boolean; label: string }> = {
  // Feed: likes/loves and comment activity.
  like: { icon: Heart, heart: true, label: "Liked" },
  comment: { icon: MessageCircle, label: "Comment" },
  reply: { icon: MessageCircle, label: "Reply" },
  // Admin/moderation notices.
  admin: { icon: ShieldCheck, label: "Rishi Valley" },
  // A note attached to a removed post/letter/comment/photo. Opens the
  // conversation it started at /messages/[id], where the author can write back.
  // Distinct from the plain "admin" glyph above (ShieldCheck, e.g. verification).
  admin_note: { icon: ShieldAlert, label: "Notes from the admins" },
  // An admin answering something a member wrote, and the receipt/outcome of
  // anything they reported. Both open the thread they belong to.
  admin_message: { icon: Mail, label: "From the admins" },
  report_update: { icon: Flag, label: "Something you reported" },
  // Catch-ups (spec section 5).
  catchup_questions_open: { icon: HelpCircle, label: "Questions open" },
  catchup_answers_open: { icon: PenLine, label: "Answers open" },
  catchup_reminder: { icon: Clock, label: "Reminder" },
  catchup_published: { icon: BookOpen, label: "Round published" },
  catchup_love: { icon: Heart, heart: true, label: "Loved your answer" },
  // Written by the Razorpay webhook when IT, and not the payer's browser,
  // recorded the payment -- the tab-died case the webhook exists for. It is
  // the only way that supporter ever hears the money landed, and the only
  // route they have to the bird they were promised (bug audit B-081).
  contribution_received: { icon: HandHeart, label: "Your contribution" },
};

function notificationIconMeta(type: string) {
  return NOTIFICATION_ICON_META[type] ?? { icon: Bell, label: "Notification" };
}

export function NotificationBell({
  initialUnreadCount,
  variant = "sidebar",
}: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [loaded, setLoaded] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const loadingMoreRef = useRef(false);
  // Bumping this key re-mounts the motion shake so it replays the keyframes.
  // It only ever rises when the unread count climbs, so the bell gives one
  // gentle decaying shake per new notification, never on decrement or hover.
  const [shakeKey, setShakeKey] = useState(0);
  const prevUnread = useRef(initialUnreadCount);

  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      // Shakes the bell when the unread count RISES. That comparison only exists across renders, which is what the ref and this effect are for.
      setShakeKey((k) => k + 1);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  const [open, setOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void handleOpen();
  }

  /* The badge asks the server, instead of counting its own clicks.
   *
   * It used to be seeded from a prop computed in the (main) layout and then
   * only ever DECREMENTED locally. Three things compounded (audit B-120): a
   * shared layout is not re-rendered on soft navigation, so browsing around
   * the site never recomputed it; `useState(prop)` reads the prop once at
   * mount, so even a server action that did re-render the layout could not
   * reach the persistent sidebar instance; and the only two setUnreadCount
   * calls were both decrements. So the badge was correct at the moment of a
   * hard page load and never again: it could fall, never rise, and the shake
   * animation this component ships for "a new one arrived" was unreachable.
   *
   * Refreshed on mount, whenever the tab regains focus, and on every open of
   * the panel (handleOpen above takes it from the same payload). Focus rather
   * than a short interval: the count only matters when somebody is looking,
   * and a poll on every open tab would be a query per member per interval for
   * a number nobody is reading.
   */
  const refreshCount = useCallback(async () => {
    const data = await callAction(() => getUnreadNotificationCount());
    if ("error" in data) return; // a background refresh says nothing on failure
    setUnreadCount(data.unreadCount);
  }, []);

  useEffect(() => {
    void refreshCount();
    const onFocus = () => void refreshCount();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshCount]);

  // One transform-only decaying shake, pivoting from the top so it reads as a
  // wobble. A cubic-bezier tween mirroring the preview lab (never a spring with
  // 5+ keyframes).
  const shakeAnimate = shakeKey > 0 ? { rotate: [0, -9, 7, -5, 3, 0] } : { rotate: 0 };
  const shakeTransition = {
    duration: 0.7,
    ease: [0.36, 0.07, 0.2, 1] as const,
    times: [0, 0.16, 0.36, 0.56, 0.78, 1],
  };

  async function handleOpen() {
    // Refresh the first page on EVERY open, not once per mount: the old
    // `if (!loaded)` guard meant the panel showed the session's first fetch
    // forever, going quietly stale while new notifications arrived. The stale
    // list stays on screen while the fresh page loads, so a reopen never
    // flashes back to "Loading...".
    // callAction: a rejected fetch used to leave `loaded` false forever, so
    // the panel stuck on "Loading..." with no way out (audit B-042).
    const data = await callAction(() => getNotifications());
    if ("error" in data) {
      toast.error(data.error);
      setLoaded(true);
      return;
    }
    setNotifications(data.notifications);
    setNextCursor(data.nextCursor);
    setHasMore(data.hasMore);
    // The server's count, not this component's arithmetic. See refreshCount.
    setUnreadCount(data.unreadCount);
    setLoaded(true);
  }

  async function handleLoadMore() {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    try {
      const data = await callAction(() => getNotifications({ cursor: nextCursor }));
      if ("error" in data) {
        toast.error(data.error);
        return;
      }
      setNotifications((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...data.notifications.filter((n) => !seen.has(n.id))];
      });
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } finally {
      // finally, not a trailing statement: a rejected page used to leave this
      // ref stuck true, so the sentinel could never fire the next page again
      // (audit B-042).
      loadingMoreRef.current = false;
    }
  }

  async function handleClickNotification(notif: Notification) {
    if (!notif.read) {
      const result = await callAction(() => markNotificationRead(notif.id));
      if (result.error) {
        // The click already promises navigation; a rejected mark-read must
        // not also block it -- same reasoning as the idempotent updateMany
        // in the action itself, just one layer up.
        toast.error(result.error);
      } else {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    }
    if (notif.link) {
      router.push(notif.link);
    }
  }

  async function handleMarkAllRead() {
    const result = await callAction(() => markAllNotificationsRead());
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  /* One tree for the two places a bell lives. They differ in exactly three
     things -- the trigger's surface, the glyph's size, and whether the unread
     count is a dot or a number -- and every one of the other ~55 lines was
     written out twice, including the whole shake wrapper, the sr-only label
     and the seven props handed to the panel. */
  const isHeader = variant === "header";

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      {/* HEADER: `state-layer` supplies the surface half of the hover (and
          keeps the trigger lit while the panel is open, via data-popup-open).
          Before it the only hover here was the glyph darkening from muted to
          full ink, which is a change you have to already be looking for on a
          40px circle sitting on a paper card.

          RAIL: this variant lives in exactly one place, the mobile sticky green
          band (sidebar.tsx). It used to be a `display: block` button with p-2,
          so the 18px glyph was placed on the button's 24px text baseline and
          sat 3.5px ABOVE the band's centre (measured: 15.5px of band above it,
          22.5px below) while the hamburger beside it, a real 40px grid box, was
          dead centre. A fixed 40x40 grid box removes the baseline entirely and
          matches the hamburger; hover/focus are RAIL colours, never the warm
          light-surface ones and never `state-layer`, because the rail is the
          one surface in the app that owns its own state ladder in both themes.
          The hover was `bg-white/[0.07]`, tuned against the canopy band: on the
          dark charcoal rail that alpha overshoots the tuned `--sidebar-hover`
          rung, so it uses the token now and tracks whichever theme is on. */}
      <DropdownMenuTrigger
        className={
          isHeader
            ? "bell-trigger state-layer relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(30,28,22,0.04)] transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            : "relative grid size-10 shrink-0 place-items-center rounded-xl transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground data-popup-open:bg-sidebar-hover active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
        }
        title="Notifications"
      >
        <m.span
          /* Remounting is what restarts the shake, so the header bell -- the
             one that can be on screen when a notification arrives -- is keyed
             on it. The rail bell never was. */
          key={isHeader ? shakeKey : undefined}
          className="inline-grid place-items-center"
          style={{ transformOrigin: "50% 12%" }}
          animate={shakeAnimate}
          transition={shakeTransition}
          whileTap={{ scale: 0.9, transition: SPRINGS.snappy }}
        >
          {/* The bell's weight sits low (wide skirt plus the clapper below it),
              so a geometrically centred glyph reads a hair low. A static
              transform on the icon itself, independent of the parent span's
              animated rotate / scale. */}
          <Bell size={isHeader ? 18 : 19} strokeWidth={1.9} style={{ transform: "translateY(-0.5px)" }} />
        </m.span>
        {unreadCount > 0 &&
          /* A dot on the header's paper circle, a counted pill on the rail:
             the header bell sits beside a New-post button and a search pill,
             where a number would be a third thing competing for the same
             corner; the rail band has nothing else in it. */
          (isHeader ? (
            <m.span
              className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-card bg-cinnamon"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: 1 }}
              transition={{ duration: 0.42, ease: EASE_POP, times: [0, 0.6, 1] }}
            />
          ) : (
            <m.span
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cinnamon px-1 text-[10px] font-bold text-white"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: 1 }}
              transition={{ duration: 0.42, ease: EASE_POP, times: [0, 0.6, 1] }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </m.span>
          ))}
        {/* Without this the button's accessible name is whatever the badge says
            -- literally "1" -- or nothing at all when the count is zero,
            because `title` only fills in when there is no other content. A
            screen reader announced a bare number and no clue what pressing it
            does. Found while masking the badge out of the visual suite, which
            could not find the control by name either. */}
        <span className="sr-only">
          {unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
        </span>
      </DropdownMenuTrigger>
      <NotificationPanel
        notifications={notifications}
        loaded={loaded}
        unreadCount={unreadCount}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
        onMarkAllRead={handleMarkAllRead}
        onClickNotification={handleClickNotification}
      />
    </DropdownMenu>
  );
}

function NotificationPanel({
  notifications,
  loaded,
  unreadCount,
  hasMore,
  onLoadMore,
  onMarkAllRead,
  onClickNotification,
}: {
  notifications: Notification[];
  loaded: boolean;
  unreadCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
  onMarkAllRead: () => void;
  onClickNotification: (notif: Notification) => void;
}) {
  // The panel's own scroll box is the observer root (the page never scrolls
  // this list), so the sentinel fires as the READER nears the bottom of the
  // box, a page before they need it. Rows arriving from a later page animate
  // in through auto-animate rather than popping the scroll height.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [listRef] = useAutoAnimate();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const rootEl = scrollRef.current;
    const el = sentinelRef.current;
    if (!rootEl || !el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) onLoadMore();
      },
      { root: rootEl, rootMargin: "120px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, onLoadMore]);

  return (
    <DropdownMenuContent align="end" className="w-80">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="font-heading text-sm font-bold tracking-tight">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 rounded-sm text-xs text-leaf hover:text-leaf-light active:opacity-70 transition-opacity duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Check className="h-3 w-3" />
            Mark all read
          </button>
        )}
      </div>
      <Separator />
      <div ref={scrollRef} className="max-h-80 overflow-y-auto">
        {notifications.length === 0 && loaded && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        )}
        {!loaded && (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Loading...
          </div>
        )}
        <div ref={listRef}>
        {notifications.map((notif) => {
          const { icon: Icon, heart, label } = notificationIconMeta(notif.type);
          return (
            <DropdownMenuItem
              key={notif.id}
              onClick={() => onClickNotification(notif)}
              className={`items-start gap-2.5 px-3 py-2 ${!notif.read ? "bg-leaf/5" : ""}`}
            >
              <span
                aria-hidden
                title={label}
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${
                  heart ? "bg-heart/10" : "bg-muted text-muted-foreground"
                }`}
              >
                {heart ? (
                  // The heart is ALWAYS #E03A33, filled, painted on the first frame
                  // with transition: none -- it can never tween through the muted
                  // icon colour used by every other type above.
                  <Icon
                    className="size-3.5"
                    strokeWidth={1.9}
                    fill="#E03A33"
                    stroke="#E03A33"
                    style={{ transition: "none" }}
                  />
                ) : (
                  <Icon className="size-3.5" strokeWidth={1.9} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm text-foreground">{notif.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatTimeAgo(new Date(notif.createdAt))}
                </p>
              </span>
            </DropdownMenuItem>
          );
        })}
        </div>
        {/* Sentinel: a slim shimmer row while more pages exist; unmounts with
            the last page so the list simply ends. */}
        {hasMore && (
          <div ref={sentinelRef} className="flex items-center gap-2.5 px-3 py-2" aria-hidden>
            <div className="skeleton-warm h-6 w-6 shrink-0 rounded-full" />
            <div className="skeleton-warm h-3 w-40 rounded-full" />
          </div>
        )}
      </div>
    </DropdownMenuContent>
  );
}
