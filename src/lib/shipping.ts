// Carriers the shop hands parcels to, and how to look a parcel up.
// No Prisma import, so the CMS form and the storefront share one definition.

export const CARRIERS = [
  {
    key: "FLASH",
    label: "Flash Express",
    // Verified: the site keeps ?se= and shows that parcel.
    track: (no: string) => `https://www.flashexpress.com/fle/tracking?se=${encodeURIComponent(no)}`,
  },
  {
    key: "KEX",
    label: "KEX Express",
    // Their tracking page is confirmed, but no query parameter for it could be verified —
    // so this opens the page and the number is copied by hand rather than guessing a param
    // that might silently show the wrong parcel.
    track: () => "https://th.kex-express.com/th/track-parcel",
  },
  {
    key: "THAIPOST",
    label: "ไปรษณีย์ไทย",
    // Verified: the site keeps ?trackNumber= and shows that parcel.
    track: (no: string) => `https://track.thailandpost.co.th/?trackNumber=${encodeURIComponent(no)}`,
  },
] as const;

export type CarrierKey = (typeof CARRIERS)[number]["key"];

export const SHIPPING_STATUSES = [
  { key: "PENDING", label: "รอจัดส่ง" },
  { key: "SHIPPED", label: "จัดส่งแล้ว" },
  { key: "DELIVERED", label: "ถึงมือผู้รับ" },
] as const;

export const carrierOf = (key: string | null) => CARRIERS.find((carrier) => carrier.key === key) ?? null;
export const carrierLabel = (key: string | null) => carrierOf(key)?.label ?? "—";
export const shippingLabel = (key: string) => SHIPPING_STATUSES.find((status) => status.key === key)?.label ?? key;

export const trackingUrl = (carrier: string | null, trackingNumber: string | null) => {
  const found = carrierOf(carrier);
  return found && trackingNumber ? found.track(trackingNumber) : null;
};

export const isValidCarrier = (key: string): key is CarrierKey => CARRIERS.some((carrier) => carrier.key === key);
