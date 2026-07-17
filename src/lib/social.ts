import { Instagram, Linkedin, Globe, Link as LinkIcon, type LucideIcon } from "lucide-react";

/**
 * Shared social/link helpers for the profile. Extracted from the live profile
 * page so onboarding, settings, and the profile all normalise handles the same
 * way (prepend https://, turn an @handle into a full instagram.com URL, etc.).
 */
export type SocialKind = "instagram" | "linkedin" | "website" | "link";

/** Turn a stored handle/URL into a safe, openable href. */
export function socialHref(kind: SocialKind, value: string): string {
  const v = value.trim();
  if (!v) return "";
  if (kind === "instagram") return `https://instagram.com/${v.replace(/^@/, "")}`;
  if (v.startsWith("http://") || v.startsWith("https://")) return v;
  return `https://${v}`;
}

/** The Lucide icon for a social kind. */
export function socialIcon(kind: SocialKind): LucideIcon {
  switch (kind) {
    case "instagram":
      return Instagram;
    case "linkedin":
      return Linkedin;
    case "website":
      return Globe;
    default:
      return LinkIcon;
  }
}

/** The value shown next to a social link (handle for IG, bare host otherwise). */
export function socialDisplay(kind: SocialKind, value: string): string {
  const v = value.trim();
  if (kind === "instagram") return v.startsWith("@") ? v : `@${v}`;
  return v.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** The faint secondary host label, e.g. "instagram.com" / "linkedin.com". */
export function socialHost(kind: SocialKind, value: string): string {
  try {
    const url = new URL(socialHref(kind, value));
    return url.host.replace(/^www\./, "");
  } catch {
    return "";
  }
}
