"use client";

import { useSyncExternalStore } from "react";

// The coupon code has to survive the cart → login → address hop, so it lives in sessionStorage.
// Same external-store pattern as the cart: reading it in an effect would mean a setState during
// the effect body, which React (and the lint rule) rightly object to.
const KEY = "tammiya.coupon";
const listeners = new Set<() => void>();
let snapshot: string | null = null;

function getSnapshot() {
  if (snapshot !== null) return snapshot;
  try {
    snapshot = window.sessionStorage.getItem(KEY) ?? "";
  } catch {
    snapshot = "";
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function setCouponCode(code: string) {
  const next = code.trim().toUpperCase();
  snapshot = next;
  try {
    if (next) window.sessionStorage.setItem(KEY, next);
    else window.sessionStorage.removeItem(KEY);
  } catch {
    // A blocked storage just means the code lives for this page only.
  }
  listeners.forEach((notify) => notify());
}

export const clearCouponCode = () => setCouponCode("");

export const useCouponCode = () => useSyncExternalStore(subscribe, getSnapshot, () => "");
