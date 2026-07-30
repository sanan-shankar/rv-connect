"use client";

/* ------------------------------------------------------------------ *
 *  Composer lineup: the self-contained demo composers for the
 *  /lab/composer decision page. NONE of these import the
 *  production CreatePostForm; they are lightweight local mocks so each
 *  variant can differ structurally. Posting is faked (a small "Shared to
 *  the feed" flash, then the box folds away).
 *
 *  Axes on show:
 *    - expansion motion: grow + fade, staged reveal, pop from the pill
 *    - formatting toolbar: boxed + tinted, plain icons, tucked behind Aa
 *    - Poll / Letter packaging (the owner dislikes the word "More"):
 *      a + that morphs into labelled pills, two inline low-emphasis
 *      actions, or a plain + with a labelled menu. NO tags anywhere.
 *    - absorbing the "New post" CTA into the composer, with a MOCK header
 *      strip (a fake search circle + bell pushed right, not the real header)
 *
 *  Hard rules honoured: only transform + opacity animate (the focus ring
 *  is an overlay whose opacity/transform animate, never the field's own
 *  box-shadow); one spring set from the kit; no hand-typed cubic-bezier;
 *  no em dashes. SSR-safe (the unfurl is gated behind a user click).
 * ------------------------------------------------------------------ */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react";
import {
  Image as ImageIcon,
  Plus,
  BarChart3,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Feather,
  Search,
  Bell,
} from "lucide-react";
import { SpringPress, SPRINGS, motion, BirdAvatar } from "../_kit";
import { AnimatePresence } from "motion/react";

const ME = { id: "you", name: "You" };
// Resting pill height; the box springs down from exactly this on expand.
const COLLAPSED_H = 44;

/* ================================================================== *
 *  Shared leaf hooks
 * ================================================================== */

/* A contentEditable field with live empty detection + caret helpers. */
function useEditable() {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(true);
  const check = useCallback(() => {
    setEmpty((ref.current?.textContent?.trim().length ?? 0) === 0);
  }, []);
  const focusEnd = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, []);
  const reset = useCallback(() => {
    if (ref.current) ref.current.innerHTML = "";
    setEmpty(true);
  }, []);
  return { ref, empty, check, focusEnd, reset };
}

/* Live selection formatting state + apply, shared by every toolbar treatment. */
function useFmt(ref: RefObject<HTMLDivElement | null>) {
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false });
  const sync = useCallback(() => {
    if (typeof document.queryCommandState !== "function") return;
    try {
      setFmt({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"),
      });
    } catch {
      /* queryCommandState throws when focus is elsewhere; ignore */
    }
  }, []);
  const apply = useCallback(
    (cmd: string) => {
      ref.current?.focus();
      try {
        document.execCommand(cmd, false);
      } catch {
        /* execCommand is deprecated but the simplest reliable inline formatter for a demo */
      }
      sync();
    },
    [ref, sync],
  );
  return { fmt, apply, sync };
}
type FmtApi = ReturnType<typeof useFmt>;

/* An ephemeral confirmation that the fake post "sent". */
function useFlash() {
  const [shown, setShown] = useState(false);
  const timer = useRef<number | null>(null);
  const fire = useCallback(() => {
    setShown(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShown(false), 1250);
  }, []);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);
  return { shown, fire };
}

/* ================================================================== *
 *  Shared leaf components
 * ================================================================== */

function Editor({
  editorRef,
  empty,
  placeholder,
  onInput,
  onSync,
  minH = 88,
}: {
  editorRef: RefObject<HTMLDivElement | null>;
  empty: boolean;
  placeholder: string;
  onInput: () => void;
  onSync?: () => void;
  minH?: number;
}) {
  return (
    <div className="cx-field">
      <div
        ref={editorRef}
        className="cx-editor"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Write your post"
        data-empty={empty ? "true" : "false"}
        data-placeholder={placeholder}
        style={{ minHeight: minH }}
        onInput={() => {
          onInput();
          onSync?.();
        }}
        onKeyUp={onSync}
        onMouseUp={onSync}
      />
      {/* focus ring as an overlay: only opacity/transform animate, never a stray second box */}
      <span className="cx-ring" aria-hidden />
    </div>
  );
}

