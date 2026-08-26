/* The target the fit should actually be scored against: the lift CURVE at
   several columns, in icon units of depth. */
import sharp from 'sharp';
import { mapper, profileAt } from './measure.mjs';

const { data, info } = await sharp("sanan's stuff/Inspiration/not yet right.png")
  .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = (x,y) => { const i=(y*info.width+x)*4; return [data[i],data[i+1],data[i+2]]; };
const map = mapper(2218, 25, 400);
export const DEPTHS = [0,1,2,3,4,5,6,7,8,9,10,12,14,17,20,24,28];
const COLS = [130,170,210,250,290,330,390,410];
const out = {};
for (const ix of COLS) out[ix] = profileAt(px, map, ix, DEPTHS);
console.log('depths', JSON.stringify(DEPTHS));
for (const ix of COLS) console.log(ix, JSON.stringify(out[ix]));
console.log('\nexport const TRUTH_PROFILE = ' + JSON.stringify(out) + ';');
