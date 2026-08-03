import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-user";

// Flagging a new arrival is a one-click action in the product table, so it gets its own endpoint
// rather than going through the full product PATCH (which rebuilds the slug and images).
export async function POST(request: Request) {
  const { error } = await requireAdminApi("products");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const body = (await request.json().catch(() => null)) as { id?: string; value?: boolean } | null;
  if (!body?.id) return NextResponse.json({ error: "ไม่พบสินค้านี้" }, { status: 400 });

  const product = await prisma.product.update({
    where: { id: body.id },
    data: { isNewArrival: Boolean(body.value) },
    select: { id: true, isNewArrival: true },
  });
  return NextResponse.json(product);
}

// Clearing every flag at once: the point of the tag is that it turns over, and unticking twenty
// products one at a time is how a shop ends up with "new arrivals" from last year.
export async function DELETE() {
  const { error } = await requireAdminApi("products");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const cleared = await prisma.product.updateMany({ where: { isNewArrival: true }, data: { isNewArrival: false } });
  return NextResponse.json({ cleared: cleared.count });
}
