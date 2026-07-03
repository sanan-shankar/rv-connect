import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = {
  title: "Catch-ups",
};

export default function CatchupsPage() {
  return (
    <div>
      <PageHeader
        title="Catch-ups"
        subtitle="A gentle group newsletter: everyone answers a few prompts, and their replies are gathered into one issue."
      />
      <ComingSoon
        icon={MessagesSquare}
        eyebrow="In the works"
        title="A round of catching up, on a rhythm"
        cta={{ href: "/groups", label: "Browse your groups" }}
      >
        <p>
          A Catch-up is run from a group. Each round, every member is asked a few questions, and
          their answers are compiled into a single warm issue for the whole group to read, with a
          browsable archive of past ones.
        </p>
        <p>
          This is the one feature that needs a scheduler and email behind it, so it arrives just
          after the site goes live. For now, gather your people into a group.
        </p>
      </ComingSoon>
    </div>
  );
}
