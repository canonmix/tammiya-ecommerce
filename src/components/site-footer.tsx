import Link from "next/link";
import BrandMark from "@/components/brand-mark";
import BottomTabBar from "@/components/bottom-tab-bar";
import { getCatalogCategories } from "@/lib/catalog";

const COLUMNS = [
  { title: "ช่วยเหลือ", links: [{ href: "/payment", label: "วิธีการชำระเงิน" }, { href: "/#service", label: "การจัดส่ง" }, { href: "/coupons", label: "คูปองส่วนลด" }, { href: "/account/orders", label: "ติดตามคำสั่งซื้อ" }] },
  { title: "ร้านค้า", links: [{ href: "/#pillars", label: "ทำไมต้องเรา" }, { href: "/products", label: "สินค้าทั้งหมด" }, { href: "/cart", label: "ตะกร้าสินค้า" }, { href: "/admin", label: "สำหรับผู้ดูแล" }] },
];

/**
 * Site footer, plus the bottom tab bar it carries for small screens.
 *
 * The category column is read from the database rather than hardcoded: a footer link to a
 * category the shop no longer stocks is a 0-result page for a shopper and a wasted internal link
 * for a crawler. These links are also how category listings get linked from every page on the
 * site, which is what makes them worth indexing in the first place.
 */
export default async function SiteFooter() {
  const categories = await getCatalogCategories().catch(() => []);
  const year = new Date().getFullYear();

  return <>
    <footer id="service" className="bg-[#0e141b] pt-10 pb-8 text-white md:pt-20 md:pb-10">
      <div className="container-wide grid grid-cols-2 gap-x-6 gap-y-8 border-b border-white/10 pb-9 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-12 md:pb-14">
        <div className="col-span-2 md:col-span-1">
          <BrandMark className="text-lg md:text-xl"/>
          <p className="mt-4 max-w-xs text-[13px] leading-6 text-white/50 md:mt-6 md:text-sm md:leading-7">โมเดล อะไหล่ และของแต่ง Mini 4WD ของแท้ คัดมาแล้วสำหรับคนที่จริงจังกับทุกสนาม</p>
          <a href="tel:09xxxxxxxx" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-white/80 transition hover:text-[#ff9152] md:mt-6">Support 09x-xxx-xxxx</a>
        </div>

        {categories.length > 0 && <div>
          <p className="eyebrow-invert mb-4 md:mb-5">หมวดหมู่</p>
          <ul className="-my-1.5 text-[13px] text-white/60 md:text-sm">
            {categories.slice(0, 6).map((category) => <li key={category.name}>
              <Link href={`/products?category=${encodeURIComponent(category.name)}`} className="block py-1.5 transition hover:text-[#ff9152]">{category.name}</Link>
            </li>)}
          </ul>
        </div>}

        {COLUMNS.map((column) => <div key={column.title}>
          <p className="eyebrow-invert mb-4 md:mb-5">{column.title}</p>
          <ul className="-my-1.5 text-[13px] text-white/60 md:text-sm">{column.links.map((link) => <li key={link.label}><Link href={link.href} className="block py-1.5 transition hover:text-[#ff9152]">{link.label}</Link></li>)}</ul>
        </div>)}
      </div>
      <div className="container-wide flex flex-col justify-between gap-2 pt-6 text-[11px] text-white/40 md:flex-row md:pt-8 md:text-xs">
        <span>© {year} MOJUNG-SHOP · จำหน่ายสินค้า Tamiya ของแท้</span>
        <span>ชำระเงินปลายทาง · QR Payment · โอนผ่านธนาคาร</span>
      </div>
    </footer>
    <BottomTabBar/>
  </>;
}
