"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { type Coupon } from "@/lib/coupon-shared";

type MyCoupon = Coupon & {
  claimed: boolean; usedByMe: number; usable: boolean; expired: boolean; notStarted: boolean;
  claimOpen: boolean; claimNotStarted: boolean; claimsLeft: number | null; soldOut: boolean;
};

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" }) : null);

/** The big number on the stub: "20%" or "฿50" — the one thing read at arm's length. */
const headline = (coupon: MyCoupon) =>
  coupon.type === "PERCENT" ? `${coupon.value}%` : `฿${coupon.value.toLocaleString("th-TH")}`;

/**
 * One coupon as a torn ticket: a coloured stub with the value, a perforated seam, then the terms.
 *
 * The stub-and-seam shape is what makes a row read as a coupon rather than a table entry, which
 * matters here because this list is scanned, not studied.
 */
function TicketCard({ coupon, action }: { coupon: MyCoupon; action: React.ReactNode }) {
  const dead = !coupon.usable;
  const perCustomerLeft = coupon.perCustomerLimit > 0 ? Math.max(0, coupon.perCustomerLimit - coupon.usedByMe) : null;

  return <article className={`relative flex overflow-hidden rounded-2xl border ${dead ? "border-[#eeebe6] bg-[#faf8f4]" : "border-[#f3d9c9] bg-white"}`}>
    <div className={`flex w-24 shrink-0 flex-col items-center justify-center px-2 py-5 text-center sm:w-28 ${
      dead ? "bg-[#d8d4cd] text-white" : "bg-gradient-to-b from-[#ff9152] to-[#ef6c3d] text-white"
    }`}>
      <p className="font-display text-2xl leading-7 font-extrabold tracking-tight sm:text-[26px]">{headline(coupon)}</p>
      <p className="mt-0.5 text-[11px] font-bold opacity-80">ส่วนลด</p>
      {coupon.type === "PERCENT" && coupon.maxDiscount > 0 && <p className="mt-1 text-[10px] leading-4 opacity-75">สูงสุด ฿{coupon.maxDiscount.toLocaleString("th-TH")}</p>}
    </div>

    {/* The perforation: a dashed seam with a punched hole at each end. */}
    <span aria-hidden className={`w-0 border-l border-dashed ${dead ? "border-[#d8d0c5]" : "border-[#f3d9c9]"}`}/>
    <span aria-hidden className="absolute -top-2 left-24 h-4 w-4 -translate-x-1/2 rounded-full bg-white sm:left-28"/>
    <span aria-hidden className="absolute -bottom-2 left-24 h-4 w-4 -translate-x-1/2 rounded-full bg-white sm:left-28"/>

    <div className="flex min-w-0 flex-1 items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
      <div className="min-w-0 flex-1">
        <p className={`leading-6 font-black break-words ${dead ? "text-[#98a2ac]" : ""}`}>{coupon.name}</p>
        <p className="mt-1 text-xs text-[#98a2ac]">
          {coupon.minSubtotal > 0 ? `ซื้อครบ ฿${coupon.minSubtotal.toLocaleString("th-TH")}` : "ไม่มียอดขั้นต่ำ"}
          {perCustomerLeft !== null && ` · ใช้ได้อีก ${perCustomerLeft} ครั้ง`}
        </p>
        {coupon.endsAt && <p className={`mt-1 text-xs ${dead ? "text-[#98a2ac]" : "text-[#b4552a]"}`}>ใช้ได้ถึง {when(coupon.endsAt)}</p>}
      </div>
      <div className="shrink-0 text-right">{action}</div>
    </div>
  </article>;
}

/**
 * The shopper's coupon wallet — only what they already hold.
 *
 * Coupons still on offer live on the giveaway page; showing them here too made the two sections
 * read as one list, and this page answers a single question: what can I spend right now?
 */
export default function CouponList() {
  const [coupons, setCoupons] = useState<MyCoupon[] | null>(null);

  useEffect(() => {
    fetch("/api/account/coupons", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: MyCoupon[]) => setCoupons(Array.isArray(data) ? data.filter((coupon) => coupon.claimed) : []))
      .catch(() => setCoupons([]));
  }, []);

  if (!coupons) return <p className="text-sm text-[#98a2ac]">กำลังโหลด...</p>;

  if (coupons.length === 0) return <div className="rounded-[28px] border border-dashed border-[#d8d0c5] bg-[#faf8f4] p-12 text-center">
    <p className="text-lg font-black">ยังไม่มีคูปองในกระเป๋า</p>
    <p className="mt-2 text-[#687582]">ไปกดรับคูปองที่ร้านแจกอยู่ แล้วเลือกใช้ตอนสั่งซื้อได้เลย</p>
    <Link href="/coupons" className="mt-7 inline-block rounded-full bg-[#ef6c3d] px-7 py-3 font-bold text-white transition hover:bg-[#ff8352]">ดูคูปองที่แจกอยู่</Link>
  </div>;

  const usable = coupons.filter((coupon) => coupon.usable);
  const unusable = coupons.filter((coupon) => !coupon.usable);

  return <div className="space-y-8">
    <section>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black sm:text-xl">ใช้ได้ตอนนี้ ({usable.length})</h2>
          <p className="mt-1 text-sm text-[#687582]">เลือกใช้จากหน้าตะกร้าสินค้า ไม่ต้องพิมพ์โค้ด</p>
        </div>
        <Link href="/coupons" className="text-sm font-black text-[#ef6c3d] transition hover:text-[#18212b]">ดูคูปองที่แจกอยู่ →</Link>
      </div>
      {usable.length === 0
        ? <p className="rounded-2xl border border-dashed border-[#d8d0c5] bg-[#faf8f4] p-8 text-center text-sm text-[#687582]">ยังไม่มีคูปองที่ใช้ได้ตอนนี้</p>
        : <div className="grid gap-3 xl:grid-cols-2">
            {usable.map((coupon) => <TicketCard key={coupon.id} coupon={coupon} action={
              <Link href="/cart" className="block rounded-full bg-[#ef6c3d] px-6 py-2.5 text-center text-sm font-black whitespace-nowrap text-white transition hover:bg-[#ff8352]">ใช้เลย</Link>
            }/>)}
          </div>}
    </section>

    {unusable.length > 0 && <section>
      <h2 className="mb-4 text-lg font-black text-[#98a2ac] sm:text-xl">ใช้ไม่ได้แล้ว ({unusable.length})</h2>
      <div className="grid gap-3 xl:grid-cols-2">
        {unusable.map((coupon) => {
          const spent = coupon.perCustomerLimit > 0 && coupon.usedByMe >= coupon.perCustomerLimit;
          return <TicketCard key={coupon.id} coupon={coupon} action={
            <span className="block rounded-full bg-[#f0eeea] px-4 py-2.5 text-center text-xs font-bold whitespace-nowrap text-[#7b8792]">
              {coupon.expired ? "หมดอายุแล้ว" : spent ? "ใช้ครบแล้ว" : coupon.notStarted ? `เริ่ม ${when(coupon.startsAt)}` : "ยังใช้ไม่ได้"}
            </span>
          }/>;
        })}
      </div>
    </section>}
  </div>;
}
