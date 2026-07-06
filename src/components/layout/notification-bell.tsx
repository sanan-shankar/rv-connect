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
import {
  BellDeliveryHoopoe,
  shouldOfferBellDelivery,
  markBellDeliveryShownToday,
  type BellRect,
} from "@/components/mascot/moments/bell-delivery-hoopoe";
import { anotherHoopoeOnScreen } from "@/components/mascot/moments/one-hoopoe-guard";

// Sane failsafe (idea #11's brief: "the notification thing opens only after
// the bird lands and delivers the letter" -- but a hiccup mid-animation must
// never leave the panel stuck shut). The delivery's own real runtime (the
// off-canvas flyIn's distance-scaled cruise, capped at 1.9s, plus its landing
// squash, plus land()'s own squash, plus the sleep(240) beat, plus nod())
// measured ~3.7-4.1s end to end in runtime verification -- NOT "well under
// 2.5s" as an earlier pass here claimed. This sits comfortably above that
// with real headroom for a slower device/browser rather than racing it.
const DELIVERY_FAILSAFE_MS = 6000;

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

  // ---- letter-delivery gate (mascot-moments idea #11) ----
  // The dropdown is now a CONTROLLED menu so an "open" attempt can be
  // deferred: when the gate fires we cancel base-ui's own open handling and
  // only flip `open` true ourselves once the hoopoe has actually delivered
  // the letter (see BellDeliveryHoopoe's onDelivered below).
  const bellRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [deliveryRect, setDeliveryRect] = useState<BellRect | null>(null);
  const deliveryActiveRef = useRef(false);
  const openedRef = useRef(false);
  const failsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearDeliveryFailsafe() {
    if (failsafeRef.current !== null) {
      clearTimeout(failsafeRef.current);
      failsafeRef.current = null;
    }
  }

  // Never leaves a pending failsafe timer trying to setState after this
  // bell (a route change, a mobile/desktop swap) has already unmounted.
  useEffect(() => clearDeliveryFailsafe, []);

  // The one place `open` actually flips true, whether that's a plain click
  // with nothing to deliver, the delivery's own onDelivered, or the failsafe
  // firing because something about the animation hiccuped. Idempotent so
  // onDelivered and the failsafe can never both fire real side effects.
  function openPanelNow() {
    clearDeliveryFailsafe();
    if (openedRef.current) return;
    openedRef.current = true;
    setOpen(true);
    void handleOpen();
  }

  function finishDelivery() {
    deliveryActiveRef.current = false;
    setDeliveryRect(null);
  }

  function handleOpenChange(next: boolean, eventDetails?: { cancel: () => void }) {
    if (!next) {
      setOpen(false);
      openedRef.current = false;
      return;
    }
    if (deliveryActiveRef.current) {
      // An impatient second click mid-delivery: never trap them behind the
      // animation, just open immediately. The bird finishes its own beat
      // independently and fades out on its own.
      openPanelNow();
      return;
    }
    const bell = bellRef.current;
    if (bell && shouldOfferBellDelivery(unreadCount > 0) && !anotherHoopoeOnScreen()) {
      eventDetails?.cancel();
      markBellDeliveryShownToday();
      deliveryActiveRef.current = true;
      openedRef.current = false;
      setDeliveryRect(bell.getBoundingClientRect());
      failsafeRef.current = setTimeout(openPanelNow, DELIVERY_FAILSAFE_MS);
      return;
    }
    openPanelNow();
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

  // Always mounted (anchorRect starts/returns to null between deliveries) —
  // see bell-delivery-hoopoe.tsx's file banner for why a conditional
  // `deliveryRect && <BellDeliveryHoopoe .../>` here reintroduces a real
  // Strict-Mode-only bug where the delivery's own onReady timer gets
  // cleared before it fires and the letter never delivers.
  const deliveryOverlay = (
    <BellDeliveryHoopoe
      anchorRect={deliveryRect}
      onDelivered={openPanelNow}
      onFinished={finishDelivery}
    />
  );

  if (variant === "header") {
    return (
      <>
      <DropdownMenu open={open} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger
          ref={bellRef}
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
      {deliveryOverlay}
      </>
    );
  }

  return (
    <>
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger ref={bellRef} className="relative rounded-lg p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-95 transition-transform duration-150" title="Notifications">
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
    {deliveryOverlay}
    </>
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
