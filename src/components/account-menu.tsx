"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export const ACCOUNT_LINKS = [
  { href: "/account/profile", label: "ข้อมูลส่วนตัว", hint: "ชื่อ รหัสผ่าน ที่อยู่" },
  { href: "/account/orders", label: "ประวัติการสั่งซื้อ", hint: "คำสั่งซื้อและการจัดส่ง" },
  { href: "/account/coupons", label: "คูปองของฉัน", hint: "ส่วนลดที่ใช้ได้" },
];

// Thai names have no reliable initial letter, so the first character is the honest choice.
export const initialOf = (name: string) => name.trim().charAt(0) || "?";

/**
 * The signed-in name in the header, as an actual menu.
 *
 * Before this it was a bare text link, which gave no hint that anything sat behind it — an
 * avatar, a chevron and a hover state are what make it read as something to press.
 */
export default function AccountMenu({ customerName, onLogout }: { customerName: string; onLogout: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <div ref={root} className="relative hidden md:block">
    <button
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      aria-haspopup="menu"
      className={`flex items-center gap-2.5 rounded-full border py-1.5 pr-3 pl-1.5 transition ${open ? "border-white/40 bg-white/10" : "border-white/15 hover:border-white/35 hover:bg-white/5"}`}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#ef6c3d] text-sm font-black text-white">{initialOf(customerName)}</span>
      <span className="max-w-28 truncate text-sm font-bold text-white/85">{customerName}</span>
      <svg viewBox="0 0 20 20" aria-hidden className={`h-3.5 w-3.5 shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}><path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="m5 8 5 5 5-5"/></svg>
    </button>

    {open && <div role="menu" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-[#e8ebee] bg-white text-[#18212b] shadow-2xl">
      <div className="flex items-center gap-3 border-b border-[#eeebe6] bg-[#faf8f4] px-4 py-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ef6c3d] font-black text-white">{initialOf(customerName)}</span>
        <span className="min-w-0">
          <span className="block truncate font-black">{customerName}</span>
          <span className="block text-xs text-[#98a2ac]">บัญชีของฉัน</span>
        </span>
      </div>
      <nav className="p-1.5">
        {ACCOUNT_LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return <Link
            key={link.href}
            href={link.href}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={`block rounded-xl px-3 py-2.5 transition ${active ? "bg-[#fdf3ee]" : "hover:bg-[#faf8f4]"}`}
          >
            <span className={`block text-sm font-bold ${active ? "text-[#ef6c3d]" : ""}`}>{link.label}</span>
            <span className="block text-xs text-[#98a2ac]">{link.hint}</span>
          </Link>;
        })}
      </nav>
      <div className="border-t border-[#eeebe6] p-1.5">
        <button role="menuitem" onClick={() => { setOpen(false); onLogout(); }} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#c0392b] transition hover:bg-[#fdecec]">ออกจากระบบ</button>
      </div>
    </div>}
  </div>;
}
