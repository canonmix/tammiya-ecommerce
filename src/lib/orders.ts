import { randomInt } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { CartLine } from "@/lib/cart";
import { MAX_QTY_PER_LINE, PAYMENT_WINDOW_MINUTES, type ResolvedCart, type ResolvedLine } from "@/lib/checkout-shared";
import { activePromotions } from "@/lib/promotions";
import { bestPercentFor, discountedPrice, freeShippingThreshold, shippingFor } from "@/lib/promotion-shared";
import { checkCoupon } from "@/lib/coupons";

/**
 * Re-prices a client-supplied cart against the database. Prices, stock and availability are
 * never taken from the browser — the client only ever says *which* product and *how many*.
 */
export async function resolveCart(input: CartLine[], options: { couponCode?: string; customerId?: string } = {}): Promise<ResolvedCart> {
  // Sweep first so a shopper is not told "หมด" for units an abandoned order is still holding.
  await releaseExpiredOrders();
  const promotions = await activePromotions();
  const wanted = new Map<string, number>();
  for (const line of input) {
    if (!line || typeof line.id !== "string") continue;
    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty <= 0) continue;
    wanted.set(line.id, Math.min((wanted.get(line.id) ?? 0) + qty, MAX_QTY_PER_LINE));
  }
  const threshold = freeShippingThreshold(promotions);
  if (wanted.size === 0) return { lines: [], subtotal: 0, discount: 0, coupon: null, couponError: null, shippingFee: 0, total: 0, freeShippingThreshold: threshold, notices: [] };

  const products = await prisma.product.findMany({
    where: { id: { in: [...wanted.keys()] }, status: "AVAILABLE" },
    include: { category: true, images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });

  const notices: string[] = [];
  for (const id of wanted.keys()) {
    if (!products.some((product) => product.id === id)) notices.push("มีสินค้าบางรายการถูกนำออกจากตะกร้าเพราะเลิกจำหน่ายแล้ว");
  }

  const lines: ResolvedLine[] = [];
  for (const product of products) {
    const requested = wanted.get(product.id) ?? 0;
    const quantity = Math.min(requested, product.stock);
    if (quantity <= 0) {
      notices.push(`${product.name} สินค้าหมด จึงถูกนำออกจากตะกร้า`);
      continue;
    }
    if (quantity < requested) notices.push(`${product.name} เหลือ ${product.stock} ชิ้น จึงปรับจำนวนให้แล้ว`);
    // Promotions are applied here, on the server, so the price charged is never the client's idea of it.
    const percent = bestPercentFor(promotions, { productId: product.id, categoryId: product.categoryId });
    const unitPrice = discountedPrice(product.price, percent);
    lines.push({
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      category: product.category.name,
      price: unitPrice,
      listPrice: product.price,
      discountPercent: percent,
      image: product.images[0]?.url ?? null,
      color: product.color,
      stock: product.stock,
      quantity,
      lineTotal: unitPrice * quantity,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const discount = lines.reduce((sum, line) => sum + (line.listPrice - line.price) * line.quantity, 0);

  // A coupon applies to the already-promoted subtotal, and only for a signed-in shopper —
  // the per-customer limit has no meaning otherwise.
  let coupon: ResolvedCart["coupon"] = null;
  let couponError: string | null = null;
  if (options.couponCode && options.customerId) {
    const checked = await checkCoupon(options.couponCode, options.customerId, subtotal);
    if (checked.ok) coupon = { code: checked.code, discount: checked.discount };
    else couponError = checked.reason;
  }

  const payable = Math.max(0, subtotal - (coupon?.discount ?? 0));
  // Free shipping is judged on what the shopper actually pays for goods.
  const shippingFee = shippingFor(payable, threshold);
  return { lines, subtotal, discount, coupon, couponError, shippingFee, total: payable + shippingFee, freeShippingThreshold: threshold, notices: [...new Set(notices)] };
}

// Short, unambiguous code for customers to quote when they message about an order.
const ALPHABET = "ACDEFGHJKLMNPQRTUVWXY3456789";
function orderCode() {
  let code = "";
  for (let index = 0; index < 6; index += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return `TM-${code}`;
}

export async function createOrder(customerId: string, addressId: string, cart: ResolvedCart) {
  // Stock is decremented at checkout so two shoppers cannot both buy the last piece. The hold
  // is temporary: expiresAt is when it goes back on sale if payment never arrives.
  const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_MINUTES * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    for (const line of cart.lines) {
      const updated = await tx.product.updateMany({ where: { id: line.id, stock: { gte: line.quantity } }, data: { stock: { decrement: line.quantity } } });
      if (updated.count === 0) throw new Error(`OUT_OF_STOCK:${line.name}`);
    }
    const created = await tx.order.create({
      data: {
        code: orderCode(),
        customerId,
        addressId,
        subtotal: cart.subtotal,
        discount: cart.discount,
        couponCode: cart.coupon?.code ?? null,
        couponDiscount: cart.coupon?.discount ?? 0,
        shippingFee: cart.shippingFee,
        total: cart.total,
        expiresAt,
        items: { create: cart.lines.map((line) => ({ productId: line.id, sku: line.sku, name: line.name, price: line.price, quantity: line.quantity })) },
      },
      include: { items: true, address: true },
    });

    if (cart.coupon) {
      const coupon = await tx.coupon.findUnique({ where: { code: cart.coupon.code } });
      if (coupon) {
        await tx.couponRedemption.create({ data: { couponId: coupon.id, customerId, orderId: created.id, amount: cart.coupon.discount } });
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }
    }
    return created;
  });
}

/**
 * Cancels one pending order and puts its reserved units back on sale.
 *
 * The status guard lives inside updateMany rather than in a prior read, so two concurrent
 * callers (the shopper's poll and someone else's catalog read) cannot both restore the stock.
 */
export async function cancelOrder(orderId: string) {
  return prisma.$transaction(async (tx) => {
    const claimed = await tx.order.updateMany({
      where: { id: orderId, status: "PENDING_PAYMENT" },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    if (claimed.count === 0) return null;
    const items = await tx.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    }
    // Give the coupon back too — an abandoned order should not burn the shopper's one use.
    const redemption = await tx.couponRedemption.findUnique({ where: { orderId } });
    if (redemption) {
      await tx.couponRedemption.delete({ where: { orderId } });
      await tx.coupon.update({ where: { id: redemption.couponId }, data: { usedCount: { decrement: 1 } } });
    }
    return orderId;
  });
}

// Repeating the sweep on every request would be wasteful; once every few seconds is plenty
// because nothing depends on sub-second precision of the release.
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 5000;

export type PendingOrder = { code: string; total: number; itemCount: number; expiresAt: string | null };

/**
 * Orders this customer still has to pay for, newest first.
 *
 * Only ones inside their payment window are returned: an order past its deadline is about to be
 * swept back into stock, so telling someone to go and pay for it would be a lie.
 */
export async function pendingPaymentOrders(customerId: string): Promise<PendingOrder[]> {
  const orders = await prisma.order.findMany({
    where: { customerId, status: "PENDING_PAYMENT", OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
    select: { code: true, total: true, expiresAt: true, items: { select: { quantity: true } } },
  });
  return orders.map((order) => ({
    code: order.code,
    total: order.total,
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    expiresAt: order.expiresAt?.toISOString() ?? null,
  }));
}

/**
 * Releases stock held by orders whose payment window has passed.
 *
 * There is no job runner in this app, so the sweep is driven by traffic: catalog reads, cart
 * pricing and the payment poll all call it. That keeps the stock a shopper sees honest without
 * adding infrastructure. `force` skips the throttle for callers that must see a fresh result.
 */
export async function releaseExpiredOrders({ force = false, maxPerRun = 1000 } = {}) {
  if (!force && Date.now() - lastSweep < SWEEP_INTERVAL_MS) return 0;
  lastSweep = Date.now();

  let released = 0;
  // Batched so a long backlog (e.g. the first run after downtime) still drains in one pass
  // without loading every expired order into memory at once. The batch counter is a hard
  // stop: cancelOrder returning null (another worker got there first) would otherwise let a
  // batch make no progress and repeat forever.
  for (let batch = 0; batch * 100 < maxPerRun; batch += 1) {
    const expired = await prisma.order.findMany({
      where: { status: "PENDING_PAYMENT", expiresAt: { lt: new Date() } },
      select: { id: true },
      take: 100,
    });
    if (expired.length === 0) break;
    for (const order of expired) {
      if (await cancelOrder(order.id)) released += 1;
    }
  }
  return released;
}

export const isExpired = (order: { status: string; expiresAt: Date | null }) =>
  order.status === "PENDING_PAYMENT" && Boolean(order.expiresAt) && order.expiresAt!.getTime() <= Date.now();
