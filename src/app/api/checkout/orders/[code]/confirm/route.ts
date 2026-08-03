import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { cancelOrder, isExpired } from "@/lib/orders";

/**
 * Marks a pending order as paid.
 *
 * This is the shopper-pressed "โอนเงินแล้ว" button — it records the claim so the order moves
 * on, it does NOT prove money arrived. Settlement still has to be checked against the bank.
 * When a payment gateway is connected, its webhook should flip the status instead and this
 * route should be reduced to a notification.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { code } = await params;
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order || order.customerId !== customer.id) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  if (order.status === "PAID") return NextResponse.json({ ok: true, status: order.status });
  if (order.status !== "PENDING_PAYMENT") return NextResponse.json({ error: "คำสั่งซื้อนี้ถูกยกเลิกแล้ว" }, { status: 409 });
  // Past the window the stock has gone back on sale, so the order must not be revived.
  if (isExpired(order)) {
    await cancelOrder(order.id);
    return NextResponse.json({ error: "หมดเวลาชำระเงินแล้ว คำสั่งซื้อถูกยกเลิกและคืนสินค้าเข้าสต็อก" }, { status: 409 });
  }

  const updated = await prisma.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: new Date() } });
  return NextResponse.json({ ok: true, status: updated.status });
}
