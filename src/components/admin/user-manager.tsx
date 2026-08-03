"use client";

import { useEffect, useState } from "react";
import { ADMIN_MENUS, ROLES, ROLE_PRESETS, type AdminPermission } from "@/lib/admin-permissions";

type AdminUserRow = { id: string; username: string; name: string; role: string; permissions: string[]; active: boolean; lastLoginAt: string | null };
type Draft = { username: string; name: string; password: string; role: string; permissions: AdminPermission[] };

const EMPTY_DRAFT: Draft = { username: "", name: "", password: "", role: "STAFF", permissions: [...ROLE_PRESETS.STAFF] };
const roleLabel = (role: string) => ROLES.find((item) => item.key === role)?.label ?? role;

export default function UserManager({ currentAdminId, isBootstrap }: { currentAdminId: string; isBootstrap: boolean }) {
  const [users, setUsers] = useState<AdminUserRow[] | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const load = () => fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()).then((data) => setUsers(Array.isArray(data) ? data : []));
  useEffect(() => { load(); }, []);

  // Picking a preset fills the checkboxes; ticking a box afterwards switches the role to CUSTOM.
  const applyRole = (role: string) => setDraft((current) => ({ ...current, role, permissions: role === "CUSTOM" ? current.permissions : [...(ROLE_PRESETS[role as keyof typeof ROLE_PRESETS] ?? [])] }));
  const togglePermission = (key: AdminPermission) => setDraft((current) => ({
    ...current,
    permissions: current.permissions.includes(key) ? current.permissions.filter((p) => p !== key) : [...current.permissions, key],
    // Hand-editing the boxes means this no longer matches a preset.
    role: "CUSTOM",
  }));

  const startEdit = (user: AdminUserRow) => {
    setEditingId(user.id);
    setDraft({ username: user.username, name: user.name, password: "", role: user.role, permissions: user.permissions as AdminPermission[] });
    setStatus(null);
  };
  const reset = () => { setEditingId(null); setDraft(EMPTY_DRAFT); setStatus(null); };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setPending(true);
    const editing = Boolean(editingId);
    const payload = editing
      ? { name: draft.name, role: draft.role, permissions: draft.permissions, ...(draft.password ? { password: draft.password } : {}) }
      : draft;
    const response = await fetch(editing ? `/api/admin/users/${editingId}` : "/api/admin/users", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response?.ok) { setStatus({ tone: "error", text: data?.error ?? "บันทึกไม่สำเร็จ" }); return; }
    setStatus({ tone: "ok", text: editing ? "อัปเดตผู้ใช้แล้ว" : "สร้างผู้ใช้แล้ว" });
    reset();
    load();
  };

  const setActive = async (user: AdminUserRow, active: boolean) => {
    setStatus(null);
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    if (!response?.ok) { setStatus({ tone: "error", text: data?.error ?? "เปลี่ยนสถานะไม่สำเร็จ" }); return; }
    load();
  };

  const remove = async (user: AdminUserRow) => {
    setStatus(null);
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    if (!response?.ok) { setStatus({ tone: "error", text: data?.error ?? "ลบไม่สำเร็จ" }); return; }
    setStatus({ tone: "ok", text: `ลบผู้ใช้ “${user.name}” แล้ว` });
    load();
  };

  const field = "w-full rounded-2xl border border-[#e0dcd5] px-4 py-3 text-sm outline-none transition focus:border-[#ef6c3d]";
  const label = "mb-1.5 block text-xs font-black text-[#687582]";

  return <div className="space-y-6">
    {isBootstrap && <p className="rounded-2xl border border-[#f3d9c9] bg-[#fdf3ee] px-5 py-4 text-sm leading-6 font-bold text-[#b4552a]">
      ตอนนี้เข้าใช้ด้วยรหัสผ่านกลางจาก .env อยู่ — สร้างผู้ใช้คนแรกที่มีสิทธิ์ “จัดการผู้ใช้” แล้วรหัสผ่านกลางจะใช้ไม่ได้อีก
    </p>}

    <form onSubmit={submit} className="rounded-3xl border border-[#e8ebee] bg-white p-6 shadow-sm">
      <p className="eyebrow">{editingId ? "Edit user" : "New user"}</p>
      <h2 className="mt-1 text-xl font-black">{editingId ? `แก้ไข ${draft.username}` : "เพิ่มผู้ใช้"}</h2>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="u-username" className={label}>ชื่อผู้ใช้ (สำหรับ login)</label>
          <input id="u-username" value={draft.username} onChange={(e) => setDraft((c) => ({ ...c, username: e.target.value }))} disabled={Boolean(editingId)} placeholder="somchai" className={`${field} disabled:bg-[#f7f6f2] disabled:text-[#98a2ac]`}/>
        </div>
        <div>
          <label htmlFor="u-name" className={label}>ชื่อ-นามสกุล</label>
          <input id="u-name" value={draft.name} onChange={(e) => setDraft((c) => ({ ...c, name: e.target.value }))} placeholder="สมชาย ใจดี" className={field}/>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="u-password" className={label}>{editingId ? "รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน (อย่างน้อย 8 ตัวอักษร)"}</label>
          <input id="u-password" type="password" value={draft.password} onChange={(e) => setDraft((c) => ({ ...c, password: e.target.value }))} autoComplete="new-password" className={field}/>
        </div>
      </div>

      <div className="mt-6">
        <p className={label}>บทบาท</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((role) => <button key={role.key} type="button" onClick={() => applyRole(role.key)} title={role.detail} className={`rounded-full px-4 py-2 text-sm font-bold transition ${draft.role === role.key ? "bg-[#18212b] text-white" : "border border-[#e0dcd5] text-[#465360]"}`}>{role.label}</button>)}
        </div>
        <p className="mt-2 text-xs text-[#98a2ac]">{ROLES.find((r) => r.key === draft.role)?.detail}</p>
      </div>

      <div className="mt-6">
        <p className={label}>สิทธิ์การเข้าถึงเมนู</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {ADMIN_MENUS.map((menu) => {
            const checked = draft.role === "OWNER" || draft.permissions.includes(menu.key);
            return <label key={menu.key} className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold transition ${checked ? "border-[#ef6c3d] bg-[#fdf3ee] text-[#18212b]" : "border-[#e8e5df] text-[#7b8792]"}`}>
              <input type="checkbox" checked={checked} disabled={draft.role === "OWNER"} onChange={() => togglePermission(menu.key)} className="h-4 w-4 accent-[#ef6c3d]"/>
              {menu.label}
            </label>;
          })}
        </div>
        {draft.role === "OWNER" && <p className="mt-2 text-xs text-[#98a2ac]">เจ้าของร้านเข้าได้ทุกเมนูเสมอ รวมถึงเมนูที่เพิ่มในอนาคต</p>}
      </div>

      {status && <p role="status" className={`mt-5 rounded-2xl px-4 py-3 text-sm font-bold ${status.tone === "ok" ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{status.text}</p>}

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="rounded-full bg-[#18212b] px-7 py-3 font-black text-white transition hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1]">{pending ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "สร้างผู้ใช้"}</button>
        {editingId && <button type="button" onClick={reset} className="rounded-full border border-[#e0dcd5] px-7 py-3 font-bold">ยกเลิก</button>}
      </div>
    </form>

    <section className="rounded-3xl border border-[#e8ebee] bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">ผู้ใช้ทั้งหมด {users ? `(${users.length})` : ""}</h2>
      {!users && <p className="mt-5 text-sm text-[#98a2ac]">กำลังโหลด...</p>}
      {users?.length === 0 && <p className="mt-5 rounded-2xl border border-dashed border-[#d8d0c5] p-8 text-center text-sm text-[#687582]">ยังไม่มีผู้ใช้ — สร้างคนแรกจากฟอร์มด้านบน</p>}
      <div className="mt-5 grid gap-3">
        {users?.map((user) => <article key={user.id} className="rounded-2xl border border-[#e8ebee] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black">{user.name} {user.id === currentAdminId && <span className="ml-1 rounded-full bg-[#e8f7ee] px-2 py-0.5 text-[10px] font-black text-[#1b7a52]">คุณ</span>}</p>
              <p className="text-sm text-[#98a2ac]">@{user.username} · {roleLabel(user.role)}</p>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${user.active ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{user.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ADMIN_MENUS.filter((menu) => user.role === "OWNER" || user.permissions.includes(menu.key)).map((menu) => <span key={menu.key} className="rounded-full bg-[#f4f2ee] px-2.5 py-1 text-[11px] font-bold text-[#687582]">{menu.label}</span>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
            <button onClick={() => startEdit(user)} className="rounded-full border border-[#e0dcd5] px-4 py-2">แก้ไข</button>
            <button onClick={() => setActive(user, !user.active)} disabled={user.id === currentAdminId} className="rounded-full border border-[#e0dcd5] px-4 py-2 disabled:opacity-40">{user.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
            <button onClick={() => remove(user)} disabled={user.id === currentAdminId} className="rounded-full border border-[#f0c8c8] px-4 py-2 text-[#c0392b] disabled:opacity-40">ลบ</button>
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}
