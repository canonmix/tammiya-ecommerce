# MOJUNG-SHOP

SEO-first e-commerce starter for Tamiya Mini 4WD products.

## Included

- SEO-friendly storefront with category filtering and product cards
- Checkout flow with Cash on Delivery and QR Payment choices
- Login UI for Facebook OAuth and mobile OTP
- CMS dashboard for sales overview, products, customers, and recent orders
- Thai metadata, semantic sections, structured-ready product data, and responsive UI
- Product-code SEO: searchable and indexable pages for `Tamiya 15437`, `15437`, and product names
- Per-product metadata, canonical URLs, and JSON-LD Product/Offer schema
- Admin CMS protected by an HttpOnly, HMAC-signed session cookie

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the storefront and [http://localhost:3000/admin](http://localhost:3000/admin) for CMS.

## Production integrations still required

This repository intentionally keeps secrets out of source control. Copy `.env.example` to `.env.local` and connect:

- PostgreSQL + Prisma is configured for persistent products, orders, inventory, and dashboard aggregates
- DigitalOcean Spaces for multiple product images. Development uses `tamiya-premium/dev`; production uses `tamiya-premium/prod`.
- Auth.js Facebook provider and an SMS/OTP provider
- PromptPay/QR payment provider and a verified payment webhook
- Object storage/CDN for real product photography

## Routes

- `/` storefront
- `/login` Facebook + mobile OTP entry point
- `/checkout` COD + QR checkout
- `/admin` CMS dashboard prototype
