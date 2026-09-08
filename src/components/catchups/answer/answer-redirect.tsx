"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * Spec 3.4 edge state: entering /answer when the Edition is not `answering`
 * (still collecting, being prepared, or already published) bounces back to
 * the Catch-up home with a toast, rather than showing a broken or empty
 * answering shell.
 */
export function AnswerRedirect({ href, message }: { href: string; message: string }) {
  const router = useRouter();

  useEffect(() => {
    toast(message);
    router.replace(href);
    // Runs once per mount: this screen exists only to bounce the visitor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <div className="skeleton-warm h-3 w-32 rounded-full" />
      <p className="text-sm text-muted-foreground">Taking you back to the Catch-up...</p>
    </div>
  );
}
