import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { formatBaht, products } from "@/lib/data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return products.map((product) => ({ slug: product.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) return { title: "ไม่พบสินค้า" };
  return {
    title: `Tamiya ${product.sku} ${product.name}`,
    description: `${product.name} รหัส Tamiya ${product.sku} — ${product.description} สั่งซื้อออนไลน์จาก Tamiya Premium Shop`,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: `Tamiya ${product.sku} ${product.name}`, description: product.description, type: "website" },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = products.find((item) => item.slug === slug);
  if (!product) notFound();
  const jsonLd = { "@context": "https://schema.org", "@type": "Product", name: `Tamiya ${product.sku} ${product.name}`, sku: product.sku, brand: { "@type": "Brand", name: "Tamiya" }, description: product.description, offers: { "@type": "Offer", priceCurrency: "THB", price: product.price, availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock", url: `https://tammiya-ecommerce.example.com/products/${product.slug}` } };
  return <main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} /><header className="border-b border-[#e7e1d8] bg-[#f8f5ef]"><div className="container flex h-20 items-center justify-between"><Link href="/" className="text-xl font-black">TAMIYA<span className="text-[#ef6c3d]">.</span></Link><Link href="/" className="text-sm font-bold text-[#687582]">← กลับไปเลือกสินค้า</Link></div></header><div className="container grid gap-10 py-14 md:grid-cols-2 md:items-center"><div className="flex min-h-[420px] items-center justify-center rounded-[36px]" style={{ background: product.color }}><span className="text-8xl font-black italic text-[#18212b]/80">{product.name.split(" ")[0]}</span></div><article><p className="eyebrow">Tamiya Product Code</p><p className="mt-3 text-2xl font-black text-[#ef6c3d]">Tamiya {product.sku}</p><h1 className="mt-3 text-4xl font-black tracking-tight">{product.name}</h1><p className="mt-5 text-lg leading-8 text-[#687582]">{product.description}</p><div className="mt-7 flex items-center gap-5"><span className="text-3xl font-black">{formatBaht(product.price)}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold text-emerald-700">มีสินค้า {product.stock} ชิ้น</span></div><Link href="/checkout" className="mt-8 inline-block rounded-full bg-[#18212b] px-7 py-3 font-bold text-white">สั่งซื้อสินค้า</Link><div className="mt-10 border-t border-[#e7e1d8] pt-6 text-sm text-[#687582]"><p><b>รหัสสินค้า:</b> {product.sku}</p><p className="mt-2"><b>หมวดหมู่:</b> {product.category}</p></div></article></div></main>;
}
