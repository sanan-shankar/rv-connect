/**
 * Shared config for the one valley photo that carries across the landing hero
 * and the two auth photo panels (/login, /signup).
 *
 * The landing hero shows this image at `object-cover` over the WHOLE viewport
 * (100vw). The auth pages show the SAME image at the SAME scale, cropped to the
 * right {@link AUTH_PANEL_VW}% of that render: a 100vw `object-cover` box is
 * right-aligned inside the (narrower) photo panel, so the panel reveals exactly
 * the right slice of the landing composition — the left part cropped off.
 *
 * That shared geometry is what lets the landing -> /login slide be continuous:
 * on "Sign in" the hero image container slides left by {@link AUTH_FORM_VW}vw
 * (no rescale), landing in precisely the crop the /login panel renders at rest,
 * so the handoff has no jump.
 */
export const HERO_IMAGE_SRC = "/images/landing.jpeg";

/** Tiny inline LQIP (16x12 webp) so next/image has a warm placeholder, never a hard pop. */
export const HERO_IMAGE_BLUR =
  "data:image/webp;base64,UklGRmQAAABXRUJQVlA4IFgAAAAQAgCdASoQAAwAA8BgJbACdAD7h+qpmvwAAOJ6NrHEjkGHa6R99IIGjUuOvA0UN584KWKge7O7OVZUykSOw17bFDoKCP5QUUNLxndjSuA4zF3MTc89gAAA";

/** Width of the auth photo panel, as a % of the viewport. Mirrors the `w-[58.3333%]` class. */
export const AUTH_PANEL_VW = 58.3333;

/** Width the sign-in form fills, as a % of the viewport. Also the hero image's leftward slide distance. */
export const AUTH_FORM_VW = 100 - AUTH_PANEL_VW; // 41.6667

/**
 * sessionStorage key: the landing "Sign in" slide sets this right before it
 * pushes to /login, and /login reads-and-clears it once on mount. It is the
 * signal that lets the sign-in form's arrival slide play ONLY for a genuine
 * landing transition — a direct visit or a reload finds no flag and renders the
 * form at rest with no entry animation. Clearing on read also stops the slide
 * from replaying if you reload /login after arriving.
 */
export const LOGIN_TRANSITION_FLAG = "rv:login-transition";
