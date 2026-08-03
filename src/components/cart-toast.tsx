"use client";

import { useEffect } from "react";
import Link from "next/link";
import { dismissCartToast, useCartToast } from "@/lib/cart-toast";

/**
 * The "it went in" confirmation.
 *
 * Adding to the cart used to change nothing on screen except a number in the header, which read
 * as the button not having worked. Mounted once in the header so every page gets it.
 */
export default function CartToast() {
  const toast = useCartToast();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismissCartToast, 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return <div role="status" aria-live="polite" className="fixed inset-x-0 bottom-24 z-[90] flex justify-center px-4 lg:bottom-8">
    <div key={toast.id} className="toast-in flex w-full max-w-sm items-center gap-3 rounded-2xl border border-[#e8ebee] bg-white p-3 shadow-2xl">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8f7ee]">
        <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#1b7a52]"><path fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9"/></svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-black">ใส่ตะกร้าแล้ว</span>
        <span className="block truncate text-xs text-[#98a2ac]">{toast.name}</span>
      </span>
      <Link href="/cart" onClick={dismissCartToast} className="shrink-0 rounded-full bg-[#18212b] px-4 py-2 text-xs font-black whitespace-nowrap text-white transition hover:bg-[#ef6c3d]">ดูตะกร้า</Link>
    </div>
  </div>;
}
