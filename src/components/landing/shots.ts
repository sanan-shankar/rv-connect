/**
 * Optimized, real screenshots of the live app, captured with the repo screenshot
 * tools and Sharp-processed to WebP. Each carries its intrinsic dimensions (so
 * `next/image` reserves space and CLS stays 0) and a tiny inline blur LQIP.
 *
 * Captured against staged sample data (the @demo.valley.test users and a seeded
 * letter + collection photos), so prospects never see an empty state.
 */
export type Shot = { src: string; w: number; h: number; blur: string };

export const SHOTS: Record<string, Shot> = {
  directory: {
    src: "/images/landing/directory.webp",
    w: 1100,
    h: 813,
    blur: "data:image/webp;base64,UklGRjgAAABXRUJQVlA4ICwAAADQAQCdASoQAAwABABoJZQAAudf/NYogAD+78dyPOfKvn+Maa1Ia6odLMAAAA==",
  },
  feed: {
    src: "/images/landing/feed.webp",
    w: 1100,
    h: 832,
    blur: "data:image/webp;base64,UklGRjYAAABXRUJQVlA4ICoAAABwAQCdASoQAAwABABoJZ1/2AGIAAD+8NIGY9Kac2b24KywG9+4zgQAAAA=",
  },
  letters: {
    src: "/images/landing/letters.webp",
    w: 1100,
    h: 450,
    blur: "data:image/webp;base64,UklGRioAAABXRUJQVlA4IB4AAAAwAQCdASoQAAcABABoJZwAA3AA/vCrl7KnE8DoEAA=",
  },
  collection: {
    src: "/images/landing/collection.webp",
    w: 1100,
    h: 720,
    blur: "data:image/webp;base64,UklGRloAAABXRUJQVlA4IE4AAACwAQCdASoQAAoABABoJQAAVD/JFHoAAP7gBj5OyvrZUkQymXkNHCUGO3GBAvM0OuTvu1HlBlbFlz9Tdu7pIaBW2j/RPsLfgyl/b38jAAA=",
  },
  catchups: {
    src: "/images/landing/catchups.webp",
    w: 760,
    h: 520,
    blur: "data:image/webp;base64,UklGRjgAAABXRUJQVlA4ICwAAADQAQCdASoQAAsABABoJZwAAuda/v+XgAD+894AiIEHxrZ5vTnZDSgzvwAAAA==",
  },
};
