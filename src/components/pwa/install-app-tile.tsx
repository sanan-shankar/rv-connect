"use client";

/* ------------------------------------------------------------------ *
 *  "Add it to your phone", under the dark mode tile.
 *
 *  Owner, 2026-08-22, on where this goes: "I don't really want it for
 *  desktop. I want it to show on people's phones. for now only show it
 *  for admins and under dark mode is good."
 *
 *  So the admin gate is in the PAGE, not here (profile/[id]/page.tsx
 *  decides whether this is rendered at all), and this file's job is the
 *  other half: never appear on a desktop, and never appear to somebody
 *  who is already using the installed app.
 *
 *  Three roads in:
 *
 *    Android, and any Chromium browser: a real one-press install. The
 *    browser hands over a `beforeinstallprompt` event, we hold it (see
 *    install-prompt.tsx) and fire it from the button.
 *
 *    iPhone and iPad: there is no such event and no way to ask for one.
 *    Apple does not expose it, to anybody, at all. The ceiling on iOS is
 *    telling somebody where the button already is, so that is what this
 *    does rather than pretending at a control that cannot exist.
 *
 *    Samsung Internet: the event fires and the install then FAILS. Android
 *    installs a web app as a real package, built on the browser vendor's
 *    own minting server -- and Samsung's is stamping a targetSdkVersion
 *    below 34, which Android 14 and up refuse to sideload. So our own
 *    Install button hands the member a red Play Protect "Unsafe app
 *    blocked" sheet (owner, 2026-09-07, on a Galaxy). Nothing in
 *    src/app/manifest.ts changes that; we do not build the package.
 *    Samsung is therefore sent to Chrome, whose minting server is current.
 *    Revisit if Samsung ships a fix -- deleting isSamsung is the whole undo.
 * ------------------------------------------------------------------ */

