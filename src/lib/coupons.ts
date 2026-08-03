import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  COUPON_MESSAGES, claimsLeft, couponDiscountFor, isClaimWindowOpen, isWithinSchedule, normalizeCode,
  type Coupon, type CouponIssue,
} from "@/lib/coupon-shared";

const toShared = (row: {
  id: string; code: string; name: string; type: string; value: number; minSubtotal: number; maxDiscount: number;
  usageLimit: number; perCustomerLimit: number; usedCount: number; active: boolean;
  startsAt: Date | null; endsAt: Date | null;
  claimLimit: number; claimedCount: number; claimStartsAt: Date | null; claimEndsAt: Date | null;
}): Coupon => ({
  ...row,
  startsAt: row.startsAt?.toISOString() ?? null,
  endsAt: row.endsAt?.toISOString() ?? null,
  claimStartsAt: row.claimStartsAt?.toISOString() ?? null,
  claimEndsAt: row.claimEndsAt?.toISOString() ?? null,
});

export type CouponCheck =
  | { ok: true; couponId: string; code: string; discount: number }
  | { ok: false; issue: CouponIssue; reason: string };

/**
 * Decides whether a customer may spend a coupon against a subtotal, and for how much.
 *
 * Claiming is a precondition: a code alone is no longer enough, so a leaked code cannot be
 * used by someone who never took it. Every limit is re-checked here because this runs again
 * at order time — the last use could be taken while a shopper fills in their address.
 */
export async function checkCoupon(rawCode: string, customerId: string, subtotal: number): Promise<CouponCheck> {
  const code = normalizeCode(rawCode);
  const fail = (issue: CouponIssue): CouponCheck => ({ ok: false, issue, reason: COUPON_MESSAGES[issue] });
  if (!code) return fail("not_found");

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) return fail("not_found");
  if (!coupon.active) return fail("inactive");

  const now = Date.now();
  if (coupon.startsAt && coupon.startsAt.getTime() > now) return fail("not_started");
  if (coupon.endsAt && coupon.endsAt.getTime() < now) return fail("expired");

  if (!(await prisma.couponClaim.findUnique({ where: { couponId_customerId: { couponId: coupon.id, customerId } } }))) {
    return fail("not_claimed");
  }

  if (subtotal < coupon.minSubtotal) return fail("min_subtotal");
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return fail("usage_limit");

  if (coupon.perCustomerLimit > 0) {
    const mine = await prisma.couponRedemption.count({ where: { couponId: coupon.id, customerId } });
    if (mine >= coupon.perCustomerLimit) return fail("already_used");
  }

  return { ok: true, couponId: coupon.id, code: coupon.code, discount: couponDiscountFor(coupon, subtotal) };
}

export type ClaimResult = { ok: true } | { ok: false; reason: string };

/**
 * Takes one coupon for a customer.
 *
 * The count is bumped with a conditional updateMany rather than a read-then-write, so two
 * shoppers racing for the last coupon cannot both get it.
 */
export async function claimCoupon(couponId: string, customerId: string): Promise<ClaimResult> {
  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon || !coupon.active) return { ok: false, reason: "ไม่พบคูปองนี้" };

  const now = Date.now();
  if (coupon.claimStartsAt && coupon.claimStartsAt.getTime() > now) return { ok: false, reason: "ยังไม่ถึงเวลาแจกคูปองนี้" };
  if (coupon.claimEndsAt && coupon.claimEndsAt.getTime() < now) return { ok: false, reason: "หมดเวลาแจกคูปองนี้แล้ว" };
  if (coupon.endsAt && coupon.endsAt.getTime() < now) return { ok: false, reason: "คูปองนี้หมดอายุแล้ว" };
  if (await prisma.couponClaim.findUnique({ where: { couponId_customerId: { couponId, customerId } } })) {
    return { ok: false, reason: "คุณกดรับคูปองนี้ไปแล้ว" };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      if (coupon.claimLimit > 0) {
        const taken = await tx.coupon.updateMany({
          where: { id: couponId, claimedCount: { lt: coupon.claimLimit } },
          data: { claimedCount: { increment: 1 } },
        });
        if (taken.count === 0) return { ok: false as const, reason: "คูปองนี้ถูกกดรับครบจำนวนแล้ว" };
      } else {
        await tx.coupon.update({ where: { id: couponId }, data: { claimedCount: { increment: 1 } } });
      }
      await tx.couponClaim.create({ data: { couponId, customerId } });
      return { ok: true as const };
    });
  } catch (error) {
    // The unique index is the real guard against a double-tap creating two claims.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, reason: "คุณกดรับคูปองนี้ไปแล้ว" };
    }
    throw error;
  }
}

