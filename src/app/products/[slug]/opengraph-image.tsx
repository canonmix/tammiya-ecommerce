import { ImageResponse } from "next/og";
import { getCatalogProduct } from "@/lib/catalog";
import { siteName } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "สินค้าของ MINI4WD Premium Shop";

// Price and stock move with the CMS, and the card shows the price, so it is rendered per request.
export const dynamic = "force-dynamic";

/**
 * The social card for a single product: photo on the right, code and price on the left.
 *
 * In this hobby the part code is what people recognise before the name, so it is set larger than
 * the product title — the same hierarchy the product page and the cards use.
 */
export default async function ProductOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);

  if (!product) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#0e141b", color: "#ffffff", fontSize: 64, fontWeight: 900 }}>{siteName}</div>
      ),
      size,
    );
  }

  const photo = product.images[0];
  const price = `฿${product.price.toLocaleString("th-TH")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0e141b", position: "relative" }}>
        <div style={{ position: "absolute", top: -200, left: -140, width: 640, height: 640, borderRadius: 999, display: "flex", background: "radial-gradient(circle, rgba(239,108,61,.5) 0%, rgba(239,108,61,0) 70%)" }}/>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: photo ? 660 : 1200, padding: 72, position: "relative" }}>
          <div style={{ display: "flex", color: "#ff9152", fontSize: 34, fontWeight: 800, letterSpacing: 4 }}>TAMIYA {product.sku}</div>
          <div style={{ display: "flex", color: "#ffffff", fontSize: photo ? 58 : 78, fontWeight: 900, letterSpacing: -2, lineHeight: 1.12, marginTop: 20 }}>{product.name.slice(0, 72)}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 34 }}>
            <div style={{ display: "flex", color: "#ffffff", fontSize: 66, fontWeight: 900 }}>{price}</div>
            {product.discountPercent > 0 && <div style={{ display: "flex", background: "#ef6c3d", color: "#ffffff", fontSize: 30, fontWeight: 800, padding: "10px 22px", borderRadius: 999 }}>-{product.discountPercent}%</div>}
          </div>
          <div style={{ display: "flex", color: "rgba(255,255,255,.55)", fontSize: 27, fontWeight: 600, marginTop: 30 }}>{siteName} · ของแท้ ส่งไวจากคลังไทย</div>
        </div>
        {photo && <div style={{ display: "flex", width: 540, height: "100%", background: product.color }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders raw <img>, not next/image. */}
          <img src={photo} alt="" width={540} height={630} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
        </div>}
      </div>
    ),
    size,
  );
}
