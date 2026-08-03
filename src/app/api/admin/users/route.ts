import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-user";
import { hashPassword } from "@/lib/password";
import { sanitizePermissions } from "@/lib/admin-permissions";

const SELECT = { id: true, username: true, name: true, role: true, permissions: true, active: true, lastLoginAt: true, createdAt: true };

export async function GET() {
  const { error } = await requireAdminApi("users");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const users = await prisma.adminUser.findMany({ select: SELECT, orderBy: { createdAt: "asc" } });
  return NextResponse.json(users, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi("users");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const body = (await request.json().catch(() => null)) as { username?: string; name?: string; password?: string; role?: string; permissions?: unknown } | null;
  const username = body?.username?.trim().toLowerCase() ?? "";
  const name = body?.name?.trim() ?? "";
  const password = body?.password ?? "";
  const role = body?.role ?? "STAFF";

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return NextResponse.json({ error: "ชื่อผู้ใช้ต้องเป็น a-z, 0-9, . _ - ยาว 3–32 ตัว" }, { status: 400 });
  if (name.length < 2) return NextResponse.json({ error: "กรุณากรอกชื่อ-นามสกุล" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" }, { status: 400 });
  if (await prisma.adminUser.findUnique({ where: { username } })) return NextResponse.json({ error: "ชื่อผู้ใช้นี้ถูกใช้แล้ว" }, { status: 409 });

  const user = await prisma.adminUser.create({
    data: { username, name, role, permissions: sanitizePermissions(role, body?.permissions), passwordHash: await hashPassword(password) },
    select: SELECT,
  });
  return NextResponse.json(user, { status: 201 });
}
