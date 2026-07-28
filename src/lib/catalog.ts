import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Shape the storefront renders. It is deliberately flat so it can be passed from
// Server Components into Client Components without leaking Prisma types.
export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  stock: number;
  description: string;
  color: string;
  images: string[];
};

const include = { category: true, images: { orderBy: { sortOrder: "asc" as const } } };
type ProductRow = Prisma.ProductGetPayload<{ include: typeof include }>;

const toCatalogProduct = (product: ProductRow): CatalogProduct => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  slug: product.slug,
  category: product.category.name,
  price: product.price,
  stock: product.stock,
  description: product.description,
  color: product.color,
  images: product.images.map((image) => image.url),
});

// Only AVAILABLE products reach the shop; anything the CMS marks ยกเลิกจำหน่าย disappears from it.
export async function getCatalogProducts(): Promise<CatalogProduct[]> {
  const products = await prisma.product.findMany({ where: { status: "AVAILABLE" }, include, orderBy: { createdAt: "desc" } });
  return products.map(toCatalogProduct);
}

export async function getCatalogProduct(slug: string): Promise<CatalogProduct | null> {
  const product = await prisma.product.findUnique({ where: { slug }, include });
  return product && product.status === "AVAILABLE" ? toCatalogProduct(product) : null;
}

// Categories with nothing to sell would render a filter chip that always comes back empty.
export async function getCatalogCategories(): Promise<string[]> {
  const categories = await prisma.category.findMany({ where: { products: { some: { status: "AVAILABLE" } } }, orderBy: { name: "asc" }, select: { name: true } });
  return categories.map((category) => category.name);
}

export const stockBadge = (stock: number) => stock <= 0 ? "สินค้าหมด" : stock <= 5 ? "เหลือไม่เยอะ" : "";
