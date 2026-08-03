"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/account/profile", label: "ข้อมูลส่วนตัว", hint: "ชื่อ รหัสผ่าน และที่อยู่จัดส่ง" },
  { href: "/account/orders", label: "ประวัติการสั่งซื้อ", hint: "คำสั่งซื้อและสถานะจัดส่ง" },
  { href: "/account/coupons", label: "คูปองของฉัน", hint: "ส่วนลดที่ใช้ได้" },
];

/** Side rail on desktop, a scrollable chip row on phones — same pattern as the catalog filters. */
export default function AccountNav() {
  const pathname = usePathname();
  const active = (href: string) => pathname.startsWith(href);

  return <>
    <nav className="hidden lg:block">
      <ul className="grid gap-1">
        {LINKS.map((link) => <li key={link.href}>
          <Link href={link.href} className={`block rounded-2xl px-4 py-3 transition ${active(link.href) ? "bg-[#18212b] text-white" : "hover:bg-[#f4f2ee]"}`}>
            <span className="block text-sm font-black">{link.label}</span>
            <span className={`mt-0.5 block text-xs ${active(link.href) ? "text-white/50" : "text-[#98a2ac]"}`}>{link.hint}</span>
          </Link>
        </li>)}
      </ul>
    </nav>
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden">
      {LINKS.map((link) => <Link key={link.href} href={link.href} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold whitespace-nowrap transition ${active(link.href) ? "bg-[#18212b] text-white" : "border border-[#e0dcd5] text-[#465360]"}`}>{link.label}</Link>)}
    </div>
  </>;
}
