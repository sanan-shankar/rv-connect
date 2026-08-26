"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ImagePlus, X, BarChart3, Feather, Plus, MapPin, Loader2, Check } from "lucide-react";
import { m, AnimatePresence } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { createPost, editPost, publishDraft } from "@/app/(main)/feed/actions";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS, SpringPress } from "@/components/common/motion";
import { AttachImageDialog } from "@/components/common/attach-image-dialog";
import { downscaleImage } from "@/lib/image-downscale";
import { directUploadPut } from "@/lib/upload-client";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-shared";
import { cn } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";
import {
  applyFormatShortcut,
  insertPlainTextPaste,
  computeMentionRange,
  serializeEditableToMarkdown,
} from "@/lib/rich-text-editing";
import { PollCreator } from "./poll-creator";
import { MentionDropdown } from "./mention-dropdown";
import { useTourAnchor } from "@/components/tour/tour-anchors";
import { safeGet, safeSet, safeRemove } from "@/lib/local-storage";

/* ------------------------------------------------------------------ *
 *  Rich text <-> markdown bridge. The editor is a contentEditable
 *  surface so bold/italic/underline/strikethrough render LIVE, with no
 *  raw "**" ever on screen. There is no formatting toolbar: the three
 *  ways in are the ones people already know, and all three land in the
 *  same <b>/<i>/<u>/<s> the serializer below understands.
 *
 *    1. the phone's own selection bar (Bold / Italic / Underline), which
 *       a contentEditable gets natively;
 *    2. Cmd/Ctrl+B / I / U (handled explicitly in handleEditorKeyDown so
 *       it is deterministic across browsers);
 *    3. markdown typed by hand, WhatsApp style: **bold**, *italic*,
 *       __underline__, ~~struck~~. Those characters survive verbatim
 *       through this serializer and are rendered by renderRichText()
 *       (src/lib/rich-text.ts), whose matching rules are deliberately strict
 *       so ordinary writing ("2*3*4", a bullet list) never bolds itself.
 *
 *  On every input we walk the DOM and serialize it back to the SAME
 *  markdown wire format renderRichText() already expects, so post
 *  storage/rendering/search never change. Mentions stay a literal
 *  "@[Name](id) " text insertion.
 * ------------------------------------------------------------------ */
/* The DOM<->markdown helpers and format shortcuts moved to
   src/lib/rich-text-editing.ts (2026-08-13) so every writing surface -- this
   composer, the catch-up answer card, the edit dialog -- shares one story. */

/** Where the composer is posting. Drives the placeholder and the available affordances. */
export type ComposerScope = "post" | "letter";

// Height of the resting pill (h-11). The expand animation grows the box DOWN from
// exactly this height, and collapse contracts back to it, so nothing ever shrinks
// up first or starts stretched.
const COLLAPSED_H = 44;

// Past this length a post is nudged toward Letters instead of being capped or
// counted down. No red numbers, no limits messaging: just a hint.
const LETTER_NUDGE_LEN = 600;

const UPLOAD_TIMEOUT_MS = 60_000;

const SCOPE_PLACEHOLDER: Record<ComposerScope, string> = {
  // Owner's wording, 2026-08-04: no "sighting", and the community rather than
  // the valley. Two things offered instead of three reads as an invitation
  // rather than a menu.
  post: "Share a memory or a note with the community...",
  letter: "Write your letter to the valley. Take your time.",
};

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
/**
 * Release the `blob:` previews this composer minted, leaving stored urls alone.
 *
 * `URL.createObjectURL` pins the whole file in memory for the document's life
 * unless it is revoked, and only `removeImage` revoked -- so every photograph
 * actually POSTED stayed pinned, and so did every preview on an unmount that
 * was not a post (navigating away from the letters desk). A resumed draft's
 * previews are R2 urls, which own nothing and revoke to nothing (audit C-183).
 */
function revokeBlobPreviews(urls: string[]): void {
  for (const u of urls) {
    if (u.startsWith("blob:")) URL.revokeObjectURL(u);
  }
}

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

