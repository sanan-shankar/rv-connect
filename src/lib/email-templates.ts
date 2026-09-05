import { CANONICAL_ORIGIN } from "./origin.ts";

/* ------------------------------------------------------------------ *
 *  The look of an email from Rishi Valley.
 *
 *  An inbox is the one surface where none of the app's design system
 *  travels: no Tailwind, no tokens, no webfonts, no SVG. Gmail strips
 *  <style> blocks in some clients and <svg> in all of them, Outlook
 *  renders through Word, and roughly nobody honours flexbox. So this file
 *  rebuilds the brand from the parts that do survive: a table, inline
 *  styles, hex values copied from globals.css, and Georgia standing in
 *  for Libre Baskerville (the nearest serif present on essentially every
 *  machine, and the same substitution the type ladder falls back to).
 *
 *  The rules that carry over from the app: warm paper and never pure
 *  white, one Canopy pill for the one action, no em dashes in the copy.
 *
 *  Restraint is the whole design here (owner, 2026-08-12), but restraint
 *  is not the same as blankness. The character that survives is carried
 *  by four things and no more: the mark, the serif, the warm paper, and
 *  a first line written by a person. Everything that was decoration
 *  rather than one of those is gone.
 * ------------------------------------------------------------------ */

/** Copied from globals.css. Duplicated on purpose: an email cannot read a
 *  CSS custom property, and a hex typed inline is the only thing that ships.
 *
 *  Five values, down from eight. The page/card pair, the mist well and the
 *  cinnamon rule all went with the layout they belonged to (see `shell`). */
const C = {
  paper: "#F5F2EA",
  ink: "#23241E",
  muted: "#5F6359",
  canopy: "#235C49",
  border: "#DFD8CB",
} as const;

/** The app mark, as a PNG on the production domain. Hard-coded to the
 *  canonical origin rather than built from `appUrl()`: the file is identical in
 *  every environment, and a localhost src would render as a broken image in a
 *  real person's inbox. Regenerate with `node scripts/dev/email-mark.mjs` if
 *  src/app/icon.svg ever changes. */
const MARK_SRC = `${CANONICAL_ORIGIN}/images/email/mark.png`;

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * The shell every message sits in.
 *
 * `preheader` is the line an inbox shows next to the subject in the message
 * list. Left unset, clients scrape it from the first visible text, which here
 * would be the word "Rishi Valley" from the masthead, so every message would
 * preview identically. It is hidden in the body by the usual zero-size trick,
 * padded with a run of zero-width spaces so no leftover body text gets pulled
 * in after it.
 */
