import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tammiya-ecommerce.example.com"),
  title: { default: "Tamiya Premium Shop | โมเดลและอะไหล่ Mini 4WD", template: "%s | Tamiya Premium Shop" },
  description: "ร้าน Tamiya Premium Shop รวมรถ Mini 4WD อะไหล่ มอเตอร์ และอุปกรณ์แต่งรถของแท้สำหรับนักสะสมและนักแข่ง",
  keywords: ["Tamiya", "Mini 4WD", "รถทามิย่า", "อะไหล่ Mini 4WD", "มอเตอร์ทามิย่า"],
  openGraph: { title: "Tamiya Premium Shop", description: "เติมความเร็วให้ทุกคัน ด้วยของแท้สำหรับนักสะสมและนักแข่ง", type: "website" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
