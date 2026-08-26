import sharp from 'sharp';
import { mapper, liftAt, L } from './measure.mjs';
const { data, info } = await sharp("sanan's stuff/Inspiration/not yet right.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = (x,y) => { const i=(y*info.width+x)*4; return [data[i],data[i+1],data[i+2]]; };
const map = mapper(2218, 25, 400);

const XS = [110,130,150,170,190,210,230,250,270,290,310,330,350,370,390,410,430];
const out = {};
for (const ix of XS) { const r = liftAt(px, map, ix); out[ix] = r ? r.lift : null; }
console.log('TRUTH', JSON.stringify(out));
for (const ix of XS) { const r = liftAt(px, map, ix); if (r) console.log(ix, 'body', r.body, 'lift', r.lift); }