export function CreatePostForm({
  placeholder,
  defaultLetter = false,
  currentUser,
  userPlaces,
  onPosted,
  immersive = false,
  postId,
  initialTitle,
  initialContent,
  initialImages,
  initialCityScope,
  initialUpdatedAt,
  onDraftSaved,
  onAutosaveState,
}: {
  placeholder?: string;
  defaultLetter?: boolean;
  currentUser?: AvatarUser;
  /** The poster's own cities (their UserPlace list). Drives the "Show to" audience
   *  control below; omitted or empty means the control simply doesn't render. */
  userPlaces?: string[];
  onPosted?: () => void;
  /** The /letters/new and /letters/[id]/edit surfaces: no card shell (the page
   *  provides the paper sheet), and the body composes at READING fidelity
   *  (Libre Baskerville 16px/1.8) so what you type is what publishes. */
  immersive?: boolean;
  /** An existing DRAFT being resumed: saves become in-place updates
   *  (editPost) and "Publish letter" flips it live via publishDraft, so the
   *  same draft row is edited continuously instead of a new row per save. */
  postId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialImages?: string[];
  /** A resumed draft's saved audience; null or absent is "Everyone". */
  initialCityScope?: string | null;
  /** The draft row's version when this desk opened. See baseUpdatedAtRef. */
  initialUpdatedAt?: string;
  /** First "Save as draft" on a FRESH letter: called with the new row's id so
   *  the page can adopt it (router.replace to the edit route) instead of the
   *  editor wiping itself, which is exactly the failure the owner hit. */
  onDraftSaved?: (id: string) => void;
  /** Quiet autosave status for the desk chrome ("Saving..." / "Saved"). */
  onAutosaveState?: (s: "saving" | "saved" | "failed") => void;
} = {}) {
  // A letter or a post; there is no third composer any more (Groups was
  // retired 2026-07-25 and nothing ever passed the explicit `scope` prop).
  const resolvedScope: ComposerScope = defaultLetter ? "letter" : "post";
  const collapsedPlaceholder = placeholder ?? SCOPE_PLACEHOLDER[resolvedScope];
  // Tour spotlight target (walkthrough spec sec 2): only the feed's own
  // top-level composer, never a group's or a letter's.
  const isFeedComposer = resolvedScope === "post";
  const tourAnchorRef = useTourAnchor<HTMLButtonElement>("feed-composer", isFeedComposer);
  // An unconfirmed address is refused by createPost/editPost/publishDraft on
  // the server. This turns that refusal into a dialog with the fix in it,
  // instead of a toast that slides away while you are still reading it.
  const emailGate = useEmailGate();
  const [content, setContent] = useState(initialContent ?? "");
  const [kind, setKind] = useState<"post" | "letter">(defaultLetter ? "letter" : "post");
  const [title, setTitle] = useState(initialTitle ?? "");
  // A resumed draft's images are already-public URLs, so they serve as their
  // own previews; fresh uploads append object URLs as before.
  const [images, setImages] = useState<string[]>(initialImages ?? []);
  const [previews, setPreviews] = useState<string[]>(initialImages ?? []);
  /* "Also add to the Collection". Off by default and never remembered between
     posts: it is an offer, and an offer that quietly stays ticked would put
     photographs in the archive nobody chose to put there. */
  const [toCollection, setToCollection] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Determinate-feeling progress for the "Photo" button label while a batch
  // uploads one file at a time (no byte-level progress events on a plain
  // fetch, but "uploading 2 of 3" reads as real progress).
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  /* A ref as well as the two flags, because `disabled` only takes effect on
     the next render: pressing Post twice in one frame (a click plus the Enter
     that was still down, a double-tap on a slow connection) reached the action
     twice and published the whole post twice (audit M35). Set synchronously,
     so the second call in the same frame sees it. Covers Save-as-draft too --
     they write the same row and must not overlap either. */
  const submittingRef = useRef(false);
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
  const [expanded, setExpanded] = useState(defaultLetter);
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [more, setMore] = useState(false); // overflow ("+") menu: poll + letter live here
  // City-scoped audience: null = "Everyone" (the default); otherwise one of the
  // poster's own cities. (It used to be withheld from a group post, whose own
  // membership already scoped who read it; there are no group posts now.)
  const [audienceCity, setAudienceCity] = useState<string | null>(initialCityScope ?? null);
  const audienceOptions = userPlaces ?? [];
  // Explicit, measured height for the one clean downward growth / contraction.
  const [colHeight, setColHeight] = useState<number>(COLLAPSED_H);
  // True only once the grow animation has fully settled; gates overflow so the
  // "More" popover can escape the box, while the unfurl/contraction stays clipped.
  const [settled, setSettled] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const richRef = useRef<HTMLDivElement>(null);
  const mentionRangeRef = useRef<Range | null>(null);

  const isLetter = kind === "letter";
  // With a poll attached, this field IS the poll's question: the feed prints
  // the post body directly above the options, so a second "question" input
  // would just duplicate `Post.content`. Saying so in the placeholder is what
  // turns the composer from "here are some options with no question" into a
  // question followed by its choices.
  const hasPoll = !isLetter && pollOptions !== null;
  const effectivePlaceholder = isLetter
    ? "Write your letter to the valley. Take your time."
    : hasPoll
      ? "Ask your question"
      : collapsedPlaceholder;
  const hasContent = content.trim().length > 0;

  function expand(startKind?: "post" | "letter") {
    if (startKind) setKind(startKind);
    setSettled(false);
    setExpanded(true);
    setTimeout(() => richRef.current?.focus({ preventScroll: true }), 0);
  }

  /* Resumed-draft hydration: the contentEditable is uncontrolled, so its DOM
     must be written directly, once, on mount. renderRichText is the same
     markdown -> HTML bridge the reading page uses, and
     serializeEditableToMarkdown is its inverse, so the draft round-trips. */
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !initialContent || !richRef.current) return;
    hydratedRef.current = true;
    richRef.current.innerHTML = renderRichText(initialContent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  /* The freshest preview list, for the two places that must read it OUTSIDE a
     render: the post-success revoke and the unmount cleanup, neither of which
     can close over state and be right. */
  const previewsRef = useRef<string[]>([]);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(
    () => () => {
      revokeBlobPreviews(previewsRef.current);
    },
    []
  );

  const draftKey = localDraftKey(currentUser?.id, postId);
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
        localDraftKey(currentUser?.id, exitRef.current.postId),
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
    // currentUser?.id is in the key these handlers write to (audit C-014); it
    // cannot change without this component remounting, but the linter cannot
    // know that and re-registering two listeners costs nothing.
  }, [defaultLetter, currentUser?.id]);

  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !defaultLetter || !richRef.current) return;
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

    const restore = (local: { content: string; title?: string }) => {
      setContent(local.content);
      if (local.title) setTitle(local.title);
      if (richRef.current) richRef.current.innerHTML = renderRichText(local.content);
      hydratedRef.current = true;
    };

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
    return () => {
      const s = exitRef.current;
      // Only letters have drafts at all, and a save in flight is already
      // writing this row -- adding a second write is how you get two of them.
      if (!s.isLetter || !s.content.trim() || submittingRef.current) return;
      if (draftSnapshot(s.content, s.title, s.images, s.audienceCity) === savedSnapshotRef.current) {
        return;
      }
      const key = localDraftKey(currentUser?.id, s.postId);
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
    // kept current by its own effect. currentUser?.id is named because the
    // draft key now includes it (audit C-014).
  }, [currentUser?.id]);

  // Collapse back to the resting pill, closing any open popovers. Letters
  // default to expanded, so they never retract to a pill. Only ever called
  // while empty (see the outside-click/Escape handler below), but the DOM is
  // cleared defensively too: a contentEditable can be left holding a stray
  // empty <div><br></div> even once its text content is gone.
  const collapse = useCallback(() => {
    setMore(false);
    setSettled(false);
    if (!defaultLetter) setExpanded(false);
    if (richRef.current) richRef.current.innerHTML = "";
    setContent("");
  }, [defaultLetter]);

  // Measure the editor's natural height and animate the box to it. A
  // ResizeObserver keeps the box exactly the content's size, so adding an image
  // or a poll grows it cleanly (no fixed height, no clipping) while the
  // expand/collapse spring stays a single deliberate downward/upward m.
  useEffect(() => {
    if (!expanded) {
      setColHeight(COLLAPSED_H);
      return;
    }
    const el = editorRef.current;
    if (!el) return;
    const update = () => setColHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);

  // Outside-click + Escape. Empty + outside click (or Escape with nothing open)
  // retracts to the pill; if the user has typed, an outside click only closes a
  // popover so a draft is never lost to a stray click.
  //
  // Guarded on `attachOpen`: the attach-photo dialog renders through THE
  // dialog material's portal (src/components/ui/dialog.tsx), i.e. as a
  // sibling of rootRef in the DOM, not a descendant. Without this guard,
  // clicking anything inside that popup -- the dropzone, "browse" -- reads
  // as a click OUTSIDE the composer and collapsed it out from under the
  // file input mid-pick, so the OS file dialog returned a file to an
  // element that no longer existed (owner, 2026-08-06: "composer reset
  // when you browse for files... nothing uploads").
  useEffect(() => {
    if (!expanded || attachOpen) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        if (!hasContent) collapse();
        else setMore(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (more) setMore(false);
      else if (!hasContent) collapse();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [expanded, hasContent, more, collapse, attachOpen]);

  // Re-derive the markdown mirror + mention query from the live DOM. Called after
  // every keystroke, paste, and formatting toggle so `content` (used for the Post
  // button's enabled state, the char counter, and the submit payload) never drifts
  // from what the editor visually shows.
  const handleRichInput = useCallback(() => {
    const el = richRef.current;
    if (!el) return;
    setContent(serializeEditableToMarkdown(el));
    const found = computeMentionRange();
    if (found) {
      setMentionQuery(found.query);
      mentionRangeRef.current = found.range;
    } else {
      setMentionQuery(null);
      mentionRangeRef.current = null;
    }
  }, []);

  // Cmd/Ctrl + B / I / U. A contentEditable handles these natively in every
  // current browser, but we take them explicitly so the behaviour is the same
  // everywhere and so the markdown mirror is re-derived immediately rather than
  // waiting on the browser's own input event. execCommand is deprecated and
  // still the only reliable way to format the SELECTION in place, which is what
  // keeps raw "**" off the screen. The phone's native selection bar (Bold /
  // Italic / Underline) reaches the same code path through the browser itself.
  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (applyFormatShortcut(e)) handleRichInput();
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    insertPlainTextPaste(e);
    handleRichInput();
  }

  function handleMentionSelect(user: { id: string; name: string }) {
    const range = mentionRangeRef.current;
    const el = richRef.current;
    if (range && el) {
      range.deleteContents();
      const mentionNode = document.createTextNode(`@[${user.name}](${user.id}) `);
      range.insertNode(mentionNode);
      const after = document.createRange();
      after.setStartAfter(mentionNode);
      after.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(after);
      el.focus();
      setContent(serializeEditableToMarkdown(el));
    }
    setMentionQuery(null);
    mentionRangeRef.current = null;
  }

  /**
   * Preferred upload path: presigned PUT straight to R2 (the shared
   * `directUploadPut` helper), then a finalize call that turns the staged
   * FULL-RESOLUTION original into the display WebP server-side. No bytes
   * pass through a serverless function, so Vercel's ~4.5MB request cap
   * never applies and nothing needs shrinking in the browser (owner,
   * 2026-07-30: client-side downscaling defeats the point of a 20MB limit).
   *
   * Falls back to the classic proxied POST when the direct path is
   * unavailable; only that fallback still browser-downscales, since it is
   * the path the platform cap can actually bite.
   */
  async function uploadViaPresign(original: File): Promise<string> {
    const staged = await directUploadPut(original, "post");
    if (staged) {
      const fin = await fetch("/api/upload/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keys: [staged.key] }),
      });
      const data = await fin.json().catch(() => ({}));
      if (fin.ok && data.urls?.[0]) {
        // Same as the classic path below: anything the server changed about
        // the file is said out loud (audit M15/C-073).
        for (const notice of (data.notices ?? []) as string[]) toast.info(notice);
        return data.urls[0] as string;
      }
      throw new Error(data.error || `"${original.name}" failed to upload`);
    }
    const shrunk = await downscaleImage(original);
    return uploadOneFile(shrunk);
  }

  async function uploadOneFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("files", file);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`"${file.name}" timed out. Check your connection and try again.`);
      }
      throw new Error(`"${file.name}" failed to upload. Check your connection and try again.`);
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: null }));
      throw new Error(data.error || `"${file.name}" failed to upload`);
    }

    const { urls, notices } = await res.json();
    // Anything the server changed about the file, said out loud (audit M15).
    // A toast rather than inline copy: it is information about one upload that
    // has already succeeded, not a condition to fix before carrying on.
    for (const notice of (notices ?? []) as string[]) toast.info(notice);
    return urls[0] as string;
  }

  async function handleImageFiles(files: File[]) {
    if (files.length === 0) return;

    const remaining = 3 - images.length;
    if (files.length > remaining) {
      toast.error(`You can add ${remaining} more image${remaining !== 1 ? "s" : ""}`);
      return;
    }

    // Validate the ORIGINAL size up front (skip oversized files individually
    // rather than aborting the whole batch on the first one). 20MB is the
    // real ceiling now that the direct path PUTs originals straight to
    // storage; only the proxied fallback still shrinks in the browser.
    const candidates = files.slice(0, remaining);
    const valid: File[] = [];
    for (const file of candidates) {
      if (file.size > MAX_UPLOAD_BYTES) {
        toast.error(`"${file.name}" is over the 20MB limit`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;

    setUploading(true);
    const uploadedUrls: string[] = [];
    const uploadedPreviews: string[] = [];

    // One file at a time (sequential): gives a real "uploading N of M"
    // state and means one bad file doesn't sink the others.
    for (let i = 0; i < valid.length; i++) {
      const original = valid[i];
      setUploadProgress({ done: i, total: valid.length });
      try {
        const url = await uploadViaPresign(original);
        uploadedUrls.push(url);
        // Preview from the original file: higher quality than the re-encode,
        // and it is only ever shown locally in the composer.
        uploadedPreviews.push(URL.createObjectURL(original));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    }

    if (uploadedUrls.length > 0) {
      setImages((prev) => [...prev, ...uploadedUrls]);
      setPreviews((prev) => [...prev, ...uploadedPreviews]);
    }

    setUploading(false);
    setUploadProgress(null);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      // Taking the last photograph out takes the offer with it, so adding a
      // different one later starts from "no" rather than from a tick the
      // writer left on for a picture they since deleted.
      if (next.length === 0) setToCollection(false);
      return next;
    });
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function handleSubmit(saveAsDraft = false) {
    if (!content.trim()) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    /* Disarm the autosave BEFORE awaiting anything. A timer armed by a
       keystroke within the last 2.5 seconds would otherwise fire while this
       save is in flight, and both writes would carry the same baseUpdatedAt --
       editPost's version precondition lets exactly one through and tells the
       writer the other was edited somewhere else (audit C-175). */
    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
      autosaveTimer.current = null;
    }
    /* Let an autosave that is already in the air finish first, so this save
       sends the version it produced rather than the one before it (audit
       M66). It cannot throw -- runAutosave catches its own failures. */
    if (autosaveRunRef.current) await autosaveRunRef.current;
    if (saveAsDraft) setSavingDraft(true);
    else setSubmitting(true);

    // The whole body runs inside try/finally, and every action call goes
    // through callAction: previously a REJECTING action (not just one that
    // returned { error }) threw straight out of this function and left the
    // Post/Publish/Save button disabled for the rest of the session, since
    // neither flag reset below ever ran (audit B-042).
    try {
      const formData = new FormData();
      formData.set("content", content);
      formData.set("kind", kind);
      if (isLetter && title.trim()) formData.set("title", title.trim());
      // Set unconditionally when resuming a draft: an absent field cannot express
      // "actually, Everyone", so a member who cleared the audience on a saved
      // draft could never clear it (bug audit B-048). createPost still treats an
      // empty value as no scope, so the fresh-post path is unchanged.
      if (postId) formData.set("cityScope", audienceCity ?? "");
      else if (audienceCity) formData.set("cityScope", audienceCity);
      if (postId && baseUpdatedAtRef.current) {
        formData.set("baseUpdatedAt", baseUpdatedAtRef.current);
      }
      if (images.length > 0) formData.set("images", JSON.stringify(images));
      if (!isLetter && pollOptions) {
        const validOptions = pollOptions.filter((o) => o.trim());
        if (validOptions.length >= 2) {
          formData.set("pollOptions", JSON.stringify(validOptions));
        }
      }
      // "Save as draft" only ever applies to a letter; the button itself is
      // hidden outside letter mode, but this keeps the payload honest either way.
      if (isLetter && saveAsDraft) formData.set("saveAsDraft", "true");
      // Only sent when there is actually a photograph to contribute; the tick is
      // hidden otherwise, and the server ignores it for a draft.
      if (toCollection && images.length > 0) formData.set("toCollection", "true");

      /* Resumed draft: the row already exists, so every save is an in-place
         update, and publishing is update-then-flip. The editor never clears -
         on publish the page navigates away, on save the writer keeps writing. */
      if (postId) {
        const editResult = await callAction(() => editPost(postId, formData));
        if (editResult.updatedAt) baseUpdatedAtRef.current = editResult.updatedAt;
        if (editResult.error) {
          // An unconfirmed address gets the dialog, which has the fix in it,
          // rather than a toast that slides away mid-sentence.
          if (!emailGate.handled(editResult.error)) toast.error(editResult.error);
        } else if (saveAsDraft) {
          savedSnapshotRef.current = draftSnapshot(content, title, images, audienceCity);
          clearLocalDraft();
          toast.success("Draft saved");
          onAutosaveState?.("saved");
        } else {
          const pub = await callAction(() => publishDraft(postId));
          if ("error" in pub && pub.error) {
            if (!emailGate.handled(pub.error)) toast.error(pub.error);
          } else {
            savedSnapshotRef.current = draftSnapshot(content, title, images, audienceCity);
            clearLocalDraft();
            toast.success("Your letter is published");
            onPosted?.();
          }
        }
        return;
      }

      const result = await callAction(() => createPost(formData));
      if (result.error) {
        if (!emailGate.handled(result.error)) toast.error(result.error);
      } else if (saveAsDraft && onDraftSaved && result.postId) {
        /* First save of a fresh letter on the immersive page: hand the new
           draft's id to the page (it adopts the row and moves to the edit
           route) and leave the editor exactly as the writer left it. The old
           behaviour - wiping the screen to a toast - is the exact failure the
           owner reported. */
        savedSnapshotRef.current = draftSnapshot(content, title, images, audienceCity);
        /* The device copy has served its purpose the moment the row exists.
           Left behind, /letters/new would restore it next time as a brand new
           letter -- and now that leaving saves, that ghost would become a
           second draft of the same piece. */
        clearLocalDraft();
        toast.success("Draft saved");
        onDraftSaved(result.postId);
      } else {
        // The words are on the server now; the device copy would only come
        // back as a ghost letter on the next visit to the desk.
        clearLocalDraft();
        // The editor is uncontrolled contentEditable, so clearing `content` alone
        // does not clear what's on screen: clear the DOM explicitly too.
        if (richRef.current) richRef.current.innerHTML = "";
        setContent("");
        setTitle("");
        setKind(defaultLetter ? "letter" : "post");
        setImages([]);
        /* The blob URLs this composer minted are released before the list is
           dropped (audit C-183). `URL.createObjectURL` pins the whole file in
           memory until it is revoked or the document unloads, and only
           removeImage revoked -- so every photograph actually POSTED stayed
           pinned for the rest of the session, and on the immersive letters
           desk that session is long. R2 urls (a resumed draft's existing
           images) are left alone; revoking one of those does nothing. */
        revokeBlobPreviews(previewsRef.current);
        setPreviews([]);
        setToCollection(false);
        setPollOptions(null);
        setMore(false);
        setAudienceCity(null);
        setSettled(false);
        setExpanded(defaultLetter);
        toast.success(
          saveAsDraft
            ? "Draft saved"
            : isLetter
              ? "Your letter is published"
              : "Post shared!",
          // Said once, here, rather than as a line of help under the tick: a
          // contribution waits for a moderator, and someone who ticks the box and
          // then cannot find their photograph in the Collection deserves to know
          // why. The tick itself stays a tick.
          toCollection && images.length > 0
            ? { description: "The photo is with the Collection editors." }
            : undefined
        );
        onPosted?.();
      }
    } finally {
      submittingRef.current = false;
      if (saveAsDraft) setSavingDraft(false);
      else setSubmitting(false);
    }
  }

  // The "+" menu only earns its place when it has something to offer: a poll
  // (posts only), the letter toggle (not on the letters page, which is already
  // a letter), and the audience picker (only if this person has cities).
  const canAddPoll = !isLetter;
  const canToggleLetter = !defaultLetter;
  const showMore = canAddPoll || canToggleLetter || audienceOptions.length > 0;

  // One shared shelf for the two icon controls, so the row reads as one hand
  // made it: 36px target (comfortable on a phone), 18px glyph, pill, and the
  // full hover / focus-visible / active set (active comes from SpringPress).
  // These are transparent buttons on the composer's bg-card tile, which is
  // exactly the case `hover:bg-accent` failed at (+2.06 dL* on paper, at the
  // JND); state-layer tints whatever is underneath instead.
  const iconControl =
    "state-layer inline-grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  // The full editor surface. Shared by the collapsible feed composer and the
  // always-open letter composer, so both read as one hand made them.
  const editorBody = (
    <>
      {isLetter && (
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title your letter"
          maxLength={160}
          className={cn(
            "mb-2 w-full bg-transparent font-heading font-bold tracking-[-0.01em] text-foreground placeholder:font-normal placeholder:text-muted-foreground focus:outline-none",
            // Immersive: the title sets at the reading page's own display size,
            // so the sheet you write on is the page you publish.
            immersive ? "text-[26px] leading-tight sm:text-[30px]" : "text-xl"
          )}
        />
      )}

      {/* The field, with ONE clean focus ring overlay. A contentEditable surface
          (not a textarea) so Bold/Italic/etc. render live: execCommand applies a
          real <b>/<i>/<u>/<s> to the selection, so raw "**" never shows on screen.
          The overlay's inset-0 box traces the field's border box on all four edges.
          Radius is --radius-input (12px): inputs are one step less round than the
          16px card (DESIGN-SYSTEM sec. 3), and a nested box must never repeat its
          container's radius. Wrapper, field and ring overlay share the value; if
          one changes without the others the ring stops tracing the corner. */}
      <div className="group relative rounded-[var(--radius-input)]">
        <div
          ref={richRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={isLetter ? "Write your letter" : "Write your post"}
          data-empty={content.trim().length === 0 ? "true" : "false"}
          data-placeholder={effectivePlaceholder}
          onInput={handleRichInput}
          onKeyDown={handleEditorKeyDown}
          onPaste={handlePaste}
          style={{ minHeight: immersive ? "55vh" : isLetter ? 260 : 96 }}
          className={cn(
            "peer block w-full resize-none whitespace-pre-wrap break-words text-foreground outline-none focus-visible:outline-none",
            // Immersive: no box at all - the page's paper sheet IS the field's
            // surface, and the body composes at the reading page's own face
            // (Libre Baskerville 16px/1.8) so nothing changes at publish. The
            // caret is the focus indicator on a writing page.
            immersive
              ? "bg-transparent font-heading text-[16px] leading-[1.8]"
              : "rounded-[var(--radius-input)] border border-border bg-card px-3.5 py-3 text-base leading-[1.7]",
            // Kill WebKit's own tap-highlight flash on touch/trackpad taps: it
            // paints a square-cornered highlight over this rounded field, which
            // reads as an uneven ring (thicker at the corners) for an instant
            // before our own focus ring below has faded in. Outline is already
            // fully suppressed above; this is the other native "ring" source.
            "[-webkit-tap-highlight-color:transparent]",
            "data-[empty=true]:before:pointer-events-none data-[empty=true]:before:text-muted-foreground data-[empty=true]:before:content-[attr(data-placeholder)]"
          )}
        />
        {/* Focus ring, drawn ENTIRELY INSIDE the field's border box (an INSET
            shadow, never an outward spread) and with NO transition, so its very
            first painted frame is already the final, even shape.

            Why inset matters here: the feed composer's expand keeps this field
            inside a wrapper that stays overflow:hidden for the whole ~1s height
            spring (until `settled` flips it to visible). The field is flush to
            that wrapper's top/left/right edges, so any ring that spread OUTWARD
            past the border box got clipped to nothing along those straight edges
            while the rounded corners -- which recede inward from the wrapper's
            square corner -- kept their spread in the corner pocket. That is what
            read as a ring "thicker at the corners" for about a second before the
            wrapper stopped clipping. An inset ring has nothing outside the border
            box to clip, so it is even on every frame, expanding or settled. */}
        {!immersive && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[var(--radius-input)] opacity-0 peer-focus:opacity-100"
            style={{
              boxShadow: "inset 0 0 0 2px color-mix(in srgb, var(--color-leaf) 42%, transparent)",
              border: "1px solid color-mix(in srgb, var(--color-leaf) 60%, var(--border))",
            }}
          />
        )}
        {mentionQuery !== null && (
          <MentionDropdown query={mentionQuery} onSelect={handleMentionSelect} />
        )}
      </div>

      {/* Staged reveal: everything below the editor rises in as ONE block, on a
          beat's delay after the field fades in, instead of snapping into place
          while the tile is still expanding. */}
      <m.div
        className="mt-2 space-y-2.5"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: { ...SPRINGS.settle, delay: 0.16 } }}
      >
        {/* Gentle, non-blocking nudge once a post runs long: no red numbers, no
            limits messaging, just a hint that Letters might suit it better.
            Only opacity animates (mounts fresh each time, so the surrounding
            layout reflows once instead of the row height itself animating). */}
        <AnimatePresence>
          {!isLetter && content.length > LETTER_NUDGE_LEN && (
            <m.p
              key="letter-nudge"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SPRINGS.gentle}
              className="text-[13px] leading-snug text-muted-foreground"
            >
              This might make a lovely{" "}
              <Link
                href="/letters"
                className="font-medium text-cinnamon hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Letter
              </Link>
              .
            </m.p>
          )}
        </AnimatePresence>

        {!isLetter && pollOptions && (
          <PollCreator
            options={pollOptions}
            onChange={setPollOptions}
            onRemove={() => setPollOptions(null)}
          />
        )}

        {/* Attachment previews sit between the field and the control row (the
            order every familiar composer uses), which also keeps the control
            row the composer's LAST row in every state -- the icon cluster's
            optical bottom cancel below depends on nothing rendering under it.
            Radius is --radius-sm (8.8px): an 80px thumbnail is the third rung
            of the 16 -> 12 -> 8 nesting ladder, not the second. */}
        {previews.length > 0 && (
          <div className="flex gap-2">
            {previews.map((preview, i) => (
              <div key={i} className="relative h-20 w-20">
                {/* eslint-disable-next-line @next/next/no-img-element -- local
                    object URLs and R2 originals; next/image buys nothing here */}
                <img
                  src={preview}
                  alt=""
                  className="h-full w-full rounded-[var(--radius-sm)] object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="Remove image"
                  // This was the one clickable left in the app with no hover,
                  // no focus ring and no press. state-layer would be wrong
                  // here: the button is already an ink-filled disc, so a
                  // further ink tint barely moves it. It brightens instead,
                  // which is the same move the canopy CTA makes for the same
                  // reason (a filled brand surface lifts, it does not deepen).
                  className="absolute -right-1 -top-1 rounded-full bg-foreground p-0.5 text-background transition-[filter,transform] duration-150 hover:brightness-150 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ONE control row, deliberately the last row. With the formatting icons
            gone (formatting now comes from the phone's own selection bar,
            Cmd/Ctrl+B/I/U, or markdown typed by hand) there is room for Post to
            sit inline instead of dropping to its own line. The two remaining
            controls are one group -- both are "add something to this post" --
            so no divider earns its place.
            The icon cluster wears self-end -mb-[9px] -ml-[9px]: iconControl is a
            36px box around an 18px glyph, an optical inset of (36-18)/2 = 9, so
            the cancel lands the glyph INK 17px from the card's bottom and left
            edges, equal to the field's border on the other sides (owner: bottom
            padding must match the sides). self-end, not items-center, because a
            flex row re-centres a shrunken margin box and would swallow half the
            pull. The Post pill keeps its own corner: its FILL is the visual
            edge and already sits at the padding line, so it must not sink. */}
        {/* flex-wrap, added when the Collection tick joined this row: icons +
            tick + Post overflow a 390px composer by a few pixels once three
            photos are attached, and wrapping Post onto its own right-aligned
            line is a far better answer than truncating the tick's label to
            "Also add to the Coll...". At every width above that it stays one
            row, which is where the owner asked for it. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          {/* Vertically CENTRED against the buttons on the right, not pinned to
              the bottom of the card (owner, 2026-08-02: the icons sat "with
              this weirdly big gap and almost sitting on the bottom", and should
              instead be "aligned vertically to the middle of the buttons, so
              the middle of the icons would be the same as the middle of the
              buttons"). The old `self-end -mb-[9px]` chased a different goal,
              landing the glyph INK on the card's bottom padding line, which is
              defensible in isolation but pulled the icons away from the row
              they belong to and opened the gap.
              The `-ml-[9px]` stays: that is the horizontal half of the same
              optical inset ((36px box - 18px glyph) / 2), and it is what lines
              the glyph ink up under the text box's left edge rather than the
              icon button's invisible bounding box. */}
          <div className="-ml-[9px] flex shrink-0 items-center gap-1">
            <AttachImageDialog
              open={attachOpen}
              onOpenChange={setAttachOpen}
              onFiles={handleImageFiles}
              multiple
              title="Add photos"
            />

            {/* Icon only: the word "Photo" is gone, so the label lives in
                aria-label/title (and carries the live upload progress, which
                used to be the button's text). */}
            <SpringPress
              className={iconControl}
              onClick={() => setAttachOpen(true)}
              {...({
                type: "button",
                disabled: images.length >= 3 || uploading,
                title: uploading ? "Uploading..." : "Add a photo",
                "aria-label": uploading
                  ? uploadProgress && uploadProgress.total > 1
                    ? `Uploading photo ${uploadProgress.done + 1} of ${uploadProgress.total}`
                    : "Uploading photo"
                  : "Add a photo",
              } as object)}
            >
              {uploading ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin" />
              ) : (
                <ImagePlus className="h-[18px] w-[18px]" />
              )}
            </SpringPress>

            {/* The plus opens the same "add to your post" menu (poll, letter,
                audience). Hidden entirely when it would open on nothing. */}
            {showMore && (
              <div className="relative">
                <SpringPress
                  // Held-open state is bg-muted, matching what Button settled
                  // on for the identical contract (aria-expanded:bg-muted).
                  // It was bg-accent, which is +2.06 dL* on this card, i.e.
                  // the same near-invisible fill this file rejects twice in
                  // comments above; worse, with state-layer on top the control
                  // then went DARKER than the card on hover, so the open state
                  // crossed through the surface it sits on.
                  className={cn(iconControl, more && "bg-muted text-foreground")}
                  onClick={() => setMore((m) => !m)}
                  {...({
                    type: "button",
                    title: "Add to your post",
                    "aria-label": "Add to your post",
                    "aria-haspopup": "menu",
                    "aria-expanded": more,
                  } as object)}
                >
                  <m.span
                    className="inline-grid place-items-center"
                    animate={{ rotate: more ? 45 : 0 }}
                    transition={SPRINGS.snappy}
                  >
                    <Plus className="h-[18px] w-[18px]" />
                  </m.span>
                </SpringPress>

                <AnimatePresence>
                  {more && (
                    <m.div
                      role="menu"
                      /* Opens from the plus's LEFT edge, because the plus now sits
                         at the START of the row. Anchored right (as it used to be)
                         it ran off the left of a phone screen. It can never touch
                         either viewport edge now: the card's own padding holds it
                         in on the left, and the max-width holds it in on the right
                         on the narrowest phones. */
                      className="absolute left-0 top-11 z-30 w-52 max-w-[calc(100vw-3.5rem)] rounded-[var(--radius)] border border-border bg-card p-1.5 shadow-lg"
                      initial={{ opacity: 0, y: -4, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -3, scale: 0.97 }}
                      transition={SPRINGS.snappy}
                      style={{ transformOrigin: "top left" }}
                    >
                      {canAddPoll && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setPollOptions(pollOptions ? null : ["", ""]);
                            setMore(false);
                          }}
                          className={`state-layer flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                            pollOptions ? "text-leaf" : "text-foreground"
                          }`}
                        >
                          <BarChart3 className="h-4 w-4" />
                          <span>{pollOptions ? "Remove poll" : "Add a poll"}</span>
                        </button>
                      )}
                      {canToggleLetter && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setKind(isLetter ? "post" : "letter");
                            if (!isLetter) setPollOptions(null);
                            setMore(false);
                          }}
                          className={`state-layer flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                            isLetter ? "text-leaf" : "text-foreground"
                          }`}
                        >
                          <Feather className="h-4 w-4" />
                          <span>{isLetter ? "Back to a post" : "Write as a Letter"}</span>
                        </button>
                      )}
                      {audienceOptions.length > 0 && (
                        <div className="mt-1 border-t border-border pt-1.5" role="group" aria-label="Show to">
                          <p className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                            Show to
                          </p>
                          <div className="flex flex-wrap gap-1 px-2 pb-1">
                            <button
                              type="button"
                              role="menuitemradio"
                              aria-checked={!audienceCity}
                              onClick={() => setAudienceCity(null)}
                              className={cn(
                                // Selected stays a solid canopy fill (DESIGN-SYSTEM
                                // rule 4: selection is the one green state, and it is
                                // not hover). Unselected is a neutral chip, so its
                                // hover is the shared state layer.
                                "state-layer rounded-full px-2.5 py-1 text-xs font-medium active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                                !audienceCity
                                  ? "bg-canopy text-white"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              Everyone
                            </button>
                            {audienceOptions.map((city) => (
                              <button
                                key={city}
                                type="button"
                                role="menuitemradio"
                                aria-checked={audienceCity === city}
                                onClick={() => setAudienceCity(city)}
                                className={cn(
                                  "state-layer rounded-full px-2.5 py-1 text-xs font-medium active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                                  audienceCity === city
                                    ? "bg-canopy text-white"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {city}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* The Collection offer, in the control row beside the two icons
              rather than under the thumbnails (owner, 2026-08-04). It belongs
              here: this row is already "what else goes with this post", which
              is exactly what the tick is asking.

              Small text and an 18px box, no card and no border (owner: "it
              shouldn't be a big part ... maybe it could even just be a tiny
              tick mark"). A real button with role=checkbox rather than an
              <input>: the app has no checkbox primitive, and the whole row
              needs to be the target so the label is tappable on a phone.
              Unticked it is muted ink and a hairline box; ticked, the box fills
              canopy. Colour only, no movement, per the hover rule. */}
          {previews.length > 0 && (
            <button
              type="button"
              role="checkbox"
              aria-checked={toCollection}
              onClick={() => setToCollection((v) => !v)}
              className="group/coll flex shrink-0 items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                aria-hidden
                /* Radius 3px, well under the app's 16 -> 12 -> 8 ladder. That
                   ladder is for BOXES; this is a control glyph the size of a
                   word, and at this size the 6px it started at read as a
                   rounded-rect rather than a tickbox (owner: "way more squarish
                   ... much tighter, but I don't want it fully squared off, just
                   a slight curve").

                   Size was the wrong dial. Three passes on the owner (18 "a bit
                   smaller", 20 "too big", 19 "slightly small") could not all be
                   about pixels, and they were not: the box sat in --border
                   (#DFD8CB) at 1px while the two glyphs beside it are
                   --muted-foreground (#6E7268) at a 2px stroke. A pale hairline
                   reads small at ANY dimension, so growing the box only made a
                   faint square bigger. It now wears the icons' own ink, at 19px
                   (the size that measured closest), and the weights match. */
                className={cn(
                  "grid size-[19px] shrink-0 place-items-center rounded-[3px] border transition-colors",
                  toCollection
                    ? "border-canopy bg-canopy text-white"
                    : "border-muted-foreground/70 bg-card text-transparent group-hover/coll:border-canopy"
                )}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
              <span
                className={cn(
                  "text-[12.5px] transition-colors",
                  toCollection ? "text-foreground" : "text-muted-foreground"
                )}
              >
                Also add to the Collection
              </span>
            </button>
          )}

          {/* A small persistent indicator once an audience is chosen, so it stays
              legible without reopening the "+" menu -- clicking it reopens the
              menu to change or clear it. Truncates rather than pushing Post. */}
          {audienceCity && (
            <button
              type="button"
              onClick={() => setMore(true)}
              className="inline-flex min-w-0 items-center gap-1 rounded-full bg-sky/10 px-2.5 py-1 text-[11.5px] font-semibold text-sky hover:bg-sky/15 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{audienceCity} only</span>
            </button>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Letters only: a quiet way to stop for now without losing the
                piece. Outline pill, one step down from Publish, so it never
                reads as the confident primary action. */}
            {isLetter && (
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={!content.trim() || submitting || savingDraft || uploading}
                // Full 40px, not size="sm" (owner, 2026-08-02: "the publish
                // letter and save as a draft ctas can be as big as the normal
                // cta size. Now it's kind of vertically compressed"). See the
                // note on the Publish button below for why the letters desk
                // sizes differently from the feed composer.
                className={cn(buttonVariants({ variant: "outline" }), "px-4 text-sm")}
              >
                {savingDraft ? "Saving..." : uploading ? "Adding photo..." : "Save as draft"}
              </button>
            )}

            {/* Post sits INLINE, at the end of the same row. Same pill CTA language
                as "New post" (shared buttonVariants, canopy fill, font-medium --
                never bold). Still bespoke/animated (subdued until there's text,
                springs to life) so it can't use <Button> directly.

                ONE size, the app's default 40px, in both contexts. The feed
                composer used to drop to 36px on the argument that a second
                canopy pill would compete with the header's "New post"; the
                owner overruled it (2026-08-04: "make the post button a proper
                sized CTA like New Post instead of the squashed thing it is
                now"). The two are far enough apart on the page that matching
                them reads as one language rather than a competition, and a
                shrunken primary action was the more visible cost. */}
            <m.button
              type="button"
              // `uploading` belongs here as much as `submitting` does. Without
              // it, a member on a slow connection could attach photos, type,
              // and hit Post before the batch finished: the post was created
              // from the images state as it stood, without them, and when the
              // upload landed it appended the URLs to the now-cleared arrays --
              // so thumbnails reappeared inside an empty composer and the NEXT
              // post silently carried the previous one's photos (bug audit
              // B-044). The photo control was already gated on `uploading`;
              // the two submit buttons were not. message-composer.tsx has
              // always had this right: `const busy = sending || uploading`.
              onClick={() => handleSubmit(false)}
              disabled={!content.trim() || submitting || savingDraft || uploading}
              className={cn(
                buttonVariants({ variant: "primary", size: "default" }),
                "px-6 text-sm"
              )}
              animate={{ scale: hasContent ? 1 : 0.97, opacity: hasContent ? 1 : 0.55 }}
              whileTap={hasContent && !submitting ? { scale: 0.94 } : undefined}
              transition={SPRINGS.snappy}
            >
              {submitting
                ? isLetter
                  ? "Publishing..."
                  : "Posting..."
                : uploading
                  ? "Adding photo..."
                  : isLetter
                    ? "Publish letter"
                    : "Post"}
            </m.button>
          </div>
        </div>
      </m.div>
    </>
  );

  // Letters open straight into the editor and never retract, so they skip the
  // pill + height machinery: the surface is simply present (a gentle opacity
  // arrival), and its natural height flows on its own.
  if (defaultLetter) {
    return (
      <>
      {emailGate.dialog}
      <div
        ref={rootRef}
        data-composer
        className={cn(
          // Immersive: the page provides the paper sheet, so the editor wears
          // no shell of its own (a card inside the sheet would be exactly the
          // box-in-box the protocol forbids).
          !immersive && "card-elevated overflow-visible rounded-[var(--radius)] border border-border bg-card p-4"
        )}
      >
        <div className="flex items-start gap-3">
          {currentUser && !immersive && (
            <BirdAvatar user={currentUser} size="sm" className="mt-0.5 hidden shrink-0 sm:inline-grid" />
          )}
          <m.div
            className="min-w-0 flex-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.18 }}
          >
            {editorBody}
          </m.div>
        </div>
      </div>
      </>
    );
  }

  // Feed / group composer. ONE clean downward growth on expand, ONE clean
  // contraction on collapse: the box's explicit height springs between the pill
  // height and the measured editor height (no FLIP scale, nothing shrinking up or
  // starting stretched). The pill sits in flow as the collapsed baseline; the
  // editor is an overlay that fades over it while the box grows / shrinks beneath.
  return (
    /* COLLAPSED, there is no tile: just the bird and the pill sitting on the
       page (owner, 2026-08-04, "get rid of the tile ... save some space and
       just have an icon and a pill"). The card materialises only once the
       composer is open, which is the state the owner is happy with.

       The padding rides the SAME spring as the box height below, so opening
       is one gesture: the card inflates around the pill as the pill becomes
       the editor, rather than a tile snapping in first and then growing.
       Background and border fade on the global 120ms colour transition; the
       shadow is simply present while expanded, which nothing can catch during
       a 300ms spring. */
    <>
    {emailGate.dialog}
    <m.div
      ref={rootRef}
      data-composer
      initial={false}
      animate={{ padding: expanded ? 16 : 0 }}
      transition={SPRINGS.gentle}
      className={cn(
        "overflow-visible rounded-[var(--radius)] border",
        expanded ? "card-elevated border-border bg-card" : "border-transparent bg-transparent"
      )}
    >
      <div className="flex items-start gap-3">
        {currentUser && (
          // Shown at every width now. It used to hide below sm because the
          // tile's own padding left no room for it; without the tile there is
          // room, and the icon is half of what this control now is.
          <BirdAvatar user={currentUser} size="sm" className="mt-0.5 shrink-0" />
        )}
        <m.div
          className="relative min-w-0 flex-1"
          initial={false}
          animate={{ height: colHeight }}
          transition={SPRINGS.gentle}
          onAnimationComplete={() => setSettled(expanded)}
          style={{ overflow: settled ? "visible" : "hidden" }}
        >
          {/* The pill's own opacity now runs on the SAME spring as the box height
              (SPRINGS.gentle) instead of snapping instantly, so on collapse it
              cross-fades in underneath the editor as the tile shrinks: one clock,
              no children popping into place. `ring-inset` keeps the focus ring
              fully inside the pill's bounds so its rounded caps are never cut off
              by this wrapper's overflow-hidden clipping during expand/collapse.

              Resting colour is `bg-card` (owner, 2026-08-04: the pill should
              rest at the tile's own background colour). The pill used to be
              --secondary specifically to hold contrast AGAINST the card it sat
              inside; collapsed, there is no card any more, so the thing it now
              has to read against is the page (#E4E1D5), and #F5F2EA is the
              lighter rung above that. It also means the pill is already wearing
              the tile's colour when the tile inflates around it on expand,
              rather than changing shade mid-gesture.

              `state-layer` composites a translucent ink tint on hover, so hover
              always darkens from wherever the pill rests and can never invert
              (the old `bg-accent` hover crossed THROUGH the resting colour, so
              mid-hover the pill briefly matched its own container).
              rounded-full stays: the composer's inline post box is the app's
              one sanctioned pill-shaped input. */}
          <m.button
            ref={tourAnchorRef}
            type="button"
            data-tour={isFeedComposer ? "feed-composer" : undefined}
            onClick={() => expand("post")}
            aria-hidden={expanded}
            tabIndex={expanded ? -1 : 0}
            animate={{ opacity: expanded ? 0 : 1 }}
            transition={SPRINGS.gentle}
            style={{ pointerEvents: expanded ? "none" : undefined }}
            className="state-layer flex h-11 w-full min-w-0 items-center rounded-full bg-card px-4 text-left text-[14px] text-muted-foreground hover:text-foreground active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inset"
          >
            <span className="truncate">{collapsedPlaceholder}</span>
          </m.button>

          <AnimatePresence>
            {expanded && (
              <m.div
                key="editor"
                ref={editorRef}
                className="absolute inset-x-0 top-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.18 } }}
                exit={{ opacity: 0, transition: SPRINGS.gentle }}
              >
                {editorBody}
              </m.div>
            )}
          </AnimatePresence>
        </m.div>
      </div>
    </m.div>
    </>
  );
}
