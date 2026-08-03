"use client";

import { useSyncExternalStore } from "react";

// The cart spans several routes (grid → summary → login → address → payment), so it lives in
// localStorage. useSyncExternalStore subscribes to it without the hydration mismatch — or the
// effect-driven setState — that a useState copy would need.
export type CartLine = { id: string; qty: number };

// v1 stored a flat array of ids with no quantities; the key change retires those carts cleanly.
const STORAGE_KEY = "tammiya.cart.v2";
const EMPTY: CartLine[] = [];

const listeners = new Set<() => void>();
// getSnapshot must return a stable reference between renders, so the parse is cached.
let snapshot: CartLine[] | null = null;

function getSnapshot(): CartLine[] {
  if (snapshot) return snapshot;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as CartLine[]) : EMPTY;
    snapshot = Array.isArray(parsed) ? parsed.filter((line) => line && typeof line.id === "string" && line.qty > 0) : EMPTY;
  } catch {
    // A corrupt entry just means starting from an empty cart.
    snapshot = EMPTY;
  }
  return snapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab writing the cart invalidates our cached parse.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      snapshot = null;
      listeners.forEach((notify) => notify());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function save(lines: CartLine[]) {
  snapshot = lines;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  listeners.forEach((notify) => notify());
}

export function clearCart() {
  save(EMPTY);
}

export function useCart() {
  const items = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  return {
    items,
    count: items.reduce((sum, line) => sum + line.qty, 0),
    add: (id: string, qty = 1) => {
      const current = getSnapshot();
      const existing = current.find((line) => line.id === id);
      save(existing ? current.map((line) => (line.id === id ? { ...line, qty: line.qty + qty } : line)) : [...current, { id, qty }]);
    },
    setQty: (id: string, qty: number) => {
      const current = getSnapshot();
      save(qty <= 0 ? current.filter((line) => line.id !== id) : current.map((line) => (line.id === id ? { ...line, qty } : line)));
    },
    remove: (id: string) => save(getSnapshot().filter((line) => line.id !== id)),
    clear: clearCart,
  };
}
