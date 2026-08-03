import Link from "next/link";
import AdminSidebar from "@/components/admin/admin-sidebar";
import CouponManager from "@/components/admin/coupon-manager";
import { requireAdmin } from "@/lib/admin-user";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdmin("coupons");
  return <main className="min-h-screen bg-white">
    <AdminSidebar/>
    <section className="md:ml-64">
      <header className="flex items-center justify-between gap-4 border-b bg-white px-4 py-5 md:px-10">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#ef6c3d] uppercase">Marketing</p>
          <h1 className="mt-1 text-2xl font-black">คูปอง</h1>
        </div>
        <Link href="/admin" className="shrink-0 rounded-full border px-4 py-2 text-sm font-bold">← Dashboard</Link>
      </header>
      <div className="max-w-4xl p-4 sm:p-6 md:p-10"><CouponManager/></div>
    </section>
  </main>;
}