function PostButton({ empty, onClick, label = "Post" }: { empty: boolean; onClick: () => void; label?: string }) {
  return (
    <motion.button
      type="button"
      className="cx-post"
      onClick={onClick}
      disabled={empty}
      animate={{ scale: empty ? 0.97 : 1, opacity: empty ? 0.55 : 1 }}
      whileHover={empty ? undefined : { scale: 1.03 }}
      whileTap={empty ? undefined : { scale: 0.94 }}
      transition={SPRINGS.snappy}
    >
      {label}
    </motion.button>
  );
}

function PhotoAct() {
  const [on, setOn] = useState(false);
  return (
    <SpringPress
      className={`cx-act${on ? " on" : ""}`}
      onClick={() => setOn((o) => !o)}
      aria-pressed={on}
      aria-label="Add a photo"
      {...({ type: "button" } as object)}
    >
      <ImageIcon size={17} strokeWidth={2.2} />
    </SpringPress>
  );
}

function Cancel({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="cx-cancel" onClick={onClick}>
      Cancel
    </button>
  );
}

function Flash({ shown }: { shown: boolean }) {
  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          className="cx-flash"
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.98 }}
          transition={SPRINGS.snappy}
        >
          Shared to the feed
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* The mock header actions (fake search circle + bell), pushed to the right. */
function HeaderActions() {
  return (
    <div className="cx-header-actions" aria-hidden>
      <SpringPress as="div" className="cx-circle" {...({ role: "img", "aria-label": "Search (mock)" } as object)}>
        <Search size={17} strokeWidth={2.3} />
      </SpringPress>
      <SpringPress as="div" className="cx-circle" {...({ role: "img", "aria-label": "Notifications (mock)" } as object)}>
        <Bell size={17} strokeWidth={2.3} />
        <span className="cx-notif-dot" />
      </SpringPress>
    </div>
  );
}

/* ================================================================== *
 *  Toolbar treatments (a), (b), (c)
 * ================================================================== */

const FMT_BTNS: { key: keyof FmtApi["fmt"]; cmd: string; icon: ReactNode; label: string }[] = [
  { key: "bold", cmd: "bold", icon: <Bold size={15} strokeWidth={2.6} />, label: "Bold" },
  { key: "italic", cmd: "italic", icon: <Italic size={15} strokeWidth={2.4} />, label: "Italic" },
  { key: "underline", cmd: "underline", icon: <Underline size={15} strokeWidth={2.4} />, label: "Underline" },
  { key: "strike", cmd: "strikeThrough", icon: <Strikethrough size={15} strokeWidth={2.4} />, label: "Strikethrough" },
];

/* (b-i) Today's treatment: a bordered, tinted group; active fills canopy. */
export function FmtBoxed({ fmt }: { fmt: FmtApi }) {
  return (
    <div className="cx-fmt">
      {FMT_BTNS.map((b) => (
        <SpringPress
          key={b.key}
          className={`cx-fmt-btn${fmt.fmt[b.key] ? " on" : ""}`}
          onClick={() => fmt.apply(b.cmd)}
          aria-pressed={fmt.fmt[b.key]}
          aria-label={b.label}
          {...({ type: "button" } as object)}
        >
          {b.icon}
        </SpringPress>
      ))}
    </div>
  );
}

/* (b-ii) Plain, untinted icons; active is a small canopy underline, not a fill. */
export function FmtPlain({ fmt }: { fmt: FmtApi }) {
  return (
    <div className="cx-fmt-plain">
      {FMT_BTNS.map((b) => (
        <SpringPress
          key={b.key}
          className={`cx-fmt-plain-btn${fmt.fmt[b.key] ? " on" : ""}`}
          onClick={() => fmt.apply(b.cmd)}
          aria-pressed={fmt.fmt[b.key]}
          aria-label={b.label}
          {...({ type: "button" } as object)}
        >
          {b.icon}
        </SpringPress>
      ))}
    </div>
  );
}

