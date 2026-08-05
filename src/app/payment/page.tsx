import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import SiteHeader from "@/components/site-header";
import SiteFooter from "@/components/site-footer";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getFreeShippingThreshold } from "@/lib/promotions";
import { pendingPaymentOrders } from "@/lib/orders";
import { absoluteUrl, breadcrumbSchema, jsonLdGraph, organizationId } from "@/lib/site";

// One drawing style for the whole journey: 24px grid, 1.6 stroke, round caps.
const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

const icons: Record<string, ReactNode> = {
  browse: <><path {...stroke} d="M2.75 3.75h2.1l2.2 10.4a1.7 1.7 0 0 0 1.66 1.35h7.7a1.7 1.7 0 0 0 1.66-1.3L19.6 7.1H5.6"/><circle {...stroke} cx="9.2" cy="19.4" r="1.5"/><circle {...stroke} cx="16.4" cy="19.4" r="1.5"/></>,
  signin: <><path {...stroke} d="M13.6 3.2h4.3a2 2 0 0 1 2 2v13.6a2 2 0 0 1-2 2h-4.3"/><path {...stroke} d="m9.4 8.2 3.9 3.8-3.9 3.8"/><path {...stroke} d="M13.3 12H3.6"/></>,
  review: <><path {...stroke} d="M9.2 4.4H7.4a1.9 1.9 0 0 0-1.9 1.9v13.1a1.9 1.9 0 0 0 1.9 1.9h9.2a1.9 1.9 0 0 0 1.9-1.9V6.3a1.9 1.9 0 0 0-1.9-1.9h-1.8"/><rect {...stroke} x="9.2" y="2.4" width="5.6" height="4" rx="1.4"/><path {...stroke} d="m9.1 14.1 2.2 2.2 3.9-4.6"/></>,
  pay: <><rect {...stroke} x="3" y="3" width="7" height="7" rx="1.8"/><rect {...stroke} x="14" y="3" width="7" height="7" rx="1.8"/><rect {...stroke} x="3" y="14" width="7" height="7" rx="1.8"/><path {...stroke} d="M14 14h3.4v3.4H14zM20.6 14v.1M14 20.6h.1M17.6 20.6h3M20.6 17.4v3.2"/></>,
  ship: <><rect {...stroke} x="2.4" y="6" width="11.2" height="9.6" rx="1.8"/><path {...stroke} d="M13.6 9.4h3.1l3.6 3.4v2.8h-6.7"/><circle {...stroke} cx="7" cy="18.4" r="1.9"/><circle {...stroke} cx="17.1" cy="18.4" r="1.9"/></>,
};

const steps = [
  { number: "01", key: "browse", kicker: "BROWSE", title: "หยิบใส่ตะกร้า", detail: "เลือกโมเดลและอะไหล่ที่ชอบ" },
  { number: "02", key: "signin", kicker: "SIGN IN", title: "เข้าสู่ระบบ", detail: "ยืนยันตัวตนและที่อยู่จัดส่ง" },
  { number: "03", key: "review", kicker: "REVIEW", title: "ตรวจสอบและสั่งซื้อ", detail: "เช็กรายการ ที่อยู่ และยอดรวม" },
  { number: "04", key: "pay", kicker: "PAY", title: "สแกน QR จ่ายเงิน", detail: "ชำระตามยอดในคำสั่งซื้อ" },
  { number: "05", key: "ship", kicker: "SHIP", title: "รับเลข Tracking", detail: "จัดส่งและแจ้งเลขในวันถัดไป" },
];

const faqs = [
  { q: "จ่ายด้วยอะไรได้บ้าง", a: "สแกน QR PromptPay จากแอปธนาคารใดก็ได้ หรือเลือกเก็บเงินปลายทางตอนสั่งซื้อ" },
  { q: "มีเวลาจ่ายนานแค่ไหน", a: "ระบบจองสินค้าไว้ให้ 1 ชั่วโมง มีนาฬิกานับถอยหลังในหน้าชำระเงิน ถ้าเลยกำหนดออเดอร์จะถูกยกเลิกและคืนสินค้าเข้าสต็อกอัตโนมัติ" },
  { q: "จ่ายแล้วต้องทำอะไรต่อ", a: "แนบรูปสลิปในหน้าเดิม ระบบตรวจกับธนาคารให้อัตโนมัติ ปกติรู้ผลในไม่กี่วินาที" },
  { q: "ของส่งเมื่อไหร่", a: "สั่งและชำระก่อน 15:00 น. จัดส่งภายในวันเดียวกัน พร้อมแจ้งเลขพัสดุในประวัติการสั่งซื้อ" },
];

function StepIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7">{icons[name]}</svg>;
}

