import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import CheckoutSteps from "@/components/checkout-steps";
import CartSummary from "@/components/cart-summary";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getFreeShippingThreshold } from "@/lib/promotions";
import { pendingPaymentOrders } from "@/lib/orders";

// Step 2 of the checkout flow. Reads the session so the CTA can say whether login is still needed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "ตะกร้าสินค้า", robots: { index: false } };

export default async function CartPage() {
  const [customer, freeShipping] = await Promise.all([getCurrentCustomer(), getFreeShippingThreshold()]);
  const pending = customer ? await pendingPaymentOrders(customer.id) : [];

  return <main className="min-h-screen bg-white">
    <SiteHeader customerName={customer?.name} freeShippingThreshold={freeShipping} pendingOrders={pending}/>
    <div className="container-wide py-6 sm:py-10 md:py-12">
      <CheckoutSteps current={1}/>
      <h1 className="mt-5 mb-6 text-[26px] leading-8 font-black tracking-tight sm:mt-8 sm:mb-10 sm:text-4xl sm:leading-tight md:text-5xl">ตะกร้าสินค้า</h1>
      <CartSummary signedIn={Boolean(customer)}/>
    </div>
    <SiteFooter/>
  </main>;
}
