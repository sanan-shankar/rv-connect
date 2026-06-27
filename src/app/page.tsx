import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Feather } from "lucide-react";
import { LandingHero } from "@/components/landing/landing-hero";
import { SectionReveal } from "@/components/landing/section-reveal";
import { BirdAvatar } from "@/components/common/bird-avatar";

export const metadata: Metadata = {
  title: "Rishi Valley Alumni",
  description:
    "A quiet, invite-only home for Rishi Valley alumni and teachers. Find each other, share the valley, keep it close.",
};

function FeedMock() {
  const rows = [
    {
      id: "mock-rohan",
      name: "Rohan Mehta",
      batch: "Batch of '09",
      line: "Walked the lower fields at dawn. The lake is full again.",
      hearts: 14,
    },
    {
      id: "mock-leela",
      name: "Leela Rao",
      batch: "Batch of '14",
      line: "Anyone else remember the silence before assembly?",
      hearts: 23,
    },
  ];
  return (
    <div className="card-elevated overflow-hidden rounded-[var(--radius)] border border-border bg-card">
      {rows.map((r) => (
        <div key={r.id} className="border-b border-border px-5 py-4 last:border-0">
          <div className="flex items-center gap-3">
            <BirdAvatar user={{ id: r.id, name: r.name }} size="sm" />
            <div className="leading-tight">
              <div className="text-sm font-semibold text-foreground">{r.name}</div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
                {r.batch}
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-foreground">{r.line}</p>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-heart">
            <span aria-hidden>&#9829;</span>
            <span className="text-muted-foreground">{r.hearts}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LetterMock() {
  return (
    <div className="card-elevated rounded-[var(--radius)] border border-border bg-card p-6">
      <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.13em] text-cinnamon">
        <Feather className="h-3.5 w-3.5" />
        Letter
        <span className="text-muted-foreground/70">· 4 min read</span>
      </div>
      <h3 className="mt-2 font-heading text-2xl font-bold leading-snug tracking-[-0.01em] text-foreground">
        The year the lake came back
      </h3>
      <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
        Some of you will remember the dry years, when the lake by the lower fields was just a
        cracked bowl of clay and we walked across it on the way to the dairy...
      </p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-leaf">
        Read this letter <ArrowRight className="h-4 w-4" />
      </span>
    </div>
  );
}

function CollectionMock() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border" style={{ aspectRatio: "3 / 4" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/landing.jpeg"
            alt=""
            className="h-full w-full object-cover"
            style={{ objectPosition: `${i * 35}% center` }}
          />
        </div>
      ))}
    </div>
  );
}

const SECTIONS = [
  {
    eyebrow: "The feed",
    title: "A feed that reads like a letter, not a timeline",
    body: "Warm, unhurried, on ruled paper. Share a memory, a sighting, or an update. No ads, and no algorithm deciding what you see.",
    visual: <FeedMock />,
    flip: false,
  },
  {
    eyebrow: "Letters",
    title: "Room for the longer things",
    body: "When a post is too small for what you want to say, write a Letter: an essay, a tribute, a travelogue. It opens into a quiet reading page of its own.",
    visual: <LetterMock />,
    flip: true,
  },
  {
    eyebrow: "The Valley Collection",
    title: "A shared picture of the place",
    body: "The banyan, Rishi Konda, the birds, the light. A growing, community-catalogued archive of the valley itself, not a photo dump.",
    visual: <CollectionMock />,
    flip: false,
  },
];

export default function LandingPage() {
  return (
    <div className="bg-background">
      <LandingHero />

      <div className="mx-auto max-w-5xl px-6 py-20 sm:py-28 lg:px-8">
        <SectionReveal className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cinnamon">
            Invite only
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
            A small, private home for the people of the valley
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Alumni and teachers, past and present. Built and kept by one of us, for all of us.
          </p>
        </SectionReveal>

        <div className="mt-20 space-y-20 sm:mt-28 sm:space-y-28">
          {SECTIONS.map((s) => (
            <SectionReveal key={s.eyebrow}>
              <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2">
                <div className={s.flip ? "lg:order-2" : ""}>
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-leaf">
                    {s.eyebrow}
                  </p>
                  <h3 className="mt-2 font-heading text-2xl font-bold tracking-[-0.01em] text-foreground sm:text-3xl">
                    {s.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
                <div className={s.flip ? "lg:order-1" : ""}>{s.visual}</div>
              </div>
            </SectionReveal>
          ))}
        </div>
      </div>

      {/* Closing CTA */}
      <SectionReveal>
        <div className="border-t border-border bg-leaf/[0.06]">
          <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-24">
            <h2 className="font-heading text-3xl font-bold tracking-[-0.02em] text-foreground sm:text-4xl">
              Come home to the valley.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              If you grew up here or taught here, there is a place for you.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-leaf px-8 py-3.5 font-semibold text-white shadow-sm transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]"
              >
                Request an invite
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-8 py-3.5 font-semibold text-foreground transition-transform duration-200 hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.98]"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </SectionReveal>
    </div>
  );
}
