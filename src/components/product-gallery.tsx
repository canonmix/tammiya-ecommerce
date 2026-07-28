"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProductGallery({ images, name, color }: { images: string[]; name: string; color: string }) {
  const [active, setActive] = useState(0);
  if (images.length === 0) return <div className="flex min-h-[420px] items-center justify-center rounded-[36px]" style={{ background: color }}><span className="text-8xl font-black italic text-[#18212b]/80">{name.split(" ")[0]}</span></div>;
  return <div>
    <div className="relative min-h-[420px] overflow-hidden rounded-[36px]" style={{ background: color }}><Image src={images[active]} alt={name} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="object-contain"/></div>
    {images.length > 1 && <div className="mt-4 flex flex-wrap gap-3">{images.map((image, index) => <button key={image} type="button" onClick={() => setActive(index)} aria-label={`ดูรูปที่ ${index + 1}`} aria-current={index === active} className={`relative h-20 w-20 overflow-hidden rounded-2xl border-2 transition ${index === active ? "border-[#ef6c3d]" : "border-[#e7e1d8] hover:border-[#cfc6bb]"}`} style={{ background: color }}><Image src={image} alt={`${name} รูปที่ ${index + 1}`} fill sizes="80px" className="object-cover"/></button>)}</div>}
  </div>;
}
