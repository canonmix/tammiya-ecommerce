// Promotion shapes and the rules for applying them. No Prisma or node: imports, so the CMS form
// and the storefront can share exactly the same logic the server prices with.

export const PROMOTION_TYPES = [
  { key: "FREE_SHIPPING", label: "ซื้อครบแล้วส่งฟรี", detail: "ยกเว้นค่าจัดส่งเมื่อยอดสินค้าถึงที่กำหนด" },
  { key: "PERCENT_DISCOUNT", label: "ส่วนลดสินค้า %", detail: "ลดราคาสินค้าตามเปอร์เซ็นต์ที่กำหนด" },
] as const;

export const PROMOTION_SCOPES = [
  { key: "ALL", label: "สินค้าทุกชิ้น" },
  { key: "CATEGORY", label: "เฉพาะหมวดหมู่" },
  { key: "PRODUCT", label: "เฉพาะสินค้าชิ้นเดียว" },
] as const;

export type PromotionType = (typeof PROMOTION_TYPES)[number]["key"];
export type PromotionScope = (typeof PROMOTION_SCOPES)[number]["key"];

export type Promotion = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  minSubtotal: number;
  percent: number;
  scope: string;
  categoryIds: string[];
  productId: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export const SHIPPING_FEE = 60;

/** A promotion counts only while it is switched on and inside its scheduled window. */
export function isRunning(promotion: Pick<Promotion, "active" | "startsAt" | "endsAt">, now = Date.now()) {
  if (!promotion.active) return false;
  if (promotion.startsAt && new Date(promotion.startsAt).getTime() > now) return false;
  if (promotion.endsAt && new Date(promotion.endsAt).getTime() < now) return false;
  return true;
}

export type DiscountTarget = { productId: string; categoryId: string };

/**
 * Best percentage off a product.
 *
 * Overlapping promotions do not stack — the shopper simply gets the largest one. Stacking
 * would make a 50% and a 60% promotion silently become 80% off, which is never what was meant.
 */
export function bestPercentFor(promotions: Promotion[], target: DiscountTarget, now = Date.now()) {
  let best = 0;
  for (const promotion of promotions) {
    if (promotion.type !== "PERCENT_DISCOUNT" || !isRunning(promotion, now)) continue;
    const matches =
      promotion.scope === "ALL" ||
      (promotion.scope === "CATEGORY" && promotion.categoryIds.includes(target.categoryId)) ||
      (promotion.scope === "PRODUCT" && promotion.productId === target.productId);
    if (matches) best = Math.max(best, promotion.percent);
  }
  return Math.min(Math.max(best, 0), 100);
}

// Discounted unit price, rounded to whole baht so displayed and charged prices always agree.
export const discountedPrice = (price: number, percent: number) => (percent <= 0 ? price : Math.round(price * (100 - percent) / 100));

/** Lowest subtotal that earns free shipping, or null when no such promotion is running. */
export function freeShippingThreshold(promotions: Promotion[], now = Date.now()) {
  const thresholds = promotions
    .filter((promotion) => promotion.type === "FREE_SHIPPING" && isRunning(promotion, now))
    .map((promotion) => promotion.minSubtotal);
  return thresholds.length ? Math.min(...thresholds) : null;
}

export function shippingFor(subtotalAfterDiscount: number, threshold: number | null) {
  if (subtotalAfterDiscount === 0) return 0;
  if (threshold !== null && subtotalAfterDiscount >= threshold) return 0;
  return SHIPPING_FEE;
}
