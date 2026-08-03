import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CheckoutSteps from "@/components/checkout-steps";
import ClearCartOnMount from "@/components/clear-cart-on-mount";
import { prisma } from "@/lib/prisma";
import { formatBaht } from "@/lib/data";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { carrierLabel, shippingLabel, trackingUrl } from "@/lib/shipping";
import { getFreeShippingThreshold } from "@/lib/promotions";

// Step 6 of the checkout flow.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "สั่งซื้อสำเร็จ", robots: { index: false } };

export default async function SuccessPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [customer, freeShipping] = await Promise.all([getCurrentCustomer(), getFreeShippingThreshold()]);
  if (!customer) redirect(`/login?next=${encodeURIComponent(`/checkout/success/${code}`)}`);

  const order = await prisma.order.findUnique({ where: { code }, include: { items: true, address: true } });
  if (!order || order.customerId !== customer.id) notFound();
  // Only a paid order belongs here: a pending one goes back to the QR, and a cancelled
  // one (expired hold) must not be dressed up as a completed purchase.
  if (order.status !== "PAID") redirect(`/checkout/payment/${order.code}`);

  return <main className="min-h-screen bg-white">
    <SiteHeader customerName={customer.name} freeShippingThreshold={freeShipping}/>
    <ClearCartOnMount/>
    <div className="container-wide py-12">
      <CheckoutSteps current={5}/>
      <div className="mx-auto mt-10 max-w-2xl text-center">
        <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#e8f7ee] text-4xl text-[#22a06b]">✓</span>
        <h1 className="mt-7 text-4xl font-black tracking-tight md:text-5xl">ขอบคุณสำหรับคำสั่งซื้อ</h1>
        <p className="mt-4 text-lg leading-8 text-[#687582]">เราได้รับการชำระเงินของคุณแล้ว ทีมงานจะแพ็กและจัดส่งพร้อมแจ้งเลขพัสดุให้ทางเบอร์ที่ลงทะเบียนไว้</p>
        <p className="mt-7 inline-block rounded-full bg-[#faf8f4] px-6 py-3 text-sm font-black">เลขที่คำสั่งซื้อ <span className="text-[#ef6c3d]">{order.code}</span></p>
      </div>

      <div className="mx-auto mt-12 max-w-2xl rounded-[28px] border border-[#e8ebee] bg-white p-6 sm:p-8">
        <h2 className="text-xl font-black">รายละเอียด</h2>
        <ul className="mt-5 space-y-3 text-sm">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-2">
          <span className="min-w-0 flex-1 text-[#687582]">{item.name}</span>
          <span className="shrink-0 text-[#98a2ac] tabular-nums">× {item.quantity}</span>
          <b className="shrink-0 tabular-nums">{formatBaht(item.price * item.quantity)}</b>
        </li>)}</ul>
        <dl className="mt-5 space-y-2.5 border-t border-[#eeebe6] pt-5 text-sm">
          <div className="flex justify-between"><dt className="text-[#687582]">รวมสินค้า</dt><dd className="font-bold tabular-nums">{formatBaht(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-[#687582]">ค่าจัดส่ง</dt><dd className="font-bold tabular-nums">{order.shippingFee === 0 ? "ฟรี" : formatBaht(order.shippingFee)}</dd></div>
          <div className="flex justify-between border-t border-[#eeebe6] pt-3"><dt className="font-black text-[#18212b]">ยอดชำระแล้ว</dt><dd className="text-xl font-black tabular-nums">{formatBaht(order.total)}</dd></div>
        </dl>
        {order.shippingStatus !== "PENDING" && <div className="mt-6 rounded-2xl bg-[#eaf1fb] p-5 text-sm leading-7 text-[#2b5f9e]">
          <p className="mb-1 font-black">{shippingLabel(order.shippingStatus)}</p>
          {carrierLabel(order.carrier)} · เลขพัสดุ <b>{order.trackingNumber}</b>
          {trackingUrl(order.carrier, order.trackingNumber) && <><br/><a href={trackingUrl(order.carrier, order.trackingNumber)!} target="_blank" rel="noreferrer" className="font-black underline">ติดตามพัสดุ ↗</a></>}
        </div>}
        {order.slipTransRef && <div className="mt-6 rounded-2xl bg-[#e8f7ee] p-5 text-sm leading-7 text-[#1b7a52]">
          <p className="mb-1 font-black">ตรวจสอบสลิปแล้ว</p>
          เลขอ้างอิงธุรกรรม {order.slipTransRef}
          {order.slipSenderName && <><br/>โอนจาก {order.slipSenderName}{order.slipBankName && ` · ${order.slipBankName}`}</>}
        </div>}
        <div className="mt-6 rounded-2xl bg-[#faf8f4] p-5 text-sm leading-7 text-[#687582]">
          <p className="mb-1 font-black text-[#18212b]">จัดส่งถึง</p>
          {order.address.recipient} · {order.address.phone}<br/>
          {order.address.line1} {order.address.subdistrict} {order.address.district} {order.address.province} {order.address.postalCode}
          {order.address.note && <><br/><span className="text-[#98a2ac]">หมายเหตุ: {order.address.note}</span></>}
        </div>
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/products" className="rounded-full bg-[#18212b] px-7 py-3.5 font-bold text-white transition hover:bg-[#ef6c3d]">ช้อปต่อ</Link>
        <Link href="/" className="rounded-full border border-[#d8d0c5] px-7 py-3.5 font-bold transition hover:border-[#18212b]">กลับหน้าแรก</Link>
      </div>
    </div>
    <SiteFooter/>
  </main>;
}
