"use client";

import { Mail } from "lucide-react";

export function MagicLinkSent({ email }: { email: string }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-leaf/10">
        <Mail className="h-8 w-8 text-leaf" />
      </div>
      <p className="text-base text-foreground">
        We sent a magic link to{" "}
        <span className="font-medium">{email}</span>.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Click the link in the email to complete your signup and start
        exploring.
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Didn&apos;t receive it? Check your spam folder.
      </p>
    </div>
  );
}
