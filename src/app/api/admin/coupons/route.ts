import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-user";
import { validateCoupon, type CouponInput } from "@/lib/coupon-validate";

export async function GET() {
  const { error } = await requireAdminApi("coupons");
  if (error) return NextResponse.json(error.body, { status: error.status });
  return NextResponse.json(await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi("coupons");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const result = validateCoupon((await request.json().catch(() => null)) as CouponInput);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  if (await prisma.coupon.findUnique({ where: { code: result.data!.code } })) {
    return NextResponse.json({ error: "โค้ดนี้ถูกใช้แล้ว" }, { status: 409 });
  }
  return NextResponse.json(await prisma.coupon.create({ data: result.data! }), { status: 201 });
}
