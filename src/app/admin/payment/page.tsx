import Link from "next/link";
import AdminSidebar from "@/components/admin/admin-sidebar";
import PaymentSettingForm from "@/components/admin/payment-setting-form";
import { getPaymentSetting } from "@/lib/payment-setting";
import { isSlip2GoConfigured } from "@/lib/slip2go";

// Reads the current account on every visit so two admins never edit a stale copy.
export const dynamic = "force-dynamic";

export default async function PaymentSettingPage() {
  const setting = await getPaymentSetting();

  return <main className="min-h-screen bg-white">
    <AdminSidebar/>
    <section className="md:ml-64">
      <header className="flex items-center justify-between border-b bg-white px-6 py-5 md:px-10">
        <div>
          <p className="text-xs font-bold tracking-widest text-[#ef6c3d] uppercase">Payment settings</p>
          <h1 className="mt-1 text-2xl font-black">บัญชีรับเงิน</h1>
        </div>
        <Link href="/admin" className="rounded-full border px-4 py-2 text-sm font-bold">← กลับ Dashboard</Link>
      </header>
      <div className="max-w-4xl p-6 md:p-10"><PaymentSettingForm initial={setting} slipVerifyEnabled={isSlip2GoConfigured()}/></div>
    </section>
  </main>;
}
