"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLoading } from "@/lib/loading-context";
import { getCustomerById } from "@/lib/repo/customers";
import { listTransactionsBrowser } from "@/lib/repo/transactions";
import CustomerProfileView from "@/components/dashboard/CustomerProfileView";
import { customers as demoCustomers } from "@/mocks/customers";
import { demoTransactions } from "@/mocks/demo-data";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

export default function CustomerProfileClient({ customerId }: { customerId: string }) {
  const { currentBusiness } = useAuth();
  const { isLoading: globalLoading } = useLoading();
  const [customerData, setCustomerData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const businessId = currentBusiness?.id;

  const customer = useMemo(
    () => customerData,
    [customerData?.id, customerData?.name, customerData?.avatar_url, customerData?.status]
  );

  useEffect(() => {
    if (USE_BACKEND && businessId && customerId) {
      Promise.all([
        getCustomerById(customerId, businessId),
        listTransactionsBrowser({
          businessId,
          entityType: "customer",
          entityId: customerId,
        }),
      ])
        .then(([customerResult, transactionsResult]) => {
          const mappedTransactions = (transactionsResult.transactions || []).map((t) => {
            const hasReceipt = t.receipt_url || t.receipt_path;

            return {
              id: t.id,
              title: t.title || t.notes || (t.type === "out" ? "دين جديد" : "تحصيل"),
              type: t.type === "out" ? "debit" : "credit",
              amount: Number(t.amount) || 0,
              date: t.occurred_at ? new Date(t.occurred_at).toLocaleDateString("en-CA") : "",
              notes: t.notes || "",
              receipt: hasReceipt
                ? {
                    url: t.receipt_url ?? null,
                    filename: t.receipt_path?.split("/").pop() || "receipt.jpg",
                    path: t.receipt_path || "",
                  }
                : undefined,
            };
          });

          if (customerResult.customer) {
            const backendCustomer = customerResult.customer;

            // Inject opening balance as a transaction row (shows in سجل المعاملات)
            const openingBalance = Number(backendCustomer.opening_balance || 0);
            if (openingBalance !== 0 && !mappedTransactions.some((t: any) => t.id === "opening-balance")) {
              mappedTransactions.push({
                id: "opening-balance",
                title: "رصيد افتتاحي",
                type: backendCustomer.opening_balance_direction === "out" ? "debit" : "credit",
                amount: openingBalance,
                date: backendCustomer.created_at
                  ? new Date(backendCustomer.created_at).toLocaleDateString("en-CA")
                  : "",
                notes: "الرصيد في بداية التعامل",
                receipt: undefined,
              });
            }

            const lastActivity =
              mappedTransactions[0]?.date || backendCustomer.created_at?.split("T")[0] || "—";

            const mappedCustomer = {
              ...backendCustomer,
              amount: backendCustomer.current_balance ?? backendCustomer.opening_balance ?? 0,
              status: backendCustomer.status || "clear",
              initials: backendCustomer.name
                .split(" ")
                .map((n) => n[0])
                .join(" ")
                .substring(0, 3),
              lastActivity,
            };
            setCustomerData(mappedCustomer);
          }

          setTransactions(mappedTransactions);
        })
        .catch((error) => {
          console.error("Failed to load customer profile:", error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Demo mode
      const demoCustomer =
        demoCustomers.find((c: any) => String(c.id) === String(customerId)) ?? demoCustomers[0];
      setCustomerData(demoCustomer);
      setTransactions(
        demoTransactions.filter((t: any) => String(t.customerId) === String(demoCustomer?.id))
      );
      setIsLoading(false);
    }
  }, [businessId, customerId]);

  if (isLoading || globalLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted dark:text-text-muted-dark">لا يوجد عميل</p>
      </div>
    );
  }

  return (
    <CustomerProfileView
      businessId={businessId ?? "demo"}
      customer={customer}
      transactions={transactions}
    />
  );
}
