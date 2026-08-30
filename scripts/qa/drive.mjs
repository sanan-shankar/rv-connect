/**
 * Authenticated interaction harness for QA.
 *
 * screenshot-auth.mjs loads a page and captures it. Several of the fixes in
 * this round only show up AFTER you interact (open the house popover, pick a
 * city, attach a poll), so this drives a short scripted scenario and captures
 * along the way.
 *
 * Usage:
 *   node scripts/qa/drive.mjs <scenario> [--mobile]
 *
 * Scenarios live in SCENARIOS below. Each gets `{ page, shot }`; call
 * `await shot('label')` whenever you want a frame.
 */
import puppeteer from "puppeteer";
import { mkdirSync } from "fs";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";
import { config } from "dotenv";
import { devLogin } from "./_dev-login.mjs";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(repoRoot);
config({ path: ".env" });

const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const scenarioName = args.filter((a) => a !== "--mobile")[0];
const BASE = "http://localhost:3000";

const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  console.error("ADMIN_EMAIL missing from .env");
  process.exit(1);
}

const outDir = "./e2e/.shots/drive";
mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Open your own profile and press "Edit profile".
 *
 * Both scenarios below used to go to `/settings`, which stopped existing when
 * the letterhead profile absorbed the editors (22b4b6c). They 404'd and then
 * failed on a missing selector, which reads like a broken control rather than
 * a dead route.
 */
async function ownProfileEditing(page) {
  // `/profile` with no id is a 404; the own-profile link in the sidebar rail
  // carries the id, so read it rather than hardcoding a cuid that will be
  // deleted one day (which is exactly how crawl.mjs came to pass two blank
  // pages for months).
  await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  const href = await page.evaluate(() => {
    const a = [...document.querySelectorAll('aside a[href^="/profile/"]')][0];
    return a ? a.getAttribute("href") : null;
  });
  if (!href) throw new Error("no own-profile link in the sidebar");
  await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
  await sleep(2500);
  await clickByText(page, "button", "Edit profile");
  await sleep(1200);
}

/** Click the first element whose trimmed text matches, within a selector set. */
async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle(
    (sel, txt) => {
      const nodes = [...document.querySelectorAll(sel)];
      return nodes.find((n) => (n.textContent || "").trim().includes(txt)) || null;
    },
    selector,
    text
  );
  const el = handle.asElement();
  if (!el) throw new Error(`No ${selector} containing "${text}"`);
  await el.click();
  return el;
}

/**
 * Scenarios that must run signed OUT. The landing page is the obvious one:
 * signed-in visitors are redirected off it to /feed by the proxy, so
 * authenticating first would make the landing scenarios unreachable.
 */
const NO_AUTH = new Set(["slide"]);

