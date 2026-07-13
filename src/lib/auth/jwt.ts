import { createHmac, timingSafeEqual } from "crypto";

/**
 * Generic HMAC-SHA256 token sign/verify.
 *
 * WHY: `admin-auth.ts:75-100` and `client-auth.ts:70-96` both
 * reimplemented the exact same `signPayload` / `verifyToken` pair,
 * differing only in the secret and the payload shape. This module
 * is the single source of truth — both auth files now build on it.
 *
 * Token format: `<payload>.<hex-hmac-sha256(secret, payload)>`
 * The payload is opaque to this module (caller chooses encoding).
 */

/** Sign `payload` with `secret`. Returns `payload.hmac`. */
export function signToken(payload: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export interface VerifiedToken<T> {
  payload: T;
}

/**
 * Verify a `payload.hmac` token against `secret`. Returns the parsed
 * payload (after `decode(payload)`) or null if the signature is
 * invalid, the token is malformed, or `validate` rejects the payload.
 *
 * `validate` is called AFTER signature verification — safe to do
 * privileged checks (e.g. expiry) inside it.
 */
export function verifyToken<T>(
  token: string | null | undefined,
  secret: string,
  decode: (payload: string) => T | null
): T | null {
  if (!token) return null;
  try {
    const decoded = decodeURIComponent(token);
    const parts = decoded.split(".");
    if (parts.length !== 2) return null;
    const [payload, sig] = parts;
    const expectedSig = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    const a = Buffer.from(sig, "hex");
    const b = Buffer.from(expectedSig, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return decode(payload);
  } catch {
    return null;
  }
}

/**
 * Base64url-encode a UTF-8 string (used by callers to build the payload
 * before signing). Symmetric helper for `decode`.
 */
export function base64urlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

export function base64urlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}
