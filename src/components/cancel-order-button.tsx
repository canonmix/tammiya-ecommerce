"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { refreshPendingOrder } from "@/lib/pending-order";

/**
 * Lets a shopper drop their own unpaid order.
 *
 * It exists because an unpaid order blocks the whole shop — without a way out, someone who
 * changed their mind would have to wait an hour before they could buy anything else. Cancelling
 * returns stock and any coupon use, so it always asks first, in a dialog that must be answered.
 */
export default function CancelOrderButton({
  code, tone = "light", block = false, redirectTo,
}: { code: string; tone?: "light" | "dark"; block?: boolean; redirectTo?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKeyDown);
    // The page behind must not scroll away underneath the dialog.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const cancel = async () => {
    setPending(true);
    setError("");
    const response = await fetch(`/api/checkout/orders/${code}`, { method: "DELETE" }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    if (!response?.ok) {
      setPending(false);
      setError(data?.error ?? "ยกเลิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      return;
    }
    await refreshPendingOrder();
    // From the payment page the cart is where they wanted to go; the items are still in it.
    if (redirectTo) router.push(redirectTo);
    router.refresh();
    setPending(false);
    setOpen(false);
  };

  // The block variant is a real button in the payment sidebar; elsewhere it is a quiet text link.
  const trigger = <button
    onClick={() => { setError(""); setOpen(true); }}
    className={block
      ? "mt-3 w-full rounded-full border border-[#e0dcd5] py-3 text-sm font-bold text-[#687582] transition hover:border-[#c0392b] hover:text-[#c0392b]"
      : `shrink-0 text-sm font-bold whitespace-nowrap underline transition ${tone === "dark" ? "text-white/70 hover:text-white" : "text-[#98a2ac] hover:text-[#18212b]"}`}
  >{block ? "ยกเลิกออเดอร์" : <><span className="sm:hidden">ยกเลิก</span><span className="hidden sm:inline">ยกเลิกออเดอร์</span></>}</button>;

  // Portalled to the body: these buttons sit inside cards that clip and stack their own content.
  const dialog = open && createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => { if (!pending) setOpen(false); }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`cancel-${code}-title`}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-[28px] bg-white p-6 text-[#18212b] shadow-2xl sm:p-7"
      >
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-full bg-[#fdecec] text-2xl">⚠️</span>
        <h2 id={`cancel-${code}-title`} className="mt-4 text-xl leading-7 font-black tracking-tight">ยกเลิกคำสั่งซื้อ {code}?</h2>
        <p className="mt-2.5 text-sm leading-6 text-[#687582]">สินค้าที่จองไว้จะถูกคืนเข้าสต็อกทันที ถ้าใช้คูปองไว้ สิทธิ์คูปองจะคืนให้ด้วย<br/>สินค้าในตะกร้ายังอยู่ครบ สั่งใหม่ได้เลย</p>
        {error && <p role="alert" className="mt-4 rounded-2xl bg-[#fdecec] px-4 py-3 text-sm font-bold text-[#c0392b]">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row">
          <button onClick={() => setOpen(false)} disabled={pending} className="flex-1 rounded-full border border-[#e0dcd5] py-3 font-bold transition hover:border-[#18212b] disabled:opacity-50">เก็บออเดอร์ไว้</button>
          <button onClick={cancel} disabled={pending} className="flex-1 rounded-full bg-[#c0392b] py-3 font-black text-white transition hover:bg-[#e04b3a] disabled:bg-[#c7ccd1]">{pending ? "กำลังยกเลิก..." : "ยืนยันยกเลิก"}</button>
        </div>
      </div>
    </div>,
    document.body,
  );

  return <>{trigger}{dialog}</>;
}
