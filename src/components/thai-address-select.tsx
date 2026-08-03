"use client";

import { useEffect, useState } from "react";
import SearchSelect from "@/components/search-select";

// public/thai-address.json is [province, [[district, [[subdistrict, postalCode], ...]], ...]]
type Subdistrict = [string, number];
type District = [string, Subdistrict[]];
type Province = [string, District[]];

export type ThaiAddress = { province: string; district: string; subdistrict: string; postalCode: string };

/**
 * Cascading จังหวัด → เขต/อำเภอ → แขวง/ตำบล pickers that fill in the postal code.
 *
 * The dataset (77 provinces, 928 districts, 7,436 subdistricts) is fetched on mount rather than
 * bundled, so it costs nothing on every other page. Free-text entry is kept as a fallback for
 * the case where the fetch fails — an address form that cannot be filled in is worse than one
 * without dropdowns.
 */
export default function ThaiAddressSelect({ value, onChange, labelClass, fieldClass }: {
  value: ThaiAddress;
  onChange: (next: ThaiAddress) => void;
  labelClass: string;
  fieldClass: string;
}) {
  const [data, setData] = useState<Province[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/thai-address.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("failed"))))
      .then((rows: Province[]) => { if (!cancelled) setData(rows); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const provinces = data?.map(([name]) => name) ?? [];
  const districts = data?.find(([name]) => name === value.province)?.[1] ?? [];
  const subdistricts = districts.find(([name]) => name === value.district)?.[1] ?? [];

  // Changing a level clears everything below it, so a stale district can never survive a
  // province change and end up saved against the wrong place.
  const pickProvince = (province: string) => onChange({ province, district: "", subdistrict: "", postalCode: "" });
  const pickDistrict = (district: string) => onChange({ ...value, district, subdistrict: "", postalCode: "" });
  const pickSubdistrict = (subdistrict: string) => {
    const match = subdistricts.find(([name]) => name === subdistrict);
    onChange({ ...value, subdistrict, postalCode: match ? String(match[1]) : "" });
  };

  if (failed) return <>
    <p className="text-xs leading-5 font-bold text-[#b4552a] sm:col-span-2">โหลดรายการที่อยู่ไม่สำเร็จ — กรอกเองได้ตามปกติ</p>
    <div><label htmlFor="province" className={labelClass}>จังหวัด</label><input id="province" value={value.province} onChange={(e) => onChange({ ...value, province: e.target.value })} required className={fieldClass}/></div>
    <div><label htmlFor="district" className={labelClass}>เขต/อำเภอ</label><input id="district" value={value.district} onChange={(e) => onChange({ ...value, district: e.target.value })} required className={fieldClass}/></div>
    <div><label htmlFor="subdistrict" className={labelClass}>แขวง/ตำบล</label><input id="subdistrict" value={value.subdistrict} onChange={(e) => onChange({ ...value, subdistrict: e.target.value })} required className={fieldClass}/></div>
    <div><label htmlFor="postalCode" className={labelClass}>รหัสไปรษณีย์</label><input id="postalCode" value={value.postalCode} onChange={(e) => onChange({ ...value, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })} inputMode="numeric" required className={fieldClass}/></div>
  </>;

  return <>
    <div>
      <label htmlFor="province" className={labelClass}>จังหวัด</label>
      <SearchSelect id="province" options={provinces} value={value.province} onChange={pickProvince} placeholder={data ? "เลือกจังหวัด" : "กำลังโหลด..."} disabled={!data}/>
    </div>
    <div>
      <label htmlFor="district" className={labelClass}>เขต/อำเภอ</label>
      <SearchSelect id="district" options={districts.map(([name]) => name)} value={value.district} onChange={pickDistrict} placeholder="เลือกเขต/อำเภอ" disabled={!value.province} disabledHint="เลือกจังหวัดก่อน"/>
    </div>
    <div>
      <label htmlFor="subdistrict" className={labelClass}>แขวง/ตำบล</label>
      <SearchSelect id="subdistrict" options={subdistricts.map(([name]) => name)} value={value.subdistrict} onChange={pickSubdistrict} placeholder="เลือกแขวง/ตำบล" disabled={!value.district} disabledHint="เลือกเขต/อำเภอก่อน"/>
    </div>
    <div>
      <label htmlFor="postalCode" className={labelClass}>รหัสไปรษณีย์</label>
      {/* Filled from the chosen subdistrict, but still editable: a few subdistricts span two codes. */}
      <input id="postalCode" value={value.postalCode} onChange={(e) => onChange({ ...value, postalCode: e.target.value.replace(/\D/g, "").slice(0, 5) })} inputMode="numeric" maxLength={5} required placeholder="เลือกแขวง/ตำบลแล้วจะเติมให้" className={fieldClass}/>
    </div>
  </>;
}
