import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { freeShippingThreshold, type Promotion } from "@/lib/promotion-shared";

const toShared = (row: {
  id: string; name: string; type: string; active: boolean; minSubtotal: number; percent: number;
  scope: string; categoryIds: string[]; productId: string | null; startsAt: Date | null; endsAt: Date | null;
}): Promotion => ({
  ...row,
  startsAt: row.startsAt?.toISOString() ?? null,
  endsAt: row.endsAt?.toISOString() ?? null,
});

/** Every promotion, for the CMS list. */
export async function listPromotions(): Promise<Promotion[]> {
  const rows = await prisma.promotion.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toShared);
}

/**
 * Only the switched-on promotions, for pricing.
 *
 * The schedule window is still checked per use rather than filtered here, so a promotion that
 * starts or ends between a page render and a checkout is judged at the moment it matters.
 *
 * Memoised per request. This is the most-repeated query in the shop: pricing any product needs
 * it, so a product page asked for the identical row set four times in one render — once from
 * `generateMetadata`, once from the page, once from the related-products list and once from the
 * free-shipping banner. `cache()` scopes to a single request, so nothing can go stale: the next
 * request reads the table again.
 */
export const activePromotions = cache(async (): Promise<Promotion[]> => {
  const rows = await prisma.promotion.findMany({ where: { active: true } });
  return rows.map(toShared);
});

/** Threshold the storefront banner advertises, or null when no free-shipping promotion runs. */
export async function getFreeShippingThreshold(): Promise<number | null> {
  return freeShippingThreshold(await activePromotions());
}
