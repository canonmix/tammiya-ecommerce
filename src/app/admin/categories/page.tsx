"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

type Category = { id: string; name: string; _count?: { products: number } };

export default function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [message, setMessage] = useState("");
  const load = () => fetch("/api/admin/categories", { cache: "no-store" }).then((response) => response.json()).then(setCategories);
  useEffect(() => { load(); }, []);
  const remove = async (category: Category) => {
    if (category._count?.products) return;
    const response = await fetch(`/api/admin/categories?id=${category.id}`, { method: "DELETE" });
    if (!response.ok) { setMessage("ลบไม่ได้ เพราะ Category นี้มีสินค้าผูกอยู่"); return; }
    setCategories((current) => current.filter((item) => item.id !== category.id));
    setMessage(`ลบ Category “${category.name}” แล้ว`);
  };
  return <main className="min-h-screen bg-white"><aside className="fixed hidden h-screen w-64 bg-[#18212b] p-7 text-white md:block"><Link href="/" className="text-xl font-black"><Image src="/mini4wd-logo.png" alt="MINI4WD Premium Shop" width={220} height={66} className="h-10 w-auto" priority/></Link><p className="mt-2 text-xs text-white/45">PREMIUM SHOP CMS</p><nav className="mt-12 grid gap-3 text-sm"><Link href="/admin" className="p-3 text-white/60">Overview</Link><Link href="/admin/products" className="p-3 text-white/60">สินค้า</Link><Link href="/admin/categories" className="rounded-xl bg-white/10 p-3 font-bold">จัดการ Category</Link><span className="p-3 text-white/35">ออเดอร์</span><span className="p-3 text-white/35">ลูกค้า</span></nav></aside><section className="md:ml-64"><header className="flex items-center justify-between border-b bg-white px-6 py-5 md:px-10"><div><p className="text-xs font-bold uppercase tracking-widest text-[#ef6c3d]">Catalog settings</p><h1 className="mt-1 text-2xl font-black">จัดการ Category</h1></div><Link href="/admin/products" className="rounded-full border px-4 py-2 text-sm font-bold">← กลับสินค้า</Link></header><div className="max-w-4xl p-6 md:p-10"><section className="rounded-3xl border border-[#e8ebee] bg-white p-6 shadow-sm"><p className="eyebrow">Category manager</p><h2 className="mt-1 text-xl font-black">หมวดหมู่สินค้าทั้งหมด</h2><p className="mt-2 text-sm text-[#687582]">ลบได้เฉพาะ Category ที่ยังไม่มีสินค้าผูกอยู่เท่านั้น</p><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><thead className="border-b text-xs text-[#687582]"><tr><th className="pb-3">ชื่อ Category</th><th className="pb-3">จำนวนสินค้า</th><th className="pb-3 text-right">การจัดการ</th></tr></thead><tbody>{categories.map((category) => { const productCount = category._count?.products || 0; return <tr key={category.id} className="border-b last:border-0"><td className="py-4 font-bold">{category.name}</td><td>{productCount} สินค้า</td><td className="text-right"><button type="button" disabled={productCount > 0} onClick={() => remove(category)} className="rounded-full border px-4 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-35">{productCount > 0 ? "มีสินค้าใช้งาน" : "ลบ Category"}</button></td></tr>; })}</tbody></table></div>{message && <p className="mt-5 rounded-xl bg-[#f5f7f8] p-3 text-sm font-bold">{message}</p>}</section></div></section></main>;
}
