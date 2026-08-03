import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer, isValidPhone, normalizePhone } from "@/lib/customer-auth";

export type AddressBody = { label?: string; recipient?: string; phone?: string; line1?: string; subdistrict?: string; district?: string; province?: string; postalCode?: string; note?: string };

/** Shared shape check, so a saved address is always as complete as a checkout one. */
export function readAddress(input: AddressBody) {
  const recipient = input.recipient?.trim() ?? "";
  const phone = normalizePhone(input.phone ?? "");
  const line1 = input.line1?.trim() ?? "";
  const subdistrict = input.subdistrict?.trim() ?? "";
  const district = input.district?.trim() ?? "";
  const province = input.province?.trim() ?? "";
  const postalCode = (input.postalCode ?? "").replace(/\D/g, "");

  if (recipient.length < 2) return { error: "กรุณากรอกชื่อผู้รับ" };
  if (!isValidPhone(phone)) return { error: "เบอร์ผู้รับไม่ถูกต้อง" };
  if (line1.length < 5) return { error: "กรุณากรอกที่อยู่ให้ครบถ้วน" };
  if (!subdistrict) return { error: "กรุณาเลือกแขวง/ตำบล" };
  if (!district) return { error: "กรุณาเลือกเขต/อำเภอ" };
  if (!province) return { error: "กรุณาเลือกจังหวัด" };
  if (!/^[0-9]{5}$/.test(postalCode)) return { error: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก" };

  return { data: { label: input.label?.trim() ?? "", recipient, phone, line1, subdistrict, district, province, postalCode, note: input.note?.trim() ?? "" } };
}

export async function GET() {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const addresses = await prisma.address.findMany({
    where: { customerId: customer.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });
  return NextResponse.json(addresses, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const result = readAddress((await request.json().catch(() => null)) as AddressBody);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(await prisma.address.create({ data: { customerId: customer.id, ...result.data! } }), { status: 201 });
}