function shell(opts: {
  preheader: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  /** The small print under the rule: what the link does and when it dies. */
  footnote: string;
}): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<!-- Opt out of client-side dark-mode inversion. Left on, Gmail and Outlook
     recolour the warm neutrals into a muddy grey-green and the Canopy pill
     loses its contrast against its own label. -->
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.paper};">
<div style="display:none;font-size:1px;color:${C.paper};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(
    opts.preheader,
  )}${"&#8203;".repeat(60)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.paper};">
  <tr>
    <td align="center" style="padding:40px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:480px;">

        <!-- ONE surface, left aligned, in one column.
             The previous version was a warm page holding a bordered card
             holding a recessed well, plus a centred masthead with a cinnamon
             rule over it and a tagline under it: five background regions and
             three dividers to carry two sentences and a button (owner,
             2026-08-12: "so many elements no cohesion ... so many boxes
             background divisions elements"). Everything now sits directly on
             the paper. The only rule in the message is the one above the small
             print, which is the only place a division means anything.

             What is left of the brand is deliberate and quiet: the warm paper,
             the serif, and the Canopy button. A typographic wordmark rather
             than the PeaksMark, because Gmail deletes SVG outright and an
             image logo would be a hole at the top of every message. -->
        <!-- The mark and the name, as one lockup. A PNG rasterised from
             src/app/icon.svg (scripts/dev/email-mark.mjs), because Gmail
             deletes SVG outright; 88px for a 44px slot so it stays crisp on a
             phone. Always the production URL, never appUrl(): the asset is
             identical everywhere, and a localhost src in a real inbox is a
             broken image.

             Images are blocked by default in a lot of clients, so the name
             beside it carries the message on its own and the alt text is
             empty rather than a duplicate of the words next to it. -->
        <tr>
          <td style="padding:0 0 30px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:0 11px 0 0;" valign="middle">
                  <!-- No border-radius: icon.svg already carries its own
                       rounded tile (rx 96 on a 512 box), so the corners are
                       baked into the PNG. Outlook drops the property on an
                       image anyway, which would have made the two disagree. -->
                  <img src="${MARK_SRC}" width="44" height="44" alt="" style="display:block;width:44px;height:44px;border:0;">
                </td>
                <td valign="middle" style="font-family:${SERIF};font-size:18px;letter-spacing:0.01em;color:${C.canopy};white-space:nowrap;">
                  Rishi Valley
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 12px 0;font-family:${SERIF};font-size:22px;line-height:1.3;color:${C.ink};">
            ${escapeHtml(opts.heading)}
          </td>
        </tr>

        <tr>
          <td style="font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink};">
            ${opts.body}
          </td>
        </tr>

        <tr>
          <td style="padding:28px 0 0 0;">
            <!-- A table cell rather than a padded anchor: Outlook's Word
                 renderer drops padding on an inline-block anchor and the
                 button collapses to bare underlined text. display:block plus
                 text-align makes the label sit centred in the pill however the
                 client decides to size it.
                 (No backticks in this comment: it lives inside a JS template
                 literal, and one would close it.) -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td bgcolor="${C.canopy}" style="border-radius:999px;">
                  <a href="${opts.ctaHref}" style="display:block;padding:12px 26px;font-family:${SANS};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;text-align:center;">${escapeHtml(
                    opts.ctaLabel,
                  )}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- The same link as plain text, on the paper rather than in a tinted
             well. Not redundancy: plenty of people here read mail on old
             clients or with styles off, where the pill above renders as
             nothing at all, and something they can copy is what keeps that
             person from being stuck. -->
        <tr>
          <td style="padding:24px 0 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">
            Or paste this link into your browser:<br>
            <a href="${opts.ctaHref}" style="color:${C.canopy};text-decoration:underline;word-break:break-all;">${escapeHtml(
              opts.ctaHref,
            )}</a>
          </td>
        </tr>

        <tr>
          <td style="padding:26px 0 0 0;">
            <div style="height:1px;background-color:${C.border};font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="padding:16px 0 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">
            ${opts.footnote}
          </td>
        </tr>

        <!-- Who sent this, as a fact rather than a slogan. The line that used
             to sit here ("a place for the people who grew up under the same
             trees") was the owner's "cringe tagline": a mission statement at
             the foot of a password reset. A named sender and a domain is what
             a person actually scans for when deciding whether an email is
             real, and it is what every serious sender puts here. -->
        <tr>
          <td style="padding:22px 0 0 0;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};">
            <a href="${CANONICAL_ORIGIN}" style="color:${C.muted};text-decoration:none;">rishivalley.space</a>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/** A person's first name, or a warm fallback when the row has something odd in it. */
function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || "there";
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

/**
 * "Confirm your email", sent once at signup and again whenever someone asks.
 *
 * The copy leads with what confirming BUYS them (their batch can reach them,
 * they can post) rather than with what we need from them. Somebody who has not
 * thought about this school since 1994 is not going to confirm an address to
 * satisfy our database.
 */
export function verifyEmailTemplate(opts: {
  name: string;
  url: string;
  hours: number;
}): BuiltEmail {
  const first = firstNameOf(opts.name);
  return {
    subject: "Confirm your email for Rishi Valley",
    html: shell({
      preheader: "Confirm your address to start posting.",
      // No full stop: the other two headings do not take one either, and a
      // heading is a label rather than a sentence.
      heading: `Welcome, ${first}`,
      body: `<p style="margin:0;">You're in. Confirm your email and you can post, upload photos and see how to reach people.</p>`,
      ctaLabel: "Confirm my email",
      ctaHref: opts.url,
      footnote: `This link expires in ${opts.hours} hours. If you did not sign up at Rishi Valley, ignore this email.`,
    }),
    text: [
      `Welcome, ${first}`,
      "",
      "You're in. Confirm your email and you can post, upload photos and see how to reach people.",
      "",
      opts.url,
      "",
      `This link expires in ${opts.hours} hours. If you did not sign up at Rishi Valley, ignore this email.`,
    ].join("\n"),
  };
}

/**
 * "Reset your password".
 *
 * Names the address the reset was asked for, so a person who gets this out of
 * the blue can see whether it was even their account, and says plainly that
 * ignoring it changes nothing. That last sentence is the one that stops a
 * worried recipient from clicking a link they did not ask for just to find out
 * what it does.
 */
export function resetPasswordTemplate(opts: {
  name: string;
  email: string;
  url: string;
  minutes: number;
}): BuiltEmail {
  const first = firstNameOf(opts.name);
  return {
    subject: "Reset your Rishi Valley password",
    html: shell({
      preheader: "Your password reset link, good for one hour.",
      heading: "Reset your password",
      body: `<p style="margin:0;">Hello ${escapeHtml(
        first,
      )}. Set a new password for <strong style="color:${C.ink};">${escapeHtml(
        opts.email,
      )}</strong> below. You will be signed in straight after.</p>`,
      ctaLabel: "Set a new password",
      ctaHref: opts.url,
      footnote: `This link expires in ${opts.minutes} minutes and works once. If you did not ask for it, ignore this email. Your password will not change.`,
    }),
    text: [
      "Reset your password",
      "",
      `Hello ${first}. Set a new password for ${opts.email} here. You will be signed in straight after.`,
      "",
      opts.url,
      "",
      `This link expires in ${opts.minutes} minutes and works once. If you did not ask for it, ignore this email. Your password will not change.`,
    ].join("\n"),
  };
}

/**
 * Sent after a password actually changes, to the address it changed on.
 *
 * The one message here with no button. It exists so that a takeover is not
 * silent: if somebody else resets your password, this is the mail that tells
 * you while you can still do something about it. It deliberately does not
 * carry a "this wasn't me" link, because such a link is itself a credential
 * sitting in an inbox that may already be compromised; it points at a human
 * instead.
 */
export function passwordChangedTemplate(opts: { name: string }): BuiltEmail {
  const first = firstNameOf(opts.name);
  const reach = `${CANONICAL_ORIGIN}/messages`;
  return {
    subject: "Your Rishi Valley password was changed",
    html: shell({
      preheader: "Your Rishi Valley password was just changed.",
      heading: "Your password was changed",
      body: `<p style="margin:0;">Hello ${escapeHtml(
        first,
      )}. The password on your Rishi Valley account was just changed. If that was you, there is nothing to do.</p>`,
      ctaLabel: "This wasn't me",
      ctaHref: reach,
      footnote:
        "If it was not you, someone has your old password or access to this inbox. Tell us and we will lock the account.",
    }),
    text: [
      "Your password was changed",
      "",
      `Hello ${first}. The password on your Rishi Valley account was just changed. If that was you, there is nothing to do.`,
      "",
      "If it was not you, someone has your old password or access to this inbox. Tell us and we will lock the account:",
      reach,
    ].join("\n"),
  };
}

/**
 * Sent when a member asks for their account to be deleted (audit M35).
 *
 * Two jobs. It confirms the request in writing, with the date the deletion
 * becomes final. And, like the password-changed notice, it is the takeover
 * alarm: if somebody ELSE requested it, this is the mail that says so while
 * the grace period still leaves 60 days to undo it — by simply signing in,
 * which is deliberately something only the account's real owner can do.
 */
export function deletionScheduledTemplate(opts: {
  name: string;
  /** Human-readable date the purge becomes final, e.g. "19 October 2026". */
  purgeDate: string;
}): BuiltEmail {
  const first = firstNameOf(opts.name);
  const when = opts.purgeDate || "60 days from now";
  return {
    subject: "Your Rishi Valley account is scheduled for deletion",
    html: shell({
      preheader: "Your account and everything in it will be deleted.",
      heading: "Your account is scheduled for deletion",
      body: `<p style="margin:0;">Hello ${escapeHtml(
        first,
      )}. You asked for your Rishi Valley account to be deleted. On ${escapeHtml(
        when,
      )} the account, your posts, comments, photos and profile will be permanently removed.</p><p style="margin:12px 0 0;">Changed your mind? Just sign in before then and the deletion is cancelled.</p>`,
      ctaLabel: "Keep my account",
      ctaHref: `${CANONICAL_ORIGIN}/login`,
      footnote:
        "If you did not ask for this, someone else has access to your account. Sign in to cancel the deletion, then change your password.",
    }),
    text: [
      "Your account is scheduled for deletion",
      "",
      `Hello ${first}. You asked for your Rishi Valley account to be deleted. On ${when} the account, your posts, comments, photos and profile will be permanently removed.`,
      "",
      "Changed your mind? Just sign in before then and the deletion is cancelled:",
      `${CANONICAL_ORIGIN}/login`,
      "",
      "If you did not ask for this, someone else has access to your account. Sign in to cancel the deletion, then change your password.",
    ].join("\n"),
  };
}