const SCENARIOS = {
  /**
   * THE DATE FIELD, typed into and then emptied again.
   *
   * Two questions at once, both from 2026-08-30. The owner: "when you type the
   * year the month pops up and when you delete the year only the right part of
   * the month gets deleted. the left few words remain." And, behind that, the
   * one that matters: fifteen photographs were contributed with no date by a
   * contributor certain she had typed years on all of them, and every read of
   * the code says the year cannot be lost between the box and the row.
   *
   * So this types a year, reads back what the form would actually FILE, then
   * deletes it a character at a time and photographs each step. `state` is the
   * payload the contribute room would send -- if that carries the year, the
   * pipeline is exonerated and the loss is in front of the keyboard.
   */
  async dateField({ page, shot }) {
    await page.goto(`${BASE}/collection`, { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /contribute/i.test(b.textContent || "")
      );
      btn?.click();
    });
    await sleep(900);

    // Stage one photograph, which is what makes the questions panel exist.
    const input = await page.$('[role="dialog"] input[type="file"]');
    if (!input) throw new Error("no file input in the contribute dialog");
    await input.uploadFile("./e2e/.shots/date-probe.jpg");
    await sleep(2500); // read + preview + presigned PUT

    const year = await page.$("#contribute-year");
    if (!year) throw new Error("no year box -- the questions panel never appeared");

    /** What the field shows, and what the row would be filed under. */
    const read = async () =>
      page.evaluate(() => {
        const box = document.getElementById("contribute-year");
        const row = box?.closest(".relative");
        const label = row?.querySelector("label");
        const monthWrap = row?.querySelector("label")?.parentElement?.querySelector(".ml-auto");
        const card = row?.parentElement;
        const trig = monthWrap?.querySelector("button");
        const r = (el) => {
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return { x: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width) };
        };
        return {
          typed: box?.value ?? null,
          label: label?.innerText?.trim() ?? null,
          month: monthWrap?.textContent?.trim() ?? null,
          monthOpacity: monthWrap ? getComputedStyle(monthWrap).opacity : null,
          monthVis: monthWrap ? getComputedStyle(monthWrap).visibility : null,
          monthRect: r(monthWrap),
          triggerRect: r(trig),
          cardRect: r(card),
          triggerScrollW: trig ? trig.scrollWidth : null,
          triggerClientW: trig ? trig.clientWidth : null,
        };
      });

    await year.click();
    await page.keyboard.type("2019", { delay: 90 });
    await sleep(500);
    console.log("typed 2019:", JSON.stringify(await read()));
    await shot("year-typed");

    // One character off: the year stops being a year and becomes a decade.
    await page.keyboard.press("Backspace");
    await sleep(500);
    console.log("after 1 backspace:", JSON.stringify(await read()));
    await shot("year-minus-one");

    await page.keyboard.press("Backspace");
    await page.keyboard.press("Backspace");
    await sleep(500);
    console.log("after 3 backspaces:", JSON.stringify(await read()));
    await shot("year-minus-three");

    await page.keyboard.press("Backspace");
    await sleep(600);
    console.log("emptied:", JSON.stringify(await read()));
    await shot("year-emptied");

    // And the whole point: does a typed year survive into what would be sent?
    await year.click();
    await page.keyboard.type("1987", { delay: 90 });
    await sleep(600);
    console.log("refilled 1987:", JSON.stringify(await read()));
    await shot("year-refilled");

    /* NOW WITH A MONTH ON IT, which is what the owner actually did and the
       case the steps above never reach: a month is only pickable once the
       year is real, so deleting the year has to take the month with it. */
    await page.evaluate(() => {
      const row = document.getElementById("contribute-year")?.closest(".relative");
      row?.querySelector(".ml-auto button")?.click();
    });
    await sleep(500);
    await page.evaluate(() => {
      const item = [...document.querySelectorAll('[role="menuitem"]')].find(
        (i) => i.textContent?.trim() === "March"
      );
      item?.click();
    });
    await sleep(600);
    console.log("month picked:", JSON.stringify(await read()));
    await shot("month-picked");

    await page.click("#contribute-year");
    await page.keyboard.press("Backspace");
    await sleep(120);
    console.log("mid-fade after backspace:", JSON.stringify(await read()));
    await shot("month-mid-fade");

    await sleep(700);
    console.log("settled after backspace:", JSON.stringify(await read()));
    await shot("month-settled");

    /* All the way down with a month on it, a frame per keystroke. This is the
       exact sequence the owner described -- "when you delete the year only the
       right part of the month gets deleted, the left few words remain". */
    await page.click("#contribute-year");
    await page.keyboard.type("4", { delay: 60 });          // back to 1984
    await page.evaluate(() => {
      const row = document.getElementById("contribute-year")?.closest(".relative");
      row?.querySelector(".ml-auto button")?.click();
    });
    await sleep(400);
    await page.evaluate(() => {
      const item = [...document.querySelectorAll('[role="menuitem"]')].find(
        (i) => i.textContent?.trim() === "February"
      );
      item?.click();
    });
    await sleep(500);
    await page.click("#contribute-year");
    for (let i = 1; i <= 4; i++) {
      await page.keyboard.press("Backspace");
      await sleep(260);
      console.log(`delete ${i}:`, JSON.stringify(await read()));
      await shot(`delete-${i}`);
    }
  },

  /**
   * The two attach wells (2026-08-29 dialog-standards pass): the Collection's
   * contribute invitation and the post composer's Add-photos dialog, which now
   * share one well material. Captures both so the pair can be compared.
   */
  async wells({ page, shot }) {
    await page.goto(`${BASE}/collection`, { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /contribute/i.test(b.textContent || "")
      );
      btn?.click();
    });
    await sleep(900); // dialog enter + icon spring
    const diag = await page.evaluate(() => {
      const well = document.querySelector('[role="dialog"] button.border-dashed');
      if (!well) return { error: "no dashed well in dialog" };
      const cs = getComputedStyle(well);
      return {
        focused: document.activeElement === well,
        borderStyle: cs.borderStyle,
        borderColor: cs.borderColor,
        outline: cs.outline,
        rect: { w: well.offsetWidth, h: well.offsetHeight },
      };
    });
    console.log("well:", JSON.stringify(diag));
    await shot("collection-contribute");
    // The resting look, without the dialog's initial focus on the well.
    await page.evaluate(() => document.activeElement?.blur());
    await sleep(200);
    await shot("collection-contribute-resting");

    await page.goto(`${BASE}/feed`, { waitUntil: "networkidle2" });
    await page.evaluate(() => {
      const opener = [...document.querySelectorAll("button")].find((b) =>
        /share a memory/i.test(b.textContent || "")
      );
      opener?.click();
    });
    await sleep(600);
    await page.evaluate(() => {
      const add = [...document.querySelectorAll("button")].find((b) =>
        /add a photo|add photo/i.test((b.getAttribute("aria-label") || b.textContent || ""))
      );
      add?.click();
    });
    await sleep(900);
    await shot("feed-attach");
  },

  /**
   * The delete-post confirmation (2026-08-29): opens the viewer's own post's
   * "..." menu and presses Delete, which must now raise the app's
   * ConfirmDialog -- NEVER the browser's confirm(). Screenshots the dialog and
   * then CANCELS it; nothing is deleted (this drives the live database).
   */
  async confirmDelete({ page, shot }) {
    await page.goto(`${BASE}/feed`, { waitUntil: "networkidle2" });
    page.on("dialog", async (d) => {
      console.log("NATIVE DIALOG APPEARED:", d.message());
      await d.dismiss();
    });
    // The feed streams in behind a shimmer; menus only exist once real cards
    // have replaced it (the mobile run raced this and found nothing).
    await page
      .waitForSelector("svg.lucide-ellipsis, svg.lucide-more-horizontal", { timeout: 15000 })
      .catch(() => console.log("no menus appeared within 15s"));
    // Open each card's menu in turn until one belongs to the viewer (its menu
    // holds Delete); press it there.
    let pressed = "no delete item in any menu";
    for (let i = 0; i < 12; i++) {
      const state = await page.evaluate((idx) => {
        const triggers = [
          ...document.querySelectorAll("article button, main button"),
        ].filter((b) => b.querySelector("svg.lucide-ellipsis, svg.lucide-more-horizontal"));
        if (idx >= triggers.length) return "out of triggers";
        triggers[idx].click();
        return "opened";
      }, i);
      if (state === "out of triggers") break;
      await sleep(350);
      const hasDelete = await page.evaluate(
        () => !![...document.querySelectorAll('[role="menuitem"]')].find((el) =>
          /delete/i.test(el.textContent || "")
        )
      );
      if (hasDelete) {
        // The viewer's own menu, open: Edit, the divider, Delete in red.
        await shot("own-post-menu");
        await page.evaluate(() => {
          const item = [...document.querySelectorAll('[role="menuitem"]')].find((el) =>
            /delete/i.test(el.textContent || "")
          );
          item?.click();
        });
        pressed = `pressed delete on card ${i}`;
        break;
      }
      await page.keyboard.press("Escape");
      await sleep(200);
    }
    console.log("item:", pressed);
    await sleep(700);
    await shot("delete-confirm");
    await page.evaluate(() => {
      const cancel = [...document.querySelectorAll('[role="dialog"] button')].find((b) =>
        /^cancel$/i.test((b.textContent || "").trim())
      );
      cancel?.click();
    });
    await sleep(300);
  },

  /**
   * The field focus recipe (2026-08-29): focus the composer's textarea and
   * read the computed border/ring, then keyboard-focus a button and read its
   * outline. Numbers, not squinting.
   */
  async focusStates({ page, shot }) {
    // Five DIFFERENT fields, each clicked into like a person (programmatic
    // .focus() leaves :focus-visible unmatched in headless and measures the
    // resting state). They must all report the same edge: border leaf, one
    // inset 1px ring of leaf, transparent 2px outline. The owner's test was
    // exactly this -- two random boxes -- so the harness does five.
    const FIELDS = [
      { label: "messages textarea", url: "/messages", sel: "textarea" },
      { label: "composer contentEditable", url: "/feed", open: /share a memory/i, sel: '[role="textbox"][contenteditable]' },
      { label: "comment box", url: "/feed", comments: true, sel: 'input[placeholder^="Write a comment"]' },
      { label: "support amount", url: "/support", other: true, sel: "#contribute-amount" },
      // The real mist shell: the login Email field. Signed OUT for this one
      // (the session cookie is dropped first), since a signed-in visit to
      // /login bounces to /feed. The shell must show NOTHING on click.
      { label: "login FloatField shell", url: "/login", noauth: true, sel: 'input[type="email"]' },
    ];
    const results = [];
    for (const f of FIELDS) {
      if (f.noauth) {
        const cookies = await page.cookies();
        for (const c of cookies) if (/session-token/.test(c.name)) await page.deleteCookie(c);
      }
      await page.goto(`${BASE}${f.url}`, { waitUntil: "networkidle2" });
      if (f.open) {
        await page.evaluate((re) => {
          const b = [...document.querySelectorAll("button")].find((x) => new RegExp(re, "i").test(x.textContent || ""));
          b?.click();
        }, f.open.source);
        await sleep(700);
      }
      if (f.comments) {
        await page.waitForSelector("svg.lucide-message-circle, button[aria-label*='comments' i]", { timeout: 15000 }).catch(() => {});
        await page.evaluate(() => {
          const b = [...document.querySelectorAll("button")].find((x) => /show comments/i.test(x.getAttribute("aria-label") || ""));
          b?.click();
        });
        await sleep(900);
      }
      if (f.other) {
        await page.evaluate(() => {
          const b = [...document.querySelectorAll("button")].find((x) => /^other$/i.test((x.textContent || "").trim()));
          b?.click();
        });
        await sleep(400);
      }
      const el = await page.waitForSelector(f.sel, { timeout: 15000 }).catch(() => null);
      if (!el) {
        results.push({ label: f.label, error: "not found" });
        continue;
      }
      const box = await el.boundingBox();
      await page.mouse.click(box.x + box.width / 2, box.y + Math.min(20, box.height / 2));
      await sleep(200);
      const read = (sel) => page.evaluate((sel) => {
        const n = document.querySelector(sel);
        const cs = getComputedStyle(n);
        const layers = cs.boxShadow.split(/,(?![^(]*\))/).map((s) => s.trim());
        return {
          modality: document.documentElement.dataset.modality,
          border: `${cs.borderTopWidth} ${cs.borderTopColor}`,
          ring: layers.find((l) => /inset/.test(l)) || "none",
          outline: cs.outline,
        };
      }, sel);
      const clicked = await read(f.sel);
      // Now arrive by keyboard: blur, Shift+Tab away is unreliable, so Tab off
      // and Shift+Tab back onto the same field.
      await page.keyboard.press("Tab");
      await page.keyboard.down("Shift"); await page.keyboard.press("Tab"); await page.keyboard.up("Shift");
      // 300, not 150: border-color and outline-color transitions run 120-150ms,
      // and reading at 150 caught two fields mid-fade (alpha 0.996 / 0.008) and
      // called five identical edges three different ones.
      await sleep(300);
      const tabbed = await read(f.sel);
      results.push({ label: f.label, click: clicked, tab: tabbed });
      await shot(f.label.replace(/\s+/g, "-"));
    }
    for (const r of results) console.log(JSON.stringify(r));
    const ok = results.filter((r) => !r.error);
    // Compare the SHAPE of the edge, not its colour: the Support card rescopes
    // --ring to sky on purpose, so its edge is the same 2px inset at a different hue.
    const shape = (t) => `${t.border.split(" ")[0]}|${t.ring.replace(/rgb\([^)]*\)|oklab\([^)]*\)/g, "C")}|${t.outline.replace(/rgba?\([^)]*\)/g, "C")}`;
    const tabEdges = new Set(ok.map((r) => shape(r.tab)));
    const clickRings = ok.filter((r) => r.click.ring !== "none");
    console.log(tabEdges.size === 1 ? "TAB: one 2px edge on every field ✓" : `TAB: ${tabEdges.size} different edges ✗`);
    console.log(clickRings.length === 0 ? "CLICK: no ring on any field ✓" : `CLICK: ring on ${clickRings.map((r) => r.label).join(", ")} ✗`);
    // Real keyboard travel, so :focus-visible actually matches.
    await page.keyboard.press("Tab");
    const btn = await page.evaluate(() => {
      const b = document.activeElement;
      if (!b || b.tagName !== "BUTTON") return { error: `active is ${b?.tagName}` };
      const cs = getComputedStyle(b);
      return { outline: cs.outline, offset: cs.outlineOffset, matchesFV: b.matches(":focus-visible") };
    });
    console.log("button focused:", JSON.stringify(btn));
  },

  /**
   * Measure the landing -> /login photo slide. Prints displacement over time so
   * the CURVE is visible, not just the duration: an ease-in-out should crawl
   * out of 0%, cover most of the distance in the middle third, and settle
   * gently, whereas the old ease-out curve jumped to ~40% within two frames.
   */
  async slide({ page }) {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
    await sleep(6000);
    const result = await page.evaluate(async () => {
      const img = document.querySelector('img[src*="landing"]');
      if (!img) return { error: "hero image not found" };
      const layer = img.parentElement;
      // Scope to the hero SECTION: the sticky nav also has a "Sign in" link and
      // comes first in DOM order, but only the hero's CTA carries the exit
      // choreography (the nav one just navigates).
      const hero = img.closest("section");
      if (!hero) return { error: "hero section not found" };
      const signIn = [...hero.querySelectorAll("a")].find((a) =>
        /sign in/i.test(a.textContent || "")
      );
      if (!signIn) return { error: "hero sign-in link not found" };
      const diag = {
        layerClass: layer.className,
        transformBefore: getComputedStyle(layer).transform,
      };

      const out = [];
      const t0 = performance.now();
      signIn.click();
      await new Promise((resolve) => {
        const tick = () => {
          const m = new DOMMatrixReadOnly(getComputedStyle(layer).transform);
          out.push({ t: Math.round(performance.now() - t0), x: Math.round(m.m41) });
          if (performance.now() - t0 < 1400) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      return { out, diag, transformAfter: getComputedStyle(layer).transform };
    });

    if (result.diag) console.log("layer:", JSON.stringify(result.diag));
    if (result.error) {
      console.log("MEASURE FAILED:", result.error);
      return;
    }
    const s = result.out;
    const target = s.reduce((a, b) => (Math.abs(b.x) > Math.abs(a.x) ? b : a)).x;
    console.log(`slide target x = ${target}px`);
    for (const ms of [0, 90, 180, 270, 360, 450, 540, 630, 720, 810, 900, 1000, 1100]) {
      const p = s.reduce((a, b) => (Math.abs(b.t - ms) < Math.abs(a.t - ms) ? b : a));
      const pct = target ? Math.round((p.x / target) * 100) : 0;
      console.log(
        `  t=${String(p.t).padStart(4)}ms  x=${String(p.x).padStart(6)}  ${String(pct).padStart(3)}%  ${"#".repeat(Math.max(0, Math.round(pct / 3)))}`
      );
    }
  },

  /**
   * Catch-up creation: search a person by a CAPITALISED first name. That
   * casing is the exact thing that used to return nothing, because Prisma's
   * `contains` is case-sensitive on Postgres and the stored name differed in
   * case. Also exercises the people picker that replaced the group picker.
   */
  async create({ page, shot }) {
    await page.goto(`${BASE}/catchups/new`, { waitUntil: "domcontentloaded" });
    await sleep(5000);
    await shot("empty");
    const input = await page.$('input[aria-label="Search people by name"]');
    if (!input) throw new Error("people search input not found");
    await input.click();
    await input.type("Afya", { delay: 70 });
    await sleep(7000);
    await shot("searched");
    const hits = await page.evaluate(() =>
      [...document.querySelectorAll("li button")].map((b) => b.textContent.trim()).slice(0, 5)
    );
    console.log("RESULTS FOR 'Afya':", JSON.stringify(hits));
    // The regression this guards: a capitalised query used to return nothing
    // while a lowercase substring of the same name worked.
    const casing = await page.evaluate(async () => {
      const count = async (q) =>
        (await (await fetch(`/api/users/search?q=${encodeURIComponent(q)}`)).json()).length;
      return { Afya: await count("Afya"), afya: await count("afya"), fya: await count("fya") };
    });
    console.log("CASE CHECK (all three must match):", JSON.stringify(casing));
    if (hits.length) {
      await page.evaluate(() => document.querySelector("li button").click());
      await sleep(1200);
      await shot("picked");
    }
  },

  /** Shipped profile: resolve a real member from the directory, then capture it. */
  async profile({ page, shot }) {
    await page.goto(`${BASE}/directory`, { waitUntil: "domcontentloaded" });
    await sleep(5000);
    // The directory opens on the map, so the people grid is below the fold.
    // Scroll it in, then fall back to the sidebar's own-profile chip.
    await page.evaluate(() => window.scrollBy(0, 1600));
    await sleep(2500);
    const href = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a[href^="/profile/"]')][0];
      return a ? a.getAttribute("href") : null;
    });
    if (!href) throw new Error("no profile link found");
    console.log("profile:", href);
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
    await sleep(5000);
    await shot("top");
    await page.evaluate(() => window.scrollBy(0, 620));
    await sleep(900);
    await shot("scrolled");
  },

  /** Houses picker: open a year's panel and confirm it does not cover the year rows. */
  async houses({ page, shot }) {
    await ownProfileEditing(page);
    // Scroll the houses chain into view. The editor is the chain itself now --
    // "Tap a house to change it" -- so the trigger is a house pill, not a
    // separate per-year control.
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("p,label,h2,h3,div")].find((n) =>
        /Tap a house to change it/.test(n.textContent || "")
      );
      (el || document.body).scrollIntoView({ block: "center" });
    });
    await sleep(600);
    await shot("houses-closed");
    const opened = await page.evaluate(() => {
      // Every editable pill is `<button aria-label="Golden, 2014-15. Change
      // this.">` (houses-chain.tsx), which survives a copy change better than
      // matching the visible text, where the house and the years are separate
      // spans and run together as "Golden2014-15".
      const pill = document.querySelector('button[aria-label*="Change this."]');
      if (!pill) return null;
      pill.click();
      return pill.getAttribute("aria-label");
    });
    if (!opened) throw new Error("no house pill found to open the panel");
    console.log("opened the panel from:", opened);
    await sleep(700);
    await shot("houses-open");
    // The panel must actually be on screen, with the menu material on it.
    const panel = await page.evaluate(() => {
      const el = document.querySelector('[data-slot="popover-content"]');
      if (!el) return { present: false };
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        present: true,
        w: Math.round(r.width),
        h: Math.round(r.height),
        opacity: cs.opacity,
        radius: cs.borderTopLeftRadius,
        transition: cs.transitionDuration,
      };
    });
    console.log("panel:", JSON.stringify(panel));
    if (!panel.present || panel.h < 40 || Number(panel.opacity) < 0.9) {
      throw new Error(`popover did not render visibly: ${JSON.stringify(panel)}`);
    }
    await shot("houses-after-pick");
  },

  /** Location picker: type, select, and confirm the search box empties. */
  async places({ page, shot }) {
    await ownProfileEditing(page);
    const input = await page.$('input[role="combobox"]');
    if (!input) throw new Error("no combobox input found");
    await input.click();
    await input.type("Chennai", { delay: 60 });
    await sleep(1400);
    await shot("places-suggestions");
    // Keyboard path: this is the one that used to leave the label behind.
    await page.keyboard.press("ArrowDown");
    await sleep(200);
    await page.keyboard.press("Enter");
    await sleep(1200);
    await shot("places-after-pick");
    const leftover = await page.evaluate(() => {
      const el = document.querySelector('input[role="combobox"]');
      return el ? el.value : "(no input)";
    });
    console.log(`INPUT VALUE AFTER PICK: "${leftover}"`);
  },

  /** Composer poll: attach a poll and confirm the surface + question framing. */
  async poll({ page, shot }) {
    await page.goto(`${BASE}/feed`, { waitUntil: "domcontentloaded" });
    await sleep(3000);
    const box = await page.$('[contenteditable="true"], textarea');
    if (box) {
      await box.click();
      await sleep(900);
    }
    await shot("composer-open");
    // The poll toggle lives behind the "+" overflow menu.
    const more = await page.$('button[aria-label*="More"], button[aria-haspopup="menu"]');
    if (more) {
      await more.click();
      await sleep(500);
      await shot("composer-menu");
      try {
        await clickByText(page, "button", "Poll");
        await sleep(700);
      } catch (e) {
        console.log("could not find Poll item:", e.message);
      }
    }
    await shot("composer-poll");
  },
};

