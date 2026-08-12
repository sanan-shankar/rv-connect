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
 *  The rules that carry over from the app: warm surfaces and never pure
 *  white, one Canopy pill for the one action, cinnamon as the second
 *  accent, no em dashes in the copy.
 * ------------------------------------------------------------------ */

/** Copied from globals.css. Duplicated on purpose: an email cannot read a
 *  CSS custom property, and a hex typed inline is the only thing that ships. */
const C = {
  page: "#E4E1D5",
  card: "#F5F2EA",
  ink: "#23241E",
  muted: "#5F6359",
  canopy: "#235C49",
  cinnamon: "#C2622F",
  border: "#DFD8CB",
  mist: "#ECE8DD",
} as const;

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
<body style="margin:0;padding:0;background-color:${C.page};">
<div style="display:none;font-size:1px;color:${C.page};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(
    opts.preheader,
  )}${"&#8203;".repeat(60)}</div>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.page};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">

        <!-- Masthead. A typographic lockup, not the PeaksMark: the mark is an
             SVG and Gmail deletes SVG outright, so an image-based logo here
             would be a hole in the top of every message. The cinnamon rule is
             the brand cue that survives. -->
        <tr>
          <td align="center" style="padding:0 0 22px 0;">
            <div style="font-family:${SERIF};font-size:19px;letter-spacing:0.02em;color:${C.canopy};">Rishi Valley</div>
            <div style="width:34px;height:2px;background-color:${C.cinnamon};margin:9px auto 0 auto;font-size:0;line-height:0;">&nbsp;</div>
          </td>
        </tr>

        <tr>
          <td style="background-color:${C.card};border:1px solid ${C.border};border-radius:16px;padding:32px 28px;">
            <h1 style="margin:0 0 14px 0;font-family:${SERIF};font-size:24px;line-height:1.25;font-weight:normal;color:${C.ink};letter-spacing:-0.01em;">${escapeHtml(
              opts.heading,
            )}</h1>
            <div style="font-family:${SANS};font-size:15px;line-height:1.65;color:${C.ink};">${opts.body}</div>

            <!-- The action. A table cell rather than a padded <a>, because
                 Outlook's Word renderer drops padding on inline-block anchors
                 and the button collapses to bare underlined text. The anchor
                 fills the cell so the whole pill is clickable. -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:26px 0 0 0;">
              <tr>
                <td align="center" bgcolor="${C.canopy}" style="border-radius:999px;">
                  <a href="${opts.ctaHref}" style="display:inline-block;padding:13px 30px;font-family:${SANS};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;">${escapeHtml(
                    opts.ctaLabel,
                  )}</a>
                </td>
              </tr>
            </table>

            <!-- The same link as plain text. This is not redundancy: a fair
                 number of alumni here read mail on old clients or with images
                 and styles off, where the pill above renders as nothing at
                 all. Something they can copy is what keeps that person from
                 being stuck. Sits in a recessed well so it reads as reference
                 material rather than a second thing to decide about. -->
            <div style="margin:22px 0 0 0;padding:12px 14px;background-color:${C.mist};border-radius:12px;">
              <div style="font-family:${SANS};font-size:12px;line-height:1.5;color:${C.muted};margin-bottom:5px;">If the button does nothing, copy this into your browser:</div>
              <div style="font-family:${SANS};font-size:12px;line-height:1.5;word-break:break-all;"><a href="${opts.ctaHref}" style="color:${C.canopy};text-decoration:underline;">${escapeHtml(
                opts.ctaHref,
              )}</a></div>
            </div>

            <div style="margin:22px 0 0 0;padding:16px 0 0 0;border-top:1px solid ${C.border};font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">${opts.footnote}</div>
          </td>
        </tr>

        <tr>
          <td align="center" style="padding:20px 8px 0 8px;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.muted};">
            Rishi Valley, a place for the people who grew up under the same trees.
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
      heading: `Welcome, ${first}.`,
      body: `<p style="margin:0;">Confirm your email to post, upload photos and see contact details.</p>`,
      ctaLabel: "Confirm my email",
      ctaHref: opts.url,
      footnote: `This link expires in ${opts.hours} hours. If you did not sign up at Rishi Valley, ignore this email.`,
    }),
    text: [
      `Welcome, ${first}.`,
      "",
      "Confirm your email to post, upload photos and see contact details.",
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
  const reach = "https://rishivalley.space/messages";
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
