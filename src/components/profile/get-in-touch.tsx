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
 */
export function GetInTouch({
  name,
  methods,
  vcard,
}: {
  name: string;
  methods: ContactMethod[];
  vcard: string;
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
          size="sm"
          className="rounded-full"
          onClick={() => setOpen(true)}
          disabled={!hasMethods}
          title={hasMethods ? undefined : "This member hasn't shared contact details yet."}
        >
          <Mail className="h-3.5 w-3.5" />
          Get in touch
        </Button>
        <Button variant="outline" size="sm" className="rounded-full" onClick={saveContact}>
          <Download className="h-3.5 w-3.5" />
          Save contact
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reach {firstName}</DialogTitle>
            <DialogDescription>
              {firstName} chose to share these ways to connect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            {methods.map((m) => {
              const Icon = ICONS[m.kind];
              return (
                <a
                  key={m.kind + m.value}
                  href={m.href}
                  target={m.external ? "_blank" : undefined}
                  rel={m.external ? "noopener noreferrer" : undefined}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 transition-colors duration-150 hover:border-leaf/40 hover:bg-leaf/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.99]"
                >
                  <Icon className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-foreground">
                      {m.label}
                    </span>
                    <span className="block truncate text-[12px] text-muted-foreground">
                      {m.value}
                    </span>
                  </span>
                </a>
              );
            })}
          </div>
          <Button variant="outline" className="rounded-full" onClick={saveContact}>
            <Download className="h-4 w-4" />
            Save contact card
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
