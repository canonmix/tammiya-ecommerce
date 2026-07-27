import { NextResponse } from "next/server";
import { ADMIN_COOKIE, createAdminSession } from "@/lib/admin-auth";

export async function POST(request: Request) {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword || !process.env.ADMIN_SESSION_SECRET) {
    return NextResponse.json({ error: "Admin authentication is not configured" }, { status: 503 });
  }
  const body = await request.json().catch(() => null) as { password?: string } | null;
  if (!body?.password || body.password !== expectedPassword) {
    return NextResponse.json({ error: "รหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, await createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 8 * 60 * 60,
    path: "/",
  });
  return response;
}
