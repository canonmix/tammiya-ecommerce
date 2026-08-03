"use client";

import { useEffect, useState } from "react";
import ThaiAddressSelect from "@/components/thai-address-select";

type Address = {
  id: string; label: string; recipient: string; phone: string; line1: string;
  subdistrict: string; district: string; province: string; postalCode: string; note: string;
  _count: { orders: number };
};
type Draft = { label: string; recipient: string; phone: string; line1: string; subdistrict: string; district: string; province: string; postalCode: string; note: string };

const EMPTY: Draft = { label: "", recipient: "", phone: "", line1: "", subdistrict: "", district: "", province: "", postalCode: "", note: "" };
const field = "w-full rounded-2xl border border-[#e0dcd5] px-4 py-3 text-sm outline-none transition focus:border-[#ef6c3d]";
const label = "mb-1.5 block text-xs font-black text-[#687582]";

export default function AccountProfile({ initialName, phone, hasPassword }: { initialName: string; phone: string | null; hasPassword: boolean }) {
  const [name, setName] = useState(initialName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileStatus, setProfileStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [addressStatus, setAddressStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);

  const load = () => fetch("/api/account/addresses", { cache: "no-store" }).then((r) => r.json()).then((data) => setAddresses(Array.isArray(data) ? data : []));
  useEffect(() => { load(); }, []);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileStatus(null);
    setSavingProfile(true);
    const payload: Record<string, string> = { name };
    if (newPassword) { payload.newPassword = newPassword; payload.currentPassword = currentPassword; }
    const response = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setSavingProfile(false);
    if (!response?.ok) { setProfileStatus({ tone: "error", text: data?.error ?? "บันทึกไม่สำเร็จ" }); return; }
    setProfileStatus({ tone: "ok", text: "บันทึกข้อมูลแล้ว" });
    setCurrentPassword("");
    setNewPassword("");
  };

  const startEdit = (address: Address) => {
    setEditingId(address.id);
    setFormOpen(true);
    setAddressStatus(null);
    setDraft({ label: address.label, recipient: address.recipient, phone: address.phone, line1: address.line1, subdistrict: address.subdistrict, district: address.district, province: address.province, postalCode: address.postalCode, note: address.note });
  };
  const resetAddress = () => { setEditingId(null); setDraft(EMPTY); setFormOpen(false); setAddressStatus(null); };

  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddressStatus(null);
    setSavingAddress(true);
    const response = await fetch(editingId ? `/api/account/addresses/${editingId}` : "/api/account/addresses", {
      method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setSavingAddress(false);
    if (!response?.ok) { setAddressStatus({ tone: "error", text: data?.error ?? "บันทึกไม่สำเร็จ" }); return; }
    resetAddress();
    load();
  };

  const remove = async (address: Address) => {
    setAddressStatus(null);
    const response = await fetch(`/api/account/addresses/${address.id}`, { method: "DELETE" }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    if (!response?.ok) { setAddressStatus({ tone: "error", text: data?.error ?? "ลบไม่สำเร็จ" }); return; }
    load();
  };

  return <div className="space-y-6">
    <form onSubmit={saveProfile} className="rounded-[28px] border border-[#e8ebee] bg-white p-5 sm:p-7">
      <h2 className="text-xl font-black">ข้อมูลส่วนตัว</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="acc-name" className={label}>ชื่อ-นามสกุล</label>
          <input id="acc-name" value={name} onChange={(event) => setName(event.target.value)} className={field}/>
        </div>
        <div>
          <label htmlFor="acc-phone" className={label}>เบอร์มือถือ (ใช้เข้าสู่ระบบ)</label>
          <input id="acc-phone" value={phone ?? "— เข้าสู่ระบบด้วย Facebook —"} disabled className={`${field} bg-[#f7f6f2] text-[#98a2ac]`}/>
        </div>
      </div>

      <p className="mt-7 mb-3 text-sm font-black">{hasPassword ? "เปลี่ยนรหัสผ่าน" : "ตั้งรหัสผ่าน"}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {hasPassword && <div>
          <label htmlFor="acc-current" className={label}>รหัสผ่านเดิม</label>
          <input id="acc-current" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" className={field}/>
        </div>}
        <div>
          <label htmlFor="acc-new" className={label}>รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label>
          <input id="acc-new" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" className={field}/>
        </div>
      </div>

      {profileStatus && <p role="status" className={`mt-5 rounded-2xl px-4 py-3 text-sm font-bold ${profileStatus.tone === "ok" ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{profileStatus.text}</p>}
      <button type="submit" disabled={savingProfile} className="mt-6 rounded-full bg-[#18212b] px-7 py-3 font-black text-white transition hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1]">{savingProfile ? "กำลังบันทึก..." : "บันทึกข้อมูล"}</button>
    </form>

    <section className="rounded-[28px] border border-[#e8ebee] bg-white p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">ที่อยู่จัดส่ง {addresses ? `(${addresses.length})` : ""}</h2>
        {!formOpen && <button onClick={() => { setFormOpen(true); setEditingId(null); setDraft(EMPTY); }} className="rounded-full border border-[#e0dcd5] px-5 py-2.5 text-sm font-bold">+ เพิ่มที่อยู่</button>}
      </div>

      {formOpen && <form onSubmit={saveAddress} className="mt-5 rounded-2xl bg-[#faf8f4] p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="addr-label" className={label}>ชื่อเรียกที่อยู่ (ไม่บังคับ)</label>
            <input id="addr-label" value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))} placeholder="เช่น บ้าน, ที่ทำงาน" className={field}/>
          </div>
          <div><label htmlFor="recipient" className={label}>ชื่อผู้รับ</label><input id="recipient" value={draft.recipient} onChange={(event) => setDraft((c) => ({ ...c, recipient: event.target.value }))} required className={field}/></div>
          <div><label htmlFor="phone" className={label}>เบอร์ผู้รับ</label><input id="phone" value={draft.phone} onChange={(event) => setDraft((c) => ({ ...c, phone: event.target.value }))} inputMode="tel" required className={field}/></div>
          <div className="sm:col-span-2"><label htmlFor="line1" className={label}>บ้านเลขที่ หมู่ ซอย ถนน</label><input id="line1" value={draft.line1} onChange={(event) => setDraft((c) => ({ ...c, line1: event.target.value }))} required className={field}/></div>
          <ThaiAddressSelect
            value={{ province: draft.province, district: draft.district, subdistrict: draft.subdistrict, postalCode: draft.postalCode }}
            onChange={(next) => setDraft((current) => ({ ...current, ...next }))}
            labelClass={label}
            fieldClass={field}
          />
          <div className="sm:col-span-2"><label htmlFor="note" className={label}>หมายเหตุถึงคนส่ง (ไม่บังคับ)</label><input id="note" value={draft.note} onChange={(event) => setDraft((c) => ({ ...c, note: event.target.value }))} className={field}/></div>
        </div>
        {addressStatus && <p role="alert" className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${addressStatus.tone === "ok" ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{addressStatus.text}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" disabled={savingAddress} className="rounded-full bg-[#18212b] px-7 py-3 font-black text-white transition hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1]">{savingAddress ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มที่อยู่"}</button>
          <button type="button" onClick={resetAddress} className="rounded-full border border-[#e0dcd5] px-7 py-3 font-bold">ยกเลิก</button>
        </div>
      </form>}

      {!formOpen && addressStatus && <p role="alert" className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${addressStatus.tone === "ok" ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{addressStatus.text}</p>}

      <div className="mt-5 grid gap-3">
        {!addresses && <p className="text-sm text-[#98a2ac]">กำลังโหลด...</p>}
        {addresses?.length === 0 && !formOpen && <p className="rounded-2xl border border-dashed border-[#d8d0c5] p-8 text-center text-sm text-[#687582]">ยังไม่มีที่อยู่บันทึกไว้</p>}
        {addresses?.map((address) => <article key={address.id} className="rounded-2xl border border-[#e8ebee] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-black">{address.label || address.recipient}</p>
            {address._count.orders > 0 && <span className="rounded-full bg-[#f4f2ee] px-2.5 py-1 text-[11px] font-bold text-[#7b8792]">ใช้กับ {address._count.orders} คำสั่งซื้อ</span>}
          </div>
          <p className="mt-1 text-sm leading-6 text-[#687582]">
            {address.recipient} · {address.phone}<br/>
            {address.line1} {address.subdistrict} {address.district} {address.province} {address.postalCode}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
            <button onClick={() => startEdit(address)} disabled={address._count.orders > 0} className="rounded-full border border-[#e0dcd5] px-4 py-2 disabled:opacity-40">แก้ไข</button>
            <button onClick={() => remove(address)} disabled={address._count.orders > 0} className="rounded-full border border-[#f0c8c8] px-4 py-2 text-[#c0392b] disabled:opacity-40">ลบ</button>
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}
