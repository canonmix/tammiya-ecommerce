import { NextResponse } from "next/server";
import { CUSTOMER_COOKIE } from "@/lib/customer-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(CUSTOMER_COOKIE);
  return response;
}
