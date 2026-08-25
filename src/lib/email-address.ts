import { z } from "zod/v4";

/**
 * One canonical form of an email address, for every path that stores or looks
 * one up.
 *
 * There used to be three (bug audit B-020). Signup stored the address exactly
 * as typed and deduped on it; login looked the RAW string up in a
 * case-sensitive unique column while normalizing only its rate-limit key; the
 * reset flow lowercased. So `Foo@x.com` and `foo@x.com` were the same account
 * to one path and two to another. What that cost, in order: a member whose
 * stored address carries a capital could never receive a password reset (one
 * of the 52 live members was in exactly that state on 2026-08-21), signing in
 * with different capitalisation was wrongly refused, and one mailbox could
 * register twice.
 *
 * Trim and lowercase, nothing cleverer. Gmail-style dot and plus folding is
 * deliberately NOT done: `a.b@gmail.com` and `ab@gmail.com` are the same
 * mailbox at Google and different mailboxes almost everywhere else, so folding
 * them would refuse a legitimate second alumnus at a domain that keeps them
 * apart.
 */
export function normalizeEmail(raw: string | null | undefined): string {
  return (raw ?? "").trim().toLowerCase();
}

/**
 * The longest address anything here will store. Matches the cap `displayEmail`
 * has always had; RFC 5321 puts the real ceiling at 254, so this refuses only
 * addresses that are already unusable.
 */
const EMAIL_MAX = 200;

/**
 * A zod field that accepts what somebody typed and yields the canonical form.
 *
 * Order matters: the trim and the lowercase run BEFORE the format check, so a
 * pasted address with a trailing space is cleaned rather than rejected. Written
 * as `z.string().trim().toLowerCase().pipe(z.email())` for exactly that reason
 * — `z.email().trim()` would validate first and refuse it.
 */
export function emailField(message = "Please enter a valid email") {
  return z.string().trim().toLowerCase().pipe(z.email(message).max(EMAIL_MAX));
}
