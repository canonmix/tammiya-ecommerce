"use client";

import { useEffect } from "react";
import { clearCart } from "@/lib/cart";

// The order is placed, so the browser cart must not survive a refresh or a back-button visit.
export default function ClearCartOnMount() {
  useEffect(() => { clearCart(); }, []);
  return null;
}
