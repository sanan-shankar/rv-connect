"use client";

/* ------------------------------------------------------------------ *
 *  Composer rework (Stream C). One polished, interactive composer that
 *  unfurls from a slim pill into a full post box with inline formatting,
 *  a tucked "more" menu (poll lives here, never on the surface), a quiet
 *  one-tag affordance, an outside-click collapse, and a confident lab-pill
 *  Post button that springs alive once there is text.
 *
 *  RESEARCH TAKEAWAYS (reasoned from established social-composer UX,
 *  Twitter/X, LinkedIn, Facebook, Notion, Threads; no network used):
 *  1. Collapse-to-expand: the resting state is a single low-commitment
 *     line ("Share a memory..."). Clicking it grows the box and moves
 *     focus into the field. Almost every modern composer hides its full
 *     surface area until the user signals intent. Keeps the feed calm.
 *  2. Progressive disclosure of actions: primary action (text) is always
 *     visible; secondary actions are tucked. The strong consensus is a
 *     small icon row for the most common adjunct (here: photo) and a
 *     "more" (+) menu for the long tail (poll, letter). Rarely-used
 *     actions behind one extra tap is the right cost. Poll specifically
 *     belongs in the overflow, never the surface.
 *  3. Inline formatting on demand: a compact formatting bar that appears
 *     on focus (not a permanent stranded strip). Buttons reflect the live
 *     selection's state (toggled on when the caret sits inside a styled
 *     run). bold/italic/underline/strikethrough cover the everyday set;
 *     super/sub are power-user noise and are omitted.
 *  4. Single-tag, no chip wall: suggestion chip walls add clutter and
 *     decision cost. A quiet "Add a tag" pill that, when used, holds ONE
 *     tag (a couple of presets plus free text). It must not reserve
 *     vertical space when empty.
 *  5. Focus treatment: one clean, subtle ring on the field itself that
 *     fades in via opacity/transform, never a second stray block behind
 *     the field. Clicking the field is a single, instant, correct focus.
 *  6. Outside-click collapse + Escape: clicking the empty backdrop or
 *     pressing Escape retracts the composer. Standard dismiss affordance.
 *  7. Confident submit: a single clean pill, disabled (quiet) until there
 *     is content, then it springs to enabled. No dated rounded-rect.
 *
 *  HARD-RULE NOTES: motion only animates transform + opacity (the focus
 *  ring uses an overlay element whose opacity/scale animate; the field's
 *  own box-shadow is not transitioned). No 3-keyframe springs. No em
 *  dashes. SSR-safe (no initial entrance that differs server vs client;
 *  the unfurl is gated behind a user click). Hoopoe is not built here.
 * ------------------------------------------------------------------ */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Plus,
  BarChart3,
  PenLine,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Tag as TagIcon,
  X,
  Check,
} from "lucide-react";
import {
  DelightShell,
  DemoGrid,
  DemoCard,
  SpringPress,
  SPRINGS,
  motion,
  BirdAvatar,
} from "../_kit";
import { AnimatePresence } from "motion/react";

export default function Page() {
  return (
    <DelightShell
      title="Composer"
      lede="A slim pill that unfurls into a calm, capable post box. Inline formatting on focus, secondary actions tucked away, one quiet tag, a Post button that springs to life. Click into it, then click the backdrop to watch it retract."
      css={CSS}
    >
      <DemoGrid>
        <ComposerStage />
      </DemoGrid>
    </DelightShell>
  );
}

/* ---- the one composer ---- */

const TAG_PRESETS = ["Memory", "School update", "Looking for"];

