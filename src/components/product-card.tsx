"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatBaht } from "@/lib/data";
import { stockBadge, type CatalogProduct } from "@/lib/catalog";
import { useCart } from "@/lib/cart";
import { showCartToast } from "@/lib/cart-toast";
import { usePendingOrder } from "@/lib/pending-order";

// `sizes` differs between the four-up catalog grid and the marketing rows, so the caller passes it in.
// `priority` is for the handful of cards that are above the fold on a phone — they are the LCP
// candidate there, and lazy-loading the LCP image is the single most common cause of a slow
// mobile score. Everything below the fold stays lazy.
export default function ProductCard({ product, sizes = "(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw", priority = false }: { product: CatalogProduct; sizes?: string; priority?: boolean }) {
  const { add } = useCart();
  // An unpaid order already holds stock, so nothing new goes in the basket until it is settled.
  const waiting = usePendingOrder();
  // The button itself confirms too: the toast is easy to miss when adding several in a row.
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1400);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const addToCart = () => {
    add(product.id);
    showCartToast(product.name);
    setJustAdded(true);
  };
  const badge = stockBadge(product.stock);
  const soldOut = product.stock <= 0;

  return <article className="lift group flex h-full flex-col overflow-hidden rounded-[18px] border border-[#e8ebee] bg-white sm:rounded-[22px]">
    <Link href={`/products/${product.slug}`} className="relative flex aspect-[4/3] items-center justify-center overflow-hidden" style={{ background: product.color }}>
      {product.photos[0]
        ? <Image src={product.photos[0].url} alt={product.photos[0].alt} fill sizes={sizes} priority={priority} className="object-cover transition-transform duration-500 group-hover:scale-[1.06]"/>
        : <span className="font-display max-w-full truncate px-3 text-[clamp(24px,9vw,44px)] leading-none font-extrabold italic text-[#18212b]/70 transition-transform duration-500 group-hover:scale-110">{product.name.split(" ")[0]}</span>}
      {/* Stock warnings win the corner: "only a few left" changes a decision, "new" only flavours it. */}
      {badge
        ? <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[10.5px] font-bold text-[#465360] shadow-sm">{badge}</span>
        : product.isNewArrival && <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-[#ef6c3d] px-2.5 py-1 text-[10.5px] font-black text-white shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-white"/>มาใหม่
          </span>}
      {product.price < product.listPrice && <span className="font-display absolute top-3 right-3 rounded-full bg-[#ef6c3d] px-2.5 py-1 text-[10.5px] font-extrabold text-white shadow-sm">-{product.discountPercent}%</span>}
    </Link>
    <div className="flex flex-1 flex-col p-3.5 sm:p-4">
      {/* One line each, in a fixed order: code, then name, then where it lives in the shop.
          The name reserves two lines so every price row in a grid row sits on the same line. */}
      <p className="code-plate text-[10.5px] font-semibold text-[#ef6c3d]"><span className="text-[#c0c6cc]">Tamiya</span>{product.sku}</p>
      <Link
        href={`/products/${product.slug}`}
        className="mt-1.5 line-clamp-2 min-h-[2.7em] text-[13.5px] leading-[1.35] font-bold text-[#18212b] transition hover:text-[#ef6c3d] sm:text-[14.5px]"
      >{product.name}</Link>
      <p className="mt-1.5 truncate text-[11px] text-[#a8b0b8]">{product.category}</p>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3.5">
        <span className="min-w-0">
          <span className="font-display block text-[19px] leading-6 font-extrabold tracking-tight text-[#18212b] sm:text-xl">{formatBaht(product.price)}</span>
          {product.price < product.listPrice && <span className="block text-[11px] leading-4 text-[#a8b0b8] line-through">{formatBaht(product.listPrice)}</span>}
        </span>
        {waiting
          ? <Link href="/account/orders?status=PENDING_PAYMENT" title={`คุณมีคำสั่งซื้อ ${waiting.code} รอชำระเงินอยู่`} className="shrink-0 rounded-full border border-[#f3d9c9] bg-[#fdf3ee] px-3.5 py-2 text-[13px] font-bold whitespace-nowrap text-[#b4552a]">รอชำระเงิน</Link>
          : <button onClick={addToCart} disabled={soldOut} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-bold whitespace-nowrap text-white transition disabled:cursor-not-allowed disabled:bg-[#c7ccd1] ${justAdded ? "bg-[#1b7a52]" : "bg-[#18212b] hover:bg-[#ef6c3d]"}`}>
              {justAdded && <svg viewBox="0 0 20 20" aria-hidden className="h-3.5 w-3.5"><path fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9"/></svg>}
              {soldOut ? "สินค้าหมด" : justAdded ? "เพิ่มแล้ว" : "ใส่ตะกร้า"}
            </button>}
      </div>
    </div>
  </article>;
}
