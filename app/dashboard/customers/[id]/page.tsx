import CustomerProfileClient from "./CustomerProfileClient";

// Allow dynamic ids so customer profiles open correctly.
export const dynamicParams = true;

export default async function CustomerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CustomerProfileClient customerId={id} />;
}