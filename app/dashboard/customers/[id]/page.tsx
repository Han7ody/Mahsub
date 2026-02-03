import CustomerProfileClient from "./CustomerProfileClient";

export const dynamicParams = false;

export async function generateStaticParams() {
  return [{ id: "demo" }] as Array<{ id: string }>;
}

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerProfileClient customerId={id} />;
}