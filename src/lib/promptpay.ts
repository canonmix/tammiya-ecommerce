// Builds an EMVCo QR payload for Thai PromptPay.
// Reference: EMV QRCPS Merchant-Presented Mode + BOT PromptPay tag assignments.

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

// CRC-16/CCITT-FALSE over the payload including the "6304" header of the checksum field itself.
function crc16(input: string) {
  let crc = 0xffff;
  for (const char of input) {
    crc ^= char.charCodeAt(0) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// PromptPay proxies are distinguished by length: 10-digit mobile, 13-digit national ID, 15-digit e-wallet.
function merchantAccount(id: string) {
  const digits = id.replace(/\D/g, "");
  const [tag, value] =
    digits.length === 15 ? ["03", digits] :
    digits.length === 13 ? ["02", digits] :
    ["01", `0066${digits.replace(/^0/, "")}`];
  return field("29", field("00", "A000000677010111") + field(tag, value));
}

/**
 * A payload with an amount is a one-time QR (initiation method 12) so the banking app
 * pre-fills the total; without one it stays a reusable static QR (method 11).
 */
export function promptPayPayload(id: string, amount?: number) {
  const body =
    field("00", "01") +
    field("01", amount === undefined ? "11" : "12") +
    merchantAccount(id) +
    field("53", "764") +
    (amount === undefined ? "" : field("54", amount.toFixed(2))) +
    field("58", "TH");
  const withCrcHeader = `${body}6304`;
  return `${withCrcHeader}${crc16(withCrcHeader)}`;
}
