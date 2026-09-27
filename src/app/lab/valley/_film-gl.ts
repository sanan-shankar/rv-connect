/* ------------------------------------------------------------------ *
 *  The valley film's renderer. Raw WebGL2.
 *
 *  What is on screen, and where it comes from:
 *   - the ground: aerial photographs (Esri World Imagery, fetched by
 *     scripts/dev/valley-film.mjs) draped on SRTM-class elevation, drawn
 *     as Web Mercator tiles that split into finer ones as the camera
 *     comes closer (_geo.ts selectTiles), each tile a 32x32 grid whose
 *     heights the vertex shader reads from the elevation mosaics;
 *   - the light: one sun, fixed, whose shadows and the sky's share of
 *     light are baked once from the elevation when the room opens;
 *   - the air: Rayleigh and Mie scattering through a spherical
 *     atmosphere, integrated per pixel, so the sky's colour and the haze
 *     on a far ridge are the same physics and meet without a seam;
 *   - the picture: rendered in linear light into a float buffer, a
 *     little bloom off the sun, then AgX to the screen.
 *
 *  Nothing is painted with a chosen colour. Every hue is the ground's
 *  own, the sun's, or the air's.
 * ------------------------------------------------------------------ */

import { R_SIGHT, boxInFrustum, cross, demGround, frustumPlanes, norm, selectTiles, sink, tileHeightRange, tileRect, viewOf, type Shot, type TileKey, type V3, type View } from "./_geo";
import { ROOTS, maxZoomAt } from "./_flight";
import { cloudCover, cloudNoise } from "./_clouds";

export type DemRect = { x0: number; z0: number; size: number; px: number; zoom: number };
export type Dem = { rect: DemRect; h: Float32Array };

export type Look = {
  /** direction the sunlight comes from, unit, world (x east, y up, z south) */
  sun: [number, number, number];
  /** Mie (haze) scattering at sea level, per metre, and its scale height */
  mie: number;
  mieH: number;
  exposure: number;
  /** how much of the photographs' own baked sunlight is divided back out */
  delight: number;
  /** colour lift for the photographs, the veil of many-times-scattered
     light, and the tone curve's contrast and saturation */
  vibrance: number;
  ms: number;
  /** 1 draws the ground as plain grey, to see the light alone */
  debug?: number;
  power: number;
  sat: number;
};

/* ---- shaders --------------------------------------------------------- */

const ATMOS = /* glsl */ `
const float RG = 6360e3;
const float RT = 6420e3;
const vec3 BR = vec3(5.802e-6, 13.558e-6, 33.1e-6);
const float HR = 8000.0;
const vec3 BO = vec3(0.650e-6, 1.881e-6, 0.085e-6);
const float MIE_G = 0.8;
uniform float uMie;
uniform float uMieH;
uniform vec3 uSun;
uniform float uEyeAlt;
uniform float uMs;

/* Schuler's approximation to the Chapman function: optical depth, in
   scale heights at the point's own density, along a ray leaving radius
   X+h (in scale heights) at zenith cosine cz. */
float chapman(float X, float h, float cz) {
  float c = sqrt(1.5707963 * (X + h));
  if (cz >= 0.0) return c / ((c - 1.0) * cz + 1.0) * exp(-h);
  float x0 = sqrt(1.0 - cz * cz) * (X + h);
  float c0 = sqrt(1.5707963 * x0);
  return 2.0 * c0 * exp(X - x0) - c / ((c - 1.0) * (-cz) + 1.0) * exp(-h);
}

/* sunlight reaching altitude h, where the sun's zenith cosine is cz */
vec3 sunT(float h, float cz) {
  float tR = HR * chapman(RG / HR, h / HR, cz);
  float tM = uMieH * chapman(RG / uMieH, h / uMieH, cz);
  /* ozone as a thin shell at 25 km, 15 km thick if laid flat */
  float s = (RG + h) / (RG + 25000.0);
  float mO = 1.0 / sqrt(max(1.0 - s * s * (1.0 - cz * cz), 0.004));
  return exp(-(BR * tR + (uMie / 0.9) * tM + BO * 15000.0 * mO));
}

float phaseR(float mu) { return 0.0596831 * (1.0 + mu * mu); }
float phaseM(float mu) {
  float g = MIE_G, g2 = g * g;
  return 0.1193662 * (1.0 - g2) * (1.0 + mu * mu) / ((2.0 + g2) * pow(max(1.0 + g2 - 2.0 * g * mu, 1e-4), 1.5));
}

/* Light scattered toward the eye along a ray of length tMax from the eye
   (at altitude uEyeAlt) in direction rd, and what survives of whatever
   is behind it. N samples, bunched near the eye where the air is dense. */
vec3 scatter(vec3 rd, float tMax, int N, out vec3 T) {
  float r0 = RG + uEyeAlt;
  float mu = dot(rd, uSun);
  float pR = phaseR(mu), pM = phaseM(mu);
  vec3 L = vec3(0.0);
  vec3 od = vec3(0.0);
  float prev = 0.0;
  for (int i = 0; i < 24; i++) {
    if (i >= N) break;
    float f = (float(i) + 1.0) / float(N);
    float t = tMax * f * f;
    float dt = t - prev;
    float tm = (t + prev) * 0.5;
    prev = t;
    vec3 p = vec3(0.0, r0, 0.0) + rd * tm;
    float r = length(p);
    float h = max(r - RG, 0.0);
    vec3 up = p / r;
    float dR = exp(-h / HR), dM = exp(-h / uMieH);
    float s = (RG + h) / (RG + 25000.0);
    vec3 ext = BR * dR + (uMie / 0.9) * dM;
    od += ext * dt;
    vec3 Tv = exp(-(od - ext * dt * 0.5));
    vec3 Ts = sunT(h, dot(up, uSun));
    /* single scattering, plus a flat share for the light that has
       bounced more than once, which is what keeps the horizon from
       going grey-dark when the sun is low */
    vec3 sc = BR * dR * pR + uMie * dM * pM;
    vec3 ms = (BR * dR + uMie * dM) * uMs;
    L += Tv * (Ts * sc + ms * (Ts * 0.6 + 0.34)) * dt;
  }
  T = exp(-od);
  return L;
}

/* how far a ray from the eye travels before leaving the atmosphere */
float toSpace(vec3 rd) {
  float r0 = RG + uEyeAlt;
  float b = r0 * rd.y;
  float c = r0 * r0 - RT * RT;
  return -b + sqrt(max(b * b - c, 0.0));
}
`;

/* One crown: a clump of six lumps squashed to its height, and a trunk.
   The ray (o, rd) is in eye-relative metres; returns the distance to the
   first hit (or 1e9), its normal, which lump, how far inside the
   silhouette the ray passes (for the edge) and whether it hit the trunk. */
const TREE_HIT = /* glsl */ `
float crownSquash(vec3 tree) {
  return min(mix(0.74, 1.05, fract(tree.z * 7.13)), tree.y * 0.47 / tree.x);
}
float treeHit(vec3 o, vec3 rd, vec3 base, vec3 tree, out vec3 nOut, out int idOut, out float qOut, out bool trunkOut) {
  float r = tree.x, h = tree.y, seed = tree.z;
  float sq = crownSquash(tree);
  float ch = r * sq;
  vec3 cc = base + vec3(0.0, h - ch, 0.0);
  vec3 oo = (o - cc) / r; oo.y /= sq;
  vec3 d = rd / r; d.y /= sq;
  float A = dot(d, d);
  float best = 1e9;
  nOut = vec3(0.0, 1.0, 0.0);
  idOut = -1; qOut = 0.0; trunkOut = false;
  /* the whole crown sits inside a sphere of 1.1 in its own units; a ray
     that misses that misses every lump */
  float Be = dot(oo, d), Ce = dot(oo, oo) - 1.21;
  bool nearCrown = Be * Be - A * Ce > 0.0;
  for (int i = 0; i < 6; i++) {
    if (!nearCrown) break;
    vec3 c; float rho;
    if (i == 0) { c = vec3(0.0, 0.1, 0.0); rho = 0.66; }
    else {
      float a = seed * 6.2831 + float(i) * 1.2566 + 0.4 * sin(seed * 31.0 + float(i));
      float rad = 0.36 + 0.14 * fract(seed * 5.3 + float(i) * 0.61);
      c = vec3(cos(a) * rad, 0.24 * sin(float(i) * 2.1 + seed * 9.0) - 0.2, sin(a) * rad);
      rho = 0.44 + 0.16 * fract(seed * 13.7 + float(i) * 0.37);
    }
    vec3 oc = oo - c;
    float B = dot(oc, d), C = dot(oc, oc) - rho * rho;
    float disc = B * B - A * C;
    if (disc < 0.0) continue;
    float t = (-B - sqrt(disc)) / A;
    if (t > 0.0 && t < best) {
      best = t;
      vec3 nl = (oo + d * t) - c;
      nOut = normalize(vec3(nl.x, nl.y / sq, nl.z));
      idOut = i;
      qOut = sqrt(disc / A) / rho;
    }
  }
  float tr = max(0.18, r * 0.07);
  vec2 oh = o.xz - base.xz, dh = rd.xz;
  float a2 = dot(dh, dh), b2 = dot(oh, dh), c2 = dot(oh, oh) - tr * tr;
  float disc2 = b2 * b2 - a2 * c2;
  if (disc2 > 0.0 && a2 > 1e-8) {
    float t = (-b2 - sqrt(disc2)) / a2;
    float y = o.y + rd.y * t;
    if (t > 0.0 && t < best && y > base.y && y < cc.y) {
      best = t; trunkOut = true; qOut = sqrt(disc2 / a2) / tr;
      vec3 P = o + rd * t;
      nOut = normalize(vec3(P.x - base.x, 0.0, P.z - base.z));
    }
  }
  return best;
}
`;

/* The trees' shadows, from a map drawn each frame along the sunlight
   over the ground near the camera: nine taps, so the edges are soft the
   way a crown's shadow is. */
const TREE_SHADOW = /* glsl */ `
uniform highp sampler2D uTreeShadow;
uniform mat4 uLightMat;
uniform float uShadowOn;
float treeShadow(vec3 P) {
  if (uShadowOn < 0.5) return 1.0;
  vec4 l = uLightMat * vec4(P, 1.0);
  vec3 c = l.xyz * 0.5 + 0.5;
  if (c.x < 0.0 || c.y < 0.0 || c.x > 1.0 || c.y > 1.0 || c.z > 1.0) return 1.0;
  vec2 texel = 1.0 / vec2(textureSize(uTreeShadow, 0));
  float s = 0.0;
  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    float d = texture(uTreeShadow, c.xy + vec2(float(i), float(j)) * texel * 1.25).r;
    s += c.z - 0.0004 > d ? 0.0 : 1.0;
  }
  /* fade out toward the map's edge rather than stopping at a line */
  vec2 e = min(c.xy, 1.0 - c.xy);
  float edge = smoothstep(0.0, 0.08, min(e.x, e.y));
  return mix(1.0, s / 9.0, edge);
}
`;


