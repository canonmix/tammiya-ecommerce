import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-user";
import { hashPassword } from "@/lib/password";
import { effectivePermissions, sanitizePermissions } from "@/lib/admin-permissions";

const SELECT = { id: true, username: true, name: true, role: true, permissions: true, active: true, lastLoginAt: true, createdAt: true };

/**
 * Guards the one change nobody can undo: removing the last person who can manage users.
 * Counts active accounts that would still hold the "users" permission after `change`.
 */
async function remainingUserAdmins(excludeId: string, change?: { role: string; permissions: string[]; active: boolean }) {
  const users = await prisma.adminUser.findMany({ select: { id: true, role: true, permissions: true, active: true } });
  return users.filter((user) => {
    const next = user.id === excludeId ? change : user;
    if (!next || !next.active) return false;
    return effectivePermissions(next.role, next.permissions).includes("users");
  }).length;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi("users");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const { id } = await params;
  const target = await prisma.adminUser.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { name?: string; role?: string; permissions?: unknown; active?: boolean; password?: string } | null;
  const name = body?.name?.trim() ?? target.name;
  const role = body?.role ?? target.role;
  const permissions = body?.permissions === undefined && body?.role === undefined ? target.permissions : sanitizePermissions(role, body?.permissions);
  const active = typeof body?.active === "boolean" ? body.active : target.active;

  if (name.length < 2) return NextResponse.json({ error: "กรุณากรอกชื่อ-นามสกุล" }, { status: 400 });
  if (body?.password !== undefined && body.password.length < 8) return NextResponse.json({ error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" }, { status: 400 });

  // Locking yourself out mid-edit is the mistake worth preventing outright.
  if (admin?.id === id && !active) return NextResponse.json({ error: "ปิดการใช้งานบัญชีตัวเองไม่ได้" }, { status: 409 });
  if (await remainingUserAdmins(id, { role, permissions, active }) === 0) {
    return NextResponse.json({ error: "ต้องเหลือผู้ใช้ที่จัดการผู้ใช้ได้อย่างน้อย 1 คน" }, { status: 409 });
  }

  const user = await prisma.adminUser.update({
    where: { id },
    data: { name, role, permissions, active, ...(body?.password ? { passwordHash: await hashPassword(body.password) } : {}) },
    select: SELECT,
  });
  return NextResponse.json(user);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { admin, error } = await requireAdminApi("users");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const { id } = await params;
  if (admin?.id === id) return NextResponse.json({ error: "ลบบัญชีตัวเองไม่ได้" }, { status: 409 });
  if (!(await prisma.adminUser.findUnique({ where: { id } }))) return NextResponse.json({ error: "ไม่พบผู้ใช้" }, { status: 404 });
  if (await remainingUserAdmins(id) === 0) {
    return NextResponse.json({ error: "ต้องเหลือผู้ใช้ที่จัดการผู้ใช้ได้อย่างน้อย 1 คน" }, { status: 409 });
  }

  await prisma.adminUser.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
