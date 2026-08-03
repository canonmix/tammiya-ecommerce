"use client";

import { useEffect, useState } from "react";
import { formatBaht } from "@/lib/data";
import { COUPON_TYPES, claimsLeft, describeCoupon, isClaimWindowOpen, isWithinSchedule, type Coupon } from "@/lib/coupon-shared";

type Draft = { code: string; name: string; type: string; value: string; minSubtotal: string; maxDiscount: string; usageLimit: string; perCustomerLimit: string; startsAt: string; endsAt: string; claimLimit: string; claimStartsAt: string; claimEndsAt: string };

const EMPTY: Draft = { code: "", name: "", type: "PERCENT", value: "10", minSubtotal: "0", maxDiscount: "0", usageLimit: "0", perCustomerLimit: "1", startsAt: "", endsAt: "", claimLimit: "0", claimStartsAt: "", claimEndsAt: "" };
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function CouponManager() {
  const [coupons, setCoupons] = useState<Coupon[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const load = () => fetch("/api/admin/coupons", { cache: "no-store" }).then((r) => r.json()).then((data) => setCoupons(Array.isArray(data) ? data : []));
  useEffect(() => { load(); }, []);

  const reset = () => { setEditingId(null); setDraft(EMPTY); setStatus(null); };
  const startEdit = (coupon: Coupon) => {
    setEditingId(coupon.id);
    setStatus(null);
    setDraft({
      code: coupon.code, name: coupon.name, type: coupon.type, value: String(coupon.value),
      minSubtotal: String(coupon.minSubtotal), maxDiscount: String(coupon.maxDiscount),
      usageLimit: String(coupon.usageLimit), perCustomerLimit: String(coupon.perCustomerLimit),
      startsAt: toLocalInput(coupon.startsAt), endsAt: toLocalInput(coupon.endsAt),
      claimLimit: String(coupon.claimLimit),
      claimStartsAt: toLocalInput(coupon.claimStartsAt), claimEndsAt: toLocalInput(coupon.claimEndsAt),
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setPending(true);
    const payload = {
      code: draft.code, name: draft.name, type: draft.type,
      value: Number(draft.value), minSubtotal: Number(draft.minSubtotal), maxDiscount: Number(draft.maxDiscount),
      usageLimit: Number(draft.usageLimit), perCustomerLimit: Number(draft.perCustomerLimit),
      startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
      endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
      claimLimit: Number(draft.claimLimit),
      claimStartsAt: draft.claimStartsAt ? new Date(draft.claimStartsAt).toISOString() : null,
      claimEndsAt: draft.claimEndsAt ? new Date(draft.claimEndsAt).toISOString() : null,
    };
    const response = await fetch(editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons", {
      method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response?.ok) { setStatus({ tone: "error", text: data?.error ?? "บันทึกไม่สำเร็จ" }); return; }
    setStatus({ tone: "ok", text: editingId ? "อัปเดตคูปองแล้ว" : "สร้างคูปองแล้ว — ลูกค้ากดรับได้ที่หน้าคูปองของฉัน" });
    reset();
    load();
  };

  const toggle = async (coupon: Coupon) => {
    await fetch(`/api/admin/coupons/${coupon.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !coupon.active }) }).catch(() => null);
    load();
  };
  const remove = async (coupon: Coupon) => {
    const response = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    if (!response?.ok) { setStatus({ tone: "error", text: data?.error ?? "ลบไม่สำเร็จ" }); return; }
    load();
  };

  const field = "w-full rounded-2xl border border-[#e0dcd5] px-4 py-3 text-sm outline-none transition focus:border-[#ef6c3d]";
  const label = "mb-1.5 block text-xs font-black text-[#687582]";
  const digits = (key: keyof Draft) => (event: React.ChangeEvent<HTMLInputElement>) => setDraft((c) => ({ ...c, [key]: event.target.value.replace(/\D/g, "") }));
  const isPercent = draft.type === "PERCENT";

  return <div className="space-y-6">
    <form onSubmit={submit} className="rounded-3xl border border-[#e8ebee] bg-white p-6 shadow-sm">
      <p className="eyebrow">{editingId ? "Edit coupon" : "New coupon"}</p>
      <h2 className="mt-1 text-xl font-black">{editingId ? `แก้ไข ${draft.code}` : "สร้างคูปอง"}</h2>

      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {COUPON_TYPES.map((type) => <button key={type.key} type="button" onClick={() => setDraft((c) => ({ ...c, type: type.key }))} className={`rounded-2xl border px-4 py-3 text-left transition ${draft.type === type.key ? "border-[#ef6c3d] bg-[#fdf3ee]" : "border-[#e8e5df]"}`}>
          <span className="block text-sm font-black">{type.label}</span>
          <span className="mt-0.5 block text-xs text-[#98a2ac]">{type.detail}</span>
        </button>)}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="c-code" className={label}>โค้ดคูปอง</label>
          <input id="c-code" value={draft.code} onChange={(event) => setDraft((c) => ({ ...c, code: event.target.value.toUpperCase().replace(/\s/g, "") }))} placeholder="WELCOME10" className={`${field} font-mono tracking-widest`}/>
        </div>
        <div>
          <label htmlFor="c-name" className={label}>ชื่อคูปอง (ลูกค้าเห็น)</label>
          <input id="c-name" value={draft.name} onChange={(event) => setDraft((c) => ({ ...c, name: event.target.value }))} placeholder="ส่วนลดต้อนรับสมาชิกใหม่" className={field}/>
        </div>
        <div>
          <label htmlFor="c-value" className={label}>{isPercent ? "ส่วนลด (%)" : "ส่วนลด (บาท)"}</label>
          <input id="c-value" value={draft.value} onChange={digits("value")} inputMode="numeric" className={field}/>
        </div>
        {isPercent && <div>
          <label htmlFor="c-max" className={label}>ลดสูงสุด (บาท) — 0 = ไม่จำกัด</label>
          <input id="c-max" value={draft.maxDiscount} onChange={digits("maxDiscount")} inputMode="numeric" className={field}/>
        </div>}
        <div>
          <label htmlFor="c-min" className={label}>ยอดขั้นต่ำ (บาท) — 0 = ไม่กำหนด</label>
          <input id="c-min" value={draft.minSubtotal} onChange={digits("minSubtotal")} inputMode="numeric" className={field}/>
        </div>
        <div>
          <label htmlFor="c-limit" className={label}>ใช้ได้ทั้งหมดกี่ครั้ง — 0 = ไม่จำกัด</label>
          <input id="c-limit" value={draft.usageLimit} onChange={digits("usageLimit")} inputMode="numeric" className={field}/>
        </div>
        <div>
          <label htmlFor="c-per" className={label}>ต่อลูกค้า 1 คนกี่ครั้ง — 0 = ไม่จำกัด</label>
          <input id="c-per" value={draft.perCustomerLimit} onChange={digits("perCustomerLimit")} inputMode="numeric" className={field}/>
        </div>
        <div>
          <label htmlFor="c-start" className={label}>เริ่ม (ไม่บังคับ)</label>
          <input id="c-start" type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft((c) => ({ ...c, startsAt: event.target.value }))} className={field}/>
        </div>
        <div>
          <label htmlFor="c-end" className={label}>หมดอายุ (ไม่บังคับ)</label>
          <input id="c-end" type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft((c) => ({ ...c, endsAt: event.target.value }))} className={field}/>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-[#f3d9c9] bg-[#fdf9f6] p-5">
        <p className="text-sm font-black">ช่วงเวลาแจกคูปอง</p>
        <p className="mt-1 text-xs leading-5 text-[#687582]">ลูกค้าเข้ามากดรับเองที่หน้า “คูปองของฉัน” ได้เฉพาะในช่วงนี้ และต้องกดรับก่อนจึงจะใช้ได้</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="c-claim-limit" className={label}>แจกกี่สิทธิ์ — 0 = ไม่จำกัด</label>
            <input id="c-claim-limit" value={draft.claimLimit} onChange={digits("claimLimit")} inputMode="numeric" className={field}/>
          </div>
          <div>
            <label htmlFor="c-claim-start" className={label}>เริ่มแจก (ไม่บังคับ)</label>
            <input id="c-claim-start" type="datetime-local" value={draft.claimStartsAt} onChange={(event) => setDraft((c) => ({ ...c, claimStartsAt: event.target.value }))} className={field}/>
          </div>
          <div>
            <label htmlFor="c-claim-end" className={label}>หยุดแจก (ไม่บังคับ)</label>
            <input id="c-claim-end" type="datetime-local" value={draft.claimEndsAt} onChange={(event) => setDraft((c) => ({ ...c, claimEndsAt: event.target.value }))} className={field}/>
          </div>
        </div>
      </div>

      {status && <p role="status" className={`mt-5 rounded-2xl px-4 py-3 text-sm font-bold ${status.tone === "ok" ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{status.text}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-[#18212b] px-7 py-3 font-black text-white transition hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1]">{pending ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "สร้างคูปอง"}</button>
        {editingId && <button type="button" onClick={reset} className="rounded-full border border-[#e0dcd5] px-7 py-3 font-bold">ยกเลิก</button>}
      </div>
    </form>

    <section className="rounded-3xl border border-[#e8ebee] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">คูปองทั้งหมด {coupons ? `(${coupons.length})` : ""}</h2>
      {!coupons && <p className="mt-5 text-sm text-[#98a2ac]">กำลังโหลด...</p>}
      {coupons?.length === 0 && <p className="mt-5 rounded-2xl border border-dashed border-[#d8d0c5] p-8 text-center text-sm text-[#687582]">ยังไม่มีคูปอง — สร้างอันแรกจากฟอร์มด้านบน</p>}
      <div className="mt-5 grid gap-3">
        {coupons?.map((coupon) => {
          const running = coupon.active && isWithinSchedule(coupon);
          const spent = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit;
          const left = claimsLeft(coupon);
          const handingOut = isClaimWindowOpen(coupon) && left !== 0;
          return <article key={coupon.id} className="rounded-2xl border border-[#e8ebee] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-base font-black tracking-widest">{coupon.code}</p>
                <p className="mt-0.5 text-sm text-[#687582]">{coupon.name} · {describeCoupon(coupon)}</p>
                <p className="mt-1 text-xs text-[#98a2ac]">
                  กดรับแล้ว {coupon.claimedCount}{coupon.claimLimit > 0 ? `/${coupon.claimLimit}` : ""} สิทธิ์
                  {" · "}ใช้ไปแล้ว {coupon.usedCount}{coupon.usageLimit > 0 ? `/${coupon.usageLimit}` : ""} ครั้ง
                  {coupon.perCustomerLimit > 0 && ` · จำกัด ${coupon.perCustomerLimit} ครั้ง/คน`}
                  {coupon.endsAt && ` · ใช้ได้ถึง ${new Date(coupon.endsAt).toLocaleDateString("th-TH")}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap justify-end gap-2">
                {coupon.active && handingOut && <span className="rounded-full bg-[#fdf3ee] px-3 py-1 text-xs font-black text-[#b4552a]">
                  กำลังแจก{left !== null ? ` · เหลือ ${left}` : ""}
                </span>}
                <span className={`rounded-full px-3 py-1 text-xs font-black ${running && !spent ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#f4f2ee] text-[#7b8792]"}`}>
                  {spent ? "ใช้ครบแล้ว" : running ? "ใช้ได้" : coupon.active ? "ยังไม่ถึงเวลา / หมดอายุ" : "ปิดอยู่"}
                </span>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <button onClick={() => startEdit(coupon)} className="rounded-full border border-[#e0dcd5] px-4 py-2">แก้ไข</button>
              <button onClick={() => toggle(coupon)} className="rounded-full border border-[#e0dcd5] px-4 py-2">{coupon.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
              <button onClick={() => remove(coupon)} className="rounded-full border border-[#f0c8c8] px-4 py-2 text-[#c0392b]">ลบ</button>
            </div>
          </article>;
        })}
      </div>
      <p className="mt-5 rounded-2xl bg-[#faf8f4] p-4 text-xs leading-6 text-[#687582]">
        ลูกค้าต้อง<b className="text-[#18212b]">กดรับคูปองก่อน</b>จึงจะเลือกใช้ได้ตอนสั่งซื้อ (ไม่ต้องพิมพ์โค้ด) · คูปองคิดหลังส่วนลดโปรโมชั่น และ<b className="text-[#18212b]">ตรวจซ้ำอีกครั้งตอนกดสั่งซื้อ</b> · ถ้าออเดอร์ถูกยกเลิกหรือหมดเวลาชำระ สิทธิ์คูปองจะคืนให้ลูกค้าอัตโนมัติ · ขั้นต่ำ {formatBaht(0)} = ไม่กำหนด
      </p>
    </section>
  </div>;
}
