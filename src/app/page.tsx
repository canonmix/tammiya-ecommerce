import Storefront from "@/components/storefront";
import { getCatalogCategories, getCatalogProducts } from "@/lib/catalog";

// The shop reads PostgreSQL on every request so anything saved in the CMS shows up immediately.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, categories] = await Promise.all([getCatalogProducts(), getCatalogCategories()]);
  return <Storefront products={products} categories={categories} />;
}
