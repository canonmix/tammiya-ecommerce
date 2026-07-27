import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/admin/login";
  const isLoginApi = pathname === "/api/admin/login";
  if (isLoginPage || isLoginApi) return NextResponse.next();

  const valid = await isValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
  if (valid) return NextResponse.next();

  if (pathname.startsWith("/api/admin/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };
