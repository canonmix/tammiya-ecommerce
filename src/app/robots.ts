import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/**
 * Everything a shopper can reach without a session is crawlable; everything behind one is not.
 *
 * The blocked list is not about secrecy — those routes are protected server-side — it is about
 * crawl budget and duplicate content. A crawler that spends its budget on `/checkout/payment/ABC`
 * is not spending it on product pages, and a signed-out crawl of `/account` is an empty shell
 * that only dilutes the index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/account", "/account/", "/checkout", "/checkout/", "/cart", "/login", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
