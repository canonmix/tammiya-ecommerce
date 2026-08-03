/**
 * One source of truth for everything a crawler, a social card or a structured-data block needs
 * to know about this shop.
 *
 * The absolute origin has to be resolvable at build time (sitemap.xml, robots.txt and OG image
 * URLs are all absolute), so it comes from an env var rather than from the incoming request.
 * `NEXT_PUBLIC_SITE_URL` wins; on Vercel previews the platform host stands in so preview builds
 * still emit working absolute URLs instead of pointing at production.
 */
const fromEnv = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

// Trailing slashes turn `${siteUrl}/products` into a double slash, which search engines treat as
// a separate URL — strip it once here instead of at every call site.
export const siteUrl = (fromEnv || "http://localhost:3000").replace(/\/+$/, "");

export const siteName = "MINI4WD Premium Shop";
export const siteTagline = "โมเดลและอะไหล่ Tamiya Mini 4WD ของแท้";
export const siteDescription = "ร้าน Tamiya Mini 4WD ของแท้ รวมรถ Mini 4WD อะไหล่ มอเตอร์ โรลเลอร์ และของแต่งครบทุกรหัส ส่งไวจากคลังในไทย เก็บเงินปลายทางทั่วประเทศ";

export const siteKeywords = [
  "Tamiya",
  "Mini 4WD",
  "มินิโฟร์วีล",
  "รถทามิย่า",
  "อะไหล่ Mini 4WD",
  "มอเตอร์ทามิย่า",
  "โรลเลอร์ Mini 4WD",
  "ของแต่ง Mini 4WD",
  "ร้านทามิย่าออนไลน์",
];

/** Absolute URL for a storefront path. Structured data and sitemaps may not use relative paths. */
export const absoluteUrl = (path = "/") => `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * The shop as an Organization, reused by every JSON-LD block that has to name a seller.
 * `@id` is stable so Product/Offer/Breadcrumb nodes can reference this one node instead of
 * repeating the whole organization on every page.
 */
export const organizationId = absoluteUrl("/#organization");
export const websiteId = absoluteUrl("/#website");

export const organizationSchema = () => ({
  "@type": "Organization",
  "@id": organizationId,
  name: siteName,
  alternateName: ["Tamiya Premium Shop", "MINI4WD Shop"],
  url: absoluteUrl("/"),
  logo: { "@type": "ImageObject", url: absoluteUrl("/mini4wd-premium-shop-logo.png"), width: 580, height: 126 },
  description: siteDescription,
  areaServed: { "@type": "Country", name: "Thailand" },
});

export const websiteSchema = () => ({
  "@type": "WebSite",
  "@id": websiteId,
  url: absoluteUrl("/"),
  name: siteName,
  description: siteDescription,
  inLanguage: "th-TH",
  publisher: { "@id": organizationId },
  // Lets Google offer a search box for the shop straight in the result page. The target must be a
  // URL the catalog actually understands — `/products?q=` is wired to the catalog search box.
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/products")}?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
});

/** Breadcrumbs, given as [label, path] pairs from the home page down to the current page. */
export const breadcrumbSchema = (trail: Array<[label: string, path: string]>) => ({
  "@type": "BreadcrumbList",
  itemListElement: trail.map(([name, path], index) => ({
    "@type": "ListItem",
    position: index + 1,
    name,
    item: absoluteUrl(path),
  })),
});

/** Wraps nodes in a single @graph so one script tag carries every entity on the page. */
export const jsonLdGraph = (...nodes: object[]) => JSON.stringify({ "@context": "https://schema.org", "@graph": nodes });
