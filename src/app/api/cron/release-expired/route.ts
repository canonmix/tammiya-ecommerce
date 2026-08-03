import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { releaseExpiredOrders } from "@/lib/orders";

/**
 * Cron entry point: cancels orders whose payment window lapsed and puts their reserved
 * stock back on sale.
 *
 * The work itself lives in releaseExpiredOrders so the scheduler and the traffic-driven
 * sweep can never drift apart. GET and POST both run it — hosted schedulers (Vercel Cron)
 * issue GET, while curl from a system crontab is usually POST.
 */
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : request.headers.get("x-cron-secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า CRON_SECRET" }, { status: 503 });
  }
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const startedAt = Date.now();
  // force skips the throttle the storefront uses — a scheduled run must always do the work.
  const released = await releaseExpiredOrders({ force: true });
  return NextResponse.json({ ok: true, released, durationMs: Date.now() - startedAt, ranAt: new Date().toISOString() });
}

export const GET = run;
export const POST = run;
