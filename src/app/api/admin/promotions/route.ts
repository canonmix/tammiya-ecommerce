import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-user";
import { validate, type PromotionInput } from "@/lib/promotion-validate";

export async function GET() {
  const { error } = await requireAdminApi("promotions");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const [promotions, categories, products] = await Promise.all([
    prisma.promotion.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ select: { id: true, name: true, sku: true }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ promotions, categories, products }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const { error } = await requireAdminApi("promotions");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const result = validate((await request.json().catch(() => null)) as PromotionInput);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(await prisma.promotion.create({ data: result.data! }), { status: 201 });
}
