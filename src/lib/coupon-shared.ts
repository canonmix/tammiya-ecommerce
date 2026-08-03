// Coupon shapes and the discount maths. No Prisma or node: imports, so the CMS form, the
// customer's coupon page and the server all price a coupon exactly the same way.

export const COUPON_TYPES = [
  { key: "PERCENT", label: "ลดเป็นเปอร์เซ็นต์", detail: "ลดตามสัดส่วนของยอดสินค้า" },
  { key: "FIXED", label: "ลดเป็นจำนวนเงิน", detail: "ลดเป็นบาทตามที่กำหนด" },
] as const;

export type CouponType = (typeof COUPON_TYPES)[number]["key"];

export type Coupon = {
  id: string;
  code: string;
  name: string;
  type: string;
  value: number;
  minSubtotal: number;
  maxDiscount: number;
  usageLimit: number;
  perCustomerLimit: number;
  usedCount: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
  claimLimit: number;
  claimedCount: number;
  claimStartsAt: string | null;
  claimEndsAt: string | null;
};

/** How many claims are still on offer, or null when the shop set no limit. */
export const claimsLeft = (coupon: Pick<Coupon, "claimLimit" | "claimedCount">) =>
  coupon.claimLimit > 0 ? Math.max(0, coupon.claimLimit - coupon.claimedCount) : null;

/** Whether the hand-out window is open right now. */
export function isClaimWindowOpen(coupon: Pick<Coupon, "claimStartsAt" | "claimEndsAt">, now = Date.now()) {
  if (coupon.claimStartsAt && new Date(coupon.claimStartsAt).getTime() > now) return false;
  if (coupon.claimEndsAt && new Date(coupon.claimEndsAt).getTime() < now) return false;
  return true;
}

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

export function isWithinSchedule(coupon: Pick<Coupon, "startsAt" | "endsAt">, now = Date.now()) {
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) return false;
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) return false;
  return true;
}

/** What a coupon takes off a subtotal, never more than the subtotal itself. */
export function couponDiscountFor(coupon: Pick<Coupon, "type" | "value" | "maxDiscount">, subtotal: number) {
  if (coupon.type === "FIXED") return Math.min(coupon.value, subtotal);
  const raw = Math.round((subtotal * coupon.value) / 100);
  const capped = coupon.maxDiscount > 0 ? Math.min(raw, coupon.maxDiscount) : raw;
  return Math.min(capped, subtotal);
}

export type CouponIssue = "not_found" | "inactive" | "not_started" | "expired" | "min_subtotal" | "usage_limit" | "already_used" | "not_claimed";

export const COUPON_MESSAGES: Record<CouponIssue, string> = {
  not_found: "ไม่พบคูปองนี้",
  inactive: "คูปองนี้ถูกปิดใช้งานแล้ว",
  not_started: "คูปองนี้ยังไม่ถึงวันเริ่มใช้",
  expired: "คูปองนี้หมดอายุแล้ว",
  min_subtotal: "ยอดสินค้ายังไม่ถึงขั้นต่ำของคูปองนี้",
  usage_limit: "คูปองนี้ถูกใช้ครบจำนวนแล้ว",
  already_used: "คุณใช้คูปองนี้ครบจำนวนที่กำหนดแล้ว",
  not_claimed: "คุณยังไม่ได้กดรับคูปองนี้",
};

// A short, human sentence describing the deal — shown on the coupon card and in the CMS list.
export function describeCoupon(coupon: Pick<Coupon, "type" | "value" | "minSubtotal" | "maxDiscount">) {
  const deal = coupon.type === "PERCENT"
    ? `ลด ${coupon.value}%${coupon.maxDiscount > 0 ? ` (สูงสุด ฿${coupon.maxDiscount.toLocaleString("th-TH")})` : ""}`
    : `ลด ฿${coupon.value.toLocaleString("th-TH")}`;
  return coupon.minSubtotal > 0 ? `${deal} เมื่อซื้อครบ ฿${coupon.minSubtotal.toLocaleString("th-TH")}` : deal;
}
