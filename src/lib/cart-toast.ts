"use client";

import { useSyncExternalStore } from "react";

// Confirmation that something went into the cart. A module-level store because the buttons that
// trigger it are scattered across server-rendered pages, while the toast itself lives once in
// the header — there is no common client parent to hold this state.

export type CartToast = { id: number; name: string };

const listeners = new Set<() => void>();
let snapshot: CartToast | null = null;
let sequence = 0;

const emit = () => listeners.forEach((notify) => notify());

/** Announce that `name` was added; the same product added twice still re-triggers the toast. */
export function showCartToast(name: string) {
  snapshot = { id: ++sequence, name };
  emit();
}

export function dismissCartToast() {
  snapshot = null;
  emit();
}

export function useCartToast() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => snapshot,
    () => null,
  );
}
