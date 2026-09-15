/* ------------------------------------------------------------------ *
 *  The sun over the valley.
 *
 *  Where the sun is (NOAA's solar position algorithm, good to well under a
 *  degree), what time it is at the school, when the sun rises and sets
 *  there, the moon's phase, and the colour of the sky for a given sun
 *  height. Pure arithmetic: no Date locale, no Intl, nothing that differs
 *  between the server and a phone. The valley keeps IST, which has no
 *  daylight saving, so "IST" is UTC plus five and a half hours and nothing
 *  else.
 *
 *  Everything in /lab/valley reads its light from here: the hills, the
 *  mark, the world map and the seal. One sun, four surfaces.
 * ------------------------------------------------------------------ */

export const VALLEY = { lat: 13.634, lon: 78.454, name: "Rishi Valley" } as const;
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const RAD = Math.PI / 180;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const norm360 = (d: number) => ((d % 360) + 360) % 360;

export type SunPosition = {
  /** degrees above the horizon, refraction included; negative at night */
  elevation: number;
  /** degrees clockwise from north */
  azimuth: number;
  declination: number;
  /** minutes */
  equationOfTime: number;
  /** where the sun is directly overhead right now */
  subsolar: { lat: number; lon: number };
};

export function sunPosition(date: Date, lat: number = VALLEY.lat, lon: number = VALLEY.lon): SunPosition {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545) / 36525;
  const L0 = norm360(280.46646 + T * (36000.76983 + T * 0.0003032));
  const M = norm360(357.52911 + T * (35999.05029 - 0.0001537 * T));
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const Mr = M * RAD;
  const C =
    Math.sin(Mr) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * Mr) * (0.019993 - 0.000101 * T) +
    Math.sin(3 * Mr) * 0.000289;
  const omega = (125.04 - 1934.136 * T) * RAD;
  const lambda = (L0 + C - 0.00569 - 0.00478 * Math.sin(omega)) * RAD;
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = (eps0 + 0.00256 * Math.cos(omega)) * RAD;
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const y = Math.tan(eps / 2) ** 2;
  const L0r = L0 * RAD;
  const eqTime =
    (4 / RAD) *
    (y * Math.sin(2 * L0r) -
      2 * e * Math.sin(Mr) +
      4 * e * y * Math.sin(Mr) * Math.cos(2 * L0r) -
      0.5 * y * y * Math.sin(4 * L0r) -
      1.25 * e * e * Math.sin(2 * Mr));
  const utcMin =
    date.getUTCHours() * 60 +
    date.getUTCMinutes() +
    date.getUTCSeconds() / 60 +
    date.getUTCMilliseconds() / 60000;
  const tst = (((utcMin + eqTime + 4 * lon) % 1440) + 1440) % 1440;
  const ha = tst / 4 - 180;
  const har = ha * RAD;
  const latr = lat * RAD;
  const cosZ = Math.sin(latr) * Math.sin(decl) + Math.cos(latr) * Math.cos(decl) * Math.cos(har);
  const zen = Math.acos(clamp(cosZ, -1, 1));
  const sinZ = Math.sin(zen);
  let azimuth = 180;
  if (sinZ > 1e-6) {
    const a =
      Math.acos(clamp((Math.sin(latr) * Math.cos(zen) - Math.sin(decl)) / (Math.cos(latr) * sinZ), -1, 1)) /
      RAD;
    azimuth = ha > 0 ? (a + 180) % 360 : (540 - a) % 360;
  }
  let elevation = 90 - zen / RAD;
  /* refraction: the sun you see sits a little higher than the geometry says */
  if (elevation > -0.575) {
    const t = Math.tan(elevation * RAD);
    let r: number;
    if (elevation > 85) r = 0;
    else if (elevation > 5) r = 58.1 / t - 0.07 / t ** 3 + 0.000086 / t ** 5;
    else r = 1735 + elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)));
    elevation += r / 3600;
  } else {
    elevation += -20.774 / Math.tan(elevation * RAD) / 3600;
  }
  let subLon = 180 - (utcMin + eqTime) / 4;
  subLon = ((((subLon + 180) % 360) + 360) % 360) - 180;
  return { elevation, azimuth, declination: decl / RAD, equationOfTime: eqTime, subsolar: { lat: decl / RAD, lon: subLon } };
}

/** The valley's clock: hours since midnight IST, as a decimal, plus a label. */
export function valleyClock(date: Date): { hour: number; label: string } {
  const d = new Date(date.getTime() + IST_OFFSET_MS);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return { hour, label: `${hh}:${mm}` };
}

/** The instant that is `hour` o'clock IST on the valley's calendar day that `date` falls in. */
export function valleyDateAt(date: Date, hour: number): Date {
  const d = new Date(date.getTime() + IST_OFFSET_MS);
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST_OFFSET_MS;
  return new Date(dayStart + hour * 3600 * 1000);
}

