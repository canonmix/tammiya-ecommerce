"use client";

/**
 * Fixed bar that keeps the total and the next-step action reachable on a phone.
 *
 * On mobile the checkout summary stacks below a long form, so the primary action ends up far
 * below the fold. Pair this with `has-action-bar` on the page wrapper so the last row of
 * content is never hidden behind it.
 */
export default function MobileActionBar({ label, value, action }: { label: string; value: string; action: React.ReactNode }) {
  return <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e8ebee] bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden">
    <div className="flex items-center gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-[#98a2ac]">{label}</p>
        <p className="font-display truncate text-xl leading-6 font-extrabold tabular-nums">{value}</p>
      </div>
      <div className="ml-auto shrink-0">{action}</div>
    </div>
  </div>;
}
