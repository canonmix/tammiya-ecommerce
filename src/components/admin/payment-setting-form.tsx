"use client";

import { useState } from "react";
import { promptPayKind, type PaymentSettingValues } from "@/lib/payment-shared";

const FIELDS: { key: keyof PaymentSettingValues; label: string; hint: string; placeholder: string; inputMode?: "numeric" }[] = [
  { key: "promptPayId", label: "PromptPay ID", hint: "ใช้สร้าง QR ให้ลูกค้า — เบอร์มือถือ 10 หลัก, เลขบัตรประชาชน 13 หลัก หรือ e-Wallet ID 15 หลัก", placeholder: "004999015401408", inputMode: "numeric" },
  { key: "accountName", label: "ชื่อบัญชี", hint: "ต้องตรงกับชื่อผู้รับเงินบนสลิป ระบบ verify ใช้ค่านี้เทียบ", placeholder: "นาย วัชรพงศ์ สัลลกะชาต" },
  { key: "bankName", label: "ธนาคาร", hint: "แสดงให้ลูกค้าที่อยากโอนเองแทนการสแกน", placeholder: "กสิกรไทย (KBank)" },
  { key: "bankAccountNumber", label: "เลขบัญชีธนาคาร", hint: "ใช้เทียบกับเลขบัญชีปลายทางบนสลิป", placeholder: "xxx-x-x4519-x" },
  { key: "note", label: "หมายเหตุ (ไม่บังคับ)", hint: "ข้อความเพิ่มเติมที่จะแสดงใต้ QR", placeholder: "โอนแล้วแนบสลิปในแชทได้เลย" },
];

export default function PaymentSettingForm({ initial, slipVerifyEnabled }: { initial: PaymentSettingValues; slipVerifyEnabled: boolean }) {
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  const set = (key: keyof PaymentSettingValues) => (event: React.ChangeEvent<HTMLInputElement>) => setValues((current) => ({ ...current, [key]: event.target.value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus(null);
    setPending(true);
    const response = await fetch("/api/admin/payment-setting", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setPending(false);
    setStatus(response?.ok ? { tone: "ok", text: "บันทึกแล้ว — หน้าชำระเงินจะใช้ข้อมูลนี้ทันที" } : { tone: "error", text: data?.error ?? "บันทึกไม่สำเร็จ กรุณาลองใหม่" });
  };

  const kind = promptPayKind(values.promptPayId);

  return <form onSubmit={save} className="space-y-6">
    <section className="rounded-3xl border border-[#e8ebee] bg-white p-6 shadow-sm">
      <p className="eyebrow">Receiving account</p>
      <h2 className="mt-1 text-xl font-black">บัญชีที่ลูกค้าโอนเข้า</h2>
      <p className="mt-2 text-sm leading-6 text-[#687582]">ข้อมูลชุดนี้ถูกใช้สองที่: สร้าง QR พร้อมเพย์บนหน้าชำระเงิน และเป็นค่าอ้างอิงตอนตรวจสลิปว่าเงินเข้าบัญชีที่ถูกต้องจริง</p>

      <div className="mt-7 grid gap-5">
        {FIELDS.map((field) => <div key={field.key}>
          <label htmlFor={field.key} className="mb-1.5 block text-xs font-black text-[#687582]">{field.label}</label>
          <input id={field.key} value={values[field.key]} onChange={set(field.key)} placeholder={field.placeholder} inputMode={field.inputMode} className="w-full rounded-2xl border border-[#e0dcd5] px-4 py-3 text-sm outline-none transition focus:border-[#ef6c3d]"/>
          <p className="mt-1.5 text-xs leading-5 text-[#98a2ac]">{field.hint}</p>
          {field.key === "promptPayId" && kind && <p className={`mt-1.5 text-xs font-bold ${kind === "รูปแบบไม่ถูกต้อง" ? "text-[#c0392b]" : "text-[#22a06b]"}`}>ตรวจพบรูปแบบ: {kind}</p>}
        </div>)}
      </div>

      {status && <p role="status" className={`mt-6 rounded-2xl px-4 py-3 text-sm font-bold ${status.tone === "ok" ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{status.text}</p>}

      <button type="submit" disabled={pending} className="mt-6 rounded-full bg-[#18212b] px-7 py-3 font-black text-white transition hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1]">{pending ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}</button>
    </section>

    <section className="rounded-3xl border border-[#e8ebee] bg-[#faf8f4] p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-black">การตรวจสลิปอัตโนมัติ</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${slipVerifyEnabled ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{slipVerifyEnabled ? "เชื่อมต่อ slip2go แล้ว" : "ยังไม่ได้ตั้งค่า SLIP2GO_API_KEY"}</span>
      </div>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-[#687582]">
        <li>• ลูกค้าแนบสลิปที่หน้าชำระเงิน ระบบส่งให้ slip2go อ่านกับธนาคาร แล้วตัดสินให้อัตโนมัติ</li>
        <li>• ผ่านก็ต่อเมื่อ: บัญชีปลายทางตรงกับ <b className="text-[#18212b]">เลขบัญชี</b> หรือ <b className="text-[#18212b]">PromptPay ID</b> หรือ <b className="text-[#18212b]">ชื่อบัญชี</b> ด้านบน</li>
        <li>• และยอดบนสลิปต้องเท่ากับยอดของคำสั่งซื้อพอดี</li>
        <li>• เลขอ้างอิงธุรกรรม (transRef) ถูกบันทึกแบบห้ามซ้ำ สลิปใบเดิมจึงใช้จ่ายสองออเดอร์ไม่ได้</li>
        <li>• ถ้าเปลี่ยนบัญชีที่นี่ QR ของออเดอร์ที่ยังไม่จ่ายจะเปลี่ยนตามทันที</li>
      </ul>
    </section>
  </form>;
}
