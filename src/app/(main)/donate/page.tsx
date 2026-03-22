"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const UPI_ID = "your-upi-id@bank";

export default function DonatePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-3xl font-bold text-foreground">
        Support RV Alumni
      </h1>
      <p className="mt-3 text-lg text-muted-foreground">
        RV Alumni is a community-run platform — no ads, no tracking, no fees.
        Your contribution helps cover hosting, maintenance, and keeps this space
        alive for all Rishi Valley alumni.
      </p>

      <div className="mt-8 glass rounded-xl p-6 text-center">
        <h2 className="font-heading text-xl font-bold text-foreground">
          Donate via UPI
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scan the QR code or copy the UPI ID below
        </p>

        {/* QR Code placeholder — replace with actual image at /images/donate-qr.png */}
        <div className="mx-auto mt-6 flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50">
          <span className="text-sm text-muted-foreground">QR Code</span>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
          <code className="text-sm font-medium text-foreground">{UPI_ID}</code>
          <CopyButton text={UPI_ID} />
        </div>

        <p className="mt-6 text-xs text-muted-foreground">
          Every bit helps — even a small amount makes a difference.
        </p>
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded p-1 text-muted-foreground hover:text-foreground"
      title="Copy UPI ID"
    >
      {copied ? (
        <Check className="h-4 w-4 text-leaf" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}
