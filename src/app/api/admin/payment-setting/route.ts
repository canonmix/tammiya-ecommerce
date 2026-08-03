import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PAYMENT_SETTING_ID, getPaymentSetting } from "@/lib/payment-setting";
import { isValidPromptPayId } from "@/lib/payment-shared";
import { requireAdminApi } from "@/lib/admin-user";

// The proxy already requires an admin session for everything under /api/admin/.
export async function GET() {
  const guard = await requireAdminApi("payment");
  if (guard.error) return NextResponse.json(guard.error.body, { status: guard.error.status });

  return NextResponse.json(await getPaymentSetting(), { headers: { "Cache-Control": "no-store" } });
}

export async function PUT(request: Request) {
  const guard = await requireAdminApi("payment");
  if (guard.error) return NextResponse.json(guard.error.body, { status: guard.error.status });

  const body = (await request.json().catch(() => null)) as Partial<Record<string, string>> | null;
  const promptPayId = (body?.promptPayId ?? "").replace(/\D/g, "");
  const accountName = (body?.accountName ?? "").trim();
  const bankName = (body?.bankName ?? "").trim();
  const bankAccountNumber = (body?.bankAccountNumber ?? "").replace(/[^\d-]/g, "").trim();
  const note = (body?.note ?? "").trim();

  // An empty PromptPay id is allowed (the shop may take bank transfers only), a malformed one is not.
  if (promptPayId && !isValidPromptPayId(promptPayId)) {
    return NextResponse.json({ error: "PromptPay ID ต้องเป็นเบอร์มือถือ 10 หลัก, เลขบัตรประชาชน 13 หลัก หรือ e-Wallet ID 15 หลัก" }, { status: 400 });
  }
  if (!accountName) return NextResponse.json({ error: "กรุณากรอกชื่อบัญชี — ใช้เทียบกับชื่อผู้รับบนสลิป" }, { status: 400 });

  const data = { promptPayId, accountName, bankName, bankAccountNumber, note };
  const saved = await prisma.paymentSetting.upsert({ where: { id: PAYMENT_SETTING_ID }, update: data, create: { id: PAYMENT_SETTING_ID, ...data } });
  return NextResponse.json({ ok: true, updatedAt: saved.updatedAt });
}