import { useState, useSyncExternalStore } from "react";
import { Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/components/pwa/install-prompt";

/** What this device can be offered, before we know whether Chrome has spoken. */
type Device = "unknown" | "hidden" | "ios" | "samsung" | "chromium";

/**
 * iOS, including an iPad that reports itself as a Mac.
 *
 * There is no honest feature test for "Apple will not give me an install
 * event", because the absence of the event looks identical to a Chrome that
 * has not reached its engagement threshold yet. This is the one place a
 * user-agent sniff is the correct tool: the question really is which vendor
 * is running the browser.
 */
function isApple() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/**
 * Samsung Internet, whose install is broken end to end (see the header).
 * Chromium underneath, so `beforeinstallprompt` fires happily and everything
 * looks right up until Android refuses the package -- which is exactly why
 * this cannot be a feature test. `SamsungBrowser/` has been in their user
 * agent since the browser existed.
 */
function isSamsung() {
  return /SamsungBrowser\//.test(navigator.userAgent);
}

/** Already running as an app: iOS answers on navigator, everyone else on CSS. */
function isInstalled() {
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || legacy === true;
}

/**
 * The device question, answered on the client and only on the client.
 *
 * Through useSyncExternalStore rather than an effect that sets state: this is
 * a fact about the browser being read, not a change being reacted to, and the
 * server has to be able to say "I do not know yet" without rendering a tile
 * it will have to swap out on hydrate. The subscription is not ceremony
 * either -- display-mode flips the moment the member installs from our own
 * button, and this is what makes the tile take itself away when they do.
 */
function subscribeToDisplayMode(onChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function readDevice(): Device {
  if (isInstalled()) return "hidden";
  /* A phone, not a small window. `sm:hidden` alone would show this to anybody
     who narrowed their desktop browser, which is exactly the thing the owner
     asked it not to do; a coarse pointer is the honest question ("is this
     being touched?") and the class on the tile is the belt to its braces. A
     touchscreen laptop is coarse-pointered AND wide, so it needs both. */
  if (!window.matchMedia("(pointer: coarse)").matches) return "hidden";
  if (isApple()) return "ios";
  return isSamsung() ? "samsung" : "chromium";
}

export function InstallAppTile() {
  const { ready, install } = useInstallPrompt();
  const device = useSyncExternalStore(subscribeToDisplayMode, readDevice, () => "unknown" as const);
  const [busy, setBusy] = useState(false);

  if (device === "unknown" || device === "hidden") return null;

  /* Chromium with an event in hand gets the button; Chromium without one gets
     told where its own menu is, since the event may simply not have fired yet
     (thirty seconds and a tap) and an Install button that does nothing would
     be worse than a sentence. */
  const road =
    device === "ios" ? "ios" : device === "samsung" ? "samsung" : ready ? "prompt" : "menu";

  return (
    /* Byte-for-byte the dark mode tile's surface above it, because it is the
       same kind of thing: a setting for THIS device rather than a fact about
       you. No sm: variants on the layout, unlike that tile, since this one
       never sees a screen wide enough to use them. */
    <div
      className="mt-3 flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-card px-[var(--space-m)] py-3.5 sm:hidden"
      style={{
        boxShadow: "0 1px 2px rgba(35,36,30,0.04), 0 10px 24px -20px rgba(35,36,30,0.5)",
      }}
    >
      <div>
        <p className="text-[13.5px] font-medium text-foreground">Add it to your phone</p>
        <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
          {road === "ios"
            ? "Rishi Valley opens like an app, without the browser bar."
            : road === "samsung"
              ? "Samsung's browser adds it in a way Android now blocks. Chrome doesn't, so this opens it there. Add it from Chrome's menu."
              : road === "prompt"
                ? "One press and it sits with your other apps, opening without the browser bar."
                : "Your browser can add it from its own menu. It then opens like an app, without the browser bar."}
        </p>
      </div>

      {road === "ios" ? (
        /* Not a button. There is nothing to press here that would do
           anything, and a control that only reads out instructions is a
           control that lies about being one. The two glyphs are the two
           things to look for, in the order they are tapped. */
        /* Running text with two nowrap groups, not a flex row of five items.
           As a flex row it broke between the second glyph and the words it
           labels, stranding a lone square bracket at the end of one line and
           "Add to Home Screen" at the start of the next. A glyph standing in
           for a word wraps WITH that word or the sentence stops being one.
           `align-[-0.2em]` sits each one on the text baseline rather than the
           line box, which is what keeps the row from growing 2px. */
        <p className="text-[12.5px] font-medium leading-relaxed text-foreground">
          <span className="whitespace-nowrap">
            Tap{" "}
            <Share
              className="inline-block h-4 w-4 align-[-0.2em] text-canopy"
              aria-label="the share button"
            />
          </span>{" "}
          at the bottom of the screen, then{" "}
          <span className="whitespace-nowrap">
            <SquarePlus className="inline-block h-4 w-4 align-[-0.2em] text-canopy" aria-hidden />{" "}
            Add to Home Screen.
          </span>
        </p>
      ) : road === "samsung" ? (
        /* An Android intent URL, the one way a page can hand its own address
           to a named app. Every Chromium browser honours it and Samsung
           Internet is one. `S.browser_fallback_url` covers the phone with no
           Chrome on it: the Play Store listing, since "get Chrome" is the
           honest answer to that case rather than reopening where we already
           are. Built from `location` at click time so it is right on the
           demo, on localhost and in production without knowing which. */
        <Button
          variant="primary"
          size="sm"
          className="w-fit rounded-full"
          onClick={() => {
            const here = new URL(window.location.href);
            const fallback = encodeURIComponent(
              "https://play.google.com/store/apps/details?id=com.android.chrome",
            );
            window.location.href =
              `intent://${here.host}${here.pathname}#Intent;` +
              `scheme=${here.protocol.replace(":", "")};package=com.android.chrome;` +
              `S.browser_fallback_url=${fallback};end`;
          }}
        >
          Open in Chrome
        </Button>
      ) : road === "prompt" ? (
        <Button
          variant="primary"
          size="sm"
          /* `w-fit`, not `w-full`. A full-bleed canopy bar is the loudest
             thing on the screen, and it sat 12px under the dark mode tile's
             content-width pill, so two sibling tiles doing the same kind of
             job wore two different shapes. Canopy fill rather than that
             tile's outline is the one difference kept, because this is
             something to do and dark mode is something to be warned about. */
          className="w-fit rounded-full"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const outcome = await install();
            setBusy(false);
            /* Only the failure speaks. An accepted install is followed by the
               app opening, which says it better than a toast could, and a
               dismissal was a decision the member just made on purpose. */
            if (outcome === "unavailable") {
              toast.error("Your browser did not offer the install just now. Try again in a moment.");
            }
          }}
        >
          Install
        </Button>
      ) : null}
    </div>
  );
}
