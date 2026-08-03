import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminChromeProvider } from "@/components/admin/admin-chrome";
import { getCurrentAdmin } from "@/lib/admin-user";
import { menuForPath } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

// robots.txt already asks crawlers to stay out; this is the half that a crawler cannot ignore,
// and it covers the CMS login screen, which is the one admin page that answers without a session.
export const metadata: Metadata = { title: { default: "จัดการร้าน", template: "%s | จัดการร้าน" }, robots: { index: false, follow: false, nocache: true } };

/**
 * Single enforcement point for the CMS.
 *
 * Several admin screens are Client Components and cannot run a server-side guard themselves,
 * so the check lives here: the proxy forwards the pathname as a header, this resolves which
 * menu it belongs to, and anyone without that permission never reaches the page.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-admin-path") ?? "";

  // The login screen is the way in, so it must stay reachable without a session.
  if (pathname === "/admin/login") return <>{children}</>;

  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const menu = menuForPath(pathname);
  if (menu && !admin.permissions.includes(menu.key)) redirect(`/admin/denied?menu=${menu.key}`);

  return <AdminChromeProvider value={{ name: admin.name, permissions: admin.permissions, isBootstrap: admin.isBootstrap }}>
    {children}
  </AdminChromeProvider>;
}
