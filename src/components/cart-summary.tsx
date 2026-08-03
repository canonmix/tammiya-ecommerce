"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { formatBaht } from "@/lib/data";
import { useCart } from "@/lib/cart";
import { setCouponCode, useCouponCode } from "@/lib/coupon-code";
import MobileActionBar from "@/components/mobile-action-bar";
import CouponPicker from "@/components/coupon-picker";
import { usePendingOrder } from "@/lib/pending-order";
import type { ResolvedCart } from "@/lib/checkout-shared";

export default function CartSummary({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const { items, setQty, remove } = useCart();
  // null means the first fetch has not landed yet; later refetches keep showing the previous
  // totals so changing a quantity does not blank the list.
  const [cart, setCart] = useState<ResolvedCart | null>(null);
  // Kept in sessionStorage so the code survives the login detour and the address step.
  const couponCode = useCouponCode();
  // The server refuses a second order while one is unpaid, so the CTA says so up front.
  const waiting = usePendingOrder();

  // Prices and stock are re-read from the server on every cart change — never from localStorage.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, couponCode }) })
      .then((response) => response.json())
      .then((data: ResolvedCart) => { if (!cancelled) setCart(data); })
      .catch(() => { if (!cancelled) setCart({ lines: [], subtotal: 0, discount: 0, coupon: null, couponError: null, shippingFee: 0, total: 0, freeShippingThreshold: null, notices: ["โหลดตะกร้าไม่สำเร็จ กรุณาลองใหม่"] }); });
    return () => { cancelled = true; };
  }, [items, couponCode]);

  // Step 3: an unauthenticated shopper is sent to login and comes straight back to the address form.
  const goNext = () => router.push(signedIn ? "/checkout/address" : `/login?next=${encodeURIComponent("/checkout/address")}`);

  if (!cart) return <p className="rounded-3xl border border-[#e8ebee] bg-white p-16 text-center text-[#687582]">กำลังโหลดตะกร้า...</p>;

  if (cart.lines.length === 0) return <div className="rounded-[28px] border border-dashed border-[#d8d0c5] bg-[#faf8f4] p-16 text-center">
    <p className="text-lg font-black">ตะกร้ายังว่างอยู่</p>
    <p className="mt-2 text-[#687582]">เลือกของที่อยากได้ก่อน แล้วค่อยกลับมาที่นี่</p>
    <Link href="/products" className="mt-7 inline-block rounded-full bg-[#18212b] px-7 py-3 font-bold text-white transition hover:bg-[#ef6c3d]">ไปเลือกสินค้า</Link>
  </div>;

  const remaining = cart.freeShippingThreshold === null ? 0 : cart.freeShippingThreshold - cart.subtotal;

  return <div className="checkout-grid has-action-bar grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
    <section className="space-y-4">
      {cart.notices.map((notice) => <p key={notice} className="rounded-2xl border border-[#f3d9c9] bg-[#fdf3ee] px-5 py-3 text-sm font-bold text-[#b4552a]">{notice}</p>)}
      {cart.lines.map((line) => <article key={line.id} className="flex gap-4 rounded-[26px] border border-[#e8ebee] bg-white p-4 sm:gap-5 sm:p-5">
        <Link href={`/products/${line.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl sm:h-28 sm:w-28" style={{ background: line.color }}>
          {line.image
            ? <Image src={line.image} alt={line.name} fill sizes="112px" className="object-cover"/>
            : <span className="grid h-full place-items-center overflow-hidden px-1 text-xl font-black italic text-[#18212b]/70">{line.name.split(" ")[0]}</span>}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="code-plate text-[11px] text-[#ef6c3d]"><span className="opacity-60">Tamiya</span>{line.sku}</p>
          <Link href={`/products/${line.slug}`} className="mt-1 leading-6 font-black transition hover:text-[#ef6c3d]">{line.name}</Link>
          <p className="mt-1 text-xs text-[#98a2ac]">{line.category} · {formatBaht(line.price)}/ชิ้น{line.price < line.listPrice && <> <span className="line-through">{formatBaht(line.listPrice)}</span> <b className="text-[#ef6c3d]">-{line.discountPercent}%</b></>}</p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
            <div className="flex items-center gap-1 rounded-full border border-[#e0dcd5] p-1">
              <button onClick={() => setQty(line.id, line.quantity - 1)} aria-label={`ลดจำนวน ${line.name}`} className="grid h-10 w-10 place-items-center rounded-full text-xl font-black transition hover:bg-[#f4f2ee]">−</button>
              <span className="min-w-8 text-center text-sm font-black tabular-nums">{line.quantity}</span>
              <button onClick={() => setQty(line.id, Math.min(line.quantity + 1, line.stock))} disabled={line.quantity >= line.stock} aria-label={`เพิ่มจำนวน ${line.name}`} className="grid h-10 w-10 place-items-center rounded-full text-xl font-black transition hover:bg-[#f4f2ee] disabled:text-[#c7ccd1] disabled:hover:bg-transparent">+</button>
            </div>
            <div className="flex items-center gap-4">
              <b className="text-lg tabular-nums">{formatBaht(line.lineTotal)}</b>
              <button onClick={() => remove(line.id)} className="-m-2 p-2 text-xs font-bold text-[#98a2ac] underline transition hover:text-[#ef6c3d]">ลบ</button>
            </div>
          </div>
        </div>
      </article>)}
    </section>

    <aside className="rounded-[28px] border border-[#e8ebee] bg-white p-5 sm:p-6 lg:sticky lg:top-28">
      <h2 className="text-xl font-black">สรุปคำสั่งซื้อ</h2>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between"><dt className="text-[#687582]">รวมสินค้า ({cart.lines.reduce((sum, line) => sum + line.quantity, 0)} ชิ้น)</dt><dd className="font-bold tabular-nums">{formatBaht(cart.subtotal)}</dd></div>
        {cart.discount > 0 && <div className="flex justify-between"><dt className="text-[#ef6c3d]">ส่วนลดโปรโมชั่น</dt><dd className="font-bold text-[#ef6c3d] tabular-nums">-{formatBaht(cart.discount)}</dd></div>}
        {cart.coupon && <div className="flex justify-between"><dt className="text-[#ef6c3d]">คูปอง {cart.coupon.code}</dt><dd className="font-bold text-[#ef6c3d] tabular-nums">-{formatBaht(cart.coupon.discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-[#687582]">ค่าจัดส่ง</dt><dd className="font-bold tabular-nums">{cart.shippingFee === 0 ? "ฟรี" : formatBaht(cart.shippingFee)}</dd></div>
      </dl>
      {remaining > 0 && <p className="mt-4 rounded-2xl bg-[#faf8f4] px-4 py-3 text-xs leading-5 text-[#687582]">ซื้อเพิ่มอีก <b className="text-[#18212b]">{formatBaht(remaining)}</b> รับส่งฟรี</p>}

      <div className="mt-5 border-t border-[#eeebe6] pt-5">
        <CouponPicker signedIn={signedIn} subtotal={cart.subtotal - cart.discount} appliedCode={cart.coupon?.code ?? ""} onPick={setCouponCode}/>
        {cart.couponError && <p className="mt-2 text-xs font-bold text-[#c0392b]">{cart.couponError}</p>}
      </div>
      <div className="mt-5 flex items-end justify-between border-t border-[#eeebe6] pt-5">
        <span className="font-black">ยอดชำระ</span>
        <b className="font-display text-3xl font-extrabold tracking-tight tabular-nums">{formatBaht(cart.total)}</b>
      </div>
      {waiting
        ? <Link href={`/checkout/payment/${waiting.code}`} className="mt-6 block w-full rounded-full bg-[#ef6c3d] px-5 py-3.5 text-center font-black text-white transition hover:bg-[#ff8352]">ชำระเงินออเดอร์ {waiting.code} ก่อน</Link>
        : <button onClick={goNext} className="mt-6 w-full rounded-full bg-[#ef6c3d] px-5 py-3.5 font-black text-white transition hover:bg-[#ff8352]">{signedIn ? "ดำเนินการต่อ" : "เข้าสู่ระบบเพื่อสั่งซื้อ"}</button>}
      <Link href="/products" className="mt-3 block py-2 text-center text-sm font-bold text-[#687582] transition hover:text-[#ef6c3d]">เลือกสินค้าเพิ่ม</Link>
    </aside>

    <MobileActionBar label="ยอดชำระ" value={formatBaht(cart.total)} action={
      waiting
        ? <Link href={`/checkout/payment/${waiting.code}`} className="rounded-full bg-[#ef6c3d] px-6 py-3.5 font-black whitespace-nowrap text-white">ไปชำระเงิน</Link>
        : <button onClick={goNext} className="rounded-full bg-[#ef6c3d] px-6 py-3.5 font-black whitespace-nowrap text-white">{signedIn ? "ไปต่อ" : "เข้าสู่ระบบ"}</button>
    }/>
  </div>;
}
