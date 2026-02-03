import { redirect } from "next/navigation";

export default function DashboardIndex() {
  // Redirect to main Customers page
  redirect("/dashboard/customers");
}
