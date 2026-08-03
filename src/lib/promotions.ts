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
 */
export async function activePromotions(): Promise<Promotion[]> {
  const rows = await prisma.promotion.findMany({ where: { active: true } });
  return rows.map(toShared);
}

/** Threshold the storefront banner advertises, or null when no free-shipping promotion runs. */
export async function getFreeShippingThreshold(): Promise<number | null> {
  return freeShippingThreshold(await activePromotions());
}
