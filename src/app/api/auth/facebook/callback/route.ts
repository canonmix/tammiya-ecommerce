import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeNext } from "@/lib/safe-next";
import { CUSTOMER_COOKIE, CUSTOMER_SESSION_MAX_AGE, createCustomerSession } from "@/lib/customer-session";
import { sessionCookieOptions } from "@/lib/auth-cookie";
import { FACEBOOK_STATE_COOKIE, facebookRedirectUri, isFacebookConfigured } from "@/lib/facebook";

const loginWithError = (request: NextRequest, reason: string) => {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", reason);
  return NextResponse.redirect(url);
};

// Step 2 of the Facebook login: swap the code for a token, then match or create the customer.
export async function GET(request: NextRequest) {
  if (!isFacebookConfigured()) return loginWithError(request, "facebook_not_configured");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const [expectedState, storedNext] = (request.cookies.get(FACEBOOK_STATE_COOKIE)?.value ?? "").split("|");
  if (!code || !state || !expectedState || state !== expectedState) return loginWithError(request, "facebook_state");

  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", process.env.FACEBOOK_CLIENT_ID!);
  tokenUrl.searchParams.set("client_secret", process.env.FACEBOOK_CLIENT_SECRET!);
  tokenUrl.searchParams.set("redirect_uri", facebookRedirectUri(request));
  tokenUrl.searchParams.set("code", code);

  const token = (await fetch(tokenUrl, { cache: "no-store" }).then((response) => response.json()).catch(() => null)) as { access_token?: string } | null;
  if (!token?.access_token) return loginWithError(request, "facebook_token");

  const profileUrl = new URL("https://graph.facebook.com/v21.0/me");
  profileUrl.searchParams.set("fields", "id,name");
  profileUrl.searchParams.set("access_token", token.access_token);
  const profile = (await fetch(profileUrl, { cache: "no-store" }).then((response) => response.json()).catch(() => null)) as { id?: string; name?: string } | null;
  if (!profile?.id) return loginWithError(request, "facebook_profile");

  const customer = await prisma.customer.upsert({
    where: { facebookId: profile.id },
    update: { name: profile.name || undefined },
    create: { facebookId: profile.id, name: profile.name || "ลูกค้า Facebook" },
  });

  const response = NextResponse.redirect(new URL(safeNext(storedNext), request.url));
  response.cookies.set(CUSTOMER_COOKIE, await createCustomerSession(customer.id), sessionCookieOptions(CUSTOMER_SESSION_MAX_AGE));
  response.cookies.delete(FACEBOOK_STATE_COOKIE);
  return response;
}
