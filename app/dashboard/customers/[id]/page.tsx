"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useLoading } from "@/lib/loading-context";
import { getCustomerById, type CustomerWithBalance } from "@/lib/repo/customers";
import { listTransactionsBrowser } from "@/lib/repo/transactions";
import CustomerProfileView from "@/components/dashboard/CustomerProfileView";
import { customers as demoCustomers } from "@/mocks/customers";
import { demoTransactions } from "@/mocks/demo-data";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

export default function CustomerProfilePage() {
  const params = useParams();
  const customerId = params.id as string;
  const { currentBusiness } = useAuth();
  const { isLoading: globalLoading } = useLoading();
  const [customerData, setCustomerData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const businessId = currentBusiness?.id;

  // Memoize customer to prevent re-renders from triggering redundant signed URL requests
  const customer = useMemo(() => customerData, [customerData?.id, customerData?.name, customerData?.avatar_url, customerData?.status]);

  useEffect(() => {
    if (USE_BACKEND && businessId && customerId) {
      // Load customer and transactions from backend
      Promise.all([
        getCustomerById(customerId, businessId),
        listTransactionsBrowser({
          businessId,
          entityType: 'customer',
          entityId: customerId,
        })
      ])
        .then(([customerResult, transactionsResult]) => {
          const mappedTransactions = (transactionsResult.transactions || []).map((t) => {
            // Check if transaction has receipt data (either from receipt_url or receipt_path)
            const hasReceipt = t.receipt_url || t.receipt_path;
            
            return {
              id: t.id,
              title: t.title || t.notes || (t.type === 'out' ? 'دين جديد' : 'تحصيل'),
              type: t.type === 'out' ? 'debit' : 'credit',
              amount: Number(t.amount) || 0,
              date: t.occurred_at?.split('T')[0] || '',
              notes: t.notes || '',
              receipt: hasReceipt ? {
                url: t.receipt_url || '',  // Will be regenerated if empty
                filename: t.receipt_path?.split('/').pop() || 'receipt.jpg',
                path: t.receipt_path || '',
              } : undefined,
            };
          });

          if (customerResult.customer) {
            // Map backend customer data to match component expectations
            const backendCustomer = customerResult.customer;
            const lastActivity = mappedTransactions[0]?.date || backendCustomer.created_at?.split('T')[0] || '—';

            const mappedCustomer = {
              ...backendCustomer,
              amount: backendCustomer.current_balance ?? backendCustomer.opening_balance ?? 0,
              status: backendCustomer.status || 'clear',
              initials: backendCustomer.name.split(' ').map((n) => n[0]).join(' ').substring(0, 3),
              lastActivity,
            };
            setCustomerData(mappedCustomer);
          }

          setTransactions(mappedTransactions);
        })
        .catch((error) => {
          console.error('Failed to load customer profile:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Use demo data
      const demoCustomer = demoCustomers.find(c => c.id.toString() === customerId);
      const demoCustomerTransactions = demoTransactions.filter(t => t.customerId === customerId);

      setCustomerData(demoCustomer || null);
      setTransactions(demoCustomerTransactions);
      setIsLoading(false);
    }
  }, [customerId, businessId]);

  if ((USE_BACKEND && !businessId) || isLoading || globalLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">العميل غير موجود</h2>
          <p className="text-gray-600">لم يتم العثور على العميل المطلوب</p>
        </div>
      </div>
    );
  }

  return (
    <CustomerProfileView
      customer={customer}
      transactions={transactions}
      businessId={businessId || ''}
    />
  );
}
