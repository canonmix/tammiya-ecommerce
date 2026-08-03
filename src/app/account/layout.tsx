import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import AccountNav from "@/components/account-nav";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getFreeShippingThreshold } from "@/lib/promotions";

export const dynamic = "force-dynamic";

// Set once for the whole section so a new account screen cannot be added without it.
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

// Everything under /account belongs to a signed-in shopper, so the guard lives here once.
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const [customer, freeShipping] = await Promise.all([getCurrentCustomer(), getFreeShippingThreshold()]);
  if (!customer) redirect(`/login?next=${encodeURIComponent("/account/profile")}`);

  return <main className="min-h-screen bg-white">
    <SiteHeader customerName={customer.name} freeShippingThreshold={freeShipping}/>
    <div className="container-wide py-6 sm:py-8 md:py-12">
      <p className="eyebrow mb-2 sm:mb-3">My account</p>
      <h1 className="mb-6 text-[26px] leading-8 font-black tracking-tight sm:mb-8 sm:text-4xl sm:leading-tight md:text-5xl">สวัสดี {customer.name}</h1>
      <div className="checkout-grid grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-12">
        <AccountNav/>
        <div>{children}</div>
      </div>
    </div>
    <SiteFooter/>
  </main>;
}
