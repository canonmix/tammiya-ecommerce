import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer, isValidPhone, normalizePhone } from "@/lib/customer-auth";
import { createOrder, pendingPaymentOrders, resolveCart } from "@/lib/orders";
import type { CartLine } from "@/lib/cart";

type AddressInput = { recipient?: string; phone?: string; line1?: string; subdistrict?: string; district?: string; province?: string; postalCode?: string; note?: string };

// Creates the shipping address and the pending order in one step, then hands back the
// order code the payment page needs.
export async function POST(request: Request) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  // One unpaid order at a time: a second one would hold more stock while the first is still
  // reserving units, and the shopper would end up with two QR codes to reconcile.
  const [waiting] = await pendingPaymentOrders(customer.id);
  if (waiting) {
    return NextResponse.json({ error: `คุณมีคำสั่งซื้อ ${waiting.code} รอชำระเงินอยู่ กรุณาชำระเงินหรือยกเลิกก่อนสั่งซื้อใหม่`, pendingCode: waiting.code }, { status: 409 });
  }

  const body = (await request.json().catch(() => null)) as { items?: CartLine[]; address?: AddressInput; couponCode?: string } | null;
  const input = body?.address ?? {};
  const recipient = input.recipient?.trim() ?? "";
  const phone = normalizePhone(input.phone ?? "");
  const line1 = input.line1?.trim() ?? "";
  const subdistrict = input.subdistrict?.trim() ?? "";
  const district = input.district?.trim() ?? "";
  const province = input.province?.trim() ?? "";
  const postalCode = (input.postalCode ?? "").replace(/\D/g, "");

  if (recipient.length < 2) return NextResponse.json({ error: "กรุณากรอกชื่อผู้รับ" }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ error: "เบอร์ผู้รับไม่ถูกต้อง" }, { status: 400 });
  if (line1.length < 5) return NextResponse.json({ error: "กรุณากรอกที่อยู่ให้ครบถ้วน" }, { status: 400 });
  if (!subdistrict) return NextResponse.json({ error: "กรุณาเลือกแขวง/ตำบล" }, { status: 400 });
  if (!district) return NextResponse.json({ error: "กรุณากรอกเขต/อำเภอ" }, { status: 400 });
  if (!province) return NextResponse.json({ error: "กรุณากรอกจังหวัด" }, { status: 400 });
  if (!/^[0-9]{5}$/.test(postalCode)) return NextResponse.json({ error: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก" }, { status: 400 });

  // Re-priced here, so a coupon that ran out while the shopper filled the form is caught now.
  const cart = await resolveCart(Array.isArray(body?.items) ? body.items : [], { couponCode: body?.couponCode, customerId: customer.id });
  if (cart.lines.length === 0) return NextResponse.json({ error: "ไม่มีสินค้าในตะกร้า" }, { status: 400 });
  if (body?.couponCode && cart.couponError) return NextResponse.json({ error: cart.couponError }, { status: 409 });

  // The form is prefilled from the last order, so most repeat buyers submit exactly the address
  // they already have. Creating a row every time filled their address book with copies of one
  // address, each shown as a separate saved address.
  const note = input.note?.trim() ?? "";
  const fields = { customerId: customer.id, recipient, phone, line1, subdistrict, district, province, postalCode, note };
  const address = (await prisma.address.findFirst({ where: fields, orderBy: { createdAt: "asc" } }))
    ?? (await prisma.address.create({ data: fields }));

  try {
    const order = await createOrder(customer.id, address.id, cart);
    return NextResponse.json({ code: order.code, total: order.total, notices: cart.notices });
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith("OUT_OF_STOCK:")
      ? `${error.message.slice("OUT_OF_STOCK:".length)} เพิ่งหมดพอดี กรุณาปรับตะกร้าอีกครั้ง`
      : "สร้างคำสั่งซื้อไม่สำเร็จ กรุณาลองใหม่";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}
