import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { hashPassword, verifyPassword } from "@/lib/password";

// Name and password only. The phone number is the login identity and was proved by OTP,
// so changing it would need a fresh verification rather than a text field.
export async function PATCH(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { name?: string; currentPassword?: string; newPassword?: string } | null;
  const name = body?.name?.trim() ?? customer.name;
  if (name.length < 2) return NextResponse.json({ error: "กรุณากรอกชื่อ-นามสกุล" }, { status: 400 });

  const data: { name: string; passwordHash?: string } = { name };

  if (body?.newPassword) {
    if (body.newPassword.length < 8) return NextResponse.json({ error: "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
    // A Facebook-only account has no password to check against, so it just sets one.
    if (customer.passwordHash && !(await verifyPassword(body.currentPassword ?? "", customer.passwordHash))) {
      return NextResponse.json({ error: "รหัสผ่านเดิมไม่ถูกต้อง" }, { status: 400 });
    }
    data.passwordHash = await hashPassword(body.newPassword);
  }

  const updated = await prisma.customer.update({ where: { id: customer.id }, data, select: { name: true } });
  return NextResponse.json({ ok: true, name: updated.name });
}
