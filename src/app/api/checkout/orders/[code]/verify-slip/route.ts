import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getPaymentSetting } from "@/lib/payment-setting";
import { SLIP_FOUND, verifySlipImage } from "@/lib/slip2go";
import { checkSlipAgainstOrder } from "@/lib/slip-match";
import { cancelOrder, isExpired } from "@/lib/orders";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/jpg"];

const fail = (reason: string, status = 422) => NextResponse.json({ ok: false, reason }, { status });

/**
 * Verifies an uploaded transfer slip and, only if it genuinely pays this order, marks it PAID.
 *
 * Three things must hold: slip2go recognises the slip, the amount equals the order total, and
 * the receiving account is this shop's (from CMS → ตั้งค่าการชำระเงิน). The bank's transRef is
 * stored under a unique constraint, so re-uploading the same slip cannot pay a second order.
 */
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ ok: false, reason: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { code } = await params;
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order || order.customerId !== customer.id) return NextResponse.json({ ok: false, reason: "ไม่พบคำสั่งซื้อ" }, { status: 404 });
  if (order.status === "PAID") return NextResponse.json({ ok: true, status: "PAID" });
  if (order.status !== "PENDING_PAYMENT") return fail("คำสั่งซื้อนี้ถูกยกเลิกแล้ว", 409);
  // Checked before spending a slip2go call — an expired order cannot be paid either way.
  if (isExpired(order)) {
    await cancelOrder(order.id);
    return fail("หมดเวลาชำระเงินแล้ว คำสั่งซื้อถูกยกเลิกและคืนสินค้าเข้าสต็อก", 409);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("slip");
  if (!(file instanceof File) || file.size === 0) return fail("กรุณาแนบรูปสลิป", 400);
  if (file.size > MAX_BYTES) return fail("ไฟล์ใหญ่เกิน 8MB", 400);
  if (file.type && !ALLOWED.includes(file.type)) return fail("รองรับเฉพาะไฟล์ .png .jpg", 400);

  const result = await verifySlipImage(file);
  if (result.code !== SLIP_FOUND || !result.data) {
    // slip2go's own wording is the most useful thing to show for a rejected slip.
    return fail(result.code === "200500" ? "อ่านสลิปไม่สำเร็จ หรือสลิปนี้ไม่ถูกต้อง" : result.message || "ตรวจสอบสลิปไม่สำเร็จ");
  }

  const slip = result.data;
  const payment = await getPaymentSetting();
  const verdict = checkSlipAgainstOrder({
    expected: { total: order.total, accountName: payment.accountName, bankAccountNumber: payment.bankAccountNumber, promptPayId: payment.promptPayId },
    slip: {
      amount: slip.amount,
      receiverName: slip.receiver?.account?.name,
      receiverBankAccount: slip.receiver?.account?.bank?.account,
      receiverProxyAccount: slip.receiver?.account?.proxy?.account,
    },
  });
  if (!verdict.ok) return fail(verdict.reason);

  const transRef = slip.transRef?.trim();
  if (!transRef) return fail("สลิปนี้ไม่มีเลขอ้างอิงธุรกรรม จึงตรวจสอบซ้ำซ้อนไม่ได้");

  try {
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        slipTransRef: transRef,
        slipReferenceId: slip.referenceId ?? null,
        slipAmount: typeof slip.amount === "number" ? Math.round(slip.amount) : null,
        slipSenderName: slip.sender?.account?.name ?? null,
        slipBankName: slip.sender?.bank?.name ?? null,
        slipDateTime: slip.dateTime ? new Date(slip.dateTime) : null,
        slipCheckedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, status: updated.status });
  } catch (error) {
    // P2002 on slipTransRef means this exact transfer was already used to pay something.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("สลิปนี้ถูกใช้ชำระคำสั่งซื้ออื่นไปแล้ว", 409);
    }
    throw error;
  }
}
