"use client";

import { createContext, useContext } from "react";
import type { AdminPermission } from "@/lib/admin-permissions";

export type AdminChrome = { name: string; permissions: AdminPermission[]; isBootstrap: boolean };

const AdminChromeContext = createContext<AdminChrome>({ name: "", permissions: [], isBootstrap: false });

/**
 * Carries the signed-in operator down to the sidebar.
 *
 * The admin layout is a Server Component and several CMS pages are Client Components, so props
 * cannot be threaded through them — context is what lets the sidebar know which menus to show
 * without every page having to pass it along.
 */
export function AdminChromeProvider({ value, children }: { value: AdminChrome; children: React.ReactNode }) {
  return <AdminChromeContext value={value}>{children}</AdminChromeContext>;
}

export const useAdminChrome = () => useContext(AdminChromeContext);
