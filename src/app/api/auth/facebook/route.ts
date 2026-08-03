import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { FACEBOOK_STATE_COOKIE, facebookRedirectUri, isFacebookConfigured } from "@/lib/facebook";

// Step 1 of the Facebook login: bounce the shopper to the consent dialog.
export async function GET(request: NextRequest) {
  if (!isFacebookConfigured()) {
    const url = new URL("/login", request.url);
    url.searchParams.set("error", "facebook_not_configured");
    return NextResponse.redirect(url);
  }

  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const state = randomBytes(16).toString("hex");

  const dialog = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  dialog.searchParams.set("client_id", process.env.FACEBOOK_CLIENT_ID!);
  dialog.searchParams.set("redirect_uri", facebookRedirectUri(request));
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("scope", "public_profile");

  const response = NextResponse.redirect(dialog);
  // The state cookie carries the return path too, so the callback never trusts a query parameter for it.
  response.cookies.set(FACEBOOK_STATE_COOKIE, `${state}|${next}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });
  return response;
}
