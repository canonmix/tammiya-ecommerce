import { NextResponse } from "next/server";
import { resolveCart } from "@/lib/orders";
import { getCurrentCustomer } from "@/lib/customer-auth";
import type { CartLine } from "@/lib/cart";

// The cart lives in the browser, so the summary page posts its ids here to get
// authoritative names, prices and stock back from the database.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { items?: CartLine[]; couponCode?: string } | null;
  // Coupons carry per-customer limits, so they only resolve for a signed-in shopper.
  const customer = body?.couponCode ? await getCurrentCustomer() : null;
  const cart = await resolveCart(Array.isArray(body?.items) ? body.items : [], {
    couponCode: body?.couponCode,
    customerId: customer?.id,
  });
  return NextResponse.json(cart);
}
