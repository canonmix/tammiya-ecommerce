import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CheckoutSteps from "@/components/checkout-steps";
import PaymentWatcher from "@/components/payment-watcher";
import CancelOrderButton from "@/components/cancel-order-button";
import { prisma } from "@/lib/prisma";
import { formatBaht } from "@/lib/data";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { promptPayPayload } from "@/lib/promptpay";
import { getPaymentSetting } from "@/lib/payment-setting";
import { isSlip2GoConfigured } from "@/lib/slip2go";
import { cancelOrder, isExpired } from "@/lib/orders";
import { getFreeShippingThreshold } from "@/lib/promotions";

// Step 5 of the checkout flow.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ชำระเงิน", robots: { index: false } };

export default async function PaymentPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [customer, freeShipping] = await Promise.all([getCurrentCustomer(), getFreeShippingThreshold()]);
  if (!customer) redirect(`/login?next=${encodeURIComponent(`/checkout/payment/${code}`)}`);

  const order = await prisma.order.findUnique({ where: { code }, include: { items: true, address: true } });
  if (!order || order.customerId !== customer.id) notFound();
  if (order.status === "PAID") redirect(`/checkout/success/${order.code}`);
  // Landing on a hold that already lapsed releases it right here rather than waiting for a poll.
  const expired = isExpired(order);
  if (expired) await cancelOrder(order.id);

  // The receiving account comes from the CMS, so changing it there changes every unpaid QR.
  const payment = await getPaymentSetting();
  // The amount is baked into the payload, so the banking app opens with the total pre-filled.
  const qrSvg = payment.promptPayId ? await QRCode.toString(promptPayPayload(payment.promptPayId, order.total), { type: "svg", margin: 0, errorCorrectionLevel: "M" }) : null;

  return <main className="min-h-screen bg-white">
    <SiteHeader customerName={customer.name} freeShippingThreshold={freeShipping}/>
    <div className="container-wide py-12">
      <CheckoutSteps current={4}/>
      <h1 className="mt-8 mb-10 text-4xl font-black tracking-tight md:text-5xl">สแกนเพื่อชำระเงิน</h1>

      <div className="checkout-grid has-action-bar grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
        <section className="rounded-[28px] border border-[#e8ebee] bg-white p-4 sm:p-8">
          <div className="mx-auto max-w-sm overflow-hidden rounded-[26px] border border-[#e8ebee]">
            <div className="bg-[#123a63] py-4 text-center text-sm font-black tracking-[.2em] text-white">THAI QR PAYMENT</div>
            <div className="bg-white p-7">
              {qrSvg
                ? <div className="mx-auto aspect-square w-full max-w-[280px] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qrSvg }}/>
                : <p className="grid aspect-square w-full place-items-center rounded-2xl bg-[#faf8f4] px-6 text-center text-sm leading-6 font-bold text-[#687582]">ยังไม่ได้ตั้งค่าบัญชีรับเงิน<br/>ตั้งค่าได้ที่ CMS → ตั้งค่าการชำระเงิน</p>}
              <p className="mt-6 text-center text-sm text-[#687582]">ยอดชำระ</p>
              <p className="text-center text-4xl font-black tracking-tight tabular-nums">{formatBaht(order.total)}</p>
              {payment.accountName && <p className="mt-5 text-center text-sm font-black">{payment.accountName}</p>}
              {payment.bankAccountNumber && <p className="mt-1 text-center text-sm text-[#687582]">{payment.bankName && `${payment.bankName} · `}{payment.bankAccountNumber}</p>}
              <p className="mt-4 text-center text-xs text-[#98a2ac]">เลขที่คำสั่งซื้อ {order.code}</p>
            </div>
          </div>
          <ol className="mx-auto mt-8 max-w-sm space-y-2.5 text-sm leading-6 text-[#687582]">
            <li>1. เปิดแอปธนาคาร แล้วเลือกสแกน QR</li>
            <li>2. ตรวจสอบยอด {formatBaht(order.total)} ให้ตรงก่อนกดโอน</li>
            <li>3. กลับมาที่หน้านี้แล้วแนบรูปสลิปเพื่อยืนยัน</li>
          </ol>
          {payment.note && <p className="mx-auto mt-6 max-w-sm rounded-2xl bg-[#faf8f4] px-5 py-4 text-center text-sm leading-6 text-[#687582]">{payment.note}</p>}
        </section>

        <aside className="rounded-[28px] border border-[#e8ebee] bg-white p-5 sm:p-6 lg:sticky lg:top-28">
          <h2 className="text-xl font-black">รายการสั่งซื้อ</h2>
          <ul className="mt-5 space-y-3 text-sm">{order.items.map((item) => <li key={item.id} className="flex justify-between gap-2">
            <span className="min-w-0 flex-1 truncate text-[#687582]">{item.name}</span>
            <span className="shrink-0 text-[#98a2ac] tabular-nums">× {item.quantity}</span>
            <b className="shrink-0 tabular-nums">{formatBaht(item.price * item.quantity)}</b>
          </li>)}</ul>
          <dl className="mt-5 space-y-2.5 border-t border-[#eeebe6] pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-[#687582]">รวมสินค้า</dt><dd className="font-bold tabular-nums">{formatBaht(order.subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-[#687582]">ค่าจัดส่ง</dt><dd className="font-bold tabular-nums">{order.shippingFee === 0 ? "ฟรี" : formatBaht(order.shippingFee)}</dd></div>
          </dl>
          <div className="mt-5 flex items-end justify-between border-t border-[#eeebe6] pt-5">
            <span className="font-black">ยอดชำระ</span><b className="text-3xl tracking-tight tabular-nums">{formatBaht(order.total)}</b>
          </div>
          <div className="mt-5 rounded-2xl bg-[#faf8f4] p-4 text-xs leading-6 text-[#687582]">
            <p className="mb-1 font-black text-[#18212b]">จัดส่งถึง</p>
            {order.address.recipient} · {order.address.phone}<br/>
            {order.address.line1} {order.address.subdistrict} {order.address.district} {order.address.province} {order.address.postalCode}
          </div>
          <div className="mt-6"><PaymentWatcher code={order.code} slipVerifyEnabled={isSlip2GoConfigured()} expiresAt={order.expiresAt?.toISOString() ?? null} initialStatus={expired || order.status !== "PENDING_PAYMENT" ? "CANCELLED" : "PENDING_PAYMENT"}/></div>
          {order.status === "PENDING_PAYMENT" && !expired && <CancelOrderButton code={order.code} block redirectTo="/cart"/>}
        </aside>
      </div>
    </div>
    <SiteFooter/>
  </main>;
}
