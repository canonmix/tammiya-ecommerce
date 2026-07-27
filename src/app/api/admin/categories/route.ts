import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const defaults = ["รถ Mini 4WD", "อะไหล่และมอเตอร์", "อุปกรณ์แต่งรถ"];
export async function GET() {
  for (const name of defaults) await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  return NextResponse.json(await prisma.category.findMany({ orderBy: { createdAt: "asc" } }));
}
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name) return NextResponse.json({ error: "Category name is required" }, { status: 400 });
  try { return NextResponse.json(await prisma.category.create({ data: { name } }), { status: 201 }); }
  catch { return NextResponse.json({ error: "Category already exists" }, { status: 409 }); }
}
export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Category id is required" }, { status: 400 });
  const category = await prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  if (category._count.products > 0) return NextResponse.json({ error: "Category has products" }, { status: 409 });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
