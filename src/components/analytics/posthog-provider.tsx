"use client";

import { useEffect } from "react";
import { schedulePostHog } from "./posthog-client";

/* ------------------------------------------------------------------ *
 *  PostHog - what members actually do.
 *
 *  A pageview counter answers "34% India, 22% iOS" and nothing else --
 *  Vercel Analytics sat in the root layout doing exactly that until it was
 *  removed on 2026-08-26, rather than run two analytics tools for one job.
 *  This answers the questions the owner actually asked: how many people open
 *  /support and never contribute, which routes lead to which, what gets
 *  typed into directory search, whether the map or the batch list gets
 *  used. Those are funnels, paths and property breakdowns, and no
 *  pageview counter can produce them at any price.
 *
 *  Installed by hand rather than with `npx @posthog/wizard`, which is an
 *  LLM codemod over the repo and wires up session replay by default.
 *
 *  This component holds no library and no state: it exists to say WHEN the
 *  library loads. Everything about WHAT it does -- the key, every init
 *  option, and the M42 ordering guarantee -- lives in posthog-client.ts.
 *
 *  `posthog-js/react`'s <Provider> used to wrap the tree here. It was
 *  dropped with the defer: its only purpose is to serve the usePostHog()
 *  hooks, nothing in this app has ever called one, and keeping it would
 *  have meant importing posthog-js statically after all -- which is the
 *  entire cost this change exists to remove.
 * ------------------------------------------------------------------ */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    schedulePostHog();
  }, []);

  return <>{children}</>;
}
