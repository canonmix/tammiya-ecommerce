import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatBaht } from "@/lib/data";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { releaseExpiredOrders } from "@/lib/orders";
import { carrierLabel, shippingLabel, trackingUrl } from "@/lib/shipping";
import PaymentCountdown from "@/components/payment-countdown";
import CancelOrderButton from "@/components/cancel-order-button";

export const metadata: Metadata = { title: "ประวัติการสั่งซื้อ", robots: { index: false } };

const STATUS = {
  PENDING_PAYMENT: { label: "รอชำระเงิน", style: "bg-[#fdf3ee] text-[#b4552a]" },
  PAID: { label: "ชำระแล้ว", style: "bg-[#e8f7ee] text-[#1b7a52]" },
  CANCELLED: { label: "ยกเลิก", style: "bg-[#f4f2ee] text-[#7b8792]" },
} as const;

const when = (value: Date | null) => (value ? value.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "—");

const FILTERS = [
  { key: "all", label: "ทั้งหมด" },
  { key: "PENDING_PAYMENT", label: "รอชำระเงิน" },
  { key: "PAID", label: "ชำระแล้ว" },
  { key: "CANCELLED", label: "ยกเลิก" },
] as const;

export default async function OrderHistoryPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [{ status: requested }, customer] = await Promise.all([searchParams, getCurrentCustomer()]);
  if (!customer) return null;

  const active = FILTERS.some((filter) => filter.key === requested) ? requested! : "all";

  // Sweep first, so an order whose payment window lapsed is not still shown as awaiting payment.
  await releaseExpiredOrders();
  const rows = await prisma.order.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: {
      address: true,
      items: { orderBy: { name: "asc" }, include: { product: { select: { color: true, slug: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } } } },
    },
  });

  // Anything still awaiting payment floats to the top: it is the only row with a deadline on it.
  const sorted = [...rows].sort((a, b) =>
    Number(b.status === "PENDING_PAYMENT") - Number(a.status === "PENDING_PAYMENT"));
  const orders = active === "all" ? sorted : sorted.filter((order) => order.status === active);
  // Counted over every order, not the filtered set, so the tabs do not change as you switch.
  const countOf = (key: string) => (key === "all" ? rows.length : rows.filter((order) => order.status === key).length);

  if (rows.length === 0) return <div className="rounded-[28px] border border-dashed border-[#d8d0c5] bg-[#faf8f4] p-12 text-center">
    <p className="text-lg font-black">ยังไม่มีคำสั่งซื้อ</p>
    <p className="mt-2 text-[#687582]">เมื่อสั่งซื้อแล้ว ประวัติจะมาแสดงที่นี่</p>
    <Link href="/products" className="mt-7 inline-block rounded-full bg-[#18212b] px-7 py-3 font-bold text-white transition hover:bg-[#ef6c3d]">ไปเลือกสินค้า</Link>
  </div>;

  return <div className="grid gap-4">
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {FILTERS.map((filter) => {
        const count = countOf(filter.key);
        const selected = filter.key === active;
        return <Link
          key={filter.key}
          href={filter.key === "all" ? "/account/orders" : `/account/orders?status=${filter.key}`}
          aria-current={selected ? "page" : undefined}
          className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold whitespace-nowrap transition ${
            selected ? "border-[#18212b] bg-[#18212b] text-white" : "border-[#e0dcd5] text-[#687582] hover:border-[#18212b] hover:text-[#18212b]"
          }`}
        >{filter.label} <span className={selected ? "text-white/60" : "text-[#98a2ac]"}>{count}</span></Link>;
      })}
    </div>

    {orders.length === 0 && <p className="rounded-2xl border border-dashed border-[#d8d0c5] bg-[#faf8f4] p-10 text-center text-sm text-[#687582]">ไม่มีคำสั่งซื้อในสถานะนี้</p>}

    {orders.map((order) => {
      const status = STATUS[order.status as keyof typeof STATUS] ?? { label: order.status, style: "" };
      const track = trackingUrl(order.carrier, order.trackingNumber);
      const pieces = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const thumbs = order.items.filter((item) => item.product?.images[0]?.url).slice(0, 3);
      return <article key={order.id} className="overflow-hidden rounded-[28px] border border-[#e8ebee] bg-white">
        {order.status === "PENDING_PAYMENT" && <div className="border-b border-[#f3d9c9] bg-[#fdf3ee] px-5 py-3.5 sm:flex sm:items-center sm:gap-3 sm:px-6">
          {order.expiresAt && <PaymentCountdown expiresAt={order.expiresAt.toISOString()} full/>}
          <span className="mt-2.5 block sm:mt-0 sm:ml-auto sm:flex sm:items-center sm:gap-4">
            <Link
              href={`/checkout/payment/${order.code}`}
              className="flex items-center justify-center gap-2 rounded-full bg-[#ef6c3d] px-6 py-3 text-sm font-black whitespace-nowrap text-white shadow-lg shadow-[#ef6c3d]/25 transition hover:bg-[#ff8352] sm:py-2.5"
            >ไปชำระเงิน <span aria-hidden>→</span></Link>
            <span className="mt-2 block text-center sm:order-first sm:mt-0"><CancelOrderButton code={order.code}/></span>
          </span>
        </div>}

        {/* A native disclosure: closed by default so ten orders read as ten lines, not ten pages. */}
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-3 p-5 transition hover:bg-[#faf8f4] sm:gap-4 sm:p-6">
            <span className="flex shrink-0 -space-x-3">
              {thumbs.map((item) => <span key={item.id} className="relative h-11 w-11 overflow-hidden rounded-xl border-2 border-white ring-1 ring-[#eeebe6]" style={{ background: item.product?.color ?? "#f5f7f8" }}>
                <Image src={item.product!.images[0]!.url} alt={item.name} fill sizes="44px" className="object-cover"/>
              </span>)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <b className="font-display font-extrabold tracking-wide">{order.code}</b>
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.style}`}>{status.label}</span>
              </span>
              <span className="mt-1 block text-xs text-[#98a2ac]">{when(order.createdAt)} · {pieces} ชิ้น</span>
            </span>
            <span className="shrink-0 text-right">
              <b className="font-display block text-lg font-extrabold tabular-nums sm:text-xl">{formatBaht(order.total)}</b>
              <span className="mt-0.5 block text-[11px] font-bold text-[#98a2ac] group-open:hidden">ดูรายละเอียด</span>
              <span className="mt-0.5 hidden text-[11px] font-bold text-[#98a2ac] group-open:block">ย่อรายละเอียด</span>
            </span>
            <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4 shrink-0 text-[#98a2ac] transition-transform group-open:rotate-180"><path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="m5 8 5 5 5-5"/></svg>
          </summary>

          <div className="px-5 pb-5 sm:px-6 sm:pb-6">
            <ul className="grid gap-3 border-t border-[#eeebe6] pt-4">
              {order.items.map((item) => {
                const image = item.product?.images[0]?.url;
                return <li key={item.id} className="flex items-center gap-3 text-sm">
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#eeebe6]" style={{ background: item.product?.color ?? "#f5f7f8" }}>
                    {image && <Image src={image} alt={item.name} fill sizes="48px" className="object-cover"/>}
                  </span>
                  <span className="min-w-0 flex-1">
                    {/* The Tamiya code is how a shopper identifies the exact part, so it leads the line. */}
                    <span className="code-plate block text-[11px] text-[#ef6c3d]">{item.sku}</span>
                    <span className="block truncate leading-5">{item.name}</span>
                  </span>
                  <span className="shrink-0 text-[#98a2ac] tabular-nums">× {item.quantity}</span>
                  <b className="shrink-0 tabular-nums">{formatBaht(item.price * item.quantity)}</b>
                </li>;
              })}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-[#eeebe6] pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-[#687582]">รวมสินค้า</dt><dd className="tabular-nums">{formatBaht(order.subtotal)}</dd></div>
              {order.couponDiscount > 0 && <div className="flex justify-between"><dt className="text-[#ef6c3d]">คูปอง {order.couponCode}</dt><dd className="text-[#ef6c3d] tabular-nums">-{formatBaht(order.couponDiscount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-[#687582]">ค่าจัดส่ง</dt><dd className="tabular-nums">{order.shippingFee === 0 ? "ฟรี" : formatBaht(order.shippingFee)}</dd></div>
            </dl>

            <div className="mt-4 rounded-2xl bg-[#faf8f4] p-4 text-sm leading-6">
              <p className="text-xs font-black text-[#687582]">จัดส่งถึง</p>
              {order.address.recipient} · {order.address.phone}<br/>
              {order.address.line1} {order.address.subdistrict} {order.address.district} {order.address.province} {order.address.postalCode}
              {order.status === "PAID" && <>
                <p className="mt-3 text-xs font-black text-[#687582]">สถานะจัดส่ง</p>
                {order.shippingStatus === "PENDING"
                  ? <span className="text-[#687582]">กำลังเตรียมจัดส่ง</span>
                  : <>{shippingLabel(order.shippingStatus)} · {carrierLabel(order.carrier)} · <span className="font-mono">{order.trackingNumber}</span>
                      {track && <><br/><a href={track} target="_blank" rel="noreferrer" className="font-black text-[#ef6c3d] underline">ติดตามพัสดุ ↗</a></>}</>}
              </>}
            </div>

          </div>
        </details>
      </article>;
    })}
  </div>;
}
