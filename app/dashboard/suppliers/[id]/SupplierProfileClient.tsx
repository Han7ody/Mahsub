"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLoading } from "@/lib/loading-context";
import { getSupplierById } from "@/lib/repo/suppliers";
import { listTransactionsBrowser } from "@/lib/repo/transactions";
import SupplierProfileView from "@/components/dashboard/SupplierProfileView";

export default function SupplierProfileClient({ supplierId }: { supplierId: string }) {
  const { currentBusiness } = useAuth();
  const { isLoading: globalLoading } = useLoading();
  const [supplierData, setSupplierData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const businessId = currentBusiness?.id;

  const supplier = useMemo(
    () => supplierData,
    [supplierData?.id, supplierData?.name, supplierData?.avatar_url, supplierData?.status]
  );

  useEffect(() => {
    if (!businessId || !supplierId) return;

    Promise.all([
      getSupplierById(supplierId, businessId),
      listTransactionsBrowser({
        businessId,
        entityType: "supplier",
        entityId: supplierId,
      }),
    ])
      .then(([supplierResult, transactionsResult]) => {
        const mappedTransactions = (transactionsResult.transactions || []).map((t) => ({
          id: t.id,
          title: t.title || t.notes || (t.type === "out" ? "دين جديد" : "تحصيل"),
          type: t.type === "out" ? "debit" : "credit",
          amount: Number(t.amount) || 0,
          date: t.occurred_at?.split("T")[0] || "",
          notes: t.notes || "",
        }));

        if (supplierResult.supplier) {
          const backendSupplier = supplierResult.supplier;
          const lastActivity =
            mappedTransactions[0]?.date || backendSupplier.created_at?.split("T")[0] || "—";

          const mappedSupplier = {
            ...backendSupplier,
            amount: backendSupplier.current_balance ?? backendSupplier.opening_balance ?? 0,
            status: backendSupplier.status || "clear",
            initials: backendSupplier.name
              .split(" ")
              .map((n) => n[0])
              .join(" ")
              .substring(0, 3),
            lastActivity,
          };
          setSupplierData(mappedSupplier);
        }

        setTransactions(mappedTransactions);
      })
      .catch((error) => {
        console.error("Failed to load supplier profile:", error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [supplierId, businessId]);

  if (!businessId || isLoading || globalLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-text-muted dark:text-text-muted-dark">لا يوجد مورد</p>
      </div>
    );
  }

  return (
    <SupplierProfileView
      businessId={businessId ?? "demo"}
      supplier={supplier}
      transactions={transactions}
    />
  );
}
