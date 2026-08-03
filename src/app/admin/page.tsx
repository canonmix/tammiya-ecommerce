import Link from "next/link";
import Image from "next/image";
import { formatBaht } from "@/lib/data";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { RANGES, getDashboard, isRangeKey } from "@/lib/dashboard";
import PaymentCountdown from "@/components/payment-countdown";

// Every figure moves the moment an order is paid, so nothing here may be cached.
export const dynamic = "force-dynamic";


const when = (date: Date) => date.toLocaleString("th-TH", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const waitedFor = (date: Date) => {
  const hours = Math.floor((Date.now() - date.getTime()) / 3600_000);
  if (hours < 1) return "จ่ายเมื่อไม่ถึงชั่วโมง";
  if (hours < 24) return `รอ ${hours} ชม.`;
  return `รอ ${Math.floor(hours / 24)} วัน`;
};

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const data = await getDashboard(isRangeKey(range) ? range : "14d");
  const peak = Math.max(...data.series.map((bucket) => bucket.total), 1);
  // Wide ranges get thinner bars and fewer labels, or a month of them turns into a grey smear.
  const dense = data.series.length > 20;

  const cards = [
    { label: "ยอดขายวันนี้", value: formatBaht(data.sales.today), note: `${data.sales.todayOrders} ออเดอร์ที่ชำระแล้ว` },
    { label: "ยอดขาย 7 วัน", value: formatBaht(data.sales.week), note: `${data.sales.weekOrders} ออเดอร์` },
    { label: "ยอดขายเดือนนี้", value: formatBaht(data.sales.month), note: `${data.sales.monthOrders} ออเดอร์` },
    { label: "ยอดขายรวมทั้งหมด", value: formatBaht(data.sales.lifetime), note: `${data.sales.lifetimeOrders} ออเดอร์` },
  ];

  // What needs someone to act, as opposed to what merely happened.
  const queue = [
    { label: "รอชำระเงิน", value: `${data.queue.pendingCount} ออเดอร์`, note: formatBaht(data.queue.pendingValue), href: "/admin/orders", urgent: data.queue.pendingCount > 0 },
    { label: "จ่ายแล้ว รอจัดส่ง", value: `${data.queue.awaitingShipment} ออเดอร์`, note: "ยังไม่ได้ใส่เลขพัสดุ", href: "/admin/orders", urgent: data.queue.awaitingShipment > 0 },
    { label: "สินค้าใกล้หมด", value: `${data.stock.low} รายการ`, note: `หมดสต็อกแล้ว ${data.stock.out} รายการ`, href: "/admin/products", urgent: data.stock.low + data.stock.out > 0 },
    { label: "ลูกค้าใหม่ 7 วัน", value: `${data.people.newCustomers} คน`, note: `ลูกค้าทั้งหมด ${data.people.customers} คน`, href: null, urgent: false },
  ];

  return <main className="min-h-screen bg-[#faf8f4]">
    <AdminSidebar/>
    <section className="md:ml-64">
      <header className="flex items-center justify-between gap-4 border-b bg-white px-6 py-5 md:px-10">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="mt-1 text-2xl font-black">ภาพรวมร้านค้า</h1>
        </div>
        <Link href="/" className="shrink-0 rounded-full border px-4 py-2 text-sm font-bold">ดูหน้าร้าน</Link>
      </header>

      <div className="space-y-5 p-4 sm:p-6 md:p-10">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => <div key={card.label} className="rounded-2xl border border-[#e8ebee] bg-white p-5">
            <p className="text-sm text-[#687582]">{card.label}</p>
            <p className="font-display mt-2 text-2xl font-extrabold tabular-nums">{card.value}</p>
            <p className="mt-1.5 text-xs text-[#98a2ac]">{card.note}</p>
          </div>)}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {queue.map((item) => {
            const body = <>
              <p className="text-sm text-[#687582]">{item.label}</p>
              <p className={`font-display mt-2 text-xl font-extrabold tabular-nums ${item.urgent ? "text-[#ef6c3d]" : ""}`}>{item.value}</p>
              <p className="mt-1.5 text-xs text-[#98a2ac]">{item.note}</p>
            </>;
            return item.href
              ? <Link key={item.label} href={item.href} className="rounded-2xl border border-[#e8ebee] bg-white p-5 transition hover:border-[#ef6c3d]">{body}</Link>
              : <div key={item.label} className="rounded-2xl border border-[#e8ebee] bg-white p-5">{body}</div>;
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <section className="rounded-2xl border border-[#e8ebee] bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-black">ยอดขาย</h2>
                <p className="mt-1 text-xs text-[#98a2ac]">
                  รวม {formatBaht(data.rangeTotal)} · {data.rangeOrders} ออเดอร์ · สูงสุด {formatBaht(peak)} ต่อ{data.range === "year" ? "เดือน" : "วัน"}
                </p>
              </div>
              {/* Range lives in the URL: reloading or sharing the link keeps the same view. */}
              <div className="flex flex-wrap gap-1.5">
                {RANGES.map((option) => {
                  const selected = option.key === data.range;
                  return <Link
                    key={option.key}
                    href={option.key === "14d" ? "/admin" : `/admin?range=${option.key}`}
                    aria-current={selected ? "page" : undefined}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${selected ? "border-[#18212b] bg-[#18212b] text-white" : "border-[#e0dcd5] text-[#687582] hover:border-[#18212b] hover:text-[#18212b]"}`}
                  >{option.label}</Link>;
                })}
              </div>
            </div>
            {/* Bars in a flex row: a chart library for fourteen numbers would be all cost, no gain.
                Labels live in their own row — nested inside the bar column, the percentage heights
                had no definite parent height to resolve against and every bar collapsed to zero. */}
            <div className={`mt-6 flex h-40 items-end ${dense ? "gap-[3px]" : "gap-1.5"}`}>
              {data.series.map((bucket) => <div key={bucket.key} className="flex h-full flex-1 items-end">
                <div
                  className={`w-full transition ${dense ? "rounded-t-sm" : "rounded-t-md"} ${bucket.total > 0 ? "bg-[#ef6c3d] hover:bg-[#ff8352]" : bucket.future ? "bg-[#f6f4f0]" : "bg-[#eeebe6]"}`}
                  style={{ height: `${bucket.total > 0 ? Math.max((bucket.total / peak) * 100, 4) : 2}%` }}
                  title={`${bucket.label}: ${formatBaht(bucket.total)} · ${bucket.count} ออเดอร์`}
                />
              </div>)}
            </div>
            <div className={`mt-2 flex ${dense ? "gap-[3px]" : "gap-1.5"}`}>
              {data.series.map((bucket, index) => <span key={bucket.key} className="flex-1 overflow-hidden text-center text-[10px] text-[#98a2ac] tabular-nums">
                {/* Every fifth label on a dense range, so they never collide. */}
                {!dense || index % 5 === 0 || index === data.series.length - 1 ? bucket.label : ""}
              </span>)}
            </div>
          </section>

          <section className="rounded-2xl border border-[#e8ebee] bg-white p-5 md:p-6">
            <h2 className="font-black">สินค้าขายดี</h2>
            {data.top.length === 0
              ? <p className="mt-5 rounded-xl bg-[#faf8f4] p-4 text-sm text-[#687582]">ยังไม่มียอดขาย</p>
              : <ol className="mt-5 grid gap-4">
                  {data.top.map((item, index) => <li key={item.sku} className="flex items-center gap-3">
                    <span className="font-display w-4 shrink-0 text-sm font-extrabold text-[#c0c6cc] tabular-nums">{index + 1}</span>
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#eeebe6] bg-[#f5f7f8]">
                      {item.image && <Image src={item.image} alt="" fill sizes="44px" className="object-cover"/>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="code-plate block text-[10.5px] text-[#ef6c3d]">{item.sku}</span>
                      <span className="block truncate text-sm font-bold">{item.name}</span>
                    </span>
                    <b className="font-display shrink-0 text-sm tabular-nums">{item.sold} ชิ้น</b>
                  </li>)}
                </ol>}
            <p className="mt-5 border-t border-[#eeebe6] pt-4 text-xs leading-6 text-[#98a2ac]">
              คูปองที่เปิดใช้ {data.coupons.live} ใบ · ลูกค้ากดรับ {data.coupons.claims} ครั้ง · ใช้จริง {data.coupons.redemptions} ครั้ง
            </p>
          </section>
        </div>

        {/* Two queues, not a feed: each row is a job someone still has to finish. */}
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-[#e8ebee] bg-white p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black">ออเดอร์รอส่ง <span className="font-display text-[#98a2ac]">{data.queue.awaitingShipment}</span></h2>
              <Link href="/admin/orders" className="text-sm font-bold text-[#ef6c3d] transition hover:text-[#18212b]">จัดการ →</Link>
            </div>
            <p className="mt-1 text-xs text-[#98a2ac]">จ่ายแล้วแต่ยังไม่ได้ใส่เลขพัสดุ · เรียงจากที่รอนานที่สุด</p>
            {data.toShip.length === 0
              ? <p className="mt-5 rounded-xl bg-[#faf8f4] p-4 text-sm text-[#687582]">ไม่มีออเดอร์รอส่ง ส่งครบแล้วทุกใบ</p>
              : <ul className="mt-4 divide-y divide-[#f2efe9]">
                  {data.toShip.map((order) => <li key={order.code} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <Link href="/admin/orders" className="font-display font-extrabold tracking-wide transition hover:text-[#ef6c3d]">{order.code}</Link>
                      <span className="block truncate text-xs text-[#98a2ac]">
                        {order.customer} · {order.pieces} ชิ้น{order.province ? ` · ${order.province}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <b className="font-display block text-sm tabular-nums">{formatBaht(order.total)}</b>
                      {order.paidAt && <span className="block text-[11px] text-[#b4552a]">{waitedFor(order.paidAt)}</span>}
                    </span>
                  </li>)}
                </ul>}
          </section>

          <section className="rounded-2xl border border-[#e8ebee] bg-white p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-black">ออเดอร์รอชำระ <span className="font-display text-[#98a2ac]">{data.queue.pendingCount}</span></h2>
              <Link href="/admin/orders" className="text-sm font-bold text-[#ef6c3d] transition hover:text-[#18212b]">จัดการ →</Link>
            </div>
            <p className="mt-1 text-xs text-[#98a2ac]">รวม {formatBaht(data.queue.pendingValue)} · หมดเวลาแล้วระบบคืนสินค้าเข้าสต็อกเอง</p>
            {data.toPay.length === 0
              ? <p className="mt-5 rounded-xl bg-[#faf8f4] p-4 text-sm text-[#687582]">ไม่มีออเดอร์รอชำระเงิน</p>
              : <ul className="mt-4 divide-y divide-[#f2efe9]">
                  {data.toPay.map((order) => <li key={order.code} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <Link href="/admin/orders" className="font-display font-extrabold tracking-wide transition hover:text-[#ef6c3d]">{order.code}</Link>
                      <span className="block truncate text-xs text-[#98a2ac]">{order.customer} · {order.pieces} ชิ้น · สั่ง {when(order.createdAt)}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <b className="font-display block text-sm tabular-nums">{formatBaht(order.total)}</b>
                      {order.expiresAt && <PaymentCountdown expiresAt={order.expiresAt}/>}
                    </span>
                  </li>)}
                </ul>}
          </section>
        </div>
      </div>
    </section>
  </main>;
}
