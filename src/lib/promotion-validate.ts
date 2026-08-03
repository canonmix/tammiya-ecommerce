// Input validation for the promotions API, kept out of the route file so both the collection
// and the single-item route can use it without importing from one another.
export type PromotionInput = {
  name?: string; type?: string; active?: boolean; minSubtotal?: number; percent?: number;
  scope?: string; categoryIds?: string[]; productId?: string | null; startsAt?: string | null; endsAt?: string | null;
};

const asDate = (value: string | null | undefined) => (value ? new Date(value) : null);

/** Shared validation, so a promotion cannot be saved in a shape the pricing code cannot read. */
export function validate(input: PromotionInput) {
  const name = input.name?.trim() ?? "";
  const type = input.type ?? "";
  if (name.length < 2) return { error: "กรุณาตั้งชื่อโปรโมชั่น" };
  if (type !== "FREE_SHIPPING" && type !== "PERCENT_DISCOUNT") return { error: "ประเภทโปรโมชั่นไม่ถูกต้อง" };

  const startsAt = asDate(input.startsAt);
  const endsAt = asDate(input.endsAt);
  if (startsAt && endsAt && startsAt > endsAt) return { error: "วันเริ่มต้องมาก่อนวันสิ้นสุด" };

  if (type === "FREE_SHIPPING") {
    const minSubtotal = Math.round(Number(input.minSubtotal));
    if (!Number.isFinite(minSubtotal) || minSubtotal < 0) return { error: "ยอดขั้นต่ำต้องเป็นตัวเลขไม่ติดลบ" };
    return { data: { name, type, active: input.active ?? true, minSubtotal, percent: 0, scope: "ALL", categoryIds: [], productId: null, startsAt, endsAt } };
  }

  const percent = Math.round(Number(input.percent));
  if (!Number.isFinite(percent) || percent < 1 || percent > 100) return { error: "ส่วนลดต้องอยู่ระหว่าง 1–100%" };
  const scope = input.scope ?? "ALL";
  if (!["ALL", "CATEGORY", "PRODUCT"].includes(scope)) return { error: "ขอบเขตโปรโมชั่นไม่ถูกต้อง" };
  const categoryIds = [...new Set((input.categoryIds ?? []).filter((id) => typeof id === "string" && id))];
  if (scope === "CATEGORY" && categoryIds.length === 0) return { error: "กรุณาเลือกหมวดหมู่อย่างน้อย 1 หมวด" };
  if (scope === "PRODUCT" && !input.productId) return { error: "กรุณาเลือกสินค้า" };

  return {
    data: {
      name, type, active: input.active ?? true, minSubtotal: 0, percent, scope,
      categoryIds: scope === "CATEGORY" ? categoryIds : [],
      productId: scope === "PRODUCT" ? input.productId! : null,
      startsAt, endsAt,
    },
  };
}
