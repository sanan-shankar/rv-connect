# The site as an app on a phone: research for a later announcement

**Status: parked, 2026-10-30.** The owner first wanted the announcement window
(`docs/spec/announcement.md`) to tell members the site works as an app on a phone, with a button
for Android and steps for iPhone. On seeing the first versions he asked for much more: a different
message for every device, and every Android maker and browser handled, including the extra prompts
some of them raise, because installing differs by phone, by maker, by default browser and by the
browser in use. Late on 2026-10-30 he took the whole phone part out of that window: the app gets
its own announcement and setup guide later, not mixed into the birds.

## What was built and taken out (none of it was committed)

- A row per device in the window: one paragraph and the action this device can take. On laptops
  it showed a QR code for `https://rishivalley.space/app`, made once as a fixed 29 by 29 matrix
  (version 3, error correction M) with uqr's `encode(..., { ecc: "M", border: 0 })`, so no
  library ships.
- A public `/app` page the code opened, showing the same row for whatever phone opens it. If it
  comes back, it belongs in a route group: `scripts/qa/lab-audit.mjs` fails a top-level page that
  is not a lab room, and it keeps its list of exceptions short on purpose. It also needs an entry
  in `publicPaths` in `src/proxy.ts`.
- A shared device helper split out of `install-app-tile.tsx`. The tile is back as it was.

## The owner's wording for the laptop line

"This site also works as an app on your phone! Point your phone's camera at this code to learn
how to add it."

## The research (30 Oct 2026, a research agent, unedited below)

It refers to `phone-row.tsx` and `install-device.ts`, which no longer exist; the install tile
(`src/components/pwa/install-app-tile.tsx`) still holds the old copy and the Chrome hand-off the
notes call `openInChrome()` (inline in its Samsung button there). Rows marked U are unverified and must be checked on a device before any
copy ships.

---


Written under a wrap-up instruction. Rows marked U were not found or not checked, and are left unverified on purpose.

Confidence key:
- **V** = verified from a primary source (vendor doc, WebKit or Chromium source, release notes).
- **R** = reported by dated third-party coverage or several users.
- **I** = inferred, or background knowledge I did not check in this research.
- **U** = unverified.

## 0. Facts that hold for every row

1. **Installability does not depend on a service worker (V).** `public/` has no service worker and nothing in `src/` registers one (grep, this session). Chrome's criteria are HTTPS, a manifest with `name` or `short_name`, `start_url`, 192 and 512 icons, and `display` standalone. The `beforeinstallprompt` event also waits for one tap and 30 seconds on the page (web.dev, last updated 2024-09-19, so it may have changed). `src/app/manifest.ts` meets all of it. https://web.dev/articles/install-criteria
2. **iOS 26 needs no manifest at all (V).** WebKit: "By default, every website added to the Home Screen opens as a web app" and "there are now zero requirements for installability in Safari". https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
3. **Only Chrome and Samsung Internet make a real app on Android.** Chrome needs Google Mobile Services. Samsung Internet does it on Samsung phones only. Firefox, Edge, Opera, Brave and UC were listed as making plain shortcuts. Sources: https://web.dev/learn/pwa/installation (2024-09-20, V) and https://firt.dev/notes/pwa/ (Aug 2023, R). Without Google services, Chrome also falls back to a shortcut.
4. **`beforeinstallprompt` (V, MDN compat data):** Chrome 44+, Samsung Internet 5.0+, and Edge and Opera mirror Chrome. Firefox and Safari: no. It is flagged non-standard. https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BeforeInstallPromptEvent.json
5. **The copy in `phone-row.tsx` is already stale for new Chrome.** It says "Add to home screen". Chrome 150 renamed that item (row AND-2). It also never mentions iOS's "Open as Web App" switch.

## 1. Answers to the nine must-haves, at a glance

