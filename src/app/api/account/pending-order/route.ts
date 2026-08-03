import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { pendingPaymentOrders } from "@/lib/orders";

// What the storefront buttons need to know: is there an unpaid order in the way right now?
export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ order: null }, { headers: { "Cache-Control": "no-store" } });
  const [waiting] = await pendingPaymentOrders(customer.id);
  return NextResponse.json({ order: waiting ?? null }, { headers: { "Cache-Control": "no-store" } });
}
