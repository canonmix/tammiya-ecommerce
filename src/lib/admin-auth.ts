const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

function fromBase64Url(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"));
}

async function sign(value: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value))));
}

export async function createAdminSession() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET is not configured");
  const payload = `${Date.now()}.${crypto.randomUUID()}`;
  return `${toBase64Url(encoder.encode(payload))}.${await sign(payload, secret)}`;
}

export async function isValidAdminSession(value: string | undefined) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !value) return false;
  const [encodedPayload, providedSignature] = value.split(".");
  if (!encodedPayload || !providedSignature) return false;
  try {
    const payload = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const [createdAt] = payload.split(".");
    if (!createdAt || Date.now() - Number(createdAt) > 8 * 60 * 60 * 1000) return false;
    const expectedSignature = await sign(payload, secret);
    return expectedSignature === providedSignature;
  } catch {
    return false;
  }
}

export const ADMIN_COOKIE = "tamiya_admin_session";
