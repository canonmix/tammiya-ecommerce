import { NextResponse } from "next/server";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { claimCoupon } from "@/lib/coupons";

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { couponId?: string } | null;
  if (!body?.couponId) return NextResponse.json({ error: "ไม่พบคูปองนี้" }, { status: 400 });

  const result = await claimCoupon(body.couponId, customer.id);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 409 });
  return NextResponse.json({ ok: true });
}
