import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { couponsForCustomer } from "@/lib/coupons";

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  return NextResponse.json(await couponsForCustomer(customer.id), { headers: { "Cache-Control": "no-store" } });
}
