import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-user";

// GET only reads. The default categories used to be upserted here on every request,
// which resurrected every default Category an admin had deleted. New categories are
// created through POST (the "+ Category" form in Product Management).
export async function GET() {
  const guard = await requireAdminApi("categories");
  if (guard.error) return NextResponse.json(guard.error.body, { status: guard.error.status });

  const categories = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { createdAt: "asc" } });
  return NextResponse.json(categories, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  const guard = await requireAdminApi("categories");
  if (guard.error) return NextResponse.json(guard.error.body, { status: guard.error.status });

  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  try { return NextResponse.json(await prisma.category.create({ data: { name } }), { status: 201 }); }
  catch { return NextResponse.json({ error: "Category already exists" }, { status: 409 }); }
}
export async function DELETE(request: Request) {
  const guard = await requireAdminApi("categories");
  if (guard.error) return NextResponse.json(guard.error.body, { status: guard.error.status });

  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Category id is required" }, { status: 400 });
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  if (category._count.products > 0) return NextResponse.json({ error: "Category has products" }, { status: 409 });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
