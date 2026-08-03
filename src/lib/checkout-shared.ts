// Shapes and numbers the checkout UI needs. Kept free of Prisma and node: imports so
// client components can use them without pulling the server modules into the browser bundle.
export { SHIPPING_FEE, shippingFor } from "@/lib/promotion-shared";

export const MAX_QTY_PER_LINE = 99;

// Checkout reserves stock immediately, so an unpaid order cannot hold it forever.
export const PAYMENT_WINDOW_MINUTES = 60;

export type ResolvedLine = {
  id: string; sku: string; name: string; slug: string; category: string;
  // `price` is what is charged per unit; `listPrice` is the pre-promotion price, shown struck through.
  price: number; listPrice: number; discountPercent: number;
  image: string | null; color: string; stock: number; quantity: number; lineTotal: number;
};

export type AppliedCoupon = { code: string; discount: number };

export type ResolvedCart = {
  lines: ResolvedLine[];
  // `subtotal` is already net of promotions; `discount` is what they saved, for display.
  subtotal: number;
  discount: number;
  coupon: AppliedCoupon | null;
  couponError: string | null;
  shippingFee: number;
  total: number;
  freeShippingThreshold: number | null;
  notices: string[];
};
