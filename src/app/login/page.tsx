import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import AuthForm from "@/components/auth-form";
import CheckoutSteps from "@/components/checkout-steps";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { isFacebookConfigured } from "@/lib/facebook";
import { safeNext } from "@/lib/safe-next";

// Step 3 of the checkout flow, and the standalone sign-in page.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "เข้าสู่ระบบ", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const target = safeNext(next);
  // Already signed in — skip straight to whatever they were heading for.
  if (await getCurrentCustomer()) redirect(target);

  const inCheckout = target.startsWith("/checkout");

  return <main className="grid min-h-screen place-items-center bg-[#faf8f4] p-5">
    <div className="w-full max-w-md">
      {inCheckout && <div className="mb-6 rounded-[28px] border border-[#e8ebee] bg-white p-5"><CheckoutSteps current={2}/></div>}
      <div className="card-shadow rounded-[32px] bg-white p-8">
        <Link href="/" aria-label="MINI4WD Premium Shop">
          <Image src="/mini4wd-logo-mark.png" alt="MINI4WD Premium Shop" width={580} height={126} className="h-9 w-auto invert" priority/>
        </Link>
        <h1 className="mt-9 text-3xl font-black tracking-tight">เข้ามาใน Garage</h1>
        <p className="mt-2 text-[#687582]">{inCheckout ? "เข้าสู่ระบบเพื่อไปต่อที่ขั้นตอนจัดส่ง" : "เข้าสู่ระบบเพื่อดูออเดอร์และสะสมสิทธิพิเศษ"}</p>
        <div className="mt-8"><AuthForm next={target} facebookEnabled={isFacebookConfigured()} initialError={error}/></div>
        <p className="mt-7 text-center text-xs leading-5 text-[#98a2ac]">การกดยืนยันถือว่ายอมรับเงื่อนไขการใช้งาน</p>
      </div>
      <Link href="/products" className="mt-6 block text-center text-sm font-bold text-[#687582] transition hover:text-[#ef6c3d]">← กลับไปเลือกสินค้า</Link>
    </div>
  </main>;
}
