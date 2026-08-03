// Shape and validation for the receiving account. Free of Prisma imports so the CMS form
// (a client component) can use them without pulling the server modules into the browser bundle.
export type PaymentSettingValues = { promptPayId: string; accountName: string; bankName: string; bankAccountNumber: string; note: string };

// PromptPay proxies are told apart by digit count, the same rule the QR builder uses.
export function promptPayKind(id: string) {
  const digits = id.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 15) return "e-Wallet ID";
  if (digits.length === 13) return "เลขบัตรประชาชน";
  if (digits.length === 10) return "เบอร์มือถือ";
  return "รูปแบบไม่ถูกต้อง";
}

export const isValidPromptPayId = (id: string) => [10, 13, 15].includes(id.replace(/\D/g, "").length);
