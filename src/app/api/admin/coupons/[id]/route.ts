import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-user";
import { validateCoupon, type CouponInput } from "@/lib/coupon-validate";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi("coupons");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const { id } = await params;
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบคูปอง" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as CouponInput | null;
  // A bare on/off toggle should not require resending the whole coupon.
  if (body && Object.keys(body).length === 1 && typeof body.active === "boolean") {
    return NextResponse.json(await prisma.coupon.update({ where: { id }, data: { active: body.active } }));
  }

  const result = validateCoupon({
    ...existing,
    startsAt: existing.startsAt?.toISOString() ?? null,
    endsAt: existing.endsAt?.toISOString() ?? null,
    claimStartsAt: existing.claimStartsAt?.toISOString() ?? null,
    claimEndsAt: existing.claimEndsAt?.toISOString() ?? null,
    ...body,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  if (result.data!.code !== existing.code && await prisma.coupon.findUnique({ where: { code: result.data!.code } })) {
    return NextResponse.json({ error: "โค้ดนี้ถูกใช้แล้ว" }, { status: 409 });
  }
  return NextResponse.json(await prisma.coupon.update({ where: { id }, data: result.data! }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi("coupons");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const { id } = await params;
  const coupon = await prisma.coupon.findUnique({ where: { id }, include: { _count: { select: { redemptions: true } } } });
  if (!coupon) return NextResponse.json({ error: "ไม่พบคูปอง" }, { status: 404 });
  // Deleting would take the redemption history of real orders with it.
  if (coupon._count.redemptions > 0) return NextResponse.json({ error: "คูปองนี้ถูกใช้ไปแล้ว จึงลบไม่ได้ — ปิดใช้งานแทนได้" }, { status: 409 });

  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
