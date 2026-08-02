"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Bell,
  HelpCircle,
  PenLine,
  Clock,
  BookOpen,
  Heart,
  MessageCircle,
  Users,
  ShieldCheck,
  ShieldAlert,
  Mail,
  Flag,
} from "lucide-react";
import { motion } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { formatTimeAgo } from "@/lib/utils";
import {
  getNotifications,
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
  // Groups.
  group_invite: { icon: Users, label: "Group" },
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
  // Bumping this key re-mounts the motion shake so it replays the keyframes.
  // It only ever rises when the unread count climbs, so the bell gives one
  // gentle decaying shake per new notification, never on decrement or hover.
  const [shakeKey, setShakeKey] = useState(0);
  const prevUnread = useRef(initialUnreadCount);

  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Shakes the bell when the unread count RISES. That comparison only exists across renders, which is what the ref and this effect are for.
      setShakeKey((k) => k + 1);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  const [open, setOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) void handleOpen();
  }

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
    if (!loaded) {
      const data = await getNotifications();
      setNotifications(data);
      setLoaded(true);
    }
  }

  async function handleClickNotification(notif: Notification) {
    if (!notif.read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notif.link) {
      router.push(notif.link);
    }
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  if (variant === "header") {
    return (
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        {/* `state-layer` supplies the surface half of the hover (and keeps the
            trigger lit while the panel is open, via data-popup-open). Before it
            the only hover here was the glyph darkening from muted to full ink,
            which is a change you have to already be looking for on a 40px
            circle sitting on a paper card. */}
        <DropdownMenuTrigger
          className="bell-trigger state-layer relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(30,28,22,0.04)] transition-[color,transform] duration-150 ease-out hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          title="Notifications"
        >
          <motion.span
            key={shakeKey}
            className="inline-grid place-items-center"
            style={{ transformOrigin: "50% 12%" }}
            animate={shakeAnimate}
            transition={shakeTransition}
            whileTap={{ scale: 0.9, transition: SPRINGS.snappy }}
          >
            {/* The bell's weight sits low (body + clapper are bottom-heavy), so
                the glyph is nudged up a hair to sit optically centered in the
                40px circle. A static transform on the icon itself, independent
                of the parent span's animated rotate / scale. */}
            <Bell size={18} strokeWidth={1.9} style={{ transform: "translateY(-0.5px)" }} />
          </motion.span>
          {unreadCount > 0 && (
            <motion.span
              className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full border-2 border-card bg-cinnamon"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.3, 1], opacity: 1 }}
              transition={{ duration: 0.42, ease: EASE_POP, times: [0, 0.6, 1] }}
            />
          )}
          <span className="sr-only">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
          </span>
        </DropdownMenuTrigger>
        <NotificationPanel
          notifications={notifications}
          loaded={loaded}
          unreadCount={unreadCount}
          onMarkAllRead={handleMarkAllRead}
          onClickNotification={handleClickNotification}
        />
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      {/* This variant lives in exactly one place: the mobile sticky green band
          (sidebar.tsx). It used to be a `display: block` button with p-2, so
          the 18px glyph was placed on the button's 24px text baseline and sat
          3.5px ABOVE the band's centre (measured: 15.5px of band above it,
          22.5px below) while the hamburger beside it, a real 40px grid box,
          was dead centre. A fixed 40x40 grid box removes the baseline entirely
          and matches the hamburger; hover/focus are RAIL colours, never the warm
          light-surface ones and never `state-layer`, because the rail is the one
          surface in the app that owns its own state ladder in both themes. The
          hover was `bg-white/[0.07]`, tuned against the canopy band: on the dark
          charcoal rail that alpha overshoots the tuned `--sidebar-hover` rung,
          so it uses the token now and tracks whichever theme is on. */}
      <DropdownMenuTrigger
        className="relative grid size-10 shrink-0 place-items-center rounded-xl transition-[background-color,color,transform] duration-150 ease-out hover:bg-sidebar-hover hover:text-sidebar-foreground data-popup-open:bg-sidebar-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60 active:scale-95"
        title="Notifications"
      >
        <motion.span
          className="inline-grid place-items-center"
          style={{ transformOrigin: "50% 12%" }}
          animate={shakeAnimate}
          transition={shakeTransition}
          whileTap={{ scale: 0.9, transition: SPRINGS.snappy }}
        >
          {/* Same optical nudge as the header variant: the bell's mass sits low
              (wide skirt plus the clapper below it), so a geometrically centred
              glyph reads a hair low. */}
          <Bell size={19} strokeWidth={1.9} style={{ transform: "translateY(-0.5px)" }} />
        </motion.span>
        {unreadCount > 0 && (
          <motion.span
            className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cinnamon px-1 text-[10px] font-bold text-white"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.3, 1], opacity: 1 }}
            transition={{ duration: 0.42, ease: EASE_POP, times: [0, 0.6, 1] }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </DropdownMenuTrigger>
      <NotificationPanel
        notifications={notifications}
        loaded={loaded}
        unreadCount={unreadCount}
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
  onMarkAllRead,
  onClickNotification,
}: {
  notifications: Notification[];
  loaded: boolean;
  unreadCount: number;
  onMarkAllRead: () => void;
  onClickNotification: (notif: Notification) => void;
}) {
  return (
    <DropdownMenuContent align="end" className="w-80">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="font-heading text-sm font-bold tracking-tight">Notifications</h3>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-1 rounded-sm text-xs text-leaf hover:text-leaf-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-70 transition-opacity duration-150"
          >
            <Check className="h-3 w-3" />
            Mark all read
          </button>
        )}
      </div>
      <Separator />
      <div className="max-h-80 overflow-y-auto">
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
    </DropdownMenuContent>
  );
}
