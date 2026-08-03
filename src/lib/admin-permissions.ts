// Menu-level permissions for the CMS. Free of Prisma/node imports so the sidebar and the
// user-manager form (client components) can share exactly the same definitions as the server.

export const ADMIN_MENUS = [
  { key: "dashboard", href: "/admin", label: "Dashboard" },
  { key: "orders", href: "/admin/orders", label: "คำสั่งซื้อ" },
  { key: "products", href: "/admin/products", label: "สินค้า" },
  { key: "categories", href: "/admin/categories", label: "จัดการ Category" },
  { key: "promotions", href: "/admin/promotions", label: "โปรโมชั่น" },
  { key: "coupons", href: "/admin/coupons", label: "คูปอง" },
  { key: "payment", href: "/admin/payment", label: "ตั้งค่าการชำระเงิน" },
  { key: "users", href: "/admin/users", label: "จัดการผู้ใช้" },
] as const;

export type AdminPermission = (typeof ADMIN_MENUS)[number]["key"];

export const ALL_PERMISSIONS = ADMIN_MENUS.map((menu) => menu.key) as AdminPermission[];

export const ROLES = [
  { key: "OWNER", label: "เจ้าของร้าน", detail: "เข้าได้ทุกเมนู รวมถึงจัดการผู้ใช้" },
  { key: "MANAGER", label: "ผู้จัดการ", detail: "ดูแลสินค้าและการเงิน แต่จัดการผู้ใช้ไม่ได้" },
  { key: "STAFF", label: "พนักงาน", detail: "ดูแลคำสั่งซื้อ สินค้า และหมวดหมู่" },
  { key: "CUSTOM", label: "กำหนดเอง", detail: "เลือกสิทธิ์รายเมนูเอง" },
] as const;

export type AdminRole = (typeof ROLES)[number]["key"];

// Presets only seed the checkboxes — what is actually enforced is the stored permission list.
export const ROLE_PRESETS: Record<Exclude<AdminRole, "CUSTOM">, AdminPermission[]> = {
  OWNER: [...ALL_PERMISSIONS],
  MANAGER: ["dashboard", "orders", "products", "categories", "promotions", "coupons", "payment"],
  STAFF: ["dashboard", "orders", "products", "categories"],
};

/**
 * OWNER always resolves to every menu, including ones added in a future release — otherwise
 * a new menu would be locked to everyone until each owner row was edited by hand.
 */
export function effectivePermissions(role: string, permissions: string[]): AdminPermission[] {
  if (role === "OWNER") return [...ALL_PERMISSIONS];
  return ALL_PERMISSIONS.filter((permission) => permissions.includes(permission));
}

export const menuForPath = (pathname: string) =>
  // Longest href first so /admin/products is not matched by /admin.
  [...ADMIN_MENUS].sort((a, b) => b.href.length - a.href.length).find((menu) => pathname === menu.href || pathname.startsWith(`${menu.href}/`));

/** Unknown keys are dropped rather than stored, so a stale client cannot invent a permission. */
export function sanitizePermissions(role: string, input: unknown): AdminPermission[] {
  if (role === "OWNER") return [...ALL_PERMISSIONS];
  if (role in ROLE_PRESETS && !Array.isArray(input)) return [...ROLE_PRESETS[role as keyof typeof ROLE_PRESETS]];
  const requested = Array.isArray(input) ? input : [];
  return ALL_PERMISSIONS.filter((permission) => requested.includes(permission));
}
