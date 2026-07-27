import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const includeProduct = { category: true, images: { orderBy: { sortOrder: "asc" as const } } };

export async function GET() { return NextResponse.json(await prisma.product.findMany({ include: includeProduct, orderBy: { createdAt: "desc" } })); }

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { sku?: string; name?: string; categoryId?: string; price?: number; stock?: number; description?: string; images?: string[] } | null;
  if (!body?.sku || !body.name || !body.categoryId || body.price === undefined || body.stock === undefined) return NextResponse.json({ error: "Missing required product fields" }, { status: 400 });
  const slug = `${body.sku}-${body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;
  try { const product = await prisma.product.create({ data: { sku: body.sku.trim(), name: body.name.trim(), slug, categoryId: body.categoryId, price: Number(body.price), stock: Number(body.stock), description: body.description?.trim() || "สินค้า Tamiya Premium Shop", images: { create: (body.images || []).map((url, index) => ({ url, alt: body.name!, sortOrder: index })) } }, include: includeProduct }); return NextResponse.json(product, { status: 201 }); }
  catch { return NextResponse.json({ error: "SKU or product already exists" }, { status: 409 }); }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as { id?: string; status?: string } | null;
  if (!body?.id || !["AVAILABLE", "DISCONTINUED"].includes(body.status || "")) return NextResponse.json({ error: "Invalid product status" }, { status: 400 });
  try { const product = await prisma.product.update({ where: { id: body.id }, data: { status: body.status }, include: includeProduct }); return NextResponse.json(product); }
  catch { return NextResponse.json({ error: "Product not found" }, { status: 404 }); }
}
