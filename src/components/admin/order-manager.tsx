"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { formatBaht } from "@/lib/data";
import { CARRIERS, carrierLabel, shippingLabel, trackingUrl } from "@/lib/shipping";

type OrderItem = { id: string; sku: string; name: string; price: number; quantity: number; product: { color: string; images: { url: string }[] } | null };
type OrderRow = {
  id: string; code: string; status: string; subtotal: number; discount: number; shippingFee: number; total: number;
  createdAt: string; paidAt: string | null; expiresAt: string | null;
  slipTransRef: string | null; slipSenderName: string | null; slipBankName: string | null;
  shippingStatus: string; carrier: string | null; trackingNumber: string | null; shippedAt: string | null; deliveredAt: string | null;
  customer: { name: string; phone: string | null };
  address: { recipient: string; phone: string; line1: string; subdistrict: string; district: string; province: string; postalCode: string; note: string };
  items: OrderItem[];
};

const STATUSES = [
  { key: "", label: "ทั้งหมด" },
  { key: "PENDING_PAYMENT", label: "รอชำระเงิน" },
  { key: "PAID", label: "ชำระแล้ว" },
  { key: "CANCELLED", label: "ยกเลิก" },
] as const;

const SHIPPING_FILTERS = [
  { key: "", label: "ทั้งหมด" },
  { key: "PENDING", label: "รอจัดส่ง" },
  { key: "SHIPPED", label: "จัดส่งแล้ว" },
  { key: "DELIVERED", label: "ถึงมือผู้รับ" },
] as const;

const SHIPPING_STYLE: Record<string, string> = {
  PENDING: "bg-[#f4f2ee] text-[#7b8792]",
  SHIPPED: "bg-[#eaf1fb] text-[#2b5f9e]",
  DELIVERED: "bg-[#e8f7ee] text-[#1b7a52]",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "bg-[#fdf3ee] text-[#b4552a]",
  PAID: "bg-[#e8f7ee] text-[#1b7a52]",
  CANCELLED: "bg-[#f4f2ee] text-[#7b8792]",
};
const statusLabel = (key: string) => STATUSES.find((s) => s.key === key)?.label ?? key;
const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "—");

