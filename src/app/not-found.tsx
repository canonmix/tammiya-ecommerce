import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

/**
 * The 404 a shopper lands on when a product code no longer exists.
 *
 * Discontinued parts get linked from forums and chat for years, so this page is reached more
 * often than a 404 usually is. It stays deliberately chrome-free — no header, no footer, no
 * database call — so it renders statically and answers instantly even when the shop is under
 * load, and it offers the two routes back that actually help: the catalog, and search.
 */
export const metadata: Metadata = {
  title: "ไม่พบหน้านี้",
  // A soft 404 that gets indexed competes with real pages for the same query.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <main className="ink-panel relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-16 text-center text-white">
    <div className="hair-grid absolute inset-0 opacity-50"/>
    <div className="relative w-full max-w-md">
      <Link href="/" aria-label="MINI4WD Premium Shop" className="inline-block">
        <Image src="/mini4wd-logo-mark.png" alt="MINI4WD Premium Shop" width={580} height={126} className="mx-auto h-6 w-auto"/>
      </Link>
      <p className="font-display mt-10 text-[76px] leading-none font-extrabold tracking-tight text-white/12 sm:text-[104px]">404</p>
      <h1 className="-mt-6 text-[26px] leading-8 font-black tracking-tight sm:-mt-8 sm:text-3xl">ไม่เจอหน้านี้แล้ว</h1>
      <p className="mx-auto mt-3 max-w-sm text-[14px] leading-6 text-white/55 sm:text-base sm:leading-7">สินค้าอาจถูกยกเลิกจำหน่าย หรือลิงก์เปลี่ยนไป — ลองค้นหาด้วยรหัส Tamiya อีกครั้งได้เลย</p>
      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Link href="/products" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#ef6c3d] px-7 font-bold text-white transition hover:bg-[#ff8352]">ดูสินค้าทั้งหมด</Link>
        <Link href="/" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/20 px-7 font-bold text-white/85 transition hover:border-white/50 hover:text-white">กลับหน้าแรก</Link>
      </div>
    </div>
  </main>;
}
