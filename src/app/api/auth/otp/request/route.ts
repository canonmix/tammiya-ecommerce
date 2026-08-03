import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidPhone, normalizePhone } from "@/lib/customer-auth";
import { clientIp, issueOtp, RESEND_COOLDOWN_SECONDS } from "@/lib/otp";
import { sendOtpSms } from "@/lib/sms";

// Sends a signup verification code. Every abuse limit lives in issueOtp so this route only
// has to translate the outcome into a response.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: string } | null;
  const phone = normalizePhone(body?.phone ?? "");
  if (!isValidPhone(phone)) return NextResponse.json({ error: "เบอร์มือถือไม่ถูกต้อง (ต้องเป็น 10 หลัก ขึ้นต้นด้วย 0)" }, { status: 400 });

  // Telling them now saves a wasted code; the register route already reveals the same thing.
  if (await prisma.customer.findUnique({ where: { phone } })) {
    return NextResponse.json({ error: "เบอร์นี้สมัครไว้แล้ว กรุณาเข้าสู่ระบบ" }, { status: 409 });
  }

  const issued = await issueOtp(phone, clientIp(request));
  if (!issued.ok) {
    return NextResponse.json(
      { error: issued.reason, retryAfterSeconds: issued.retryAfterSeconds },
      { status: 429, headers: issued.retryAfterSeconds ? { "Retry-After": String(issued.retryAfterSeconds) } : undefined },
    );
  }

  const sent = await sendOtpSms(phone, issued.code);
  if (!sent.ok) return NextResponse.json({ error: sent.reason }, { status: 503 });

  return NextResponse.json({
    ok: true,
    expiresAt: issued.expiresAt,
    resendAfterSeconds: RESEND_COOLDOWN_SECONDS,
    // Only present when no SMS provider is configured and this is not production.
    devCode: sent.devCode,
  });
}