/** The world width, in metres, over which the cloud coverage sheet repeats. */
const COVER_TILE = 26000;

/* Where the clouds are, shared by the clouds themselves and by the
   shadows they cast on the ground and the trees: a tiling coverage sheet
   drifting on the wind. The flight's gap through the layer is cut into
   the sheet itself (setClearings), so it costs nothing per sample. */
const CLOUD = /* glsl */ `
uniform sampler2D uCover;
uniform float uCloudTime;
uniform float uCoverage;
uniform float uCloudBase;
uniform float uCloudTop;
float coverAt(vec2 xz) {
  vec2 q = (xz + vec2(uCloudTime * 6.0, uCloudTime * 2.5)) / ${COVER_TILE.toFixed(1)};
  float c = textureLod(uCover, q, 0.0).r;
  c = clamp((c - (1.0 - uCoverage)) / max(uCoverage, 1e-3), 0.0, 1.0);
  return c;
}
float cloudShadow(vec3 wp) {
  float mid = mix(uCloudBase, uCloudTop, 0.3);
  float tt = (mid - wp.y) / max(uSun.y, 0.05);
  float c = coverAt(wp.xz + uSun.xz * tt);
  return 1.0 - 0.7 * smoothstep(0.05, 0.45, c);
}
`;

/* The elevation, as the vertex shaders read it: Catmull-Rom over the
   fine mosaic, handing over to the coarse one across its last 5%. */
const DEM = /* glsl */ `
uniform sampler2D uDemIn;
uniform sampler2D uDemOut;
uniform vec4 uRectIn;
uniform vec4 uRectOut;
float fetchH(sampler2D t, ivec2 p, int m) { return texelFetch(t, clamp(p, ivec2(0), ivec2(m)), 0).r; }
float demH(sampler2D t, vec4 rect, vec2 w) {
  vec2 p = (w - rect.xy) / rect.z * rect.w - 0.5;
  vec2 i = floor(p), f = p - i;
  vec2 w0 = f * (-0.5 + f * (1.0 - 0.5 * f));
  vec2 w1 = 1.0 + f * f * (-2.5 + 1.5 * f);
  vec2 w2 = f * (0.5 + f * (2.0 - 1.5 * f));
  vec2 w3 = f * f * (-0.5 + 0.5 * f);
  ivec2 b = ivec2(i) - 1;
  int m = int(rect.w) - 1;
  vec4 wx = vec4(w0.x, w1.x, w2.x, w3.x);
  vec4 wy = vec4(w0.y, w1.y, w2.y, w3.y);
  float s = 0.0;
  for (int y = 0; y < 4; y++) {
    vec4 row = vec4(fetchH(t, b + ivec2(0, y), m), fetchH(t, b + ivec2(1, y), m), fetchH(t, b + ivec2(2, y), m), fetchH(t, b + ivec2(3, y), m));
    s += wy[y] * dot(wx, row);
  }
  return s;
}
float height(vec2 w) {
  vec2 u = (w - uRectIn.xy) / uRectIn.z;
  vec2 e = min(u, 1.0 - u);
  float k = clamp(min(e.x, e.y) / 0.05, 0.0, 1.0);
  float ho = demH(uDemOut, uRectOut, w);
  if (k <= 0.0) return ho;
  return mix(ho, demH(uDemIn, uRectIn, w), k);
}
`;

const TERRAIN_VS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
layout(location = 0) in vec3 aGrid;
uniform vec4 uTile;
uniform vec3 uEye;
uniform mat4 uViewProj;
uniform vec3 uTexXform;
out vec3 vRel;
out vec2 vUv;
out vec2 vWorld;
out vec3 vIns;
out vec3 vT;

${DEM}
${ATMOS}
void main() {
  vec2 rel = uTile.xy + aGrid.xy * uTile.z;
  vec2 w = rel + uEye.xz;
  float h = height(w) - aGrid.z * uTile.w;
  float y = h - dot(rel, rel) / ${(2 * R_SIGHT).toFixed(1)} - uEye.y;
  vRel = vec3(rel.x, y, rel.y);
  vUv = uTexXform.xy + aGrid.xy * uTexXform.z;
  vWorld = w;
  /* the air between the eye and this vertex; it varies slowly across a
     tile, so per vertex is as good as per pixel at a fraction the cost */
  float dist = max(length(vRel), 1.0);
  vec3 T;
  vIns = scatter(vRel / dist, dist, 7, T);
  vT = T;
  gl_Position = uViewProj * vec4(vRel, 1.0);
}
`;

const TERRAIN_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
in vec3 vRel;
in vec2 vUv;
in vec2 vWorld;
in vec3 vIns;
in vec3 vT;
uniform sampler2D uImg;
uniform sampler2D uBakeIn;
uniform sampler2D uBakeOut;
uniform vec4 uRectIn;
uniform vec4 uRectOut;
uniform vec3 uSunE;
uniform vec3 uSkyE;
uniform vec3 uCapSun;
uniform float uDelight;
uniform float uExposure;
uniform float uVibrance;
uniform float uDebug;
out vec4 outColor;
${ATMOS}
${TREE_SHADOW}
${CLOUD}
vec4 bake(vec2 w) {
  vec2 u = (w - uRectIn.xy) / uRectIn.z;
  vec2 e = min(u, 1.0 - u);
  float k = clamp(min(e.x, e.y) / 0.05, 0.0, 1.0);
  vec4 bo = texture(uBakeOut, (w - uRectOut.xy) / uRectOut.z);
  if (k <= 0.0) return bo;
  return mix(bo, texture(uBakeIn, u), k);
}
void main() {
  vec3 alb = texture(uImg, vUv).rgb;
  vec4 b = bake(vWorld);
  vec3 n = vec3(b.r * 2.0 - 1.0, 0.0, b.g * 2.0 - 1.0);
  n.y = sqrt(max(1.0 - n.x * n.x - n.z * n.z, 0.0));
  float shadow = b.b * treeShadow(vRel) * cloudShadow(vec3(vWorld.x, vRel.y + uEyeAlt, vWorld.y));
  float sky = b.a;
  /* The photographs carry the light of the day they were taken: a high
     sun from the south-east. Divide that out, partly, so the valley's
     slopes take the film's sun rather than two suns at once. */
  float cap = max(dot(n, uCapSun), 0.05) / max(uCapSun.y, 0.05);
  alb /= mix(1.0, 0.35 + 0.65 * cap, uDelight);
  float ndl = max(dot(n, uSun), 0.0);
  vec3 E = uSunE * ndl * shadow + uSkyE * sky * (0.55 + 0.45 * n.y);
  /* The photographs are a dry-season pass seen through a satellite's
     haze: flat and grey-green. Vibrance lifts the colours that are
     already there, most where they are weakest, and leaves the red
     earth and white roofs alone. */
  float l = dot(alb, vec3(0.2126, 0.7152, 0.0722));
  float sat = max(alb.r, max(alb.g, alb.b)) - min(alb.r, min(alb.g, alb.b));
  alb = max(l + (alb - l) * (1.0 + uVibrance * (1.0 - clamp(sat * 4.0, 0.0, 1.0))), 0.0);
  if (uDebug > 0.5) alb = vec3(0.3);
  vec3 col = alb * E * 0.3183099;
  col = col * vT + vIns;
  outColor = vec4(col * uExposure, 1.0);
}
`;



/* ---- trees --------------------------------------------------------- *
   Every crown the imagery shows (scripts/dev/valley-film.mjs), stood up:
   one camera-facing quad per tree, and in it a ray traced against a
   clump of six lumps squashed to the crown's height, with a trunk under
   it. The silhouette is therefore true from any angle and the depth is
   the tree's own, so trees hide each other and the ground properly. */
