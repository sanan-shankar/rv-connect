"use client";

import { useState } from "react";
import { Copy, Check, HeartHandshake } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";

// Replace with the real UPI ID before launch.
const UPI_ID = "your-upi-id@bank";

const COVERS = [
  "The server that runs the site",
  "The database that holds everyone's posts and profiles",
  "Storage for the photographs in the Collection",
];

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Support RV Alumni"
        subtitle="This is a community-run space. No ads, no tracking, no fees. A small contribution keeps it online for everyone."
      />

      <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-heart/10 text-heart">
          <HeartHandshake className="h-6 w-6" strokeWidth={1.7} />
        </span>
        <h2 className="mt-4 font-heading text-xl font-bold tracking-tight text-foreground">
          Chip in via UPI
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Scan the code, or copy the UPI ID below. Any amount helps.
        </p>

        {/* Replace with the real QR at /images/support-qr.png */}
        <div className="mx-auto mt-6 flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-border bg-paper">
          <span className="text-sm text-muted-foreground">QR code</span>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-paper px-4 py-2">
          <code className="text-sm font-medium text-foreground">{UPI_ID}</code>
          <CopyButton text={UPI_ID} />
        </div>
      </div>

      <div className="card-elevated mt-5 rounded-[var(--radius)] border border-border bg-card p-6">
        <h3 className="text-[10.5px] font-bold uppercase tracking-[0.13em] text-muted-foreground">
          What it covers
        </h3>
        <ul className="mt-3 space-y-2">
          {COVERS.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-[14.5px] text-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] leading-relaxed text-muted-foreground">
          Run by an alumnus, for alumni. Whatever is left over after the bills stays toward keeping
          the lights on next year.
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
      className="rounded-md p-1.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-90 transition-transform duration-150"
      title="Copy UPI ID"
    >
      {copied ? <Check className="h-4 w-4 text-leaf" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}
