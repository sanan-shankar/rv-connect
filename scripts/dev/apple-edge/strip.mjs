/* Render several candidates beside the real thing and LOOK. The numbers have
   been misleading twice; the picture is the check that counts. */
import sharp from 'sharp';
import puppeteer from 'puppeteer';

const SIL = "M-48 390 C-75 390 -98 377 -98 362 C-98 352 -84 348 -70 348 C6 346 82 248 190 198 C284 155 370 179 462 252 C512 199 548 80 622 62 C695 44 683 150 748 158 C786 162 781 107 822 128 C899 168 922 344 980 348 C994 348 1008 352 1008 362 C1008 377 985 390 958 390 Z";
const MID = "M462 252 C512 199 548 80 622 62 C695 44 683 150 748 158 C786 162 781 107 822 128 C899 168 922 344 980 348 C994 348 1008 352 1008 362 C1008 377 985 390 958 390 L432 390 C432 338 444 286 462 252 Z";
const RIS = "M748 158 C786 162 781 107 822 128 C899 168 922 344 980 348 C994 348 1008 352 1008 362 C1008 377 985 390 958 390 L680 390 C692 288 718 202 748 158 Z";

const svg = p => { const u = 5; return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 512 512">
  <defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="${p.bump*u}" result="bump"/>
    <feDiffuseLighting in="bump" surfaceScale="${p.scale*u}" diffuseConstant="1" lighting-color="#fff" result="raw">
      <feDistantLight azimuth="${p.az}" elevation="${p.el}"/></feDiffuseLighting>
    <feComponentTransfer in="raw" result="lit">
      <feFuncR type="gamma" amplitude="${p.amp}" exponent="${p.gam}" offset="0"/>
      <feFuncG type="gamma" amplitude="${p.amp}" exponent="${p.gam}" offset="0"/>
      <feFuncB type="gamma" amplitude="${p.amp}" exponent="${p.gam}" offset="0"/></feComponentTransfer>
    <feMorphology in="SourceAlpha" operator="erode" radius="${p.r1*u}" result="e1"/>
    <feMorphology in="SourceAlpha" operator="erode" radius="${(p.r1+p.r2)*u}" result="e2"/>
    <feComposite in="e1" in2="e2" operator="out" result="band"/>
    <feGaussianBlur in="band" stdDeviation="${p.soft*u}" result="bandSoft"/>
    <feComposite in="lit" in2="bandSoft" operator="in" result="edge"/>
    <feComposite in="edge" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="up"/>
    <feComposite in="up" in2="SourceAlpha" operator="in"/>
  </filter></defs>
  <rect width="512" height="512" rx="96" fill="#141B18"/>
  <g transform="translate(85 190) scale(0.38)" filter="url(#f)">
    <path d="${SIL}" fill="#3F7CA6"/><path d="${MID}" fill="#EAF1DF"/><path d="${RIS}" fill="#C2622F"/>
  </g></svg>`; };

const CANDS = [
  { name: 'D', az:238, el:34, bump:0.25, scale:0.5, amp:1.15, gam:1.2, r1:0.28, r2:0.85, soft:0.3 },
  { name: 'E', az:250, el:40, bump:0.3, scale:0.6, amp:1.3, gam:1.0, r1:0.25, r2:0.8, soft:0.26 },
  { name: 'F', az:238, el:30, bump:0.22, scale:0.45, amp:1.5, gam:1.3, r1:0.3, r2:1.0, soft:0.34 },
];

const truth = await sharp("sanan's stuff/Inspiration/not yet right.png")
  .extract({ left: 2218, top: 25, width: 400, height: 400 }).png().toBuffer();

const browser = await puppeteer.launch({ headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox','--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 440, height: 440, deviceScaleFactor: 2 });
const shots = [];
for (const c of CANDS) {
  await page.setContent(`<body style="margin:0">${svg(c)}</body>`);
  shots.push(await sharp(await page.screenshot({ clip:{x:0,y:0,width:400,height:400} })).resize(400,400).png().toBuffer());
}
await browser.close();

const gap = 16, W = 20 + (shots.length+1)*(400+gap);
await sharp({ create: { width: W, height: 440, channels: 4, background: '#8A8579' } })
  .composite([{ input: truth, left: 20, top: 20 },
    ...shots.map((b,i) => ({ input: b, left: 20 + (i+1)*(400+gap), top: 20 }))])
  .png().toFile('scripts/dev/apple-edge/strip.png');
console.log('truth, then', CANDS.map(c=>c.name).join(', '));
