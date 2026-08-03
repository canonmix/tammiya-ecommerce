---
name: shop-test-data
description: Create, use and remove throwaway customers, orders and coupons in this shop's live database without damaging the owner's real records. Use this skill whenever a change needs testing against real data — every test in this project runs against the same PostgreSQL the shop owner is using right now, so any fixture, claim, cancel or checkout has to be snapshotted first and reversed afterwards.
---

# Test data in a live shop

There is one database. The shop owner is browsing the same site while work happens, so treat
every write as production. The workflow is always: **snapshot → fixture → test → remove → diff**.

## 1. Snapshot before touching anything

```bash
npx tsx --env-file=.env.local .claude/skills/shop-test-data/scripts/snapshot.mts --save /tmp/before.json
```

## 2. Create fixtures that are recognisable and reversible

- Prefix every fixture with `TEST` (`name: "TEST ผู้ทดสอบ"`, coupon code `TESTXXXX`) and use a
  phone like `09TEST0001` that cannot collide with a real customer.
- Record the ids you created in a JSON file, and delete by id — never by pattern, never
  `deleteMany` without a `where` that names your own rows.
- Write fixture orders straight through Prisma. Do **not** run the real checkout against the
  owner's stock.

## 3. Test, then remove

Delete children first (`orderItem` → `order` → `address` → `customer`,
`couponClaim` → `coupon`), then the fixture customer.

## 4. Diff afterwards — every time

```bash
npx tsx --env-file=.env.local .claude/skills/shop-test-data/scripts/snapshot.mts --diff /tmp/before.json
```

Anything that moved and should not have gets corrected immediately, and the correction is
reported to the user in plain words. Silence is not an option here.

## Traps this project has already fallen into

- **Cancelling a fixture order inflates stock.** `cancelOrder()` returns every line's quantity to
  the product, but an order written directly to the table never took that stock. After testing a
  cancel, decrement each affected SKU by the fixture quantity. This has happened three times.
- **Claiming or spending the owner's real coupon** consumes a real quota. Click only cards whose
  text contains `TEST`; never `document.querySelector("button")` on a page that mixes real and
  fixture rows. If it happens, reset `claimedCount` to the real `couponClaim` count.
- **A fixture checkout decrements real stock.** Restore it before moving on.
- **Stale Prisma Client.** After `npx prisma db push`, restart `next dev` or the running server
  keeps a client without the new models (`Cannot read properties of undefined`).
- **`now()` in psql writes local time** into a naive UTC column, which makes expiry tests lie.
  Build dates in JS instead.

## Real records that must survive (verify, do not assume)

The owner's own data is the point of the shop. Check the snapshot diff rather than trusting a
memory of what was there: order codes beginning `TM-`, the single real customer, real coupons
without a `TEST` prefix, and product stock for the SKUs the fixture touched.