const TREE_VS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aTree;
layout(location = 2) in vec4 aColor;
uniform vec3 uEye;
uniform mat4 uViewProj;
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform float uTreeFar;
uniform sampler2D uBakeIn;
uniform sampler2D uBakeOut;
${DEM}
${ATMOS}
${CLOUD}
out vec3 vPos;
flat out vec3 vBase;
flat out vec3 vTree;
flat out vec3 vAlb;
flat out vec3 vIns;
flat out vec3 vT;
flat out float vShadow;
void main() {
  vec2 rel = aTree.xy - uEye.xz;
  float g = height(aTree.xy);
  vec3 base = vec3(rel.x, g - dot(rel, rel) / ${(2 * R_SIGHT).toFixed(1)} - uEye.y - 0.5, rel.y);
  /* trees near the edge of the drawing range shrink away rather than
     stopping at a line */
  float fade = 1.0 - smoothstep(uTreeFar * 0.8, uTreeFar, length(rel));
  float r = aTree.z * fade, h = aTree.w * fade;
  vec3 mid = base + vec3(0.0, h * 0.5, 0.0);
  /* the card is the tree's bounding cylinder seen from here, a little
     generous for perspective, and no bigger: overlapping cards are what
     a dense canopy costs */
  float upY = abs(uCamUp.y);
  float hw = r * 1.18;
  float hh = h * 0.5 * upY + r * 1.18 * sqrt(max(1.0 - upY * upY, 0.0)) + r * 0.12;
  vPos = mid + uCamRight * aCorner.x * hw + uCamUp * aCorner.y * hh;
  vBase = base;
  vTree = vec3(max(r, 0.01), max(h, 0.01), aColor.w);
  vAlb = aColor.rgb;
  float dist = length(mid);
  vec3 T;
  vIns = scatter(mid / dist, dist, 6, T);
  vT = T;
  /* the hills' shadow, from the bake, at the crown */
  vec2 u = (aTree.xy - uRectIn.xy) / uRectIn.z;
  vec2 e = min(u, 1.0 - u);
  float k = clamp(min(e.x, e.y) / 0.05, 0.0, 1.0);
  float so = textureLod(uBakeOut, (aTree.xy - uRectOut.xy) / uRectOut.z, 0.0).b;
  vShadow = (k > 0.0 ? mix(so, textureLod(uBakeIn, u, 0.0).b, k) : so) * cloudShadow(vec3(aTree.x, g + h * 0.7, aTree.y));
  gl_Position = uViewProj * vec4(vPos, 1.0);
}
`;

const TREE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vPos;
flat in vec3 vBase;
flat in vec3 vTree;
flat in vec3 vAlb;
flat in vec3 vIns;
flat in vec3 vT;
flat in float vShadow;
uniform mat4 uViewProj;
uniform vec3 uEye;
uniform vec3 uSun;
uniform vec3 uSunE;
uniform vec3 uSkyE;
uniform float uExposure;
uniform float uPixelAngle;
out vec4 outColor;
${TREE_HIT}
${TREE_SHADOW}
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
void main() {
  vec3 rd = normalize(vPos);
  vec3 N; int id; float q; bool trunk;
  float best = treeHit(vec3(0.0), rd, vBase, vTree, N, id, q, trunk);
  if (best > 1e8) discard;
  vec3 P = rd * best;
  vec3 wp = P + uEye;
  float r = vTree.x, h = vTree.y;
  float ch = r * crownSquash(vTree);
  vec3 alb;
  float ao;
  if (trunk) {
    alb = vec3(0.04, 0.034, 0.028);
    ao = 0.55;
  } else {
    /* tufts two metres across, lit and shaded; a crown seen from a
       hundred metres is a dark mass with bright tops, not a bumpy ball.
       Once a pixel covers most of a tuft, they are left out. */
    float n1 = 0.6, n2 = 0.5;
    if (best * uPixelAngle < 0.8) {
      vec3 bump = vec3(vnoise(wp * 0.8 + 1.3), vnoise(wp * 0.8 + 5.2), vnoise(wp * 0.8 + 9.1)) - 0.5;
      N = normalize(N + bump * 0.6);
      n1 = vnoise(wp * 0.55 + 3.0); n2 = vnoise(wp * 1.9 + 7.7);
    }
    float yr = (P.y - (vBase.y + h - ch)) / ch;
    ao = mix(0.22, 1.0, smoothstep(-1.0, 0.75, yr)) * (id == 0 ? 0.75 : 1.0) * (0.55 + 0.45 * n1);
    /* the photographs' canopy colour, lifted back to a leaf's albedo, and
       turned a little per tree: neem, tamarind and mango are not one green */
    float s1 = fract(vTree.z * 91.7), s2 = fract(vTree.z * 37.3);
    vec3 tint = vec3(1.0 + 0.22 * (s1 - 0.5), 1.0 + 0.1 * (s2 - 0.5), 1.0 - 0.16 * (s1 - 0.5));
    alb = vAlb * 1.45 * tint * (0.8 + 0.4 * n2);
  }
  float sh = vShadow * treeShadow(P);
  float ndl = dot(N, uSun);
  float lit = max((ndl + 0.15) / 1.15, 0.0);
  vec3 col = alb * (uSunE * lit * sh * (0.35 + 0.65 * ao) + uSkyE * ao * ao * (0.35 + 0.65 * max(N.y, 0.0))) * 0.3183099;
  /* leaves with the sun behind them glow a little */
  col += alb * uSunE * sh * 0.3 * pow(max(dot(rd, uSun), 0.0), 5.0);
  col = col * vT + vIns;
  vec4 clip = uViewProj * vec4(P, 1.0);
  gl_FragDepth = clip.z / clip.w * 0.5 + 0.5;
  float alpha = clamp(q / max(fwidth(q) * 1.2, 1e-4), 0.0, 1.0);
  outColor = vec4(col * uExposure, alpha);
}
`;


/* The trees again, seen from the sun, for the shadow map: the same
   crowns, traced along the sunlight, writing only depth. */
const TREE_SHADOW_VS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
layout(location = 0) in vec2 aCorner;
layout(location = 1) in vec4 aTree;
layout(location = 2) in vec4 aColor;
uniform vec3 uEye;
uniform mat4 uLightMat;
uniform vec3 uLightRight;
uniform vec3 uLightUp;
${DEM}
out vec3 vPos;
flat out vec3 vBase;
flat out vec3 vTree;
void main() {
  vec2 rel = aTree.xy - uEye.xz;
  float g = height(aTree.xy);
  vec3 base = vec3(rel.x, g - dot(rel, rel) / ${(2 * R_SIGHT).toFixed(1)} - uEye.y - 0.5, rel.y);
  float r = aTree.z, h = aTree.w;
  vec3 mid = base + vec3(0.0, h * 0.5, 0.0);
  float halfSize = max(r * 1.5, h * 0.62);
  vPos = mid + (uLightRight * aCorner.x + uLightUp * aCorner.y) * halfSize;
  vBase = base;
  vTree = vec3(r, h, aColor.w);
  gl_Position = uLightMat * vec4(vPos, 1.0);
}
`;

const TREE_SHADOW_FS = /* glsl */ `#version 300 es
precision highp float;
in vec3 vPos;
flat in vec3 vBase;
flat in vec3 vTree;
uniform mat4 uLightMat;
uniform vec3 uSun;
out vec4 outColor;
${TREE_HIT}
void main() {
  vec3 o = vPos + uSun * 200.0;
  vec3 N; int id; float q; bool trunk;
  float t = treeHit(o, -uSun, vBase, vTree, N, id, q, trunk);
  if (t > 1e8) discard;
  vec4 l = uLightMat * vec4(o - uSun * t, 1.0);
  gl_FragDepth = l.z * 0.5 + 0.5;
  outColor = vec4(0.0);
}
`;


/* The clouds: a half-resolution pass marching each view ray through the
   cumulus layer, lit by the sun through the cloud itself (five samples
   toward it), with the powder darkening of a cloud's sunlit edges and a
   forward-scattering lobe for silver linings; hazed by the same air as
   everything else, and stopped where the ground or a tree is nearer. */
const CLOUD_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 vUv;
uniform mat4 uInvViewProj;
uniform vec3 uEye;
uniform vec3 uFwd;
uniform sampler2D uDepth;
uniform vec2 uNearFar;
uniform highp sampler3D uNoise;
uniform vec3 uSunC;
uniform vec3 uAmbTop;
uniform vec3 uAmbBot;
uniform float uExposure;
out vec4 outColor;
${ATMOS}
${CLOUD}
float altOf(vec3 p) { return length(vec3(p.x, p.y + RG + uEye.y, p.z)) - RG; }
float density(vec3 p, float lod) {
  float alt = altOf(p);
  float hf = (alt - uCloudBase) / (uCloudTop - uCloudBase);
  if (hf <= 0.0 || hf >= 1.0) return 0.0;
  vec3 wp = p + uEye;
  float cov = coverAt(wp.xz);
  if (cov <= 0.01) return 0.0;
  /* A cumulus: a flat base, sides that narrow as they rise, and a
     billowing top whose height the low-frequency noise varies, so a
     field of them is not a field of equal loaves. */
  vec3 q = wp / 3000.0 + vec3(uCloudTime * 0.0011, 0.0, uCloudTime * 0.0005);
  vec4 n = textureLod(uNoise, q, lod);
  float top = clamp(0.35 + 0.65 * cov * (0.6 + 0.8 * n.a), 0.2, 1.0);
  float grad = smoothstep(0.0, 0.05, hf) * (1.0 - smoothstep(top * 0.45, top, hf));
  float covH = cov * (1.0 - 0.55 * hf * hf);
  float bc = n.r * grad;
  float c = clamp((bc - (1.0 - covH)) / max(covH, 1e-3), 0.0, 1.0) * covH;
  if (c <= 0.0) return 0.0;
  /* the edges: wisps at the base, cauliflower on top */
  float det = textureLod(uNoise, wp / 520.0 + vec3(0.31, uCloudTime * 0.004, 0.73), lod + 1.0).b;
  float dm = mix(det, 1.0 - det, clamp(hf * 5.0, 0.0, 1.0));
  return clamp((c - dm * 0.28) / (1.0 - dm * 0.28), 0.0, 1.0);
}
float hg(float mu, float g) { float g2 = g * g; return (1.0 - g2) / (12.566371 * pow(max(1.0 + g2 - 2.0 * g * mu, 1e-4), 1.5)); }
void main() {
  vec4 qq = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(qq.xyz / qq.w);
  float zb = texture(uDepth, vUv).r;
  float sceneT = 1e9;
  if (zb < 1.0) {
    float zn = zb * 2.0 - 1.0;
    float ze = 2.0 * uNearFar.x * uNearFar.y / (uNearFar.y + uNearFar.x - zn * (uNearFar.y - uNearFar.x));
    sceneT = ze / max(dot(rd, uFwd), 1e-3);
  }
  float r0 = RG + uEye.y;
  float b = r0 * rd.y;
  float rb = RG + uCloudBase, rt = RG + uCloudTop;
  float dB = b * b - (r0 * r0 - rb * rb), dT = b * b - (r0 * r0 - rt * rt);
  float dG = b * b - (r0 * r0 - RG * RG);
  float t0 = 0.0, t1 = 0.0;
  if (uEye.y < uCloudBase) {
    if (rd.y < -0.02) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    t0 = -b + sqrt(max(dB, 0.0)); t1 = -b + sqrt(max(dT, 0.0));
  } else if (uEye.y < uCloudTop) {
    t0 = 0.0;
    float down = -b - sqrt(max(dB, 0.0));
    t1 = (dB > 0.0 && down > 0.0) ? down : -b + sqrt(max(dT, 0.0));
  } else {
    float enter = -b - sqrt(max(dT, 0.0));
    if (dT < 0.0 || enter < 0.0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
    t0 = enter;
    float down = -b - sqrt(max(dB, 0.0));
    t1 = (dB > 0.0 && down > 0.0) ? down : -b + sqrt(dT);
  }
  if (dG > 0.0 && -b - sqrt(dG) > 0.0) t1 = min(t1, -b - sqrt(dG));
  t1 = min(min(t1, sceneT), t0 + 70000.0);
  if (t1 <= t0) { outColor = vec4(0.0, 0.0, 0.0, 1.0); return; }
  float dt = clamp((t1 - t0) / 64.0, 30.0, 320.0);
  /* each pixel starts its march at a different fraction of a step
     (interleaved gradient noise), which turns step banding into a fine
     grain the upsample then softens */
  float t = t0 + dt * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  float T = 1.0;
  vec3 L = vec3(0.0);
  float tw = 0.0, wsum = 0.0;
  float mu = dot(rd, uSun);
  float ph = mix(hg(mu, 0.72), hg(mu, -0.22), 0.3);
  for (int i = 0; i < 128; i++) {
    if (t >= t1 || T < 0.02) break;
    vec3 p = rd * t;
    /* the noise's detail level for how big a pixel is at this distance */
    float lod = max(0.0, log2(t * 0.0022 / 47.0 + 1e-4) + 1.0);
    float d = density(p, lod);
    if (d > 0.002) {
      float sigma = d * 0.045;
      float od = 0.0, s0 = 0.0, s1 = 40.0;
      for (int j = 0; j < 4; j++) {
        od += density(p + uSun * (0.5 * (s0 + s1)), lod + float(j) * 0.5) * (s1 - s0);
        s0 = s1; s1 *= 2.8;
      }
      /* two exponentials: the sunlight straight through, and a softer
         term for the light scattered many times inside, which is what
         keeps a cloud's shaded side grey rather than black */
      float Tl = exp(-od * 0.045) * 0.8 + exp(-od * 0.008) * 0.2;
      float powder = 1.0 - exp(-sigma * 110.0);
      float hf = clamp((altOf(p) - uCloudBase) / (uCloudTop - uCloudBase), 0.0, 1.0);
      vec3 S = uSunC * Tl * ph * 4.2 * mix(0.45, 1.0, powder) + mix(uAmbBot, uAmbTop, sqrt(hf)) * mix(0.5, 1.0, hf);
      float Ts = exp(-sigma * dt);
      L += T * S * (1.0 - Ts);
      tw += t * T * (1.0 - Ts);
      wsum += T * (1.0 - Ts);
      T *= Ts;
    }
    t += d > 0.002 ? dt : dt * 1.5;
  }
  if (wsum > 0.0) {
    vec3 Ta;
    vec3 ins = scatter(rd, tw / wsum, 8, Ta);
    L = L * Ta + ins * (1.0 - T);
  }
  outColor = vec4(L * uExposure, T);
}
`;

