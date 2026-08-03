import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-user";
import { validate, type PromotionInput } from "@/lib/promotion-validate";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi("promotions");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const { id } = await params;
  const existing = await prisma.promotion.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบโปรโมชั่น" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as PromotionInput | null;
  // A bare {active} toggle is the common case and must not have to resend the whole promotion.
  if (body && Object.keys(body).length === 1 && typeof body.active === "boolean") {
    return NextResponse.json(await prisma.promotion.update({ where: { id }, data: { active: body.active } }));
  }

  const result = validate({ ...existing, startsAt: existing.startsAt?.toISOString() ?? null, endsAt: existing.endsAt?.toISOString() ?? null, ...body });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(await prisma.promotion.update({ where: { id }, data: result.data! }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminApi("promotions");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const { id } = await params;
  if (!(await prisma.promotion.findUnique({ where: { id } }))) return NextResponse.json({ error: "ไม่พบโปรโมชั่น" }, { status: 404 });
  await prisma.promotion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
