import { siteName } from "@/lib/site";

/**
 * The shop's wordmark, set in type rather than shipped as an image.
 *
 * The previous logo was a raster of the old name baked into the pixels, so renaming the shop
 * would have left every header, footer and login screen still reading the old one. Type has no
 * such problem: the name comes from `siteName`, it stays sharp at any size, it inherits the
 * surrounding colour so one component serves both the ink header and the white login card, and
 * it costs no image request on the critical path.
 *
 * Drop in a real logo file later by replacing this component — every surface picks it up at once.
 */
export default function BrandMark({ className = "text-base" }: { className?: string }) {
  // Split on the hyphen so it can be the one coloured element; a wordmark needs one accent, not
  // two. Names without a hyphen simply render whole.
  const [head, ...rest] = siteName.split("-");
  const tail = rest.join("-");

  return <span className={`font-display leading-none font-extrabold tracking-tight whitespace-nowrap ${className}`}>
    {head}
    {tail && <><span className="text-[#ef6c3d]">-</span>{tail}</>}
  </span>;
}
