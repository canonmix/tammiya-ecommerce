"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";

type Props = { onFilesSelected: (files: File[]) => void };
const accepted = ["image/jpeg", "image/png", "image/webp"];

export default function MultipleImageUploader({ onFilesSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const acceptFiles = (files: File[]) => {
    const valid = files.filter((file) => accepted.includes(file.type) && file.size <= 5 * 1024 * 1024);
    if (valid.length !== files.length) setError("รองรับเฉพาะ JPG, PNG, WebP และขนาดไม่เกิน 5MB ต่อรูป");
    else setError("");
    if (valid.length) onFilesSelected(valid);
  };
  const onInput = (event: ChangeEvent<HTMLInputElement>) => { acceptFiles(Array.from(event.target.files || [])); event.target.value = ""; };
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); acceptFiles(Array.from(event.dataTransfer.files)); };
  return <div><div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (event.currentTarget === event.target) setDragging(false); }} onDrop={onDrop} className={`cursor-pointer rounded-2xl border-2 border-dashed p-7 text-center transition ${dragging ? "border-[#ef6c3d] bg-orange-50" : "border-[#dfe5e9] bg-[#fafbfc] hover:border-[#ef6c3d]"}`}><input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={onInput} className="hidden"/><p className="text-2xl">↑</p><p className="mt-2 text-sm font-black">ลากรูปมาวางที่นี่</p><p className="mt-1 text-xs text-[#687582]">หรือคลิกเพื่อเลือกหลายรูป · JPG, PNG, WebP · ไม่เกิน 5MB/รูป</p></div>{error && <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs font-bold text-red-700">{error}</p>}</div>;
}
