import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const OTP_LENGTH = 6;
// The code outlives the resend cooldown, so a shopper waiting to resend still has a usable code.
export const OTP_TTL_MINUTES = 10;
export const RESEND_COOLDOWN_SECONDS = 5 * 60;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_PER_PHONE_PER_DAY = 5;
const MAX_PER_IP_PER_HOUR = 20;

// SHA-256 is right here where the input is a 6-digit code with a short life and a hard attempt
// cap — a slow KDF would only add latency to every send without changing what an attacker can do.
const hashCode = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}`).digest("hex");

const equals = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

export type OtpIssue =
  | { ok: true; code: string; expiresAt: Date; resendAfterSeconds: number }
  | { ok: false; reason: string; retryAfterSeconds?: number };

/**
 * Issues a code for a phone number, refusing when a limit says no.
 *
 * Three separate limits, because they stop different things: the cooldown stops one shopper
 * hammering resend, the daily cap stops one number being used to burn SMS credit, and the
 * hourly IP cap stops a script cycling through many numbers from one place.
 */
export async function issueOtp(phone: string, ip: string): Promise<OtpIssue> {
  const now = Date.now();

  const latest = await prisma.phoneOtp.findFirst({ where: { phone }, orderBy: { createdAt: "desc" } });
  if (latest) {
    const elapsed = (now - latest.createdAt.getTime()) / 1000;
    if (elapsed < RESEND_COOLDOWN_SECONDS) {
      return { ok: false, reason: "ขอรหัสใหม่ได้อีกครั้งหลังครบ 5 นาที", retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed) };
    }
  }

  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  if (await prisma.phoneOtp.count({ where: { phone, createdAt: { gte: since24h } } }) >= MAX_PER_PHONE_PER_DAY) {
    return { ok: false, reason: "เบอร์นี้ขอรหัสครบจำนวนสูงสุดของวันนี้แล้ว กรุณาลองใหม่พรุ่งนี้" };
  }

  const since1h = new Date(now - 60 * 60 * 1000);
  if (ip && await prisma.phoneOtp.count({ where: { ip, createdAt: { gte: since1h } } }) >= MAX_PER_IP_PER_HOUR) {
    return { ok: false, reason: "ขอรหัสถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" };
  }

  const code = String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
  const expiresAt = new Date(now + OTP_TTL_MINUTES * 60 * 1000);
  // Any earlier code for this number stops working the moment a new one is issued.
  await prisma.phoneOtp.updateMany({ where: { phone, consumedAt: null }, data: { consumedAt: new Date() } });
  await prisma.phoneOtp.create({ data: { phone, codeHash: hashCode(phone, code), expiresAt, ip } });

  return { ok: true, code, expiresAt, resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
}

export type OtpCheck = { ok: true } | { ok: false; reason: string };

/** Consumes a code. A used code cannot be replayed, and wrong guesses are capped. */
export async function verifyOtp(phone: string, code: string): Promise<OtpCheck> {
  const record = await prisma.phoneOtp.findFirst({ where: { phone, consumedAt: null }, orderBy: { createdAt: "desc" } });
  if (!record) return { ok: false, reason: "ยังไม่ได้ขอรหัส OTP หรือรหัสถูกใช้ไปแล้ว" };
  if (record.expiresAt.getTime() < Date.now()) return { ok: false, reason: "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่" };
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: "กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่" };

  if (!equals(record.codeHash, hashCode(phone, code.trim()))) {
    const updated = await prisma.phoneOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_VERIFY_ATTEMPTS - updated.attempts;
    return { ok: false, reason: left > 0 ? `รหัส OTP ไม่ถูกต้อง (เหลืออีก ${left} ครั้ง)` : "กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่" };
  }

  await prisma.phoneOtp.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true };
}

// Proxies put the original address first in x-forwarded-for.
export const clientIp = (request: Request) =>
  (request.headers.get("x-forwarded-for")?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "").trim();
