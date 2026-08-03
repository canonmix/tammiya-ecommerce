import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // next dev blocks cross-origin requests to /_next/* by default. Without the host here the
  // client bundle never loads through a tunnel, the page renders but never hydrates, and every
  // button (add to cart included) silently does nothing. Wildcards are supported.
  // The LAN address changes with the DHCP lease, so the whole home subnet is listed rather than
  // one host — testing on a phone should not depend on which IP the router handed out today.
  allowedDevOrigins: ["192.168.1.*", "127.0.0.1", "*.trycloudflare.com", "*.ngrok-free.app", "*.ngrok.io"],
  images: {
    // Product photos live in DigitalOcean Spaces; the bucket differs between dev and prod.
    remotePatterns: [{ protocol: "https", hostname: "**.digitaloceanspaces.com", port: "", search: "" }],
    // AVIF first, WebP behind it. Product photography is the heaviest thing on a phone here, and
    // AVIF is roughly a third smaller than WebP at the same quality — the difference shows up
    // directly in LCP on mobile data, which is what the shop is graded on.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
