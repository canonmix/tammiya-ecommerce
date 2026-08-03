import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { cancelOrder, isExpired } from "@/lib/orders";

// The payment page polls this while the shopper is scanning the QR, so it is also the most
// reliable moment to notice that their own payment window has just run out.
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { code } = await params;
  const order = await prisma.order.findUnique({ where: { code }, select: { id: true, code: true, status: true, total: true, paidAt: true, expiresAt: true, customerId: true } });
  if (!order || order.customerId !== customer.id) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });

  if (isExpired(order)) {
    await cancelOrder(order.id);
    return NextResponse.json({ code: order.code, status: "CANCELLED", total: order.total, expiresAt: order.expiresAt, paidAt: null });
  }

  return NextResponse.json({ code: order.code, status: order.status, total: order.total, paidAt: order.paidAt, expiresAt: order.expiresAt });
}

// Cancelling by hand: the shopper changed their mind, or wants to start a new order before the
// hour is up. Stock and any coupon use go back exactly as they do when the window lapses.
export async function DELETE(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { code } = await params;
  const order = await prisma.order.findUnique({ where: { code }, select: { id: true, status: true, customerId: true } });
  if (!order || order.customerId !== customer.id) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  if (order.status !== "PENDING_PAYMENT") return NextResponse.json({ error: "คำสั่งซื้อนี้ยกเลิกไม่ได้แล้ว" }, { status: 409 });

  await cancelOrder(order.id);
  return NextResponse.json({ ok: true });
}
