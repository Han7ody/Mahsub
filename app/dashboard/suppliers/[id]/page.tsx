import SupplierProfileClient from "./SupplierProfileClient";

// Allow dynamic ids so supplier profiles open correctly.
export const dynamicParams = true;

export default async function SupplierProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupplierProfileClient supplierId={id} />;
}