| # | Question | Short answer | Confidence |
|---|---|---|---|
| 1 | iOS 26 Safari, iPhone and iPad | iPhone: ••• beside the address bar, "Share", scroll to "Add to Home Screen", leave "Open as Web App" on, "Add". iPad: toggle applies, button path not found. | iPhone R and V (toggle). iPad U. |
| 2 | iOS 16.4 to 18 Safari | Share in the bottom toolbar, "Add to Home Screen", "Add". No toggle on these versions. | I |
| 3 | Chrome, Edge, Firefox on iOS | Chrome: Share (top right), "Add to Home Screen". Firefox: ⋯ menu, "Share", "Add to Home Screen". Edge: nothing found. Whether the result opens as a real app is unverified. | R for Chrome and Firefox, U for Edge |
| 4 | Fresh sign-in on an iOS web app? | No if the member is signed in when adding. Login cookies are copied at "Add to Home Screen"; nothing else is shared. | V for iOS 17.2 and later. Not restated for 26 or 27, no sign of reversal. |
| 5 | Android Chrome | Chrome 150+: ⋮ "More", "Install and create shortcut", "Install". Older: "Add to home screen", "Install app". | V (Chrome Help, Chromium strings) |
| 6 | Samsung Internet | Still broken as of 27 Oct 2026. Send the member to Chrome. | R |
| 7 | Xiaomi, vivo, OPPO permission | Xiaomi: "Home screen shortcuts", label and path unverified on HyperOS. vivo: U. OPPO/realme: "Add new apps to the Home screen". | R (realme), R but old (Xiaomi), U (vivo) |
| 8 | Other Android browsers | See section 3. All of them should be handed to Chrome. | R or U |
| 9 | In-app browsers | WhatsApp opens the default browser on both platforms. Instagram, Facebook, LinkedIn, Gmail: not researched. | R (WhatsApp), U (rest) |

## 2. Decision table

Detection tokens in the "Detect" column are from the repo's `install-device.ts` or my background knowledge. They are I unless a source is named.

### iPhone and iPad

