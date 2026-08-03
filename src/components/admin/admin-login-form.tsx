"use client";

import { FormEvent, useState } from "react";

// `bootstrap` is true while no CMS user exists: the only credential then is ADMIN_PASSWORD,
// so asking for a username would be asking for something that does not exist yet.
export default function AdminLoginForm({ bootstrap }: { bootstrap: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bootstrap ? { password } : { username, password }),
    }).catch(() => null);
    if (response?.ok) { window.location.assign("/admin"); return; }
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setError(data?.error || "เข้าสู่ระบบไม่สำเร็จ");
    setLoading(false);
  }

  const field = "mt-2 w-full rounded-xl border border-[#e0dcd5] p-3 text-sm outline-none transition focus:border-[#ef6c3d]";

  return <form onSubmit={submit} className="mt-8">
    {bootstrap
      ? <p className="mb-5 rounded-2xl border border-[#f3d9c9] bg-[#fdf3ee] px-4 py-3 text-sm leading-6 font-bold text-[#b4552a]">ยังไม่มีผู้ใช้ในระบบ — เข้าด้วยรหัสผ่านกลางจาก .env ก่อน แล้วสร้างผู้ใช้คนแรกที่เมนู “จัดการผู้ใช้”</p>
      : <div className="mb-4">
          <label htmlFor="admin-username" className="text-sm font-bold">ชื่อผู้ใช้</label>
          <input id="admin-username" autoFocus required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" placeholder="เช่น somchai" className={field}/>
        </div>}

    <label htmlFor="admin-password" className="text-sm font-bold">รหัสผ่าน</label>
    <input id="admin-password" autoFocus={bootstrap} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="กรอกรหัสผ่าน" className={field}/>

    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    <button disabled={loading} className="mt-4 w-full rounded-full bg-[#18212b] px-5 py-3 font-bold text-white transition hover:bg-[#ef6c3d] disabled:opacity-50">{loading ? "กำลังตรวจสอบ..." : "เข้าสู่ CMS"}</button>
  </form>;
}
