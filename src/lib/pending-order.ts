"use client";

import { useSyncExternalStore } from "react";
import type { PendingOrder } from "@/lib/orders";

// Whether an unpaid order is blocking the shop, shared by every add-to-cart button on the page.
// A module-level store rather than a context: the buttons are rendered by server components all
// over the catalogue, so there is no single client parent to hang a provider from.

const listeners = new Set<() => void>();
let snapshot: PendingOrder | null = null;
let loaded = false;
let inFlight: Promise<void> | null = null;

const emit = () => listeners.forEach((notify) => notify());

function load() {
  if (inFlight) return inFlight;
  inFlight = fetch("/api/account/pending-order", { cache: "no-store" })
    .then((response) => response.json())
    .then((data: { order?: PendingOrder | null }) => { snapshot = data?.order ?? null; })
    .catch(() => { snapshot = null; })
    .finally(() => { loaded = true; inFlight = null; emit(); });
  return inFlight;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!loaded) load();
  return () => { listeners.delete(listener); };
}

/** Re-read after paying or cancelling, so the buttons come back to life without a reload. */
export function refreshPendingOrder() {
  loaded = false;
  inFlight = null;
  return load();
}

/** The unpaid order in the way, or null. `undefined` while the first fetch is still out. */
export function usePendingOrder(): PendingOrder | null | undefined {
  return useSyncExternalStore(
    subscribe,
    () => (loaded ? snapshot : undefined),
    // The server pass knows nothing yet; the buttons stay in their normal state until it lands.
    () => undefined,
  );
}
