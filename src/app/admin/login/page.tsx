"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const response = await fetch("/api/admin/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
    if (response.ok) window.location.assign("/admin");
    else { const data = await response.json().catch(() => null); setError(data?.error || "เข้าสู่ระบบไม่สำเร็จ"); setLoading(false); }
  }
  return <main className="grid min-h-screen place-items-center p-5"><div className="w-full max-w-md rounded-[32px] bg-white p-8 card-shadow"><Link href="/" className="text-xl font-black"><Image src="/mini4wd-logo.png" alt="MINI4WD Premium Shop" width={220} height={66} className="h-10 w-auto" priority/></Link><p className="eyebrow mt-10">Private CMS</p><h1 className="mt-2 text-3xl font-black">เข้าสู่ระบบหลังบ้าน</h1><p className="mt-2 text-[#687582]">หน้านี้สงวนไว้สำหรับผู้ดูแลร้านเท่านั้น</p><form onSubmit={submit} className="mt-8"><label className="text-sm font-bold">Admin password</label><input autoFocus required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border p-3" placeholder="กรอกรหัสผ่านผู้ดูแล"/>{error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={loading} className="mt-4 w-full rounded-full bg-[#18212b] px-5 py-3 font-bold text-white disabled:opacity-50">{loading ? "กำลังตรวจสอบ..." : "เข้าสู่ CMS"}</button></form><Link href="/" className="mt-6 block text-center text-sm text-[#687582]">← กลับหน้าร้าน</Link></div></main>;
}