const COMPOSITE_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uCloud;
out vec4 outColor;
void main() {
  /* the half-resolution clouds, upsampled through a tent, which softens
     the march's grain the way a lens would */
  vec2 px = 1.0 / vec2(textureSize(uCloud, 0));
  vec4 c = texture(uCloud, vUv) * 0.25
    + (texture(uCloud, vUv + vec2(px.x, 0.0)) + texture(uCloud, vUv - vec2(px.x, 0.0)) + texture(uCloud, vUv + vec2(0.0, px.y)) + texture(uCloud, vUv - vec2(0.0, px.y))) * 0.125
    + (texture(uCloud, vUv + px) + texture(uCloud, vUv - px) + texture(uCloud, vUv + vec2(px.x, -px.y)) + texture(uCloud, vUv + vec2(-px.x, px.y))) * 0.0625;
  outColor = vec4(texture(uScene, vUv).rgb * c.a + c.rgb, 1.0);
}
`;

const FULL_VS = /* glsl */ `#version 300 es
precision highp float;
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 1.0, 1.0);
}
`;

const SKY_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform mat4 uInvViewProj;
uniform float uExposure;
out vec4 outColor;
${ATMOS}
void main() {
  vec4 q = uInvViewProj * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
  vec3 rd = normalize(q.xyz / q.w);
  vec3 T;
  /* below the horizon the ground would be; the terrain covers it, and
     where it does not (past the edge of the world) the air stands in */
  float tMax = toSpace(rd);
  float r0 = RG + uEyeAlt;
  float b = r0 * rd.y, c = r0 * r0 - RG * RG, disc = b * b - c;
  if (disc > 0.0 && -b - sqrt(disc) > 0.0) tMax = -b - sqrt(disc);
  vec3 L = scatter(rd, tMax, 20, T);
  /* the sun itself, 0.53 degrees across, limb-darkened */
  float mu = dot(rd, uSun);
  float cosR = cos(0.00465);
  if (mu > cosR) {
    float x = clamp((1.0 - mu) / (1.0 - cosR), 0.0, 1.0);
    float limb = 1.0 - 0.6 * (1.0 - sqrt(1.0 - x));
    L += T * sunT(uEyeAlt, uSun.y) * 20000.0 * limb * step(-b - sqrt(max(disc, 0.0)), 0.0);
  }
  outColor = vec4(L * uExposure, 1.0);
}
`;

const BAKE_FS = /* glsl */ `#version 300 es
precision highp float;
precision highp sampler2D;
uniform sampler2D uH;
uniform sampler2D uHOut;
uniform vec4 uRect;
uniform vec4 uRectOut;
uniform vec3 uSun;
out vec4 outColor;
float hAt(vec2 w) {
  vec2 u = (w - uRect.xy) / uRect.z * uRect.w - 0.5;
  if (u.x >= 0.0 && u.y >= 0.0 && u.x < uRect.w - 1.0 && u.y < uRect.w - 1.0) {
    ivec2 i = ivec2(floor(u)); vec2 f = fract(u);
    float a = texelFetch(uH, i, 0).r, b = texelFetch(uH, i + ivec2(1, 0), 0).r;
    float c = texelFetch(uH, i + ivec2(0, 1), 0).r, d = texelFetch(uH, i + ivec2(1, 1), 0).r;
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  vec2 v = clamp((w - uRectOut.xy) / uRectOut.z * uRectOut.w - 0.5, vec2(0.0), vec2(uRectOut.w - 2.0));
  ivec2 i = ivec2(floor(v)); vec2 f = fract(v);
  float a = texelFetch(uHOut, i, 0).r, b = texelFetch(uHOut, i + ivec2(1, 0), 0).r;
  float c = texelFetch(uHOut, i + ivec2(0, 1), 0).r, d = texelFetch(uHOut, i + ivec2(1, 1), 0).r;
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
void main() {
  ivec2 ij = ivec2(gl_FragCoord.xy);
  float px = uRect.z / uRect.w;
  int m = int(uRect.w) - 1;
  vec2 w = uRect.xy + (vec2(ij) + 0.5) * px;
  float h0 = texelFetch(uH, ij, 0).r;
  float hx = texelFetch(uH, clamp(ij + ivec2(1, 0), ivec2(0), ivec2(m)), 0).r - texelFetch(uH, clamp(ij - ivec2(1, 0), ivec2(0), ivec2(m)), 0).r;
  float hz = texelFetch(uH, clamp(ij + ivec2(0, 1), ivec2(0), ivec2(m)), 0).r - texelFetch(uH, clamp(ij - ivec2(0, 1), ivec2(0), ivec2(m)), 0).r;
  vec3 n = normalize(vec3(-hx / (2.0 * px), 1.0, -hz / (2.0 * px)));
  /* cast shadow: march toward the sun; the fraction of the sun's disc
     (0.53 degrees) left above the highest thing in the way */
  vec2 sd = normalize(uSun.xz);
  float tanEl = uSun.y / length(uSun.xz);
  float vis = 1.0;
  float t = px * 0.75;
  for (int i = 0; i < 90; i++) {
    float hq = hAt(w + sd * t) - t * t / ${(2 * R_SIGHT).toFixed(1)};
    float ray = h0 + 1.5 + t * tanEl;
    float ang = (hq - ray) / t;
    vis = min(vis, clamp(0.5 - ang / 0.0093, 0.0, 1.0));
    t *= 1.075;
    if (t > 30000.0 || vis <= 0.0) break;
  }
  /* sky: how much of the sky each point sees, from the horizon's height
     in eight directions */
  float open = 0.0;
  for (int k = 0; k < 8; k++) {
    float a = float(k) * 0.7853982 + 0.39;
    vec2 d = vec2(cos(a), sin(a));
    float horizon = 0.0;
    float s = px;
    for (int i = 0; i < 14; i++) {
      horizon = max(horizon, (hAt(w + d * s) - h0) / s);
      s *= 1.45;
    }
    open += 1.0 - sin(atan(horizon));
  }
  open /= 8.0;
  outColor = vec4(n.x * 0.5 + 0.5, n.z * 0.5 + 0.5, vis, open);
}
`;

