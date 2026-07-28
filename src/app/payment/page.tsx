import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";

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
  { number: "01", key: "browse", kicker: "BROWSE", title: "หยิบสินค้าใส่ตะกร้า", detail: "เลือกโมเดล อะไหล่ หรือของแต่งที่ต้องการ แล้วกดใส่ตะกร้า", label: "เลือกของที่ใช่" },
  { number: "02", key: "signin", kicker: "SIGN IN", title: "กด LOGIN เข้าสู่ระบบ", detail: "เข้าสู่ระบบเพื่อยืนยันข้อมูลผู้สั่งซื้อและที่อยู่จัดส่ง", label: "ยืนยันตัวตน" },
  { number: "03", key: "review", kicker: "REVIEW", title: "ตรวจสอบข้อมูล และกดสั่งซื้อ", detail: "ตรวจสอบรายการสินค้า ที่อยู่ และยอดรวมให้เรียบร้อยก่อนยืนยัน", label: "เช็กให้ครบ" },
  { number: "04", key: "pay", kicker: "PAY", title: "สแกน QR เพื่อชำระเงิน", detail: "สแกน QR Payment และชำระเงินตามยอดที่แสดงในคำสั่งซื้อ", label: "จ่ายง่ายในครั้งเดียว" },
  { number: "05", key: "ship", kicker: "SHIP", title: "รอรับเลข Tracking ในวันถัดไป", detail: "ทีมงานจัดส่งสินค้าและแจ้งเลข Tracking ให้ในวันถัดไป", label: "พร้อมลงสนาม" },
];

function StepIcon({ name }: { name: string }) {
  return <svg viewBox="0 0 24 24" aria-hidden className="h-7 w-7">{icons[name]}</svg>;
}

// A 4×4 checker used as the finish marker at the end of the progress rail.
function FinishFlag() {
  return <span aria-hidden className="grid h-6 w-6 grid-cols-4 grid-rows-4 overflow-hidden rounded-[5px] ring-1 ring-[#18212b]/15">{Array.from({ length: 16 }).map((_, index) => <span key={index} className={(Math.floor(index / 4) + index) % 2 === 0 ? "bg-[#18212b]" : "bg-white"} />)}</span>;
}

