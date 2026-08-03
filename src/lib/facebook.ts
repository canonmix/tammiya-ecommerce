import type { NextRequest } from "next/server";

export const FACEBOOK_STATE_COOKIE = "tamiya_fb_state";

export const isFacebookConfigured = () => Boolean(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);

// Facebook matches the redirect URI byte for byte against the app settings, so an explicit
// override wins over the request origin (which differs between localhost, LAN IP and prod).
export const facebookRedirectUri = (request: NextRequest) =>
  process.env.FACEBOOK_REDIRECT_URI || new URL("/api/auth/facebook/callback", request.nextUrl.origin).toString();
