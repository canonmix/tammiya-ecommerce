import Link from "next/link";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/admin-sidebar";
import { getCurrentAdmin } from "@/lib/admin-user";
import { ADMIN_MENUS } from "@/lib/admin-permissions";

export const dynamic = "force-dynamic";

// Where requireAdmin sends someone who opened a menu their account cannot use.
export default async function AdminDeniedPage({ searchParams }: { searchParams: Promise<{ menu?: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const { menu } = await searchParams;
  const blocked = ADMIN_MENUS.find((item) => item.key === menu);
  const firstAllowed = ADMIN_MENUS.find((item) => admin.permissions.includes(item.key));

  return <main className="min-h-screen bg-white">
    <AdminSidebar/>
    <section className="md:ml-64">
      <div className="grid min-h-screen place-items-center p-6">
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#fdecec] text-3xl text-[#c0392b]">🔒</span>
          <h1 className="mt-6 text-2xl font-black">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="mt-3 leading-7 text-[#687582]">
            บัญชี <b className="text-[#18212b]">{admin.name}</b> ไม่ได้รับสิทธิ์ให้เปิด{blocked ? `เมนู “${blocked.label}”` : "เมนูนี้"}
            <br/>หากต้องใช้งาน กรุณาแจ้งผู้ที่ดูแลสิทธิ์ให้เปิดให้
          </p>
          {firstAllowed
            ? <Link href={firstAllowed.href} className="mt-8 inline-block rounded-full bg-[#18212b] px-7 py-3 font-bold text-white transition hover:bg-[#ef6c3d]">ไปที่{firstAllowed.label}</Link>
            : <p className="mt-8 rounded-2xl bg-[#faf8f4] px-5 py-4 text-sm text-[#687582]">บัญชีนี้ยังไม่ได้รับสิทธิ์เมนูใดเลย</p>}
          <Link href="/" className="mt-4 block text-sm font-bold text-[#687582]">← กลับหน้าร้าน</Link>
        </div>
      </div>
    </section>
  </main>;
}
