/* Fit the edge filter to the measured ground truth PROFILES.
 *
 * The earlier version of this scored one number per column, the peak of the
 * band. A tight bright line and a wide soft ramp with the same peak score the
 * same, so the descent widened the band until the shapes looked airbrushed
 * and the score kept improving. Scoring the whole curve fixes that: width is
 * now constrained exactly as tightly as height.
 */
import puppeteer from 'puppeteer';
import sharp from 'sharp';
import { mapper, profileAt } from './measure.mjs';

const SIL = "M-48 390 C-75 390 -98 377 -98 362 C-98 352 -84 348 -70 348 C6 346 82 248 190 198 C284 155 370 179 462 252 C512 199 548 80 622 62 C695 44 683 150 748 158 C786 162 781 107 822 128 C899 168 922 344 980 348 C994 348 1008 352 1008 362 C1008 377 985 390 958 390 Z";
const MID = "M462 252 C512 199 548 80 622 62 C695 44 683 150 748 158 C786 162 781 107 822 128 C899 168 922 344 980 348 C994 348 1008 352 1008 362 C1008 377 985 390 958 390 L432 390 C432 338 444 286 462 252 Z";
const RIS = "M748 158 C786 162 781 107 822 128 C899 168 922 344 980 348 C994 348 1008 352 1008 362 C1008 377 985 390 958 390 L680 390 C692 288 718 202 748 158 Z";

export const DEPTHS = [0,1,2,3,4,5,6,7,8,9,10,12,14,17];
/* Only the columns that cross one shape cleanly. 250, 290 and 330 enter
   through the cream hill sitting on top of another, so their "lift" is one
   shape measured against a different one and comes out negative. */
const TRUTH = {
  130: [-8,-8,3,35,88,88,72,57,44,35,35,2,1,0],
  170: [-1,-1,5,57,79,79,62,51,36,11,11,4,3,3],
  210: [0,0,5,44,62,62,49,41,30,12,12,4,4,3],
  390: [-16,-16,8,5,51,51,84,76,65,59,59,37,20,4],
};
/* 410 is dropped. Its curve is a low broad hump quite unlike the other four,
   and letting it into the score dragged the azimuth round to 112 degrees,
   which is a light coming from below and to the right. Every other column,
   and the picture, says the light is up and to the left. One column that
   disagrees with four and with the eye is a feature of the screenshot, not
   of the effect. */
const COLS = Object.keys(TRUTH).map(Number);

