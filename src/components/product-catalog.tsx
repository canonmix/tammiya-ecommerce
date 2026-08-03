"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/product-card";
import type { CatalogCategory, CatalogProduct } from "@/lib/catalog";

const ALL = "ทั้งหมด";
const SORTS = [
  { key: "newest", label: "มาใหม่ล่าสุด" },
  { key: "price-asc", label: "ราคาน้อย → มาก" },
  { key: "price-desc", label: "ราคามาก → น้อย" },
  { key: "name", label: "ชื่อ A → Z" },
] as const;

type SortKey = (typeof SORTS)[number]["key"];

const categoryHref = (name: string) => name === ALL ? "/products" : `/products?category=${encodeURIComponent(name)}`;

/**
 * Catalog grid with its filters.
 *
 * The category lives in the URL and is chosen with real links, not with local state: those links
 * are the only way a crawler reaches a category listing, and they make a filtered view something
 * a shopper can send to a friend. Search, sort and the in-stock toggle stay client-side — they
 * are instant, and none of them produce a page worth indexing.
 */
export default function ProductCatalog({ products, categories, totalCount, activeCategory, initialQuery = "" }: { products: CatalogProduct[]; categories: CatalogCategory[]; totalCount: number; activeCategory: string | null; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("newest");
  const [sheetOpen, setSheetOpen] = useState(false);

  const category = activeCategory ?? ALL;
  // `products` already arrives newest-first and filtered by category, so ALL reuses that order.
  const options = [{ name: ALL, count: totalCount }, ...categories];

  // The sheet is a full-screen overlay on a phone; the page behind it must not scroll with it.
  useEffect(() => {
    if (!sheetOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [sheetOpen]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = products.filter((product) => {
      const searchText = `tamiya ${product.sku} ${product.name} ${product.description} ${product.category}`.toLowerCase();
      return (!inStockOnly || product.stock > 0) && (!normalized || searchText.includes(normalized));
    });
    if (sort === "price-asc") return [...filtered].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") return [...filtered].sort((a, b) => b.price - a.price);
    if (sort === "name") return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "th"));
    return filtered;
  }, [products, query, inStockOnly, sort]);

  const activeFilters = (inStockOnly ? 1 : 0) + (sort === "newest" ? 0 : 1);
  const sortLabel = SORTS.find((option) => option.key === sort)!.label;

  const chips = <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-0.5 sm:-mx-6 sm:px-6 lg:hidden">
    {options.map((option) => {
      const active = option.name === category;
      return <Link key={option.name} href={categoryHref(option.name)} scroll={false} aria-current={active ? "page" : undefined} className={`flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full px-4 text-[13px] font-bold transition ${active ? "bg-[#18212b] text-white" : "border border-[#e0dcd5] bg-white text-[#465360]"}`}>
        {option.name}
        <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-white/15" : "bg-[#f0eeea] text-[#7b8792]"}`}>{option.count}</span>
      </Link>;
    })}
  </div>;

  return <div className="checkout-grid container-wide grid gap-6 pb-16 lg:grid-cols-[248px_1fr] lg:gap-12 lg:pb-24">
    {/* Desktop rail. Below lg the same options ride in the sticky bar as snap chips. */}
    <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
      <p className="eyebrow mb-4">หมวดหมู่สินค้า</p>
      <ul className="flex flex-col gap-1">
        {options.map((option) => {
          const active = option.name === category;
          return <li key={option.name}>
            <Link href={categoryHref(option.name)} scroll={false} aria-current={active ? "page" : undefined} className={`flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${active ? "bg-[#18212b] text-white" : "text-[#465360] hover:bg-[#f4f2ee]"}`}>
              <span className="truncate">{option.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] tabular-nums ${active ? "bg-white/15 text-white" : "bg-[#f0eeea] text-[#7b8792]"}`}>{option.count}</span>
            </Link>
          </li>;
        })}
      </ul>
      <label className="mt-6 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-2xl border border-[#e8e5df] px-4 text-sm font-bold text-[#465360]">
        <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="h-4 w-4 accent-[#ef6c3d]"/>
        เฉพาะสินค้าพร้อมส่ง
      </label>
      <label className="mt-3 block text-sm">
        <span className="mb-1.5 block font-bold text-[#465360]">เรียงลำดับ</span>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className="min-h-11 w-full rounded-2xl border border-[#e0dcd5] bg-white px-3 text-sm font-bold outline-none transition focus:border-[#ef6c3d]">
          {SORTS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
        </select>
      </label>
    </aside>

    <section>
      {/* On a phone the filters follow the thumb down the page: scrolling a long grid and then
          scrolling all the way back up to change a category is the whole reason listings get
          abandoned. The bar sits under the sticky header, so it offsets by its height. */}
      <div className="sticky top-16 z-20 -mx-4 mb-4 border-b border-[#eeebe6] bg-white/95 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6 lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <div className="flex gap-2 sm:gap-3">
          <div className="relative flex-1">
            <label htmlFor="product-search" className="sr-only">ค้นหาสินค้า รหัส Tamiya หรือชื่อสินค้า</label>
            <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#a8b0b8]"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 4 4"/></svg>
            <input id="product-search" type="search" inputMode="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา เช่น 95379 หรือ Rollers" className="min-h-11 w-full rounded-2xl border border-[#e0dcd5] bg-white pr-4 pl-10 text-[16px] outline-none transition focus:border-[#ef6c3d] sm:text-sm"/>
          </div>
          {/* Below lg the sort control and the stock toggle move into a sheet: two more controls
              in this row would leave the search box too narrow to read a part code in. */}
          <button type="button" onClick={() => setSheetOpen(true)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-2xl border border-[#e0dcd5] bg-white px-4 text-[13px] font-bold text-[#465360] lg:hidden">
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M4 6h16M7 12h10M10 18h4"/></svg>
            ตัวกรอง
            {activeFilters > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#ef6c3d] px-1 text-[11px] font-black text-white tabular-nums">{activeFilters}</span>}
          </button>
        </div>
        <div className="mt-3 lg:hidden">{chips}</div>
      </div>

      <p className="mb-4 text-[13px] text-[#7b8792] sm:mb-6 sm:text-sm">
        แสดง <b className="text-[#18212b] tabular-nums">{visible.length}</b> รายการ{category !== ALL && <> ในหมวด <b className="text-[#18212b]">{category}</b></>}
        <span className="hidden lg:inline"> · เรียงตาม {sortLabel}</span>
      </p>

      {visible.length === 0
        ? <div className="rounded-3xl border border-dashed border-[#d8d0c5] bg-[#faf8f4] p-8 text-center sm:p-16">
            <p className="text-[#687582]">{products.length === 0 ? "ยังไม่มีสินค้าในหมวดนี้" : "ไม่พบสินค้าที่ตรงกับเงื่อนไข ลองเปลี่ยนหมวดหมู่หรือคำค้นหา"}</p>
            {products.length > 0 && <button type="button" onClick={() => { setQuery(""); setInStockOnly(false); }} className="mt-4 min-h-11 rounded-full bg-[#18212b] px-6 text-sm font-bold text-white">ล้างตัวกรอง</button>}
          </div>
        : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {visible.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 4} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 30vw, 22vw"/>)}
          </div>}
    </section>

    {/* Filter sheet — phone and iPad portrait only. */}
    {sheetOpen && <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="ปิดตัวกรอง" onClick={() => setSheetOpen(false)} className="absolute inset-0 h-full w-full bg-black/45 backdrop-blur-sm"/>
      <div role="dialog" aria-modal="true" aria-label="ตัวกรองสินค้า" className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[26px] bg-white pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="sticky top-0 flex items-center justify-between border-b border-[#eeebe6] bg-white px-5 py-4">
          <span className="text-base font-black">ตัวกรองและการเรียง</span>
          <button type="button" onClick={() => setSheetOpen(false)} aria-label="ปิดตัวกรอง" className="grid h-11 w-11 place-items-center rounded-full border border-[#e8e5df]">
            <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5"><path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <div className="px-5 py-5">
          <p className="eyebrow mb-3">เรียงลำดับ</p>
          <div className="grid gap-2">
            {SORTS.map((option) => <button key={option.key} type="button" onClick={() => setSort(option.key)} aria-pressed={sort === option.key} className={`flex min-h-12 items-center justify-between rounded-2xl px-4 text-left text-sm font-bold transition ${sort === option.key ? "bg-[#18212b] text-white" : "border border-[#e8e5df] text-[#465360]"}`}>
              {option.label}
              {sort === option.key && <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9"/></svg>}
            </button>)}
          </div>

          <p className="eyebrow mt-7 mb-3">ความพร้อมของสินค้า</p>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-[#e8e5df] px-4 text-sm font-bold text-[#465360]">
            <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="h-5 w-5 accent-[#ef6c3d]"/>
            เฉพาะสินค้าพร้อมส่ง
          </label>

          <p className="eyebrow mt-7 mb-3">หมวดหมู่</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((option) => {
              const active = option.name === category;
              return <Link key={option.name} href={categoryHref(option.name)} scroll={false} onClick={() => setSheetOpen(false)} aria-current={active ? "page" : undefined} className={`flex min-h-12 items-center justify-between gap-2 rounded-2xl px-4 text-[13px] font-bold transition ${active ? "bg-[#18212b] text-white" : "border border-[#e8e5df] text-[#465360]"}`}>
                <span className="truncate">{option.name}</span>
                <span className={`shrink-0 rounded-full px-1.5 text-[11px] tabular-nums ${active ? "bg-white/15" : "bg-[#f0eeea] text-[#7b8792]"}`}>{option.count}</span>
              </Link>;
            })}
          </div>

          <button type="button" onClick={() => setSheetOpen(false)} className="mt-7 min-h-12 w-full rounded-full bg-[#ef6c3d] text-sm font-black text-white">ดูสินค้า {visible.length} รายการ</button>
        </div>
      </div>
    </div>}
  </div>;
}
