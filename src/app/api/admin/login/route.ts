import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE, BOOTSTRAP_SUBJECT, createAdminSession } from "@/lib/admin-auth";
import { sessionCookieOptions } from "@/lib/auth-cookie";
import { verifyPassword } from "@/lib/password";
import { needsBootstrap } from "@/lib/admin-user";

const issue = async (subject: string, payload: Record<string, unknown>) => {
  const response = NextResponse.json({ ok: true, ...payload });
  response.cookies.set(ADMIN_COOKIE, await createAdminSession(subject), sessionCookieOptions(ADMIN_SESSION_MAX_AGE));
  return response;
};

/**
 * CMS sign-in.
 *
 * Normally this authenticates an AdminUser. ADMIN_PASSWORD still works, but only while no CMS
 * user exists — that is the bootstrap path for creating the first account, and it stops working
 * by itself the moment one is created.
 */
export async function POST(request: Request) {
  if (!process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { username?: string; password?: string } | null;
  const username = body?.username?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (!password) return NextResponse.json({ error: "กรุณากรอกรหัสผ่าน" }, { status: 400 });

  if (await needsBootstrap()) {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า ADMIN_PASSWORD สำหรับเข้าใช้ครั้งแรก" }, { status: 503 });
    if (password !== expected) return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    return issue(BOOTSTRAP_SUBJECT, { bootstrap: true });
  }

  const user = username ? await prisma.adminUser.findUnique({ where: { username } }) : null;
  // One message for both cases so the form cannot be used to enumerate usernames.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  if (!user.active) return NextResponse.json({ error: "บัญชีนี้ถูกปิดการใช้งาน" }, { status: 403 });

  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return issue(user.id, { name: user.name, role: user.role });
}
