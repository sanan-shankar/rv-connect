# Research digest: destructive confirmations and dialog copy

2026-08-29. Distilled from primary-source research (Apple HIG, Material 3, Polaris
[archived], Carbon, Fluent 2, Spectrum, GOV.UK, Atlassian, NN/g — quotes verified against
the live pages, Polaris via Wayback). Companion to `dialog-standards-findings.md`, which
holds the codebase evidence. Two more digests to follow: dialog visual hierarchy, and
menus + focus states.

House rule applied throughout: where systems disagree, take the best of all worlds with
**Apple HIG as the tiebreaker**, and say so out loud when we depart from Apple.

## Where the whole field agrees (no judgment call needed)

1. **Never Yes/No/OK on a destructive confirm.** Unanimous. Button is the verb: "Delete".
   Apple: "a specific button title like 'Erase,' 'Convert,' 'Clear,' or 'Delete' helps
   people understand the action they're taking."
2. **Never "Are you sure?"** Material bans it as ambiguity, NN/g bans it outright, Polaris
   bans it as an opener. Nobody defends it.
3. **Confirm only what is irreversible.** Apple's test is the sharpest: alert only for
   *uncommon* AND *can't-undo*. "Avoid displaying alerts for common, undoable actions,
   even when they're destructive." Undo is the default; confirmation is the carve-out.
   NN/g: ship undo even when you also confirm.
4. **One or two words on the button.** Apple, Fluent and Atlassian all give exactly this
   number. Include the noun only if the bare verb is ambiguous (Fluent's test).
5. **The description may only carry what title + button cannot** — the consequence
   (irreversibility, scope, count). If it has nothing to add, omit it. Apple: "Include
   informative text only if it adds value" and "Avoid explaining alert buttons." Carbon:
   "If the title and the purpose are clear... a description is not needed."
6. **Verb consistency is mandated, prose repetition is forbidden.** The same verb appears
   in title and button (Spectrum requires it); the description must not restate the ask.
   Fluent: "Don't restate the title in the body."
7. **"Cancel" is always the escape**, always literally "Cancel" (Apple: "Always use the
   title 'Cancel'") — except where "Cancel" would be ambiguous about *which* thing it
   cancels, where Polaris's outcome labels apply ("Keep editing", "Stay").
8. **No playfulness in destructive, error, warning or legal moments.** Unanimous across
   every system with a tone section. Playful register is fenced to success/empty/onboarding
   (Apple: empty states "can showcase your app's voice"; Atlassian: the wink belongs to
   "success messages"). Matches the owner's warmth-dial ruling.
9. **Type-to-confirm is for the rarest, most serious acts only** (NN/g; Mailchimp's DELETE
   field; GitHub's four gates). Our ConfirmDialog's own comment already says this: asking
   someone to type where a mis-click is merely inconvenient "is theatre".

## The disagreements, resolved for this app

- **Title form: question vs statement.** Spectrum forbids questions; Polaris mandates them;
  Material/Fluent allow either; Apple allows a sentence fragment or a full sentence.
  **Resolution: statement form, object named: "Delete post", "Delete comment", "Delete
  draft".** Reasons: it mirrors the menu item that opened the dialog (Carbon's rule: title =
  trigger label), it never drifts toward yes/no buttons (Spectrum's argument), and it fits
  Apple's fragment style. This also matches the owner's instinct verbatim: "it's a delete
  post. just say the damn thing as it is."
- **Destructive button primary-styled?** Apple says never ("Don't assign the primary role to
  a button that performs a destructive action, even if that action is the most likely
  choice"); Carbon/Spectrum/GOV.UK say danger-styled, Carbon even focuses it.
  **Resolution: Apple.** Destructive-red button, but NOT the focused default; nothing is
  auto-focused, per Apple: "avoid making any button the default button" when you want the
  alert read. Enter must not delete.
- **Order.** Cancel left, destructive right (trailing). Apple, Material, Carbon, Spectrum
  and Primer all agree; only the Windows legacy differs. Stacked (mobile): confirming action
  on top — Apple + Material agree, Spectrum is the lone dissenter, tiebreaker says top.
- **Case.** Sentence case everywhere, titles and buttons. This is a deliberate departure
  from Apple (who title-case buttons): Apple's rule serves platform-native macOS/iOS chrome,
  ours is a web app whose every existing button is already sentence case, and Carbon's
  written argument against title case (subjective "importance", slower reading) is the
  better fit. Departure noted per the house rule.
- **Consequence line.** "This can't be undone." is Polaris's approved string — but GOV.UK
  warns negative contractions ("can't") get misread as their opposite. Use the uncontracted
  form: **"This cannot be undone."** — one line, only on genuinely irreversible acts, never
  on soft-deletes (Carbon: if recovery exists, the act is "Move to trash", not "Delete",
  and the warning line is a lie).

## The reference dialog this produces

The delete-post dialog (the owner asked for one "as a testament to the research"):

> **Delete post**
> This cannot be undone.
> [Cancel] [Delete]

Title = the menu item that opened it. Description = only the consequence. Button = bare
verb (noun already in the title). Nothing focused by default. Cancel left, Delete right,
red, not primary. Warmth: none — this is a moment the register rules exclude.

Variants: comment → "Delete comment"; letter draft → "Delete draft" with body "This
deletes everything since you last saved." (consequence differs, so the line differs);
catch-up end → keeper-settings copy already states the real consequence ("Past Rounds stay
readable") and just needs the app dialog, not new words.

## Copy rules to fold into DESIGN-SYSTEM.md (draft, pending owner approval)

1. A dialog is title + optional one-line description + actions. The description exists only
   if it changes which button you press (Spectrum's functional test).
2. Sentence case, no terminal punctuation on titles, no exclamation marks anywhere in
   functional UI.
3. Buttons: verb, one or two words, never Yes/No/OK/Done.
4. Warmth budget: one warm line per surface, spent on a title or a success state, never on
   buttons, errors, or anything destructive (owner ruling, 2026-08-29: dial from 7.5/10 to
   ~4.5/10, "don't strip it and make it a corporate app. but use it smartly").
5. Avoid negative contractions in consequence lines (GOV.UK: "can't" gets misread).
6. Don't say "please", don't say "oops", don't blame, don't apologise in titles (Material:
   no "Sorry for the interruption"; Apple: interjections "can sound insincere").
7. Same verb for the same act everywhere (Material: never "Remove photo" in the menu and
   "Delete photo?" in the dialog).
