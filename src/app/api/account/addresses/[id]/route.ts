import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { readAddress, type AddressBody } from "@/app/api/account/addresses/route";

const owned = async (id: string, customerId: string) => prisma.address.findFirst({ where: { id, customerId }, include: { _count: { select: { orders: true } } } });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;
  const address = await owned(id, customer.id);
  if (!address) return NextResponse.json({ error: "ไม่พบที่อยู่" }, { status: 404 });
  // An address already attached to an order is that order's record and must not change.
  if (address._count.orders > 0) return NextResponse.json({ error: "ที่อยู่นี้ถูกใช้กับคำสั่งซื้อไปแล้ว จึงแก้ไขไม่ได้ — เพิ่มที่อยู่ใหม่แทนได้" }, { status: 409 });

  const result = readAddress((await request.json().catch(() => null)) as AddressBody);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(await prisma.address.update({ where: { id }, data: result.data! }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const customer = await getCurrentCustomer();
  if (!customer) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });

  const { id } = await params;
  const address = await owned(id, customer.id);
  if (!address) return NextResponse.json({ error: "ไม่พบที่อยู่" }, { status: 404 });
  if (address._count.orders > 0) return NextResponse.json({ error: "ที่อยู่นี้ผูกกับคำสั่งซื้อไปแล้ว จึงลบไม่ได้" }, { status: 409 });

  await prisma.address.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
