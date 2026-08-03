// Signed cookie for CMS sessions.
// Deliberately WebCrypto-only: the proxy (middleware) imports this, and node:crypto is not
// available there. The payload carries who is signed in so pages can check their permissions.
const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const fromBase64Url = (value: string) => new Uint8Array(Buffer.from(value, "base64url"));

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export const ADMIN_COOKIE = "tamiya_admin_session";
export const ADMIN_SESSION_MAX_AGE = 8 * 60 * 60;

// The subject is an AdminUser id, or BOOTSTRAP_SUBJECT while no users exist yet.
export const BOOTSTRAP_SUBJECT = "bootstrap";

export async function createAdminSession(subject: string) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const payload = `${subject}|${Date.now()}`;
  return `${toBase64Url(encoder.encode(payload))}.${await sign(payload, secret)}`;
}

/** Returns the signed-in subject when the cookie is intact and unexpired, otherwise null. */
export async function readAdminSession(value: string | undefined) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !value) return null;
  const [encodedPayload, providedSignature] = value.split(".");
  if (!encodedPayload || !providedSignature) return null;
  try {
    const payload = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const [subject, issuedAt] = payload.split("|");
    if (!subject || !issuedAt) return null;
    if (Date.now() - Number(issuedAt) > ADMIN_SESSION_MAX_AGE * 1000) return null;
    return (await sign(payload, secret)) === providedSignature ? subject : null;
  } catch {
    return null;
  }
}

// The middleware only proves the cookie is genuine; which menus it unlocks is decided by the
// page or route handler, where the database is reachable.
export const isValidAdminSession = async (value: string | undefined) => Boolean(await readAdminSession(value));
