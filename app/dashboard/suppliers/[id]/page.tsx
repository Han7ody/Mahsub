import SupplierProfileClient from "./SupplierProfileClient";

import { suppliers } from "@/mocks/suppliers";

// Required for `output: 'export'` (GitHub Pages static export).
export const dynamicParams = false;

export async function generateStaticParams() {
  return suppliers.map((supplier) => ({ id: String(supplier.id) }));
}

export default async function SupplierProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupplierProfileClient supplierId={id} />;
}