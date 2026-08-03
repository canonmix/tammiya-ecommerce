import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi } from "@/lib/admin-user";
import { cancelOrder } from "@/lib/orders";
import { isValidCarrier } from "@/lib/shipping";

/**
 * The two state changes a shop actually makes by hand.
 *
 * `confirm` is for money that arrived without the automatic slip check catching it (a bank
 * transfer the shopper never uploaded, say). `cancel` puts the reserved stock back on sale,
 * which is why it goes through cancelOrder rather than a plain status update.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { admin, error } = await requireAdminApi("orders");
  if (error) return NextResponse.json(error.body, { status: error.status });

  const { code } = await params;
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order) return NextResponse.json({ error: "ไม่พบคำสั่งซื้อ" }, { status: 404 });

  const body = (await request.json().catch(() => null)) as { action?: string; carrier?: string; trackingNumber?: string } | null;

  if (body?.action === "confirm") {
    if (order.status === "PAID") return NextResponse.json({ ok: true, status: "PAID" });
    if (order.status !== "PENDING_PAYMENT") return NextResponse.json({ error: "คำสั่งซื้อนี้ถูกยกเลิกแล้ว" }, { status: 409 });
    const updated = await prisma.order.update({
      where: { id: order.id },
      // Recorded as a manual confirmation so it is never mistaken for a verified slip.
      data: { status: "PAID", paidAt: new Date(), slipSenderName: order.slipSenderName ?? `ยืนยันโดย ${admin!.name}` },
    });
    return NextResponse.json({ ok: true, status: updated.status });
  }

  if (body?.action === "cancel") {
    if (order.status === "CANCELLED") return NextResponse.json({ ok: true, status: "CANCELLED" });
    if (order.status !== "PENDING_PAYMENT") return NextResponse.json({ error: "ยกเลิกคำสั่งซื้อที่ชำระเงินแล้วไม่ได้" }, { status: 409 });
    await cancelOrder(order.id);
    return NextResponse.json({ ok: true, status: "CANCELLED" });
  }

  if (body?.action === "ship") {
    // Only a paid order can go out the door, and it needs somewhere to be tracked.
    if (order.status !== "PAID") return NextResponse.json({ error: "ต้องชำระเงินก่อนจึงจะจัดส่งได้" }, { status: 409 });
    const carrier = body.carrier ?? "";
    const trackingNumber = (body.trackingNumber ?? "").trim();
    if (!isValidCarrier(carrier)) return NextResponse.json({ error: "กรุณาเลือกขนส่ง" }, { status: 400 });
    if (trackingNumber.length < 6) return NextResponse.json({ error: "เลขพัสดุสั้นเกินไป กรุณาตรวจสอบอีกครั้ง" }, { status: 400 });

    const updated = await prisma.order.update({
      where: { id: order.id },
      // shippedAt is kept from the first dispatch, so correcting a typo does not reset the date.
      data: { shippingStatus: "SHIPPED", carrier, trackingNumber, shippedAt: order.shippedAt ?? new Date(), deliveredAt: null },
    });
    return NextResponse.json({ ok: true, shippingStatus: updated.shippingStatus });
  }

  if (body?.action === "deliver") {
    if (order.shippingStatus !== "SHIPPED") return NextResponse.json({ error: "ต้องบันทึกการจัดส่งก่อน" }, { status: 409 });
    const updated = await prisma.order.update({ where: { id: order.id }, data: { shippingStatus: "DELIVERED", deliveredAt: new Date() } });
    return NextResponse.json({ ok: true, shippingStatus: updated.shippingStatus });
  }

  if (body?.action === "unship") {
    if (order.shippingStatus === "PENDING") return NextResponse.json({ ok: true, shippingStatus: "PENDING" });
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { shippingStatus: "PENDING", carrier: null, trackingNumber: null, shippedAt: null, deliveredAt: null },
    });
    return NextResponse.json({ ok: true, shippingStatus: updated.shippingStatus });
  }

  return NextResponse.json({ error: "คำสั่งที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
}
