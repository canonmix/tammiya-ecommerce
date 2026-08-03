import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ClaimBoard from "@/components/claim-board";
import { claimableCoupons } from "@/lib/coupons";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getFreeShippingThreshold } from "@/lib/promotions";
import { pendingPaymentOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "แจกคูปองส่วนลด Tamiya Mini 4WD",
  description: "กดรับคูปองส่วนลดของร้าน MINI4WD Premium Shop เก็บไว้ในกระเป๋า แล้วเลือกใช้ตอนสั่งซื้อได้เลย ไม่ต้องพิมพ์โค้ด มีจำนวนจำกัด",
  keywords: ["คูปอง Tamiya", "ส่วนลด Mini 4WD", "โค้ดส่วนลดทามิย่า", "โปรโมชั่น Tamiya"],
  alternates: { canonical: "/coupons" },
  openGraph: { title: "แจกคูปองส่วนลด Tamiya Mini 4WD", description: "กดรับคูปองเก็บไว้ แล้วเลือกใช้ตอนสั่งซื้อ ไม่ต้องพิมพ์โค้ด", url: "/coupons", type: "website" },
};

const STEPS = [
  { no: "01", title: "กดรับคูปอง", copy: "เลือกใบที่ถูกใจแล้วกดรับ คูปองจะเข้ากระเป๋าของคุณทันที" },
  { no: "02", title: "เลือกสินค้า", copy: "ช้อปตามปกติ ไม่ต้องจำโค้ด ไม่ต้องพิมพ์อะไรทั้งนั้น" },
  { no: "03", title: "เลือกใช้ที่ตะกร้า", copy: "หน้าตะกร้าจะมีรายการคูปองของคุณให้เลือก พร้อมบอกยอดที่ลดได้" },
];

export default async function CouponsPage() {
  const customer = await getCurrentCustomer();
  const [coupons, freeShipping] = await Promise.all([claimableCoupons(customer?.id), getFreeShippingThreshold()]);
  const pending = customer ? await pendingPaymentOrders(customer.id) : [];

  return <main className="bg-white">
    <SiteHeader customerName={customer?.name} freeShippingThreshold={freeShipping} pendingOrders={pending}/>

    <section className="ink-panel relative overflow-hidden text-white">
      <div className="hair-grid absolute inset-0 opacity-60"/>
      <div className="container-wide relative py-10 sm:py-16 md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-black tracking-[.16em] uppercase backdrop-blur">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9152]"/>Coupon giveaway
        </span>
        <h1 className="display mt-4 max-w-2xl sm:mt-6">แจก<span className="ember-text">คูปอง</span></h1>
        <p className="mt-4 max-w-lg text-[15px] leading-7 text-white/60 sm:mt-6 sm:text-lg sm:leading-8">กดรับเก็บไว้ในกระเป๋าของคุณ แล้วเลือกใช้ตอนสั่งซื้อ ไม่ต้องพิมพ์โค้ด · คูปองมีจำนวนจำกัดและแจกเป็นช่วงเวลา</p>
      </div>
    </section>

    <section className="container-wide py-10 sm:py-16 md:py-20">
      {coupons.length === 0
        ? <div className="rounded-[28px] border border-dashed border-[#d8d0c5] bg-[#faf8f4] p-12 text-center md:p-16">
            <p className="text-lg font-black">ตอนนี้ยังไม่มีคูปองแจก</p>
            <p className="mt-2 text-[#687582]">รอบหน้าจะประกาศที่หน้านี้ก่อนใคร — ระหว่างนี้ไปดูสินค้ากันก่อน</p>
            <Link href="/products" className="mt-7 inline-block rounded-full bg-[#18212b] px-7 py-3 font-bold text-white transition hover:bg-[#ef6c3d]">ไปเลือกสินค้า</Link>
          </div>
        : <>
            <div className="mb-8">
              <p className="eyebrow mb-3">Available now</p>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">คูปองที่แจกอยู่ตอนนี้ ({coupons.length})</h2>
            </div>
            <ClaimBoard initial={coupons} signedIn={Boolean(customer)}/>
          </>}
    </section>

    <section className="bg-[#faf8f4] py-10 sm:py-16 md:py-20">
      <div className="container-wide">
        <p className="eyebrow mb-2 sm:mb-3">How it works</p>
        <h2 className="text-[26px] leading-8 font-black tracking-tight sm:text-3xl sm:leading-10 md:text-4xl">ใช้คูปองยังไง</h2>
        <div className="mt-6 grid gap-px overflow-hidden rounded-[22px] bg-[#e8ebee] sm:mt-10 sm:rounded-[28px] md:grid-cols-3">
          {STEPS.map((step) => <div key={step.no} className="bg-white p-5 sm:p-8">
            <p className="text-sm font-black text-[#ef6c3d]">{step.no}</p>
            <h3 className="mt-3 text-lg font-black tracking-tight sm:mt-4 sm:text-xl">{step.title}</h3>
            <p className="mt-2 text-[13px] leading-6 text-[#687582] sm:mt-3 sm:text-sm sm:leading-7">{step.copy}</p>
          </div>)}
        </div>
        <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-8 sm:gap-3">
          <Link href="/products" className="inline-flex min-h-12 items-center rounded-full bg-[#ef6c3d] px-7 font-bold text-white transition hover:bg-[#ff8352]">เลือกสินค้า</Link>
          {customer && <Link href="/account/coupons" className="inline-flex min-h-12 items-center rounded-full border border-[#d8d0c5] px-7 font-bold transition hover:border-[#18212b]">ดูคูปองของฉัน</Link>}
        </div>
      </div>
    </section>

    <SiteFooter/>
  </main>;
}
