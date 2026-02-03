import SupplierProfileClient from "./SupplierProfileClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ id: "demo" }] as Array<{ id: string }>;
}

export default async function SupplierProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SupplierProfileClient supplierId={id} />;
}