const BRIGHT_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
uniform float uFirst;
out vec4 outColor;
void main() {
  /* 13-tap box downsample (Jimenez 2014); the first pass keeps only what
     is brighter than paper, so the bloom is the sun and not the ground */
  vec3 a = texture(uSrc, vUv + uTexel * vec2(-2.0, -2.0)).rgb, b = texture(uSrc, vUv + uTexel * vec2(0.0, -2.0)).rgb, c = texture(uSrc, vUv + uTexel * vec2(2.0, -2.0)).rgb;
  vec3 d = texture(uSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb, e = texture(uSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb;
  vec3 f = texture(uSrc, vUv + uTexel * vec2(-2.0, 0.0)).rgb, g = texture(uSrc, vUv).rgb, h = texture(uSrc, vUv + uTexel * vec2(2.0, 0.0)).rgb;
  vec3 i = texture(uSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb, j = texture(uSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  vec3 k = texture(uSrc, vUv + uTexel * vec2(-2.0, 2.0)).rgb, l = texture(uSrc, vUv + uTexel * vec2(0.0, 2.0)).rgb, m = texture(uSrc, vUv + uTexel * vec2(2.0, 2.0)).rgb;
  vec3 s = (d + e + i + j) * 0.125 + (a + b + f + g) * 0.03125 + (b + c + g + h) * 0.03125 + (f + g + k + l) * 0.03125 + (g + h + l + m) * 0.03125;
  if (uFirst > 0.5) {
    float lum = dot(s, vec3(0.2126, 0.7152, 0.0722));
    s *= max(lum - 1.2, 0.0) / max(lum, 1e-4);
    s = min(s, vec3(60.0));
  }
  outColor = vec4(s, 1.0);
}
`;

const UP_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uSrc;
uniform vec2 uTexel;
out vec4 outColor;
void main() {
  vec3 s = texture(uSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture(uSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb
    + texture(uSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture(uSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb
    + 2.0 * (texture(uSrc, vUv + uTexel * vec2(0.0, -1.0)).rgb + texture(uSrc, vUv + uTexel * vec2(0.0, 1.0)).rgb
    + texture(uSrc, vUv + uTexel * vec2(-1.0, 0.0)).rgb + texture(uSrc, vUv + uTexel * vec2(1.0, 0.0)).rgb)
    + 4.0 * texture(uSrc, vUv).rgb;
  outColor = vec4(s / 16.0, 1.0);
}
`;

const FINAL_FS = /* glsl */ `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomK;
uniform float uPower;
uniform float uSat;
out vec4 outColor;
/* AgX, Troy Sobotka's display transform, in Benjamin Wrensch's minimal
   fit: it rolls a bright sky off to white without the hue shifts that
   turn a sunset's orange into yellow */
vec3 agxContrast(vec3 x) {
  vec3 x2 = x * x, x4 = x2 * x2;
  return 15.5 * x4 * x2 - 40.14 * x4 * x + 31.96 * x4 - 6.868 * x2 * x + 0.4298 * x2 + 0.1191 * x - 0.00232;
}
vec3 agx(vec3 v) {
  const mat3 m = mat3(0.842479062253094, 0.0423282422610123, 0.0423756549057051,
    0.0784335999999992, 0.878468636469772, 0.0784336,
    0.0792237451477643, 0.0791661274605434, 0.879142973793104);
  const mat3 mi = mat3(1.19687900512017, -0.0528968517574562, -0.0529716355144438,
    -0.0980208811401368, 1.15190312990417, -0.0980434501171241,
    -0.0990297440797205, -0.0989611768448433, 1.15107367264116);
  v = m * max(v, vec3(1e-10));
  v = clamp(log2(v), -12.47393, 4.026069);
  v = (v + 12.47393) / 16.500999;
  v = agxContrast(v);
  /* AgX's base look is grey by design; its "punchy" look raises the
     contrast and the saturation, which is what a graded aerial wants */
  v = pow(max(v, vec3(0.0)), vec3(uPower));
  float l = dot(v, vec3(0.2126, 0.7152, 0.0722));
  v = l + uSat * (v - l);
  return mi * v;
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = texture(uScene, vUv).rgb + texture(uBloom, vUv).rgb * uBloomK;
  vec3 o = agx(c);
  /* a soft edge to the frame, the way a lens has one */
  vec2 q = vUv - 0.5;
  o *= 1.0 - 0.22 * dot(q, q) * 2.0;
  /* dither, so the sky's long gradients never band */
  o += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(clamp(o, 0.0, 1.0), 1.0);
}
`;

/* ---- plumbing ---------------------------------------------------------- */

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const make = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      throw new Error(`shader: ${log}\n${src.split("\n").map((l, i) => `${i + 1}: ${l}`).join("\n").slice(0, 4000)}`);
    }
    return s;
  };
  const p = gl.createProgram()!;
  gl.attachShader(p, make(gl.VERTEX_SHADER, vs));
  gl.attachShader(p, make(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(`link: ${gl.getProgramInfoLog(p)}`);
  const u = new Map<string, WebGLUniformLocation | null>();
  return {
    p,
    u: (name: string) => {
      if (!u.has(name)) u.set(name, gl.getUniformLocation(p, name));
      return u.get(name)!;
    },
  };
}
type Prog = ReturnType<typeof compile>;

const GRID = 32;

function gridMesh(gl: WebGL2RenderingContext) {
  const n = GRID + 1;
  const verts: number[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) verts.push(i / GRID, j / GRID, 0);
  /* the skirt: every edge vertex again, dropped, so a finer neighbour's
     extra vertices never open a crack to the sky */
  const skirt = new Map<number, number>();
  const edge = (i: number, j: number) => {
    const k = j * n + i;
    if (!skirt.has(k)) { skirt.set(k, verts.length / 3); verts.push(i / GRID, j / GRID, 1); }
    return skirt.get(k)!;
  };
  const idx: number[] = [];
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
    const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const ring: [number, number][] = [];
  for (let i = 0; i < GRID; i++) ring.push([i, 0]);
  for (let j = 0; j < GRID; j++) ring.push([GRID, j]);
  for (let i = GRID; i > 0; i--) ring.push([i, GRID]);
  for (let j = GRID; j > 0; j--) ring.push([0, j]);
  for (let r = 0; r < ring.length; r++) {
    const [i0, j0] = ring[r], [i1, j1] = ring[(r + 1) % ring.length];
    const a = j0 * n + i0, b = j1 * n + i1;
    const sa = edge(i0, j0), sb = edge(i1, j1);
    idx.push(a, sa, b, b, sa, sb);
  }
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  const vb = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const ib = gl.createBuffer()!;
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: idx.length };
}

type Target = { fb: WebGLFramebuffer; tex: WebGLTexture; w: number; h: number };

function colorTarget(gl: WebGL2RenderingContext, w: number, h: number, format: number = gl.RGBA16F): Target {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, format, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  return { fb, tex, w, h };
}

/* ---- matrices ------------------------------------------------------------ */

type M4 = Float32Array;
function perspective(fovY: number, aspect: number, near: number, far: number): M4 {
  const f = 1 / Math.tan((fovY * Math.PI) / 360);
  const m = new Float32Array(16);
  m[0] = f / aspect; m[5] = f;
  m[10] = (far + near) / (near - far); m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}
function viewRot(v: View): M4 {
  const { right: r, up: u, fwd: f } = v;
  return new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, 0, 0, 0, 1]);
}
function mul(a: M4, b: M4): M4 {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
    o[c * 4 + r] = s;
  }
  return o;
}
function invert(m: M4): M4 {
  const inv = new Float32Array(16);
  const a = m;
  inv[0] = a[5] * a[10] * a[15] - a[5] * a[11] * a[14] - a[9] * a[6] * a[15] + a[9] * a[7] * a[14] + a[13] * a[6] * a[11] - a[13] * a[7] * a[10];
  inv[4] = -a[4] * a[10] * a[15] + a[4] * a[11] * a[14] + a[8] * a[6] * a[15] - a[8] * a[7] * a[14] - a[12] * a[6] * a[11] + a[12] * a[7] * a[10];
  inv[8] = a[4] * a[9] * a[15] - a[4] * a[11] * a[13] - a[8] * a[5] * a[15] + a[8] * a[7] * a[13] + a[12] * a[5] * a[11] - a[12] * a[7] * a[9];
  inv[12] = -a[4] * a[9] * a[14] + a[4] * a[10] * a[13] + a[8] * a[5] * a[14] - a[8] * a[6] * a[13] - a[12] * a[5] * a[10] + a[12] * a[6] * a[9];
  inv[1] = -a[1] * a[10] * a[15] + a[1] * a[11] * a[14] + a[9] * a[2] * a[15] - a[9] * a[3] * a[14] - a[13] * a[2] * a[11] + a[13] * a[3] * a[10];
  inv[5] = a[0] * a[10] * a[15] - a[0] * a[11] * a[14] - a[8] * a[2] * a[15] + a[8] * a[3] * a[14] + a[12] * a[2] * a[11] - a[12] * a[3] * a[10];
  inv[9] = -a[0] * a[9] * a[15] + a[0] * a[11] * a[13] + a[8] * a[1] * a[15] - a[8] * a[3] * a[13] - a[12] * a[1] * a[11] + a[12] * a[3] * a[9];
  inv[13] = a[0] * a[9] * a[14] - a[0] * a[10] * a[13] - a[8] * a[1] * a[14] + a[8] * a[2] * a[13] + a[12] * a[1] * a[10] - a[12] * a[2] * a[9];
  inv[2] = a[1] * a[6] * a[15] - a[1] * a[7] * a[14] - a[5] * a[2] * a[15] + a[5] * a[3] * a[14] + a[13] * a[2] * a[7] - a[13] * a[3] * a[6];
  inv[6] = -a[0] * a[6] * a[15] + a[0] * a[7] * a[14] + a[4] * a[2] * a[15] - a[4] * a[3] * a[14] - a[12] * a[2] * a[7] + a[12] * a[3] * a[6];
  inv[10] = a[0] * a[5] * a[15] - a[0] * a[7] * a[13] - a[4] * a[1] * a[15] + a[4] * a[3] * a[13] + a[12] * a[1] * a[7] - a[12] * a[3] * a[5];
  inv[14] = -a[0] * a[5] * a[14] + a[0] * a[6] * a[13] + a[4] * a[1] * a[14] - a[4] * a[2] * a[13] - a[12] * a[1] * a[6] + a[12] * a[2] * a[5];
  inv[3] = -a[1] * a[6] * a[11] + a[1] * a[7] * a[10] + a[5] * a[2] * a[11] - a[5] * a[3] * a[10] - a[9] * a[2] * a[7] + a[9] * a[3] * a[6];
  inv[7] = a[0] * a[6] * a[11] - a[0] * a[7] * a[10] - a[4] * a[2] * a[11] + a[4] * a[3] * a[10] + a[8] * a[2] * a[7] - a[8] * a[3] * a[6];
  inv[11] = -a[0] * a[5] * a[11] + a[0] * a[7] * a[9] + a[4] * a[1] * a[11] - a[4] * a[3] * a[9] - a[8] * a[1] * a[7] + a[8] * a[3] * a[5];
  inv[15] = a[0] * a[5] * a[10] - a[0] * a[6] * a[9] - a[4] * a[1] * a[10] + a[4] * a[2] * a[9] + a[8] * a[1] * a[6] - a[8] * a[2] * a[5];
  const det = a[0] * inv[0] + a[1] * inv[4] + a[2] * inv[8] + a[3] * inv[12];
  for (let i = 0; i < 16; i++) inv[i] /= det;
  return inv;
}

/* ---- the CPU's own copy of the air, for the light that reaches the ground */

const BR = [5.802e-6, 13.558e-6, 33.1e-6];
const BO = [0.65e-6, 1.881e-6, 0.085e-6];
const RG = 6360e3;
function chapman(X: number, h: number, cz: number) {
  const c = Math.sqrt(1.5707963 * (X + h));
  if (cz >= 0) return (c / ((c - 1) * cz + 1)) * Math.exp(-h);
  const x0 = Math.sqrt(1 - cz * cz) * (X + h);
  const c0 = Math.sqrt(1.5707963 * x0);
  return 2 * c0 * Math.exp(X - x0) - (c / ((c - 1) * -cz + 1)) * Math.exp(-h);
}
export function sunlightAt(alt: number, cz: number, look: Look): number[] {
  const tR = 8000 * chapman(RG / 8000, alt / 8000, cz);
  const tM = look.mieH * chapman(RG / look.mieH, alt / look.mieH, cz);
  const s = (RG + alt) / (RG + 25000);
  const mO = 1 / Math.sqrt(Math.max(1 - s * s * (1 - cz * cz), 0.004));
  return BR.map((b, i) => Math.exp(-(b * tR + (look.mie / 0.9) * tM + BO[i] * 15000 * mO)));
}

/* ---- the renderer ------------------------------------------------------- */

type TileTex = { tex: WebGLTexture | null; state: "loading" | "ready" | "failed"; used: number };

export class ValleyRenderer {
  private gl: WebGL2RenderingContext;
  private terrain: Prog;
  private sky: Prog;
  private bakeP: Prog;
  private brightP: Prog;
  private upP: Prog;
  private finalP: Prog;
  private grid: { vao: WebGLVertexArrayObject; count: number };
  private empty: WebGLVertexArrayObject;
  private demTex: { inner: WebGLTexture; outer: WebGLTexture };
  private bakeTex: { inner: WebGLTexture; outer: WebGLTexture } | null = null;
  private tiles = new Map<string, TileTex>();
  private blobs = new Map<string, Blob>();
  private available: Set<string>;
  private inflight = 0;
  private frame = 0;
  private aniso: number;
  private anisoExt: EXT_texture_filter_anisotropic | null;
  private msaa: { fb: WebGLFramebuffer; rb: WebGLRenderbuffer; depth: WebGLRenderbuffer; w: number; h: number } | null = null;
  private scene: Target | null = null;
  private blooms: Target[] = [];
  private rangeCache = new Map<string, [number, number]>();
  private treeP: Prog;
  private treeVao: WebGLVertexArrayObject;
  private treeBuf: WebGLBuffer;
  private treeData: Float32Array;
  private treeCells = new Map<number, [number, number]>();
  private treeScratch: Float32Array;
  private static CELL = 250;
  private shadowP: Prog;
  private shadowFb: WebGLFramebuffer;
  private shadowTex: WebGLTexture;
  private static SHADOW = 2048;
  private cloudP: Prog;
  private compP: Prog;
  private noiseTex: WebGLTexture;
  private coverTex: WebGLTexture;
  private depthT: { fb: WebGLFramebuffer; tex: WebGLTexture } | null = null;
  private cloudT: Target | null = null;
  private compT: Target | null = null;
  /** film seconds, for the clouds' drift */
  time = 0;
  /** the cloud layer: base and top, metres above sea level, and how much
   *  of the sky it covers */
  clouds = { base: 2050, top: 3350, coverage: 0.42 };
  look: Look;

