"use client";

import { useEffect, useRef, useState } from "react";

export type MultiSelectOption = { id: string; label: string; hint?: string };

/**
 * Dropdown with checkboxes, for picking several options out of a list that will grow.
 *
 * A flat grid of checkboxes stops working once there are more than a screenful of categories,
 * so the list lives in a popover with its own search box and a fixed height — the form stays
 * the same size whether the shop has three categories or three hundred.
 */
export default function MultiSelect({ options, selected, onChange, placeholder, emptyText }: {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((existing) => existing !== id) : [...selected, id]);
  const normalized = query.trim().toLowerCase();
  const visible = normalized ? options.filter((option) => `${option.label} ${option.hint ?? ""}`.toLowerCase().includes(normalized)) : options;
  const chosen = options.filter((option) => selected.includes(option.id));

  return <div ref={root} className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#e0dcd5] px-4 py-3 text-left text-sm transition focus:border-[#ef6c3d]">
      <span className={`min-w-0 flex-1 truncate ${chosen.length ? "font-bold text-[#18212b]" : "text-[#98a2ac]"}`}>
        {chosen.length === 0 ? placeholder : chosen.length <= 2 ? chosen.map((option) => option.label).join(", ") : `เลือกแล้ว ${chosen.length} รายการ`}
      </span>
      <span className="shrink-0 text-[10px] text-[#98a2ac]">{open ? "▲" : "▼"}</span>
    </button>

    {open && <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#e0dcd5] bg-white shadow-xl">
      {options.length > 6 && <div className="border-b border-[#eeebe6] p-2">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา..." className="w-full rounded-xl border border-[#e8e5df] px-3 py-2 text-sm outline-none focus:border-[#ef6c3d]"/>
      </div>}

      <div className="max-h-60 overflow-y-auto p-1">
        {visible.length === 0 && <p className="p-4 text-center text-xs text-[#98a2ac]">{emptyText ?? "ไม่พบรายการ"}</p>}
        {visible.map((option) => {
          const checked = selected.includes(option.id);
          return <label key={option.id} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${checked ? "bg-[#fdf3ee] font-bold" : "hover:bg-[#faf8f4]"}`}>
            <input type="checkbox" checked={checked} onChange={() => toggle(option.id)} className="h-4 w-4 shrink-0 accent-[#ef6c3d]"/>
            <span className="min-w-0 flex-1 truncate">{option.label}{option.hint && <span className="ml-2 text-xs font-normal text-[#98a2ac]">{option.hint}</span>}</span>
          </label>;
        })}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[#eeebe6] px-3 py-2 text-xs font-bold">
        <span className="text-[#98a2ac]">เลือกแล้ว {selected.length}/{options.length}</span>
        <span className="flex gap-3">
          <button type="button" onClick={() => onChange(visible.map((option) => option.id))} className="text-[#ef6c3d] underline">เลือกทั้งหมด</button>
          <button type="button" onClick={() => onChange([])} className="text-[#98a2ac] underline">ล้าง</button>
        </span>
      </div>
    </div>}

    {chosen.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">
      {chosen.map((option) => <span key={option.id} className="flex items-center gap-1.5 rounded-full bg-[#f4f2ee] py-1 pr-1.5 pl-3 text-xs font-bold text-[#465360]">
        {option.label}
        <button type="button" onClick={() => toggle(option.id)} aria-label={`เอา ${option.label} ออก`} className="grid h-4 w-4 place-items-center rounded-full bg-[#dcd8d1] text-[10px] text-[#5c6772]">×</button>
      </span>)}
    </div>}
  </div>;
}
