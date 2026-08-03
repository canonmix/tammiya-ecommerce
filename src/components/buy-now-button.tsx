"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { usePendingOrder } from "@/lib/pending-order";
import { showCartToast } from "@/lib/cart-toast";
import MobileActionBar from "@/components/mobile-action-bar";

// Step 1 of the checkout flow from the product page: drop it in the cart, then show the summary.
export default function BuyNowButton({ productId, productName, sku, price }: { productId: string; productName: string; sku: string; price: string }) {
  const router = useRouter();
  const { add } = useCart();
  const waiting = usePendingOrder();
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    if (!justAdded) return;
    const timer = setTimeout(() => setJustAdded(false), 1600);
    return () => clearTimeout(timer);
  }, [justAdded]);

  const addToCart = () => {
    add(productId);
    showCartToast(productName);
    setJustAdded(true);
  };

  // An unpaid order is already holding stock, so the only way forward is to settle it first.
  if (waiting) return <div className="mt-8 rounded-2xl border border-[#f3d9c9] bg-[#fdf3ee] p-5 lg:mb-0">
    <p className="font-black text-[#b4552a]">คุณมีคำสั่งซื้อ {waiting.code} รอชำระเงินอยู่</p>
    <p className="mt-1 text-sm leading-6 text-[#7b5c4a]">ชำระเงินหรือยกเลิกคำสั่งซื้อนั้นก่อน จึงจะหยิบสินค้าใหม่ได้</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Link href={`/checkout/payment/${waiting.code}`} className="rounded-full bg-[#ef6c3d] px-6 py-2.5 font-bold text-white transition hover:bg-[#ff8352]">ไปชำระเงิน</Link>
      <Link href="/account/orders?status=PENDING_PAYMENT" className="rounded-full border border-[#e0b79f] px-6 py-2.5 font-bold text-[#b4552a]">ดูคำสั่งซื้อ</Link>
    </div>
  </div>;

  const tick = <svg viewBox="0 0 20 20" aria-hidden className="h-4 w-4"><path fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9"/></svg>;

  return <>
    <div className="mt-8 flex flex-wrap gap-3">
      <button onClick={() => { add(productId); router.push("/cart"); }} className="rounded-full bg-[#18212b] px-7 py-3 font-bold text-white transition hover:bg-[#ef6c3d]">สั่งซื้อสินค้า</button>
      <button onClick={addToCart} className={`flex items-center gap-2 rounded-full border px-7 py-3 font-bold transition ${justAdded ? "border-[#1b7a52] bg-[#e8f7ee] text-[#1b7a52]" : "border-[#d8d0c5] hover:border-[#18212b]"}`}>
        {justAdded && tick}
        {justAdded ? "ใส่ตะกร้าแล้ว" : "ใส่ตะกร้า"}
      </button>
    </div>

    {/* On a phone the spec sheet and the suggestions push the buy action minutes away from the
        thumb, so it rides along at the bottom instead. */}
    <MobileActionBar label={`Tamiya ${sku}`} value={price} action={
      <button onClick={addToCart} className={`flex items-center gap-2 rounded-full px-6 py-3.5 font-black whitespace-nowrap text-white transition ${justAdded ? "bg-[#1b7a52]" : "bg-[#ef6c3d]"}`}>
        {justAdded && tick}{justAdded ? "เพิ่มแล้ว" : "ใส่ตะกร้า"}
      </button>
    }/>
  </>;
}
