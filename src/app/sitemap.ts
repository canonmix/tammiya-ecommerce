import type { MetadataRoute } from "next";
import { getCatalogCategories, getSitemapProducts } from "@/lib/catalog";
import { absoluteUrl } from "@/lib/site";

// Stock, prices and the catalog itself change from the CMS, so the sitemap is built per request
// rather than frozen at build time — a product added this morning is crawlable this afternoon.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A database that is unreachable must not take the whole sitemap down with it: search engines
  // treat a 500 on sitemap.xml as a reason to back off crawling the site altogether.
  const [products, categories] = await Promise.all([
    getSitemapProducts().catch(() => []),
    getCatalogCategories().catch(() => []),
  ]);

  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/products"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/coupons"), lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: absoluteUrl("/payment"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Category listings are real pages now — they render server-side with their own title, copy and
  // canonical — so they belong in the sitemap alongside the products themselves.
  const categoryPages: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${absoluteUrl("/products")}?category=${encodeURIComponent(category.name)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...categoryPages, ...productPages];
}
