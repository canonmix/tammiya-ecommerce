"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatBaht } from "@/lib/data";
import { useCart } from "@/lib/cart";
import { clearCouponCode, useCouponCode } from "@/lib/coupon-code";
import type { ResolvedCart } from "@/lib/checkout-shared";
import MobileActionBar from "@/components/mobile-action-bar";
import ThaiAddressSelect from "@/components/thai-address-select";

type Draft = { recipient: string; phone: string; line1: string; subdistrict: string; district: string; province: string; postalCode: string; note: string };

export default function AddressForm({ defaults }: { defaults: Partial<Draft> }) {
  const router = useRouter();
  const { items } = useCart();
  const [cart, setCart] = useState<ResolvedCart | null>(null);
  const couponCode = useCouponCode();
  const [draft, setDraft] = useState<Draft>({ recipient: defaults.recipient ?? "", phone: defaults.phone ?? "", line1: defaults.line1 ?? "", subdistrict: defaults.subdistrict ?? "", district: defaults.district ?? "", province: defaults.province ?? "", postalCode: defaults.postalCode ?? "", note: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/cart/resolve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, couponCode }) })
      .then((response) => response.json())
      .then((data: ResolvedCart) => { if (!cancelled) setCart(data); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [items, couponCode]);

  const set = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setPending(true);
    const response = await fetch("/api/checkout/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items, address: draft, couponCode }) }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { code?: string; error?: string } | null;
    setPending(false);
    if (!response?.ok || !data?.code) {
      setError(data?.error ?? "บันทึกที่อยู่ไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    // The coupon is now recorded against the order, so it must not be re-applied to the next cart.
    clearCouponCode();
    // The cart is kept until payment succeeds, so a shopper who backs out does not lose it.
    router.push(`/checkout/payment/${data.code}`);
  };

  if (cart && cart.lines.length === 0) return <div className="rounded-[28px] border border-dashed border-[#d8d0c5] bg-[#faf8f4] p-16 text-center">
    <p className="text-lg font-black">ตะกร้าว่าง</p>
    <Link href="/products" className="mt-6 inline-block rounded-full bg-[#18212b] px-7 py-3 font-bold text-white">ไปเลือกสินค้า</Link>
  </div>;

  const field = "w-full rounded-2xl border border-[#e0dcd5] px-4 py-3 text-sm outline-none transition focus:border-[#ef6c3d]";
  const label = "mb-1.5 block text-xs font-black text-[#687582]";

  return <form id="address-form" onSubmit={submit} className="checkout-grid has-action-bar grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
    <section className="rounded-[28px] border border-[#e8ebee] bg-white p-4 sm:p-8">
      <h2 className="text-xl font-black">ที่อยู่จัดส่ง</h2>
      <p className="mt-1.5 text-sm text-[#687582]">กรอกให้ครบเพื่อให้พัสดุถึงมือคุณเร็วที่สุด</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="recipient" className={label}>ชื่อผู้รับ</label><input id="recipient" value={draft.recipient} onChange={set("recipient")} autoComplete="name" required className={field}/></div>
        <div><label htmlFor="phone" className={label}>เบอร์ผู้รับ</label><input id="phone" value={draft.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" placeholder="0812345678" required className={field}/></div>
        <div className="sm:col-span-2"><label htmlFor="line1" className={label}>บ้านเลขที่ หมู่ ซอย ถนน</label><input id="line1" value={draft.line1} onChange={set("line1")} autoComplete="street-address" required className={field}/></div>
        <ThaiAddressSelect
          value={{ province: draft.province, district: draft.district, subdistrict: draft.subdistrict, postalCode: draft.postalCode }}
          onChange={(next) => setDraft((current) => ({ ...current, ...next }))}
          labelClass={label}
          fieldClass={field}
        />
        <div className="sm:col-span-2"><label htmlFor="note" className={label}>หมายเหตุถึงคนส่ง (ไม่บังคับ)</label><input id="note" value={draft.note} onChange={set("note")} placeholder="เช่น ฝากไว้ที่นิติบุคคล" className={field}/></div>
      </div>
      {error && <p role="alert" className="mt-5 rounded-2xl bg-[#fdecec] px-4 py-3 text-sm font-bold text-[#c0392b]">{error}</p>}
    </section>

    <aside className="rounded-[28px] border border-[#e8ebee] bg-white p-5 sm:p-6 lg:sticky lg:top-28">
      <h2 className="text-xl font-black">สรุปคำสั่งซื้อ</h2>
      {cart
        ? <>
            <ul className="mt-5 space-y-3 text-sm">{cart.lines.map((line) => <li key={line.id} className="flex justify-between gap-2">
              <span className="min-w-0 flex-1 truncate text-[#687582]">{line.name}</span>
              <span className="shrink-0 text-[#98a2ac] tabular-nums">× {line.quantity}</span>
              <b className="shrink-0 tabular-nums">{formatBaht(line.lineTotal)}</b>
            </li>)}</ul>
            <dl className="mt-5 space-y-2.5 border-t border-[#eeebe6] pt-5 text-sm">
              <div className="flex justify-between"><dt className="text-[#687582]">รวมสินค้า</dt><dd className="font-bold tabular-nums">{formatBaht(cart.subtotal)}</dd></div>
              {cart.discount > 0 && <div className="flex justify-between"><dt className="text-[#ef6c3d]">ส่วนลดโปรโมชั่น</dt><dd className="font-bold text-[#ef6c3d] tabular-nums">-{formatBaht(cart.discount)}</dd></div>}
              {cart.coupon && <div className="flex justify-between"><dt className="text-[#ef6c3d]">คูปอง {cart.coupon.code}</dt><dd className="font-bold text-[#ef6c3d] tabular-nums">-{formatBaht(cart.coupon.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-[#687582]">ค่าจัดส่ง</dt><dd className="font-bold tabular-nums">{cart.shippingFee === 0 ? "ฟรี" : formatBaht(cart.shippingFee)}</dd></div>
            </dl>
            <div className="mt-5 flex items-end justify-between border-t border-[#eeebe6] pt-5">
              <span className="font-black">ยอดชำระ</span><b className="text-3xl tracking-tight tabular-nums">{formatBaht(cart.total)}</b>
            </div>
          </>
        : <p className="mt-5 text-sm text-[#98a2ac]">กำลังโหลด...</p>}
      <button type="submit" disabled={pending || !cart || cart.lines.length === 0} className="mt-6 w-full rounded-full bg-[#ef6c3d] px-5 py-3.5 font-black text-white transition hover:bg-[#ff8352] disabled:bg-[#c7ccd1]">{pending ? "กำลังสร้างคำสั่งซื้อ..." : "ไปหน้าชำระเงิน"}</button>
      <Link href="/cart" className="mt-3 block py-2 text-center text-sm font-bold text-[#687582] transition hover:text-[#ef6c3d]">← กลับไปแก้ตะกร้า</Link>
    </aside>

    {/* form="address-form" submits the surrounding form from outside its subtree. */}
    <MobileActionBar label="ยอดชำระ" value={cart ? formatBaht(cart.total) : "..."} action={
      <button type="submit" form="address-form" disabled={pending || !cart || cart.lines.length === 0} className="rounded-full bg-[#ef6c3d] px-6 py-3.5 font-black whitespace-nowrap text-white disabled:bg-[#c7ccd1]">{pending ? "กำลังสร้าง..." : "ชำระเงิน"}</button>
    }/>
  </form>;
}
