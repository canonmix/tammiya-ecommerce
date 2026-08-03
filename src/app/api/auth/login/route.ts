import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone, verifyPassword } from "@/lib/customer-auth";
import { CUSTOMER_COOKIE, CUSTOMER_SESSION_MAX_AGE, createCustomerSession } from "@/lib/customer-session";
import { sessionCookieOptions } from "@/lib/auth-cookie";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { phone?: string; password?: string } | null;
  const phone = normalizePhone(body?.phone ?? "");
  const password = body?.password ?? "";

  const customer = phone ? await prisma.customer.findUnique({ where: { phone } }) : null;
  // One message for both cases so the form cannot be used to discover which numbers are registered.
  if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
    return NextResponse.json({ error: "เบอร์มือถือหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, name: customer.name });
  response.cookies.set(CUSTOMER_COOKIE, await createCustomerSession(customer.id), sessionCookieOptions(CUSTOMER_SESSION_MAX_AGE));
  return response;
}
