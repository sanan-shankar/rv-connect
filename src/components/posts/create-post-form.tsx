"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ImagePlus, X, BarChart3, Feather, Plus, MapPin, Loader2, Check, Images } from "lucide-react";
import { m, AnimatePresence } from "motion/react";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { callAction } from "@/lib/call-action";
import { useEmailGate } from "@/components/auth/verify-email-dialog";
import { createPost, editPost, publishDraft } from "@/app/(main)/feed/actions";
import { BirdAvatar, type AvatarUser } from "@/components/common/bird-avatar";
import { SPRINGS, SpringPress } from "@/components/common/motion";
import { PhotoAimButton } from "@/components/common/photo-aim";
import { cn } from "@/lib/utils";
import { renderRichText } from "@/lib/rich-text";
import { useComposerUploads } from "./use-composer-uploads";
import { useLetterPersistence } from "./use-letter-persistence";
import {
  applyFormatShortcut,
  insertPlainTextPaste,
  computeMentionRange,
  serializeEditableToMarkdown,
} from "@/lib/rich-text-editing";

/* ------------------------------------------------------------------ *
 *  The composer itself stays static -- its collapsed pill is the first
 *  thing on /feed and deferring it would delay the page's own content.
 *  These three are different: none of them can appear until you press
 *  something. The poll builder waits on "Add a poll", the mention list
 *  on typing "@", the photo dialog on the image button.
 * ------------------------------------------------------------------ */
const PollCreator = dynamic(() => import("./poll-creator").then((m) => m.PollCreator), {
  ssr: false,
});
const MentionDropdown = dynamic(
  () => import("./mention-dropdown").then((m) => m.MentionDropdown),
  { ssr: false }
);
const AttachImageDialog = dynamic(
  () => import("@/components/common/attach-image-dialog").then((m) => m.AttachImageDialog),
  { ssr: false }
);

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

