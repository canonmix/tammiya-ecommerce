import type { Metadata } from "next";
import CouponList from "@/components/coupon-list";

export const metadata: Metadata = { title: "คูปองของฉัน", robots: { index: false } };

export default function CouponsPage() {
  return <div className="space-y-6">
    <p className="rounded-2xl bg-[#faf8f4] px-5 py-4 text-sm leading-6 text-[#687582]">คูปองที่คุณกดรับไว้ทั้งหมด เลือกใช้ตอนสั่งซื้อได้เลย ไม่ต้องพิมพ์โค้ด</p>
    <CouponList/>
  </div>;
}
