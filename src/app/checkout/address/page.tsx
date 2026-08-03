import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CheckoutSteps from "@/components/checkout-steps";
import AddressForm from "@/components/address-form";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getFreeShippingThreshold } from "@/lib/promotions";

// Step 4 of the checkout flow. The proxy already blocks anonymous visitors; the guard here
// is what narrows `customer` from null for TypeScript and covers direct server rendering.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ที่อยู่จัดส่ง", robots: { index: false } };

export default async function AddressPage() {
  const [customer, freeShipping] = await Promise.all([getCurrentCustomer(), getFreeShippingThreshold()]);
  if (!customer) redirect(`/login?next=${encodeURIComponent("/checkout/address")}`);

  // Prefill from the most recent address so repeat buyers do not retype everything.
  const previous = await prisma.address.findFirst({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" } });

  return <main className="min-h-screen bg-white">
    <SiteHeader customerName={customer.name} freeShippingThreshold={freeShipping}/>
    <div className="container-wide py-12">
      <CheckoutSteps current={3}/>
      <h1 className="mt-8 mb-10 text-4xl font-black tracking-tight md:text-5xl">จัดส่งไปที่ไหนดี</h1>
      <AddressForm defaults={{ recipient: previous?.recipient ?? customer.name, phone: previous?.phone ?? customer.phone ?? "", line1: previous?.line1, subdistrict: previous?.subdistrict, district: previous?.district, province: previous?.province, postalCode: previous?.postalCode }}/>
    </div>
    <SiteFooter/>
  </main>;
}
