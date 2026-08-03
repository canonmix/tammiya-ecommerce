"use client";

import { useEffect, useState } from "react";
import { formatBaht } from "@/lib/data";
import MultiSelect from "@/components/admin/multi-select";
import { PROMOTION_SCOPES, PROMOTION_TYPES, SHIPPING_FEE, isRunning, type Promotion } from "@/lib/promotion-shared";

type Option = { id: string; name: string; sku?: string };
type Draft = { name: string; type: string; minSubtotal: string; percent: string; scope: string; categoryIds: string[]; productId: string; startsAt: string; endsAt: string };

const EMPTY: Draft = { name: "", type: "FREE_SHIPPING", minSubtotal: "1500", percent: "10", scope: "ALL", categoryIds: [], productId: "", startsAt: "", endsAt: "" };
const typeLabel = (key: string) => PROMOTION_TYPES.find((t) => t.key === key)?.label ?? key;
const scopeLabel = (key: string) => PROMOTION_SCOPES.find((s) => s.key === key)?.label ?? key;
// datetime-local wants "YYYY-MM-DDTHH:mm" in local time, not an ISO string in UTC.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export default function PromotionManager() {
  const [promotions, setPromotions] = useState<Promotion[] | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [products, setProducts] = useState<Option[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const load = () => fetch("/api/admin/promotions", { cache: "no-store" }).then((r) => r.json()).then((data) => {
    setPromotions(data.promotions ?? []);
    setCategories(data.categories ?? []);
    setProducts(data.products ?? []);
  });
  useEffect(() => { load(); }, []);

  const reset = () => { setEditingId(null); setDraft(EMPTY); setStatus(null); };

  const startEdit = (promotion: Promotion) => {
    setEditingId(promotion.id);
    setDraft({
      name: promotion.name, type: promotion.type,
      minSubtotal: String(promotion.minSubtotal), percent: String(promotion.percent),
      scope: promotion.scope, categoryIds: promotion.categoryIds ?? [], productId: promotion.productId ?? "",
      startsAt: toLocalInput(promotion.startsAt), endsAt: toLocalInput(promotion.endsAt),
    });
    setStatus(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setPending(true);
    const payload = {
      name: draft.name,
      type: draft.type,
      minSubtotal: Number(draft.minSubtotal),
      percent: Number(draft.percent),
      scope: draft.scope,
      categoryIds: draft.categoryIds,
      productId: draft.productId || null,
      startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
      endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    };
    const response = await fetch(editingId ? `/api/admin/promotions/${editingId}` : "/api/admin/promotions", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response?.ok) { setStatus({ tone: "error", text: data?.error ?? "บันทึกไม่สำเร็จ" }); return; }
    setStatus({ tone: "ok", text: editingId ? "อัปเดตโปรโมชั่นแล้ว" : "สร้างโปรโมชั่นแล้ว — มีผลกับหน้าร้านทันที" });
    reset();
    load();
  };

  const toggle = async (promotion: Promotion) => {
    await fetch(`/api/admin/promotions/${promotion.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !promotion.active }) }).catch(() => null);
    load();
  };

  const remove = async (promotion: Promotion) => {
    const response = await fetch(`/api/admin/promotions/${promotion.id}`, { method: "DELETE" }).catch(() => null);
    if (response?.ok) setStatus({ tone: "ok", text: `ลบ “${promotion.name}” แล้ว` });
    load();
  };

  const field = "w-full rounded-2xl border border-[#e0dcd5] px-4 py-3 text-sm outline-none transition focus:border-[#ef6c3d]";
  const label = "mb-1.5 block text-xs font-black text-[#687582]";
  const isPercent = draft.type === "PERCENT_DISCOUNT";

  return <div className="space-y-6">
    <form onSubmit={submit} className="rounded-3xl border border-[#e8ebee] bg-white p-6 shadow-sm">
      <p className="eyebrow">{editingId ? "Edit promotion" : "New promotion"}</p>
      <h2 className="mt-1 text-xl font-black">{editingId ? "แก้ไขโปรโมชั่น" : "สร้างโปรโมชั่น"}</h2>

      <div className="mt-6">
        <p className={label}>ประเภท</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PROMOTION_TYPES.map((type) => <button key={type.key} type="button" onClick={() => setDraft((c) => ({ ...c, type: type.key }))} className={`rounded-2xl border px-4 py-3 text-left transition ${draft.type === type.key ? "border-[#ef6c3d] bg-[#fdf3ee]" : "border-[#e8e5df]"}`}>
            <span className="block text-sm font-black">{type.label}</span>
            <span className="mt-0.5 block text-xs text-[#98a2ac]">{type.detail}</span>
          </button>)}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="p-name" className={label}>ชื่อโปรโมชั่น (แสดงใน CMS)</label>
          <input id="p-name" value={draft.name} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} placeholder={isPercent ? "ลดทั้งร้าน 10%" : "ซื้อครบ 1,500 ส่งฟรี"} className={field}/>
        </div>

        {!isPercent && <div className="sm:col-span-2">
          <label htmlFor="p-min" className={label}>ยอดสินค้าขั้นต่ำ (บาท)</label>
          <input id="p-min" value={draft.minSubtotal} onChange={(e) => setDraft((c) => ({ ...c, minSubtotal: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" className={field}/>
          <p className="mt-1.5 text-xs text-[#98a2ac]">ยอดหลังหักส่วนลดถึงเท่านี้ ค่าจัดส่ง {formatBaht(SHIPPING_FEE)} จะถูกยกเว้น</p>
        </div>}

        {isPercent && <>
          <div>
            <label htmlFor="p-percent" className={label}>ส่วนลด (%)</label>
            <input id="p-percent" value={draft.percent} onChange={(e) => setDraft((c) => ({ ...c, percent: e.target.value.replace(/\D/g, "").slice(0, 3) }))} inputMode="numeric" className={field}/>
          </div>
          <div>
            <label htmlFor="p-scope" className={label}>ใช้กับ</label>
            <select id="p-scope" value={draft.scope} onChange={(e) => setDraft((c) => ({ ...c, scope: e.target.value }))} className={field}>
              {PROMOTION_SCOPES.map((scope) => <option key={scope.key} value={scope.key}>{scope.label}</option>)}
            </select>
          </div>
          {draft.scope === "CATEGORY" && <div className="sm:col-span-2">
            <p className={label}>หมวดหมู่ (เลือกได้หลายหมวด)</p>
            <MultiSelect
              options={categories.map((category) => ({ id: category.id, label: category.name }))}
              selected={draft.categoryIds}
              onChange={(categoryIds) => setDraft((c) => ({ ...c, categoryIds }))}
              placeholder="— เลือกหมวดหมู่ —"
              emptyText="ยังไม่มีหมวดหมู่ในระบบ"
            />
          </div>}
          {draft.scope === "PRODUCT" && <div className="sm:col-span-2">
            <label htmlFor="p-product" className={label}>สินค้า</label>
            <select id="p-product" value={draft.productId} onChange={(e) => setDraft((c) => ({ ...c, productId: e.target.value }))} className={field}>
              <option value="">— เลือกสินค้า —</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.sku} · {product.name}</option>)}
            </select>
          </div>}
        </>}

        <div>
          <label htmlFor="p-start" className={label}>เริ่ม (ไม่บังคับ)</label>
          <input id="p-start" type="datetime-local" value={draft.startsAt} onChange={(e) => setDraft((c) => ({ ...c, startsAt: e.target.value }))} className={field}/>
        </div>
        <div>
          <label htmlFor="p-end" className={label}>สิ้นสุด (ไม่บังคับ)</label>
          <input id="p-end" type="datetime-local" value={draft.endsAt} onChange={(e) => setDraft((c) => ({ ...c, endsAt: e.target.value }))} className={field}/>
        </div>
      </div>

      {status && <p role="status" className={`mt-5 rounded-2xl px-4 py-3 text-sm font-bold ${status.tone === "ok" ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{status.text}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-[#18212b] px-7 py-3 font-black text-white transition hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1]">{pending ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "สร้างโปรโมชั่น"}</button>
        {editingId && <button type="button" onClick={reset} className="rounded-full border border-[#e0dcd5] px-7 py-3 font-bold">ยกเลิก</button>}
      </div>
    </form>

    <section className="rounded-3xl border border-[#e8ebee] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">โปรโมชั่นทั้งหมด {promotions ? `(${promotions.length})` : ""}</h2>
      {!promotions && <p className="mt-5 text-sm text-[#98a2ac]">กำลังโหลด...</p>}
      {promotions?.length === 0 && <p className="mt-5 rounded-2xl border border-dashed border-[#d8d0c5] p-8 text-center text-sm text-[#687582]">ยังไม่มีโปรโมชั่น — สร้างอันแรกจากฟอร์มด้านบน</p>}
      <div className="mt-5 grid gap-3">
        {promotions?.map((promotion) => {
          const running = isRunning(promotion);
          return <article key={promotion.id} className="rounded-2xl border border-[#e8ebee] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black">{promotion.name}</p>
                <p className="text-sm text-[#98a2ac]">
                  {typeLabel(promotion.type)}
                  {promotion.type === "FREE_SHIPPING"
                    ? ` · ซื้อครบ ${formatBaht(promotion.minSubtotal)}`
                    : ` · ลด ${promotion.percent}% · ${promotion.scope === "CATEGORY"
                        ? categories.filter((category) => promotion.categoryIds.includes(category.id)).map((category) => category.name).join(", ") || "เฉพาะหมวดหมู่"
                        : scopeLabel(promotion.scope)}`}
                </p>
                {(promotion.startsAt || promotion.endsAt) && <p className="mt-1 text-xs text-[#98a2ac]">
                  {promotion.startsAt ? new Date(promotion.startsAt).toLocaleString("th-TH") : "ตั้งแต่ตอนนี้"} → {promotion.endsAt ? new Date(promotion.endsAt).toLocaleString("th-TH") : "ไม่มีกำหนด"}
                </p>}
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${running ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#f4f2ee] text-[#7b8792]"}`}>
                {running ? "กำลังใช้งาน" : promotion.active ? "ยังไม่ถึงเวลา / หมดเวลา" : "ปิดอยู่"}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
              <button onClick={() => startEdit(promotion)} className="rounded-full border border-[#e0dcd5] px-4 py-2">แก้ไข</button>
              <button onClick={() => toggle(promotion)} className="rounded-full border border-[#e0dcd5] px-4 py-2">{promotion.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
              <button onClick={() => remove(promotion)} className="rounded-full border border-[#f0c8c8] px-4 py-2 text-[#c0392b]">ลบ</button>
            </div>
          </article>;
        })}
      </div>
      <p className="mt-5 rounded-2xl bg-[#faf8f4] p-4 text-xs leading-6 text-[#687582]">
        ถ้ามีส่วนลดหลายอันตรงกับสินค้าชิ้นเดียว ระบบจะใช้ <b className="text-[#18212b]">อันที่ลดมากที่สุด</b> ไม่นำมาบวกกัน · ราคาที่ลดแล้วถูกคำนวณฝั่งเซิร์ฟเวอร์เสมอ
      </p>
    </section>
  </div>;
}