// A 4×4 checker used as the finish marker at the end of the progress rail.
function FinishFlag() {
  return <span aria-hidden className="grid h-6 w-6 grid-cols-4 grid-rows-4 overflow-hidden rounded-[5px] ring-1 ring-[#18212b]/15">{Array.from({ length: 16 }).map((_, index) => <span key={index} className={(Math.floor(index / 4) + index) % 2 === 0 ? "bg-[#18212b]" : "bg-white"} />)}</span>;
}

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "วิธีการชำระเงิน",
  description: "ขั้นตอนสั่งซื้อและชำระเงินของ MOJUNG-SHOP — สแกน QR PromptPay หรือเก็บเงินปลายทาง พร้อมแจ้งเลขพัสดุทุกออเดอร์",
  alternates: { canonical: "/payment" },
};

export default async function PaymentPage() {
  const [customer, freeShipping] = await Promise.all([getCurrentCustomer(), getFreeShippingThreshold()]);
  const pending = customer ? await pendingPaymentOrders(customer.id) : [];

  // "จ่ายยังไง" and "ของส่งเมื่อไหร่" are asked in search as often as they are asked in chat.
  // Marked up, the answers can appear straight in the result instead of behind a click — and the
  // ordered steps are the same five the page already shows, so the two cannot drift.
  const jsonLd = jsonLdGraph(
    breadcrumbSchema([["หน้าแรก", "/"], ["วิธีการชำระเงิน", "/payment"]]),
    {
      "@type": "FAQPage",
      "@id": absoluteUrl("/payment#faq"),
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.q,
        acceptedAnswer: { "@type": "Answer", text: faq.a },
      })),
    },
    {
      "@type": "HowTo",
      "@id": absoluteUrl("/payment#howto"),
      name: "วิธีสั่งซื้อและชำระเงิน",
      description: "ขั้นตอนสั่งซื้อสินค้า Tamiya Mini 4WD ตั้งแต่หยิบใส่ตะกร้าจนได้รับเลขพัสดุ",
      inLanguage: "th-TH",
      publisher: { "@id": organizationId },
      step: steps.map((step, index) => ({
        "@type": "HowToStep",
        position: index + 1,
        name: step.title,
        text: step.detail,
        url: absoluteUrl(`/payment#step-${index + 1}`),
      })),
    },
  );

  return <main className="bg-white">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }}/>
    {/* Same shell as the catalogue: one header, one footer, one set of nav links. */}
    <SiteHeader customerName={customer?.name} freeShippingThreshold={freeShipping} pendingOrders={pending}/>

    <section className="ink-panel relative overflow-hidden text-white">
      <div className="hair-grid absolute inset-0 opacity-60"/>
      <div className="container-wide relative grid gap-8 py-10 sm:gap-12 sm:py-14 md:grid-cols-[1.05fr_.95fr] md:items-center md:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-black tracking-[.16em] uppercase backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-[#ff9152]"/>Payment journey · 05 steps
          </span>
          <h1 className="display mt-5 sm:mt-7">สั่งง่าย<br/><span className="ember-text">จ่ายสบาย</span></h1>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-white/60 sm:mt-7 sm:text-lg sm:leading-8">ทุกโค้งของการสั่งซื้อถูกออกแบบให้ชัดเจน ตั้งแต่เลือกสินค้าไปจนถึงวันที่ได้รับเลขพัสดุ</p>
          <div className="mt-6 flex flex-wrap gap-2.5 sm:mt-9 sm:gap-3">
            <Link href="/products" className="inline-flex min-h-12 items-center rounded-full bg-[#ef6c3d] px-7 font-bold text-white transition hover:bg-[#ff8352]">เลือกสินค้าเลย</Link>
            <Link href="/coupons" className="inline-flex min-h-12 items-center rounded-full border border-white/20 px-7 font-bold text-white/85 transition hover:border-white/50 hover:text-white">ดูคูปองที่แจกอยู่</Link>
          </div>
        </div>

        {/* The QR is the one thing everyone recognises about paying here, so it is the hero art. */}
        <div className="relative min-h-[260px] md:min-h-[380px]">
          <div className="absolute top-8 left-2 h-40 w-40 rounded-[36px] border border-white/15 bg-white/[.04] md:top-14 md:left-16 md:h-64 md:w-64"/>
          <div className="absolute right-0 bottom-2 h-36 w-36 rounded-full border-[18px] border-[#ef6c3d] md:right-12 md:h-64 md:w-64 md:border-[30px]"/>
          <div className="font-display absolute top-2 right-6 rotate-12 text-[88px] leading-none font-extrabold text-white/10 md:text-[170px]">QR</div>
          <div className="absolute bottom-4 left-6 rotate-[-8deg] rounded-3xl bg-white p-4 text-[#18212b] shadow-2xl md:left-24 md:p-7">
            <div className="grid h-24 w-24 grid-cols-5 gap-1 md:h-40 md:w-40 md:gap-2">
              {Array.from({ length: 25 }).map((_, index) => <span key={index} className={`${[0,1,3,5,7,9,12,13,15,17,18,20,22,24].includes(index) ? "bg-[#18212b]" : "bg-white"} rounded-sm border border-[#18212b]/10`}/>)}
            </div>
            <p className="code-plate mt-3 justify-center text-[10px]">Scan to pay</p>
          </div>
        </div>
      </div>
    </section>

    <section className="container-wide py-14 md:py-24">
      <div className="grid gap-5 md:grid-cols-[.75fr_1.25fr] md:items-end">
        <div>
          <p className="eyebrow mb-3">How it works</p>
          <h2 className="max-w-md text-3xl leading-tight font-black tracking-tight md:text-5xl">จากหน้าร้าน<br/>ถึงหน้าบ้าน</h2>
        </div>
        <p className="max-w-md leading-8 text-[#687582] md:text-lg">ทำตาม 5 ขั้นตอนนี้ได้เลย เราดูแลให้ตั้งแต่ต้นจนจบ</p>
      </div>

      <div className="relative mt-10 md:mt-16">
        {/* The rail runs between the first and last node centres — each column is 20% wide, so its centre sits at 10%. */}
        <span aria-hidden className="absolute top-7 right-[10%] left-[10%] hidden h-px bg-[linear-gradient(90deg,#ded6cb_0_6px,transparent_6px_12px)] bg-[length:12px_1px] md:block"/>
        <span aria-hidden className="absolute top-[22px] left-0 hidden h-2.5 w-2.5 rounded-full bg-[#ef6c3d] md:block"/>
        <span aria-hidden className="absolute top-[16px] right-0 hidden md:block"><FinishFlag/></span>
        <ol className="grid gap-5 md:grid-cols-5 md:gap-4">{steps.map((step, index) => <li key={step.number} id={`step-${index + 1}`} className="group relative flex scroll-mt-24 gap-4 md:flex-col md:gap-0">
          <div className="relative flex flex-col items-center md:block">
            <span className="font-display relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#ded6cb] bg-white text-sm font-extrabold tracking-wider transition duration-300 group-hover:border-[#ef6c3d] group-hover:bg-[#ef6c3d] group-hover:text-white md:mx-auto md:h-14 md:w-14">{step.number}</span>
            {index < steps.length - 1 && <span aria-hidden className="mt-1.5 w-px flex-1 bg-[#ded6cb] md:hidden"/>}
          </div>
          <div className="lift flex flex-1 flex-col rounded-[26px] border border-[#e8ebee] bg-white p-5 md:mt-7 md:p-6 md:pb-7 md:text-center">
            <span className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fbeae2] text-[#ef6c3d] transition duration-300 group-hover:bg-[#ef6c3d] group-hover:text-white md:mx-auto md:mb-5 md:h-14 md:w-14"><StepIcon name={step.key}/></span>
            <p className="code-plate text-[10px] text-[#ef6c3d]">{step.kicker}</p>
            <h3 className="mt-2 leading-snug font-black md:text-lg">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#687582]">{step.detail}</p>
          </div>
        </li>)}</ol>
      </div>
    </section>

    <section className="border-y border-[#eeebe6] bg-[#faf8f4] py-14 md:py-24">
      <div className="container-wide">
        <p className="eyebrow mb-3">Good to know</p>
        <h2 className="text-3xl font-black tracking-tight md:text-4xl">คำถามที่เจอบ่อย</h2>
        <div className="mt-8 grid gap-3 md:grid-cols-2 md:gap-4">
          {faqs.map((faq) => <div key={faq.q} className="rounded-[26px] border border-[#e8ebee] bg-white p-6">
            <h3 className="font-black">{faq.q}</h3>
            <p className="mt-2 text-sm leading-7 text-[#687582]">{faq.a}</p>
          </div>)}
        </div>
      </div>
    </section>

    <section className="container-wide py-14 md:py-20">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#ef6c3d] to-[#ff9152] px-6 py-12 text-center text-white md:px-16 md:py-16">
        <div className="absolute -top-20 -right-16 h-64 w-64 rounded-full bg-white/15"/>
        <div className="relative">
          <p className="code-plate justify-center text-[11px] text-white/75">Ready to race</p>
          <h2 className="mx-auto mt-4 max-w-2xl text-3xl leading-tight font-black tracking-tight md:text-4xl">พร้อมสั่งของแล้วใช่ไหม</h2>
          <p className="mx-auto mt-4 max-w-md leading-8 text-white/85">{freeShipping !== null && `ส่งฟรีเมื่อซื้อครบ ฿${freeShipping.toLocaleString("th-TH")} · `}เก็บเงินปลายทางทั่วประเทศ</p>
          <Link href="/products" className="mt-8 inline-block rounded-full bg-[#18212b] px-8 py-3.5 font-bold text-white transition hover:bg-[#0e141b]">ไปเลือกสินค้า</Link>
        </div>
      </div>
    </section>

    <SiteFooter/>
  </main>;
}
