"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { couponDiscountFor, describeCoupon, type Coupon } from "@/lib/coupon-shared";
import { formatBaht } from "@/lib/data";

type MyCoupon = Coupon & { claimed: boolean; usable: boolean };

/**
 * Picks a coupon out of the ones the shopper already holds.
 *
 * There is no text field on purpose: a coupon must be claimed before it can be spent, so the
 * wallet is the only source of codes and typing one in could never do anything a tap cannot.
 */
export default function CouponPicker({
  signedIn, subtotal, appliedCode, onPick,
}: { signedIn: boolean; subtotal: number; appliedCode: string; onPick: (code: string) => void }) {
  const [coupons, setCoupons] = useState<MyCoupon[] | null>(null);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A guest never reaches the list below, so there is nothing to fetch or reset here.
    if (!signedIn) return;
    let cancelled = false;
    fetch("/api/account/coupons", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: MyCoupon[]) => { if (!cancelled) setCoupons(Array.isArray(data) ? data.filter((coupon) => coupon.claimed && coupon.usable) : []); })
      .catch(() => { if (!cancelled) setCoupons([]); });
    return () => { cancelled = true; };
  }, [signedIn]);

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

  if (!signedIn) return <Link href="/login?next=%2Fcart" className="block rounded-2xl border border-dashed border-[#d8d0c5] px-4 py-3 text-center text-sm font-bold text-[#687582] transition hover:border-[#ef6c3d] hover:text-[#ef6c3d]">เข้าสู่ระบบเพื่อใช้คูปอง</Link>;
  if (!coupons) return <p className="text-sm text-[#98a2ac]">กำลังโหลดคูปอง...</p>;

  if (coupons.length === 0) return <Link href="/account/coupons" className="block rounded-2xl border border-dashed border-[#d8d0c5] px-4 py-3 text-center text-sm font-bold text-[#687582] transition hover:border-[#ef6c3d] hover:text-[#ef6c3d]">ยังไม่มีคูปอง — ไปกดรับคูปอง</Link>;

  const pick = (code: string) => { onPick(code); setOpen(false); };

  return <div ref={root} className="relative">
    <button
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      aria-haspopup="listbox"
      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${open ? "border-[#ef6c3d]" : "border-[#e0dcd5] hover:border-[#ef6c3d]"}`}
    >
      <span className="min-w-0 text-sm font-bold">{appliedCode ? <>ใช้คูปอง <code className="font-mono text-[#ef6c3d]">{appliedCode}</code></> : `เลือกคูปอง (มี ${coupons.length} ใบ)`}</span>
      <svg viewBox="0 0 20 20" aria-hidden className={`h-3.5 w-3.5 shrink-0 text-[#98a2ac] transition-transform ${open ? "rotate-180" : ""}`}><path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="m5 8 5 5 5-5"/></svg>
    </button>

    {open && <div role="listbox" className="absolute right-0 left-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-[#e8ebee] bg-white p-1.5 shadow-2xl">
      {appliedCode && <button role="option" aria-selected={false} onClick={() => pick("")} className="block w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold text-[#c0392b] transition hover:bg-[#fdecec]">ไม่ใช้คูปอง</button>}
      {coupons.map((coupon) => {
        // A coupon below its minimum is shown, not hidden — the shopper needs to know why.
        const short = subtotal < coupon.minSubtotal;
        const selected = coupon.code === appliedCode;
        return <button
          key={coupon.id}
          role="option"
          aria-selected={selected}
          disabled={short}
          onClick={() => pick(coupon.code)}
          className={`block w-full rounded-xl px-3 py-2.5 text-left transition disabled:opacity-55 ${selected ? "bg-[#fdf3ee]" : "hover:bg-[#faf8f4] disabled:hover:bg-transparent"}`}
        >
          <span className="flex items-baseline justify-between gap-2">
            <b className={`min-w-0 truncate text-sm ${selected ? "text-[#ef6c3d]" : ""}`}>{coupon.name}</b>
            {!short && <b className="shrink-0 text-sm text-[#ef6c3d] tabular-nums">-{formatBaht(couponDiscountFor(coupon, subtotal))}</b>}
          </span>
          <span className="mt-0.5 block text-xs text-[#98a2ac]">{describeCoupon(coupon)}</span>
          {short && <span className="mt-0.5 block text-xs font-bold text-[#b4552a]">ซื้อเพิ่มอีก {formatBaht(coupon.minSubtotal - subtotal)} จึงใช้ได้</span>}
        </button>;
      })}
    </div>}
  </div>;
}