/* (b-iii) A minimal row that stays hidden until asked for: tap Aa to reveal it. */
export function FmtReveal({ fmt }: { fmt: FmtApi }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="cx-fmt-reveal">
      <SpringPress
        className={`cx-aa${open ? " on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Formatting"
        {...({ type: "button" } as object)}
      >
        <span className="cx-aa-label">Aa</span>
      </SpringPress>
      <AnimatePresence>
        {open && (
          <motion.div
            className="cx-fmt-plain cx-fmt-inrow"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={SPRINGS.snappy}
          >
            {FMT_BTNS.map((b) => (
              <SpringPress
                key={b.key}
                className={`cx-fmt-plain-btn${fmt.fmt[b.key] ? " on" : ""}`}
                onClick={() => fmt.apply(b.cmd)}
                aria-pressed={fmt.fmt[b.key]}
                aria-label={b.label}
                {...({ type: "button" } as object)}
              >
                {b.icon}
              </SpringPress>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== *
 *  Poll / Letter packaging treatments (c). No tags anywhere.
 * ================================================================== */

/* (c-i) A single +; tap it and it turns, revealing two labelled pills. */
export function PackPlusPills() {
  const [open, setOpen] = useState(false);
  const [poll, setPoll] = useState(false);
  const [letter, setLetter] = useState(false);
  return (
    <div className="cx-pk-pills">
      <SpringPress
        className={`cx-pk-plus${open ? " on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Add to your post"
        {...({ type: "button" } as object)}
      >
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={SPRINGS.snappy}
          style={{ display: "inline-grid", placeItems: "center" }}
        >
          <Plus size={17} strokeWidth={2.4} />
        </motion.span>
      </SpringPress>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="cx-pk-pill-wrap"
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.92 }}
              transition={SPRINGS.snappy}
            >
              <SpringPress
                className={`cx-pk-pill${poll ? " on" : ""}`}
                onClick={() => setPoll((p) => !p)}
                aria-pressed={poll}
                {...({ type: "button" } as object)}
              >
                <BarChart3 size={14} strokeWidth={2.3} /> Add poll
              </SpringPress>
            </motion.div>
            <motion.div
              className="cx-pk-pill-wrap"
              initial={{ opacity: 0, x: -10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -8, scale: 0.92 }}
              transition={{ ...SPRINGS.snappy, delay: 0.04 }}
            >
              <SpringPress
                className={`cx-pk-pill${letter ? " on" : ""}`}
                onClick={() => setLetter((l) => !l)}
                aria-pressed={letter}
                {...({ type: "button" } as object)}
              >
                <Feather size={14} strokeWidth={2.3} /> Write as a Letter
              </SpringPress>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* (c-ii) No menu at all: two actions inline at low emphasis. */
export function PackInline() {
  const [poll, setPoll] = useState(false);
  const [letter, setLetter] = useState(false);
  return (
    <div className="cx-pk-inline">
      <SpringPress
        className={`cx-pk-ghost${poll ? " on" : ""}`}
        onClick={() => setPoll((p) => !p)}
        aria-pressed={poll}
        {...({ type: "button" } as object)}
      >
        <BarChart3 size={14} strokeWidth={2.2} /> Add poll
      </SpringPress>
      <SpringPress
        className={`cx-pk-ghost${letter ? " on" : ""}`}
        onClick={() => setLetter((l) => !l)}
        aria-pressed={letter}
        {...({ type: "button" } as object)}
      >
        <Feather size={14} strokeWidth={2.2} /> Write as a Letter
      </SpringPress>
    </div>
  );
}

/* (c-iii) A plain + that opens a small labelled menu. Same tucking as today, without "More". */
export function PackMenu() {
  const [open, setOpen] = useState(false);
  const [poll, setPoll] = useState(false);
  const [letter, setLetter] = useState(false);
  return (
    <div className="cx-pk-menu">
      <SpringPress
        className={`cx-pk-plus${open ? " on" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Add to your post"
        {...({ type: "button" } as object)}
      >
        <Plus size={17} strokeWidth={2.4} />
      </SpringPress>
      <AnimatePresence>
        {open && (
          <motion.div
            className="cx-pop"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={SPRINGS.snappy}
          >
            <button
              type="button"
              className={`cx-pop-item${poll ? " on" : ""}`}
              onClick={() => {
                setPoll((p) => !p);
                setOpen(false);
              }}
            >
              <BarChart3 size={16} strokeWidth={2.2} />
              <span>{poll ? "Remove poll" : "Add poll"}</span>
            </button>
            <button
              type="button"
              className={`cx-pop-item${letter ? " on" : ""}`}
              onClick={() => {
                setLetter((l) => !l);
                setOpen(false);
              }}
            >
              <Feather size={16} strokeWidth={2.2} />
              <span>{letter ? "Back to a post" : "Write as a Letter"}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ================================================================== *
 *  The workhorse: a pill that unfurls into an editor. The expansion
 *  MODE, the toolbar treatment and the packaging are all swappable, so
 *  every "avatar + pill" variant on the page is one honest composer with
 *  a different knob turned.
 * ================================================================== */

export function GrowComposer({
  mode = "grow",
  collapsedLabel = "Share a memory...",
  minH = 88,
  FmtComp = FmtBoxed,
  PackComp = PackPlusPills,
}: {
  mode?: "grow" | "staged" | "scale";
  collapsedLabel?: string;
  minH?: number;
  FmtComp?: ComponentType<{ fmt: FmtApi }>;
  PackComp?: ComponentType;
}) {
  const editable = useEditable();
  const fmt = useFmt(editable.ref);
  const flash = useFlash();
  const [open, setOpen] = useState(false);
  const [colH, setColH] = useState(COLLAPSED_H);
  const [settled, setSettled] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const expand = () => {
    setSettled(false);
    setOpen(true);
    requestAnimationFrame(() => editable.focusEnd());
  };
  const collapse = useCallback(() => {
    setSettled(false);
    setOpen(false);
  }, []);

  // While open, measure the editor's natural height and spring the box to it. A
  // ResizeObserver keeps the box exactly content-sized, so nothing clips. When
  // closed the animate target is COLLAPSED_H directly, so no reset state is
  // needed here (colH just holds the last measured height until the next open).
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    const update = () => setColH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  // Outside-click + Escape retract only while the field is empty, so a draft is never lost.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) && editable.empty) collapse();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && editable.empty) collapse();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, editable.empty, collapse]);

  function post() {
    if (editable.empty) return;
    editable.reset();
    flash.fire();
    collapse();
  }

  // Per-mode entrances. Transform + opacity only.
  const bodyInit = mode === "scale" ? { opacity: 0, scale: 0.96, y: -3 } : { opacity: 0 };
  const bodyAnim = mode === "scale" ? { opacity: 1, scale: 1, y: 0 } : { opacity: 1 };
  const bodyTrans = mode === "scale" ? SPRINGS.snappy : { duration: 0.18 };

  return (
    <div className="cx-stage">
      <div className="cx-card" ref={wrapRef}>
        <div className="cx-row">
          <BirdAvatar user={ME} size={38} />
          <motion.div
            className="cx-col"
            initial={false}
            animate={{ height: open ? colH : COLLAPSED_H }}
            transition={SPRINGS.gentle}
            onAnimationComplete={() => setSettled(open)}
            style={{ overflow: settled ? "visible" : "hidden" }}
          >
            <SpringPress
              as="div"
              className="cx-pill"
              onClick={open ? undefined : expand}
              aria-hidden={open}
              style={{ opacity: open ? 0 : 1, pointerEvents: open ? "none" : undefined }}
              {...({ role: "button", tabIndex: open ? -1 : 0 } as object)}
            >
              {collapsedLabel}
            </SpringPress>

            <AnimatePresence>
              {open && (
                <motion.div
                  key="body"
                  ref={bodyRef}
                  className="cx-body"
                  style={{ transformOrigin: "top left" }}
                  initial={bodyInit}
                  animate={bodyAnim}
                  exit={{ opacity: 0 }}
                  transition={bodyTrans}
                >
                  <Editor
                    editorRef={editable.ref}
                    empty={editable.empty}
                    onInput={editable.check}
                    placeholder="What do you remember from the valley?"
                    onSync={fmt.sync}
                    minH={minH}
                  />

                  <motion.div
                    className="cx-foot"
                    initial={mode === "staged" ? { opacity: 0, y: 12 } : false}
                    animate={mode === "staged" ? { opacity: 1, y: 0 } : undefined}
                    transition={{ ...SPRINGS.settle, delay: mode === "staged" ? 0.16 : 0 }}
                  >
                    <div className="cx-foot-l">
                      <FmtComp fmt={fmt} />
                      <PhotoAct />
                      <PackComp />
                    </div>
                    <div className="cx-foot-r">
                      <Cancel
                        onClick={() => {
                          editable.reset();
                          collapse();
                        }}
                      />
                      <PostButton empty={editable.empty} onClick={post} />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
        <Flash shown={flash.shown} />
      </div>
    </div>
  );
}

/* ================================================================== *
 *  CTA-absorption (d): a MOCK header strip (fake search + bell pushed
 *  right) with the composer itself as the "new post" affordance. A panel
 *  grows below the header on click.
 * ================================================================== */

function CtaShell({
  minH = 84,
  renderBar,
}: {
  minH?: number;
  renderBar: (open: boolean, expand: () => void) => ReactNode;
}) {
  const editable = useEditable();
  const fmt = useFmt(editable.ref);
  const flash = useFlash();
  const [open, setOpen] = useState(false);
  const [bodyH, setBodyH] = useState(0);
  const [settled, setSettled] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const expand = () => {
    setSettled(false);
    setOpen(true);
    requestAnimationFrame(() => editable.focusEnd());
  };
  const collapse = useCallback(() => {
    setSettled(false);
    setOpen(false);
  }, []);

  // While open, keep the panel exactly the editor's height. When closed the
  // animate target is 0 directly, so no reset state is needed in the effect.
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    const update = () => setBodyH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node) && editable.empty) collapse();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && editable.empty) collapse();
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, editable.empty, collapse]);

  function post() {
    if (editable.empty) return;
    editable.reset();
    flash.fire();
    collapse();
  }

  return (
    <div className="cx-stage">
      <div className="cx-ctacard" ref={wrapRef}>
        <div className="cx-header">
          <div className="cx-cta-slot">{renderBar(open, expand)}</div>
          <HeaderActions />
        </div>

        <motion.div
          className="cx-panel"
          initial={false}
          animate={{ height: open ? bodyH : 0 }}
          transition={SPRINGS.gentle}
          onAnimationComplete={() => setSettled(open)}
          style={{ overflow: settled ? "visible" : "hidden" }}
        >
          <AnimatePresence>
            {open && (
              <motion.div
                key="body"
                ref={bodyRef}
                className="cx-panel-body"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              >
                <Editor
                  editorRef={editable.ref}
                  empty={editable.empty}
                  onInput={editable.check}
                  placeholder="What do you remember from the valley?"
                  onSync={fmt.sync}
                  minH={minH}
                />
                <div className="cx-foot">
                  <div className="cx-foot-l">
                    <FmtPlain fmt={fmt} />
                    <PhotoAct />
                    <PackPlusPills />
                  </div>
                  <div className="cx-foot-r">
                    <Cancel
                      onClick={() => {
                        editable.reset();
                        collapse();
                      }}
                    />
                    <PostButton empty={editable.empty} onClick={post} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        <Flash shown={flash.shown} />
      </div>
    </div>
  );
}

/* (d-i) The composer bar itself is the canopy call to action. */
export function CtaBar() {
  return (
    <CtaShell
      renderBar={(open, expand) => (
        <SpringPress
          as="div"
          className={`cx-cta-bar${open ? " open" : ""}`}
          onClick={open ? undefined : expand}
          {...({ role: "button", tabIndex: open ? -1 : 0, "aria-label": "Start a post" } as object)}
        >
          <Feather size={16} strokeWidth={2.3} />
          <span>{open ? "New post" : "Start a post"}</span>
        </SpringPress>
      )}
    />
  );
}

/* (d-ii) A calm input with a canopy compose button welded to its end. */
export function CtaWeld() {
  return (
    <CtaShell
      renderBar={(open, expand) => (
        <div className={`cx-weld${open ? " open" : ""}`}>
          <SpringPress
            as="div"
            className="cx-weld-pill"
            onClick={open ? undefined : expand}
            {...({ role: "button", tabIndex: open ? -1 : 0, "aria-label": "Start a post" } as object)}
          >
            <span>{open ? "New post" : "Share a memory..."}</span>
          </SpringPress>
          <SpringPress
            className="cx-weld-btn"
            onClick={open ? undefined : expand}
            aria-label="Write a new post"
            {...({ type: "button" } as object)}
          >
            <Feather size={16} strokeWidth={2.4} />
          </SpringPress>
        </div>
      )}
    />
  );
}

/* ================================================================== *
 *  CSS: scoped under .delight via the DelightShell `css` prop. Uses the
 *  delight kit tokens (--primary, --cinnamon, --heart, --r-card, etc).
 * ================================================================== */

export const COMPOSER_CSS = `
/* page section headings */
.cx-section { font-size:12.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--ink-soft); font-weight:700; margin:38px 2px 6px; }
.cx-section:first-of-type { margin-top:8px; }
.cx-lead { font-size:13.5px; line-height:1.6; color:var(--ink-soft); max-width:72ch; margin:0 2px 16px; }
.cx-closing { margin-top:34px; padding:18px 20px; border-radius:var(--r-card); border:1px solid var(--border);
  background:color-mix(in srgb, var(--primary) 5%, var(--surface)); font-size:13.5px; line-height:1.65; color:var(--ink); }
.cx-closing b { font-weight:700; color:var(--primary); }

/* stage backdrop: a warm inset so the outside-click target is obvious */
.cx-stage { width:100%; align-self:stretch; display:flex; align-items:center; justify-content:center; padding:28px 22px 34px;
  background: radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--primary) 6%, transparent), transparent 60%), var(--surface-2); }

