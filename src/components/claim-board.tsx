"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type Coupon } from "@/lib/coupon-shared";

export type BoardCoupon = Coupon & { claimed: boolean; claimsLeft: number | null };

const pad = (value: number) => String(value).padStart(2, "0");

/** The big number on the stub: "20%" or "฿50". */
const headline = (coupon: BoardCoupon) =>
  coupon.type === "PERCENT" ? `${coupon.value}%` : `฿${coupon.value.toLocaleString("th-TH")}`;

/**
 * How much of the giveaway is left, as a bar and a percentage.
 *
 * A raw "เหลือ 3 สิทธิ์" says nothing about how fast it is going; the same three out of five
 * reads very differently from three out of a thousand, which is what the percentage carries.
 */
function QuotaBar({ coupon, tone }: { coupon: BoardCoupon; tone: "dark" | "light" }) {
  if (coupon.claimLimit <= 0 || coupon.claimsLeft === null) return null;
  const left = Math.round((coupon.claimsLeft / coupon.claimLimit) * 100);
  const dark = tone === "dark";
  const gone = coupon.claimsLeft === 0;
  const low = left <= 20 && !gone;

  return <div className="mt-2.5 max-w-[220px]">
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${dark ? "bg-white/15" : "bg-[#f0eeea]"}`}>
      <div
        className={`h-full rounded-full transition-all ${gone ? "bg-[#c7ccd1]" : low ? "bg-[#c0392b]" : "bg-gradient-to-r from-[#ff9152] to-[#ef6c3d]"}`}
        style={{ width: `${Math.max(left, left > 0 ? 4 : 0)}%` }}
      />
    </div>
    <p className={`mt-1.5 text-[11px] font-bold ${dark ? "text-white/55" : "text-[#98a2ac]"}`}>
      {gone
        ? <span className="text-[#98a2ac]">เก็บครบแล้ว · {coupon.claimedCount}/{coupon.claimLimit}</span>
        : <><span className={low ? "text-[#c0392b]" : dark ? "text-[#ffc9a8]" : "text-[#b4552a]"}>เหลืออีก {left}%</span>{low && " · ใกล้หมดแล้ว"} · เก็บแล้ว {coupon.claimedCount}/{coupon.claimLimit}</>}
    </p>
  </div>;
}

/** "1 วัน 04:12:30" — a giveaway that ends is only urgent if the clock is visible. */
function Countdown({ endsAt, tone }: { endsAt: string; tone: "dark" | "light" }) {
  const deadline = new Date(endsAt).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  // Nothing is rendered on the server pass: the number would be wrong the moment it arrived.
  if (remaining === null) return null;
  const seconds = Math.floor(remaining / 1000);
  const days = Math.floor(seconds / 86400);
  const clock = `${pad(Math.floor((seconds % 86400) / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black tabular-nums ${tone === "dark" ? "bg-white/10 text-[#ffc9a8]" : "bg-[#fdf3ee] text-[#b4552a]"}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-[#ff9152]"/>
    เหลือ {days > 0 && `${days} วัน `}{clock}
  </span>;
}

/**
 * The giveaway board: the coupons on offer right now, with a claim button on each.
 *
 * It is rendered on the home page and on /coupons from data the server already fetched, so the
 * offer is visible on first paint; the client only takes over once someone presses claim.
 */
export default function ClaimBoard({
  initial, signedIn, tone = "light", limit,
}: { initial: BoardCoupon[]; signedIn: boolean; tone?: "dark" | "light"; limit?: number }) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const reload = useCallback(async () => {
    const data = await fetch("/api/coupons/available", { cache: "no-store" }).then((response) => response.json()).catch(() => null);
    if (Array.isArray(data)) setCoupons(data);
  }, []);

  const claim = async (coupon: BoardCoupon) => {
    if (!signedIn) { router.push(`/login?next=${encodeURIComponent("/coupons")}`); return; }
    setBusy(coupon.id);
    setMessage(null);
    const response = await fetch("/api/account/coupons/claim", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ couponId: coupon.id }),
    }).catch(() => null);
    const data = (await response?.json().catch(() => null)) as { error?: string } | null;
    setBusy(null);
    await reload();
    setMessage(response?.ok
      ? { tone: "ok", text: `รับ “${coupon.name}” เข้ากระเป๋าแล้ว เลือกใช้ได้ตอนสั่งซื้อ` }
      : { tone: "error", text: data?.error ?? "กดรับไม่สำเร็จ ลองใหม่อีกครั้ง" });
    // The wallet page and the cart picker both read from the server, so refresh what is cached.
    router.refresh();
  };

  // Whatever can still be pressed floats up: claimed ones next, then the ones already given away.
  const rank = (coupon: BoardCoupon) => (coupon.claimsLeft === 0 ? 2 : coupon.claimed ? 1 : 0);
  const ordered = [...coupons].sort((a, b) => rank(a) - rank(b));
  const shown = limit ? ordered.slice(0, limit) : ordered;
  if (shown.length === 0) return null;

  const dark = tone === "dark";
  const card = dark ? "border-white/12 bg-white/[.05] backdrop-blur" : "border-[#f3d9c9] bg-white";
  // The punched holes must match whatever the section behind the card is painted with.
  const hole = dark ? "bg-[#0e141b]" : "bg-white";

  return <div>
    {message && <p role="status" className={`mb-5 rounded-2xl px-5 py-4 text-sm font-bold ${message.tone === "ok" ? "bg-[#e8f7ee] text-[#1b7a52]" : "bg-[#fdecec] text-[#c0392b]"}`}>{message.text}</p>}

    <div className="grid gap-3 xl:grid-cols-2">
      {shown.map((coupon) => <article key={coupon.id} className={`relative flex overflow-hidden rounded-2xl border ${card}`}>
        {/* Coloured stub, perforated seam, then the terms — the same ticket used in the wallet. */}
        <div className={`flex w-24 shrink-0 flex-col items-center justify-center px-2 py-5 text-center text-white sm:w-28 ${
          coupon.claimsLeft === 0 && !coupon.claimed ? "bg-[#c7ccd1]" : "bg-gradient-to-b from-[#ff9152] to-[#ef6c3d]"
        }`}>
          <p className="font-display text-2xl leading-7 font-extrabold tracking-tight sm:text-[26px]">{headline(coupon)}</p>
          <p className="mt-0.5 text-[11px] font-bold opacity-80">ส่วนลด</p>
          {coupon.type === "PERCENT" && coupon.maxDiscount > 0 && <p className="mt-1 text-[10px] leading-4 opacity-75">สูงสุด ฿{coupon.maxDiscount.toLocaleString("th-TH")}</p>}
        </div>
        <span aria-hidden className={`w-0 border-l border-dashed ${dark ? "border-white/20" : "border-[#f3d9c9]"}`}/>
        <span aria-hidden className={`absolute -top-2 left-24 h-4 w-4 -translate-x-1/2 rounded-full sm:left-28 ${hole}`}/>
        <span aria-hidden className={`absolute -bottom-2 left-24 h-4 w-4 -translate-x-1/2 rounded-full sm:left-28 ${hole}`}/>

        <div className="flex min-w-0 flex-1 items-center gap-3 p-3.5 sm:gap-4 sm:p-4">
          <div className="min-w-0 flex-1">
            <p className={`leading-6 font-black break-words ${dark ? "text-white" : ""}`}>{coupon.name}</p>
            <p className={`mt-1 text-xs ${dark ? "text-white/45" : "text-[#98a2ac]"}`}>
              {coupon.minSubtotal > 0 ? `ซื้อครบ ฿${coupon.minSubtotal.toLocaleString("th-TH")}` : "ไม่มียอดขั้นต่ำ"}
              {coupon.endsAt && ` · ใช้ได้ถึง ${new Date(coupon.endsAt).toLocaleDateString("th-TH", { dateStyle: "medium" })}`}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {coupon.claimed && <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f7ee] px-2.5 py-1 text-[11px] font-black text-[#1b7a52]">
                <svg viewBox="0 0 20 20" aria-hidden className="h-3 w-3"><path fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" d="m4 10.5 4 4 8-9"/></svg>กดรับแล้ว
              </span>}
              {coupon.claimEndsAt && coupon.claimsLeft !== 0 && <Countdown endsAt={coupon.claimEndsAt} tone={tone}/>}
            </div>
            <QuotaBar coupon={coupon} tone={tone}/>
          </div>

          <div className="shrink-0 text-right">
            {coupon.claimed
              ? <Link href="/cart" className={`block rounded-full border px-5 py-2.5 text-center text-sm font-black whitespace-nowrap ${dark ? "border-white/25 text-white" : "border-[#ef6c3d] text-[#ef6c3d] hover:bg-[#fdf3ee]"}`}>ใช้เลย</Link>
              : coupon.claimsLeft === 0
                ? <span className={`block rounded-full px-5 py-2.5 text-center text-sm font-bold whitespace-nowrap ${dark ? "bg-white/10 text-white/45" : "bg-[#f0eeea] text-[#98a2ac]"}`}>สิทธิ์เต็มแล้ว</span>
                : <button onClick={() => claim(coupon)} disabled={busy === coupon.id} className="rounded-full bg-[#ef6c3d] px-6 py-2.5 text-sm font-black whitespace-nowrap text-white transition hover:bg-[#ff8352] disabled:bg-[#c7ccd1]">
                    {busy === coupon.id ? "กำลังรับ..." : signedIn ? "กดรับ" : "เข้าสู่ระบบเพื่อรับ"}
                  </button>}
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}
