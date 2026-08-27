"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { createPost, editPost } from "@/app/(main)/feed/actions";
import { safeGet, safeSet, safeRemove } from "@/lib/local-storage";

/* ------------------------------------------------------------------ *
 *  Everything that keeps a letter from being lost, lifted out of
 *  create-post-form whole (audit feed-posts-02).
 *
 *  Four machines that interlock through the four refs below and nothing
 *  else: the device-side crash net, the idle autosave, the read-back of a
 *  local copy the server never got, and the save that fires when somebody
 *  navigates away mid-sentence. This is the most audit-scarred code in the
 *  repo -- C-014, C-175, C-176, C-177, B-043 and M66 all live here -- which
 *  is the argument for it being one named unit rather than 310 lines in the
 *  middle of the app's largest component. Every line of reasoning came with
 *  it; nothing here was rewritten in the move.
 *
 *  The composer keeps: the editor DOM, the submit, and the decision about
 *  what to do with a restored draft (`onRestore`).
 * ------------------------------------------------------------------ */

/* The device-side copy of a letter in progress, and the fingerprint of what
   the server was last told. Both live out here, taking their values as
   arguments, because the leave-the-page save below runs from an unmount
   cleanup and cannot read a hook's closure. */
/**
 * The crash-net key, scoped to the ACCOUNT as well as the row.
 *
 * It used to be `rv:letter-draft:${postId ?? "new"}`, with no member in it.
 * Signing out clears cookies, not localStorage, and the ":new" key is only
 * cleared by a successful save -- so on a shared browser (a family laptop, a
 * library machine, the one the owner demos on) the next person to open
 * /letters/new had the previous member's unsaved letter restored silently into
 * their composer, under their own name (audit C-014).
 *
 * A key with nobody's id in it simply does not match anybody else's, so the
 * old rows are unreachable rather than wrong. They expire with the browser.
 */

const localDraftKey = (userId: string | null | undefined, postId?: string) =>
  `rv:letter-draft:${userId ?? "anon"}:${postId ?? "new"}`;

/* Private mode or a full quota loses the draft silently, which is the right
   trade: the editor still has the text on screen and this was only ever the
   belt. See src/lib/local-storage.ts. */
function stashLocalDraft(key: string, content: string, title: string) {
  safeSet(key, JSON.stringify({ content, title, at: Date.now() }));
}

function dropLocalDraft(key: string) {
  safeRemove(key);
}

/** Everything a save would send, in one comparable string. */
const draftSnapshot = (content: string, title: string, images: string[], city: string | null) =>
  JSON.stringify([content.trim(), title.trim(), images, city ?? ""]);


export interface LetterDraft {
  content: string;
  title: string;
  images: string[];
  audienceCity: string | null;
  isLetter: boolean;
}