function ComposerStage() {
  const [open, setOpen] = useState(false);
  const [empty, setEmpty] = useState(true); // governs Post enabled state
  const [more, setMore] = useState(false); // overflow ("+") menu
  const [tagOpen, setTagOpen] = useState(false); // tag picker popover
  const [tag, setTag] = useState<string | null>(null);
  const [pollOn, setPollOn] = useState(false);
  const [letterOn, setLetterOn] = useState(false);
  const [photoNote, setPhotoNote] = useState(false);
  const [fmt, setFmt] = useState({ bold: false, italic: false, underline: false, strike: false });

  const wrapRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  /* collapse everything back to the resting pill */
  const collapse = useCallback(() => {
    setOpen(false);
    setMore(false);
    setTagOpen(false);
  }, []);

  /* outside-click + Escape dismiss (only while open) */
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        // collapse only when the field is empty; if the user typed, keep it open
        // so they do not lose a draft to a stray click. Empty == safe to retract.
        if (empty) collapse();
        else {
          setMore(false);
          setTagOpen(false);
        }
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (tagOpen) setTagOpen(false);
        else if (more) setMore(false);
        else collapse();
      }
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, empty, more, tagOpen, collapse]);

  /* open: grow, then drop the caret into the editor */
  function expand() {
    setOpen(true);
    requestAnimationFrame(() => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();
      // place caret at the end of any existing content
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    });
  }

  /* read live selection state so the toolbar buttons reflect the caret */
  function syncFmt() {
    if (typeof document.queryCommandState !== "function") return;
    try {
      setFmt({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strike: document.queryCommandState("strikeThrough"),
      });
    } catch {
      /* queryCommandState can throw if focus is elsewhere; ignore */
    }
  }

  function checkEmpty() {
    const el = editorRef.current;
    const txt = el?.textContent?.trim() ?? "";
    setEmpty(txt.length === 0);
  }

  /* apply a formatting command to the current selection, keep caret in field */
  function applyCmd(cmd: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand(cmd, false);
    } catch {
      /* execCommand is deprecated but still the simplest reliable inline
         formatter for a contentEditable demo; safe to ignore failures */
    }
    syncFmt();
    checkEmpty();
  }

  function reset() {
    if (editorRef.current) editorRef.current.innerHTML = "";
    setEmpty(true);
    setTag(null);
    setPollOn(false);
    setLetterOn(false);
    setPhotoNote(false);
    setFmt({ bold: false, italic: false, underline: false, strike: false });
  }

  function post() {
    if (empty) return;
    reset();
    collapse();
  }

  const fmtButtons: { key: keyof typeof fmt; cmd: string; icon: React.ReactNode; label: string }[] = [
    { key: "bold", cmd: "bold", icon: <Bold size={15} strokeWidth={2.6} />, label: "Bold" },
    { key: "italic", cmd: "italic", icon: <Italic size={15} strokeWidth={2.4} />, label: "Italic" },
    { key: "underline", cmd: "underline", icon: <Underline size={15} strokeWidth={2.4} />, label: "Underline" },
    { key: "strike", cmd: "strikeThrough", icon: <Strikethrough size={15} strokeWidth={2.4} />, label: "Strikethrough" },
  ];

  return (
    <DemoCard
      title="The composer"
      note="Pill unfurls on click. Formatting reveals on focus, poll hides behind the plus menu, one low-profile tag, and the backdrop click retracts it."
      span={3}
      pad={false}
    >
      <div className="cmp-stage">
        <div className="cmp-wrap" ref={wrapRef}>
          <div className="cmp-row">
            <BirdAvatar user={{ id: "you", name: "You" }} size={38} />

            {!open ? (
              <SpringPress
                as="div"
                className="cmp-pill"
                onClick={expand}
                {...({ role: "button", tabIndex: 0 } as object)}
              >
                Share a memory...
              </SpringPress>
            ) : (
              <motion.div
                className="cmp-open"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                transition={SPRINGS.gentle}
                style={{ overflow: "visible" }}
              >
                {/* the field, with its own clean focus ring overlay */}
                <div className="cmp-field">
                  <div
                    ref={editorRef}
                    className="cmp-editor"
                    contentEditable
                    suppressContentEditableWarning
                    role="textbox"
                    aria-multiline="true"
                    aria-label="Write your post"
                    data-empty={empty ? "true" : "false"}
                    data-placeholder="What do you remember from the valley?"
                    onInput={() => {
                      checkEmpty();
                      syncFmt();
                    }}
                    onKeyUp={syncFmt}
                    onMouseUp={syncFmt}
                  />
                  {/* focus ring lives as an overlay so we animate opacity/scale,
                      never a stray second box behind the field */}
                  <span className="cmp-ring" aria-hidden />
                </div>

                {/* compact inline formatting bar (reveals with the field) */}
                <motion.div
                  className="cmp-toolbar"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRINGS.settle, delay: 0.05 }}
                >
                  <div className="cmp-fmt">
                    {fmtButtons.map((b) => (
                      <SpringPress
                        key={b.key}
                        className={`cmp-fmt-btn${fmt[b.key] ? " on" : ""}`}
                        onClick={() => applyCmd(b.cmd)}
                        aria-pressed={fmt[b.key]}
                        aria-label={b.label}
                        {...({ type: "button" } as object)}
                      >
                        {b.icon}
                      </SpringPress>
                    ))}
                  </div>

                  <span className="cmp-fmt-rule" aria-hidden />

                  {/* low-profile single-tag affordance: collapses to nothing when unused */}
                  <div className="cmp-tagzone">
                    {tag ? (
                      <motion.span
                        className="cmp-tag-set"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={SPRINGS.snappy}
                      >
                        <TagIcon size={12} strokeWidth={2.4} />
                        {tag}
                        <button
                          type="button"
                          className="cmp-tag-x"
                          aria-label="Remove tag"
                          onClick={() => setTag(null)}
                        >
                          <X size={12} strokeWidth={2.6} />
                        </button>
                      </motion.span>
                    ) : (
                      <div className="cmp-tag-trigger-wrap">
                        <SpringPress
                          className={`cmp-tag-trigger${tagOpen ? " on" : ""}`}
                          onClick={() => {
                            setTagOpen((t) => !t);
                            setMore(false);
                          }}
                          aria-expanded={tagOpen}
                          {...({ type: "button" } as object)}
                        >
                          <TagIcon size={12} strokeWidth={2.4} />
                          Add a tag
                        </SpringPress>

                        <AnimatePresence>
                          {tagOpen && (
                            <motion.div
                              className="cmp-pop cmp-tagpop"
                              initial={{ opacity: 0, y: 6, scale: 0.96 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.97 }}
                              transition={SPRINGS.snappy}
                            >
                              <div className="cmp-pop-presets">
                                {TAG_PRESETS.map((p) => (
                                  <SpringPress
                                    key={p}
                                    className="cmp-pop-preset"
                                    onClick={() => {
                                      setTag(p);
                                      setTagOpen(false);
                                    }}
                                    {...({ type: "button" } as object)}
                                  >
                                    {p}
                                  </SpringPress>
                                ))}
                              </div>
                              <form
                                className="cmp-pop-form"
                                onSubmit={(e) => {
                                  e.preventDefault();
                                  const v = tagInputRef.current?.value.trim();
                                  if (v) {
                                    setTag(v);
                                    setTagOpen(false);
                                  }
                                }}
                              >
                                <input
                                  ref={tagInputRef}
                                  className="cmp-pop-input"
                                  placeholder="or type your own"
                                  maxLength={24}
                                />
                                <button type="submit" className="cmp-pop-add" aria-label="Add tag">
                                  <Check size={14} strokeWidth={2.6} />
                                </button>
                              </form>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* selected secondary attachments surface as quiet inline notes */}
                <AnimatePresence>
                  {(pollOn || letterOn || photoNote) && (
                    <motion.div
                      className="cmp-attachments"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={SPRINGS.settle}
                    >
                      {photoNote && (
                        <span className="cmp-att">
                          <ImageIcon size={13} strokeWidth={2.2} /> Photo added
                          <button type="button" onClick={() => setPhotoNote(false)} aria-label="Remove photo">
                            <X size={12} strokeWidth={2.6} />
                          </button>
                        </span>
                      )}
                      {pollOn && (
                        <span className="cmp-att">
                          <BarChart3 size={13} strokeWidth={2.2} /> Poll attached
                          <button type="button" onClick={() => setPollOn(false)} aria-label="Remove poll">
                            <X size={12} strokeWidth={2.6} />
                          </button>
                        </span>
                      )}
                      {letterOn && (
                        <span className="cmp-att">
                          <PenLine size={13} strokeWidth={2.2} /> Letter format
                          <button type="button" onClick={() => setLetterOn(false)} aria-label="Remove letter format">
                            <X size={12} strokeWidth={2.6} />
                          </button>
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* footer: photo on surface, poll/letter tucked behind the plus */}
                <motion.div
                  className="cmp-foot"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRINGS.settle, delay: 0.1 }}
                >
                  <div className="cmp-foot-l">
                    <SpringPress
                      className={`cmp-act${photoNote ? " on" : ""}`}
                      onClick={() => setPhotoNote((p) => !p)}
                      aria-label="Add a photo"
                      aria-pressed={photoNote}
                      {...({ type: "button" } as object)}
                    >
                      <ImageIcon size={17} strokeWidth={2.2} />
                    </SpringPress>

                    <div className="cmp-more-wrap">
                      <SpringPress
                        className={`cmp-act cmp-more${more ? " on" : ""}`}
                        onClick={() => {
                          setMore((m) => !m);
                          setTagOpen(false);
                        }}
                        aria-label="More options"
                        aria-expanded={more}
                        {...({ type: "button" } as object)}
                      >
                        <motion.span
                          animate={{ rotate: more ? 45 : 0 }}
                          transition={SPRINGS.snappy}
                          style={{ display: "inline-grid", placeItems: "center" }}
                        >
                          <Plus size={17} strokeWidth={2.4} />
                        </motion.span>
                      </SpringPress>

                      <AnimatePresence>
                        {more && (
                          <motion.div
                            className="cmp-pop cmp-morepop"
                            initial={{ opacity: 0, y: 6, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.97 }}
                            transition={SPRINGS.snappy}
                          >
                            <button
                              type="button"
                              className={`cmp-pop-item${pollOn ? " on" : ""}`}
                              onClick={() => {
                                setPollOn((p) => !p);
                                setMore(false);
                              }}
                            >
                              <BarChart3 size={16} strokeWidth={2.2} />
                              <span>Poll</span>
                            </button>
                            <button
                              type="button"
                              className={`cmp-pop-item${letterOn ? " on" : ""}`}
                              onClick={() => {
                                setLetterOn((l) => !l);
                                setMore(false);
                              }}
                            >
                              <PenLine size={16} strokeWidth={2.2} />
                              <span>Write as a Letter</span>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="cmp-foot-r">
                    <button className="cmp-cancel" type="button" onClick={() => { reset(); collapse(); }}>
                      Cancel
                    </button>
                    {/* confident lab-pill Post button; springs alive on first text */}
                    <motion.button
                      type="button"
                      className="cmp-post"
                      onClick={post}
                      disabled={empty}
                      animate={{ scale: empty ? 0.97 : 1, opacity: empty ? 0.55 : 1 }}
                      whileHover={empty ? undefined : { scale: 1.03 }}
                      whileTap={empty ? undefined : { scale: 0.94 }}
                      transition={SPRINGS.snappy}
                    >
                      Post
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </div>

        <p className="cmp-hint">
          Tip: type to wake the Post button, select text and hit B / I / U / S, open the plus for a poll, then click the warm backdrop to retract.
        </p>
      </div>
    </DemoCard>
  );
}

const CSS = `
/* stage: a warm backdrop so the outside-click target is obvious */
.cmp-stage { width:100%; padding:30px 22px 34px; display:flex; flex-direction:column; align-items:center; gap:14px;
  background:
    radial-gradient(120% 90% at 50% 0%, color-mix(in srgb, var(--primary) 6%, transparent), transparent 60%),
    var(--surface-2); }
.cmp-wrap { width:100%; max-width:600px; }

.cmp-row { display:flex; gap:13px; align-items:flex-start; background:var(--surface); border:1px solid var(--border);
  border-radius:var(--r-card); padding:13px 15px; box-shadow:0 1px 2px rgba(0,0,0,.04), 0 22px 44px -34px rgba(0,0,0,.5); }

/* resting pill */
.cmp-pill { flex:1; display:flex; align-items:center; height:44px; padding:0 17px; border-radius:999px;
  background:var(--surface-2); border:1px solid var(--border); color:var(--ink-soft); font-size:14.5px; cursor:text;
  user-select:none; }
.cmp-pill:hover { color:var(--ink); }

.cmp-open { flex:1; display:flex; flex-direction:column; min-width:0; }

/* the field + its clean focus ring overlay */
.cmp-field { position:relative; }
.cmp-editor { width:100%; min-height:88px; border-radius:var(--r-input); border:1px solid var(--border);
  background:var(--surface); padding:12px 14px; color:var(--ink); font:inherit; font-size:14.5px; line-height:1.6;
  outline:none; white-space:pre-wrap; word-break:break-word; }
.cmp-editor[data-empty="true"]::before { content:attr(data-placeholder); color:color-mix(in srgb, var(--ink-soft) 78%, transparent);
  pointer-events:none; }
.cmp-editor u { text-underline-offset:2px; }
/* the ring is an overlay element; only its opacity/transform animate, so there
   is never a stray second box behind the field and no double-click needed */
.cmp-ring { position:absolute; inset:0; border-radius:var(--r-input); pointer-events:none;
  box-shadow:0 0 0 3px color-mix(in srgb, var(--primary) 26%, transparent);
  border:1px solid color-mix(in srgb, var(--primary) 55%, var(--border));
  opacity:0; transform:scale(.992); transform-origin:center;
  transition:opacity 160ms var(--ease-spring), transform 160ms var(--ease-spring); }
.cmp-editor:focus ~ .cmp-ring { opacity:1; transform:scale(1); }

/* inline formatting toolbar */
.cmp-toolbar { display:flex; align-items:center; gap:10px; margin-top:11px; flex-wrap:wrap; }
.cmp-fmt { display:flex; gap:3px; background:var(--surface-2); border:1px solid var(--border); border-radius:11px; padding:3px; }
.cmp-fmt-btn { display:inline-grid; place-items:center; width:30px; height:30px; border:0; background:transparent; cursor:pointer;
  color:var(--ink-soft); border-radius:8px; }
.cmp-fmt-btn:hover { color:var(--ink); background:color-mix(in srgb, var(--ink) 6%, transparent); }
.cmp-fmt-btn.on { color:var(--primary-ink); background:var(--primary); }
.cmp-fmt-rule { width:1px; height:22px; background:var(--border); }

/* tag zone: zero footprint when empty (only the small trigger shows) */
.cmp-tagzone { position:relative; display:flex; align-items:center; }
.cmp-tag-trigger-wrap { position:relative; }
.cmp-tag-trigger { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 11px; border-radius:999px;
  border:1px dashed color-mix(in srgb, var(--ink-soft) 45%, var(--border)); background:transparent; color:var(--ink-soft);
  font:inherit; font-size:12.5px; font-weight:600; cursor:pointer; }
.cmp-tag-trigger:hover, .cmp-tag-trigger.on { color:var(--primary);
  border-color:color-mix(in srgb, var(--primary) 50%, var(--border)); }
.cmp-tag-set { display:inline-flex; align-items:center; gap:6px; height:30px; padding:0 6px 0 11px; border-radius:999px;
  background:color-mix(in srgb, var(--primary) 12%, var(--surface)); color:var(--primary); font-size:12.5px; font-weight:700;
  border:1px solid color-mix(in srgb, var(--primary) 36%, var(--border)); }
.cmp-tag-x { display:inline-grid; place-items:center; width:18px; height:18px; border:0; background:transparent; cursor:pointer;
  color:var(--primary); border-radius:50%; }
.cmp-tag-x:hover { background:color-mix(in srgb, var(--primary) 18%, transparent); }

/* popovers (tag + more) */
.cmp-pop { position:absolute; z-index:30; background:var(--surface); border:1px solid var(--border); border-radius:14px;
  box-shadow:0 6px 14px -8px rgba(0,0,0,.18), 0 26px 50px -30px rgba(0,0,0,.55); padding:8px; transform-origin:top left; }
.cmp-tagpop { top:36px; left:0; width:212px; display:flex; flex-direction:column; gap:8px; }
.cmp-pop-presets { display:flex; flex-wrap:wrap; gap:6px; }
.cmp-pop-preset { border:1px solid var(--border); background:var(--surface-2); color:var(--ink); font:inherit; font-size:12.5px;
  font-weight:600; padding:6px 11px; border-radius:999px; cursor:pointer; }
.cmp-pop-preset:hover { border-color:color-mix(in srgb, var(--primary) 45%, var(--border)); color:var(--primary); }
.cmp-pop-form { display:flex; gap:6px; }
.cmp-pop-input { flex:1; min-width:0; height:32px; border-radius:9px; border:1px solid var(--border); background:var(--surface-2);
  padding:0 10px; color:var(--ink); font:inherit; font-size:12.5px; outline:none; }
.cmp-pop-input:focus { border-color:color-mix(in srgb, var(--primary) 50%, var(--border)); }
.cmp-pop-add { display:inline-grid; place-items:center; width:32px; height:32px; border:0; border-radius:9px; cursor:pointer;
  background:var(--primary); color:var(--primary-ink); }

.cmp-morepop { bottom:42px; left:0; width:194px; display:flex; flex-direction:column; gap:2px; transform-origin:bottom left; }
.cmp-pop-item { display:flex; align-items:center; gap:10px; width:100%; border:0; background:transparent; cursor:pointer;
  font:inherit; font-size:13px; font-weight:600; color:var(--ink); padding:9px 10px; border-radius:9px; text-align:left; }
.cmp-pop-item:hover { background:var(--surface-2); }
.cmp-pop-item.on { color:var(--primary); background:color-mix(in srgb, var(--primary) 10%, transparent); }
.cmp-pop-item svg { color:var(--ink-soft); }
.cmp-pop-item.on svg { color:var(--primary); }

/* selected attachments shown as quiet inline notes */
.cmp-attachments { display:flex; flex-wrap:wrap; gap:7px; margin-top:11px; }
.cmp-att { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; color:var(--ink-soft);
  background:var(--surface-2); border:1px solid var(--border); border-radius:999px; padding:5px 7px 5px 11px; }
.cmp-att svg:first-child { color:var(--cinnamon); }
.cmp-att button { display:inline-grid; place-items:center; width:18px; height:18px; border:0; background:transparent; cursor:pointer;
  color:var(--ink-soft); border-radius:50%; }
.cmp-att button:hover { background:color-mix(in srgb, var(--ink) 8%, transparent); color:var(--ink); }

/* footer */
.cmp-foot { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:14px; }
.cmp-foot-l { display:flex; align-items:center; gap:6px; }
.cmp-act { display:inline-grid; place-items:center; width:36px; height:36px; border:0; border-radius:11px; cursor:pointer;
  background:transparent; color:var(--ink-soft); }
.cmp-act:hover { background:var(--surface-2); color:var(--ink); }
.cmp-act.on { color:var(--cinnamon); background:color-mix(in srgb, var(--cinnamon) 12%, transparent); }
.cmp-more-wrap { position:relative; }
.cmp-more.on { color:var(--primary); background:color-mix(in srgb, var(--primary) 12%, transparent); }

.cmp-foot-r { display:flex; align-items:center; gap:9px; }
.cmp-cancel { border:0; background:transparent; cursor:pointer; font:inherit; font-size:13.5px; font-weight:600;
  color:var(--ink-soft); padding:9px 12px; border-radius:999px; }
.cmp-cancel:hover { color:var(--ink); background:var(--surface-2); }

/* confident lab-pill Post button */
.cmp-post { border:0; cursor:pointer; font:inherit; font-size:14px; font-weight:700; color:var(--primary-ink);
  background:var(--primary); height:40px; padding:0 22px; border-radius:999px;
  box-shadow:0 6px 16px -11px var(--primary), inset 0 1px 0 color-mix(in srgb, #fff 22%, transparent); }
.cmp-post:disabled { cursor:default; box-shadow:none; }
.cmp-post:not(:disabled):focus-visible { outline:2px solid color-mix(in srgb, var(--primary) 60%, transparent); outline-offset:2px; }

.cmp-hint { font-size:12px; color:var(--ink-soft); text-align:center; max-width:560px; line-height:1.5; margin:0; }

@media (max-width:640px){
  .cmp-stage { padding:22px 14px 26px; }
  .cmp-toolbar { gap:8px; }
}
`;
