import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_COOKIE, readCustomerSession } from "@/lib/customer-session";

// Route handlers run on Node, so password hashing can use scrypt instead of pulling in a dependency.
const scryptAsync = promisify(scrypt) as (password: string, salt: string, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// Thai mobile numbers are stored in the local 0XXXXXXXXX form so login and signup always agree.
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("66")) return `0${digits.slice(2)}`;
  return digits;
}

export const isValidPhone = (phone: string) => /^0[0-9]{9}$/.test(phone);

/**
 * The signed-in shopper, or null.
 *
 * Memoised per request: a storefront page asks for it, the layout asks again, and the header
 * needs the name — all from the same cookie, so one lookup answers all of them. The cache is
 * keyed by the call, and the cookie cannot change mid-request, so there is no way for one
 * shopper's row to be handed to another.
 */
export const getCurrentCustomer = cache(async () => {
  const customerId = await readCustomerSession((await cookies()).get(CUSTOMER_COOKIE)?.value);
  if (!customerId) return null;
  return prisma.customer.findUnique({ where: { id: customerId } });
});
