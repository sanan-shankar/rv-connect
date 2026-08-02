"use client";

import { useState } from "react";
import { Mail, Phone, Instagram, Linkedin, Globe, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export interface ContactMethod {
  kind: "email" | "phone" | "instagram" | "linkedin" | "website";
  label: string;
  value: string;
  href: string;
  external?: boolean;
}

const ICONS = {
  email: Mail,
  phone: Phone,
  instagram: Instagram,
  linkedin: Linkedin,
  website: Globe,
} as const;

/**
 * "Get in touch" CTA for other people's profiles. Opens a small dialog of the
 * contact methods the person actually shared, plus a Save contact (.vcf) action.
 * Honest about being a directory: no fake inbox.
 *
 * `showSave` controls the OUTER Save-contact button only; the dialog always
 * carries its own. Surfaces that want a single CTA (Letterhead II's masthead)
 * pass false.
 *
 * `size` is the shared Button scale. "sm" (h-9) is the default because this
 * usually sits in a crowded action row; a surface where this is the page's ONE
 * action passes "default" (h-10) so it reads at the same weight as every other
 * primary CTA in the app (owner, 2026-07-30: "I wanted like a proper size like
 * we have in the feed and everywhere ... it's kind of shrunken").
 */
export function GetInTouch({
  name,
  methods,
  vcard,
  showSave = true,
  size = "sm",
}: {
  name: string;
  methods: ContactMethod[];
  vcard: string;
  showSave?: boolean;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const firstName = name.split(" ")[0];
  const hasMethods = methods.length > 0;

  function saveContact() {
    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/\s+/g, "-")}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          size={size}
          className="rounded-full"
          onClick={() => setOpen(true)}
          disabled={!hasMethods}
          title={hasMethods ? undefined : "This member hasn't shared contact details yet."}
        >
          <Mail className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          Get in touch
        </Button>
        {showSave && (
          <Button variant="outline" size={size} className="rounded-full" onClick={saveContact}>
            <Download className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
            Save contact
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reach {firstName}</DialogTitle>
            <DialogDescription>
              {firstName} chose to share these ways to connect.
            </DialogDescription>
          </DialogHeader>
          {/* One tile per shared method. Every tile is the same shape: 12px
              radius (a step inside the dialog's own corner, per the nesting
              rule), one border weight, one 8px gap. */}
          <div className="space-y-2">
            {methods.map((m) => {
              const Icon = ICONS[m.kind];
              return (
                <a
                  key={m.kind + m.value}
                  href={m.href}
                  target={m.external ? "_blank" : undefined}
                  rel={m.external ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-3 rounded-[var(--radius-md)] border border-border bg-card px-3.5 py-3 transition-colors duration-150 hover:border-leaf/40 hover:bg-leaf/5 active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-foreground">
                      {m.label}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted-foreground">
                      {m.value}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
          {/* The material's one footer shape: a right-aligned action row
              (no full-width buttons in dialogs; the X handles close). */}
          <div className="flex justify-end pt-1">
            <Button variant="secondary" onClick={saveContact}>
              <Download className="h-4 w-4" />
              Save contact card
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