const scenario = SCENARIOS[scenarioName];
if (!scenario) {
  console.error(`Unknown scenario "${scenarioName}". Options: ${Object.keys(SCENARIOS).join(", ")}`);
  process.exit(1);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
const page = await browser.newPage();
/* hasTouch/isMobile, not just a narrow window: surfaces now branch on
   `(hover: hover) and (pointer: fine)` (the attach wells' wording), and a
   390px viewport with a fine pointer is a squeezed laptop, not a phone. */
await page.setViewport(
  mobile
    ? { width: 390, height: 844, isMobile: true, hasTouch: true }
    : { width: 1440, height: 900 }
);
// The dev server recompiles on every edit, and this repo is often being edited
// by other work while QA runs, so first paint of a cold route can take a while.
page.setDefaultNavigationTimeout(120000);
page.setDefaultTimeout(120000);

page.on("pageerror", (e) => console.log("PAGEERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE ERROR:", m.text());
});

if (!NO_AUTH.has(scenarioName)) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  try {
    await devLogin(page, BASE, adminEmail);
  } catch (err) {
    console.error(err.message);
    await browser.close();
    process.exit(1);
  }
}

let n = 0;
const tag = mobile ? "mobile" : "desktop";
const shot = async (label) => {
  n += 1;
  const p = join(outDir, `${scenarioName}-${tag}-${n}-${label}.png`);
  await page.screenshot({ path: p });
  console.log("saved", p);
};

try {
  await scenario({ page, shot });
} catch (e) {
  console.error("scenario failed:", e.message);
  await shot("failure");
}
await browser.close();
