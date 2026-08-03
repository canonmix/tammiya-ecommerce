// Counts and key rows of the shop database, so test fixtures can be proven to have left no trace.
import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const save = argv.indexOf("--save") !== -1 ? argv[argv.indexOf("--save") + 1] : null;
const diff = argv.indexOf("--diff") !== -1 ? argv[argv.indexOf("--diff") + 1] : null;

const snapshot = {
  counts: {
    customers: await prisma.customer.count(),
    addresses: await prisma.address.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    coupons: await prisma.coupon.count(),
    couponClaims: await prisma.couponClaim.count(),
    couponRedemptions: await prisma.couponRedemption.count(),
    promotions: await prisma.promotion.count(),
    admins: await prisma.adminUser.count(),
    products: await prisma.product.count(),
    categories: await prisma.category.count(),
    productImages: await prisma.productImage.count(),
  },
  orders: (await prisma.order.findMany({ select: { code: true, status: true, total: true }, orderBy: { code: "asc" } })),
  coupons: (await prisma.coupon.findMany({ select: { code: true, claimLimit: true, claimedCount: true, usedCount: true }, orderBy: { code: "asc" } })),
  // Every SKU, so an import or a deletion shows up instead of hiding behind unchanged counts.
  stock: (await prisma.product.findMany({ select: { sku: true, stock: true }, orderBy: { sku: "asc" } })),
};
await prisma.$disconnect();

const line = (value: unknown) => JSON.stringify(value);

if (diff) {
  const before = JSON.parse(readFileSync(diff, "utf8")) as typeof snapshot;
  const changes: string[] = [];
  for (const [key, value] of Object.entries(snapshot.counts)) {
    const was = (before.counts as Record<string, number>)[key];
    if (was !== value) changes.push(`${key}: ${was} -> ${value}`);
  }
  for (const product of snapshot.stock) {
    const was = before.stock.find((row) => row.sku === product.sku);
    if (was && was.stock !== product.stock) changes.push(`stock ${product.sku}: ${was.stock} -> ${product.stock}`);
  }
  for (const coupon of snapshot.coupons) {
    const was = before.coupons.find((row) => row.code === coupon.code);
    if (was && line(was) !== line(coupon)) changes.push(`coupon ${coupon.code}: ${line(was)} -> ${line(coupon)}`);
  }
  const skusBefore = new Set(before.stock.map((row) => row.sku));
  const skusNow = new Set(snapshot.stock.map((row) => row.sku));
  const added = [...skusNow].filter((sku) => !skusBefore.has(sku));
  const gone = [...skusBefore].filter((sku) => !skusNow.has(sku));
  if (added.length) changes.push(`products added: ${added.join(", ")}`);
  if (gone.length) changes.push(`PRODUCTS GONE: ${gone.join(", ")}`);

  for (const order of before.orders) {
    const now = snapshot.orders.find((row) => row.code === order.code);
    if (!now) changes.push(`ORDER GONE: ${order.code}`);
    else if (now.status !== order.status) changes.push(`order ${order.code}: ${order.status} -> ${now.status}`);
  }
  console.log(changes.length === 0 ? "no changes since the snapshot" : "CHANGED:\n" + changes.map((change) => "  " + change).join("\n"));
  process.exit(changes.length === 0 ? 0 : 1);
}

if (save) {
  writeFileSync(save, JSON.stringify(snapshot, null, 2));
  console.log(`saved snapshot to ${save}`);
}
console.log(snapshot.counts);
console.log(snapshot.orders);
console.log(snapshot.coupons);
console.log(snapshot.stock);
