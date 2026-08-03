import Link from "next/link";
import type { Metadata } from "next";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import ProductCard from "@/components/product-card";
import ClaimBoard from "@/components/claim-board";
import HeroArrivals from "@/components/hero-arrivals";
import { getCatalogProducts } from "@/lib/catalog";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getFreeShippingThreshold } from "@/lib/promotions";
import { claimableCoupons } from "@/lib/coupons";
import { pendingPaymentOrders } from "@/lib/orders";
import { absoluteUrl, jsonLdGraph, organizationId, siteDescription, siteName, websiteId } from "@/lib/site";

// The shop reads PostgreSQL on every request so anything saved in the CMS shows up immediately.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: `${siteName} | โมเดลและอะไหล่ Tamiya Mini 4WD ของแท้`, description: siteDescription, type: "website" },
};

const MARQUEE = ["Authentic Tamiya", "Race-Ready Parts", "Same-Day Dispatch", "Free Shipping", "Cash on Delivery", "Built for the Next Corner"];

const PILLARS = [
  { no: "01", title: "ของแท้ 100%", copy: "นำเข้าและคัดจากตัวแทนจำหน่าย ตรวจรหัส Tamiya ทุกกล่องก่อนส่ง" },
  { no: "02", title: "ส่งไวจากคลังไทย", copy: "สั่งก่อน 15:00 น. จัดส่งภายในวันเดียวกัน พร้อมเลขพัสดุทุกออเดอร์" },
  { no: "03", title: "ทีมที่ลงสนามจริง", copy: "แนะนำมอเตอร์ เกียร์ และเซ็ตอัพจากคนที่แข่งจริงทุกสุดสัปดาห์" },
  { no: "04", title: "แพ็กระดับนักสะสม", copy: "กันกระแทกสองชั้น กล่องไม่ยับ พร้อมเก็บเข้าชั้นได้ทันที" },
];

const STATS = [
  { value: "12,400+", label: "ออเดอร์ที่จัดส่งแล้ว" },
  { value: "4.9/5", label: "คะแนนจากลูกค้า" },
  { value: "24 ชม.", label: "จัดส่งโดยเฉลี่ย" },
];

const REVIEWS = [
  { quote: "สั่งมอเตอร์ตอนบ่าย วันรุ่งขึ้นได้ของเลย แพ็กดีมากกล่องไม่บุบสักนิด", name: "ภาคิน ว.", role: "นักแข่งสาย Flat" },
  { quote: "ถามเรื่องเซ็ตโรลเลอร์ไปในแชท ได้คำตอบละเอียดมาก เหมือนคุยกับเพื่อนในสนาม", name: "ณัฐวุฒิ ส.", role: "Mini 4WD Club BKK" },
  { quote: "ของแท้ทุกชิ้น รหัสตรงตามที่ระบุ เป็นร้านที่กล้าสั่งซ้ำโดยไม่ต้องคิดเยอะ", name: "พิมพ์มาดา ก.", role: "นักสะสมโมเดล" },
];