export default function OrderManager() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [shipping, setShipping] = useState("");
  const [draft, setDraft] = useState<{ carrier: string; trackingNumber: string }>({ carrier: "FLASH", trackingNumber: "" });
  const [page, setPage] = useState(1);
  const [openCode, setOpenCode] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const pageSize = 20;

  const load = useCallback(async () => {
    const url = new URL("/api/admin/orders", window.location.origin);
    if (status) url.searchParams.set("status", status);
    if (query.trim()) url.searchParams.set("q", query.trim());
    if (shipping) url.searchParams.set("shipping", shipping);
    url.searchParams.set("page", String(page));
    const data = await fetch(url, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
    if (!data) return;
    setOrders(data.orders ?? []);
    setCounts(data.counts ?? {});
    setTotal(data.total ?? 0);
  }, [status, query, shipping, page]);

  // Debounced so typing in the search box does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  const NOTE: Record<string, (code: string) => string> = {
    confirm: (code) => `ยืนยันการชำระเงินของ ${code} แล้ว`,
    cancel: (code) => `ยกเลิก ${code} และคืนสินค้าเข้าสต็อกแล้ว`,
    ship: (code) => `บันทึกการจัดส่งของ ${code} แล้ว`,
    deliver: (code) => `${code} ถึงมือผู้รับแล้ว`,
    unship: (code) => `ยกเลิกข้อมูลการจัดส่งของ ${code} แล้ว`,
  };

  const act = async (order: OrderRow, action: string, extra: Record<string, string> = {}) => {
    setBusy(order.code);
    setMessage(null);
    const response = await fetch(`/api/admin/orders/${order.code}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(null);
    if (!response?.ok) { setMessage({ tone: "error", text: data?.error ?? "ทำรายการไม่สำเร็จ" }); return; }
    setMessage({ tone: "ok", text: NOTE[action]?.(order.code) ?? "บันทึกแล้ว" });
    setDraft({ carrier: "FLASH", trackingNumber: "" });
    load();
  };

  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return <div className="space-y-5">
    <section className="rounded-3xl border border-[#e8ebee] bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((option) => {
          const count = option.key ? counts[option.key] ?? 0 : Object.values(counts).reduce((sum, n) => sum + n, 0);
          return <button key={option.key || "all"} onClick={() => { setStatus(option.key); setPage(1); }} className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${status === option.key ? "bg-[#18212b] text-white" : "border border-[#e0dcd5] text-[#465360]"}`}>
            {option.label}
            <span className={`rounded-full px-2 py-0.5 text-[11px] tabular-nums ${status === option.key ? "bg-white/15" : "bg-[#f0eeea] text-[#7b8792]"}`}>{count}</span>
          </button>;
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-black text-[#98a2ac]">การจัดส่ง</span>
        {SHIPPING_FILTERS.map((option) => <button key={option.key || "any"} onClick={() => { setShipping(option.key); setPage(1); }} className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${shipping === option.key ? "bg-[#ef6c3d] text-white" : "border border-[#e0dcd5] text-[#465360]"}`}>{option.label}</button>)}
      </div>
      <input
        value={query}
        onChange={(event) => { setQuery(event.target.value); setPage(1); }}
        placeholder="ค้นหาเลขคำสั่งซื้อ ชื่อ หรือเบอร์โทร"
        className="mt-4 w-full rounded-2xl border border-[#e0dcd5] px-4 py-3 text-sm outline-none transition focus:border-[#ef6c3d]"
      />
      {message && <p role="status" className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${message.tone === "ok" ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{message.text}</p>}
    </section>

    {!orders && <p className="text-sm text-[#98a2ac]">กำลังโหลด...</p>}
    {orders?.length === 0 && <p className="rounded-3xl border border-dashed border-[#d8d0c5] bg-white p-12 text-center text-sm text-[#687582]">{query || status ? "ไม่พบคำสั่งซื้อที่ตรงกับเงื่อนไข" : "ยังไม่มีคำสั่งซื้อ"}</p>}

    <div className="grid gap-3">
      {orders?.map((order) => {
        const open = openCode === order.code;
        return <article key={order.id} className="rounded-3xl border border-[#e8ebee] bg-white p-4 shadow-sm sm:p-5">
          <button onClick={() => setOpenCode(open ? null : order.code)} aria-expanded={open} className="flex w-full flex-wrap items-start justify-between gap-3 text-left">
            <div className="min-w-0">
              <p className="font-black">{order.code}
                <span className={`ml-1 rounded-full px-2.5 py-0.5 text-[11px] ${STATUS_STYLE[order.status] ?? ""}`}>{statusLabel(order.status)}</span>
                {order.status === "PAID" && <span className={`ml-1 rounded-full px-2.5 py-0.5 text-[11px] ${SHIPPING_STYLE[order.shippingStatus] ?? ""}`}>{shippingLabel(order.shippingStatus)}</span>}
              </p>
              <p className="mt-1 truncate text-sm text-[#98a2ac]">{order.address.recipient} · {order.address.phone} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} ชิ้น</p>
              <p className="mt-0.5 text-xs text-[#b3bbc3]">สั่งเมื่อ {when(order.createdAt)}</p>
              <span className="mt-2 flex flex-wrap gap-1.5">
                {order.items.slice(0, 5).map((item) => {
                  const image = item.product?.images[0]?.url;
                  return <span key={item.id} className="relative h-9 w-9 overflow-hidden rounded-lg border border-[#eeebe6]" style={{ background: item.product?.color ?? "#f5f7f8" }}>
                    {image && <Image src={image} alt={item.name} fill sizes="36px" className="object-cover"/>}
                  </span>;
                })}
                {order.items.length > 5 && <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f4f2ee] text-[10px] font-black text-[#7b8792]">+{order.items.length - 5}</span>}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-black tabular-nums">{formatBaht(order.total)}</p>
              <p className="text-xs text-[#98a2ac]">{open ? "ซ่อนรายละเอียด ▲" : "ดูรายละเอียด ▼"}</p>
            </div>
          </button>

          {open && <div className="mt-5 grid gap-5 border-t border-[#eeebe6] pt-5 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-black text-[#687582]">รายการสินค้า</p>
              <ul className="space-y-3 text-sm">
                {order.items.map((item) => {
                  const image = item.product?.images[0]?.url;
                  return <li key={item.id} className="flex items-center gap-3">
                    <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-[#eeebe6]" style={{ background: item.product?.color ?? "#f5f7f8" }}>
                      {image
                        ? <Image src={image} alt={item.name} fill sizes="56px" className="object-cover"/>
                        : <span className="grid h-full place-items-center text-[10px] font-black text-[#98a2ac]">ไม่มีรูป</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] text-[#98a2ac]">{item.sku}</span>
                      <span className="block leading-5">{item.name}</span>
                    </span>
                    <span className="shrink-0 text-[#98a2ac] tabular-nums">× {item.quantity}</span>
                    <b className="shrink-0 tabular-nums">{formatBaht(item.price * item.quantity)}</b>
                  </li>;
                })}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t border-[#eeebe6] pt-3 text-sm">
                <div className="flex justify-between"><dt className="text-[#687582]">รวมสินค้า</dt><dd className="tabular-nums">{formatBaht(order.subtotal)}</dd></div>
                {order.discount > 0 && <div className="flex justify-between"><dt className="text-[#ef6c3d]">ส่วนลด</dt><dd className="text-[#ef6c3d] tabular-nums">-{formatBaht(order.discount)}</dd></div>}
                <div className="flex justify-between"><dt className="text-[#687582]">ค่าจัดส่ง</dt><dd className="tabular-nums">{order.shippingFee === 0 ? "ฟรี" : formatBaht(order.shippingFee)}</dd></div>
                <div className="flex justify-between border-t border-[#eeebe6] pt-2"><dt className="font-black">ยอดรวม</dt><dd className="font-black tabular-nums">{formatBaht(order.total)}</dd></div>
              </dl>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="mb-1 text-xs font-black text-[#687582]">จัดส่งถึง</p>
                <p className="leading-6">{order.address.recipient} · {order.address.phone}<br/>
                  {order.address.line1} {order.address.subdistrict} {order.address.district} {order.address.province} {order.address.postalCode}</p>
                {order.address.note && <p className="mt-1 text-xs text-[#98a2ac]">หมายเหตุ: {order.address.note}</p>}
              </div>
              <div>
                <p className="mb-1 text-xs font-black text-[#687582]">ลูกค้า</p>
                <p>{order.customer.name}{order.customer.phone ? ` · ${order.customer.phone}` : ""}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-black text-[#687582]">การชำระเงิน</p>
                {order.status === "PAID"
                  ? <p className="leading-6">ชำระเมื่อ {when(order.paidAt)}
                      {order.slipTransRef && <><br/>เลขอ้างอิง {order.slipTransRef}</>}
                      {order.slipSenderName && <><br/>{order.slipSenderName}{order.slipBankName ? ` · ${order.slipBankName}` : ""}</>}</p>
                  : order.status === "PENDING_PAYMENT"
                    ? <p className="text-[#b4552a]">ยังไม่ชำระ · จองสินค้าถึง {when(order.expiresAt)}</p>
                    : <p className="text-[#98a2ac]">ยกเลิกแล้ว — คืนสินค้าเข้าสต็อกเรียบร้อย</p>}
              </div>

              {order.status === "PENDING_PAYMENT" && <div className="flex flex-wrap gap-2 pt-1">
                <button onClick={() => act(order, "confirm")} disabled={busy === order.code} className="rounded-full bg-[#18212b] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1]">ยืนยันว่าได้รับเงินแล้ว</button>
                <button onClick={() => act(order, "cancel")} disabled={busy === order.code} className="rounded-full border border-[#f0c8c8] px-5 py-2.5 text-xs font-black text-[#c0392b] disabled:opacity-40">ยกเลิกและคืนสต็อก</button>
              </div>}

              {order.status === "PAID" && <div className="rounded-2xl bg-[#faf8f4] p-4">
                <p className="mb-2 text-xs font-black text-[#687582]">การจัดส่ง</p>
                {order.shippingStatus === "PENDING"
                  ? <div className="grid gap-2">
                      <select value={draft.carrier} onChange={(event) => setDraft((current) => ({ ...current, carrier: event.target.value }))} className="w-full rounded-xl border border-[#e0dcd5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ef6c3d]">
                        {CARRIERS.map((carrier) => <option key={carrier.key} value={carrier.key}>{carrier.label}</option>)}
                      </select>
                      <input
                        value={draft.trackingNumber}
                        onChange={(event) => setDraft((current) => ({ ...current, trackingNumber: event.target.value.toUpperCase().replace(/\s/g, "") }))}
                        placeholder="เลขพัสดุ เช่น TH01011ABCD"
                        className="w-full rounded-xl border border-[#e0dcd5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#ef6c3d]"
                      />
                      <button onClick={() => act(order, "ship", draft)} disabled={busy === order.code} className="rounded-full bg-[#18212b] px-5 py-2.5 text-xs font-black text-white transition hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1]">บันทึกการจัดส่ง</button>
                    </div>
                  : <div className="space-y-2 text-sm">
                      <p>{carrierLabel(order.carrier)} · <span className="font-mono">{order.trackingNumber}</span></p>
                      <p className="text-xs text-[#98a2ac]">ส่งเมื่อ {when(order.shippedAt)}{order.deliveredAt ? ` · ถึงเมื่อ ${when(order.deliveredAt)}` : ""}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {trackingUrl(order.carrier, order.trackingNumber) && <a href={trackingUrl(order.carrier, order.trackingNumber)!} target="_blank" rel="noreferrer" className="rounded-full border border-[#e0dcd5] px-4 py-2 text-xs font-black">เปิดหน้าติดตามพัสดุ ↗</a>}
                        <button onClick={() => navigator.clipboard?.writeText(order.trackingNumber ?? "")} className="rounded-full border border-[#e0dcd5] px-4 py-2 text-xs font-black">คัดลอกเลขพัสดุ</button>
                        {order.shippingStatus === "SHIPPED" && <button onClick={() => act(order, "deliver")} disabled={busy === order.code} className="rounded-full bg-[#18212b] px-4 py-2 text-xs font-black text-white disabled:bg-[#c7ccd1]">ถึงมือผู้รับแล้ว</button>}
                        <button onClick={() => act(order, "unship")} disabled={busy === order.code} className="rounded-full border border-[#e0dcd5] px-4 py-2 text-xs font-black text-[#98a2ac] disabled:opacity-40">แก้ไข</button>
                      </div>
                    </div>}
              </div>}
            </div>
          </div>}
        </article>;
      })}
    </div>

    {pageCount > 1 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-[#e8ebee] bg-white p-4 text-xs">
      <span className="text-[#687582]">ทั้งหมด {total} คำสั่งซื้อ · หน้า {page}/{pageCount}</span>
      <span className="flex gap-2">
        <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-full border border-[#e0dcd5] px-4 py-2 font-bold disabled:opacity-35">ก่อนหน้า</button>
        <button onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} className="rounded-full border border-[#e0dcd5] px-4 py-2 font-bold disabled:opacity-35">ถัดไป</button>
      </span>
    </div>}
  </div>;
}
