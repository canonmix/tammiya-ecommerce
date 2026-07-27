import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export async function GET() { return NextResponse.json(await prisma.product.findMany({ include: { category: true, images: { orderBy: { sortOrder: "asc" } } }, orderBy: { createdAt: "desc" } })); }
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { sku?: string; name?: string; categoryId?: string; price?: number; stock?: number; description?: string; images?: string[] } | null;
  if (!body?.sku || !body.name || !body.categoryId || body.price === undefined || body.stock === undefined) return NextResponse.json({ error: "Missing required product fields" }, { status: 400 });
  const slug = `${body.sku}-${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  try { const product = await prisma.product.create({ data: { sku: body.sku.trim(), name: body.name.trim(), slug, categoryId: body.categoryId, price: Number(body.price), stock: Number(body.stock), description: body.description?.trim() || "สินค้า Tamiya Premium Shop", images: { create: (body.images || []).map((url, index) => ({ url, alt: body.name!, sortOrder: index })) } }, include: { category: true, images: true } }); return NextResponse.json(product, { status: 201 }); }
  catch { return NextResponse.json({ error: "SKU or product already exists" }, { status: 409 }); }
}
