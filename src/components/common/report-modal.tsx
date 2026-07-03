"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { SPRINGS } from "@/components/common/motion";
import { cn } from "@/lib/utils";

/**
 * Shared modal shell for every report / flag flow (report a post, flag a
 * person, and any future report affordance). Owner ask: the backdrop should
 * fade in and read as the background gradually blurring, then the panel
 * animates in a beat after it with a gentle spring. Closing must reverse
 * (panel exits, blur fades out), so this stays mounted at all call sites and
 * lets AnimatePresence drive the real exit instead of the parent yanking the
 * whole tree out on close.
 */
export function ReportModal({
  open,
  onClose,
  labelledBy,
  describedBy,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div key="report-modal" className="fixed inset-0 z-50 grid place-items-center p-4">
          {/* Backdrop: opacity is the only animated property. The blur and warm
              tint are constant, so the opacity fade itself reads as the
              background gradually blurring rather than a hard cut. */}
          <motion.div
            className="fixed inset-0 bg-[#241a12]/55 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.22, ease: "easeOut" } }}
            exit={{ opacity: 0, transition: { duration: 0.18, ease: "easeIn" } }}
          />

          {/* Panel: enters a beat after the backdrop with a gentle spring; no
              delay on the way out so it doesn't lag the close. */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-describedby={describedBy}
            className={cn(
              "relative z-10 w-full max-w-sm rounded-xl border border-border bg-float p-4 shadow-[0_1px_2px_rgba(30,28,22,0.06),0_24px_48px_-24px_rgba(30,28,22,0.55)]",
              className
            )}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { ...SPRINGS.gentle, delay: 0.08 },
            }}
            exit={{ opacity: 0, scale: 0.96, y: 8, transition: { ...SPRINGS.gentle, delay: 0 } }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