const SCOPE_PLACEHOLDER: Record<ComposerScope, string> = {
  // Owner's wording, 2026-08-04: no "sighting", and the community rather than
  // the valley. Two things offered instead of three reads as an invitation
  // rather than a menu.
  post: "Share a memory or a note with the community...",
  letter: "Write your letter to the valley. Take your time.",
};

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
  // An unconfirmed address is refused by createPost/editPost/publishDraft on
  // the server. This turns that refusal into a dialog with the fix in it,
  // instead of a toast that slides away while you are still reading it.
  const emailGate = useEmailGate();
  const [content, setContent] = useState(initialContent ?? "");
  const [kind, setKind] = useState<"post" | "letter">(defaultLetter ? "letter" : "post");
  const [title, setTitle] = useState(initialTitle ?? "");
  /* "Add to the Collection", the one item the "+" menu grows once a photo is
     attached. Off by default and never remembered between posts: it is an
     offer, and an offer that quietly stays on would put photographs in the
     archive nobody chose to put there. */
  const [toCollection, setToCollection] = useState(false);
  /* The photograph pipeline, in its own file (audit feed-posts-02): the
     uploads, the previews and the blob-url bookkeeping, whose whole contract
     with this editor is the four values it hands back. */
  const {
    images,
    previews,
    facts,
    uploading,
    uploadProgress,
    handleImageFiles,
    removeImage,
    resetImages,
  } = useComposerUploads({
    initialImages,
    // Taking the last photograph out takes the offer with it, so adding a
    // different one later starts from "no" rather than from a yes the writer
    // left on for a picture they since deleted.
    onEmptied: () => setToCollection(false),
  });
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  /* A ref as well as the two flags, because `disabled` only takes effect on
     the next render: pressing Post twice in one frame (a click plus the Enter
     that was still down, a double-tap on a slow connection) reached the action
     twice and published the whole post twice (audit M35). Set synchronously,
     so the second call in the same frame sees it. Covers Save-as-draft too --
     they write the same row and must not overlap either. */
  const submittingRef = useRef(false);
  const [expanded, setExpanded] = useState(defaultLetter);
  const [pollOptions, setPollOptions] = useState<string[] | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  /* True from the first press of the photo button onward. The dialog has to
     stay mounted once it has been opened so its close animation has something
     to play out of; it must not mount BEFORE that, or the deferred chunk is
     fetched by a composer nobody has attached anything to. */
  const [attachMounted, setAttachMounted] = useState(false);
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

  /* Putting a recovered draft back on the sheet. This stays here rather than
     inside the persistence hook because it is the same uncontrolled-DOM write
     the hydration above does: the words go into state AND into the
     contentEditable, and only the editor knows about the second half. */
  const applyRestoredDraft = useCallback((local: { content: string; title?: string }) => {
    setContent(local.content);
    if (local.title) setTitle(local.title);
    if (richRef.current) richRef.current.innerHTML = renderRichText(local.content);
    hydratedRef.current = true;
  }, []);

  /* Everything that keeps a letter from being lost -- the device-side crash
     net, the idle autosave, the read-back of a local copy, and the save that
     fires when somebody navigates away mid-sentence -- in its own file (audit
     feed-posts-02). C-014, C-175, C-176, C-177, B-043 and M66 all live in
     there, with their reasoning. */
  const { baseUpdatedAtRef, autosaveRunRef, disarmAutosave, markSaved, clearLocalDraft } =
    useLetterPersistence({
      userId: currentUser?.id,
      postId,
      defaultLetter,
      draft: { content, title, images, audienceCity, isLetter },
      initial: {
        content: initialContent,
        title: initialTitle,
        images: initialImages,
        cityScope: initialCityScope,
        updatedAt: initialUpdatedAt,
      },
      submittingRef,
      editorRef: richRef,
      onAutosaveState,
      onRestore: applyRestoredDraft,
    });

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

  /* Once the composer is open, all three deferred pieces are one press away,
     so they are fetched now rather than on the press itself -- off the feed's
     critical path, but long before anyone can ask for them. A collapsed pill,
     which is what /feed loads with, still fetches none of them. */
  useEffect(() => {
    if (!expanded) return;
    void import("./poll-creator");
    void import("./mention-dropdown");
    void import("@/components/common/attach-image-dialog");
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
  //
  // And guarded on being inside ANY dialog, which is the general form of the
  // same bug: `attachOpen` fixed it for one portal by name, and the crop
  // handle (spec §9) was a second one that collapsed the composer out from
  // under itself mid-drag, taking the photograph with it. A third portal
  // would have repeated it again. Every dialog in this app is the same
  // material and carries `role="dialog"`, so this asks the question once
  // rather than keeping a list of them.
  useEffect(() => {
    if (!expanded || attachOpen) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Element | null;
      if (target?.closest?.('[role="dialog"], [role="alertdialog"]')) return;
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

  async function handleSubmit(saveAsDraft = false) {
    if (!content.trim()) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    /* Disarm the autosave BEFORE awaiting anything. A timer armed by a
       keystroke within the last 2.5 seconds would otherwise fire while this
       save is in flight, and both writes would carry the same baseUpdatedAt --
       editPost's version precondition lets exactly one through and tells the
       writer the other was edited somewhere else (audit C-175). */
    disarmAutosave();
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
      // Only sent when there is actually a photograph to contribute; the menu
      // item is hidden otherwise, and the server ignores it for a draft.
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
          markSaved();
          clearLocalDraft();
          toast.success("Draft saved");
          onAutosaveState?.("saved");
        } else {
          const pub = await callAction(() => publishDraft(postId));
          if ("error" in pub && pub.error) {
            if (!emailGate.handled(pub.error)) toast.error(pub.error);
          } else {
            markSaved();
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
        markSaved();
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
        // Drops the list and releases the blob urls this composer minted
        // (audit C-183); see the hook.
        resetImages();
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
          // Said once, here, rather than as a line of help in the menu: a
          // contribution waits for a moderator, and someone who chose to give a
          // photograph and then cannot find it in the Collection deserves to
          // know why. The menu item itself stays one line.
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
  // a letter), the Collection offer (only with a photograph attached) and the
  // audience picker (only if this person has cities).
  const canAddPoll = !isLetter;
  const canToggleLetter = !defaultLetter;
  // The Collection offer joined the menu on 2026-08-28; it exists only while
  // there is a photograph to give, which is also why it can bring the whole
  // menu into being on the letters desk, where the other three offers are off.
  const canOfferCollection = previews.length > 0;
  const showMore =
    canAddPoll || canToggleLetter || canOfferCollection || audienceOptions.length > 0;

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
                {/* Only appears where the card is actually going to cut this
                    photograph, so it doubles as the notice that it will be.
                    Bottom LEFT, mirroring the remove button at top right: two
                    controls on an 80px square want opposite corners, and the
                    destructive one keeps the corner it has always had. */}
                <PhotoAimButton
                  src={images[i]}
                  facts={facts[images[i]]}
                  className="absolute -bottom-1 -left-1 h-5 w-5"
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
        {/* flex-wrap, from the days when a full "Also add to the Collection"
            tick sat in this row and overflowed a 390px composer. That label is
            now inside the "+" menu and only its chip can appear here, so the
            row fits at every width -- but the wrap stays, because it is what
            catches a long city name in the audience chip beside it, and
            wrapping Post to its own right-aligned line beats truncating. */}
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
            {attachMounted && (
              <AttachImageDialog
                open={attachOpen}
                onOpenChange={setAttachOpen}
                onFiles={handleImageFiles}
                multiple
                title="Add photos"
              />
            )}

            {/* Icon only: the word "Photo" is gone, so the label lives in
                aria-label/title (and carries the live upload progress, which
                used to be the button's text). */}
            <SpringPress
              className={iconControl}
              onClick={() => {
                setAttachMounted(true);
                setAttachOpen(true);
              }}
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
                      {/* The Collection offer. It used to be a tick and a
                          label sitting out in the control row, which the owner
                          called ugly on 2026-08-28 and asked to live "under the
                          plus", appearing once a photo is uploaded. It reads
                          better here anyway: this menu is already "what else
                          goes with this post", which is the whole question the
                          offer is asking.
                          The glyph is the sidebar's own Collection icon, so the
                          destination is recognised before the label is read --
                          and it is a stack of photographs, which is the other
                          half of the message (the pictures go, not the post).
                          Its two neighbours announce state by rewriting their
                          label to the undo ("Remove poll"); this one keeps one
                          label and carries a check, because the reverse of
                          giving something to an archive has no phrasing that
                          is not either clumsy or faintly scolding. */}
                      {canOfferCollection && (
                        <button
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={toCollection}
                          onClick={() => {
                            setToCollection((v) => !v);
                            setMore(false);
                          }}
                          className={`state-layer flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-medium active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                            toCollection ? "text-leaf" : "text-foreground"
                          }`}
                        >
                          <Images className="h-4 w-4 shrink-0" />
                          {/* nowrap: with the check taking its 16px on the
                              right, flex's default min-width:auto let this
                              label break to "Add to the / Collection" the
                              moment it was ticked -- a menu row that changes
                              height when you press it. */}
                          <span className="whitespace-nowrap">Add to the Collection</span>
                          {toCollection && (
                            <Check className="ml-auto h-4 w-4 shrink-0" strokeWidth={2.5} />
                          )}
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

          {/* The tick's job, done only when the answer is yes: off, the row
              carries nothing at all. It is the audience chip's twin, and like
              that one it reopens the menu, which is where it is turned off.
              It names the PHOTOGRAPHS, not the post, because only they go to
              the archive (owner, 2026-08-28: it "shouldn't imply the entire
              post is for the collection just the images"), and the count says
              which ones when there are three.
              Leaf, not canopy: dark mode lightens --leaf to #3FD16A and leaves
              --canopy at the deep #235C49 it wants the sidebar to keep, so a
              canopy-inked chip would go nearly unreadable on a dark card. */}
          {toCollection && previews.length > 0 && (
            <button
              type="button"
              onClick={() => setMore(true)}
              className="inline-flex min-w-0 items-center gap-1 rounded-full bg-leaf/12 px-2.5 py-1 text-[11.5px] font-semibold text-leaf hover:bg-leaf/20 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <Images className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {previews.length === 1 ? "Photo" : `${previews.length} photos`} for the
                Collection
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
            type="button"
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
