"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ADMIN_MENUS } from "@/lib/admin-permissions";
import { useAdminChrome } from "@/components/admin/admin-chrome";

/**
 * Lists only the menus this operator may open. Hiding a link is presentation only — the admin
 * layout and every API route re-check the same permission, so a typed URL is refused too.
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const { name, permissions } = useAdminChrome();
  const links = ADMIN_MENUS.filter((menu) => permissions.includes(menu.key));
  const isCurrent = (href: string) => pathname === href;

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    // A full load rather than a router push, so no server-rendered admin page stays cached.
    window.location.assign("/admin/login");
  };

  return <>
    <aside className="fixed hidden h-screen w-64 flex-col bg-[#18212b] p-7 text-white md:flex">
      <Link href="/" className="text-xl font-black"><Image src="/mini4wd-logo-mark.png" alt="MINI4WD Premium Shop" width={580} height={126} className="h-9 w-auto" priority/></Link>
      <p className="mt-2 text-xs text-white/45">PREMIUM SHOP CMS</p>
      <nav className="mt-12 grid gap-3 text-sm">
        {links.map((link) => <Link key={link.href} href={link.href} className={isCurrent(link.href) ? "rounded-xl bg-white/10 p-3 font-bold" : "p-3 text-white/60 transition hover:text-white"}>{link.label}</Link>)}
      </nav>
      <div className="mt-auto border-t border-white/10 pt-5">
        {name && <p className="mb-3 truncate text-xs text-white/45">เข้าใช้เป็น <b className="text-white/80">{name}</b></p>}
        <button onClick={logout} className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-bold text-white/80 transition hover:border-white/40 hover:text-white">ออกจากระบบ</button>
      </div>
    </aside>

    {/* Below md the sidebar is hidden, which would leave the CMS with no navigation at all. */}
    <div className="sticky top-0 z-30 bg-[#18212b] text-white md:hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <Link href="/" aria-label="MINI4WD Premium Shop">
          <Image src="/mini4wd-logo-mark.png" alt="MINI4WD Premium Shop" width={580} height={126} className="h-5 w-auto"/>
        </Link>
        <button onClick={logout} className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/80">ออกจากระบบ</button>
      </div>
      {links.length > 0 && <nav className="flex gap-2 overflow-x-auto px-4 pb-3 text-sm">
        {links.map((link) => <Link key={link.href} href={link.href} className={`shrink-0 rounded-full px-4 py-2 font-bold whitespace-nowrap transition ${isCurrent(link.href) ? "bg-white text-[#18212b]" : "bg-white/10 text-white/70"}`}>{link.label}</Link>)}
      </nav>}
    </div>
  </>;
}
