import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos live in DigitalOcean Spaces; the bucket differs between dev and prod.
    remotePatterns: [{ protocol: "https", hostname: "**.digitaloceanspaces.com", port: "", search: "" }],
  },
};

export default nextConfig;
