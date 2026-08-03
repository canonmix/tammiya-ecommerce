"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatBaht } from "@/lib/data";
import type { CatalogProduct } from "@/lib/catalog";

/**
 * The hero showcase: one product large, the rest as thumbnails under it.
 *
 * Up to four arrivals fit in a fixed row. Beyond that the row becomes a slider — arrows to step
 * through and a strip that scrolls the selection into view — rather than shrinking thumbnails
 * until nothing is recognisable. Nothing moves on its own: an advancing carousel would slide the
 * product out from under whoever was reading it.
 */
export default function HeroArrivals({ products, labelNew }: { products: CatalogProduct[]; labelNew: boolean }) {
  const [index, setIndex] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const active = products[index] ?? products[0];
  const slider = products.length > 4;

  useEffect(() => {
    // Keep the selected thumbnail on screen when the arrows walk past the visible ones.
    strip.current?.children[index]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  if (!active) return null;
  const step = (direction: 1 | -1) => setIndex((current) => (current + direction + products.length) % products.length);

  return <div className="relative">
    <div className="absolute -inset-6 rounded-[48px] bg-gradient-to-br from-[#ef6c3d]/25 to-transparent blur-3xl"/>
    <div className="relative overflow-hidden rounded-[28px] border border-white/12 bg-white/[.04] p-3 backdrop-blur-xl sm:p-4">
      <div className="relative">
        <Link
          href={`/products/${active.slug}`}
          className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[20px]"
          style={{ background: active.color }}
        >
          {active.photos[0]
            ? <Image key={active.id} src={active.photos[0].url} alt={active.photos[0].alt} fill sizes="(max-width: 1024px) 100vw, 42vw" priority className="object-cover"/>
            : <span className="font-display max-w-full truncate px-4 text-[clamp(32px,10vw,64px)] leading-none font-extrabold italic text-[#18212b]/70">{active.name.split(" ")[0]}</span>}
        </Link>

        {slider && <>
          <button onClick={() => step(-1)} aria-label="สินค้าก่อนหน้า" className="absolute top-1/2 left-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-lg text-white backdrop-blur transition hover:bg-black/70">‹</button>
          <button onClick={() => step(1)} aria-label="สินค้าถัดไป" className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-lg text-white backdrop-blur transition hover:bg-black/70">›</button>
          <span className="font-display absolute right-2 bottom-2 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold text-white tabular-nums backdrop-blur">{index + 1}/{products.length}</span>
        </>}
      </div>

      <div
        ref={strip}
        className={slider
          ? "no-scrollbar mt-2.5 flex snap-x snap-mandatory gap-2 overflow-x-auto"
          : "mt-2.5 grid grid-cols-4 gap-2"}
      >
        {products.map((product, position) => {
          const selected = position === index;
          return <button
            key={product.id}
            onClick={() => setIndex(position)}
            aria-pressed={selected}
            aria-label={`ดู ${product.name}`}
            className={`relative aspect-square shrink-0 snap-center overflow-hidden rounded-2xl border-2 transition ${slider ? "w-[calc(25%-6px)]" : "w-full"} ${selected ? "border-[#ef6c3d]" : "border-white/10 opacity-60 hover:opacity-100"}`}
            style={{ background: product.color }}
          >
            {product.images[0]
              ? <Image src={product.images[0]} alt="" fill sizes="90px" className="object-cover"/>
              : <span className="font-display grid h-full place-items-center text-xs font-extrabold text-[#18212b]/60">{product.sku}</span>}
          </button>;
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2.5 min-[360px]:flex-row min-[360px]:items-end min-[360px]:justify-between">
        <div className="min-w-0 min-[360px]:flex-1">
          <p className="flex flex-wrap items-center gap-2">
            {labelNew && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#ef6c3d] px-2.5 py-1 text-[10.5px] font-black text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white"/>สินค้ามาใหม่
            </span>}
            <span className="code-plate text-[11px] text-[#ff9152]"><span className="opacity-60">Tamiya</span>{active.sku}</span>
          </p>
          <p className="mt-1.5 line-clamp-2 text-sm leading-5 font-black break-words sm:text-base sm:leading-6">{active.name}</p>
          <p className="mt-1 text-xs text-white/45">{active.category}</p>
        </div>
        <div className="flex shrink-0 items-end justify-between gap-4 min-[360px]:block min-[360px]:text-right">
          <div>
            <p className="font-display text-xl font-extrabold">{formatBaht(active.price)}</p>
            {active.price < active.listPrice && <p className="text-xs text-white/40 line-through">{formatBaht(active.listPrice)}</p>}
          </div>
          <Link href={`/products/${active.slug}`} className="rounded-full bg-white px-4 py-2 text-xs font-black whitespace-nowrap text-[#18212b] transition hover:bg-[#ff9152] hover:text-white min-[360px]:mt-2 min-[360px]:inline-block">ดูรายละเอียด</Link>
        </div>
      </div>
    </div>
  </div>;
}
