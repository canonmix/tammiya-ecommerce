import type { Metadata } from "next";
import AccountProfile from "@/components/account-profile";
import { getCurrentCustomer } from "@/lib/customer-auth";

export const metadata: Metadata = { title: "ข้อมูลส่วนตัว", robots: { index: false } };

export default async function ProfilePage() {
  // The layout already guarantees a signed-in customer; this read is for the initial values.
  const customer = await getCurrentCustomer();
  if (!customer) return null;
  return <AccountProfile initialName={customer.name} phone={customer.phone} hasPassword={Boolean(customer.passwordHash)}/>;
}
