import { instagramHandle } from "@/lib/normalize";

/**
 * Shared social/link helpers for the profile. Extracted from the live profile
 * page so onboarding, settings, and the profile all normalise handles the same
 * way (prepend https://, turn an @handle into a full instagram.com URL, etc.).
 */
export { instagramHandle };

export type SocialKind = "instagram" | "linkedin" | "facebook" | "website" | "link";

/** Turn a stored handle/URL into a safe, openable href. */
export function socialHref(kind: SocialKind, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (kind === "instagram") {
    const handle = instagramHandle(v);
    return handle ? `https://instagram.com/${handle}` : "";
  }
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

/** The value shown next to a social link (handle for IG, bare host otherwise). */
export function socialDisplay(kind: SocialKind, value: string): string {
  const v = value.trim();
  if (kind === "instagram") {
    const handle = instagramHandle(v);
    return handle ? `@${handle}` : "";
  }
  return v.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export interface UserLink {
  label: string;
  url: string;
}

/** Parse the `User.links` JSON column (Contact's "Other links" repeater),
 *  dropping anything malformed or non-https rather than surfacing bad data. */
export function parseUserLinks(raw: string | null | undefined): UserLink[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(
        (e): e is UserLink =>
          e &&
          typeof e.label === "string" &&
          e.label.trim().length > 0 &&
          typeof e.url === "string" &&
          /^https:\/\//i.test(e.url)
      )
      .map((e) => ({ label: e.label.trim().slice(0, 60), url: e.url.trim().slice(0, 300) }))
      .slice(0, 10);
  } catch {
    return [];
  }
}
