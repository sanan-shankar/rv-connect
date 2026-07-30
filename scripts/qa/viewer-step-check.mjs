import puppeteer from "puppeteer";
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto("http://localhost:3000/lab/viewer", { waitUntil: "networkidle2" });
await page.click("main button"); // open first gallery thumb
await new Promise((r) => setTimeout(r, 800));

// step forward, sample MID-transition (~80ms in) and settled (~700ms)
await page.keyboard.press("ArrowRight");
await new Promise((r) => setTimeout(r, 80));
const mid = await page.evaluate(() => {
  const stage = document.querySelector('[role="dialog"]');
  return [...stage.querySelectorAll("img")].map((im) => {
    const fr = im.closest("div");
    const st = getComputedStyle(fr);
    return { transform: st.transform, opacity: (+st.opacity).toFixed(2) };
  });
});
await new Promise((r) => setTimeout(r, 700));
const settled = await page.evaluate(() => {
  const stage = document.querySelector('[role="dialog"]');
  return [...stage.querySelectorAll("img")].map((im) => {
    const fr = im.closest("div");
    const st = getComputedStyle(fr);
    return { transform: st.transform, opacity: st.opacity };
  });
});
// step BACK, ensure direction flips (incoming from the left => negative x)
await page.keyboard.press("ArrowLeft");
await new Promise((r) => setTimeout(r, 60));
const midBack = await page.evaluate(() => {
  const stage = document.querySelector('[role="dialog"]');
  return [...stage.querySelectorAll("img")].map((im) => {
    const fr = im.closest("div");
    const st = getComputedStyle(fr);
    return { transform: st.transform, opacity: (+st.opacity).toFixed(2) };
  });
});
console.log("MID-STEP (forward):", JSON.stringify(mid));
console.log("SETTLED:", JSON.stringify(settled));
console.log("MID-STEP (back):", JSON.stringify(midBack));
await browser.close();