function svg(p) {
  const u = 5;
  /* An INSET BAND, weighted by direction.
   *
   * Two earlier constructions both failed, in opposite ways.
   *
   * A band masked straight to the contour is brightest AT the edge, where the
   * measured curve says the lift is still near zero.
   *
   * A blurred-alpha shoulder gets the curve right when you measure straight
   * down a column, and still looks like a wash. That is a measurement trap:
   * vertical depth is not perpendicular distance. On the shallow crown of a
   * hill a band twelve units deep spreads across a third of the shape, which
   * is exactly the smear on screen while the numbers said it was fine.
   *
   * Morphology measures perpendicular distance, so a band between two erosions
   * is genuinely constant width all the way round, which is what Apple's is.
   * r1 is the gap at the very rim, r2 the far side of the band. */
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 512 512">
  <defs><filter id="f" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="${p.bump*u}" result="bump"/>
    <feDiffuseLighting in="bump" surfaceScale="${p.scale*u}" diffuseConstant="1" lighting-color="#fff" result="raw">
      <feDistantLight azimuth="${p.az}" elevation="${p.el}"/>
    </feDiffuseLighting>
    <feComponentTransfer in="raw" result="lit">
      <feFuncR type="gamma" amplitude="${p.amp}" exponent="${p.gam}" offset="0"/>
      <feFuncG type="gamma" amplitude="${p.amp}" exponent="${p.gam}" offset="0"/>
      <feFuncB type="gamma" amplitude="${p.amp}" exponent="${p.gam}" offset="0"/>
    </feComponentTransfer>
    <feMorphology in="SourceAlpha" operator="erode" radius="${p.r1*u}" result="e1"/>
    <feMorphology in="SourceAlpha" operator="erode" radius="${(p.r1+p.r2)*u}" result="e2"/>
    <feComposite in="e1" in2="e2" operator="out" result="band"/>
    <feGaussianBlur in="band" stdDeviation="${p.soft*u}" result="bandSoft"/>
    <feComposite in="lit" in2="bandSoft" operator="in" result="edge"/>
    <feComposite in="edge" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="up"/>
    <feComposite in="up" in2="SourceAlpha" operator="in"/>
  </filter></defs>
  <rect width="512" height="512" fill="#141B18"/>
  <g transform="translate(85 190) scale(0.38)" filter="url(#f)">
    <path d="${SIL}" fill="#3F7CA6"/><path d="${MID}" fill="#EAF1DF"/><path d="${RIS}" fill="#C2622F"/>
  </g></svg>`;
}

const browser = await puppeteer.launch({ headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  args: ['--no-sandbox','--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 440, height: 440, deviceScaleFactor: 1 });
const map = mapper(0, 0, 400);

async function measure(p) {
  await page.setContent(`<body style="margin:0">${svg(p)}</body>`);
  const buf = await page.screenshot({ clip: { x:0, y:0, width:400, height:400 } });
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x,y) => { const i=(y*info.width+x)*4; return [data[i],data[i+1],data[i+2]]; };
  const out = {};
  for (const ix of COLS) out[ix] = profileAt(px, map, ix, DEPTHS);
  return out;
}
function score(m) {
  let s=0, n=0, miss=0;
  for (const ix of COLS) {
    const a = m[ix], b = TRUTH[ix];
    if (!a) { miss++; continue; }
    for (let i=0;i<b.length;i++) { s += (a[i]-b[i])**2; n++; }
  }
  return n ? Math.sqrt(s/n) + miss*20 : 1e9;
}

/* Start narrow. The measured band is back to nothing by twelve icon units, so
   a ring of two units of u (ten at a 512 box) is the right neighbourhood. */
let best = { p: { az:222, el:30, bump:0.5, scale:2.0, amp:0.7, gam:1.2, r1:0.4, r2:1.1, soft:0.22 } };
best.m = await measure(best.p); best.s = score(best.m);
console.log('start', best.s.toFixed(2));

const STEPS = {
  az: [-20,-10,10,20], el: [-8,-4,4,8], bump: [-0.2,-0.1,0.1,0.2],
  scale: [-0.8,-0.4,0.4,0.8], amp: [-0.2,-0.1,0.1,0.2], gam: [-0.4,-0.2,0.2,0.4],
  r1: [-0.2,-0.1,0.1,0.2], r2: [-0.3,-0.15,0.15,0.3], soft: [-0.08,-0.04,0.04,0.08],
};
for (let pass=0; pass<5; pass++) {
  let moved = false;
  for (const k of Object.keys(STEPS)) for (const d of STEPS[k]) {
    const p = { ...best.p, [k]: +(best.p[k]+d).toFixed(3) };
    if (p.bump<=0.05 || p.scale<=0.1 || p.amp<=0.05 || p.gam<=0.3 || p.el<5 || p.el>80) continue;
    if (p.r1<0 || p.r2<=0.2 || p.soft<0.02 || p.r1+p.r2>2.6) continue; // keep the band a line, not a wash
    if (p.az < 185 || p.az > 265) continue; // the light is up and to the left, full stop
    const m = await measure(p); const s = score(m);
    if (s < best.s - 0.03) { best = { p, m, s }; moved = true; console.log('pass', pass, k, d>0?'+'+d:d, '->', s.toFixed(2)); }
  }
  if (!moved) break;
}
console.log('\ndepths', JSON.stringify(DEPTHS));
for (const ix of COLS) {
  console.log(ix, 'truth', JSON.stringify(TRUTH[ix]));
  console.log(ix, 'ours ', JSON.stringify(best.m[ix]));
}
console.log('\nrms', best.s.toFixed(2));
console.log('PARAMS', JSON.stringify(best.p));
await browser.close();
