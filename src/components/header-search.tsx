"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Search from the header.
 *
 * In this hobby the first thing anyone does is type a part code, and until now the only search
 * box in the shop was halfway down the catalog page — so from a product page, finding another
 * code meant going back to the listing first. On a phone the field opens as a sheet under the
 * header; from `lg` up it is simply always there.
 *
 * Submitting lands on `/products?q=…`, which is the same URL the site's SearchAction advertises
 * to search engines, so the two can never drift apart.
 */
export default function HeaderSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const mobileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) mobileInput.current?.focus();
  }, [open]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    router.push(query ? `/products?q=${encodeURIComponent(query)}` : "/products");
    setOpen(false);
  };

  const field = (ref?: React.Ref<HTMLInputElement>, autoComplete = "off") => <>
    <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-white/40"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 4 4"/></svg>
    <input
      ref={ref}
      type="search"
      name="q"
      value={term}
      onChange={(event) => setTerm(event.target.value)}
      autoComplete={autoComplete}
      enterKeyHint="search"
      placeholder="ค้นหารหัส Tamiya หรือชื่อสินค้า"
      aria-label="ค้นหาสินค้า"
      // 16px on the field itself: iOS zooms the whole page in on focus for anything smaller.
      className="min-h-11 w-full rounded-full border border-white/12 bg-white/[.06] pr-4 pl-10 text-[16px] text-white placeholder:text-white/35 outline-none transition focus:border-[#ef6c3d] lg:text-sm"
    />
  </>;

  return <>
    <form onSubmit={submit} role="search" className="relative hidden min-w-0 flex-1 lg:block lg:max-w-xs">{field()}</form>

    <button type="button" onClick={() => setOpen(true)} aria-label="ค้นหาสินค้า" aria-expanded={open} className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 text-white lg:hidden">
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5 12 4 4"/></svg>
    </button>

    {open && <div className="fixed inset-0 z-50 lg:hidden">
      <button type="button" aria-label="ปิดการค้นหา" onClick={() => setOpen(false)} className="absolute inset-0 h-full w-full bg-black/55 backdrop-blur-sm"/>
      <div className="absolute inset-x-0 top-0 bg-[#0e141b] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-4">
        <form onSubmit={submit} role="search" className="flex items-center gap-2">
          <span className="relative min-w-0 flex-1">{field(mobileInput)}</span>
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 shrink-0 px-2 text-sm font-bold text-white/60">ยกเลิก</button>
        </form>
        <p className="mt-3 text-[12px] text-white/40">ค้นหาด้วยรหัส เช่น <b className="font-bold text-white/70">15437</b> ชื่อสินค้า หรือชื่อหมวดหมู่</p>
      </div>
    </div>}
  </>;
}
