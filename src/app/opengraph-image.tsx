import { ImageResponse } from "next/og";
import { siteName, siteTagline } from "@/lib/site";

// The default social card for every page that does not generate one of its own.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${siteName} — ${siteTagline}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#0e141b", padding: 72, position: "relative" }}>
        <div style={{ position: "absolute", top: -160, left: -120, width: 620, height: 620, borderRadius: 999, display: "flex", background: "radial-gradient(circle, rgba(239,108,61,.55) 0%, rgba(239,108,61,0) 70%)" }}/>
        <div style={{ display: "flex", alignItems: "center", gap: 18, position: "relative" }}>
          <div style={{ display: "flex", width: 18, height: 18, borderRadius: 999, background: "#ef6c3d" }}/>
          <div style={{ display: "flex", color: "rgba(255,255,255,.62)", fontSize: 26, fontWeight: 700, letterSpacing: 6 }}>AUTHENTIC TAMIYA SELECTION</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 92, fontWeight: 900, letterSpacing: -3, lineHeight: 1.05 }}>{siteName}</div>
          <div style={{ display: "flex", color: "#ff9152", fontSize: 40, fontWeight: 700, marginTop: 18 }}>{siteTagline}</div>
        </div>
        <div style={{ display: "flex", gap: 14, position: "relative" }}>
          {["ของแท้ 100%", "ส่งไวจากคลังไทย", "เก็บเงินปลายทาง"].map((chip) => (
            <div key={chip} style={{ display: "flex", padding: "12px 26px", borderRadius: 999, border: "2px solid rgba(255,255,255,.18)", color: "rgba(255,255,255,.8)", fontSize: 26, fontWeight: 600 }}>{chip}</div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