| ID | Case | Detect | What the member does (screen wording) | Prompts met | Fallback | Conf. | Source |
|---|---|---|---|---|---|---|---|
| IOS-1 | iPhone, Safari, iOS 26 and 27 | UA has `iPhone`, `Version/26` or `Version/27`, `Safari/`, and none of `CriOS`, `FxiOS`, `EdgiOS`, `OPiOS` | 1. Tap the ••• button beside the address bar (bottom right in the default layout). 2. Tap "Share". 3. Scroll the list and tap "Add to Home Screen". 4. Leave "Open as Web App" on. 5. Tap "Add" (top right). | None. The name is editable. No trust prompt. | If "Add to Home Screen" is missing, tap "Edit Actions" at the bottom of the list and add it. "View More" appears in no source I found, so do not tell members to look for it. | V: every site is a web app by default, and the toggle exists. R: the ••• then Share then scroll path. I: iOS 27 unchanged (WebKit's Safari 27.0, 27.1, 27.2 posts mention no change to home-screen apps, but they do not document Safari's buttons). | https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ , https://www.macrumors.com/how-to/save-safari-bookmark-web-app-iphone-home-screen/ (20 Aug 2025), https://discussions.apple.com/thread/256238253 (4 Feb 2026), https://www.igeeksblog.com/how-to-add-website-to-home-screen-on-iphone-ipad/ (19 May 2026), https://webkit.org/blog/18325/webkit-features-for-safari-27-0/ |
| IOS-2 | iPad, Safari, iPadOS 26 | iPad UA, or `navigator.platform === "MacIntel"` with `maxTouchPoints > 1` | Probably Share (square with up arrow, in the toolbar) then "Add to Home Screen", "Open as Web App" on, "Add". The button path is not confirmed. | Same sheet as IOS-1 (U) | Test on a device before shipping copy. | V that the toggle and web-app default apply to iPadOS 26. U for the button path. | https://www.macrumors.com/2025/06/18/safari-changes-on-ios-26/ ("This change also applies to iPadOS 26") |
| IOS-3 | iPhone, Safari, iOS 16.4 to 18 | `Version/16`, `Version/17`, `Version/18` | Tap Share (square with up arrow) in the bottom toolbar, scroll, tap "Add to Home Screen", tap "Add". No "Open as Web App" switch before 26. The manifest's `display: standalone` makes it open as an app (manifest support since iOS 11.4). | None | "Edit Actions" if the entry is missing (I) | I for the exact steps. The Apple Support page would not render. V for manifest support since March 2018. | https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ |
| IOS-4 | iPhone, Chrome (`CriOS/`) | `CriOS` | Tap the Share button (top right), "Add to Home Screen", edit the name, "Add". | Same sheet | The same article says the shortcut "will open in Chrome, not Safari", so whether it opens as a bare app is unverified. Safest fallback: copy the link, open it in Safari, use IOS-1. | R for the steps. U for the result. firt.dev: since 16.4 "App can be installed from non-Safari browsers" only "if opted-in by the browser". | https://www.igeeksblog.com/how-to-add-website-to-home-screen-on-iphone-ipad/ , https://firt.dev/notes/pwa-ios/ |
| IOS-5 | iPhone, Firefox (`FxiOS/`) | `FxiOS` | Tap the ⋯ menu in the bottom toolbar, "Share", "Add to Home Screen", "Add". | Same sheet | Safari, as IOS-4 | R for the steps. U for the result. | https://www.igeeksblog.com/how-to-add-website-to-home-screen-on-iphone-ipad/ |
| IOS-6 | iPhone, Edge (`EdgiOS/`) | `EdgiOS` | No source found. | U | Open in Safari | U | none |
| IOS-7 | iPhone, link opened from WhatsApp | No token. The member lands in their real browser, so use IOS-1, 4, 5 or 6. | Nothing extra. "Today, tapping most links in a conversation sends you out to Safari or whichever browser you set as your default." | none | WhatsApp is building an opt-in in-app browser for every link, with a three-dot-menu option to open in the default browser. It is not released. Only some qualifying business links open in-app. | R | https://www.ithinkdiff.com/whatsapp-in-app-browser-iphone-chats/ (20 Oct 2026), https://macrumors.com/2026/10/21/whatsapp-developing-browser-for-chat-links , https://wabetainfo.com/whatsapp-is-testing-an-in-app-browser-for-chats-on-ios/ (19 Oct 2026) |
| IOS-8 | iPhone, other in-app browsers (Instagram, Facebook, LinkedIn, Gmail) | I (not checked): app web views have no `Safari/` and no `Version/` in the UA, plus tokens `Instagram`, `FBAN` or `FBAV`, `LinkedInApp`. A Safari View Controller (Gmail, I) has no token at all and cannot be detected. | Open the page in Safari from the app's own menu. Exact wording per app: U. Adding from a Safari View Controller does work (firt.dev: supported since 17.0). Adding from a plain web view does not. | none | Copy link, paste into Safari | U for tokens and wording. R for the View Controller point. | https://firt.dev/notes/pwa-ios/ |

### Android with Chrome