export function useLetterPersistence({
  userId,
  postId,
  defaultLetter,
  draft,
  initial,
  submittingRef,
  editorRef,
  onAutosaveState,
  onRestore,
}: {
  /** The signed-in member. In the crash-net key, so one person's unsaved
   *  letter can never be restored into another's composer (audit C-014). */
  userId: string | null | undefined;
  /** An existing DRAFT row being resumed; absent means a fresh letter with
   *  nothing on the server yet. */
  postId?: string;
  defaultLetter: boolean;
  /** What is on the sheet right now. */
  draft: LetterDraft;
  /** What the sheet opened with, so a restore can tell whether the device
   *  copy says anything the server row does not. */
  initial: {
    content?: string;
    title?: string;
    images?: string[];
    cityScope?: string | null;
    updatedAt?: string;
  };
  /** The composer's synchronous submit latch. Both the autosave and the exit
   *  save must stand down while a real save is in flight (audit C-175). */
  submittingRef: React.RefObject<boolean>;
  /** The contentEditable. Read only to tell whether the editor is mounted;
   *  the hook never writes it. */
  editorRef: React.RefObject<HTMLDivElement | null>;
  /** Quiet autosave status for the desk chrome ("Saving..." / "Saved"). */
  onAutosaveState?: (s: "saving" | "saved" | "failed") => void;
  /** Put a recovered draft back on the sheet. */
  onRestore: (local: { content: string; title?: string }) => void;
}) {
  const { content, title, images, audienceCity, isLetter } = draft;
  const {
    content: initialContent,
    title: initialTitle,
    images: initialImages,
    cityScope: initialCityScope,
    updatedAt: initialUpdatedAt,
  } = initial;

  /* The version of the draft row this desk last saw, sent with every save so a
     stale tab cannot overwrite newer writing from another one (audit M66).
     A ref, not state: it must be read and advanced inside the autosave
     callback without re-arming the effect that scheduled it. */
  const baseUpdatedAtRef = useRef<string | null>(initialUpdatedAt ?? null);
  /* What the server was last told, so leaving can tell whether there is
     anything new to write. Stamped by every successful save; compared by the
     unmount save below, which is what stops a Publish or a Save-as-draft --
     both of which navigate, and so unmount this editor -- from being written
     a second time on the way out. */
  const savedSnapshotRef = useRef(
    draftSnapshot(
      initialContent ?? "",
      initialTitle ?? "",
      initialImages ?? [],
      initialCityScope ?? null
    )
  );
  /* The autosave currently in flight, if any. An explicit Save or Publish
     waits for it before sending its own version token -- otherwise the
     member's own autosave could land first, move the row, and make their
     Publish look like somebody else's edit. */
  const autosaveRunRef = useRef<Promise<void> | null>(null);

  /* ---- The crash net (bug audit B-043) --------------------------------- *
   *
   * A letter is a 20,000-character composition and the owner's own chaos
   * question about it was "is the half-written letter lost?". It was: a fresh
   * letter has no row until the first explicit "Save as draft", and a resumed
   * draft whose autosave was failing had nothing but the DOM holding the words.
   *
   * So the browser keeps a copy. Written only when there is genuinely nothing
   * else holding the text -- a letter with no row yet, or one whose last save
   * failed -- and cleared the moment a save lands, so a stale local copy can
   * never shadow a good server one. Restored silently on mount, because in both
   * of those cases the local copy is unambiguously the newest thing there is.
   */

  const draftKey = localDraftKey(userId, postId);
  const writeLocalDraft = useCallback(
    () => stashLocalDraft(draftKey, content, title),
    [draftKey, content, title]
  );
  const clearLocalDraft = useCallback(() => dropLocalDraft(draftKey), [draftKey]);

  /* A letter's words, on this device, on the same idle rhythm autosave uses.
     
     For a fresh letter this is the only thing holding them until the first
     save. For a RESUMED draft it used to run only in autosave's failure
     branch, so writing fluently -- keystrokes closer together than the 2.5s
     idle -- and then closing the tab discarded every word since the last pause
     while the chrome still said "Saved" (audit C-177). It runs for both now.

     Still only the idle timer here, and deliberately: this effect re-runs on
     every keystroke, so flushing in its cleanup would write the whole letter
     to localStorage on every character and the debounce would mean nothing.
     The two teardowns that matter are covered elsewhere -- a client-side
     navigation by the exit save below, and a real unload by the handler after
     this one. */
  useEffect(() => {
    if (!defaultLetter || !content.trim()) return;
    const t = setTimeout(writeLocalDraft, 2500);
    return () => clearTimeout(t);
  }, [defaultLetter, content, writeLocalDraft]);


  /* And the case no cleanup ever reaches: the tab closed, the browser killed,
     a link off the site. `pagehide` is the one event that fires for all of
     them on iOS Safari as well as everywhere else, and `visibilitychange` to
     hidden covers a phone being locked mid-sentence. Both handlers do nothing
     but a synchronous localStorage write, which is the only kind of work that
     survives an unload. */
  useEffect(() => {
    if (!defaultLetter) return;
    const flush = () => {
      if (!exitRef.current.content.trim()) return;
      stashLocalDraft(
        localDraftKey(userId, exitRef.current.postId),
        exitRef.current.content,
        exitRef.current.title
      );
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
    // userId is in the key these handlers write to (audit C-014); it
    // cannot change without this component remounting, but the linter cannot
    // know that and re-registering two listeners costs nothing.
  }, [defaultLetter, userId]);


  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !defaultLetter || !editorRef.current) return;
    restoredRef.current = true;
    let saved: { content?: string; title?: string } | null = null;
    try {
      // The try is still needed: safeGet cannot throw, but a draft written by
      // an older shape (or half-written) makes JSON.parse throw.
      const raw = safeGet(draftKey);
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }
    if (!saved?.content?.trim()) return;

    /* Applied by the composer, not here: putting the words back means
       writing the uncontrolled contentEditable's DOM as well as the state,
       and that is the editor's business, not this machine's. */
    const restore = onRestore;

    /* A fresh letter has no row anywhere, so the local copy is unambiguously
       the newest thing there is and goes straight onto the sheet. */
    if (!initialContent) {
      restore({ content: saved.content, title: saved.title });
      toast("Picked up where you left off", {
        description: "This letter was still on this device from last time.",
      });
      return;
    }

    /* A RESUMED draft is the case this used to walk away from. The belt was
       written -- on a failed autosave, and now on every unload -- and then
       never read, because this effect returned the moment initialContent
       existed. So the words a dropped connection or a closed tab left on the
       device were kept and never offered back (audit C-177).
       
       Offered, not applied. The row on the server may have been written from
       another device since, and comparing this device's clock against the
       server's is not a fact either -- so the writer decides, which is the
       only honest answer when two copies disagree and nothing can rank them. */
    if (saved.content.trim() === initialContent.trim()) {
      dropLocalDraft(draftKey);
      return;
    }
    const local = { content: saved.content, title: saved.title };
    toast("There is a newer copy of this letter on this device", {
      description: "It was kept when a save did not go through, or the tab closed mid-sentence.",
      duration: Infinity,
      action: {
        label: "Use it",
        onClick: () => restore(local),
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Quiet autosave, resumed drafts only (a fresh letter has no row to update
     until the first explicit "Save as draft"). 2.5s of idle after the last
     keystroke; skipped while a real submit is in flight and when the body is
     empty (editPost requires content, and an emptied draft should not be
     "saved" out from under the writer). */
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveSkipFirst = useRef(true);
  // Toast once per run of failures, not once per attempt: a dropped connection
  // fails every 2.5 seconds and a stack of identical toasts helps nobody.
  const autosaveToldRef = useRef(false);
  useEffect(() => {
    if (!postId) return;
    /* Captured so runAutosave below, which TypeScript sees as a nested
       function, keeps the narrowing the guard above just established. */
    const draftId = postId;
    if (autosaveSkipFirst.current) {
      // The hydration pass itself sets content/title; that is not an edit.
      autosaveSkipFirst.current = false;
      return;
    }
    if (!content.trim()) return;
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      /* The REF, not the `submitting` state. This effect's deps do not include
         it, so setSubmitting(true) inside handleSubmit re-renders without
         re-running this effect: an already-armed timer's closure still saw
         `submitting === false` and fired mid-publish, sending a second
         editPost carrying the same baseUpdatedAt as the publish's own. One of
         the two then lost the version race and the writer was told their
         letter had been edited elsewhere (audit C-175). handleSubmit also
         disarms this timer outright, so the guard is the second line rather
         than the only one. */
      if (submittingRef.current) return;
      autosaveRunRef.current = runAutosave().finally(() => {
        autosaveRunRef.current = null;
      });
    }, 2500);

    async function runAutosave() {
      onAutosaveState?.("saving");
      const fd = new FormData();
      fd.set("content", content);
      if (title.trim()) fd.set("title", title.trim());
      fd.set("images", JSON.stringify(images));
      // Unconditionally, because an absent field cannot express "Everyone"
      // (bug audit B-048). Empty string is the clear.
      fd.set("cityScope", audienceCity ?? "");
      if (baseUpdatedAtRef.current) fd.set("baseUpdatedAt", baseUpdatedAtRef.current);
      /* The failure path used to be genuinely empty: on `result.error` -- which
         the app's own credentialVersion mechanism produces the instant a
         password is reset or a deletion requested on another device -- nothing
         happened at all. No toast, no state change, and the desk chrome sat on
         "Saving..." while every later autosave failed the same way. Somebody
         could write for an hour believing the letter was persisting and lose
         all of it by navigating away (bug audit B-043). A rejected action (a
         network drop, version skew right after a deploy) was not caught either. */
      let failed: string | null = null;
      try {
        const result = await editPost(draftId, fd);
        if (result.error) failed = result.error;
        else if (result.updatedAt) baseUpdatedAtRef.current = result.updatedAt;
      } catch {
        failed = "That did not save. Check your connection.";
      }
      if (!failed) {
        autosaveToldRef.current = false;
        savedSnapshotRef.current = draftSnapshot(content, title, images, audienceCity);
        clearLocalDraft();
        onAutosaveState?.("saved");
        return;
      }
      // Keep the words somewhere the browser owns, so a close or a crash
      // during an outage does not take them.
      writeLocalDraft();
      onAutosaveState?.("failed");
      if (!autosaveToldRef.current) {
        autosaveToldRef.current = true;
        toast.error(failed, {
          description: "Your writing is kept on this device until it saves.",
        });
      }
    }
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
    /* `audienceCity` is a dep because runAutosave SENDS it. Without it,
       choosing or clearing an audience and then not typing never armed a
       timer -- the desk went on saying "Saved" over an unsaved choice, and
       leaving lost it -- and a timer armed by an earlier keystroke fired with
       the stale closure value and wrote the OLD scope back (audit C-176). */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title, images, postId, audienceCity]);


  /* ---- Leaving with a letter half-written (owner, 2026-08-24) ---------- *
   *
   * "Save as draft" is a button somebody has to remember to press, and the
   * moment they forget it is exactly the moment they click away. So leaving
   * saves: navigate anywhere else in the app with words on the sheet and the
   * letter is written to Drafts on the way out. Nothing is lost by leaving,
   * and a draft nobody wanted is one menu away from deleted on /letters.
   *
   * An unmount cleanup IS the client-side navigation: the page's JavaScript is
   * still running, so the action call finishes long after this editor is gone.
   * A real unload (tab closed, hard refresh, a link off the site) never gets
   * here -- that case is what the localStorage net above is for.
   *
   * Values come from a ref because this effect runs once and its closure would
   * hold the empty first render. The snapshot check is what keeps it honest:
   * unmounting because a save or a publish just navigated writes nothing, and
   * React's dev double-mount is a no-op.
   */
  const exitRef = useRef({ content, title, images, audienceCity, isLetter, postId });
  exitRef.current = { content, title, images, audienceCity, isLetter, postId };
  useEffect(() => {
    /* Aliased so the cleanup below closes over the ref OBJECT rather than
       naming `submittingRef.current` inside a teardown, which the hooks lint
       reads as a stale-node hazard. The value must still be read at unmount
       time, not captured now -- that is the whole point of it being a ref. */
    const submitLatch = submittingRef;
    return () => {
      const s = exitRef.current;
      // Only letters have drafts at all, and a save in flight is already
      // writing this row -- adding a second write is how you get two of them.
      if (!s.isLetter || !s.content.trim() || submitLatch.current) return;
      if (draftSnapshot(s.content, s.title, s.images, s.audienceCity) === savedSnapshotRef.current) {
        return;
      }
      const key = localDraftKey(userId, s.postId);
      const fd = new FormData();
      fd.set("content", s.content);
      fd.set("kind", "letter");
      if (s.title.trim()) fd.set("title", s.title.trim());
      fd.set("images", JSON.stringify(s.images));

      const finish = (error?: string) => {
        if (error) {
          // The desk is gone, so a toast is the only way the writer hears
          // about this at all -- and the words go back on the device, since
          // there is nowhere else left to put them.
          stashLocalDraft(key, s.content, s.title);
          toast.error("That letter did not save.", {
            description: "It is kept on this device. Open the letters desk again to retry.",
          });
          return;
        }
        dropLocalDraft(key);
        toast("Saved to your drafts", {
          description: "An unfinished letter keeps itself. Delete it from Letters if you would rather not.",
        });
      };

      if (s.postId) {
        // A resumed draft: in place, with the version token, exactly as
        // autosave would have done had the writer paused instead of left.
        fd.set("cityScope", s.audienceCity ?? "");
        if (baseUpdatedAtRef.current) fd.set("baseUpdatedAt", baseUpdatedAtRef.current);
        void callAction(() => editPost(s.postId!, fd)).then((r) => finish(r.error));
      } else {
        if (s.audienceCity) fd.set("cityScope", s.audienceCity);
        fd.set("saveAsDraft", "true");
        void callAction(() => createPost(fd)).then((r) => finish(r.error));
      }
    };
    // Mount/unmount only -- everything this reads comes off `exitRef`, which is
    // kept current by its own effect. userId is named because the
    // draft key now includes it (audit C-014), and submittingRef because it is
    // now a parameter; a useRef object's identity never changes, so naming it
    // costs nothing and re-running this effect is not a thing that can happen.
  }, [userId, submittingRef]);

  /* Stamp what the server has now been told. Called by every successful
     explicit save, exactly where the snapshot used to be written inline. */
  const markSaved = useCallback(() => {
    savedSnapshotRef.current = draftSnapshot(content, title, images, audienceCity);
  }, [content, title, images, audienceCity]);

  /* Stand the pending autosave down. Called FIRST in the composer's submit,
     before it awaits anything: a timer armed by a keystroke in the last 2.5
     seconds would otherwise fire mid-save and both writes would carry the
     same baseUpdatedAt (audit C-175). */
  const disarmAutosave = useCallback(() => {
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
  }, []);

  return {
    baseUpdatedAtRef,
    autosaveRunRef,
    disarmAutosave,
    markSaved,
    clearLocalDraft,
  };
}