  constructor(
    private canvas: HTMLCanvasElement,
    private inner: Dem,
    private outer: Dem,
    available: string[],
    private base: string,
    look: Look,
    trees: Float32Array = new Float32Array(0),
  ) {
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    if (!gl) throw new Error("This browser has no WebGL2.");
    if (!gl.getExtension("EXT_color_buffer_float")) throw new Error("This browser cannot render to float buffers.");
    this.gl = gl;
    this.look = look;
    this.available = new Set(available);
    this.anisoExt = gl.getExtension("EXT_texture_filter_anisotropic");
    this.aniso = this.anisoExt ? Math.min(16, gl.getParameter(this.anisoExt.MAX_TEXTURE_MAX_ANISOTROPY_EXT)) : 1;
    this.terrain = compile(gl, TERRAIN_VS, TERRAIN_FS);
    this.sky = compile(gl, FULL_VS, SKY_FS);
    this.bakeP = compile(gl, FULL_VS, BAKE_FS);
    this.brightP = compile(gl, FULL_VS, BRIGHT_FS);
    this.upP = compile(gl, FULL_VS, UP_FS);
    this.finalP = compile(gl, FULL_VS, FINAL_FS);
    this.grid = gridMesh(gl);
    this.empty = gl.createVertexArray()!;
    this.demTex = { inner: this.heightTexture(inner), outer: this.heightTexture(outer) };
    this.bake();
    /* the trees, sorted into 250 m cells so a frame gathers only the ones
       near enough to matter */
    this.treeP = compile(gl, TREE_VS, TREE_FS);
    this.cloudP = compile(gl, FULL_VS, CLOUD_FS);
    this.compP = compile(gl, FULL_VS, COMPOSITE_FS);
    const N = 64;
    this.noiseTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_3D, this.noiseTex);
    gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA8, N, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, cloudNoise(N));
    gl.generateMipmap(gl.TEXTURE_3D);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, w, gl.REPEAT);
    this.coverTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.coverTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, cloudCover(256));
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    this.shadowP = compile(gl, TREE_SHADOW_VS, TREE_SHADOW_FS);
    this.shadowTex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.shadowTex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT32F, ValleyRenderer.SHADOW, ValleyRenderer.SHADOW);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.shadowFb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.shadowTex, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const n = trees.length / 8;
    const C = ValleyRenderer.CELL;
    const keys = new Float64Array(n);
    for (let i = 0; i < n; i++) keys[i] = (Math.floor(trees[i * 8 + 1] / C) + 1000) * 4096 + (Math.floor(trees[i * 8] / C) + 1000);
    const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => keys[a] - keys[b]);
    this.treeData = new Float32Array(trees.length);
    order.forEach((src, dst) => this.treeData.set(trees.subarray(src * 8, src * 8 + 8), dst * 8));
    for (let i = 0; i < n; i++) {
      const k = keys[order[i]];
      const c = this.treeCells.get(k);
      if (c) c[1] = i + 1; else this.treeCells.set(k, [i, i + 1]);
    }
    this.treeScratch = new Float32Array(this.treeData.length);
    this.treeVao = gl.createVertexArray()!;
    gl.bindVertexArray(this.treeVao);
    const quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.treeBuf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.treeBuf);
    gl.bufferData(gl.ARRAY_BUFFER, Math.max(32, this.treeData.byteLength), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 32, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
  }

  private lit: { look: Look; sunE: number[]; skyE: number[]; sunC: number[]; ambTop: number[]; ambBot: number[] } | null = null;
  /** The light for this look: what reaches the valley floor, the sky's
   *  share, and the sun and ambient at the clouds' height. Constant for a
   *  look, so worked out once rather than every frame. */
  private light() {
    const look = this.look;
    if (!this.lit || this.lit.look !== look) {
      const sun = look.sun;
      const sunE = sunlightAt(700, sun[1], look);
      const skyE = [0.055, 0.075, 0.115].map((v, i) => v * (0.35 + 0.65 * sunE[i]) * (0.3 + 0.7 * Math.sqrt(Math.max(sun[1], 0))));
      const sunC = sunlightAt((this.clouds.base + this.clouds.top) / 2, sun[1], look);
      this.lit = { look, sunE, skyE, sunC, ambTop: skyE.map((v) => v * 0.55), ambBot: sunE.map((v, i) => v * [0.5, 0.42, 0.34][i] * sun[1] * 0.3) };
    }
    return this.lit;
  }

  /**
   * The sun's view of the ground ahead of the camera, as a matrix taking
   * eye-relative metres to the shadow map. Its centre is snapped to the
   * map's own texels, so as the camera flies the shadows stay put rather
   * than crawling.
   */
  private lightMatrix(view: View, halfSize: number) {
    const L = this.look.sun;
    const f: V3 = [-L[0], -L[1], -L[2]];
    const r = norm(cross(f, [0, 1, 0]));
    const u = cross(r, f);
    const fl = Math.hypot(view.fwd[0], view.fwd[2]) || 1;
    const k = halfSize * 0.45;
    const cw: V3 = [view.eye[0] + (view.fwd[0] / fl) * k, 0, view.eye[2] + (view.fwd[2] / fl) * k];
    cw[1] = this.ground(cw[0], cw[2]);
    const texel = (2 * halfSize) / ValleyRenderer.SHADOW;
    const a = cw[0] * r[0] + cw[1] * r[1] + cw[2] * r[2], b = cw[0] * u[0] + cw[1] * u[1] + cw[2] * u[2];
    const da = Math.round(a / texel) * texel - a, db = Math.round(b / texel) * texel - b;
    const C: V3 = [cw[0] + r[0] * da + u[0] * db - view.eye[0], cw[1] + r[1] * da + u[1] * db - view.eye[1], cw[2] + r[2] * da + u[2] * db - view.eye[2]];
    const Dz = 1500;
    const d = (v: V3) => v[0] * C[0] + v[1] * C[1] + v[2] * C[2];
    const m = new Float32Array(16);
    m[0] = r[0] / halfSize; m[4] = r[1] / halfSize; m[8] = r[2] / halfSize; m[12] = -d(r) / halfSize;
    m[1] = u[0] / halfSize; m[5] = u[1] / halfSize; m[9] = u[2] / halfSize; m[13] = -d(u) / halfSize;
    m[2] = f[0] / Dz; m[6] = f[1] / Dz; m[10] = f[2] / Dz; m[14] = -d(f) / Dz;
    m[15] = 1;
    return { m, r, u };
  }

  /** Up to six clear patches in the cloud layer (world x, z, radius, how
   *  clear), where the flight passes through it. */
  setClearings(points: [number, number, number, number][]) {
    const gl = this.gl;
    const S = 256, TILE = COVER_TILE;
    const data = cloudCover(S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      /* the world points this texel stands for nearest each clearing */
      let k = 1;
      for (const [x, z, r, wgt] of points) {
        const u = (i + 0.5) / S, v = (j + 0.5) / S;
        const dx = ((((u * TILE - x) % TILE) + TILE * 1.5) % TILE) - TILE / 2;
        const dz = ((((v * TILE - z) % TILE) + TILE * 1.5) % TILE) - TILE / 2;
        const d = Math.hypot(dx, dz);
        const e = Math.min(1, Math.max(0, (d - r * 0.45) / (r * 0.55)));
        k *= 1 - wgt * (1 - e * e * (3 - 2 * e));
      }
      data[(j * S + i) * 4] = Math.round(data[(j * S + i) * 4] * k);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.coverTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, S, S, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  private cloudUniforms(P: Prog) {
    const gl = this.gl;
    gl.uniform1i(P.u("uCover"), 6);
    gl.uniform1f(P.u("uCloudTime"), this.time);
    gl.uniform1f(P.u("uCoverage"), this.clouds.coverage);
    gl.uniform1f(P.u("uCloudBase"), this.clouds.base);
    gl.uniform1f(P.u("uCloudTop"), this.clouds.top);
  }

  /** The trees near enough to be worth drawing, and in view, copied into
   *  the scratch array; returns how many. */
  private gatherTrees(view: View, maxDist: number): number {
    const C = ValleyRenderer.CELL;
    const planes = frustumPlanes(view);
    const [ex, , ez] = view.eye;
    let n = 0;
    const d2 = maxDist * maxDist;
    for (let cz = Math.floor((ez - maxDist) / C); cz <= Math.floor((ez + maxDist) / C); cz++) {
      for (let cx = Math.floor((ex - maxDist) / C); cx <= Math.floor((ex + maxDist) / C); cx++) {
        const span = this.treeCells.get((cz + 1000) * 4096 + (cx + 1000));
        if (!span) continue;
        const nx = Math.max(cx * C, Math.min(ex, cx * C + C)) - ex, nz = Math.max(cz * C, Math.min(ez, cz * C + C)) - ez;
        if (nx * nx + nz * nz > d2) continue;
        if (!boxInFrustum(planes, view.eye, cx * C - 10, cx * C + C + 10, 500, 1600, cz * C - 10, cz * C + C + 10)) continue;
        for (let i = span[0]; i < span[1]; i++) {
          const dx = this.treeData[i * 8] - ex, dz = this.treeData[i * 8 + 1] - ez;
          if (dx * dx + dz * dz > d2) continue;
          this.treeScratch.set(this.treeData.subarray(i * 8, i * 8 + 8), n * 8);
          n++;
        }
      }
    }
    return n;
  }

  private heightTexture(d: Dem) {
    const gl = this.gl;
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.R32F, d.rect.px, d.rect.px);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, d.rect.px, d.rect.px, gl.RED, gl.FLOAT, d.h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /** Shadows, normals and open sky, baked from the elevation for this sun. */
  bake() {
    const gl = this.gl;
    const out: WebGLTexture[] = [];
    for (const d of [this.inner, this.outer]) {
      const t = colorTarget(gl, d.rect.px, d.rect.px, gl.RGBA8);
      gl.viewport(0, 0, d.rect.px, d.rect.px);
      gl.useProgram(this.bakeP.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, d === this.inner ? this.demTex.inner : this.demTex.outer);
      gl.uniform1i(this.bakeP.u("uH"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.demTex.outer);
      gl.uniform1i(this.bakeP.u("uHOut"), 1);
      gl.uniform4f(this.bakeP.u("uRect"), d.rect.x0, d.rect.z0, d.rect.size, d.rect.px);
      gl.uniform4f(this.bakeP.u("uRectOut"), this.outer.rect.x0, this.outer.rect.z0, this.outer.rect.size, this.outer.rect.px);
      gl.uniform3fv(this.bakeP.u("uSun"), this.look.sun);
      gl.bindVertexArray(this.empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindTexture(gl.TEXTURE_2D, t.tex);
      out.push(t.tex);
      gl.deleteFramebuffer(t.fb);
    }
    if (this.bakeTex) { gl.deleteTexture(this.bakeTex.inner); gl.deleteTexture(this.bakeTex.outer); }
    this.bakeTex = { inner: out[0], outer: out[1] };
  }

  /** Ground height at world (x, z), bilinear: for tile bounds and the camera. */
  ground(x: number, z: number): number {
    return demGround([this.inner, this.outer], x, z);
  }

  private groundAt = (x: number, z: number) => this.ground(x, z);
  private range = (z: number, x: number, y: number) => tileHeightRange(this.groundAt, this.rangeCache, z, x, y);

  /** Pulls every tile file into memory up front, so the film never waits
   *  on the network; decoding and upload happen as the camera needs them. */
  async prefetch(onProgress: (done: number, total: number) => void) {
    const keys = [...this.available];
    let done = 0;
    let next = 0;
    const worker = async () => {
      while (next < keys.length) {
        const k = keys[next++];
        try {
          const res = await fetch(`${this.base}/imagery/${k}.jpg`);
          if (res.ok) this.blobs.set(k, await res.blob());
        } catch {
          /* a missing tile just leaves its parent in view */
        }
        done++;
        if (done % 40 === 0 || done === keys.length) onProgress(done, keys.length);
      }
    };
    await Promise.all(Array.from({ length: 12 }, worker));
  }

  private request(k: string, now: number) {
    const e = this.tiles.get(k);
    if (e) { e.used = now; return; }
    const blob = this.blobs.get(k);
    if (!blob) return;
    const entry: TileTex = { tex: null, state: "loading", used: now };
    this.tiles.set(k, entry);
    this.inflight++;
    createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none", imageOrientation: "none" })
      .then((bmp) => {
        const gl = this.gl;
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (this.anisoExt) gl.texParameterf(gl.TEXTURE_2D, this.anisoExt.TEXTURE_MAX_ANISOTROPY_EXT, this.aniso);
        bmp.close();
        entry.tex = tex;
        entry.state = "ready";
      })
      .catch(() => { entry.state = "failed"; })
      .finally(() => { this.inflight--; });
  }

  private ready = (z: number, x: number, y: number) => this.tiles.get(`${z}/${x}/${y}`)?.state === "ready";
  private exists = (z: number, x: number, y: number) => this.blobs.has(`${z}/${x}/${y}`);

  /** The tile each piece of these shots wants on screen: its own
   *  photograph if there is one, else its nearest ancestor's. */
  private eachWanted(shot: Shot, aspect: number, cb: (tex: TileKey) => void) {
    selectTiles(viewOf(shot, aspect), ROOTS, this.range, this.exists, this.exists, maxZoomAt, (_k, tex) => { if (tex) cb(tex); });
  }

  /** Asks for a tile and every ancestor, so a parent stands in while it decodes. */
  private requestChain(t: TileKey) {
    for (let z = t.z, x = t.x, y = t.y; z >= 8; z--, x >>= 1, y >>= 1) this.request(`${z}/${x}/${y}`, this.frame);
  }

  /** True when every tile the shot wants is on the GPU. */
  settled(shot: Shot, aspect: number): boolean {
    let missing = 0;
    this.eachWanted(shot, aspect, (t) => { if (!this.ready(t.z, t.x, t.y)) missing++; });
    return missing === 0 && this.inflight === 0;
  }

  private evict() {
    if (this.tiles.size < 900) return;
    const old = [...this.tiles.entries()].filter(([, e]) => e.state !== "loading" && e.used < this.frame - 90).sort((a, b) => a[1].used - b[1].used);
    for (const [k, e] of old.slice(0, this.tiles.size - 700)) {
      if (e.tex) this.gl.deleteTexture(e.tex);
      this.tiles.delete(k);
    }
  }

  private targets(w: number, h: number) {
    const gl = this.gl;
    if (this.msaa && this.msaa.w === w && this.msaa.h === h) return;
    if (this.msaa) { gl.deleteFramebuffer(this.msaa.fb); gl.deleteRenderbuffer(this.msaa.rb); gl.deleteRenderbuffer(this.msaa.depth); }
    for (const t of [this.scene, ...this.blooms]) if (t) { gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); }
    const samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const rb = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA16F, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
    const depth = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT32F, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    this.msaa = { fb, rb, depth, w, h };
    this.scene = colorTarget(gl, w, h);
    if (this.depthT) { gl.deleteFramebuffer(this.depthT.fb); gl.deleteTexture(this.depthT.tex); }
    const dtex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, dtex);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT32F, w, h);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    const dfb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dfb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, dtex, 0);
    gl.drawBuffers([gl.NONE]);
    this.depthT = { fb: dfb, tex: dtex };
    for (const t of [this.cloudT, this.compT]) if (t) { gl.deleteFramebuffer(t.fb); gl.deleteTexture(t.tex); }
    this.cloudT = colorTarget(gl, Math.max(1, w >> 1), Math.max(1, h >> 1));
    this.compT = colorTarget(gl, w, h);
    this.blooms = [];
    let bw = w, bh = h;
    for (let i = 0; i < 6; i++) {
      bw = Math.max(1, bw >> 1); bh = Math.max(1, bh >> 1);
      this.blooms.push(colorTarget(gl, bw, bh));
    }
  }

  render(shot: Shot, lookahead: Shot[]) {
    const gl = this.gl;
    this.frame++;
    const w = this.canvas.width, h = this.canvas.height;
    const aspect = w / h;
    this.targets(w, h);
    for (const s of lookahead) this.eachWanted(s, aspect, (t) => this.requestChain(t));
    this.evict();
    const view = viewOf(shot, aspect);
    const ground = this.ground(view.eye[0], view.eye[2]);
    const above = Math.max(view.eye[1] - ground, 2);
    const near = Math.max(0.5, above * 0.25);
    const proj = perspective(view.fovY, aspect, near, 400000);
    const vp = mul(proj, viewRot(view));
    const ivp = invert(vp);
    const look = this.look;
    const sun = look.sun;
    const { sunE, skyE, sunC, ambTop, ambBot } = this.light();

    /* the trees in view, and their shadows, drawn from the sun first */
    const treeMax = Math.min(3800, 1900 + above * 0.9);
    const nTrees = this.gatherTrees(view, treeMax);
    const light = this.lightMatrix(view, Math.min(2200, Math.max(800, 700 + above * 0.9)));
    gl.bindVertexArray(this.treeVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.treeBuf);
    if (nTrees > 0) gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.treeScratch, 0, nTrees * 8);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.shadowFb);
    gl.viewport(0, 0, ValleyRenderer.SHADOW, ValleyRenderer.SHADOW);
    gl.clearDepth(1);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.disable(gl.CULL_FACE);
    if (nTrees > 0) {
      const SP = this.shadowP;
      gl.useProgram(SP.p);
      gl.uniform3fv(SP.u("uEye"), view.eye);
      gl.uniformMatrix4fv(SP.u("uLightMat"), false, light.m);
      gl.uniform3fv(SP.u("uLightRight"), light.r);
      gl.uniform3fv(SP.u("uLightUp"), light.u);
      gl.uniform3fv(SP.u("uSun"), this.look.sun);
      gl.uniform4f(SP.u("uRectIn"), this.inner.rect.x0, this.inner.rect.z0, this.inner.rect.size, this.inner.rect.px);
      gl.uniform4f(SP.u("uRectOut"), this.outer.rect.x0, this.outer.rect.z0, this.outer.rect.size, this.outer.rect.px);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.demTex.inner);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.demTex.outer);
      gl.uniform1i(SP.u("uDemIn"), 1);
      gl.uniform1i(SP.u("uDemOut"), 2);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nTrees);
    }
    const shadowOn = nTrees > 0 ? 1 : 0;

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaa!.fb);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 1);
    gl.clearDepth(1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    /* no culling: a heightfield seen from above shows no back faces worth
       skipping, and the skirts face whichever way their crack is seen */
    gl.disable(gl.CULL_FACE);

    /* the ground */
    const T = this.terrain;
    gl.useProgram(T.p);
    gl.uniformMatrix4fv(T.u("uViewProj"), false, vp);
    gl.uniform3fv(T.u("uEye"), view.eye);
    gl.uniform4f(T.u("uRectIn"), this.inner.rect.x0, this.inner.rect.z0, this.inner.rect.size, this.inner.rect.px);
    gl.uniform4f(T.u("uRectOut"), this.outer.rect.x0, this.outer.rect.z0, this.outer.rect.size, this.outer.rect.px);
    gl.uniform3fv(T.u("uSun"), sun);
    gl.uniform1f(T.u("uMie"), look.mie);
    gl.uniform1f(T.u("uMieH"), look.mieH);
    gl.uniform1f(T.u("uEyeAlt"), view.eye[1]);
    gl.uniform3fv(T.u("uSunE"), sunE);
    gl.uniform3fv(T.u("uSkyE"), skyE);
    gl.uniform1f(T.u("uExposure"), look.exposure);
    gl.uniform1f(T.u("uDelight"), look.delight);
    gl.uniform1f(T.u("uVibrance"), look.vibrance);
    gl.uniform1f(T.u("uDebug"), look.debug ?? 0);
    gl.uniform1f(T.u("uMs"), look.ms);
    /* the photographs' own sun: late morning, from the south-east */
    const capAz = (150 * Math.PI) / 180, capEl = (58 * Math.PI) / 180;
    gl.uniform3f(T.u("uCapSun"), Math.sin(capAz) * Math.cos(capEl), Math.sin(capEl), -Math.cos(capAz) * Math.cos(capEl));
    const bind = (unit: number, tex: WebGLTexture, name: string) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(T.u(name), unit);
    };
    bind(1, this.demTex.inner, "uDemIn");
    bind(2, this.demTex.outer, "uDemOut");
    bind(3, this.bakeTex!.inner, "uBakeIn");
    bind(4, this.bakeTex!.outer, "uBakeOut");
    bind(5, this.shadowTex, "uTreeShadow");
    gl.uniformMatrix4fv(T.u("uLightMat"), false, light.m);
    gl.uniform1f(T.u("uShadowOn"), shadowOn);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, this.coverTex);
    this.cloudUniforms(T);
    gl.uniform1i(T.u("uImg"), 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(this.grid.vao);
    /* one walk of the tile tree: what to draw now, and the photograph each
       piece is waiting for, asked for on the way */
    const drawn: [TileKey, TileKey][] = [];
    selectTiles(view, ROOTS, this.range, this.exists, this.ready, maxZoomAt, (k, tex) => {
      if (tex) drawn.push([k, tex]);
      let z = k.z, x = k.x, y = k.y;
      while (z > 8 && !this.exists(z, x, y)) { z--; x >>= 1; y >>= 1; }
      this.requestChain({ z, x, y });
    });
    for (const [k, t] of drawn) {
      const e = this.tiles.get(`${t.z}/${t.x}/${t.y}`)!;
      e.used = this.frame;
      const r = tileRect(k.z, k.x, k.y);
      /* the piece of the ancestor's photograph this tile covers */
      const f = 2 ** (t.z - k.z);
      gl.bindTexture(gl.TEXTURE_2D, e.tex);
      gl.uniform3f(T.u("uTexXform"), k.x * f - t.x, k.y * f - t.y, f);
      gl.uniform4f(T.u("uTile"), r.x0 - view.eye[0], r.z0 - view.eye[2], r.size, Math.min(r.size * 0.02 + 8, 400));
      gl.drawElements(gl.TRIANGLES, this.grid.count, gl.UNSIGNED_SHORT, 0);
    }

    /* the trees */
    if (nTrees > 0) {
      const P = this.treeP;
      gl.useProgram(P.p);
      gl.uniformMatrix4fv(P.u("uViewProj"), false, vp);
      gl.uniform3fv(P.u("uEye"), view.eye);
      gl.uniform3fv(P.u("uCamRight"), view.right);
      gl.uniform3fv(P.u("uCamUp"), view.up);
      gl.uniform1f(P.u("uTreeFar"), treeMax);
      gl.uniform1f(P.u("uPixelAngle"), (2 * Math.tan((view.fovY * Math.PI) / 360)) / h);
      gl.uniform4f(P.u("uRectIn"), this.inner.rect.x0, this.inner.rect.z0, this.inner.rect.size, this.inner.rect.px);
      gl.uniform4f(P.u("uRectOut"), this.outer.rect.x0, this.outer.rect.z0, this.outer.rect.size, this.outer.rect.px);
      gl.uniform1i(P.u("uDemIn"), 1);
      gl.uniform1i(P.u("uDemOut"), 2);
      gl.uniform1i(P.u("uBakeIn"), 3);
      gl.uniform1i(P.u("uBakeOut"), 4);
      gl.uniform3fv(P.u("uSun"), sun);
      gl.uniform1f(P.u("uMie"), look.mie);
      gl.uniform1f(P.u("uMieH"), look.mieH);
      gl.uniform1f(P.u("uMs"), look.ms);
      gl.uniform1f(P.u("uEyeAlt"), view.eye[1]);
      gl.uniform3fv(P.u("uSunE"), sunE);
      gl.uniform3fv(P.u("uSkyE"), skyE);
      gl.uniform1f(P.u("uExposure"), look.exposure);
      gl.uniform1i(P.u("uTreeShadow"), 5);
      gl.uniformMatrix4fv(P.u("uLightMat"), false, light.m);
      gl.uniform1f(P.u("uShadowOn"), shadowOn);
      this.cloudUniforms(P);
      gl.bindVertexArray(this.treeVao);
      gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nTrees);
      gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    }

    /* the sky, behind everything */
    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    const S = this.sky;
    gl.useProgram(S.p);
    gl.uniformMatrix4fv(S.u("uInvViewProj"), false, ivp);
    gl.uniform3fv(S.u("uSun"), sun);
    gl.uniform1f(S.u("uMie"), look.mie);
    gl.uniform1f(S.u("uMieH"), look.mieH);
    gl.uniform1f(S.u("uEyeAlt"), view.eye[1]);
    gl.uniform1f(S.u("uExposure"), look.exposure);
    gl.uniform1f(S.u("uMs"), look.ms);
    gl.bindVertexArray(this.empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);
    gl.disable(gl.DEPTH_TEST);

    /* resolve colour and depth, then the clouds over them */
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msaa!.fb);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.scene!.fb);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.depthT!.fb);
    gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    const C = this.cloudP;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.cloudT!.fb);
    if (this.clouds.coverage <= 0) {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    } else {
    gl.viewport(0, 0, this.cloudT!.w, this.cloudT!.h);
    gl.useProgram(C.p);
    gl.uniformMatrix4fv(C.u("uInvViewProj"), false, ivp);
    gl.uniform3fv(C.u("uEye"), view.eye);
    gl.uniform3fv(C.u("uFwd"), view.fwd);
    gl.uniform2f(C.u("uNearFar"), near, 400000);
    gl.uniform3fv(C.u("uSun"), sun);
    gl.uniform1f(C.u("uMie"), look.mie);
    gl.uniform1f(C.u("uMieH"), look.mieH);
    gl.uniform1f(C.u("uMs"), look.ms);
    gl.uniform1f(C.u("uEyeAlt"), view.eye[1]);
    gl.uniform1f(C.u("uExposure"), look.exposure);
    gl.uniform3fv(C.u("uSunC"), sunC);
    gl.uniform3fv(C.u("uAmbTop"), ambTop);
    gl.uniform3fv(C.u("uAmbBot"), ambBot);
    gl.activeTexture(gl.TEXTURE6);
    gl.bindTexture(gl.TEXTURE_2D, this.coverTex);
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_3D, this.noiseTex);
    gl.uniform1i(C.u("uNoise"), 7);
    gl.activeTexture(gl.TEXTURE8);
    gl.bindTexture(gl.TEXTURE_2D, this.depthT!.tex);
    gl.uniform1i(C.u("uDepth"), 8);
    this.cloudUniforms(C);
    gl.bindVertexArray(this.empty);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.bindVertexArray(this.empty);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.compT!.fb);
    gl.viewport(0, 0, w, h);
    gl.useProgram(this.compP.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.scene!.tex);
    gl.uniform1i(this.compP.u("uScene"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.cloudT!.tex);
    gl.uniform1i(this.compP.u("uCloud"), 1);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* bloom, tone */
    const pass = (p: Prog, src: Target, dst: Target | null, first = 0) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, dst ? dst.fb : null);
      gl.viewport(0, 0, dst ? dst.w : w, dst ? dst.h : h);
      gl.useProgram(p.p);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, src.tex);
      gl.uniform1i(p.u("uSrc"), 0);
      gl.uniform2f(p.u("uTexel"), 1 / src.w, 1 / src.h);
      gl.uniform1f(p.u("uFirst"), first);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    gl.bindVertexArray(this.empty);
    let src = this.compT!;
    for (let i = 0; i < this.blooms.length; i++) { pass(this.brightP, src, this.blooms[i], i === 0 ? 1 : 0); src = this.blooms[i]; }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    for (let i = this.blooms.length - 1; i > 0; i--) pass(this.upP, this.blooms[i], this.blooms[i - 1]);
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    const F = this.finalP;
    gl.useProgram(F.p);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.compT!.tex);
    gl.uniform1i(F.u("uScene"), 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.blooms[0].tex);
    gl.uniform1i(F.u("uBloom"), 1);
    gl.uniform1f(F.u("uBloomK"), 0.06);
    gl.uniform1f(F.u("uPower"), look.power);
    gl.uniform1f(F.u("uSat"), look.sat);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return { tiles: drawn.length, loaded: this.tiles.size, inflight: this.inflight };
  }

  /**
   * The skyline as this shot sees it: for each screen x (CSS pixels of a
   * w x h frame), the screen y of the highest ground in that direction,
   * with the earth's curve. What the mark is traced from.
   */
  skyline(shot: Shot, w: number, h: number, xs: number[]): number[] {
    const view = viewOf(shot, w / h);
    const tanY = Math.tan((view.fovY * Math.PI) / 360);
    const tanX = tanY * (w / h);
    return xs.map((sx) => {
      const nx = (sx / w) * 2 - 1;
      const dx = view.fwd[0] + view.right[0] * nx * tanX, dz = view.fwd[2] + view.right[2] * nx * tanX;
      const l = Math.hypot(dx, dz);
      const hx = dx / l, hz = dz / l;
      let best = Infinity;
      for (let s = 150; s < 16000; s *= 1.012) {
        const px = view.eye[0] + hx * s, pz = view.eye[2] + hz * s;
        const py = this.ground(px, pz) - sink(s);
        const [, y] = ValleyRenderer.project(shot, w, h, [px, py, pz]);
        if (y < best) best = y;
      }
      return best;
    });
  }

  /** Where a world point lands on screen, in CSS pixels of a w x h frame. */
  static project(shot: Shot, w: number, h: number, p: [number, number, number]): [number, number, number] {
    const view = viewOf(shot, w / h);
    const rel: [number, number, number] = [p[0] - view.eye[0], p[1] - view.eye[1], p[2] - view.eye[2]];
    const x = rel[0] * view.right[0] + rel[1] * view.right[1] + rel[2] * view.right[2];
    const y = rel[0] * view.up[0] + rel[1] * view.up[1] + rel[2] * view.up[2];
    const z = rel[0] * view.fwd[0] + rel[1] * view.fwd[1] + rel[2] * view.fwd[2];
    const f = 1 / Math.tan((view.fovY * Math.PI) / 360);
    return [(0.5 + (x / z) * f * (h / w) * 0.5) * w, (0.5 - (y / z) * f * 0.5) * h, z];
  }

  dispose() {
    const gl = this.gl;
    for (const e of this.tiles.values()) if (e.tex) gl.deleteTexture(e.tex);
    this.tiles.clear();
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

/** Decodes a terrarium-encoded PNG into metres. */
export async function loadDem(url: string, rect: DemRect): Promise<Dem> {
  const blob = await (await fetch(url)).blob();
  const bmp = await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const g = c.getContext("2d", { willReadFrequently: true, colorSpace: "srgb" })!;
  g.drawImage(bmp, 0, 0);
  const px = g.getImageData(0, 0, bmp.width, bmp.height).data;
  const h = new Float32Array(bmp.width * bmp.height);
  for (let i = 0; i < h.length; i++) h[i] = px[i * 4] * 256 + px[i * 4 + 1] + px[i * 4 + 2] / 256 - 32768;
  bmp.close();
  return { rect, h };
}
