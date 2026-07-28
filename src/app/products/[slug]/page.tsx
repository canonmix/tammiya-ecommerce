import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { formatBaht } from "@/lib/data";
import { getCatalogProduct } from "@/lib/catalog";
import ProductGallery from "@/components/product-gallery";

type Props = { params: Promise<{ slug: string }> };

// Price and stock come straight from PostgreSQL, so the page is rendered per request.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return { title: "ไม่พบสินค้า" };
  return {
    title: `Tamiya ${product.sku} ${product.name}`,
    description: `${product.name} รหัส Tamiya ${product.sku} — ${product.description} สั่งซื้อออนไลน์จาก Tamiya Premium Shop`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: `Tamiya ${product.sku} ${product.name}`, description: product.description, type: "website", images: product.images },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) notFound();
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: `Tamiya ${product.sku} ${product.name}`, sku: product.sku, brand: { "@type": "Brand", name: "Tamiya" }, description: product.description, image: product.images, offers: { "@type": "Offer", priceCurrency: "THB", price: product.price, availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `https://tammiya-ecommerce.example.com/products/${product.slug}` } };
  return <main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><header className="border-b border-[#e7e1d8] bg-white"><div className="container flex h-20 items-center justify-between"><Link href="/" className="text-xl font-black">TAMIYA<span className="text-[#ef6c3d]">.</span></Link><Link href="/" className="text-sm font-bold text-[#687582]">← กลับไปเลือกสินค้า</Link></div></header><div className="container grid gap-10 py-14 md:grid-cols-2 md:items-center"><ProductGallery images={product.images} name={product.name} color={product.color}/><article><p className="eyebrow">Tamiya Product Code</p><p className="mt-3 text-2xl font-black text-[#ef6c3d]">Tamiya {product.sku}</p><h1 className="mt-3 text-4xl font-black tracking-tight">{product.name}</h1><p className="mt-5 text-lg leading-8 text-[#687582]">{product.description}</p><div className="mt-7 flex flex-wrap items-center gap-5"><span className="text-3xl font-black">{formatBaht(product.price)}</span>{product.stock > 0 ? <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">มีสินค้า {product.stock} ชิ้น</span> : <span className="rounded-full bg-red-50 px-3 py-1 text-sm font-bold text-red-700">สินค้าหมด</span>}</div>{product.stock > 0 ? <Link href="/checkout" className="mt-8 inline-block rounded-full bg-[#18212b] px-7 py-3 font-bold text-white">สั่งซื้อสินค้า</Link> : <span className="mt-8 inline-block rounded-full bg-[#c7ccd1] px-7 py-3 font-bold text-white">สินค้าหมดชั่วคราว</span>}<div className="mt-10 border-t border-[#e7e1d8] pt-6 text-sm text-[#687582]"><p><b>รหัสสินค้า:</b> {product.sku}</p><p className="mt-2"><b>หมวดหมู่:</b> {product.category}</p></div></article></div></main>;
}
