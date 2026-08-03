import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireAdminApi } from "@/lib/admin-user";
import { releaseExpiredOrders } from "@/lib/orders";

const PAGE_SIZE = 20;

/**
 * Order list for the CMS, filtered by status and a single free-text query.
 *
 * The expiry sweep runs first so an order whose hold lapsed is already shown as CANCELLED
 * rather than as a pending payment the shop might wait for.
 */
export async function GET(request: Request) {
  const { error } = await requireAdminApi("orders");
  if (error) return NextResponse.json(error.body, { status: error.status });

  await releaseExpiredOrders();

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "";
  const shipping = url.searchParams.get("shipping") ?? "";
  const query = (url.searchParams.get("q") ?? "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (["PENDING_PAYMENT", "PAID", "CANCELLED"].includes(status)) where.status = status;
  if (["PENDING", "SHIPPED", "DELIVERED"].includes(shipping)) where.shippingStatus = shipping;
  if (query) {
    where.OR = [
      { code: { contains: query, mode: "insensitive" } },
      { customer: { name: { contains: query, mode: "insensitive" } } },
      { customer: { phone: { contains: query } } },
      { address: { recipient: { contains: query, mode: "insensitive" } } },
      { address: { phone: { contains: query } } },
    ];
  }

  const [total, orders, counts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        customer: { select: { name: true, phone: true } },
        address: true,
        // The picture comes from the product rather than the order line: when someone is packing
        // a box they want to see what the item looks like now, not at the time of ordering.
        items: {
          orderBy: { name: "asc" },
          include: { product: { select: { color: true, images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } } } } },
        },
      },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  return NextResponse.json({
    orders,
    total,
    page,
    pageSize: PAGE_SIZE,
    counts: Object.fromEntries(counts.map((row) => [row.status, row._count._all])),
  }, { headers: { "Cache-Control": "no-store" } });
}
