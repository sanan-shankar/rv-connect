/* ------------------------------------------------------------------ *
 *  The noise the valley's clouds are made of, generated once when the
 *  room opens: a 64-cube of Perlin-Worley noise (the billow of a cumulus,
 *  Schneider's recipe from Horizon Zero Dawn) with a finer Worley octave
 *  for the eroded edges, and a sheet of Perlin noise saying where over
 *  the valley there is cloud at all. Every one tiles, so the sky is made
 *  of repeats nobody can see.
 * ------------------------------------------------------------------ */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Perlin gradient noise that repeats every `period` lattice cells. */
function perlin3(period: number, seed: number) {
  const r = rng(seed);
  const n = period * period * period;
  const gx = new Float32Array(n), gy = new Float32Array(n), gz = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    gx[i] = s * Math.cos(a); gy[i] = s * Math.sin(a); gz[i] = u;
  }
  const idx = (x: number, y: number, z: number) => (((z % period) + period) % period) * period * period + (((y % period) + period) % period) * period + (((x % period) + period) % period);
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x: number, y: number, z: number) => {
    const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
    const fx = x - x0, fy = y - y0, fz = z - z0;
    let v = 0;
    for (let c = 0; c < 8; c++) {
      const dx = c & 1, dy = (c >> 1) & 1, dz = (c >> 2) & 1;
      const k = idx(x0 + dx, y0 + dy, z0 + dz);
      const dot = gx[k] * (fx - dx) + gy[k] * (fy - dy) + gz[k] * (fz - dz);
      const w = (dx ? fade(fx) : 1 - fade(fx)) * (dy ? fade(fy) : 1 - fade(fy)) * (dz ? fade(fz) : 1 - fade(fz));
      v += w * dot;
    }
    return v;
  };
}

/** Worley (cellular) noise: 1 at a cell's feature point, falling to 0 a
 *  cell away. Repeats every `cells`. */
function worley3(cells: number, seed: number) {
  const r = rng(seed);
  const n = cells * cells * cells;
  const px = new Float32Array(n), py = new Float32Array(n), pz = new Float32Array(n);
  for (let i = 0; i < n; i++) { px[i] = r(); py[i] = r(); pz[i] = r(); }
  return (x: number, y: number, z: number) => {
    const X = x * cells, Y = y * cells, Z = z * cells;
    const cx = Math.floor(X), cy = Math.floor(Y), cz = Math.floor(Z);
    let best = 9;
    for (let dz = -1; dz <= 1; dz++) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const ix = cx + dx, iy = cy + dy, iz = cz + dz;
      const k = (((iz % cells) + cells) % cells) * cells * cells + (((iy % cells) + cells) % cells) * cells + (((ix % cells) + cells) % cells);
      const ddx = ix + px[k] - X, ddy = iy + py[k] - Y, ddz = iz + pz[k] - Z;
      const d = ddx * ddx + ddy * ddy + ddz * ddz;
      if (d < best) best = d;
    }
    return Math.max(0, 1 - Math.sqrt(best));
  };
}

const remap = (v: number, a: number, b: number, c: number, d: number) => c + ((v - a) / (b - a)) * (d - c);

/**
 * RGBA, size^3: R the billow (Perlin-Worley), G a three-octave Worley
 * for the edges, B and A spare octaves the shader can mix in.
 */
export function cloudNoise(size = 64): Uint8Array {
  const out = new Uint8Array(size * size * size * 4);
  const p = [perlin3(4, 11), perlin3(8, 12), perlin3(16, 13)];
  const w = [worley3(4, 21), worley3(8, 22), worley3(16, 23)];
  const wd = [worley3(8, 31), worley3(16, 32), worley3(32, 33)];
  for (let k = 0; k < size; k++) for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = (i + 0.5) / size, y = (j + 0.5) / size, z = (k + 0.5) / size;
    const pf = p[0](x * 4, y * 4, z * 4) * 1 + p[1](x * 8, y * 8, z * 8) * 0.5 + p[2](x * 16, y * 16, z * 16) * 0.25;
    const perlin = Math.min(1, Math.max(0, pf / 1.75 * 1.4 + 0.5));
    const wf = w[0](x, y, z) * 0.625 + w[1](x, y, z) * 0.25 + w[2](x, y, z) * 0.125;
    const pw = Math.min(1, Math.max(0, remap(perlin, 0, 1, wf, 1)));
    const detail = wd[0](x, y, z) * 0.625 + wd[1](x, y, z) * 0.25 + wd[2](x, y, z) * 0.125;
    const o = ((k * size + j) * size + i) * 4;
    out[o] = Math.round(pw * 255);
    out[o + 1] = Math.round(wf * 255);
    out[o + 2] = Math.round(detail * 255);
    out[o + 3] = Math.round(perlin * 255);
  }
  return out;
}

/** Where there is cloud: R, a tiling sheet of Perlin noise at a few
 *  scales, so the sky has clusters and clear stretches rather than an
 *  even scatter. */
export function cloudCover(size = 256): Uint8Array {
  const out = new Uint8Array(size * size * 4);
  const p = [perlin3(6, 41), perlin3(12, 42), perlin3(24, 43), perlin3(48, 44)];
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const x = (i + 0.5) / size, y = (j + 0.5) / size;
    const v = p[0](x * 6, y * 6, 0.37) + p[1](x * 12, y * 12, 0.71) * 0.5 + p[2](x * 24, y * 24, 0.13) * 0.25 + p[3](x * 48, y * 48, 0.53) * 0.12;
    const o = (j * size + i) * 4;
    out[o] = Math.round(Math.min(1, Math.max(0, v / 1.87 * 1.5 + 0.5)) * 255);
    out[o + 1] = out[o]; out[o + 2] = out[o]; out[o + 3] = 255;
  }
  return out;
}
