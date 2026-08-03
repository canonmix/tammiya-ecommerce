"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearCart } from "@/lib/cart";
import MobileActionBar from "@/components/mobile-action-bar";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Runs the payment step: counts the hold down, watches for the order becoming PAID, and
 * takes the slip upload.
 *
 * Polling is what makes every path work without UI changes — the slip check below, an admin,
 * a future gateway webhook, or the server expiring the hold all show up here the same way.
 */
export default function PaymentWatcher({ code, slipVerifyEnabled, expiresAt, initialStatus }: { code: string; slipVerifyEnabled: boolean; expiresAt: string | null; initialStatus: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);

  const deadline = expiresAt ? new Date(expiresAt).getTime() : null;

  // Ticking is display only; the server is what actually decides an order has expired.
  useEffect(() => {
    if (!deadline || status !== "PENDING_PAYMENT") return;
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline, status]);

  useEffect(() => {
    if (status === "PAID") {
      clearCart();
      router.replace(`/checkout/success/${code}`);
      return;
    }
    if (status === "CANCELLED") return;
    const timer = setInterval(async () => {
      const data = (await fetch(`/api/checkout/orders/${code}`, { cache: "no-store" }).then((response) => response.json()).catch(() => null)) as { status?: string } | null;
      if (data?.status) setStatus(data.status);
    }, 4000);
    return () => clearInterval(timer);
  }, [code, status, router]);

  const upload = async (file: File) => {
    setError("");
    setFileName(file.name);
    setPending(true);
    const body = new FormData();
    body.append("slip", file);
    const response = await fetch(`/api/checkout/orders/${code}/verify-slip`, { method: "POST", body }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { ok?: boolean; status?: string; reason?: string } | null;
    setPending(false);
    if (!response?.ok || !data?.ok) {
      if (response?.status === 409) setStatus("CANCELLED");
      setError(data?.reason ?? "ตรวจสอบสลิปไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    setStatus(data.status ?? "PAID");
  };

  const confirmManually = async () => {
    setError("");
    setPending(true);
    const response = await fetch(`/api/checkout/orders/${code}/confirm`, { method: "POST" }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { status?: string; error?: string } | null;
    setPending(false);
    if (!response?.ok) {
      if (response?.status === 409) setStatus("CANCELLED");
      setError(data?.error ?? "ยืนยันไม่สำเร็จ กรุณาลองใหม่");
      return;
    }
    setStatus(data?.status ?? "PAID");
  };

  if (status === "PAID") return <p className="rounded-full bg-[#e8f7ee] px-5 py-3.5 text-center font-black text-[#1b7a52]">ชำระเงินแล้ว กำลังไปหน้าสรุป...</p>;

  if (status === "CANCELLED") return <div>
    <p className="rounded-2xl bg-[#fdecec] px-5 py-4 text-center text-sm leading-6 font-bold text-[#c0392b]">หมดเวลาชำระเงิน<br/>คำสั่งซื้อถูกยกเลิกและคืนสินค้าเข้าสต็อกแล้ว</p>
    <Link href="/products" className="mt-4 block rounded-full bg-[#18212b] px-5 py-3.5 text-center font-black text-white transition hover:bg-[#ef6c3d]">เลือกสินค้าใหม่อีกครั้ง</Link>
  </div>;

  const expiringSoon = remaining !== null && remaining <= 5 * 60 * 1000;

  return <div>
    {remaining !== null && <div className={`mb-4 rounded-2xl px-4 py-3 text-center ${expiringSoon ? "bg-[#fdecec] text-[#c0392b]" : "bg-[#faf8f4] text-[#687582]"}`}>
      <p className="text-xs font-bold">เหลือเวลาชำระเงิน</p>
      <p className="mt-0.5 text-2xl font-black tabular-nums">{pad(Math.floor(remaining / 60000))}:{pad(Math.floor((remaining % 60000) / 1000))}</p>
      <p className="mt-0.5 text-[11px] leading-4">เราจองสินค้าไว้ให้จนถึงเวลานี้ หากเลยกำหนดจะคืนสินค้าเข้าสต็อกอัตโนมัติ</p>
    </div>}

    {slipVerifyEnabled
      ? <>
          <input ref={fileInput} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) upload(file); event.target.value = ""; }}/>
          <button onClick={() => fileInput.current?.click()} disabled={pending} className="w-full rounded-full bg-[#ef6c3d] px-5 py-3.5 font-black text-white transition hover:bg-[#ff8352] disabled:bg-[#c7ccd1]">{pending ? "กำลังตรวจสอบสลิป..." : "โอนแล้ว แนบสลิปเพื่อยืนยัน"}</button>
          <p className="mt-3 text-center text-xs leading-5 text-[#98a2ac]">{fileName && !pending ? `ไฟล์ล่าสุด: ${fileName}` : "ระบบจะอ่านสลิปกับธนาคารและตรวจยอด/บัญชีปลายทางให้อัตโนมัติ"}</p>
        </>
      : <>
          <button onClick={confirmManually} disabled={pending} className="w-full rounded-full bg-[#ef6c3d] px-5 py-3.5 font-black text-white transition hover:bg-[#ff8352] disabled:bg-[#c7ccd1]">{pending ? "กำลังยืนยัน..." : "โอนเงินแล้ว แจ้งชำระเงิน"}</button>
          <p className="mt-3 flex items-center justify-center gap-2 text-xs text-[#98a2ac]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ef6c3d]"/>ยังไม่ได้เปิดระบบตรวจสลิปอัตโนมัติ
          </p>
        </>}
    {error && <p role="alert" className="mt-3 rounded-2xl bg-[#fdecec] px-4 py-3 text-sm leading-6 font-bold text-[#c0392b]">{error}</p>}

    <MobileActionBar
      label={remaining !== null ? "เหลือเวลาชำระเงิน" : "ยืนยันการชำระเงิน"}
      value={remaining !== null ? `${pad(Math.floor(remaining / 60000))}:${pad(Math.floor((remaining % 60000) / 1000))}` : "—"}
      action={slipVerifyEnabled
        ? <button onClick={() => fileInput.current?.click()} disabled={pending} className="rounded-full bg-[#ef6c3d] px-6 py-3.5 font-black whitespace-nowrap text-white disabled:bg-[#c7ccd1]">{pending ? "กำลังตรวจ..." : "แนบสลิป"}</button>
        : <button onClick={confirmManually} disabled={pending} className="rounded-full bg-[#ef6c3d] px-6 py-3.5 font-black whitespace-nowrap text-white disabled:bg-[#c7ccd1]">{pending ? "กำลังยืนยัน..." : "แจ้งชำระเงิน"}</button>}
    />
  </div>;
}
