import { COUPON_TYPES, normalizeCode } from "@/lib/coupon-shared";

export type CouponInput = {
  code?: string; name?: string; type?: string; value?: number; minSubtotal?: number; maxDiscount?: number;
  usageLimit?: number; perCustomerLimit?: number; active?: boolean; startsAt?: string | null; endsAt?: string | null;
  claimLimit?: number; claimStartsAt?: string | null; claimEndsAt?: string | null;
};

const asDate = (value: string | null | undefined) => (value ? new Date(value) : null);
const asCount = (value: unknown) => { const n = Math.round(Number(value ?? 0)); return Number.isFinite(n) && n >= 0 ? n : null; };

/** One place both coupon routes validate through, so a saved coupon always prices correctly. */
export function validateCoupon(input: CouponInput) {
  const code = normalizeCode(input.code ?? "");
  const name = input.name?.trim() ?? "";
  const type = input.type ?? "";

  if (!/^[A-Z0-9._-]{3,24}$/.test(code)) return { error: "โค้ดต้องเป็น A-Z, 0-9, . _ - ยาว 3–24 ตัว" };
  if (name.length < 2) return { error: "กรุณาตั้งชื่อคูปอง" };
  if (!COUPON_TYPES.some((option) => option.key === type)) return { error: "ประเภทคูปองไม่ถูกต้อง" };

  const value = Math.round(Number(input.value));
  if (!Number.isFinite(value) || value < 1) return { error: "กรุณากรอกส่วนลดให้ถูกต้อง" };
  if (type === "PERCENT" && value > 100) return { error: "ส่วนลดต้องไม่เกิน 100%" };

  const minSubtotal = asCount(input.minSubtotal);
  const maxDiscount = asCount(input.maxDiscount);
  const usageLimit = asCount(input.usageLimit);
  const perCustomerLimit = asCount(input.perCustomerLimit);
  if (minSubtotal === null || maxDiscount === null || usageLimit === null || perCustomerLimit === null) {
    return { error: "ตัวเลขต้องไม่ติดลบ" };
  }

  const startsAt = asDate(input.startsAt);
  const endsAt = asDate(input.endsAt);
  if (startsAt && endsAt && startsAt > endsAt) return { error: "วันเริ่มใช้ต้องมาก่อนวันหมดอายุ" };

  const claimLimit = asCount(input.claimLimit);
  if (claimLimit === null) return { error: "จำนวนคูปองที่แจกต้องไม่ติดลบ" };
  const claimStartsAt = asDate(input.claimStartsAt);
  const claimEndsAt = asDate(input.claimEndsAt);
  if (claimStartsAt && claimEndsAt && claimStartsAt > claimEndsAt) return { error: "วันเริ่มแจกต้องมาก่อนวันหยุดแจก" };
  // Handing out a coupon that is already dead would just annoy people.
  if (endsAt && claimStartsAt && claimStartsAt > endsAt) return { error: "วันเริ่มแจกต้องไม่เลยวันหมดอายุของคูปอง" };

  return {
    data: {
      code, name, type, value,
      minSubtotal,
      // A cap only means anything for a percentage coupon.
      maxDiscount: type === "PERCENT" ? maxDiscount : 0,
      usageLimit, perCustomerLimit,
      active: input.active ?? true,
      startsAt, endsAt,
      claimLimit, claimStartsAt, claimEndsAt,
    },
  };
}
