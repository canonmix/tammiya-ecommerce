import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ADMIN_COOKIE, BOOTSTRAP_SUBJECT, readAdminSession } from "@/lib/admin-auth";
import { effectivePermissions, type AdminPermission } from "@/lib/admin-permissions";

export type CurrentAdmin = { id: string; username: string; name: string; role: string; permissions: AdminPermission[]; isBootstrap: boolean };

/** True while the shop has no CMS users, which is when ADMIN_PASSWORD may still be used. */
export const needsBootstrap = async () => (await prisma.adminUser.count()) === 0;

/**
 * Resolves the signed-in operator.
 *
 * A bootstrap session (ADMIN_PASSWORD, before any user exists) gets every permission so the
 * first real account can be created — but only for as long as the user table is empty, so it
 * cannot be used as a permanent back door once accounts exist.
 */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const subject = await readAdminSession((await cookies()).get(ADMIN_COOKIE)?.value);
  if (!subject) return null;

  if (subject === BOOTSTRAP_SUBJECT) {
    if (!(await needsBootstrap())) return null;
    return { id: BOOTSTRAP_SUBJECT, username: "bootstrap", name: "ผู้ดูแลเริ่มต้น", role: "OWNER", permissions: effectivePermissions("OWNER", []), isBootstrap: true };
  }

  const user = await prisma.adminUser.findUnique({ where: { id: subject } });
  if (!user || !user.active) return null;
  return { id: user.id, username: user.username, name: user.name, role: user.role, permissions: effectivePermissions(user.role, user.permissions), isBootstrap: false };
}

export const adminCan = (admin: CurrentAdmin | null, permission: AdminPermission) => Boolean(admin?.permissions.includes(permission));

/**
 * Page-level guard. Sends anonymous visitors to the login screen and anyone lacking the
 * permission to a page they can actually open, so the CMS never shows a dead end.
 */
export async function requireAdmin(permission: AdminPermission): Promise<CurrentAdmin> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  if (!adminCan(admin, permission)) redirect(`/admin/denied?menu=${permission}`);
  return admin;
}

/** API guard: returns the operator, or the response to send back when access is refused. */
export async function requireAdminApi(permission: AdminPermission) {
  const admin = await getCurrentAdmin();
  if (!admin) return { admin: null as CurrentAdmin | null, error: { status: 401, body: { error: "กรุณาเข้าสู่ระบบ" } } };
  if (!adminCan(admin, permission)) return { admin: null as CurrentAdmin | null, error: { status: 403, body: { error: "คุณไม่มีสิทธิ์ใช้งานส่วนนี้" } } };
  return { admin, error: null };
}