/* base card + avatar row */
.cx-card { position:relative; width:100%; max-width:600px; }
.cx-row { display:flex; gap:13px; align-items:flex-start; background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-card); padding:13px 15px; box-shadow:0 1px 2px rgba(0,0,0,.04), 0 22px 44px -34px rgba(0,0,0,.5); }
.cx-col { position:relative; flex:1; min-width:0; }

/* collapsed pill */
.cx-pill { display:flex; align-items:center; height:44px; padding:0 17px; border-radius:999px; background:var(--surface-2);
  border:1px solid var(--border); color:var(--ink-soft); font-size:14.5px; cursor:text; user-select:none; }
.cx-pill:hover { color:var(--ink); }

/* the absolute editor body layered over the pill */
.cx-body { position:absolute; left:0; right:0; top:0; display:flex; flex-direction:column; }

/* field + focus ring overlay */
.cx-field { position:relative; }
.cx-editor { width:100%; border-radius:var(--r-input); border:1px solid var(--border); background:var(--surface);
  padding:12px 14px; color:var(--ink); font:inherit; font-size:14.5px; line-height:1.6; outline:none; white-space:pre-wrap; word-break:break-word; }
.cx-editor[data-empty="true"]::before { content:attr(data-placeholder); color:color-mix(in srgb, var(--ink-soft) 78%, transparent); pointer-events:none; }
.cx-editor u { text-underline-offset:2px; }
.cx-ring { position:absolute; inset:0; border-radius:var(--r-input); pointer-events:none;
  box-shadow:0 0 0 3px color-mix(in srgb, var(--primary) 26%, transparent);
  border:1px solid color-mix(in srgb, var(--primary) 55%, var(--border));
  opacity:0; transform:scale(.992); transform-origin:center;
  transition:opacity 160ms var(--ease-spring), transform 160ms var(--ease-spring); }