/** Sunrise and sunset at the valley on `date`'s IST day, as decimal IST hours. */
export function sunTimes(date: Date): { sunrise: number; sunset: number } {
  let sunrise = -1;
  let sunset = -1;
  let prev = sunPosition(valleyDateAt(date, 0)).elevation;
  for (let m = 1; m <= 1440; m++) {
    const h = m / 60;
    const el = sunPosition(valleyDateAt(date, h)).elevation;
    if (prev < -0.3 && el >= -0.3 && sunrise < 0) sunrise = h;
    if (prev >= -0.3 && el < -0.3) sunset = h;
    prev = el;
  }
  return { sunrise, sunset };
}

/** 0 at new moon, 0.5 at full, back to 1 at the next new. */
export function moonPhase(date: Date): number {
  const synodic = 29.530588853;
  const jd = date.getTime() / 86400000 + 2440587.5;
  const age = (((jd - 2451550.1) % synodic) + synodic) % synodic;
  return age / synodic;
}

/* ------------------------------------------------------------------ *
 *  The sky, by how high the sun is. Six stops from deep night to full
 *  day, blended between so nothing steps. Colours stay in the app's
 *  warm register: the day sky is the sky token lightened, dusk is
 *  cinnamon, night is the dark theme's charcoal rather than black.
 * ------------------------------------------------------------------ */

export type RGB = [number, number, number];
export type Sky = {
  zenith: RGB;
  horizon: RGB;
  /** the colour of direct light */
  light: RGB;
  /** the colour of light from the sky itself */
  ambient: RGB;
  /** how much direct light there is, 0 to 1 */
  strength: number;
  /** 0 by day, 1 in deep night */
  night: number;
};

const hex = (h: string): RGB => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];
const mixRGB = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

type Stop = { at: number; sky: Sky };
const STOPS: Stop[] = [
  { at: -18, sky: { zenith: hex("#121A20"), horizon: hex("#1E2A2C"), light: hex("#7E97B0"), ambient: hex("#26333A"), strength: 0.10, night: 1 } },
  { at: -9, sky: { zenith: hex("#1C2A3C"), horizon: hex("#4C4655"), light: hex("#8A93B0"), ambient: hex("#34414F"), strength: 0.14, night: 0.85 } },
  { at: -4, sky: { zenith: hex("#3E5878"), horizon: hex("#C98657"), light: hex("#E0925C"), ambient: hex("#556A84"), strength: 0.32, night: 0.35 } },
  { at: 2, sky: { zenith: hex("#6F93B4"), horizon: hex("#EFC28A"), light: hex("#FFC77E"), ambient: hex("#7F92A8"), strength: 0.72, night: 0 } },
  { at: 12, sky: { zenith: hex("#7FA6C6"), horizon: hex("#EDDFC4"), light: hex("#FFE7BF"), ambient: hex("#9BAFC0"), strength: 0.94, night: 0 } },
  { at: 40, sky: { zenith: hex("#86AECE"), horizon: hex("#E6E1D0"), light: hex("#FFF4E2"), ambient: hex("#A9BBC9"), strength: 1, night: 0 } },
];

export function skyFor(elevation: number, cloud = 0): Sky {
  const e = clamp(elevation, STOPS[0].at, STOPS[STOPS.length - 1].at);
  let i = 0;
  while (i < STOPS.length - 2 && e > STOPS[i + 1].at) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = clamp((e - a.at) / (b.at - a.at), 0, 1);
  const s: Sky = {
    zenith: mixRGB(a.sky.zenith, b.sky.zenith, t),
    horizon: mixRGB(a.sky.horizon, b.sky.horizon, t),
    light: mixRGB(a.sky.light, b.sky.light, t),
    ambient: mixRGB(a.sky.ambient, b.sky.ambient, t),
    strength: a.sky.strength + (b.sky.strength - a.sky.strength) * t,
    night: a.sky.night + (b.sky.night - a.sky.night) * t,
  };
  if (cloud > 0) {
    /* an overcast sky goes grey and flat: the sun softens, the sky loses its blue */
    const grey: RGB = mixRGB(hex("#B7BBB5"), s.zenith, s.night * 0.8);
    const c = clamp(cloud, 0, 1);
    s.zenith = mixRGB(s.zenith, grey, c * 0.7);
    s.horizon = mixRGB(s.horizon, grey, c * 0.5);
    s.light = mixRGB(s.light, hex("#E8E6E0"), c * 0.6);
    s.strength *= 1 - 0.65 * c;
  }
  return s;
}

export const toCss = (c: RGB) => `rgb(${Math.round(c[0] * 255)} ${Math.round(c[1] * 255)} ${Math.round(c[2] * 255)})`;

/** A unit vector toward the sun in the hills' world: x east, y up, z south. */
export function sunVector(p: { elevation: number; azimuth: number }): [number, number, number] {
  const el = p.elevation * RAD;
  const az = p.azimuth * RAD;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
}

/** The weather the page fetched, as the client sees it. */
export type ValleyWeather = {
  temperatureC: number;
  /** mm in the last quarter hour */
  precipitationMm: number;
  /** 0 to 1 */
  cloud: number;
  windKmh: number;
  windDirDeg: number;
  /** WMO code: 0 clear, 1-3 cloud, 45-48 fog, 51-67 rain, 80-82 showers, 95-99 storm */
  code: number;
  observedAt: string;
};
