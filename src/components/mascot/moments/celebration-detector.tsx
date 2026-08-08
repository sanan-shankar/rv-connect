"use client";

/* ------------------------------------------------------------------ *
 *  CelebrationDetector — decides, once per mount, whether any of the
 *  three "earned" one-shot moments (post-signup welcome, your first
 *  Letter, a proud moment) should fire, by comparing today's numbers
 *  (fetched server-side by celebration-signals.tsx) against what this
 *  browser has seen before (one-shot.ts). It never touches the rig
 *  directly — a real transition just enqueues a `CelebrationKind` and
 *  hands the actual playing off to <CelebrationHoopoe>, one at a time,
 *  so at most one extra <Hoopoe> this file is responsible for is ever
 *  in the DOM.
 *
 *  Every check below is idempotent: re-mounting on a later visit with
 *  unchanged numbers is always a no-op, and a moment already marked
 *  `hasFired` never re-evaluates its trigger again.
 * ------------------------------------------------------------------ */

import { useEffect, useRef, useState } from "react";
import { CelebrationHoopoe, type CelebrationKind } from "./celebration-hoopoe";
import { anotherHoopoeOnScreen } from "./one-hoopoe-guard";
import { hasFired, markFired, readProgress, writeProgress } from "./one-shot";

const POST_SIGNUP = "postSignupWelcome";
const FIRST_LETTER = "firstLetter";
const PROFILE_COMPLETE = "profileComplete";
const POST_MILESTONE = "postMilestone";
const MILESTONE_STEP = 10;

// One-hoopoe rule: checked BEFORE <CelebrationHoopoe> ever mounts, the same
// way sidebar-hoopoe.tsx checks before it sets its own `mounted` true. It
// must live here, not inside <CelebrationHoopoe> itself — by the time that
// component's onReady fires, its own bird is already in the DOM, so a
// self-check there would always see itself and never proceed.
const BLOCKED_RETRY_MS = 3000;
const MAX_BLOCKED_RETRIES = 10; // ~30s of deferring before it just plays anyway

// Queue entries carry their own id, not just a `kind`: finishing your profile
// and crossing a post milestone can both enqueue "proudMoment" in the same
// visit, and a plain `kind` string would be an unchanged React key across
// that second play, skipping its remount (and with it, `onReady` never
// firing again — see hoopoe.tsx's once-per-mount `readyRef` guard).
interface QueuedCelebration {
  id: number;
  kind: CelebrationKind;
}

export function CelebrationDetector({
  userId,
  isNewAccount,
  letterCount,
  postCount,
  profileComplete,
}: {
  userId: string;
  isNewAccount: boolean;
  letterCount: number;
  postCount: number;
  profileComplete: boolean;
}) {
  const [queue, setQueue] = useState<QueuedCelebration[]>([]);
  const nextId = useRef(0);
  const enqueue = (kind: CelebrationKind) =>
    setQueue((q) => [...q, { id: nextId.current++, kind }]);

  useEffect(() => {
    // 1. Post-signup welcome — once, ever, the first time a fresh account
    // lands on a page that mounts this detector (currently just /feed).
    if (isNewAccount && !hasFired(userId, POST_SIGNUP)) {
      markFired(userId, POST_SIGNUP);
      enqueue("postSignupWelcome");
    }
  }, [userId, isNewAccount]);

  useEffect(() => {
    // 2. Your first Letter — fires on the 0 -> 1 transition only. A
    // baseline is recorded the first time this ever runs for a member so
    // someone with letters already written before this shipped never gets
    // a surprise celebration out of nowhere.
    if (hasFired(userId, FIRST_LETTER)) return;
    const baseline = readProgress(userId, FIRST_LETTER);
    if (baseline === null) {
      writeProgress(userId, FIRST_LETTER, letterCount);
      return;
    }
    if (baseline === 0 && letterCount >= 1) {
      markFired(userId, FIRST_LETTER);
      enqueue("firstLetter");
    } else if (letterCount !== baseline) {
      writeProgress(userId, FIRST_LETTER, letterCount);
    }
  }, [userId, letterCount]);

  useEffect(() => {
    // 3a. Proud moment — finishing your profile, once ever. "0" means
    // "seen incomplete before"; completion only counts as a real
    // transition (and fires) once we've recorded that. An already-complete
    // profile the very first time this runs is just the new baseline, not
    // something to celebrate out of nowhere.
    if (hasFired(userId, PROFILE_COMPLETE)) return;
    const seen = readProgress(userId, PROFILE_COMPLETE);
    if (seen === null) {
      writeProgress(userId, PROFILE_COMPLETE, profileComplete ? 1 : 0);
      return;
    }
    if (profileComplete && seen === 0) {
      markFired(userId, PROFILE_COMPLETE);
      enqueue("proudMoment");
    } else if (!profileComplete && seen !== 0) {
      writeProgress(userId, PROFILE_COMPLETE, 0);
    }
  }, [userId, profileComplete]);

  useEffect(() => {
    // 3b. Proud moment — crossing a post milestone (10th, 20th, ...). Same
    // baseline trick: a member already past a few milestones when this
    // ships gets today's count as their starting line, not a backlog of
    // celebrations for progress made before the feature existed.
    const floor = Math.floor(postCount / MILESTONE_STEP) * MILESTONE_STEP;
    const last = readProgress(userId, POST_MILESTONE);
    if (last === null) {
      writeProgress(userId, POST_MILESTONE, floor);
      return;
    }
    if (floor > last && floor >= MILESTONE_STEP) {
      writeProgress(userId, POST_MILESTONE, floor);
      enqueue("proudMoment");
    }
  }, [userId, postCount]);

  const playing = queue[0] ?? null;
  const [canRender, setCanRender] = useState(false);

  // Wait for a clear stage before ever mounting <CelebrationHoopoe>. Re-arms
  // whenever a new item reaches the head of the queue (`playing?.id`).
  useEffect(() => {
    if (!playing) {
      setCanRender(false);
      return;
    }
    let cancelled = false;
    let tries = 0;
    function poll() {
      if (cancelled) return;
      if (anotherHoopoeOnScreen() && tries < MAX_BLOCKED_RETRIES) {
        tries += 1;
        window.setTimeout(poll, BLOCKED_RETRY_MS);
        return;
      }
      setCanRender(true);
    }
    poll();
    return () => {
      cancelled = true;
    };
    // Keyed on the id, not the object. `playing` is a fresh object on every queue
    // change, so depending on it would tear this poll down and restart it (retry
    // counter and all) mid-wait every time an unrelated celebration was queued
    // behind this one. The id identifies the celebration actually playing, and it
    // is the only thing that should re-arm the wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing?.id]);

  if (!playing || !canRender) return null;

  return (
    <CelebrationHoopoe
      key={playing.id}
      kind={playing.kind}
      onDone={() => setQueue((q) => q.slice(1))}
    />
  );
}
