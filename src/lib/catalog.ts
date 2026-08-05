import { cache } from "react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { releaseExpiredOrders } from "@/lib/orders";
import { activePromotions } from "@/lib/promotions";
import { bestPercentFor, discountedPrice, type Promotion } from "@/lib/promotion-shared";

// Shape the storefront renders. It is deliberately flat so it can be passed from
// Server Components into Client Components without leaking Prisma types.
export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string;
  // `price` is what a shopper pays now; `listPrice` is the pre-promotion price.
  price: number;
  listPrice: number;
  discountPercent: number;
  stock: number;
  isNewArrival: boolean;
  description: string;
  color: string;
  images: string[];
  // The same photos with the alt text the CMS captured. `images` stays a plain URL list because
  // half the app (JSON-LD, OG cards, thumbnails) only ever wants the URLs.
  photos: Array<{ url: string; alt: string }>;
};

// The product-list sidebar needs both the label and how many products sit behind it.
export type CatalogCategory = { name: string; count: number };

const include = { category: true, images: { orderBy: { sortOrder: "asc" as const } } };
type ProductRow = Prisma.ProductGetPayload<{ include: typeof include }>;

const toCatalogProduct = (product: ProductRow, promotions: Promotion[] = []): CatalogProduct => {
  const percent = bestPercentFor(promotions, { productId: product.id, categoryId: product.categoryId });
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    category: product.category.name,
    price: discountedPrice(product.price, percent),
    listPrice: product.price,
    discountPercent: percent,
    stock: product.stock,
    isNewArrival: product.isNewArrival,
    description: product.description,
    color: product.color,
    images: product.images.map((image) => image.url),
    // An empty alt in the CMS would ship an unlabelled image, so the product name stands in —
    // it is what a screen reader and an image crawler both need to hear.
    photos: product.images.map((image, index) => ({
      url: image.url,
      alt: image.alt?.trim() || `${product.name} รหัส Tamiya ${product.sku}${index > 0 ? ` รูปที่ ${index + 1}` : ""}`,
    })),
  };
};

/**
 * Every catalog read below is memoised per request with React's `cache()`.
 *
 * A page is assembled from parts that do not know about each other — `generateMetadata`, the page
 * body, the footer — and each one asked the database the same question. A product page issued the
 * identical promotions query four times and the identical category query twice. `cache()` scopes
 * to one request and nothing more, so a second request always sees fresh prices and stock; this
 * removes repetition, not freshness.
 */

// Only AVAILABLE products reach the shop; anything the CMS marks ยกเลิกจำหน่าย disappears from it.
export const getCatalogProducts = cache(async (): Promise<CatalogProduct[]> => {
  // Storefront traffic is what drives the expiry sweep, so stock counts shown here are current.
  await releaseExpiredOrders();
  const [products, promotions] = await Promise.all([
    prisma.product.findMany({ where: { status: "AVAILABLE" }, include, orderBy: { createdAt: "desc" } }),
    activePromotions(),
  ]);
  return products.map((product) => toCatalogProduct(product, promotions));
});

// Keyed by slug, so two different products in one request still cost two queries — which is right.
export const getCatalogProduct = cache(async (slug: string): Promise<CatalogProduct | null> => {
  const [product, promotions] = await Promise.all([prisma.product.findUnique({ where: { slug }, include }), activePromotions()]);
  return product && product.status === "AVAILABLE" ? toCatalogProduct(product, promotions) : null;
});

// Categories with nothing to sell would render a filter chip that always comes back empty.
// The count is filtered the same way so the sidebar total matches what the grid actually shows.
export const getCatalogCategories = cache(async (): Promise<CatalogCategory[]> => {
  const categories = await prisma.category.findMany({
    where: { products: { some: { status: "AVAILABLE" } } },
    orderBy: { name: "asc" },
    select: { name: true, _count: { select: { products: { where: { status: "AVAILABLE" } } } } },
  });
  return categories.map((category) => ({ name: category.name, count: category._count.products }));
});

/**
 * Slug + last-changed date for every indexable product, for `sitemap.xml`.
 *
 * Deliberately not `getCatalogProducts()`: a sitemap needs no prices, images or promotions, and
 * the sweep-plus-promotion work that call does would run on every crawler hit.
 */
export async function getSitemapProducts(): Promise<Array<{ slug: string; updatedAt: Date }>> {
  return prisma.product.findMany({
    where: { status: "AVAILABLE" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

/**
 * Products to show under a product page: same category first, then anything else in stock.
 *
 * Falling back beyond the category matters for a shop this size — a category with one item
 * would otherwise end the page on an empty row.
 *
 * The database does the narrowing now. This used to select every available product with all of
 * its images and then keep four of them in JavaScript: invisible at thirty products, and a full
 * table scan plus a full image join on every product view at five hundred. The two queries are
 * bounded and only the second one runs when the category alone cannot fill the row.
 */
export async function getRelatedProducts(product: CatalogProduct, limit = 4): Promise<CatalogProduct[]> {
  // In-stock first within each group: an out-of-stock suggestion is a dead end. Postgres sorts
  // booleans false < true, so `desc` puts "has stock" on top.
  const orderBy = [{ stock: "desc" as const }, { createdAt: "desc" as const }];
  const [sameCategory, promotions] = await Promise.all([
    prisma.product.findMany({
      where: { status: "AVAILABLE", slug: { not: product.slug }, category: { name: product.category } },
      include,
      orderBy,
      take: limit,
    }),
    activePromotions(),
  ]);

  // Only pay for the fallback when the category could not fill the row.
  const shortfall = limit - sameCategory.length;
  const filler = shortfall <= 0 ? [] : await prisma.product.findMany({
    where: { status: "AVAILABLE", slug: { not: product.slug }, category: { name: { not: product.category } } },
    include,
    orderBy,
    take: shortfall,
  });

  return [...sameCategory, ...filler].map((row) => toCatalogProduct(row, promotions));
}

// Importers type spec sheets as one paragraph, separating the points with whichever of these
// marks was on their keyboard.
const BULLET = /[•★・]/;

/** Spec copy split into a lead sentence and its bullet points. */
export function describeProduct(description: string) {
  const text = description.trim();
  const parts = text.split(BULLET).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return { lead: text, bullets: [] as string[] };
  // Copy that opens with a marker is all bullets; otherwise the first part is the lead sentence.
  return BULLET.test(text.charAt(0)) ? { lead: "", bullets: parts } : { lead: parts[0], bullets: parts.slice(1) };
}

export const stockBadge = (stock: number) => stock <= 0 ? "สินค้าหมด" : stock <= 5 ? "เหลือไม่เยอะ" : "";
