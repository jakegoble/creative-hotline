/**
 * Generate per-client referral codes in the format `<FIRST>-DIAL-100`.
 *
 * Each delivered action plan ships with a unique referral code. The recipient
 * can share it; whoever redeems gets $100 off their First Call, the referrer
 * also gets $100 off their next session.
 *
 * The "FIRST" segment is derived from the client's first name. Uniqueness is
 * enforced by appending a 3-char suffix if the base form collides.
 *
 * V2 spec: see Megha's TCH-V2-JAKE-IMPLEMENTATION-GUIDE.md §2.2 + §10 decision 13.
 */

/**
 * Normalize a name into the FIRST-name slug used in referral codes.
 *
 * - Strips non-alphanumeric chars
 * - Uppercases
 * - Takes the first word only (everything before the first space)
 *
 * Example: "Jake Goble"     → "JAKE"
 *          "María Sánchez"  → "MARÍA" → "MARIA" (after ascii fold)
 *          ""               → "GUEST"
 *
 * We don't try to be clever about international characters; just ASCII-fold
 * and uppercase. If the name is empty we fall back to "GUEST" so the code
 * generator never explodes.
 */
function slugFirstName(name: string): string {
  if (!name) return "GUEST";
  const first = name.trim().split(/\s+/)[0] ?? "";
  // Strip diacritics (NFKD + remove combining marks), then non-alphanumerics.
  const folded = first.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const slug = folded.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return slug || "GUEST";
}

/**
 * Build the canonical referral code for a client. Does NOT enforce uniqueness
 * across the codespace — callers that need uniqueness (Stripe promo code
 * creation, Notion writes) should pass the result to `ensureUniqueCode()`.
 */
export function buildReferralCode(firstName: string): string {
  return `${slugFirstName(firstName)}-DIAL-100`;
}

/**
 * Suffix-append helper for collision-resolution. Returns `<code>-<3char>` where
 * the suffix is a base36 fragment of a SHA-256 of the input. Deterministic per
 * input → safe for retries (same Session always yields the same code).
 *
 * Example: buildReferralCode("Jake") + "-7K3" = "JAKE-DIAL-100-7K3"
 */
export function withDeterministicSuffix(code: string, seed: string): string {
  // Cheap deterministic hash without importing crypto — adler-style.
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  // 3 chars of base36 = ~46656 buckets. Collision risk vanishing for our volume.
  const suffix = h.toString(36).toUpperCase().padStart(3, "0").slice(-3);
  return `${code}-${suffix}`;
}