export type PublicCoupon = Coupon & { claimed: boolean; claimsLeft: number | null };

/**
 * The coupons being handed out right now, for the home page and the giveaway page.
 *
 * Guests see the same list — the point is to advertise the giveaway — and only the `claimed`
 * flag depends on who is looking. Sold-out and closed windows are filtered out here so the
 * board never shows a button that cannot work.
 */
export async function claimableCoupons(customerId?: string): Promise<PublicCoupon[]> {
  const now = new Date();
  const rows = await prisma.coupon.findMany({
    where: {
      active: true,
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      AND: [
        { OR: [{ claimStartsAt: null }, { claimStartsAt: { lte: now } }] },
        { OR: [{ claimEndsAt: null }, { claimEndsAt: { gt: now } }] },
      ],
    },
    // Windows that close soonest go first: those are the ones worth acting on.
    orderBy: [{ claimEndsAt: "asc" }, { createdAt: "desc" }],
  });
  const mine = customerId
    ? new Set((await prisma.couponClaim.findMany({ where: { customerId }, select: { couponId: true } })).map((claim) => claim.couponId))
    : new Set<string>();

  // Nothing is filtered out here: a coupon whose quota has run out is still worth showing as
  // "เก็บครบแล้ว" while the hand-out window is open, and one already taken shows as claimed.
  return rows.map((row) => {
    const coupon = toShared(row);
    return { ...coupon, claimed: mine.has(row.id), claimsLeft: claimsLeft(coupon) };
  });
}

export type CustomerCoupon = Coupon & {
  claimed: boolean;
  usedByMe: number;
  usable: boolean;
  expired: boolean;
  notStarted: boolean;
  claimOpen: boolean;
  claimNotStarted: boolean;
  claimsLeft: number | null;
  soldOut: boolean;
};

/** Everything the coupon page needs: what is on offer, and what the shopper already holds. */
export async function couponsForCustomer(customerId: string): Promise<CustomerCoupon[]> {
  const now = Date.now();
  const [coupons, claims, redemptions] = await Promise.all([
    prisma.coupon.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } }),
    prisma.couponClaim.findMany({ where: { customerId }, select: { couponId: true } }),
    prisma.couponRedemption.groupBy({ by: ["couponId"], where: { customerId }, _count: { _all: true } }),
  ]);
  const claimed = new Set(claims.map((claim) => claim.couponId));
  const usedByMe = new Map(redemptions.map((row) => [row.couponId, row._count._all]));

  return coupons.map((row) => {
    const coupon = toShared(row);
    const used = usedByMe.get(row.id) ?? 0;
    const left = claimsLeft(coupon);
    const exhausted = coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit;
    const mineExhausted = coupon.perCustomerLimit > 0 && used >= coupon.perCustomerLimit;
    return {
      ...coupon,
      claimed: claimed.has(row.id),
      usedByMe: used,
      // "Usable" means held, in date, and not used up — only the cart total may still block it.
      usable: claimed.has(row.id) && isWithinSchedule(coupon, now) && !exhausted && !mineExhausted,
      expired: Boolean(row.endsAt && row.endsAt.getTime() < now),
      notStarted: Boolean(row.startsAt && row.startsAt.getTime() > now),
      claimOpen: isClaimWindowOpen(coupon, now),
      // Computed here, not in the component: `Date.now()` during render is impure.
      claimNotStarted: Boolean(row.claimStartsAt && row.claimStartsAt.getTime() > now),
      claimsLeft: left,
      soldOut: left === 0,
    };
  });
}
