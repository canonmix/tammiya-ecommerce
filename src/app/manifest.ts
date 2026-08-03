import type { MetadataRoute } from "next";
import { siteDescription, siteName } from "@/lib/site";

/**
 * Installable-shop basics. On iOS and Android this is what turns a bookmark into a home-screen
 * icon that opens without browser chrome, and Google reads `name`/`short_name`/`theme_color`
 * when it renders the mobile install prompt.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteName} | Tamiya Mini 4WD`,
    short_name: "MINI4WD",
    description: siteDescription,
    lang: "th",
    dir: "ltr",
    start_url: "/",
    id: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#ffffff",
    theme_color: "#0e141b",
    categories: ["shopping", "lifestyle"],
    // All three are the shop's badge mark. `maskable` is safe here because the badge already sits
    // inside a wide dark margin, so Android cropping it to a circle takes nothing off the mark.
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "สินค้าทั้งหมด", short_name: "สินค้า", url: "/products" },
      { name: "ตะกร้าสินค้า", short_name: "ตะกร้า", url: "/cart" },
      { name: "คูปองส่วนลด", short_name: "คูปอง", url: "/coupons" },
    ],
  };
}
