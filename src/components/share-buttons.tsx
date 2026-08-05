"use client";

import { useEffect, useState } from "react";

/**
 * Share a product to LINE, to Facebook, or through whatever the phone itself offers.
 *
 * The card that appears in the chat is not built here — it comes from the page's Open Graph
 * tags and from `products/[slug]/opengraph-image.tsx`, which draws the photo, the Tamiya code,
 * the name and the price. LINE and Facebook both fetch that from the URL, which is why every
 * button below shares the canonical absolute URL and never `window.location`: a link copied from
 * a preview deploy or from localhost would render no card at all.
 *
 * `navigator.share` leads on a phone when it exists — it opens the same sheet the shopper uses
 * for everything else, LINE included, and it is one tap instead of a browser hop.
 */
export default function ShareButtons({ url, title, sku }: { url: string; title: string; sku: string }) {
  // Resolved after mount: `navigator.share` is missing on desktop Chrome and on any insecure
  // origin, and rendering the button from the server would flash one that cannot work.
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const encoded = encodeURIComponent(url);
  const lineHref = `https://social-plugins.line.me/lineit/share?url=${encoded}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encoded}`;

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: `${title} · Tamiya ${sku}`, url });
    } catch {
      // A cancelled sheet rejects the same way a failure does; neither is worth reporting.
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-bold transition";

  return <div className="mt-6 border-t border-[#eeebe6] pt-5 sm:mt-8">
    <p className="mb-3 text-[12px] font-bold text-[#98a2ac]">แชร์สินค้านี้</p>
    <div className="flex flex-wrap gap-2">
      <a href={lineHref} target="_blank" rel="noopener noreferrer" aria-label={`แชร์ ${title} ไปยัง LINE`} className={`${base} bg-[#06c755] text-white hover:bg-[#05b04c]`}>
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor"><path d="M12 3C6.9 3 2.75 6.36 2.75 10.5c0 3.71 3.29 6.82 7.74 7.41.3.06.71.2.81.46.09.23.06.6.03.84l-.13.79c-.04.23-.19.9.79.49s5.25-3.1 7.16-5.3c1.32-1.45 1.95-2.92 1.95-4.69C21.1 6.36 16.95 3 12 3ZM8.03 12.9h-1.9a.34.34 0 0 1-.34-.34V8.79c0-.19.15-.34.34-.34h.47c.19 0 .34.15.34.34v2.94h1.09c.19 0 .34.15.34.34v.47c0 .19-.15.34-.34.34Zm2.06-.34c0 .19-.15.34-.34.34h-.47a.34.34 0 0 1-.34-.34V8.79c0-.19.15-.34.34-.34h.47c.19 0 .34.15.34.34v3.77Zm4.15 0c0 .19-.15.34-.34.34h-.47a.34.34 0 0 1-.27-.14l-1.53-2.07v1.87c0 .19-.15.34-.34.34h-.47a.34.34 0 0 1-.34-.34V8.79c0-.19.15-.34.34-.34h.5c.1 0 .2.05.26.13l1.51 2.05V8.79c0-.19.15-.34.34-.34h.47c.19 0 .34.15.34.34v3.77Zm3.15-3.3c0 .19-.15.34-.34.34h-1.09v.42h1.09c.19 0 .34.15.34.34v.47c0 .19-.15.34-.34.34h-1.09v.42h1.09c.19 0 .34.15.34.34v.47c0 .19-.15.34-.34.34h-1.9a.34.34 0 0 1-.34-.34V8.79c0-.19.15-.34.34-.34h1.9c.19 0 .34.15.34.34v.47Z"/></svg>
        LINE
      </a>
      <a href={facebookHref} target="_blank" rel="noopener noreferrer" aria-label={`แชร์ ${title} ไปยัง Facebook`} className={`${base} bg-[#1877f2] text-white hover:bg-[#166fe0]`}>
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="currentColor"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"/></svg>
        Facebook
      </a>

      {canShare && <button type="button" onClick={nativeShare} aria-label={`แชร์ ${title} ด้วยแอปอื่น`} className={`${base} border border-[#d8d0c5] text-[#465360] hover:border-[#18212b]`}>
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M12 3.5v11m0-11L8.4 7.1M12 3.5l3.6 3.6M5.5 12.6v6a1.6 1.6 0 0 0 1.6 1.6h9.8a1.6 1.6 0 0 0 1.6-1.6v-6"/></svg>
        แชร์อื่น ๆ
      </button>}

      <button type="button" onClick={copy} aria-label={`คัดลอกลิงก์ ${title}`} className={`${base} border ${copied ? "border-[#1b7a52] bg-[#e8f7ee] text-[#1b7a52]" : "border-[#d8d0c5] text-[#465360] hover:border-[#18212b]"}`}>
        {copied
          ? <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9"/></svg>
          : <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M9.5 14.5a3.4 3.4 0 0 0 5 .3l2.4-2.4a3.4 3.4 0 0 0-4.8-4.8l-1.4 1.3m.8 5.6a3.4 3.4 0 0 1-5-.3 3.4 3.4 0 0 1 .2-4.5l2.4-2.4a3.4 3.4 0 0 1 4.8 0"/></svg>}
        {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
      </button>
    </div>
  </div>;
}
