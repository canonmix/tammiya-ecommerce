export type Product = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  stock: number;
  badge?: string;
  description: string;
  color: string;
};

export const products: Product[] = [
  { id: "1", sku: "15437", name: "Aero Avante Clear Blue", slug: "aero-avante-clear-blue", category: "รถ Mini 4WD", price: 890, stock: 12, badge: "ขายดี", description: "รถแข่ง Mini 4WD รุ่นยอดนิยม สีฟ้าใส พร้อมชุดแต่งลิมิเต็ด", color: "#c4e9f2" },
  { id: "2", sku: "18652", name: "Neo-VQS Advanced Pack", slug: "neo-vqs-advanced-pack", category: "รถ Mini 4WD", price: 1290, stock: 8, badge: "ใหม่", description: "ชุด Advanced Pack สำหรับนักสะสมและนักแข่งตัวจริง", color: "#d7d0fc" },
  { id: "3", sku: "15375", name: "Hyper Dash PRO Motor", slug: "hyper-dash-pro-motor", category: "อะไหล่และมอเตอร์", price: 420, stock: 25, description: "มอเตอร์ประสิทธิภาพสูงสำหรับสนามแข่งระดับจริงจัง", color: "#ffddad" },
  { id: "4", sku: "15517", name: "Premium Tool Set", slug: "premium-tool-set", category: "อุปกรณ์แต่งรถ", price: 750, stock: 5, badge: "เหลือไม่เยอะ", description: "ชุดเครื่องมือพรีเมียมสำหรับประกอบและปรับแต่งรถ Mini 4WD", color: "#f5d1d9" },
  { id: "5", sku: "18649", name: "Mach Frame Black Special", slug: "mach-frame-black-special", category: "รถ Mini 4WD", price: 990, stock: 16, description: "รุ่นพิเศษสีดำด้าน ดีไซน์ดุดันพร้อมลงสนาม", color: "#c6ccd2" },
  { id: "6", sku: "15479", name: "13mm Aluminum Ball-Race Rollers (Ringless)", slug: "aluminum-roller-13mm", category: "อะไหล่และมอเตอร์", price: 530, stock: 19, description: "ลูกกลิ้งอะลูมิเนียม 13mm งาน CNC น้ำหนักเบา", color: "#ead9bd" },
];

export const formatBaht = (value: number) => `฿${value.toLocaleString("th-TH")}`;