| ID | Case | Detect | What the member does (screen wording) | Prompts met | Fallback | Conf. | Source |
|---|---|---|---|---|---|---|---|
| AND-1 | Chrome, `beforeinstallprompt` has fired (any maker) | Event received. Needs one tap and 30 seconds on the page, once per page load. | Our button calls `prompt()`. Chrome then shows its own install dialog with the site name and an "Install" button. | The dialog title in Chrome 150 was not verified. | If no event yet, show the menu path (AND-2 or AND-3). | V for the event rules (Sep 2024 doc). U for the Chrome 150 dialog. | https://web.dev/articles/install-criteria |
| AND-2 | Chrome 150 and later, any maker | UA has `Chrome/` and no `EdgA/`, `OPR/`, `SamsungBrowser/`, `; wv)`. Chrome 150 shows in the UA major version. | 1. Tap ⋮ "More" (right of the address bar). 2. Tap "Install and create shortcut". 3. In the sheet, tap "Install". Do not tap "Create shortcut": the sheet itself says "Shortcuts open in Chrome". Progress reads "Installing Rishi Valley..." then "App installed". | The sheet is always shown when both options are allowed (`kAlwaysShowInstallDisambiguationDialog`, on by default). Some launchers then ask "Add" or "Add Automatically", or "Touch and hold" to place it (R). | If the sheet says "This app cannot be installed." the manifest check failed. Failure toasts: "Couldn't install Rishi Valley." "Something went wrong." "Not enough space on device." "Go back to site". | V (Chrome Help, Chromium strings). R for the date: BGR 10 Jul 2026 says Chrome 150 is rolling out and "Add to Home screen" is now "Install and create shortcut". | https://support.google.com/chrome/answer/9658361?hl=en&co=GENIE.Platform%3DAndroid , https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/webapps/browser/android/android_webapps_strings.grd , https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/webapps/browser/features.cc , https://www.bgr.com/2212188/google-chrome-update-adding-back-button-android-phones/ , https://browserhow.com/how-to-add-to-home-screen-shortcut-links-with-chrome-android/ (29 Sep 2026) |
| AND-3 | Chrome 149 and earlier | `Chrome/` with a major version below 150 | Tap ⋮ "More", then "Add to Home screen", then "Install app" (or ⋮ then "Install app" directly on an installable site), then "Install". | As AND-2 | Same | V (Chrome blog, 2024-07-23: "More > Add to Home screen > Install app"). Phones slow to update will keep this wording for months (I). | https://developer.chrome.com/blog/how_chrome_helps_users_install_the_apps_they_value |
| AND-4 | Samsung phone (One UI 7 and 8), Chrome | As AND-2 plus a Samsung device | Same as AND-2 or AND-3. The icon lands in the Samsung Apps screen (app tray), not necessarily the Home screen. Tell members to look there and drag it out. | Samsung's "Add new apps to Home screen" setting is unverified for One UI 7 and 8. | Swipe up for Apps, press and hold the icon, "Add to Home" | R (Progressier, 1 Nov 2024) | https://intercom.help/progressier/en/articles/10071582-installing-a-pwa-on-a-samsung-galaxy-s24 |
| AND-5 | Xiaomi, Redmi, POCO (HyperOS 2 and 3, MIUI 14), Chrome | As AND-2 plus a Xiaomi device (device brand is not in the UA reliably, so ask or show it to all) | Same Chrome steps. If no icon appears: allow the "Home screen shortcuts" permission for Chrome. Probable path: Settings, Apps, Manage apps, Chrome, Other permissions, "Home screen shortcuts", Allow. | Whether Chrome's real-app install is blocked by it, or only the shortcut, is unverified. No "I trust this" prompt is documented for Chrome anywhere I looked. | Look in the app list for the new icon first | R but old (MIUI 9 and 10, xiaomi.eu 2018 to 2019: "permissions > create home shortcuts (or something like that)"). I for the path and label on HyperOS. A Firefox user on HyperOS 2.0.11 reported the home-screen option "did nothing", and the reply pointed at the shortcut permission. No Chrome report on HyperOS found. | https://xiaomi.eu/community/threads/chromes-add-to-home-screen-feature-does-not-work.44616/ , https://mobilepains.com/add-to-home-screen-not-showing-android/ (generic, "Home Screen Shortcuts") |
| AND-6 | vivo, iQOO (Funtouch OS, OriginOS), Chrome | As AND-2 | Same Chrome steps. A permission may exist ("Desktop shortcuts" was seen in one OriginOS guide for another app). Not confirmed. | U | App list | U | none |
| AND-7 | OPPO, realme, OnePlus (ColorOS 15 and 16, Realme UI, OxygenOS 15 and 16), Chrome | As AND-2 | Same Chrome steps. If the icon never shows: Settings, "Home screen and lock screen", "Home screen", switch on "Add new apps to the Home screen" (quick route: press and hold the Home screen, then More or the settings button, "Home screen"). Second fix: Settings, Apps, Default Apps, "Home app", switch launcher and back. | Steps "may look different on your device" | App list | R for Realme UI (Android Police, 27 Oct 2025, written about Chrome shortcuts). I for ColorOS and OxygenOS. | https://www.androidpolice.com/fix-chrome-home-shortcuts/ |
| AND-8 | Pixel, Motorola, Nothing, Chrome | As AND-2 | Same Chrome steps. | The launcher may ask "Add" or "Add Automatically" (or hold to place). | App list | R for Pixel-style. U for Motorola and Nothing. | https://browserhow.com/how-to-add-to-home-screen-shortcut-links-with-chrome-android/ |
| AND-9 | Samsung Internet (`SamsungBrowser/`), any Android | `SamsungBrowser/` | Do not install here. Show a button "Open in Chrome" (the repo's `openInChrome()` intent link), then AND-2. | If the member installs anyway, Play Protect shows "Blocked dangerous app. This app is built for an older version of Android and doesn't include the latest privacy protections." | Manual: copy the address, open Chrome, paste it. Samsung's own "Add page to" then "Home screen" would make a shortcut, not an app (U). | R. Still true: the Samsung issue stays open, with reports from 10 Apr to 9 Oct 2026 and other repos linking it through 27 Oct 2026. No Samsung reply on the issue. Samsung's forum thread was still waiting on its team on 24 Jul. Some big sites (Uber, Pinterest) install fine. The "targetSdk below 34" cause in the repo comment is an unconfirmed guess in that thread. The intent link opening Chrome from Samsung Internet was not verified on a device here (U). | https://github.com/samsunginternet/support/issues/123 , https://intercom.help/progressier/en/articles/14648382-pwa-installation-on-samsung-internet-is-currently-broken (16 Apr 2026) |

### Android: other browsers, one line each

| Browser | Detect | One line | Conf. |
|---|---|---|---|
| Mi Browser | `MiuiBrowser/` (I) | No source found on install behaviour. Hand to Chrome. | U |
| vivo Browser | `VivoBrowser/` (I) | No source found. Hand to Chrome. | U |
| HeyTap / OPPO Browser | `HeyTapBrowser/`, `OppoBrowser/` (I) | No source found. Hand to Chrome. | U |
| Firefox | `Firefox/` with `Android` and `Mobile` (I) | Makes a shortcut. A Mozilla forum thread reports it opens the full browser, tabs and all, and Mozilla's bug 2020304 on an app-style default is still open. No `beforeinstallprompt`. Hand to Chrome. | R (Mozilla support thread 1567788, snippet only) and V for the event |
| Edge | `EdgA/` (I) | Offers "Add to phone", but reports from Apr 2024 to Mar 2025 say it leaves only a launcher icon, not an app-drawer entry, and sources conflict. Has `beforeinstallprompt`. Hand to Chrome. | R, conflicting |
| Opera | `OPR/` (I) | Listed as shortcut-only (Aug 2023 note). Has `beforeinstallprompt`. No current doc found. Hand to Chrome. | R, old |
| Brave | no UA token. `navigator.brave` exists (I) | Menu says "Install app" on PWA-capable sites but makes a shortcut with a Brave badge, reported across Brave 1.0.48 to 1.66. Hand to Chrome. | R |
| DuckDuckGo, UC | `DuckDuckGo/`, `UCBrowser/` (I) | DuckDuckGo not found. UC listed as shortcut-only in 2023. Hand to Chrome. | U / R, old |

Sources: https://firt.dev/notes/pwa/ , https://github.com/brave/brave-browser/issues/26934 , https://techcommunity.microsoft.com/t5/discussions/edge-android-does-not-truly-install-pwa/m-p/4108248 , https://support.mozilla.org/en-US/questions/1567788

Intent handoff (`intent://...#Intent;scheme=https;package=com.android.chrome;...`): I did not verify, on any of these browsers, that it opens Chrome. Treat it as U everywhere, including Samsung Internet, and always show the manual fallback ("copy the address, open Chrome, paste it").

### Android in-app browsers

| ID | Case | Detect | What the member does | Conf. | Source |
|---|---|---|---|---|---|
| AND-10 | WhatsApp, Android | No token: the member is in their default browser. | Ordinary links open in the default external browser ("WhatsApp won't automatically switch to the default external browser, such as Google Chrome or Samsung Internet" describes the new business-only exception). So the default browser decides: Chrome gives AND-2, Samsung Internet gives AND-9. Which makers default to which browser: U. | R | https://wabetainfo.com/whatsapp-beta-for-android-2-25-14-10-whats-new/ (30 Apr 2025) |
| AND-11 | Instagram, Facebook, LinkedIn, Telegram, X, Gmail inside their own browser | I: web views carry `; wv)`, plus `Instagram`, `FBAN`, `FBAV`, `LinkedInApp`. A Chrome Custom Tab has no token. | Use the app's own "open in browser" item. Exact wording per app: U. Install from inside: not offered in a web view. Whether `beforeinstallprompt` ever fires in a Custom Tab: not verified (a Stack Overflow question says it does not fire in an in-app browser). | U | none |

### Desktop, briefly

| Case | What the member does | Conf. | Source |
|---|---|---|---|
| Chrome or Edge | Address-bar install icon, or ⋮ "More" then "Save and share" then "Install <name>" (or "Install Page as App") | V (Chrome blog, 2024-07-23) | https://developer.chrome.com/blog/how_chrome_helps_users_install_the_apps_they_value |
| Safari on Mac | "Add to Dock". Any site works, no manifest needed, and the member "will remain logged in" | V (WebKit 17.2 and 26.0 posts). Menu location of the item: U. | https://webkit.org/blog/14787/webkit-features-in-safari-17-2/ |
| Firefox desktop | No install (an add-on listing says so) | R | https://addons.mozilla.org/id/android/addon/pwas-for-firefox |

QR code for laptop visitors: I agree with it, since the owner said "I want it to show on people's phones". One refinement: scan opens the site in the phone's default browser, so the QR page still needs the same device branch. I found nothing better.

## 3. Sign-in on iOS (must-have 4)

- **V (WebKit, Safari 17.2 post, "Login cookies"):** when the member taps "Add to Home Screen", "the cookies are copied over, including the information about login state". This covers "Safari, Safari View Controller, or another browser on iPhone or iPad". It "will only work if the authentication state is stored within cookies". "No other kind of local storage is copied over." Source: https://webkit.org/blog/14787/webkit-features-in-safari-17-2/
- **R, matches:** Progressier says "one-time cookie copy at the moment the app is added"; firt.dev lists "Login cookies copied to the installed app" from 17.2 and "Storage shared with Browser" as not supported.
- **Not restated for iOS 26 or 27.** The Safari 26.0 and 27.x WebKit posts are silent. I found no sign it was removed.
- **For this site (I):** AGENTS.md says sessions are NextAuth JWT, a cookie, so the copy should apply. Test once on a device.
- **Message consequence:** signed in when adding means still signed in. After that the two sessions are separate (a later sign-out or expiry in one does not reach the other). If "Open as Web App" is switched off, it is just a Safari bookmark.

## 4. The five cases that cover most members (my ranking, no member device data)

1. **iPhone, Safari (IOS-1).** The members abroad, and anyone arriving from WhatsApp on an iPhone, since WhatsApp hands links to Safari. Message: "Tap the ••• button next to the address bar, then Share, then scroll down to Add to Home Screen. Leave Open as Web App on and tap Add. If it asks you to sign in, do that once."
2. **Android, Chrome, any maker (AND-1 to AND-3).** Message: "Tap the ⋮ menu, then Install and create shortcut, then Install. On older Chrome it reads Add to home screen, then Install app. Pick Install, not Create shortcut, which only opens a browser tab." With a working prompt: a button "Add".
3. **Samsung Internet (AND-9).** Message: "Samsung's browser can't add Rishi Valley as an app right now, because Android blocks it. Open it in Chrome and add it from there." Button "Open in Chrome", plus "No luck? Copy the address, open Chrome, paste it."
4. **Icon missing after Install on Xiaomi, Redmi, POCO, OPPO, realme, OnePlus, Samsung (AND-4, 5, 7).** Message: "Installed, but not on your Home screen? Look in your app list and drag it out. If it never appears, switch on Home screen shortcuts for Chrome in Settings (Xiaomi), or Add new apps to the Home screen in Home screen settings (OPPO, realme, OnePlus)." Mark the Xiaomi line as unverified until tested on a HyperOS phone.
5. **iPhone in a non-Safari browser (IOS-4 to IOS-8).** Message: "Open this page in Safari first, then add it from there." Chrome and Firefox can add it themselves, but whether it opens as a bare app is unverified.

## 5. What changed in 2025 and 2026 (a 2024 message is wrong here)

- **Chrome 150 (rolling out from about 10 Jul 2026):** "Add to Home screen" became "Install and create shortcut", with an always-shown Install or Create shortcut sheet. V/R as in AND-2.
- **iOS 26 (Sep 2025):** every site is a web app by default, with the "Open as Web App" switch. Share moved behind •••. V/R as IOS-1.
- **iOS 27 shipped in September 2026** (Apple's guide lists it; WebKit has Safari 27.0 to 27.2 posts). No web-app change found. The Safari button layout on 27 is unverified.
- **Samsung Internet install failure** has run since at least Apr 2026 and is unfixed (R).
- **WhatsApp:** its all-links in-app browser is still in development on iPhone (Oct 2026). If it ships it is opt-in, so the default stays "opens your browser".
- **Android developer verification:** enforcement starts Sep 2026 in Brazil, Indonesia, Singapore, Thailand, and globally later. I found nothing saying it touches Chrome's installs (U, snippet only).
- **Play Protect and PWAs:** Android Authority (Jul 2025) found a code flag that would let Play Protect check PWA installs. No sign it launched (U, snippet only). https://www.androidauthority.com/p-3574977

## 6. What I could not verify

- iPad Safari button path (IOS-2) and Edge on iOS (IOS-6). Whether Chrome or Firefox on iOS give a bare app (IOS-4, IOS-5). Whether "View More" exists in the iOS 26 share sheet (no source mentions it).
- iOS 16.4 to 18 exact steps (IOS-3): the Apple Support page would not render, so these are from memory.
- Safari's button layout on iOS 27, and whether the sign-in copy still applies on 26 and 27.
- Chrome 150's one-tap dialog title, and the 150 rollout share of phones.
- Xiaomi, vivo and OPPO permission names and paths on current builds. No source for any "I trust this app" prompt for Chrome. The only trust-style block I found is Samsung Internet's Play Protect sheet.
- Samsung One UI's own "Add new apps to Home screen" setting.
- Mi, vivo and HeyTap browsers: install behaviour and UA tokens. UA tokens for every browser marked I.
- Whether the `intent://` link opens Chrome from Samsung Internet, Mi, vivo, HeyTap, Firefox, Edge, Opera, Brave, DuckDuckGo, UC.
- In-app browsers other than WhatsApp: tokens, install possibility, exact "open in browser" wording. Whether `beforeinstallprompt` fires in a Chrome Custom Tab.
- Default-browser share per phone maker in India.

## 7. Two things noticed in the repo

- `openInChrome()` in `src/components/pwa/install-device.ts` builds the intent from `host` and `pathname` only, so any `?query` or `#hash` is dropped. Harmless for the install tile, but relevant if the window is ever opened from a link with a query.
- `IosLine` in `phone-row.tsx` matches the sourced iOS 26 path (••• then Share then Add to Home Screen) but omits "Open as Web App", and it says "bottom of the screen" for iOS below 26 without a source (IOS-3 is I).
