import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import { CUSTOMER_COOKIE, readCustomerSession } from "@/lib/customer-session";

// Server Components cannot read the request path, so it is forwarded as a header for the
// admin layout to turn into a per-menu permission check.
const withPath = (request: NextRequest, pathname: string) => {
  const headers = new Headers(request.headers);
  headers.set("x-admin-path", pathname);
  return NextResponse.next({ request: { headers } });
};

async function guardAdmin(request: NextRequest, pathname: string) {
  if (pathname === "/admin/login" || pathname === "/api/admin/login") return withPath(request, pathname);
  if (await isValidAdminSession(request.cookies.get(ADMIN_COOKIE)?.value)) return withPath(request, pathname);

  if (pathname.startsWith("/api/admin/")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

// Step 3 of the checkout flow: everything past the cart summary requires a signed-in shopper.
async function guardCustomer(request: NextRequest, pathname: string) {
  if (await readCustomerSession(request.cookies.get(CUSTOMER_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) return guardAdmin(request, pathname);
  return guardCustomer(request, pathname);
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/checkout/:path*", "/api/checkout/:path*"] };
