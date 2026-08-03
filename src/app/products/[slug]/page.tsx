import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { formatBaht } from "@/lib/data";
import { describeProduct, getCatalogProduct, getRelatedProducts } from "@/lib/catalog";
import ProductGallery from "@/components/product-gallery";
import ProductCard from "@/components/product-card";
import BuyNowButton from "@/components/buy-now-button";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getFreeShippingThreshold } from "@/lib/promotions";
import { SHIPPING_FEE } from "@/lib/checkout-shared";
import { pendingPaymentOrders } from "@/lib/orders";
import { absoluteUrl, breadcrumbSchema, jsonLdGraph, organizationId, siteName } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

// Price and stock come straight from PostgreSQL, so the page is rendered per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return { title: "ไม่พบสินค้า", robots: { index: false, follow: true } };

  // People search the code before the name, so the code leads the title. The description is
  // trimmed to roughly what a result snippet shows — anything past that is cut off anyway.
  const title = `Tamiya ${product.sku} ${product.name}`;
  const summary = product.description.replace(/\s+/g, " ").trim().slice(0, 130);
  const stock = product.stock > 0 ? "พร้อมส่ง" : "สินค้าหมดชั่วคราว";
  const path = `/products/${product.slug}`;

  return {
    title,
    description: `${product.name} รหัส Tamiya ${product.sku} ราคา ${formatBaht(product.price)} ${stock} — ${summary}`,
    keywords: [product.sku, `Tamiya ${product.sku}`, product.name, `${product.name} ราคา`, product.category, "Tamiya ของแท้", "Mini 4WD"],
    alternates: { canonical: path },
    openGraph: {
      title,
      description: `${product.name} · ${formatBaht(product.price)} · ${stock}`,
      url: path,
      type: "website",
      siteName,
    },
    twitter: { card: "summary_large_image", title, description: `${product.name} · ${formatBaht(product.price)}` },
    other: {
      // Read by Facebook/LINE shopping crawlers, which do not parse JSON-LD.
      "product:price:amount": String(product.price),
      "product:price:currency": "THB",
      "product:availability": product.stock > 0 ? "in stock" : "out of stock",
      "product:retailer_item_id": product.sku,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, customer, freeShipping] = await Promise.all([getCatalogProduct(slug), getCurrentCustomer(), getFreeShippingThreshold()]);
  if (!product) notFound();

  const [related, pending] = await Promise.all([
    getRelatedProducts(product),
    customer ? pendingPaymentOrders(customer.id) : Promise.resolve([]),
  ]);
  const { lead, bullets } = describeProduct(product.description);
  // The buy box shows whichever comes first — some copy is bullets from the very first character.
  const teaser = lead || bullets[0] || "";
  const path = `/products/${product.slug}`;

  // Google drops an Offer whose price has no validity window, so it is stated explicitly rather
  // than left for the crawler to guess.
  const priceValidUntil = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);

  const jsonLd = jsonLdGraph(
    breadcrumbSchema([["หน้าแรก", "/"], ["สินค้าทั้งหมด", "/products"], [product.category, `/products?category=${encodeURIComponent(product.category)}`], [`Tamiya ${product.sku}`, path]]),
    {
      "@type": "Product",
      "@id": absoluteUrl(`${path}#product`),
      name: `Tamiya ${product.sku} ${product.name}`,
      sku: product.sku,
      mpn: product.sku,
      brand: { "@type": "Brand", name: "Tamiya" },
      category: product.category,
      description: product.description,
      url: absoluteUrl(path),
      // Already absolute — product photos are served from object storage, not from this origin.
      image: product.images,
      inLanguage: "th-TH",
      offers: {
        "@type": "Offer",
        "@id": absoluteUrl(`${path}#offer`),
        url: absoluteUrl(path),
        priceCurrency: "THB",
        price: product.price,
        priceValidUntil,
        itemCondition: "https://schema.org/NewCondition",
        availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        seller: { "@id": organizationId },
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: { "@type": "MonetaryAmount", value: freeShipping !== null && product.price >= freeShipping ? 0 : SHIPPING_FEE, currency: "THB" },
          shippingDestination: { "@type": "DefinedRegion", addressCountry: "TH" },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
            transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 3, unitCode: "DAY" },
          },
        },
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "TH",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 7,
          returnMethod: "https://schema.org/ReturnByMail",
          returnFees: "https://schema.org/FreeReturn",
        },
      },
    },
  );

  const trail: Array<[string, string]> = [["หน้าแรก", "/"], ["สินค้าทั้งหมด", "/products"], [product.category, `/products?category=${encodeURIComponent(product.category)}`]];

  return <main className="has-action-bar bg-white">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }}/>
    <SiteHeader customerName={customer?.name} freeShippingThreshold={freeShipping} pendingOrders={pending}/>

    {/* Above the fold stays short: picture, price, buy. The long copy has its own section below.
        The split waits until lg — at iPad-portrait width two columns leave the gallery too small
        to judge a part by, which is the whole job of this page. */}
    <div className="container-wide grid gap-6 py-5 sm:gap-8 sm:py-8 lg:grid-cols-[1.05fr_.95fr] lg:items-start lg:gap-12 lg:py-14">
      <div className="lg:sticky lg:top-28">
        <ProductGallery photos={product.photos} name={product.name} color={product.color} sku={product.sku}/>
      </div>
      <article>
        <nav aria-label="เส้นทางนำทาง" className="mb-4 flex flex-wrap items-center gap-1.5 text-[12px] font-bold text-[#98a2ac]">
          {trail.map(([label, href], index) => <span key={href} className="flex items-center gap-1.5">
            {index > 0 && <span aria-hidden>›</span>}
            <Link href={href} className="transition hover:text-[#ef6c3d]">{label}</Link>
          </span>)}
        </nav>
        <p className="code-plate text-lg text-[#ef6c3d] sm:text-2xl"><span className="opacity-55">Tamiya</span>{product.sku}</p>
        <h1 className="mt-2 text-[22px] leading-7 font-black tracking-tight sm:text-3xl sm:leading-10 lg:text-4xl lg:leading-[3rem]">{product.name}</h1>

        <div className="mt-5 flex flex-wrap items-center gap-2.5 sm:mt-7 sm:gap-4">
          <span className="font-display text-[28px] leading-9 font-extrabold sm:text-3xl">{formatBaht(product.price)}</span>
          {product.price < product.listPrice && <>
            <span className="text-lg text-[#98a2ac] line-through sm:text-xl">{formatBaht(product.listPrice)}</span>
            <span className="rounded-full bg-[#ef6c3d] px-3 py-1 text-[13px] font-black text-white sm:text-sm">ลด {product.discountPercent}%</span>
          </>}
          {product.stock > 0
            ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-[13px] font-bold text-emerald-700 sm:text-sm">มีสินค้า {product.stock} ชิ้น</span>
            : <span className="rounded-full bg-red-50 px-3 py-1 text-[13px] font-bold text-red-700 sm:text-sm">สินค้าหมด</span>}
        </div>

        {product.stock > 0
          ? <BuyNowButton productId={product.id} productName={product.name} sku={product.sku} price={formatBaht(product.price)}/>
          : <span className="mt-6 inline-block rounded-full bg-[#c7ccd1] px-7 py-3 font-bold text-white sm:mt-8">สินค้าหมดชั่วคราว</span>}

        {/* Reassurance sits where the decision is made, not in a footer nobody scrolls to. */}
        <ul className="mt-6 grid gap-2.5 rounded-2xl border border-[#eeebe6] bg-[#faf8f4] p-4 text-[13px] leading-5 text-[#465360] sm:mt-8 sm:text-sm">
          {[
            freeShipping !== null ? `ส่งฟรีเมื่อซื้อครบ ฿${freeShipping.toLocaleString("th-TH")} · ต่ำกว่านั้นค่าส่ง ฿${SHIPPING_FEE}` : `ค่าจัดส่ง ฿${SHIPPING_FEE} ทั่วประเทศ`,
            "สั่งก่อน 15:00 น. จัดส่งภายในวันเดียวกัน พร้อมเลขพัสดุ",
            "ของแท้ 100% ตรวจรหัส Tamiya ทุกกล่องก่อนส่ง",
          ].map((line) => <li key={line} className="flex gap-2.5">
            <svg viewBox="0 0 20 20" aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[#ef6c3d]"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9"/></svg>
            <span className="min-w-0">{line}</span>
          </li>)}
        </ul>

        {/* Two lines of the description, as a teaser; the rest is one scroll away. */}
        <p className="mt-6 line-clamp-2 text-[14px] leading-7 text-[#687582] sm:mt-8 sm:text-base">{teaser}</p>
        <a href="#details" className="mt-2 inline-block text-sm font-black text-[#ef6c3d] transition hover:text-[#18212b]">อ่านรายละเอียดสินค้า ↓</a>

        <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-[#e7e1d8] pt-6 text-sm sm:mt-8">
          <dt className="text-[#98a2ac]">รหัสสินค้า</dt><dd className="text-right font-bold">{product.sku}</dd>
          <dt className="text-[#98a2ac]">หมวดหมู่</dt><dd className="text-right font-bold">{product.category}</dd>
          <dt className="text-[#98a2ac]">แบรนด์</dt><dd className="text-right font-bold">Tamiya</dd>
        </dl>
      </article>
    </div>

    <section id="details" className="scroll-mt-24 border-t border-[#eeebe6] bg-[#faf8f4] py-10 md:py-20">
      <div className="container-wide">
        <p className="eyebrow mb-3">Product details</p>
        <h2 className="text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">รายละเอียด Tamiya {product.sku}</h2>
        <div className="mt-6 rounded-[22px] border border-[#e8ebee] bg-white p-5 sm:mt-8 sm:rounded-[26px] sm:p-6 md:p-8">
          {lead && <p className="text-[15px] leading-8 text-[#3c4753] sm:text-base">{lead}</p>}
          {bullets.length > 0 && <ul className={`space-y-3 ${lead ? "mt-5 border-t border-[#eeebe6] pt-5 sm:mt-6 sm:pt-6" : ""}`}>
            {bullets.map((bullet) => <li key={bullet} className="flex gap-3 text-[15px] leading-7 text-[#3c4753] sm:text-base">
              <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef6c3d]"/>
              <span className="min-w-0">{bullet}</span>
            </li>)}
          </ul>}
        </div>
      </div>
    </section>

    {related.length > 0 && <section className="container-wide py-10 md:py-20">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-2 sm:mb-3">You may also like</p>
          <h2 className="text-2xl font-black tracking-tight sm:text-3xl md:text-4xl">สินค้าแนะนำ</h2>
        </div>
        <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="text-sm font-black text-[#ef6c3d] transition hover:text-[#18212b]">ดูทั้งหมดในหมวด {product.category} →</Link>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {related.map((item) => <ProductCard key={item.id} product={item} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"/>)}
      </div>
    </section>}

    <SiteFooter/>
  </main>;
}
