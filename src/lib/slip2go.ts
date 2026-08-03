// Client for slip2go's slip verification API.
// Contract confirmed against the live service: POST multipart to
// https://connect.slip2go.com/api/verify-slip/qr-image/info with `Authorization: Bearer <secret>`.
const DEFAULT_BASE = "https://connect.slip2go.com";

export type Slip2GoAccount = {
  name?: string | null;
  bank?: { account?: string | null } | null;
  proxy?: { type?: string | null; account?: string | null } | null;
};

export type Slip2GoData = {
  referenceId?: string;
  transRef?: string;
  dateTime?: string;
  amount?: number;
  receiver?: { account?: Slip2GoAccount | null; bank?: { id?: string | null; name?: string | null } | null } | null;
  sender?: { account?: Slip2GoAccount | null; bank?: { id?: string | null; name?: string | null } | null } | null;
};

export type Slip2GoResponse = { code: string; message: string; data?: Slip2GoData };

export const isSlip2GoConfigured = () => Boolean(process.env.SLIP2GO_API_KEY);

// "200000" is the only code that carries a real slip; everything else is a rejection reason.
export const SLIP_FOUND = "200000";

/** Sends the uploaded slip image to slip2go. Network and non-JSON failures surface as a code we own. */
export async function verifySlipImage(file: File): Promise<Slip2GoResponse> {
  const secret = process.env.SLIP2GO_API_KEY;
  if (!secret) return { code: "config_missing", message: "ยังไม่ได้ตั้งค่า SLIP2GO_API_KEY" };

  const body = new FormData();
  body.append("file", file, file.name || "slip.jpg");

  try {
    const response = await fetch(`${process.env.SLIP2GO_API_BASE || DEFAULT_BASE}/api/verify-slip/qr-image/info`, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
      body,
      cache: "no-store",
    });
    const parsed = (await response.json().catch(() => null)) as Slip2GoResponse | null;
    if (!parsed?.code) return { code: "upstream_unreadable", message: `slip2go ตอบกลับผิดรูปแบบ (HTTP ${response.status})` };
    return parsed;
  } catch {
    return { code: "upstream_unreachable", message: "ติดต่อ slip2go ไม่ได้ กรุณาลองใหม่" };
  }
}
