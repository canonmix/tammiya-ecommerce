// Signed cookie for shopper sessions, mirroring src/lib/admin-auth.ts.
// Deliberately WebCrypto-only: the proxy (middleware) imports this, and node:crypto is not available there.
const encoder = new TextEncoder();

const toBase64Url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");
const fromBase64Url = (value: string) => new Uint8Array(Buffer.from(value, "base64url"));

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

const secret = () => process.env.CUSTOMER_SESSION_SECRET ?? process.env.ADMIN_SESSION_SECRET;

export const CUSTOMER_COOKIE = "tamiya_customer_session";
export const CUSTOMER_SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export async function createCustomerSession(customerId: string) {
  const key = secret();
  if (!key) throw new Error("CUSTOMER_SESSION_SECRET is not configured");
  const payload = `${customerId}|${Date.now()}`;
  return `${toBase64Url(encoder.encode(payload))}.${await sign(payload, key)}`;
}

// Returns the customer id when the cookie is intact and unexpired, otherwise null.
export async function readCustomerSession(value: string | undefined) {
  const key = secret();
  if (!key || !value) return null;
  const [encodedPayload, providedSignature] = value.split(".");
  if (!encodedPayload || !providedSignature) return null;
  try {
    const payload = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const [customerId, issuedAt] = payload.split("|");
    if (!customerId || !issuedAt) return null;
    if (Date.now() - Number(issuedAt) > CUSTOMER_SESSION_MAX_AGE * 1000) return null;
    return (await sign(payload, key)) === providedSignature ? customerId : null;
  } catch {
    return null;
  }
}
