// Rules that decide whether a slip actually pays a given order.
// Split out from the route so the comparisons can be reasoned about (and tested) on their own.

// Banks mask account numbers on slips ("xxx-x-x5366-x"), so only the revealed digits can be compared.
export function accountMatches(expected: string, fromSlip: string) {
  const clean = (value: string) => value.replace(/[^0-9xX]/g, "").toLowerCase();
  const a = clean(expected);
  const b = clean(fromSlip);
  if (!a || !b) return false;
  if (a.length !== b.length) {
    // Different masking widths — fall back to the trailing digits both sides reveal.
    const tailA = a.replace(/x/g, "").slice(-4);
    const tailB = b.replace(/x/g, "").slice(-4);
    return tailA.length >= 4 && tailA === tailB;
  }
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] === "x" || b[index] === "x") continue;
    if (a[index] !== b[index]) return false;
  }
  // All revealed positions agreed, but at least one must have actually been revealed.
  return a.replace(/x/g, "").length > 0 && b.replace(/x/g, "").length > 0;
}

const TITLES = /^(นาย|นาง|นางสาว|น\.ส\.|ด\.ช\.|ด\.ญ\.|mr|mrs|miss|ms)\.?\s*/i;

// Slip names are masked too ("นาย วัชรพงศ์ ส."), so compare on the revealed leading characters.
export function nameMatches(expected: string, fromSlip: string) {
  const clean = (value: string) => value.replace(TITLES, "").replace(/[\s.]/g, "").toLowerCase();
  const a = clean(expected);
  const b = clean(fromSlip);
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  // A masked slip name is a prefix of the full name often enough to be the useful test,
  // but only trust it when enough characters were revealed to be meaningful.
  return shorter.length >= 3 && longer.startsWith(shorter);
}

export type SlipCheckInput = {
  expected: { total: number; accountName: string; bankAccountNumber: string; promptPayId: string };
  slip: { amount?: number; receiverName?: string | null; receiverBankAccount?: string | null; receiverProxyAccount?: string | null };
};

export type SlipCheckResult = { ok: true } | { ok: false; reason: string };

/**
 * The shop must know which account it expects before any slip can be auto-approved —
 * otherwise "verified" would only mean "this is a real slip", not "it paid us".
 */
export function checkSlipAgainstOrder({ expected, slip }: SlipCheckInput): SlipCheckResult {
  if (!expected.accountName && !expected.bankAccountNumber && !expected.promptPayId) {
    return { ok: false, reason: "ร้านยังไม่ได้ตั้งค่าบัญชีรับเงินใน CMS จึงตรวจสลิปอัตโนมัติไม่ได้" };
  }

  if (typeof slip.amount !== "number") return { ok: false, reason: "อ่านยอดเงินจากสลิปไม่ได้" };
  if (Math.round(slip.amount * 100) !== expected.total * 100) {
    return { ok: false, reason: `ยอดบนสลิป ฿${slip.amount.toLocaleString("th-TH")} ไม่ตรงกับยอดที่ต้องชำระ ฿${expected.total.toLocaleString("th-TH")}` };
  }

  // Any one account identifier lining up is enough: a PromptPay transfer shows the proxy,
  // a normal transfer shows the bank account, and either proves the money reached this shop.
  const candidates = [slip.receiverBankAccount, slip.receiverProxyAccount].filter((value): value is string => Boolean(value));
  const targets = [expected.bankAccountNumber, expected.promptPayId].filter(Boolean);
  const accountChecked = candidates.length > 0 && targets.length > 0;
  const accountOk = accountChecked && candidates.some((candidate) => targets.some((target) => accountMatches(target, candidate)));

  const nameChecked = Boolean(expected.accountName && slip.receiverName);
  const nameOk = nameChecked && nameMatches(expected.accountName, slip.receiverName!);

  if (accountOk || nameOk) return { ok: true };
  if (!accountChecked && !nameChecked) return { ok: false, reason: "สลิปไม่มีข้อมูลบัญชีปลายทางให้ตรวจสอบ" };
  return { ok: false, reason: "บัญชีปลายทางบนสลิปไม่ตรงกับบัญชีรับเงินของร้าน" };
}
