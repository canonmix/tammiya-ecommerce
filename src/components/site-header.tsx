"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/brand-mark";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import AccountMenu, { ACCOUNT_LINKS, initialOf } from "@/components/account-menu";
import HeaderSearch from "@/components/header-search";
import CartToast from "@/components/cart-toast";
import PendingPaymentAlert from "@/components/pending-payment-alert";
import type { PendingOrder } from "@/lib/orders";

const NAV = [
  { href: "/", label: "หน้าแรก" },
  { href: "/products", label: "สินค้า" },
  { href: "/coupons", label: "แจกคูปอง", flag: true },
  { href: "/payment", label: "วิธีการชำระเงิน" },
];

// `customerName` is read from the session cookie by the server component that renders the header.
export default function SiteHeader({ customerName, freeShippingThreshold, pendingOrders = [] }: { customerName?: string | null; freeShippingThreshold?: number | null; pendingOrders?: PendingOrder[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { count } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  // The badge bumps when the count goes up, so the eye is drawn to where the item landed.
  const [bumping, setBumping] = useState(false);
  const previousCount = useRef(count);

  useEffect(() => {
    if (count <= previousCount.current) { previousCount.current = count; return; }
    previousCount.current = count;
    setBumping(true);
    const timer = setTimeout(() => setBumping(false), 400);
    return () => clearTimeout(timer);
  }, [count]);

  // The page behind a full-screen drawer must not scroll with it.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [menuOpen]);

  // In-page anchors like "/#service" share the home path, so they never count as the active route.
  const isActive = (href: string) => {
    const [path, hash] = href.split("#");
    return path === "/" ? pathname === "/" && !hash : pathname.startsWith(path);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  };

  return <>
    <div className="bg-[#0e141b] px-4 py-2.5 text-center text-[10px] leading-4 font-bold tracking-[.1em] text-white/70 uppercase sm:text-[11px] sm:tracking-[.18em]">
      {/* Driven by the live promotion so the banner never advertises a threshold that no longer applies. */}
      {typeof freeShippingThreshold === "number" ? `ส่งฟรีเมื่อซื้อครบ ฿${freeShippingThreshold.toLocaleString("th-TH")} · ` : ""}เก็บเงินปลายทางทั่วประเทศ
    </div>
    {/* Header and the unpaid-order bar stick together: two separate sticky siblings at top-0
        would sit on top of each other. */}
    <div className="sticky top-0 z-40">
    <header className="border-b border-white/10 bg-[#0e141b]/90 backdrop-blur-xl">
      <div className="container-wide flex h-16 items-center justify-between gap-3 md:h-[76px] md:gap-6">
        <Link href="/" className="shrink-0 text-white">
          <BrandMark className="text-[17px] md:text-xl"/>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => <Link key={item.href} href={item.href} className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-bold transition lg:px-4 ${isActive(item.href) ? "bg-white/10 text-white" : item.flag ? "text-[#ff9152] hover:text-[#ffb184]" : "text-white/60 hover:text-white"}`}>
            {item.flag && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9152]"/>}{item.label}
          </Link>)}
        </nav>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:gap-2.5">
          <HeaderSearch/>
          {customerName
            ? <AccountMenu customerName={customerName} onLogout={logout}/>
            : <Link href="/login" className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80 transition hover:border-white/40 hover:text-white md:block">เข้าสู่ระบบ</Link>}
          <Link href="/cart" aria-label={`ตะกร้า ${count} ชิ้น`} className="flex h-10 items-center rounded-full bg-[#ef6c3d] px-4 text-sm font-bold text-white transition hover:bg-[#ff8352] md:h-auto md:py-2 md:pr-2 md:pl-5">
            <span className="hidden md:inline">ตะกร้า</span>
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 md:hidden"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M2.9 3.7h2l2.1 9.9a1.6 1.6 0 0 0 1.6 1.3h7.3a1.6 1.6 0 0 0 1.6-1.3l1.4-6.3H5.5"/><circle cx="9" cy="19" r="1.4" fill="currentColor"/><circle cx="16" cy="19" r="1.4" fill="currentColor"/></svg>
            <span className={`font-display ml-1.5 inline-flex min-w-5 justify-center rounded-full bg-black/25 px-1.5 py-0.5 text-xs font-bold tabular-nums md:ml-2 md:min-w-6 ${bumping ? "cart-bump" : ""}`}>{count}</span>
          </Link>
          {/* On a phone the avatar rides on the menu button, so being signed in is visible without opening it. */}
          <button onClick={() => setMenuOpen(true)} aria-label={customerName ? `เมนูของ ${customerName}` : "เปิดเมนู"} aria-expanded={menuOpen} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-2.5 text-white md:hidden">
            {customerName && <span className="grid h-7 w-7 place-items-center rounded-full bg-[#ef6c3d] text-xs font-black">{initialOf(customerName)}</span>}
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5"><path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
        </div>
      </div>
    </header>
    <PendingPaymentAlert orders={pendingOrders}/>
    </div>

    {/* Mobile drawer: the desktop nav is hidden below md, so without this there is no way to move around on a phone. */}
    {menuOpen && <div className="fixed inset-0 z-50 md:hidden">
      <button aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)} className="absolute inset-0 h-full w-full bg-black/50 backdrop-blur-sm"/>
      {/* Any link inside closes the drawer, so no effect has to watch the route. */}
      <nav onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMenuOpen(false); }} className="absolute top-0 right-0 flex h-full w-[82%] max-w-xs flex-col bg-[#0e141b] p-6 text-white">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black tracking-[.2em] text-white/40 uppercase">Menu</span>
          <button onClick={() => setMenuOpen(false)} aria-label="ปิดเมนู" className="grid h-10 w-10 place-items-center rounded-full border border-white/15">
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5"><path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        {customerName && <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/[.06] p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#ef6c3d] font-black">{initialOf(customerName)}</span>
          <span className="min-w-0">
            <span className="block truncate font-black">{customerName}</span>
            <span className="block text-xs text-white/45">บัญชีของฉัน</span>
          </span>
        </div>}

        <div className="mt-5 grid gap-1 overflow-y-auto">
          {customerName && <>
            {ACCOUNT_LINKS.map((item) => <Link key={item.href} href={item.href} className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive(item.href) ? "bg-white/10 text-white" : "text-white/65"}`}>{item.label}</Link>)}
            <span aria-hidden className="my-2 h-px bg-white/10"/>
          </>}
          {NAV.map((item) => <Link key={item.href} href={item.href} className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold transition ${isActive(item.href) ? "bg-white/10 text-white" : item.flag ? "text-[#ff9152]" : "text-white/65"}`}>
            {item.flag && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9152]"/>}{item.label}
          </Link>)}
          <Link href="/cart" className="rounded-2xl px-4 py-3 text-sm font-bold text-white/65">ตะกร้าสินค้า ({count})</Link>
        </div>

        <div className="mt-auto border-t border-white/10 pt-5">
          {customerName
            ? <button onClick={logout} className="w-full rounded-full border border-white/15 px-5 py-3 font-bold text-white/85">ออกจากระบบ</button>
            : <Link href="/login" className="block rounded-full bg-[#ef6c3d] px-5 py-3 text-center font-bold text-white">เข้าสู่ระบบ</Link>}
        </div>
      </nav>
    </div>}
    <CartToast/>
  </>;
}
