/**
 * SMS delivery for one-time passwords, via the send-sms.in.th gateway.
 *
 * Contract taken from the provider's own OpenAPI document (/swagger/v1/swagger.json):
 * POST /api/v3/SendSMS with { senderId, message, mobileNumbers, apiKey, clientId } and a
 * response of { ErrorCode, ErrorDescription, Data }, where ErrorCode 0 means accepted.
 */
export type SmsResult = { ok: true; devCode?: string } | { ok: false; reason: string };

const BASE = process.env.SMS_API_BASE || "https://api.send-sms.in.th";

export const isSmsConfigured = () => Boolean(process.env.SMS_API_KEY && process.env.SMS_CLIENT_ID);

// Thai gateways expect the international form; 0812345678 becomes 66812345678.
export const toInternational = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("66")) return digits;
  return `66${digits.replace(/^0/, "")}`;
};

// Kept to one Unicode SMS segment (70 characters) so a code never costs more than one credit.
const otpMessage = (code: string) => `รหัส OTP: ${code} (ใช้ได้ 10 นาที) - MINI4WD PREMIUM SHOP`;

export async function sendOtpSms(phone: string, code: string): Promise<SmsResult> {
  if (!isSmsConfigured()) {
    // Without a gateway the only honest options are "tell the developer" or "refuse" —
    // never pretend the message was sent.
    if (process.env.NODE_ENV === "production") {
      return { ok: false, reason: "ยังไม่ได้เชื่อมต่อผู้ให้บริการ SMS จึงส่ง OTP ไม่ได้" };
    }
    console.info(`[otp] ${phone} -> ${code} (dev mode: no SMS provider configured)`);
    return { ok: true, devCode: code };
  }

  try {
    const response = await fetch(`${BASE}/api/v3/SendSMS`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        apiKey: process.env.SMS_API_KEY,
        clientId: process.env.SMS_CLIENT_ID,
        senderId: process.env.SMS_SENDER_ID || "",
        mobileNumbers: toInternational(phone),
        message: otpMessage(code),
        is_Unicode: true,   // the message is Thai
        is_Flash: false,
      }),
    });
    const data = (await response.json().catch(() => null)) as { ErrorCode?: number; ErrorDescription?: string } | null;
    if (!response.ok || !data) return { ok: false, reason: `ส่ง SMS ไม่สำเร็จ (HTTP ${response.status})` };
    if (data.ErrorCode !== 0) {
      console.error(`[otp] gateway refused: ${data.ErrorCode} ${data.ErrorDescription}`);
      // The gateway's own wording is not shopper-facing, so it is logged rather than shown.
      return { ok: false, reason: "ส่ง SMS ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "ติดต่อผู้ให้บริการ SMS ไม่ได้ กรุณาลองใหม่" };
  }
}

/** Remaining SMS credits, for the CMS to surface. Null when unavailable. */
export async function smsBalance(): Promise<string | null> {
  if (!isSmsConfigured()) return null;
  try {
    const url = new URL(`${BASE}/api/v2/Balance`);
    url.searchParams.set("ApiKey", process.env.SMS_API_KEY!);
    url.searchParams.set("ClientId", process.env.SMS_CLIENT_ID!);
    const data = (await fetch(url, { cache: "no-store" }).then((r) => r.json())) as { ErrorCode?: number; Data?: { PluginType?: string; Credits?: string }[] };
    if (data.ErrorCode !== 0) return null;
    return data.Data?.find((row) => row.PluginType === "SMS")?.Credits ?? null;
  } catch {
    return null;
  }
}
