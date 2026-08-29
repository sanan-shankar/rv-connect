/**
 * The menu material (docs/spec/DESIGN-SYSTEM.md, "Menus & dropdowns: one
 * material", 2026-07-30): every dropdown, select, combobox and facet panel in
 * the app is the SAME floating object. The panel's class string lives here and
 * is imported by ui/dropdown-menu, ui/select, ui/combobox and the facet kit
 * (src/components/common/filters/pill-shell.tsx), so a page can change a
 * menu's surface only by changing the material itself.
 *
 * The numbers, each argued once so no popup re-derives them:
 * - Panel radius is `--radius-md` (12px), NOT `rounded-2xl`: the Tailwind
 *   scale in globals.css computes 2xl to 27.2px, whose corner arc reached to
 *   within ~1.4px of an item highlight and visibly cut scrolled rows (the
 *   Directory dropdown bug the owner named).
 * - Inner padding is 4px (`p-1`), owned by each popup rather than this string
 *   because scrollable popups (ui/select) carry it on their inner List so
 *   scroll arrows can sit flush with the panel edge.
 * - Rows inside are `--radius-sm` (8.8px): concentric with the panel
 *   (12px panel - 4px padding), one rung down the radius ladder, so a
 *   highlight can never read as cutting its panel.
 * - Hairline is the warm `--border`, matching every other hairline in the
 *   app (the old `ring-foreground/10` was the one cool grey line on a warm
 *   palette).
 * - The shadow is the layered ink register already used by the elevated
 *   cards; never a flat shadow-md.
 * - Motion is ONE origin animation for every menu: scale/fade from the
 *   trigger corner (`--transform-origin`) on `ease-pop`, 140ms in. The exit
 *   runs faster (110ms, plain ease-out) so a dismissed menu clears before
 *   the eye moves to what was behind it. No slide-in variants anywhere: a
 *   menu that slides on one page and pops on another is exactly the
 *   inconsistency the material exists to kill.
 */
/* The overflow trigger's TOUCH target. A "..." trigger is drawn small on
   purpose (16px glyph, snug padding) and that is fine for a cursor -- WCAG's
   fine-pointer floor is 24px. A thumb is another matter: Apple's default is
   44pt, and Primer is the one system that writes the split down (24 fine /
   44 coarse). This ::after box silently widens the hit area to 44px on
   coarse pointers only, changing nothing anyone can see. ::after, not
   ::before -- the state-layer utility already owns ::before on these
   triggers. Worn by every DropdownMenuTrigger that draws itself as a bare
   glyph; the comments trigger measured 22px before this existed. */
export const MENU_TRIGGER_HIT =
  "relative after:absolute after:left-1/2 after:top-1/2 after:size-11 after:-translate-x-1/2 after:-translate-y-1/2 after:content-[''] [@media(hover:hover)_and_(pointer:fine)]:after:hidden";

export const MENU_PANEL_CLASS =
  "origin-(--transform-origin) rounded-[var(--radius-md)] border border-border bg-popover text-popover-foreground shadow-[0_18px_38px_-16px_rgba(35,36,30,0.28)] outline-none transition-[opacity,transform,scale] duration-[140ms] ease-pop data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 data-ending-style:duration-[110ms] data-ending-style:ease-out";
