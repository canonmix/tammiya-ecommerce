import { prisma } from "@/lib/prisma";
import type { PaymentSettingValues } from "@/lib/payment-shared";

// One row, always this id — the CMS edits it and the storefront reads it.
export const PAYMENT_SETTING_ID = "default";

/**
 * Reads the shop's receiving account. PROMPTPAY_ID from the environment is only a
 * fallback for installs that predate this screen — whatever the CMS saves wins.
 */
export async function getPaymentSetting(): Promise<PaymentSettingValues> {
  const row = await prisma.paymentSetting.findUnique({ where: { id: PAYMENT_SETTING_ID } });
  return {
    promptPayId: row?.promptPayId || process.env.PROMPTPAY_ID || "",
    accountName: row?.accountName ?? "",
    bankName: row?.bankName ?? "",
    bankAccountNumber: row?.bankAccountNumber ?? "",
    note: row?.note ?? "",
  };
}
