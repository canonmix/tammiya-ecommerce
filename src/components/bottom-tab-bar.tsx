"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";

/**
 * Persistent bottom navigation for phones and iPad portrait.
 *
 * Everything below `lg` used to reach the rest of the shop through a hamburger drawer: two taps
 * and a full-screen overlay to get from a product back to the catalog. Five destinations at the
 * bottom of the screen is what a shopper's thumb already expects from every other shop on the
 * phone, and it keeps the cart count permanently in view.
 *
 * Rendered from the footer so the spacer that reserves its height sits at the end of the page
 * flow. Pages that raise their own sticky action bar (product, cart, checkout) hide it through
 * `.has-action-bar` in globals.css — two stacked bars would eat a third of a phone screen.
 */

const ICONS = {
  home: <path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M3.6 10.4 12 3.7l8.4 6.7v9a1.3 1.3 0 0 1-1.3 1.3H4.9a1.3 1.3 0 0 1-1.3-1.3Z"/>,
  grid: <path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M4 4h6v6H4Zm10 0h6v6h-6ZM4 14h6v6H4Zm10 0h6v6h-6Z"/>,
  ticket: <path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M3.5 8.2V6.4c0-.5.4-.9.9-.9h15.2c.5 0 .9.4.9.9v1.8a2.4 2.4 0 0 0 0 4.8v4.6c0 .5-.4.9-.9.9H4.4a.9.9 0 0 1-.9-.9V13a2.4 2.4 0 0 0 0-4.8Zm11.4-1.4v10.4"/>,
  cart: <><path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M2.9 3.7h2l2.1 9.9a1.6 1.6 0 0 0 1.6 1.3h7.3a1.6 1.6 0 0 0 1.6-1.3l1.4-6.3H5.5"/><circle cx="9" cy="19" r="1.4" fill="currentColor"/><circle cx="16" cy="19" r="1.4" fill="currentColor"/></>,
  user: <path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M12 11.6a3.8 3.8 0 1 0 0-7.6 3.8 3.8 0 0 0 0 7.6ZM4.8 20.2a7.2 7.2 0 0 1 14.4 0"/>,
};

const TABS = [
  { href: "/", label: "หน้าแรก", icon: ICONS.home },
  { href: "/products", label: "สินค้า", icon: ICONS.grid },
  { href: "/coupons", label: "คูปอง", icon: ICONS.ticket },
  { href: "/cart", label: "ตะกร้า", icon: ICONS.cart, badge: true },
  { href: "/account", label: "บัญชี", icon: ICONS.user },
] as const;

export default function BottomTabBar() {
  const pathname = usePathname();
  const { count } = useCart();

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  // Only below `md`. From there up the header carries the same links in full, and two navigations
  // showing the same four destinations is clutter, not redundancy.
  return <div className="tab-bar-root md:hidden">
    {/* Reserves the bar's height at the end of the page so the footer never sits under it. Ink,
        not transparent: it sits directly under the footer, and a rounding difference against the
        bar's own height would otherwise show as a white sliver at the very bottom of a scroll. */}
    <div aria-hidden className="h-[calc(4.25rem+env(safe-area-inset-bottom))] bg-[#0e141b]"/>
    <nav aria-label="เมนูหลัก" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0e141b]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="grid grid-cols-5">
        {TABS.map((tab) => {
          const active = isActive(tab.href);
          return <li key={tab.href}>
            <Link href={tab.href} aria-current={active ? "page" : undefined} className={`flex min-h-[4.25rem] flex-col items-center justify-center gap-1 px-1 transition-colors ${active ? "text-white" : "text-white/50"}`}>
              <span className="relative">
                <svg viewBox="0 0 24 24" aria-hidden className="h-6 w-6">{tab.icon}</svg>
                {"badge" in tab && count > 0 && <span className="font-display absolute -top-1.5 -right-2.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#ef6c3d] px-1 text-[10px] leading-none font-black text-white tabular-nums">{count > 99 ? "99+" : count}</span>}
              </span>
              <span className="text-[10.5px] leading-none font-bold">{tab.label}</span>
              {/* An underline instead of a colour-only cue: colour alone is not a state signal. */}
              <span aria-hidden className={`h-0.5 w-6 rounded-full transition-colors ${active ? "bg-[#ef6c3d]" : "bg-transparent"}`}/>
            </Link>
          </li>;
        })}
      </ul>
    </nav>
  </div>;
}
