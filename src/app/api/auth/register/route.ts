import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, isValidPhone, normalizePhone } from "@/lib/customer-auth";
import { CUSTOMER_COOKIE, CUSTOMER_SESSION_MAX_AGE, createCustomerSession } from "@/lib/customer-session";
import { sessionCookieOptions } from "@/lib/auth-cookie";
import { verifyOtp } from "@/lib/otp";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: string; phone?: string; password?: string; code?: string } | null;
  const name = body?.name?.trim() ?? "";
  const phone = normalizePhone(body?.phone ?? "");
  const password = body?.password ?? "";
  const code = body?.code?.trim() ?? "";

  if (name.length < 2) return NextResponse.json({ error: "กรุณากรอกชื่อ-นามสกุล" }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ error: "เบอร์มือถือไม่ถูกต้อง (ต้องเป็น 10 หลัก ขึ้นต้นด้วย 0)" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  if (!code) return NextResponse.json({ error: "กรุณากรอกรหัส OTP" }, { status: 400 });

  if (await prisma.customer.findUnique({ where: { phone } })) {
    return NextResponse.json({ error: "เบอร์นี้สมัครไว้แล้ว กรุณาเข้าสู่ระบบ" }, { status: 409 });
  }

  // Checked last so a wrong name or password never burns the shopper's verification code.
  const verified = await verifyOtp(phone, code);
  if (!verified.ok) return NextResponse.json({ error: verified.reason }, { status: 400 });

  const customer = await prisma.customer.create({ data: { name, phone, passwordHash: await hashPassword(password) } });
  const response = NextResponse.json({ ok: true, name: customer.name });
  response.cookies.set(CUSTOMER_COOKIE, await createCustomerSession(customer.id), sessionCookieOptions(CUSTOMER_SESSION_MAX_AGE));
  return response;
}
