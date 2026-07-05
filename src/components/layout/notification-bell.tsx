"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Bell, HelpCircle, PenLine, Clock, BookOpen, Heart } from "lucide-react";
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
import type { CatchupNotifyKind } from "@/lib/catchups-types";

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
 * Catch-ups notification type -> icon/label mapping (spec section 5). Every
 * other `Notification.type` (the pre-existing "like" | "comment" | "reply" |
 * "admin", and anything future) stays unmapped and falls back to the plain
 * `Bell` glyph below, so this addition never changes how those already read.
 */
const CATCHUP_NOTIFICATION_META: Partial<Record<CatchupNotifyKind, { icon: typeof Bell; label: string }>> = {
  catchup_questions_open: { icon: HelpCircle, label: "Questions open" },
  catchup_answers_open: { icon: PenLine, label: "Answers open" },
  catchup_reminder: { icon: Clock, label: "Reminder" },
  catchup_published: { icon: BookOpen, label: "Round published" },
  catchup_love: { icon: Heart, label: "Loved your answer" },
};

function notificationIcon(type: string): typeof Bell {
  return CATCHUP_NOTIFICATION_META[type as CatchupNotifyKind]?.icon ?? Bell;
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
      setShakeKey((k) => k + 1);
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

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
      <DropdownMenu onOpenChange={(open) => open && handleOpen()}>
        <DropdownMenuTrigger
          className="bell-trigger relative grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-[0_1px_2px_rgba(30,28,22,0.04)] transition-transform duration-150 ease-out hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
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
    <DropdownMenu onOpenChange={(open) => open && handleOpen()}>
      <DropdownMenuTrigger className="relative rounded-lg p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 transition-transform duration-150" title="Notifications">
        <motion.span
          className="inline-grid place-items-center"
          style={{ transformOrigin: "50% 12%" }}
          animate={shakeAnimate}
          transition={shakeTransition}
          whileTap={{ scale: 0.9, transition: SPRINGS.snappy }}
        >
          <Bell size={18} strokeWidth={1.9} />
        </motion.span>
        {unreadCount > 0 && (
          <motion.span
            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-cinnamon px-1 text-[10px] font-bold text-white"
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
          const Icon = notificationIcon(notif.type);
          return (
            <DropdownMenuItem
              key={notif.id}
              onClick={() => onClickNotification(notif)}
              className={`items-start gap-2.5 px-3 py-2 ${!notif.read ? "bg-leaf/5" : ""}`}
            >
              <span
                aria-hidden
                className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
              >
                <Icon className="size-3.5" strokeWidth={1.9} />
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
