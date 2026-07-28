"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatBaht } from "@/lib/data";
import { stockBadge, type CatalogProduct } from "@/lib/catalog";

export default function Storefront({ products, categories }: { products: CatalogProduct[]; categories: string[] }) {
  const [category, setCategory] = useState("ทั้งหมด");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<string[]>([]);
  const filters = ["ทั้งหมด", ...categories];
  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((p) => {
      const inCategory = category === "ทั้งหมด" || p.category === category;
      const searchText = `tamiya ${p.sku} ${p.name} ${p.description}`.toLowerCase();
      return inCategory && (!normalized || searchText.includes(normalized));
    });
  }, [category, query, products]);
  const add = (id: string) => setCart((items) => [...items, id]);
  return <main>
    <div style={{background: "#18212b", color: "white"}} className="py-3 text-center text-xs tracking-wide">ส่งฟรีเมื่อซื้อครบ ฿1,500 · เก็บเงินปลายทางทั่วประเทศ</div>
    <header className="border-b border-[#e7e1d8] bg-white/95 sticky top-0 z-20 backdrop-blur"><div className="container flex h-20 items-center justify-between gap-5">
      <Link href="/" className="text-xl font-black tracking-tight">TAMIYA<span className="text-[#ef6c3d]">.</span></Link>
      <nav className="hidden gap-7 text-sm font-bold md:flex"><a href="#shop">สินค้า</a><Link href="/payment">วิธีการชำระเงิน</Link><a href="#story">เรื่องราวของเรา</a><a href="#service">บริการ</a></nav>
      <div className="flex items-center gap-3 text-sm"><Link href="/login" className="hidden rounded-full border border-[#d8d0c5] px-4 py-2 font-bold sm:block">เข้าสู่ระบบ</Link><Link href="/checkout" className="rounded-full bg-[#ef6c3d] px-4 py-2 font-bold text-white">ตะกร้า ({cart.length})</Link></div>
    </div></header>
    <section className="container grid gap-8 py-16 md:grid-cols-[1.1fr_.9fr] md:items-center md:py-24"><div><p className="eyebrow mb-5">Built for the next corner</p><h1 className="display max-w-xl">เติมความเร็ว<br/><span className="text-[#ef6c3d]">ให้ทุกคัน</span></h1><p className="mt-7 max-w-md text-lg leading-8 text-[#687582]">ของแท้ อะไหล่แท้ และของแต่งที่คัดมาแล้วสำหรับคนที่จริงจังกับทุกสนาม</p><div className="mt-9 flex flex-wrap gap-3"><a href="#shop" className="rounded-full bg-[#18212b] px-6 py-3 font-bold text-white">ช้อปสินค้า</a><a href="#story" className="rounded-full border border-[#cfc6bb] px-6 py-3 font-bold">รู้จัก Tamiya</a></div></div><div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[36px] bg-[#f5f7f8] p-8"><div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/30"/><div className="relative rotate-[-8deg] text-center"><div className="text-[110px] font-black italic leading-none text-[#18212b] drop-shadow-[8px_10px_0_rgba(239,108,61,.9)]">4WD</div><p className="mt-4 font-black tracking-[.35em]">PREMIUM GARAGE</p></div></div></section>
    <section id="shop" className="container pb-24"><div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow mb-3">Curated collection</p><h2 className="text-4xl font-black tracking-tight">ของที่พร้อมลงสนาม</h2></div><div className="flex flex-wrap gap-2">{filters.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm font-bold ${category === item ? "bg-[#18212b] text-white" : "border border-[#d8d0c5]"}`}>{item}</button>)}</div></div><div className="mb-8"><label htmlFor="product-search" className="sr-only">ค้นหาสินค้า รหัส Tamiya หรือชื่อสินค้า</label><input id="product-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา เช่น Tamiya 95379, 95379 หรือ Aluminum Rollers..." className="w-full rounded-2xl border border-[#d8d0c5] bg-white px-5 py-4 text-sm outline-none focus:border-[#ef6c3d]"/></div>
      {visible.length === 0
        ? <p className="rounded-3xl border border-dashed border-[#d8d0c5] bg-white p-12 text-center text-[#687582]">{products.length === 0 ? "ยังไม่มีสินค้าในระบบ — เพิ่มสินค้าได้ที่หน้าจัดการสินค้า" : "ไม่พบสินค้าที่ตรงกับการค้นหา"}</p>
        : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visible.map((product) => { const badge = stockBadge(product.stock); return <article key={product.id} className="group overflow-hidden rounded-3xl border border-[#e7e1d8] bg-white"><Link href={`/products/${product.slug}`} className="relative flex h-60 items-center justify-center overflow-hidden" style={{background: product.color}}>{product.images[0] ? <Image src={product.images[0]} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition-transform group-hover:scale-105"/> : <span className="text-6xl font-black italic text-[#18212b]/80 transition-transform group-hover:scale-110">{product.name.split(" ")[0]}</span>}{badge && <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-black">{badge}</span>}</Link><div className="p-5"><p className="mb-2 text-xs font-bold text-[#ef6c3d]">Tamiya {product.sku} · {product.category}</p><Link href={`/products/${product.slug}`}><h3 className="text-lg font-black hover:text-[#ef6c3d]">{product.name}</h3></Link><p className="mt-2 min-h-12 text-sm leading-6 text-[#687582]">{product.description}</p><div className="mt-5 flex items-center justify-between"><span className="text-xl font-black">{formatBaht(product.price)}</span><button onClick={() => add(product.id)} disabled={product.stock <= 0} className="rounded-full bg-[#18212b] px-4 py-2 text-sm font-bold text-white hover:bg-[#ef6c3d] disabled:bg-[#c7ccd1] disabled:hover:bg-[#c7ccd1]">{product.stock > 0 ? "ใส่ตะกร้า" : "สินค้าหมด"}</button></div></div></article>; })}</div>}
    </section>
    <section id="story" className="bg-[#18212b] py-20 text-white"><div className="container grid gap-10 md:grid-cols-2 md:items-center"><div><p className="eyebrow mb-4">Our garage</p><h2 className="text-4xl font-black tracking-tight">ไม่ใช่แค่ของเล่น<br/>แต่มันคือความเร็ว</h2></div><p className="max-w-lg text-lg leading-8 text-white/65">Tamiya Premium Shop ตั้งใจคัดสรรโมเดลและอะไหล่ที่ทำให้ทุกคนสนุกกับการประกอบ ปรับแต่ง และเอาชนะโค้งถัดไป</p></div></section>
    <footer id="service" className="container flex flex-col justify-between gap-5 py-8 text-sm text-[#687582] md:flex-row"><span>© 2026 Tamiya Premium Shop</span><span>ชำระเงินปลายทาง · QR Payment · Support 09x-xxx-xxxx</span></footer>
  </main>;
}
