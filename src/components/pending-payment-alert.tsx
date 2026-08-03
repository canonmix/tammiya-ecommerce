import Link from "next/link";
import { formatBaht } from "@/lib/data";
import PaymentCountdown from "@/components/payment-countdown";
import CancelOrderButton from "@/components/cancel-order-button";
import type { PendingOrder } from "@/lib/orders";

/**
 * The "you still owe us for this" bar, rendered inside the sticky header.
 *
 * An unpaid order holds stock for an hour and then dies, so it must not scroll out of sight — it
 * rides along with the header. Travelling down the page means it has to stay short: on a phone,
 * the code, the money, the clock and one button; the reason and the cancel link appear from `sm`
 * up, where there is room for them.
 */
export default function PendingPaymentAlert({ orders }: { orders: PendingOrder[] }) {
  if (orders.length === 0) return null;

  return <section className="border-b border-black/10 bg-gradient-to-r from-[#ef6c3d] to-[#ff9152] text-white">
    <div className="container-wide divide-y divide-white/15">
      {orders.map((order) => <div key={order.code} className="flex items-center gap-3 py-2.5 sm:gap-5 sm:py-3">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <b className="font-display font-extrabold">{order.code}</b>
            <b className="font-display font-extrabold tabular-nums">{formatBaht(order.total)}</b>
            {order.expiresAt && <PaymentCountdown expiresAt={order.expiresAt} tone="dark"/>}
          </span>
          <span className="mt-0.5 hidden text-xs text-white/75 sm:block">
            รอชำระเงิน · {order.itemCount} ชิ้น · ต้องชำระหรือยกเลิกออเดอร์นี้ก่อน จึงจะสั่งซื้อรอบใหม่ได้
          </span>
        </span>

        <span className="hidden shrink-0 sm:block"><CancelOrderButton code={order.code} tone="dark"/></span>
        <Link
          href={`/checkout/payment/${order.code}`}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-black whitespace-nowrap text-[#b4552a] shadow-sm transition hover:bg-[#18212b] hover:text-white sm:px-6 sm:py-2.5"
        >ชำระเงิน <span aria-hidden>→</span></Link>
      </div>)}
    </div>
  </section>;
}
