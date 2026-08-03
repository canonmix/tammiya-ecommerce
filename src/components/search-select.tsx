"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Single-choice dropdown with a search box.
 *
 * A plain <select> is unusable for Thai address data — 77 provinces, and some provinces have
 * dozens of districts. Typing to filter is the only way this stays quick on a phone.
 */
export default function SearchSelect({ options, value, onChange, placeholder, disabled, disabledHint, id }: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  disabled?: boolean;
  disabledHint?: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onPointerDown = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const normalized = query.trim().toLowerCase();
  const visible = normalized ? options.filter((option) => option.toLowerCase().includes(normalized)) : options;

  const choose = (option: string) => {
    onChange(option);
    setOpen(false);
    setQuery("");
  };

  return <div ref={root} className="relative">
    <button
      type="button"
      id={id}
      disabled={disabled}
      onClick={() => setOpen((current) => !current)}
      aria-expanded={open}
      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#e0dcd5] px-4 py-3 text-left text-sm transition focus:border-[#ef6c3d] disabled:cursor-not-allowed disabled:bg-[#f7f6f2]"
    >
      <span className={`min-w-0 flex-1 truncate ${value ? "text-[#18212b]" : "text-[#98a2ac]"}`}>{value || (disabled && disabledHint ? disabledHint : placeholder)}</span>
      <span className="shrink-0 text-[10px] text-[#98a2ac]">{open ? "▲" : "▼"}</span>
    </button>

    {open && <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-[#e0dcd5] bg-white shadow-xl">
      {options.length > 8 && <div className="border-b border-[#eeebe6] p-2">
        <input ref={search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="พิมพ์เพื่อค้นหา..." className="w-full rounded-xl border border-[#e8e5df] px-3 py-2 text-sm outline-none focus:border-[#ef6c3d]"/>
      </div>}
      <div className="max-h-60 overflow-y-auto p-1">
        {visible.length === 0 && <p className="p-4 text-center text-xs text-[#98a2ac]">ไม่พบรายการ</p>}
        {visible.map((option) => <button
          key={option}
          type="button"
          onClick={() => choose(option)}
          className={`block w-full truncate rounded-xl px-3 py-2.5 text-left text-sm transition ${option === value ? "bg-[#fdf3ee] font-bold" : "hover:bg-[#faf8f4]"}`}
        >{option}</button>)}
      </div>
    </div>}
  </div>;
}
