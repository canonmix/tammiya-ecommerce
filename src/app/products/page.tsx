import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ProductCatalog from "@/components/product-catalog";
import { getCatalogCategories, getCatalogProducts } from "@/lib/catalog";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getFreeShippingThreshold } from "@/lib/promotions";
import { pendingPaymentOrders } from "@/lib/orders";
import { absoluteUrl, breadcrumbSchema, jsonLdGraph, organizationId, siteName } from "@/lib/site";

// Price and stock come straight from PostgreSQL, so the listing is rendered per request.
export const dynamic = "force-dynamic";

type Search = { category?: string; q?: string };
type Props = { searchParams: Promise<Search> };

/** The category is echoed into titles and JSON-LD, so it is only trusted once it matches a real one. */
async function resolveCategory(raw: string | undefined) {
  if (!raw) return null;
  const categories = await getCatalogCategories();
  return categories.find((category) => category.name === raw) ?? null;
}

/**
 * A category listing is its own indexable page: its own title, description and canonical.
 *
 * Without this every `?category=` URL inherited the same "สินค้าทั้งหมด" title, so Google saw a
 * dozen duplicates of one page and picked whichever it liked. Search results (`?q=`) go the other
 * way — they are infinite, thin, and must never enter the index.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { category: raw, q } = await searchParams;
  const category = await resolveCategory(raw);

  if (q) {
    return { title: `ค้นหา “${q}”`, robots: { index: false, follow: true }, alternates: { canonical: "/products" } };
  }
  if (category) {
    const title = `${category.name} Tamiya Mini 4WD`;
    return {
      title,
      description: `${category.name} สำหรับ Tamiya Mini 4WD ของแท้ ${category.count} รายการ พร้อมส่งจากคลังในไทย เช็กราคาและสต็อกล่าสุดที่ ${siteName}`,
      keywords: [category.name, `${category.name} Tamiya`, `${category.name} Mini 4WD`, "Tamiya ของแท้"],
      alternates: { canonical: `/products?category=${encodeURIComponent(category.name)}` },
      openGraph: { title, description: `${category.name} ของแท้ ${category.count} รายการ พร้อมส่งจากคลังในไทย`, url: `/products?category=${encodeURIComponent(category.name)}`, type: "website" },
    };
  }
  return {
    title: "สินค้าทั้งหมด Tamiya Mini 4WD",
    description: "เลือกซื้อรถ Mini 4WD อะไหล่ มอเตอร์ โรลเลอร์ และของแต่ง Tamiya ของแท้ แยกตามหมวดหมู่ ค้นหาด้วยรหัส Tamiya ได้ทันที พร้อมส่งจากคลังในไทย",
    alternates: { canonical: "/products" },
    openGraph: { title: "สินค้าทั้งหมด Tamiya Mini 4WD", description: "รถ Mini 4WD อะไหล่ มอเตอร์ และของแต่ง Tamiya ของแท้ พร้อมส่งจากคลังในไทย", url: "/products", type: "website" },
  };
}

export default async function ProductsPage({ searchParams }: Props) {
  const [{ category: rawCategory, q }, products, categories, customer, freeShipping] = await Promise.all([searchParams, getCatalogProducts(), getCatalogCategories(), getCurrentCustomer(), getFreeShippingThreshold()]);
  const pending = customer ? await pendingPaymentOrders(customer.id) : [];
  // A category that no longer has stock would leave the sidebar with nothing highlighted.
  const activeCategory = categories.some((item) => item.name === rawCategory) ? rawCategory! : null;

  // What the crawler sees has to match what the visitor sees, so the category filter is applied
  // here on the server rather than only in the client component's state.
  const listed = activeCategory ? products.filter((product) => product.category === activeCategory) : products;

  const heading = activeCategory ?? "สินค้าทั้งหมด";
  const trail: Array<[string, string]> = [["หน้าแรก", "/"], ["สินค้าทั้งหมด", "/products"]];
  if (activeCategory) trail.push([activeCategory, `/products?category=${encodeURIComponent(activeCategory)}`]);

  const jsonLd = jsonLdGraph(
    breadcrumbSchema(trail),
    {
      "@type": "CollectionPage",
      "@id": absoluteUrl(activeCategory ? `/products?category=${encodeURIComponent(activeCategory)}` : "/products"),
      name: `${heading} — ${siteName}`,
      isPartOf: { "@id": organizationId },
      inLanguage: "th-TH",
      // Names and links only: a full Product node per row would repeat on every category page and
      // compete with the canonical product page for the same offer.
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: listed.length,
        itemListElement: listed.slice(0, 60).map((product, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: `Tamiya ${product.sku} ${product.name}`,
          url: absoluteUrl(`/products/${product.slug}`),
        })),
      },
    },
  );

  return <main className="bg-white">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }}/>
    <SiteHeader customerName={customer?.name} freeShippingThreshold={freeShipping} pendingOrders={pending}/>

    {/* A listing page is not a hero: `.display` runs to 78px, which pushed the first product
        below the fold and shouted louder than the products themselves. */}
    <section className="border-b border-[#eeebe6] bg-[#faf8f4] py-6 sm:py-8 md:py-10">
      <div className="container-wide">
        <nav aria-label="เส้นทางนำทาง" className="mb-3 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-[#98a2ac]">
          {trail.map(([label, href], index) => <span key={href} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>›</span>}
            {index === trail.length - 1
              ? <span className="text-[#465360]" aria-current="page">{label}</span>
              : <Link href={href} className="transition hover:text-[#ef6c3d]">{label}</Link>}
          </span>)}
        </nav>
        <h1 className="text-[24px] leading-8 font-black tracking-tight sm:text-[28px] sm:leading-9 md:text-[34px] md:leading-[2.75rem]">{heading}</h1>
        <p className="mt-2 text-[13px] leading-6 text-[#687582] sm:text-sm md:text-base">
          {activeCategory
            ? <>{activeCategory} Tamiya ของแท้ {listed.length} รายการ · พร้อมส่งจากคลังในไทย</>
            : <>ของแท้ทุกชิ้น พร้อมส่งจากคลังในไทย · ทั้งหมด {products.length} รายการ ใน {categories.length} หมวดหมู่</>}
        </p>
      </div>
    </section>

    <div className="pt-5 sm:pt-8 md:pt-10">
      <ProductCatalog products={listed} categories={categories} totalCount={products.length} activeCategory={activeCategory} initialQuery={q ?? ""}/>
    </div>
    <SiteFooter/>
  </main>;
}
