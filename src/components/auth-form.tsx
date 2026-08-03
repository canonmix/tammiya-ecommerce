"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  facebook_not_configured: "ยังไม่ได้ตั้งค่า Facebook Login — ใส่ FACEBOOK_CLIENT_ID และ FACEBOOK_CLIENT_SECRET ใน .env ก่อน",
  facebook_state: "การเชื่อม Facebook หมดอายุ กรุณาลองใหม่",
  facebook_token: "แลกโทเคนกับ Facebook ไม่สำเร็จ",
  facebook_profile: "อ่านข้อมูลโปรไฟล์จาก Facebook ไม่สำเร็จ",
};

type Mode = "login" | "register";
const mmss = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export default function AuthForm({ next, facebookEnabled, initialError }: { next: string; facebookEnabled: boolean; initialError?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState(initialError ? (ERROR_MESSAGES[initialError] ?? "เข้าสู่ระบบไม่สำเร็จ") : "");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  // Signup is two steps: collect details, then prove the phone number is really theirs.
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const switchMode = (option: Mode) => {
    setMode(option);
    setError("");
    setNotice("");
    setOtpSent(false);
    setCode("");
  };

  const requestOtp = async () => {
    setError("");
    setNotice("");
    setPending(true);
    const response = await fetch("/api/auth/otp/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone }) }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string; retryAfterSeconds?: number; resendAfterSeconds?: number; devCode?: string } | null;
    setPending(false);
    if (!response?.ok) {
      setError(data?.error ?? "ส่งรหัส OTP ไม่สำเร็จ");
      if (data?.retryAfterSeconds) setResendIn(data.retryAfterSeconds);
      return;
    }
    setOtpSent(true);
    setResendIn(data?.resendAfterSeconds ?? 300);
    setNotice(data?.devCode ? `โหมดทดสอบ (ยังไม่ได้ต่อ SMS): รหัสคือ ${data.devCode}` : `ส่งรหัส 6 หลักไปที่ ${phone} แล้ว`);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    // In signup, the first press asks for a code rather than creating the account.
    if (mode === "register" && !otpSent) { await requestOtp(); return; }

    setError("");
    setPending(true);
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload = mode === "login" ? { phone, password } : { name, phone, password, code };
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    if (!response?.ok) {
      setError(data?.error ?? "เชื่อมต่อไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    // refresh() lets the server components on the next page see the new session cookie.
    router.push(next);
    router.refresh();
  };

  const field = "w-full rounded-2xl border border-[#e0dcd5] px-4 py-3 text-sm outline-none transition focus:border-[#ef6c3d]";
  const label = "mb-1.5 block text-xs font-black text-[#687582]";

  return <div>
    <div className="flex gap-1 rounded-full bg-[#f4f2ee] p-1">
      {(["login", "register"] as Mode[]).map((option) => <button key={option} type="button" onClick={() => switchMode(option)} className={`flex-1 rounded-full px-4 py-2.5 text-sm font-black transition ${mode === option ? "bg-white text-[#18212b] shadow-sm" : "text-[#7b8792]"}`}>{option === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</button>)}
    </div>

    <a
      href={facebookEnabled ? `/api/auth/facebook?next=${encodeURIComponent(next)}` : undefined}
      aria-disabled={!facebookEnabled}
      onClick={(event) => { if (!facebookEnabled) { event.preventDefault(); setError(ERROR_MESSAGES.facebook_not_configured); } }}
      className={`mt-7 flex w-full items-center justify-center gap-3 rounded-full px-5 py-3.5 font-bold text-white transition ${facebookEnabled ? "bg-[#1877f2] hover:bg-[#0f66d0]" : "cursor-not-allowed bg-[#1877f2]/40"}`}
    >
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5 fill-current"><path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.91h-2.33V22c4.78-.76 8.44-4.92 8.44-9.94Z"/></svg>
      {mode === "login" ? "เข้าสู่ระบบด้วย Facebook" : "สมัครด้วย Facebook"}
    </a>

    <div className="my-6 flex items-center gap-3 text-xs font-bold text-[#98a2ac]">
      <span className="h-px flex-1 bg-[#eeebe6]"/>หรือใช้เบอร์มือถือ<span className="h-px flex-1 bg-[#eeebe6]"/>
    </div>

    <form onSubmit={submit} className="space-y-3">
      {mode === "register" && <div>
        <label htmlFor="auth-name" className={label}>ชื่อ-นามสกุล</label>
        <input id="auth-name" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required disabled={otpSent} className={`${field} disabled:bg-[#f7f6f2]`}/>
      </div>}
      <div>
        <label htmlFor="auth-phone" className={label}>เบอร์มือถือ</label>
        <input id="auth-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="0812345678" required disabled={mode === "register" && otpSent} className={`${field} disabled:bg-[#f7f6f2]`}/>
      </div>
      <div>
        <label htmlFor="auth-password" className={label}>รหัสผ่าน{mode === "register" && " (อย่างน้อย 8 ตัวอักษร)"}</label>
        <input id="auth-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} required disabled={mode === "register" && otpSent} className={`${field} disabled:bg-[#f7f6f2]`}/>
      </div>

      {mode === "register" && otpSent && <div className="rounded-2xl border border-[#e8e5df] bg-[#faf8f4] p-4">
        <label htmlFor="auth-code" className={label}>รหัส OTP 6 หลัก</label>
        <input id="auth-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required placeholder="123456" className={`${field} bg-white text-center text-xl font-black tracking-[.4em]`}/>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <button type="button" onClick={requestOtp} disabled={resendIn > 0 || pending} className="font-bold text-[#ef6c3d] underline disabled:text-[#98a2ac] disabled:no-underline">
            {resendIn > 0 ? `ขอรหัสใหม่ได้ในอีก ${mmss(resendIn)}` : "ขอรหัส OTP ใหม่"}
          </button>
          <button type="button" onClick={() => { setOtpSent(false); setCode(""); setNotice(""); }} className="font-bold text-[#98a2ac] underline">แก้ไขข้อมูล</button>
        </div>
      </div>}

      {notice && <p className="rounded-2xl bg-[#e8f7ee] px-4 py-3 text-sm leading-6 font-bold text-[#1b7a52]">{notice}</p>}
      {error && <p role="alert" className="rounded-2xl bg-[#fdecec] px-4 py-3 text-sm leading-6 font-bold text-[#c0392b]">{error}</p>}

      <button type="submit" disabled={pending} className="w-full rounded-full bg-[#18212b] px-5 py-3.5 font-black text-white transition hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1]">
        {pending ? "กำลังดำเนินการ..." : mode === "login" ? "เข้าสู่ระบบ" : otpSent ? "ยืนยันและสมัครสมาชิก" : "ส่งรหัส OTP"}
      </button>
    </form>
  </div>;
}
