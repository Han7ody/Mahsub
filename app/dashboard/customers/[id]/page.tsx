import CustomerProfileClient from "./CustomerProfileClient";

import { customers } from "@/mocks/customers";

// Required for `output: 'export'` (GitHub Pages static export).
export const dynamicParams = false;

export async function generateStaticParams() {
  return customers.map((customer) => ({ id: String(customer.id) }));
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerProfileClient customerId={id} />;
}