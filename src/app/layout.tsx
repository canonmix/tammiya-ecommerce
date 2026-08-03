import type { Metadata, Viewport } from "next";
import { Anuphan, Archivo } from "next/font/google";
import "./globals.css";
import { jsonLdGraph, organizationSchema, siteDescription, siteKeywords, siteName, siteTagline, siteUrl, websiteSchema } from "@/lib/site";

// Thai and Latin are set in different faces on purpose. Anuphan is a loopless Thai sans with real
// weight range, so Thai headlines can be as heavy as the Latin ones instead of falling back to
// Arial; Archivo carries the Latin display type and the numerals — part codes, prices and
// countdowns are what this shop is read for, so they get a face with confident figures.
const thai = Anuphan({ subsets: ["thai", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-thai", display: "swap" });
const display = Archivo({ subsets: ["latin"], weight: ["600", "700", "800", "900"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteName} | ${siteTagline}`, template: `%s | ${siteName}` },
  description: siteDescription,
  keywords: siteKeywords,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: "shopping",
  // Every page declares its own canonical; this is the fallback for anything that forgets one.
  alternates: { canonical: "/" },
  // Thai phone numbers get auto-linked by Safari, which rewrites prices and part codes into
  // tel: links — "15437" becomes a phone number and the layout breaks around it.
  formatDetection: { telephone: false, address: false, email: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // Without these Google truncates the snippet and refuses large image previews, which is
      // most of what a product result is judged on.
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName,
    url: "/",
    title: `${siteName} | ${siteTagline}`,
    description: siteDescription,
  },
  twitter: { card: "summary_large_image", title: `${siteName} | ${siteTagline}`, description: siteDescription },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Pinch-zoom stays available on purpose: capping it is a WCAG failure, and shoppers zoom into
  // part photos and codes constantly.
  maximumScale: 5,
  userScalable: true,
  // The header and the bottom tab bar are ink-dark, so the phone's own chrome matches them.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e141b" },
    { media: "(prefers-color-scheme: dark)", color: "#0e141b" },
  ],
  colorScheme: "light",
  // Ties the layout to the safe area so `env(safe-area-inset-*)` reports real values on iPhone.
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" className={`${thai.variable} ${display.variable}`}>
    <body>
      {/* Shop-wide identity, emitted once. Product, breadcrumb and listing nodes on the pages
          below reference these by @id rather than repeating them. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdGraph(organizationSchema(), websiteSchema()) }}/>
      {children}
    </body>
  </html>;
}
