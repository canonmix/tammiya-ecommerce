import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { claimableCoupons } from "@/lib/coupons";

// Public on purpose: the giveaway is advertising, so guests see it too and are asked to
// sign in only when they press claim.
export async function GET() {
  const customer = await getCurrentCustomer();
  return NextResponse.json(await claimableCoupons(customer?.id), { headers: { "Cache-Control": "no-store" } });
}