export default async function Home() {
  const [products, customer, freeShipping] = await Promise.all([getCatalogProducts(), getCurrentCustomer(), getFreeShippingThreshold()]);
  // An unpaid order is time-critical, so it is fetched with the coupons and shown above everything.
  const [coupons, pending] = await Promise.all([
    claimableCoupons(customer?.id),
    customer ? pendingPaymentOrders(customer.id) : Promise.resolve([]),
  ]);
  // Whatever the shop flagged in the CMS leads; with nothing flagged the newest four stand in, so
  // the section is never empty on a quiet week.
  const flagged = products.filter((product) => product.isNewArrival);
  const hasArrivals = flagged.length > 0;
  const arrivals = (flagged.length ? flagged : products).slice(0, 4);
  // The showcase leads with photographed arrivals, then anything else flagged, then the newest —
  // an empty placeholder in the hero would be worse than a shorter list.
  const withPhoto = (list: typeof products) => list.filter((product) => product.images.length > 0);
  // Up to eight: past that the strip is a scroll no one finishes, and the section below lists them all.
  const showcase = [...new Set([...withPhoto(arrivals), ...arrivals, ...withPhoto(products), ...products])].slice(0, 8);
  const spotlight = showcase[0];

  // The home page is where the shop declares what it is. The ItemList names the products the
  // page actually shows, which is what lets a "new arrivals" carousel surface in a rich result
  // instead of the page being read as one undifferentiated block of marketing copy.
  const jsonLd = jsonLdGraph({
    "@type": "WebPage",
    "@id": absoluteUrl("/#webpage"),
    url: absoluteUrl("/"),
    name: `${siteName} | โมเดลและอะไหล่ Tamiya Mini 4WD ของแท้`,
    description: siteDescription,
    isPartOf: { "@id": websiteId },
    about: { "@id": organizationId },
    inLanguage: "th-TH",
    mainEntity: {
      "@type": "ItemList",
      name: hasArrivals ? "สินค้ามาใหม่" : "สินค้าล่าสุด",
      numberOfItems: arrivals.length,
      itemListElement: arrivals.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: `Tamiya ${product.sku} ${product.name}`,
        url: absoluteUrl(`/products/${product.slug}`),
      })),
    },
  });

  return <main className="bg-white">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }}/>
    <SiteHeader customerName={customer?.name} freeShippingThreshold={freeShipping} pendingOrders={pending}/>

    <section className="ink-panel relative overflow-hidden text-white">
      <div className="hair-grid absolute inset-0 opacity-60"/>
      <div className="container-wide relative grid gap-7 py-8 sm:gap-8 sm:py-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-12 lg:py-16">
        <div>
          {/* When the shop has flagged new arrivals, the hero announces them by name instead of
              repeating the brand line — that is the news, and it changes week to week. */}
          {hasArrivals
            ? <>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#ef6c3d] px-4 py-1.5 text-[11px] font-black tracking-[.16em] uppercase">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"/>New arrivals · {flagged.length} รายการ
                </span>
                <h1 className="display-xl mt-5 max-w-2xl">ของใหม่ <span className="ember-text">เข้าแล้ว</span></h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-white/60 sm:text-base sm:leading-7">
                  {spotlight ? <>ล่าสุด <b className="font-bold text-white">{spotlight.name}</b>{flagged.length > 1 && <> และอีก {flagged.length - 1} รายการ</>} · </> : null}
                  ของแท้ พร้อมส่งจากคลังในไทย
                </p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Link href="#shop" className="rounded-full bg-[#ef6c3d] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ff8352]">ดูสินค้ามาใหม่</Link>
                  <Link href="/products" className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white/85 transition hover:border-white/50 hover:text-white">ช้อปสินค้าทั้งหมด</Link>
                </div>
              </>
            : <>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-black tracking-[.16em] uppercase backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ff9152]"/>Authorized Tamiya Selection
                </span>
                <h1 className="display-xl mt-5 max-w-2xl">เติมความเร็ว<br/><span className="ember-text">ให้ทุกคัน</span></h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-white/60 sm:text-base sm:leading-7">ของแท้ อะไหล่แท้ และของแต่งที่คัดมาแล้ว สำหรับคนที่จริงจังกับทุกโค้ง ทุกสนาม</p>
                <div className="mt-6 flex flex-wrap gap-2.5">
                  <Link href="/products" className="rounded-full bg-[#ef6c3d] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#ff8352]">ช้อปสินค้าทั้งหมด</Link>
                  <Link href="/coupons" className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white/85 transition hover:border-white/50 hover:text-white">ดูคูปองที่แจกอยู่</Link>
                </div>
              </>}
          <dl className="mt-7 grid max-w-lg grid-cols-3 gap-4 border-t border-white/10 pt-5 sm:mt-8 sm:gap-5">
            {STATS.map((stat) => <div key={stat.label}>
              <dt className="font-display text-lg font-extrabold tracking-tight md:text-xl">{stat.value}</dt>
              <dd className="mt-1 text-[11px] leading-4 text-white/45">{stat.label}</dd>
            </div>)}
          </dl>
        </div>
        {/* Up to four arrivals in one frame: big image plus thumbnails, no autoplay. */}
        <HeroArrivals products={showcase} labelNew={hasArrivals}/>
      </div>
    </section>

    <div className="marquee border-y border-[#eeebe6] bg-[#faf8f4] py-4">
      <div className="marquee-track" aria-hidden>
        {[0, 1].map((copy) => <div key={copy} className="flex shrink-0 items-center">
          {MARQUEE.map((word) => <span key={word} className="flex items-center gap-8 px-8 text-sm font-black tracking-[.2em] whitespace-nowrap text-[#9aa4ae] uppercase">{word}<span className="h-1.5 w-1.5 rounded-full bg-[#ef6c3d]"/></span>)}
        </div>)}
      </div>
    </div>

    {coupons.length > 0 && <section id="coupons" className="ink-panel relative overflow-hidden py-10 text-white sm:py-16 md:py-20">
      <div className="hair-grid absolute inset-0 opacity-50"/>
      <div className="container-wide relative">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-10 sm:gap-5 md:flex-row md:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-black tracking-[.16em] uppercase backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff9152]"/>Coupon giveaway
            </span>
            <h2 className="mt-4 text-[26px] leading-8 font-black tracking-tight sm:mt-5 sm:text-4xl sm:leading-tight md:text-5xl">กำลัง<span className="ember-text">แจกคูปอง</span></h2>
            <p className="mt-3 max-w-lg text-[14px] leading-6 text-white/55 sm:mt-4 sm:text-base sm:leading-7">กดรับเก็บไว้ก่อน แล้วเลือกใช้ตอนสั่งซื้อ ไม่ต้องพิมพ์โค้ด · มีจำนวนจำกัด</p>
          </div>
          <Link href="/coupons" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-white/20 px-6 text-[13px] font-black text-white/85 transition hover:border-white/50 hover:text-white sm:text-sm">ดูคูปองทั้งหมด →</Link>
        </div>
        <ClaimBoard initial={coupons} signedIn={Boolean(customer)} tone="dark" limit={3}/>
      </div>
    </section>}

    <section id="shop" className="bg-[#faf8f4] py-10 sm:py-14 md:py-24">
      <div className="container-wide">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:mb-10 sm:gap-5 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-2 sm:mb-3">New arrivals</p>
            <h2 className="text-[26px] leading-8 font-black tracking-tight sm:text-3xl sm:leading-10 md:text-4xl">สินค้ามาใหม่</h2>
            <p className="mt-1.5 text-[13px] text-[#687582] sm:mt-2 sm:text-sm">{hasArrivals ? "ของที่ร้านเพิ่งคัดมาให้" : "ล่าสุดที่เพิ่งเข้าคลัง"}</p>
          </div>
          <Link href="/products" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#d8d0c5] px-6 text-[13px] font-black transition hover:border-[#18212b] sm:text-sm">ดูทั้งหมด {products.length} รายการ</Link>
        </div>
        {arrivals.length === 0
          ? <p className="rounded-3xl border border-dashed border-[#d8d0c5] bg-white p-10 text-center text-[#687582] sm:p-16">ยังไม่มีสินค้าในระบบ — เพิ่มสินค้าได้ที่หน้าจัดการสินค้า</p>
          : <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">{arrivals.map((product) => <ProductCard key={product.id} product={product} sizes="(max-width: 640px) 50vw, (max-width: 1024px) 45vw, (max-width: 1280px) 30vw, 22vw"/>)}</div>}
      </div>
    </section>

    <section id="pillars" className="container-wide py-10 sm:py-14 md:py-24">
      <p className="eyebrow mb-2 sm:mb-3">Why us</p>
      <h2 className="max-w-2xl text-[26px] leading-8 font-black tracking-tight sm:text-4xl sm:leading-tight md:text-5xl">มาตรฐานที่เราไม่เคยลดให้ใคร</h2>
      <div className="mt-6 grid gap-px overflow-hidden rounded-[22px] bg-[#e8ebee] sm:mt-10 sm:grid-cols-2 sm:rounded-[28px] xl:grid-cols-4">
        {PILLARS.map((pillar) => <div key={pillar.no} className="bg-white p-5 transition sm:p-8">
          <p className="text-sm font-black text-[#ef6c3d]">{pillar.no}</p>
          <h3 className="mt-3 text-lg font-black tracking-tight sm:mt-5 sm:text-xl">{pillar.title}</h3>
          <p className="mt-2 text-[13px] leading-6 text-[#687582] sm:mt-3 sm:text-sm sm:leading-7">{pillar.copy}</p>
        </div>)}
      </div>
    </section>

    <section className="container-wide py-10 sm:py-14 md:py-24">
      <p className="eyebrow mb-2 sm:mb-3">Reviews</p>
      <h2 className="text-[26px] leading-8 font-black tracking-tight sm:text-4xl sm:leading-tight md:text-5xl">เสียงจากคนที่ลงสนามจริง</h2>
      {/* On a phone these are one swipeable strip rather than three stacked cards: three full
          testimonials in a column is a screen and a half of scrolling past the shop itself. */}
      <div className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:mx-0 sm:mt-10 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 lg:grid-cols-3">
        {REVIEWS.map((review) => <figure key={review.name} className="lift flex w-[84%] shrink-0 snap-center flex-col rounded-[22px] border border-[#e8ebee] bg-white p-5 sm:w-auto sm:rounded-[26px] sm:p-8">
          <p className="text-base text-[#ef6c3d] sm:text-lg" aria-label="ให้คะแนน 5 จาก 5">★★★★★</p>
          <blockquote className="mt-4 flex-1 text-[15px] leading-7 text-[#3c4753] sm:mt-5 sm:text-[17px] sm:leading-8">“{review.quote}”</blockquote>
          <figcaption className="mt-5 border-t border-[#eeebe6] pt-4 text-[13px] sm:mt-7 sm:pt-5 sm:text-sm"><b>{review.name}</b><span className="ml-2 text-[#98a2ac]">{review.role}</span></figcaption>
        </figure>)}
      </div>
    </section>

    <section className="container-wide pb-14 sm:pb-24">
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#ef6c3d] to-[#ff9152] px-5 py-10 text-center text-white sm:rounded-[36px] sm:px-8 sm:py-16 md:px-16">
        <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/15"/>
        <div className="absolute -bottom-24 -left-10 h-52 w-52 rounded-full bg-black/10"/>
        <div className="relative">
          <p className="text-[11px] font-black tracking-[.2em] text-white/70 uppercase">Ready to race</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-[26px] leading-8 font-black tracking-tight sm:mt-5 sm:text-4xl sm:leading-tight md:text-5xl">โค้งถัดไปรอคุณอยู่แล้ว</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-white/80 sm:mt-5 sm:text-lg sm:leading-8">{freeShipping !== null && `ส่งฟรีเมื่อซื้อครบ ฿${freeShipping.toLocaleString("th-TH")} · `}เก็บเงินปลายทางทั่วประเทศ</p>
          <Link href="/products" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#18212b] px-8 font-bold text-white transition hover:bg-[#0e141b] sm:mt-9">ช้อปเลย</Link>
        </div>
      </div>
    </section>

    <SiteFooter/>
  </main>;
}
