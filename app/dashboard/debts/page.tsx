"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import TransactionDetailsModal, { Transaction } from "@/components/dashboard/TransactionDetailsModal";
import TransactionFormModal, { TransactionFormData } from "@/components/dashboard/TransactionFormModal";
import { useToast } from "@/lib/toast-context";
import EmptyState from "@/components/dashboard/EmptyState";
import LedgerRowSkeleton from "@/components/skeletons/LedgerRowSkeleton";
import { useAuth } from "@/lib/auth-context";
import { listTransactionsBrowser, createTransaction, updateTransaction, deleteTransaction } from "@/lib/repo/transactions";
import { uploadReceipt, getSignedUrl } from "@/lib/storage";
import { replaceTransactionReceipts } from "@/lib/repo/attachments-helper";
import { getTransactionAttachments } from "@/lib/repo/attachments";
import CollapsibleHeader from "@/components/common/CollapsibleHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { useLoadMorePagination } from "@/hooks/useLoadMorePagination";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useEmptyState } from "@/hooks/useEmptyState";
import { formatDateLabel, formatCurrencySDG } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

// Animated number helper for smooth balance transitions
function useAnimatedNumber(target: number, duration = 600) {
  const [current, setCurrent] = useState(target);
  const previousRef = useRef(target);

  useEffect(() => {
    const start = previousRef.current;
    const diff = target - start;
    const startTime = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(start + diff * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      }
    };

    raf = requestAnimationFrame(tick);
    previousRef.current = target;
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return current;
}

interface LedgerTransaction {
  id: string;
  title: string;
  type: "in" | "out";
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  method: "cash" | "online";
  note?: string;
  occurredAt?: string; // Full ISO timestamp for editing
}

export default function DebtsLedgerPage() {
  const { currentBusiness } = useAuth();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const [methodFilter, setMethodFilter] = useState<"all" | "cash" | "online">("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<LedgerTransaction | null>(null);
  const [newTransactionId, setNewTransactionId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const supabase = useMemo(() => createBrowserClient(), []);

  // Debounce search input for smoother filtering
  const debouncedSearch = useDebounce(searchQuery, 200);
  const showLoading = usePageLoading(isLoading);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      // Date filter: exact match
      if (selectedDate && t.date !== selectedDate) return false;

      // Payment method filter
      if (methodFilter !== "all" && t.method !== methodFilter) return false;

      // Search filter (use debounced value)
      const q = debouncedSearch.trim();
      if (!q) return true;
      const dateMatch = t.date.includes(q);
      const titleMatch = t.title.includes(q);
      return dateMatch || titleMatch;
    });
  }, [debouncedSearch, methodFilter, selectedDate, transactions]);

  // Use shared pagination hook
  const {
    visibleCount,
    isLoadingMore,
    hasMoreItems,
    reachedMaxLoads,
    handleLoadMore,
  } = useLoadMorePagination(filtered.length);

  // Add/Edit Transaction Modal State
  const [modalMode, setModalMode] = useState<"in" | "out" | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const openModal = useCallback((mode: "in" | "out", edit = false) => {
    setIsEditMode(edit);
    setModalMode(mode);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setIsEditMode(false);
    setEditingTransaction(null);
  }, []);

  const handleEditTransaction = useCallback((t: LedgerTransaction) => {
    setEditingTransaction(t);
    setIsEditMode(true);
    setModalMode(t.type);
  }, []);

  // Helper to map API transaction to local format
  const mapTransaction = (t: any): LedgerTransaction => {
    const dt = new Date(t.occurred_at);
    return {
      id: t.id,
      title: t.title || "معاملة",
      type: t.type,
      amount: t.amount,
      date: dt.toISOString().split("T")[0],
      time: dt.toTimeString().slice(0, 5),
      method: t.payment_method === "cash" || t.payment_method === "online" ? t.payment_method : "cash",
      note: t.notes || undefined,
      occurredAt: t.occurred_at || undefined,
    };
  };

  const loadTransactions = useCallback(async (opts?: { showSpinner?: boolean }) => {
    if (!USE_BACKEND || !currentBusiness) {
      setTransactions([]);
      return;
    }

    // Cancel any pending request to avoid race conditions
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (opts?.showSpinner !== false) {
      setIsLoading(true);
    }

    try {
      const { transactions: data, error } = await listTransactionsBrowser({
        businessId: currentBusiness.id,
        entityType: "ledger",
        signal: controller.signal as any,
      } as any);

      if (error) {
        showToast("فشل تحميل المعاملات", "error");
        setTransactions([]);
      } else {
        setTransactions(data.map(mapTransaction));
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.error("Failed to load transactions:", err);
      }
    } finally {
      if (opts?.showSpinner !== false) {
        setIsLoading(false);
      }
    }
  }, [currentBusiness, showToast]);

  // Initial load
  useEffect(() => {
    loadTransactions();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadTransactions]);

  // Real-time subscription for transactions
  useEffect(() => {
    if (!USE_BACKEND || !currentBusiness) return;

    const channel = supabase.channel(`ledger-transactions-${currentBusiness.id}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'transactions',
        filter: `business_id=eq.${currentBusiness.id}`,
      },
      () => {
        // Silent refresh to avoid flicker
        loadTransactions({ showSpinner: false });
      }
    );

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        // No-op
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, currentBusiness, loadTransactions]);

  const totals = useMemo(() => {
    const totalIn = transactions.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter((t) => t.type === "out").reduce((s, t) => s + t.amount, 0);
    return { totalIn, totalOut, net: totalIn - totalOut };
  }, [transactions]);

  // Animate the balance number
  const animatedBalance = useAnimatedNumber(totals.net);

  // Track direction changes for main balance
  const [prevBalance, setPrevBalance] = useState(totals.net);
  const [lastTransactionType, setLastTransactionType] = useState<'in' | 'out' | null>(null);
  const balanceDirection = totals.net > prevBalance ? 'up' : totals.net < prevBalance ? 'down' : 'neutral';

  useEffect(() => {
    if (totals.net !== prevBalance && transactions.length > 0) {
      // Determine the type of the last transaction
      const lastTx = transactions[0];
      setLastTransactionType(lastTx.type as 'in' | 'out');
      // Reset after animation completes
      const timer = setTimeout(() => setLastTransactionType(null), 1000);
      return () => clearTimeout(timer);
    }
    setPrevBalance(totals.net);
  }, [totals.net, transactions]);

  // Compute today's balance
  const todayBalance = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    let todayIn = 0;
    let todayOut = 0;

    transactions.forEach(tx => {
      if (tx.date === today) {
        if (tx.type === 'in') {
          todayIn += tx.amount;
        } else {
          todayOut += tx.amount;
        }
      }
    });

    return todayIn - todayOut;
  }, [transactions]);

  // Animate today's balance
  const animatedTodayBalance = useAnimatedNumber(todayBalance);

  // Track direction changes for today's balance
  const [prevTodayBalance, setPrevTodayBalance] = useState(todayBalance);
  const todayDirection = todayBalance > prevTodayBalance ? 'up' : todayBalance < prevTodayBalance ? 'down' : 'neutral';

  useEffect(() => {
    setPrevTodayBalance(todayBalance);
  }, [todayBalance]);

  const grouped = useMemo(() => {
    // Apply pagination: only show visibleCount items
    const paginatedFiltered = filtered.slice(0, visibleCount);
    return paginatedFiltered.reduce<Record<string, LedgerTransaction[]>>((acc, tx) => {
      acc[tx.date] = acc[tx.date] ? [...acc[tx.date], tx] : [tx];
      return acc;
    }, {});
  }, [filtered, visibleCount]);

  const sortedDates = useMemo(() => Object.keys(grouped).sort((a, b) => (a > b ? -1 : 1)), [grouped]);

  const { emptyKind } = useEmptyState({
    totalItems: transactions.length,
    filteredItems: filtered.length,
    hasActiveFilters: debouncedSearch.trim().length > 0 || methodFilter !== "all" || selectedDate !== "",
  });

  const handleSaveTransaction = useCallback(async (data: TransactionFormData) => {
    const defaultTitle = modalMode === "out" ? "دين جديد" : "تحصيل";

    if (USE_BACKEND && currentBusiness) {
      // Edit mode
      if (isEditMode && editingTransaction) {
        // Check what changed
        const amountChanged = data.amount !== editingTransaction.amount;
        const titleChanged = data.title?.trim() !== editingTransaction.title;
        const methodChanged = data.paymentMethod !== editingTransaction.method;
        const notesChanged = data.notes?.trim() !== (editingTransaction.note || "");
        const dateChanged = data.occurredAt !== editingTransaction.occurredAt;
        const receiptChanged = !!data.receiptFile;

        const hasChanges = amountChanged || titleChanged || methodChanged || notesChanged || dateChanged || receiptChanged;

        // If nothing changed, just close
        if (!hasChanges) {
          closeModal();
          return;
        }

        // Optimistic update - show change immediately
        const newOccurredAt = data.occurredAt || editingTransaction.occurredAt;
        const dt = newOccurredAt ? new Date(newOccurredAt) : null;
        const updatedTransaction: LedgerTransaction = {
          ...editingTransaction,
          amount: data.amount,
          method: data.paymentMethod === "cash" || data.paymentMethod === "online" ? data.paymentMethod : "cash",
          note: data.notes.trim() || undefined,
          title: data.title?.trim() || editingTransaction.title,
          occurredAt: newOccurredAt || editingTransaction.occurredAt,
          date: dt ? dt.toISOString().split("T")[0] : editingTransaction.date,
          time: dt ? dt.toTimeString().slice(0, 5) : editingTransaction.time,
        };

        setTransactions(prev => prev.map(t =>
          t.id === editingTransaction.id ? updatedTransaction : t
        ));
        closeModal();
        setIsSaving(true);

        // Build update payload with only changed fields
        const updatePayload: any = {};
        if (notesChanged || titleChanged) updatePayload.notes = data.notes.trim() || undefined;
        if (amountChanged) updatePayload.amount = data.amount;
        if (methodChanged) updatePayload.paymentMethod = data.paymentMethod;
        if (titleChanged) updatePayload.title = data.title?.trim() || undefined;
        if (dateChanged) updatePayload.occurredAt = data.occurredAt || undefined;

        const { error } = await updateTransaction(editingTransaction.id, updatePayload);

        if (error) {
          console.error('[Debts Page] Transaction update error:', error);
          showToast("فشل تحديث المعاملة", "error");
          // Revert optimistic update on error
          const { transactions: freshData } = await listTransactionsBrowser({
            businessId: currentBusiness.id,
            entityType: "ledger"
          });
          if (freshData) {
            setTransactions(freshData.map(mapTransaction));
          }
          setIsSaving(false);
          return;
        }

        // Handle receipt upload/replacement
        if (data.receiptFile) {
          // Delete old receipts first
          await replaceTransactionReceipts(editingTransaction.id, 'receipts');

          // Upload new receipt
          const { error: uploadError } = await uploadReceipt(
            data.receiptFile,
            currentBusiness.id,
            editingTransaction.id
          );

          if (uploadError) {
            showToast("تم تحديث المعاملة ولكن فشل رفع الإيصال", "error");
          } else {
            showToast("تم تحديث المعاملة والإيصال بنجاح", "success");
          }
        } else {
          showToast("تم تحديث المعاملة بنجاح", "success");
        }

        setIsSaving(false);
        return;
      } else {
        // Create mode - optimistic update with temp ID
        const now = new Date();
        const tempId = `temp-${Date.now()}`;
        const newTransaction: LedgerTransaction = {
          id: tempId,
          title: defaultTitle,
          type: modalMode as "in" | "out",
          amount: data.amount,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          method: data.paymentMethod,
          note: data.notes.trim() || undefined,
        };

        // Add optimistically at the top
        setTransactions(prev => [newTransaction, ...prev]);
        setNewTransactionId(tempId);
        closeModal();

        const { transaction, error } = await createTransaction({
          businessId: currentBusiness.id,
          entityType: "ledger",
          type: modalMode as "in" | "out",
          amount: data.amount,
          paymentMethod: data.paymentMethod === "cash" || data.paymentMethod === "online" ? data.paymentMethod : "cash",
          title: defaultTitle,
          notes: data.notes.trim() || undefined,
        });

        if (error) {
          showToast("فشل حفظ المعاملة", "error");
          // Remove optimistic entry on error
          setTransactions(prev => prev.filter(t => t.id !== tempId));
          setNewTransactionId(null);
          return;
        }

        // Replace temp ID with real ID
        if (transaction) {
          setTransactions(prev => prev.map(t =>
            t.id === tempId ? { ...t, id: transaction.id } : t
          ));
          setNewTransactionId(transaction.id);
          setTimeout(() => setNewTransactionId(null), 3000);

          // Upload receipt in background
          if (data.receiptFile) {
            uploadReceipt(data.receiptFile, currentBusiness.id, transaction.id)
              .then(({ error: uploadError }) => {
                if (uploadError) showToast("تم حفظ المعاملة ولكن فشل رفع الإيصال", "error");
              });
          }
        }

        showToast(
          modalMode === "out" ? "تم تسجيل الدين بنجاح" : "تم تسجيل التحصيل بنجاح",
          "success"
        );
      }
    } else {
      // Demo mode
      if (isEditMode && editingTransaction) {
        setTransactions(transactions.map(t =>
          t.id === editingTransaction.id
            ? {
              ...t,
              amount: data.amount,
              method: data.paymentMethod,
              note: data.notes.trim() || undefined,
              title: data.title?.trim() || t.title,
              occurredAt: data.occurredAt || t.occurredAt,
            }
            : t
        ));
        showToast("تم تحديث المعاملة بنجاح", "success");
      } else {
        const now = new Date();
        const newId = `t${Date.now()}`;
        const newTransaction: LedgerTransaction = {
          id: newId,
          title: defaultTitle,
          type: modalMode as "in" | "out",
          amount: data.amount,
          date: now.toISOString().split('T')[0],
          time: now.toTimeString().slice(0, 5),
          method: data.paymentMethod,
          note: data.notes.trim() || undefined,
        };

        setTransactions([newTransaction, ...transactions]);
        setNewTransactionId(newId);
        setTimeout(() => setNewTransactionId(null), 3000);

        showToast(
          modalMode === "out" ? "تم تسجيل الدين بنجاح" : "تم تسجيل التحصيل بنجاح",
          "success"
        );
      }

      closeModal();
    }
  }, [USE_BACKEND, currentBusiness, isEditMode, editingTransaction, modalMode, closeModal, showToast, mapTransaction, transactions]);

  // Memoize row click handler to prevent re-renders
  const handleRowClick = useCallback(async (t: LedgerTransaction) => {
    // Show modal immediately with basic data
    setSelectedTransaction({
      id: t.id,
      type: t.type,
      amount: t.amount,
      title: t.title,
      datetime: `${t.date} - ${t.time}`,
      paymentMethod: t.method,
      notes: t.note,
      receipt: undefined, // Load lazily
    });
    setShowTransactionDetails(true);

    // Lazy load receipt in background
    if (USE_BACKEND && currentBusiness) {
      try {
        const { attachments } = await getTransactionAttachments(t.id);
        if (attachments.length > 0) {
          const att = attachments[0];
          const { signedUrl } = await getSignedUrl('receipts', att.path);
          if (signedUrl) {
            const receipt = { url: signedUrl, filename: att.file_name };
            // Update transaction with loaded receipt
            setSelectedTransaction(prev =>
              prev ? { ...prev, receipt } : null
            );
          }
        }
      } catch (e) {
        console.error('Failed to fetch receipt:', e);
      }
    }
  }, [currentBusiness, USE_BACKEND]);

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar activePage="debts" />

      <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto">
        {/* Collapsible Header */}
        <CollapsibleHeader
          title="دفتر الديون"
          badge={isLoading ? "..." : `${filtered.length} معاملة`}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="بحث بالتاريخ أو المعاملة..."
          onMenuClick={() => setIsDrawerOpen(true)}
          isLoading={isLoading}
          scrollContainerRef={mainRef}
        />

        {/* Main Content */}
        <div className="px-4 py-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 md:gap-8">
          {/* Summary Card */}
          {showLoading ? (
            <div className="flex flex-col gap-4 rounded-xl p-6 md:p-8 border border-slate-200 bg-white shadow-sm w-full animate-pulse">
              <div className="flex justify-between items-start">
                <div className="h-4 w-20 bg-slate-200 rounded"></div>
                <div className="h-6 w-6 bg-slate-200 rounded"></div>
              </div>
              <div className="h-12 w-48 bg-slate-200 rounded mt-2"></div>
              <div className="h-4 w-32 bg-slate-100 rounded mt-2"></div>
              <div className="flex gap-4 mt-4">
                <div className="h-14 flex-1 bg-slate-200 rounded-xl"></div>
                <div className="h-14 flex-1 bg-slate-200 rounded-xl"></div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl p-6 md:p-8 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm w-full">
              {/* Header */}
              <div className="flex justify-between items-start">
                <p className="text-text-muted text-sm font-bold uppercase tracking-wider">الرصيد</p>
                <span className="material-symbols-outlined text-text-muted">account_balance_wallet</span>
              </div>

              {/* Main Balance with Animation */}
              {/* Logic: Negative = We have money (Asset/Ledger owes us) -> Red */}
              {/*        Positive = Overdraft (We owe ledger) -> Green/Primary */}
              <div className="flex items-baseline gap-2">
                <p className={`tracking-tight text-4xl md:text-5xl font-black leading-tight transition-transform duration-300 ${totals.net > 0 ? 'text-red-600' : 'text-primary'} dark:text-white`}>
                  {formatCurrencySDG(Math.round(animatedBalance * -1))}
                </p>
                {balanceDirection === 'up' && (
                  <span className={`material-symbols-outlined text-2xl animate-bounce ${lastTransactionType === 'out' ? 'text-red-600' : lastTransactionType === 'in' ? 'text-primary' : totals.net > 0 ? 'text-red-600' : 'text-primary'}`}>arrow_upward</span>
                )}
                {balanceDirection === 'down' && (
                  <span className={`material-symbols-outlined text-2xl animate-bounce ${lastTransactionType === 'out' ? 'text-red-600' : lastTransactionType === 'in' ? 'text-primary' : totals.net > 0 ? 'text-red-600' : 'text-primary'}`}>arrow_downward</span>
                )}
              </div>

              {/* Today's Balance */}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-text-muted text-sm font-medium">رصيد اليوم:</span>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-base font-black ${todayBalance > 0 ? "text-red-500" : "text-primary"}`}>
                    {/* Invert Sign for Today's Balance too */}
                    {`${todayBalance > 0 ? "-" : "+"}${formatCurrencySDG(Math.abs(Math.round(animatedTodayBalance)))}`}
                  </span>
                  {todayDirection === 'up' && (
                    <span className={`material-symbols-outlined text-lg animate-bounce ${todayBalance > 0 ? "text-red-500" : "text-primary"}`}>arrow_upward</span>
                  )}
                  {todayDirection === 'down' && (
                    <span className={`material-symbols-outlined text-lg animate-bounce ${todayBalance > 0 ? "text-red-500" : "text-primary"}`}>arrow_downward</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-4">
                <button
                  onClick={() => openModal("out")}
                  className="flex min-w-[140px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-12 md:h-14 px-6 md:px-8 bg-red-500 text-white text-sm md:text-base font-bold leading-normal transition-all active:scale-95 hover:bg-red-600 flex-1"
                >
                  <img src="https://img.icons8.com/?size=100&id=1504&format=png&color=FFFFFF" alt="" className="size-5 object-contain" />
                  <span className="truncate">أعطيته</span>
                </button>
                <button
                  onClick={() => openModal("in")}
                  className="flex min-w-[140px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-12 md:h-14 px-6 md:px-8 bg-primary text-white text-sm md:text-base font-bold leading-normal transition-all active:scale-95 hover:bg-green-600 flex-1"
                >
                  <img src="https://img.icons8.com/?size=100&id=1501&format=png&color=FFFFFF" alt="" className="size-5 object-contain" />
                  <span className="truncate">قبضت</span>
                </button>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            {/* Date Picker */}
            <div className="relative shrink-0">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-slate-700 border-none text-text-main dark:text-white text-sm font-bold rounded-xl h-11 pr-10 pl-8 focus:ring-primary focus:ring-2 cursor-pointer min-w-[160px]"
              />
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-text-muted pointer-events-none">calendar_month</span>
              {!selectedDate && (
                <span className="absolute inset-0 flex items-center pr-10 pl-4 text-text-muted text-sm font-bold pointer-events-none">
                  التاريخ
                </span>
              )}
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  className="absolute left-2 top-2.5 text-text-muted hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>

            {/* Payment Method Dropdown */}
            <div className="relative shrink-0">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value as "all" | "cash" | "online")}
                className="appearance-none bg-slate-50 dark:bg-slate-700 border-none text-text-main dark:text-white text-sm font-bold rounded-xl h-11 pr-10 pl-8 focus:ring-primary focus:ring-2 cursor-pointer min-w-[140px]"
              >
                <option value="all">طريقة الدفع</option>
                <option value="cash">كاش</option>
                <option value="online">أونلاين</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-text-muted pointer-events-none">payments</span>
              {methodFilter !== "all" && (
                <button
                  onClick={() => setMethodFilter("all")}
                  className="absolute left-2 top-2.5 text-text-muted hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Transactions */}
          {isLoading ? (
            <div className="flex flex-col gap-6">
              {[...Array(2)].map((_, di) => (
                <div key={di} className="space-y-3">
                  <div className="h-3 w-28 bg-slate-100 rounded ml-1 animate-pulse"></div>
                  {[...Array(3)].map((_, ri) => (
                    <LedgerRowSkeleton key={ri} />
                  ))}
                </div>
              ))}
            </div>
          ) : emptyKind ? (
            <EmptyState
              title={emptyKind === "empty" ? "لا توجد معاملات" : "لم يتم العثور على نتائج"}
              description={emptyKind === "empty" ? "ابدأ بإضافة معاملة جديدة" : `لم يتم العثور على معاملات مطابقة لـ "${searchQuery}"`}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {sortedDates.map((date) => (
                <div key={date} className="flex flex-col gap-3">
                  {/* Date Separator */}
                  <div className="flex items-center gap-3 px-4">
                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-700"></div>
                    <span className="text-sm font-bold text-text-muted">{formatDateLabel(date)}</span>
                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-700"></div>
                  </div>

                  {/* Transaction Rows */}
                  <div className="flex flex-col gap-3">
                    {grouped[date].map((t) => (
                      <div
                        key={t.id}
                        onClick={() => handleRowClick(t)}
                        className={`flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer ${t.id === newTransactionId
                            ? 'border-primary ring-2 ring-primary/30 animate-pulse'
                            : 'border-slate-100 dark:border-slate-700'
                          }`}
                      >
                        {/* Diagonal Arrow Icon */}
                        <div
                          className={`size-12 rounded-full flex items-center justify-center shrink-0 ${t.type === "out"
                              ? "bg-red-50 text-red-500"
                              : "bg-emerald-50 text-emerald-600"
                            }`}
                        >
                          <span className="material-symbols-outlined text-2xl font-bold">
                            {t.type === "out" ? "call_made" : "call_received"}
                          </span>
                        </div>

                        {/* Title & Note */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-bold text-lg text-text-main dark:text-white truncate">{t.title}</h3>
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-bold shrink-0 ${t.method === "cash"
                                  ? "bg-slate-100 dark:bg-slate-700 text-text-muted"
                                  : "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                }`}
                            >
                              {t.method === "cash" ? "كاش" : "أونلاين"}
                            </span>
                          </div>
                          <p className="text-sm text-text-muted line-clamp-1 md:line-clamp-2">
                            {t.note?.trim() ? t.note : "لا يوجد ملاحظة"}
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-left flex flex-col items-end shrink-0">
                          <span className={`text-xl font-black ${t.type === "out" ? "text-red-500" : "text-primary"}`}>
                            {t.type === "out" ? "- " : "+ "}{formatCurrencySDG(t.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More / End Message */}
              <div className="flex flex-col items-center justify-center py-12">
                {isLoadingMore ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-1">
                      <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="size-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="size-2 bg-primary rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-xs font-black text-primary uppercase tracking-widest">جاري جلب المعاملات...</span>
                  </div>
                ) : reachedMaxLoads || !hasMoreItems ? (
                  <div className="w-full flex items-center gap-4 px-8 opacity-40">
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      <span className="text-[11px] font-black uppercase tracking-wider">نهاية السجل</span>
                    </div>
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 w-full">
                    <button
                      onClick={handleLoadMore}
                      className="group relative flex items-center justify-center gap-3 px-10 py-4 bg-white hover:bg-primary hover:text-white text-text-main font-black rounded-2xl transition-all duration-300 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-primary/20 hover:-translate-y-1 active:scale-95"
                    >
                      <span className="material-symbols-outlined text-xl group-hover:rotate-180 transition-transform duration-500">expand_more</span>
                      <span className="text-sm">عرض المزيد من المعاملات</span>
                    </button>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                      يتم عرض {visibleCount} من أصل {filtered.length} معاملة
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={isDrawerOpen}
        onCloseAction={() => setIsDrawerOpen(false)}
        onOpenProfileAction={() => { }}
        activePage="debts"
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={showTransactionDetails}
        transaction={selectedTransaction}
        onClose={() => setShowTransactionDetails(false)}
        onEdit={(transaction) => {
          // Find the original transaction to edit
          const originalTx = transactions.find(t => t.id === transaction.id);
          if (originalTx) {
            setEditingTransaction(originalTx);
            openModal(originalTx.type, true);
          }
          setShowTransactionDetails(false);
        }}
        onDelete={async (transactionId) => {
          if (USE_BACKEND) {
            const { error } = await deleteTransaction(transactionId);
            if (error) {
              showToast("فشل حذف المعاملة", "error");
              return;
            }
            showToast("تم حذف المعاملة بنجاح", "success");
          }
          setTransactions(transactions.filter((t) => t.id !== transactionId));
          setShowTransactionDetails(false);
        }}
      />

      {/* Transaction Modal */}
      <TransactionFormModal
        mode={modalMode === "out" ? "debit" : modalMode === "in" ? "credit" : null}
        onCloseAction={closeModal}
        onSaveAction={handleSaveTransaction}
        isLoading={isSaving}
        isEditMode={isEditMode}
        initialData={editingTransaction ? {
          amount: editingTransaction.amount,
          paymentMethod: editingTransaction.method,
          notes: editingTransaction.note || "",
          title: editingTransaction.title || "",
          occurredAt: editingTransaction.occurredAt || "",
        } : undefined}
      />

      {/* Mobile FAB for quick add */}
      {!showTransactionDetails && modalMode === null && (
        <button
          onClick={() => openModal("in")}
          className="md:hidden fixed bottom-6 left-6 size-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200 z-50"
        >
          <img src="https://img.icons8.com/?size=100&id=1501&format=png&color=FFFFFF" alt="" className="size-8 object-contain" />
        </button>
      )}
    </div>
  );
}