.cx-editor:focus ~ .cx-ring { opacity:1; transform:scale(1); }

/* footer */
.cx-foot { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:12px; flex-wrap:wrap; }
.cx-foot-l { display:flex; align-items:center; gap:8px; flex-wrap:wrap; min-width:0; }
.cx-foot-r { display:flex; align-items:center; gap:9px; margin-left:auto; }
.cx-cancel { border:0; background:transparent; cursor:pointer; font:inherit; font-size:13.5px; font-weight:600; color:var(--ink-soft); padding:9px 12px; border-radius:999px; }
.cx-cancel:hover { color:var(--ink); background:var(--surface-2); }
.cx-post { border:0; cursor:pointer; font:inherit; font-size:14px; font-weight:700; color:var(--primary-ink); background:var(--primary);
  height:40px; padding:0 22px; border-radius:999px; box-shadow:0 6px 16px -11px var(--primary), inset 0 1px 0 color-mix(in srgb,#fff 22%, transparent); }
.cx-post:disabled { cursor:default; box-shadow:none; }
.cx-post:not(:disabled):focus-visible { outline:2px solid color-mix(in srgb, var(--primary) 60%, transparent); outline-offset:2px; }

/* photo icon action */
.cx-act { display:inline-grid; place-items:center; width:36px; height:36px; border:0; border-radius:11px; cursor:pointer; background:transparent; color:var(--ink-soft); }
.cx-act:hover { background:var(--surface-2); color:var(--ink); }
.cx-act.on { color:var(--cinnamon); background:color-mix(in srgb, var(--cinnamon) 12%, transparent); }

/* toolbar (a): boxed + tinted */
.cx-fmt { display:flex; gap:3px; background:var(--surface-2); border:1px solid var(--border); border-radius:11px; padding:3px; }
.cx-fmt-btn { display:inline-grid; place-items:center; width:30px; height:30px; border:0; background:transparent; cursor:pointer; color:var(--ink-soft); border-radius:8px; }
.cx-fmt-btn:hover { color:var(--ink); background:color-mix(in srgb, var(--ink) 6%, transparent); }
.cx-fmt-btn.on { color:var(--primary-ink); background:var(--primary); }

/* toolbar (b): plain, untinted; active is a small canopy underline */
.cx-fmt-plain { display:flex; align-items:center; gap:2px; }
.cx-fmt-plain-btn { position:relative; display:inline-grid; place-items:center; width:32px; height:32px; border:0; background:transparent; cursor:pointer; color:var(--ink-soft); border-radius:9px; }
.cx-fmt-plain-btn:hover { color:var(--ink); background:color-mix(in srgb, var(--ink) 5%, transparent); }
.cx-fmt-plain-btn.on { color:var(--primary); }
.cx-fmt-plain-btn.on::before { content:""; position:absolute; bottom:4px; left:50%; transform:translateX(-50%); width:6px; height:2px; border-radius:2px; background:var(--primary); }

/* toolbar (c): tucked behind Aa */
.cx-fmt-reveal { display:flex; align-items:center; gap:6px; }
.cx-aa { display:inline-grid; place-items:center; height:32px; min-width:36px; padding:0 9px; border:1px solid var(--border); background:var(--surface-2); color:var(--ink-soft); border-radius:9px; cursor:pointer; }
.cx-aa:hover { color:var(--ink); }
.cx-aa.on { color:var(--primary); border-color:color-mix(in srgb, var(--primary) 45%, var(--border)); background:color-mix(in srgb, var(--primary) 10%, var(--surface)); }
.cx-aa-label { font-weight:800; font-size:13px; line-height:1; }
.cx-fmt-inrow { display:flex; align-items:center; gap:2px; }

/* packaging (c-i): + morphs into labelled pills */
.cx-pk-pills { position:relative; display:flex; align-items:center; flex-wrap:wrap; gap:7px; }
.cx-pk-menu { position:relative; display:flex; align-items:center; gap:7px; }
.cx-pk-plus { display:inline-grid; place-items:center; width:36px; height:36px; border:0; border-radius:11px; cursor:pointer; background:var(--surface-2); color:var(--ink-soft); }
.cx-pk-plus:hover { color:var(--ink); }
.cx-pk-plus.on { color:var(--primary); background:color-mix(in srgb, var(--primary) 12%, transparent); }
.cx-pk-pill-wrap { display:inline-flex; }
.cx-pk-pill { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 13px; border-radius:999px; border:1px solid var(--border); background:var(--surface); color:var(--ink); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap; }
.cx-pk-pill:hover { border-color:color-mix(in srgb, var(--primary) 40%, var(--border)); color:var(--primary); }
.cx-pk-pill svg { color:var(--cinnamon); }
.cx-pk-pill.on { border-color:color-mix(in srgb, var(--primary) 45%, var(--border)); background:color-mix(in srgb, var(--primary) 12%, var(--surface)); color:var(--primary); }
.cx-pk-pill.on svg { color:var(--primary); }

/* packaging (c-ii): two inline low-emphasis actions */
.cx-pk-inline { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
.cx-pk-ghost { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 11px; border-radius:999px; border:0; background:transparent; color:var(--ink-soft); font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; white-space:nowrap; }
.cx-pk-ghost:hover { background:var(--surface-2); color:var(--ink); }
.cx-pk-ghost svg { opacity:.7; }
.cx-pk-ghost.on { color:var(--primary); background:color-mix(in srgb, var(--primary) 10%, transparent); }
.cx-pk-ghost.on svg { opacity:1; color:var(--primary); }

/* packaging (c-iii): plain + with a labelled menu */
.cx-pop { position:absolute; z-index:30; bottom:44px; left:0; width:198px; background:var(--surface); border:1px solid var(--border); border-radius:14px;
  box-shadow:0 6px 14px -8px rgba(0,0,0,.18), 0 26px 50px -30px rgba(0,0,0,.55); padding:6px; display:flex; flex-direction:column; gap:2px; transform-origin:bottom left; }
.cx-pop-item { display:flex; align-items:center; gap:10px; width:100%; border:0; background:transparent; cursor:pointer; font:inherit; font-size:13px; font-weight:600; color:var(--ink); padding:9px 10px; border-radius:9px; text-align:left; }
.cx-pop-item:hover { background:var(--surface-2); }
.cx-pop-item.on { color:var(--primary); background:color-mix(in srgb, var(--primary) 10%, transparent); }
.cx-pop-item svg { color:var(--ink-soft); }
.cx-pop-item.on svg { color:var(--primary); }

/* fake-post confirmation */
.cx-flash { position:absolute; left:50%; bottom:-15px; transform:translateX(-50%); z-index:40; display:inline-flex; align-items:center; gap:7px;
  background:var(--primary); color:var(--primary-ink); font-size:12.5px; font-weight:700; padding:8px 15px; border-radius:999px; white-space:nowrap;
  box-shadow:0 12px 26px -14px var(--primary); }

/* CTA-absorption: mock header strip + expanding panel */
.cx-ctacard { position:relative; width:100%; max-width:620px; background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-card); padding:13px 15px; box-shadow:0 1px 2px rgba(0,0,0,.04), 0 22px 44px -34px rgba(0,0,0,.5); }
.cx-header { display:flex; align-items:center; gap:12px; }
.cx-cta-slot { flex:1; min-width:0; }
.cx-header-actions { display:flex; align-items:center; gap:8px; flex:0 0 auto; }
.cx-circle { position:relative; display:inline-grid; place-items:center; width:40px; height:40px; border-radius:50%; border:1px solid var(--border); background:var(--surface-2); color:var(--ink-soft); cursor:pointer; }
.cx-circle:hover { color:var(--ink); }
.cx-notif-dot { position:absolute; top:8px; right:9px; width:7px; height:7px; border-radius:50%; background:var(--heart); border:1.5px solid var(--surface-2); }

/* C1: composer bar is the canopy CTA */
.cx-cta-bar { display:flex; align-items:center; gap:9px; height:44px; padding:0 18px; border-radius:999px; cursor:pointer; user-select:none;
  color:var(--primary); font-size:14.5px; font-weight:600; white-space:nowrap; overflow:hidden;
  background:color-mix(in srgb, var(--primary) 10%, var(--surface));
  border:1px solid color-mix(in srgb, var(--primary) 35%, var(--border)); }
.cx-cta-bar span { overflow:hidden; text-overflow:ellipsis; }
.cx-cta-bar:hover { background:color-mix(in srgb, var(--primary) 15%, var(--surface)); }
.cx-cta-bar svg { color:var(--primary); }
.cx-cta-bar.open { color:var(--ink); background:transparent; border-color:transparent; font-weight:700; padding-left:2px; cursor:default; }
.cx-cta-bar.open svg { color:var(--cinnamon); }

/* C2: calm input + welded round compose button */
.cx-weld { display:flex; align-items:center; gap:8px; }
.cx-weld-pill { flex:1; min-width:0; display:flex; align-items:center; height:44px; padding:0 17px; border-radius:999px; cursor:text; user-select:none;
  background:var(--surface-2); border:1px solid var(--border); color:var(--ink-soft); font-size:14.5px; white-space:nowrap; overflow:hidden; }
.cx-weld-pill span { overflow:hidden; text-overflow:ellipsis; }
.cx-weld-pill:hover { color:var(--ink); }
.cx-weld.open .cx-weld-pill { color:var(--ink); font-weight:700; }
.cx-weld-btn { flex:0 0 auto; display:inline-grid; place-items:center; width:44px; height:44px; border-radius:50%; border:0; cursor:pointer;
  background:var(--primary); color:var(--primary-ink); box-shadow:0 6px 16px -11px var(--primary), inset 0 1px 0 color-mix(in srgb,#fff 22%, transparent); }

/* expanding panel below the header (CTA variants) */
.cx-panel { position:relative; }
.cx-panel-body { padding-top:13px; display:flex; flex-direction:column; }

@media (max-width:640px){
  .cx-stage { padding:20px 12px 26px; }
  .cx-foot { gap:9px; }
  .cx-header { flex-wrap:wrap; }
  .cx-header-actions { order:2; }
}
`;
