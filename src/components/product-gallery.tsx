"use client";

import { useRef, useState } from "react";
import Image from "next/image";

type Photo = { url: string; alt: string };

/**
 * Product photos as one swipeable, snapping track.
 *
 * The old gallery swapped a single image when a thumbnail was tapped, which on a phone meant the
 * only way to see photo two was to hit an 80px square — swiping, which is what everyone tries
 * first, did nothing. One scroll-snap track serves both: a thumb drags it on a phone, and the
 * thumbnails below drive the same track on a tablet and up.
 */
export default function ProductGallery({ photos, name, color, sku }: { photos: Photo[]; name: string; color: string; sku: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  if (photos.length === 0) return <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[24px] px-6 sm:aspect-[4/3] sm:rounded-[32px] lg:aspect-square" style={{ background: color }}>
    <span className="font-display max-w-full truncate text-[clamp(40px,14vw,88px)] leading-none font-extrabold text-[#18212b]/80 italic">{name.split(" ")[0]}</span>
  </div>;

  const goTo = (index: number) => {
    const node = track.current;
    if (!node) return;
    node.scrollTo({ left: node.clientWidth * index, behavior: "smooth" });
    setActive(index);
  };

  // Reading the index off the scroll position keeps the dots honest during a free swipe, which
  // no click handler can do.
  const onScroll = () => {
    const node = track.current;
    if (!node) return;
    const index = Math.round(node.scrollLeft / node.clientWidth);
    if (index !== active) setActive(Math.max(0, Math.min(photos.length - 1, index)));
  };

  return <div>
    <div className="relative">
      <div
        ref={track}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[24px] sm:rounded-[32px]"
        style={{ background: color }}
        role="group"
        aria-roledescription="แกลเลอรีรูปสินค้า"
        aria-label={`รูปสินค้า ${name}`}
      >
        {photos.map((photo, index) => <div key={photo.url} className="relative aspect-square w-full shrink-0 snap-center sm:aspect-[4/3] lg:aspect-square">
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            // Only the first photo is in the viewport on load; preloading the rest would compete
            // with it for bandwidth on a phone.
            priority={index === 0}
            loading={index === 0 ? "eager" : "lazy"}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain"
          />
        </div>)}
      </div>

      {photos.length > 1 && <>
        {/* The counter is the honest affordance on a phone: it says there is more without
            needing a hover-only arrow that a touch device never shows. */}
        <span className="font-display absolute right-3 bottom-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white tabular-nums backdrop-blur-sm sm:hidden">{active + 1}/{photos.length}</span>
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden">
          {photos.map((photo, index) => <span key={photo.url} aria-hidden className={`h-1.5 rounded-full transition-all ${index === active ? "w-5 bg-[#18212b]" : "w-1.5 bg-[#18212b]/25"}`}/>)}
        </div>
      </>}
    </div>

    {photos.length > 1 && <div className="no-scrollbar mt-3 hidden gap-2.5 overflow-x-auto sm:flex sm:mt-4">
      {photos.map((photo, index) => <button
        key={photo.url}
        type="button"
        onClick={() => goTo(index)}
        aria-label={`ดูรูปที่ ${index + 1} ของ Tamiya ${sku}`}
        aria-current={index === active}
        className={`relative h-18 w-18 shrink-0 overflow-hidden rounded-2xl border-2 transition sm:h-20 sm:w-20 ${index === active ? "border-[#ef6c3d]" : "border-[#e7e1d8] hover:border-[#cfc6bb]"}`}
        style={{ background: color }}
      >
        <Image src={photo.url} alt="" fill sizes="80px" className="object-cover"/>
      </button>)}
    </div>}
  </div>;
}