export default function PaymentPage() {
  return <main className="min-h-screen bg-[#f7f6f2] text-[#18212b]">
    <div className="bg-[#18212b] py-3 text-center text-xs tracking-wide text-white">ส่งฟรีเมื่อซื้อครบ ฿1,500 · เก็บเงินปลายทางทั่วประเทศ</div>
    <header className="sticky top-0 z-20 border-b border-[#e7e1d8] bg-[#f7f6f2]/95 backdrop-blur"><div className="container flex h-20 items-center justify-between gap-5">
      <Link href="/" aria-label="MINI4WD Premium Shop"><Image src="/mini4wd-logo.svg" alt="MINI4WD Premium Shop" width={220} height={66} className="h-10 w-auto" priority/></Link>
      <nav className="hidden gap-7 text-sm font-bold md:flex"><Link href="/">สินค้า</Link><Link href="/payment" className="text-[#ef6c3d]">วิธีการชำระเงิน</Link><Link href="/#story">เรื่องราวของเรา</Link><Link href="/#service">บริการ</Link></nav>
      <div className="flex items-center gap-3 text-sm"><Link href="/login" className="hidden rounded-full border border-[#d8d0c5] px-4 py-2 font-bold sm:block">เข้าสู่ระบบ</Link><Link href="/checkout" className="rounded-full bg-[#ef6c3d] px-4 py-2 font-bold text-white">ไปที่ตะกร้า</Link></div>
    </div></header>

    <section className="relative isolate overflow-hidden bg-[#18212b] text-white"><div className="absolute inset-0 -z-10 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.14) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.14) 1px, transparent 1px)", backgroundSize: "42px 42px" }} /><div className="absolute -right-32 -top-40 -z-10 h-[520px] w-[520px] rounded-full border border-white/10"/><div className="absolute -right-16 -top-24 -z-10 h-[360px] w-[360px] rounded-full border border-[#ef6c3d]/40"/><div className="container grid gap-12 py-20 md:grid-cols-[1.05fr_.95fr] md:items-center md:py-28"><div><p className="mb-6 text-xs font-black uppercase tracking-[.3em] text-[#ef6c3d]">Payment journey / 05 steps</p><h1 className="max-w-2xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">สั่งง่าย<br/><span className="text-[#ef6c3d]">จ่ายสบาย</span></h1><p className="mt-7 max-w-lg text-lg leading-8 text-white/65">ทุกโค้งของการสั่งซื้อถูกออกแบบให้ชัดเจน ตั้งแต่เลือกสินค้าไปจนถึงวันที่ได้รับเลข Tracking</p><Link href="/#shop" className="mt-9 inline-flex rounded-full bg-[#ef6c3d] px-6 py-3 font-black text-white transition hover:bg-white hover:text-[#18212b]">เลือกสินค้าเลย <span className="ml-3">↗</span></Link></div><div className="relative min-h-[280px] md:min-h-[390px]"><div className="absolute left-4 top-10 h-48 w-48 rounded-[40px] border border-white/15 bg-white/[.04] md:left-16 md:top-14 md:h-64 md:w-64"/><div className="absolute bottom-4 right-2 h-44 w-44 rounded-full border-[22px] border-[#ef6c3d] md:right-12 md:h-64 md:w-64 md:border-[30px]"/><div className="absolute right-8 top-4 rotate-12 text-[100px] font-black italic leading-none text-white/10 md:text-[170px]">QR</div><div className="absolute bottom-8 left-10 rotate-[-8deg] rounded-3xl bg-white p-5 text-[#18212b] shadow-2xl md:left-24 md:p-7"><div className="grid h-28 w-28 grid-cols-5 gap-1 md:h-40 md:w-40 md:gap-2">{Array.from({ length: 25 }).map((_, index) => <span key={index} className={`${[0,1,3,5,7,9,12,13,15,17,18,20,22,24].includes(index) ? "bg-[#18212b]" : "bg-white"} rounded-sm border border-[#18212b]/10`} />)}</div><p className="mt-3 text-center text-xs font-black tracking-[.2em]">SCAN TO PAY</p></div></div></div></section>

    <section className="container py-20 md:py-28"><div className="grid gap-5 md:grid-cols-[.75fr_1.25fr] md:items-end"><div><p className="eyebrow mb-4">How it works</p><h2 className="max-w-md text-4xl font-black leading-tight tracking-tight md:text-5xl">จากหน้าร้าน<br/>ถึงหน้าบ้าน</h2></div><p className="max-w-xl text-lg leading-8 text-[#687582]">ทำตามขั้นตอนด้านล่างได้เลย ไม่ต้องเดา ไม่ต้องกังวล เราจะดูแลคำสั่งซื้อของคุณตั้งแต่ต้นจนจบ</p></div><div className="relative mt-16">
      {/* The rail runs between the first and last node centres — each column is 20% wide, so its centre sits at 10%. */}
      <span aria-hidden className="absolute left-[10%] right-[10%] top-7 hidden h-px bg-[linear-gradient(90deg,#ded6cb_0_6px,transparent_6px_12px)] bg-[length:12px_1px] md:block"/>
      <span aria-hidden className="absolute left-0 top-[22px] hidden h-2.5 w-2.5 rounded-full bg-[#ef6c3d] md:block"/>
      <span aria-hidden className="absolute right-0 top-[16px] hidden md:block"><FinishFlag/></span>
      <ol className="grid gap-6 md:grid-cols-5 md:gap-4">{steps.map((step, index) => <li key={step.number} className="group relative flex gap-5 md:flex-col md:gap-0">
        <div className="relative flex flex-col items-center md:block">
          <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#ded6cb] bg-[#f7f6f2] text-sm font-black tracking-wider transition duration-300 group-hover:border-[#ef6c3d] group-hover:bg-[#ef6c3d] group-hover:text-white group-hover:shadow-[0_10px_24px_rgba(239,108,61,.3)] md:mx-auto">{step.number}</span>
          {index < steps.length - 1 && <span aria-hidden className="mt-1.5 w-px flex-1 bg-[#ded6cb] md:hidden"/>}
        </div>
        <div className="flex flex-1 flex-col rounded-3xl border border-[#e7e1d8] bg-white p-6 transition duration-300 group-hover:-translate-y-1.5 group-hover:border-[#ef6c3d]/35 group-hover:shadow-[0_22px_45px_rgba(24,33,43,.10)] md:mt-7 md:pb-7 md:text-center">
          <span className="mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#fbeae2] text-[#ef6c3d] transition duration-300 group-hover:bg-[#ef6c3d] group-hover:text-white md:mx-auto"><StepIcon name={step.key}/></span>
          <p className="text-[10px] font-black uppercase tracking-[.22em] text-[#ef6c3d]">{step.kicker}</p>
          <h3 className="mt-2.5 text-lg font-black leading-snug">{step.title}</h3>
          <p className="mt-3 text-sm leading-6 text-[#687582]">{step.detail}</p>
          {/* mt-auto keeps every pill on the same baseline no matter how long the copy above runs. */}
          <div className="mt-auto pt-5"><span className="inline-flex rounded-full bg-[#f7f6f2] px-3 py-1.5 text-[11px] font-black text-[#18212b]/55 transition duration-300 group-hover:bg-[#fbeae2] group-hover:text-[#ef6c3d]">{step.label}</span></div>
        </div>
      </li>)}</ol>
    </div></section>

    <section className="border-y border-[#e7e1d8] bg-white py-16"><div className="container flex flex-col justify-between gap-8 md:flex-row md:items-center"><div><p className="eyebrow mb-3">Need a hand?</p><h2 className="text-3xl font-black">มีคำถามเรื่องการสั่งซื้อ?</h2><p className="mt-2 text-[#687582]">ทีมงานพร้อมช่วยให้ทุกสนามของคุณเริ่มต้นได้ง่ายขึ้น</p></div><Link href="/" className="inline-flex w-fit rounded-full bg-[#18212b] px-6 py-3 font-bold text-white transition hover:bg-[#ef6c3d]">กลับไปเลือกสินค้า <span className="ml-3">↗</span></Link></div></section>
    <footer className="container flex flex-col justify-between gap-5 py-8 text-sm text-[#687582] md:flex-row"><span>© 2026 Tamiya Premium Shop</span><span>ชำระเงินปลายทาง · QR Payment · Support 09x-xxx-xxxx</span></footer>
  </main>;
}
