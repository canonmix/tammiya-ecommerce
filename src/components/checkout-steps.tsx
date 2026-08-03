const STEPS = ["ตะกร้า", "เข้าสู่ระบบ", "ที่อยู่จัดส่ง", "ชำระเงิน", "สำเร็จ"];

// `current` is 1-based; anything before it renders as done.
export default function CheckoutSteps({ current }: { current: number }) {
  return <div>
    {/* Phones get a progress bar instead of five wrapping chips. */}
    <div className="sm:hidden">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-black">{STEPS[current - 1]}</p>
        <p className="text-xs font-bold text-[#98a2ac]">ขั้นตอน {current}/{STEPS.length}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eeebe6]">
        <div className="h-full rounded-full bg-[#ef6c3d] transition-[width] duration-500" style={{ width: `${(current / STEPS.length) * 100}%` }}/>
      </div>
    </div>

    <ol className="hidden flex-wrap items-center gap-x-2 gap-y-3 text-xs font-bold sm:flex sm:gap-x-3">
      {STEPS.map((label, index) => {
        const step = index + 1;
        const done = step < current;
        const active = step === current;
        return <li key={label} className="flex items-center gap-2">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] ${active ? "bg-[#ef6c3d] text-white" : done ? "bg-[#18212b] text-white" : "border border-[#d8d0c5] text-[#98a2ac]"}`}>{done ? "✓" : step}</span>
          <span className={active ? "text-[#18212b]" : done ? "text-[#687582]" : "text-[#b3bbc3]"}>{label}</span>
          {step < STEPS.length && <span aria-hidden className="ml-1 hidden h-px w-6 bg-[#ded6cb] lg:block"/>}
        </li>;
      })}
    </ol>
  </div>;
}
