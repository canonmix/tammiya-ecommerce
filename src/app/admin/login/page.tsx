import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/admin/admin-login-form";
import { getCurrentAdmin, needsBootstrap } from "@/lib/admin-user";

export const dynamic = "force-dynamic";

export default async function AdminLogin() {
  if (await getCurrentAdmin()) redirect("/admin");
  // Before the first CMS user exists, the only credential available is ADMIN_PASSWORD.
  const bootstrap = await needsBootstrap();

  return <main className="grid min-h-screen place-items-center p-5">
    <div className="card-shadow w-full max-w-md rounded-[32px] bg-white p-8">
      <Link href="/" className="text-xl font-black">
        <Image src="/mini4wd-logo-mark.png" alt="MINI4WD Premium Shop" width={580} height={126} className="h-10 w-auto invert" priority/>
      </Link>
      <p className="eyebrow mt-10">Private CMS</p>
      <h1 className="mt-2 text-3xl font-black">เข้าสู่ระบบหลังบ้าน</h1>
      <p className="mt-2 text-[#687582]">หน้านี้สงวนไว้สำหรับผู้ดูแลร้านเท่านั้น</p>
      <AdminLoginForm bootstrap={bootstrap}/>
      <Link href="/" className="mt-6 block text-center text-sm text-[#687582]">← กลับหน้าร้าน</Link>
    </div>
  </main>;
}
