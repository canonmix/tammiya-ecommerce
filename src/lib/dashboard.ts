import { prisma } from "@/lib/prisma";

// Every figure on the dashboard is read here, from the same tables the shop runs on. Revenue only
// ever counts PAID orders: a pending order is a hold on stock, not money, and cancelling one must
// not quietly reduce a number the shop already celebrated.

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86400_000);

// How far the sales chart looks back. Kept in the URL so a range survives a reload and can be
// sent to someone else.
export const RANGES = [
  { key: "14d", label: "14 วัน" },
  { key: "month", label: "เดือนนี้" },
  { key: "year", label: "รายเดือน (ปีนี้)" },
] as const;

export type RangeKey = (typeof RANGES)[number]["key"];
export const isRangeKey = (value: string | undefined): value is RangeKey => RANGES.some((range) => range.key === value);

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard(range: RangeKey = "14d") {
  const now = new Date();
  const today = startOfDay(now);
  const weekStart = addDays(today, -6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const chartStart = range === "year" ? yearStart : range === "month" ? monthStart : addDays(today, -13);

  const paid = { status: "PAID" as const };

  const [
    todaySales, weekSales, monthSales, lifetimeSales,
    pendingOrders, awaitingShipment, paidToday,
    customers, newCustomers,
    lowStock, outOfStock,
    liveCoupons, claims, redemptions,
    chartOrders, topItems, toShip, toPay,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { ...paid, paidAt: { gte: today } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { ...paid, paidAt: { gte: weekStart } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: { ...paid, paidAt: { gte: monthStart } }, _sum: { total: true }, _count: true }),
    prisma.order.aggregate({ where: paid, _sum: { total: true }, _count: true }),

    prisma.order.aggregate({ where: { status: "PENDING_PAYMENT" }, _sum: { total: true }, _count: true }),
    prisma.order.count({ where: { ...paid, shippingStatus: "PENDING" } }),
    prisma.order.count({ where: { createdAt: { gte: today } } }),

    prisma.customer.count(),
    prisma.customer.count({ where: { createdAt: { gte: weekStart } } }),

    prisma.product.count({ where: { status: "AVAILABLE", stock: { gt: 0, lte: 5 } } }),
    prisma.product.count({ where: { status: "AVAILABLE", stock: 0 } }),

    prisma.coupon.count({ where: { active: true } }),
    prisma.couponClaim.count(),
    prisma.couponRedemption.count(),

    prisma.order.findMany({ where: { ...paid, paidAt: { gte: chartStart } }, select: { total: true, paidAt: true } }),
    prisma.orderItem.groupBy({
      by: ["productId", "sku", "name"],
      where: { order: paid },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    // Two work queues instead of a feed of recent activity: these are the orders a person still
    // has to do something about. Oldest first — the one waiting longest is the most overdue.
    prisma.order.findMany({
      where: { ...paid, shippingStatus: "PENDING" },
      orderBy: { paidAt: "asc" },
      take: 6,
      select: {
        code: true, total: true, paidAt: true,
        customer: { select: { name: true } },
        items: { select: { quantity: true } },
        address: { select: { province: true } },
      },
    }),
    // Soonest to expire first: after the deadline the order is cancelled and stock goes back.
    prisma.order.findMany({
      where: { status: "PENDING_PAYMENT" },
      orderBy: { expiresAt: "asc" },
      take: 6,
      select: {
        code: true, total: true, createdAt: true, expiresAt: true,
        customer: { select: { name: true } },
        items: { select: { quantity: true } },
      },
    }),
  ]);

  // One bucket per day, or per month for the year view. Quiet buckets stay in the series so a gap
  // reads as "no sales that day" instead of vanishing and compressing the timeline.
  const bucketCount = range === "year"
    ? 12
    : range === "month"
      ? Math.round((addDays(today, 1).getTime() - monthStart.getTime()) / 86400_000)
      : 14;

  const series = Array.from({ length: bucketCount }, (_, offset) => {
    const start = range === "year" ? new Date(now.getFullYear(), offset, 1) : addDays(chartStart, offset);
    const end = range === "year" ? new Date(now.getFullYear(), offset + 1, 1) : addDays(start, 1);
    const orders = chartOrders.filter((order) => order.paidAt && order.paidAt >= start && order.paidAt < end);
    return {
      key: start.toISOString(),
      label: range === "year"
        ? start.toLocaleDateString("th-TH", { month: "short" })
        : start.toLocaleDateString("th-TH", { day: "numeric" }),
      total: orders.reduce((sum, order) => sum + order.total, 0),
      count: orders.length,
      future: start > now,
    };
  });

  // Product images for the best sellers, fetched once the top list is known.
  const images = await prisma.productImage.findMany({
    where: { productId: { in: topItems.map((item) => item.productId) } },
    orderBy: { sortOrder: "asc" },
    select: { productId: true, url: true },
  });
  const imageOf = new Map(images.map((image) => [image.productId, image.url]));

  return {
    sales: {
      today: todaySales._sum.total ?? 0,
      todayOrders: todaySales._count,
      week: weekSales._sum.total ?? 0,
      weekOrders: weekSales._count,
      month: monthSales._sum.total ?? 0,
      monthOrders: monthSales._count,
      lifetime: lifetimeSales._sum.total ?? 0,
      lifetimeOrders: lifetimeSales._count,
    },
    queue: {
      pendingCount: pendingOrders._count,
      pendingValue: pendingOrders._sum.total ?? 0,
      awaitingShipment,
      ordersToday: paidToday,
    },
    people: { customers, newCustomers },
    stock: { low: lowStock, out: outOfStock },
    coupons: { live: liveCoupons, claims, redemptions },
    range,
    series,
    // The window the series covers, for the caption above the chart.
    rangeTotal: series.reduce((sum, bucket) => sum + bucket.total, 0),
    rangeOrders: series.reduce((sum, bucket) => sum + bucket.count, 0),
    top: topItems.map((item) => ({
      sku: item.sku,
      name: item.name,
      sold: item._sum.quantity ?? 0,
      image: imageOf.get(item.productId) ?? null,
    })),
    toShip: toShip.map((order) => ({
      code: order.code,
      total: order.total,
      paidAt: order.paidAt,
      province: order.address?.province ?? "",
      customer: order.customer?.name ?? "—",
      pieces: order.items.reduce((sum, item) => sum + item.quantity, 0),
    })),
    toPay: toPay.map((order) => ({
      code: order.code,
      total: order.total,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt?.toISOString() ?? null,
      customer: order.customer?.name ?? "—",
      pieces: order.items.reduce((sum, item) => sum + item.quantity, 0),
    })),
  };
}
