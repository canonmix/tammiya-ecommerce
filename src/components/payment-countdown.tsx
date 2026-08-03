"use client";

import { useEffect, useState } from "react";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * The time left to pay for an order, ticking every second.
 *
 * Stock is held only until the deadline, so this is the one number a shopper with an unpaid
 * order actually needs. The server still decides when an order really lapses — this is display.
 */
export default function PaymentCountdown({ expiresAt, tone = "light", full = false }: { expiresAt: string; tone?: "light" | "dark"; full?: boolean }) {
  const deadline = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  // The server pass renders nothing: any number printed there is already stale on arrival.
  if (remaining === null) return null;

  const seconds = Math.floor(remaining / 1000);
  const clock = `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
  const done = remaining === 0;
  const dark = tone === "dark";

  // `full` gives the clock its own row on a phone: sharing a line with the pay button left it
  // cramped, and the time left is the thing being read, not a decoration beside the button.
  return <span className={`font-display items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-extrabold whitespace-nowrap tabular-nums ${
    full ? "flex w-full justify-center sm:inline-flex sm:w-auto sm:justify-start" : "inline-flex shrink-0"
  } ${done ? "bg-[#f4f2ee] text-[#7b8792]" : dark ? "bg-white/15 text-white" : "bg-[#fdecec] text-[#c0392b]"}`}>
    {!done && <span className={`h-2 w-2 shrink-0 animate-pulse rounded-full ${dark ? "bg-white" : "bg-[#c0392b]"}`}/>}
    {done ? "หมดเวลาชำระเงิน" : <>เหลือเวลา {clock}</>}
  </span>;
}
