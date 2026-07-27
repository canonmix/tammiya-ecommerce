import { NextResponse } from "next/server";
import { uploadProductImage } from "@/lib/storage";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const formData = await request.formData();
  const files = formData.getAll("images").filter((value): value is File => value instanceof File);
  if (!files.length) return NextResponse.json({ error: "No images uploaded" }, { status: 400 });
  try { const urls = await Promise.all(files.map(uploadProductImage)); return NextResponse.json({ urls }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed" }, { status: 400 }); }
}
