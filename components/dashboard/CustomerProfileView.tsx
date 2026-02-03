"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import CollapsibleHeader from "@/components/common/CollapsibleHeader";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";
import EmptyState from "@/components/dashboard/EmptyState";
import ProfileEditModal from "@/components/dashboard/ProfileEditModal";
import TransactionDetailsModal, { Transaction } from "@/components/dashboard/TransactionDetailsModal";
import TransactionFormModal, { TransactionFormData } from "@/components/dashboard/TransactionFormModal";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import ProfileTransactionRowSkeleton from "@/components/skeletons/ProfileTransactionRowSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast-context";
import { createTransaction, updateTransaction, deleteTransaction } from "@/lib/repo/transactions";
import { updateCustomer, deleteCustomer } from "@/lib/repo/customers";
import type { DashboardCustomer } from "@/mocks/customers";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { uploadAvatar, getSignedUrl, uploadReceipt } from "@/lib/storage";

export type TransactionType = "debit" | "credit";

export interface TransactionItem {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO: YYYY-MM-DD
  notes?: string;
  receipt?: {
    url: string;
    filename: string;
    path: string;
  };
}

interface Props {
  customer: DashboardCustomer;
  transactions: TransactionItem[];
  businessId: string;
}

function parseDate(s: string): Date | null {
  const normalized = s.replace(/\./g, "-").replace(/\//g, "-").trim();
  const m = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return isNaN(dt.getTime()) ? null : dt;
}

function filterTransactions(items: TransactionItem[], query: string) {
  const q = query.trim();
  if (!q) return items;

  // Try date range pattern like "2023-10-01 2023-10-31" or "2023/10/01 - 2023/10/31"
  const tokens = q
    .replace(/[\u0627-\u064a]/g, " ")
    .replace(/\s+\-\s+|\s*\-\s*/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const dateCandidates = tokens.map(parseDate).filter(Boolean) as Date[];
  if (dateCandidates.length >= 2) {
    const [start, end] = [dateCandidates[0], dateCandidates[1]];
    const startMs = start.getTime();
    const endMs = end.getTime();
    return items.filter((t) => {
      const dt = parseDate(t.date);
      if (!dt) return false;
      const ms = dt.getTime();
      return ms >= startMs && ms <= endMs;
    });
  }

  // Fallback: match by title substring (Arabic RTL safe)
  return items.filter((t) => t.title.includes(q));
}

type ModalMode = "debit" | "credit" | null;

export default function CustomerProfileView({ customer, transactions: initialTransactions, businessId }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const { showToast } = useToast();
  const [showReminder, setShowReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState<string>("");
  const [reminderNotes, setReminderNotes] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(customer.name);
  const [editPhone, setEditPhone] = useState(customer.phone);
  const [editNotes, setEditNotes] = useState("");
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [originalEditValues, setOriginalEditValues] = useState<{ name: string; phone: string; avatar_url: string | null; notes: string }>({ name: "", phone: "", avatar_url: null, notes: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [editTransactionId, setEditTransactionId] = useState<string | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const filtered = useMemo(() => filterTransactions(transactions, searchQuery), [transactions, searchQuery]);

  const totalTransactions = transactions.length;
  const hasActiveFilters = searchQuery.trim().length > 0;
  const emptyKind = totalTransactions === 0 ? "empty" : filtered.length === 0 && hasActiveFilters ? "noResults" : null;

  const openModal = (mode: "debit" | "credit") => setModalMode(mode);
  const closeModal = () => {
    setModalMode(null);
    setEditTransactionId(null);
  };

  const handleSaveTransaction = async (data: TransactionFormData) => {
    if (!businessId || !customer.id) {
      showToast("تعذر حفظ المعاملة: مفقود معرف النشاط", "error");
      return;
    }

    setIsSaving(true);
    // For customers: debit = they owe us (out), credit = we received (in)
    const txType = modalMode === "debit" ? "out" : "in";
    const title = data.notes.trim() || (modalMode === "debit" ? "دين جديد" : "تحصيل");

    let savedTransaction: any = null;
    let error: any = null;

    // 1. Create or Update Transaction
    if (editTransactionId) {
      const res = await updateTransaction(editTransactionId, {
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        title: data.title,
        notes: data.notes || "",
        occurredAt: data.occurredAt,
        type: txType
      });
      savedTransaction = res.transaction;
      error = res.error;
    } else {
      const res = await createTransaction({
        businessId,
        entityType: "customer",
        customerId: String(customer.id),
        type: txType,
        amount: data.amount,
        title: data.title || title,
        notes: data.notes || undefined,
        paymentMethod: data.paymentMethod,
        occurredAt: data.occurredAt,
      });
      savedTransaction = res.transaction;
      error = res.error;
    }

    if (error || !savedTransaction) {
      showToast("تعذر حفظ المعاملة", "error");
      setIsSaving(false);
      return;
    }

    // 2. Handle Receipt Upload
    if (data.receiptFile) {
      const { path, error: uploadError } = await uploadReceipt(data.receiptFile, businessId, savedTransaction.id);
      if (path && !uploadError) {
        const { signedUrl } = await getSignedUrl('receipts', path);
        // Update transaction with receipt info
        await updateTransaction(savedTransaction.id, {
          receipt_path: path,
          receipt_url: signedUrl,
        });
        // Update local object
        savedTransaction.receipt_path = path;
        savedTransaction.receipt_url = signedUrl;
      }
    } else if (data.receiptImage === null && editTransactionId) {
      // If explicitly nulled during edit, remove the receipt
      await updateTransaction(savedTransaction.id, {
        receipt_path: null,
        receipt_url: null,
      });
      savedTransaction.receipt_path = null;
      savedTransaction.receipt_url = null;
    }

    // 3. Update Local State
    const mapped: TransactionItem = {
      id: savedTransaction.id,
      title: savedTransaction.title || savedTransaction.notes || title,
      type: savedTransaction.type === "out" ? "debit" : "credit",
      amount: Number(savedTransaction.amount) || 0,
      date: savedTransaction.occurred_at?.split("T")[0] || new Date().toISOString().split("T")[0],
      notes: savedTransaction.notes || "",
      receipt: savedTransaction.receipt_url ? {
        url: savedTransaction.receipt_url,
        filename: "receipt",
        path: savedTransaction.receipt_path || ""
      } : undefined
    };

    if (editTransactionId) {
      setTransactions(prev => prev.map(t => t.id === editTransactionId ? mapped : t));
      showToast("تم تحديث المعاملة بنجاح", "success");
    } else {
      setTransactions([mapped, ...transactions]);
      showToast(modalMode === "debit" ? "تم تسجيل الدين" : "تم تسجيل التحصيل", "success");
    }

    setIsSaving(false);
    closeModal();
  };

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalMode) closeModal();
      if (e.key === "Escape" && showReminder) setShowReminder(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalMode, showReminder]);

  const getDefaultReminderDate = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    return today.toISOString().split("T")[0];
  };

  const handleSetQuickReminder = (daysOffset: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    setReminderDate(date.toISOString().split("T")[0]);
  };

  const handleSaveReminder = () => {
    setShowReminder(false);
    setReminderDate("");
    setReminderNotes("");
  };

  const openEditModal = async () => {
    setEditName(customer.name);
    setEditPhone(customer.phone);
    setEditNotes("");
    setEditImagePreview(null);
    setEditFormError("");
    setAvatarChanged(false);
    setOriginalEditValues({
      name: customer.name,
      phone: customer.phone,
      avatar_url: customer.avatar_url || null,
      notes: customer.notes || ""
    });

    // Fetch signed URL if needed
    if (customer.avatar_url) {
      const url = customer.avatar_url;
      if (!/^https?:\/\//i.test(url)) {
        const { signedUrl } = await getSignedUrl('avatars', url);
        setEditImageUrl(signedUrl || null);
      } else {
        setEditImageUrl(url);
      }
    } else {
      setEditImageUrl(null);
    }

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditFormError("");
  };

  // Enhanced file validation function
  const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.type)) return { isValid: false, error: "نوع الملف غير مدعوم" };

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) return { isValid: false, error: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت" };

    return { isValid: true };
  };

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.isValid) {
      showToast(validation.error || "ملف غير صالح", "error");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Direct upload logic
    if (customer.id && businessId) {
      setIsUploadingAvatar(true);
      try {
        const { path, error } = await uploadAvatar(file, businessId, 'customer', String(customer.id));

        if (error) {
          console.error('Avatar upload error:', error);
          showToast("فشل رفع الصورة", "error");
          setEditImagePreview(null);
          return;
        }

        const supabase = createBrowserClient();
        const { error: dbError } = await supabase
          .from('customers')
          // @ts-ignore
          .update({ avatar_url: path })
          .eq('id', customer.id)
          .eq('business_id', businessId);

        if (dbError) throw dbError;

        const { signedUrl } = await getSignedUrl('avatars', path);
        if (signedUrl) setEditImageUrl(signedUrl);

        (customer as any).avatar_url = path;
        setAvatarChanged(true);
        showToast("تم تحديث الصورة بنجاح", "success");

      } catch (err) {
        console.error(err);
        showToast("خطأ أثناء حفظ الصورة", "error");
        setEditImagePreview(null);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const signedBalance = useMemo(() => {
    // Check if opening balance is already included in transactions (injected by repo)
    const hasOpeningTx = transactions.some(t => t.id === 'opening-balance');

    // If opening_balance is undefined (e.g. mock data), fallback to amount or 0
    // If it's already in transactions, we ignore this explicit addition to avoid double counting
    let openingSigned = 0;

    if (!hasOpeningTx) {
      const openingBalance = customer.opening_balance ?? customer.amount ?? 0;

      // 'in' means positive (debt), 'out' means negative (credit)
      // Default to 'in' (debt) if direction is missing
      const direction = customer.opening_balance_direction === "out" ? -1 : 1;
      openingSigned = openingBalance * direction;
    }

    // Logic: 
    // Out / Gave / Debit: Positive (+) -> I Gave money -> He Owes Me (Debt) increases.
    // In / Received / Credit: Negative (-) -> I Received money -> His Debt decreases.
    const transactionsDelta = transactions.reduce((sum, t) => {
      // type 'debit' = I Gave (Out) = +Amount
      // type 'credit' = I Received (In) = -Amount
      return sum + (t.type === "debit" ? t.amount : -t.amount);
    }, 0);

    return openingSigned + transactionsDelta;
  }, [customer, transactions]);

  // We use signedBalance directly for display.
  // Positive = He Owes Me (Debt).
  // Negative = He Paid Extra / I Owe Him (Credit).
  const displayBalance = signedBalance;
  const netBalance = Math.abs(signedBalance);


  // Restored handleSaveEditProfile function
  const handleSaveEditProfile = async () => {
    setEditFormError("");
    const nameStr = editName.trim();
    const phoneStr = editPhone.trim();

    if (!nameStr) {
      setEditFormError("اسم العميل مطلوب");
      return;
    }

    if (phoneStr && !/^[\d\s+\-()]*$/.test(phoneStr)) {
      setEditFormError("رقم الهاتف غير صحيح");
      return;
    }

    const nameChanged = nameStr !== originalEditValues.name;
    const phoneChanged = phoneStr !== originalEditValues.phone;
    const notesChanged = editNotes.trim() !== originalEditValues.notes;
    const hasChanges = nameChanged || phoneChanged || notesChanged || avatarChanged;

    if (!hasChanges) {
      closeEditModal();
      return;
    }

    setIsSaving(true);

    // Update fields if changed
    const updatePayload: any = {};
    if (nameChanged) updatePayload.name = nameStr;
    if (phoneChanged) updatePayload.phone = phoneStr || undefined;
    if (notesChanged) updatePayload.notes = editNotes.trim();

    const { customer: updatedCustomer, error } = await updateCustomer(String(customer.id), updatePayload);

      if (error) {
        setEditFormError("فشل حفظ التغييرات");
        showToast("فشل حفظ التغييرات", "error");
        setIsSaving(false);
        return;
      }

      if (updatedCustomer) {
        // Update the customer object with new data
        // We mutate the object directly so that when the component re-renders (due to modal closing),
        // it reflects the new values.
        if (nameChanged) customer.name = updatedCustomer.name;
        if (phoneChanged) customer.phone = updatedCustomer.phone || customer.phone;
        if (notesChanged) customer.notes = updatedCustomer.notes;
      }

    showToast("تم حفظ التغييرات بنجاح", "success");
    setIsSaving(false);
    closeEditModal();
  };

  const currentStatus = useMemo(() => {
    // New Logic:
    // Positive (> 0) = He Owes Me (Debt) -> Red
    // Negative (< 0) = I Owe Him (Credit) -> Green

    if (signedBalance > 0) return "credit"; // Maps to Red/Debt UI below (old variable name reuse)
    if (signedBalance < 0) return "debt";   // Maps to Green/Credit UI below
    return "clear";
  }, [signedBalance]);

  // Derived UI helpers 
  // We reuse existing logic but map status correctly
  // If status is "credit" -> Red (Debt) -> Label "عليه دين"
  // If status is "debt" -> Green (Credit) -> Label "له رصيد"

  const amountLabel = currentStatus === "credit" ? "المبلغ المطلوب" : "الرصيد الدائن";
  const amountClass = currentStatus === "credit" ? "text-red-600" : currentStatus === "debt" ? "text-primary" : "text-text-muted";
  const badge =
    currentStatus === "credit"
      ? { label: "عليه دين", bg: "bg-red-50", border: "border-red-100", textClass: "text-red-600" }
      : currentStatus === "debt"
        ? { label: "له رصيد", bg: "bg-primary-soft", border: "border-primary/20", textClass: "text-primary" }
        : { label: "خالص", bg: "bg-slate-100", border: "border-slate-200", textClass: "text-slate-500" };

  // Track balance direction for visual effects on transaction changes
  const [prevBalance, setPrevBalance] = useState(displayBalance);
  const [lastTransactionType, setLastTransactionType] = useState<'debit' | 'credit' | null>(null);
  const balanceDirection = displayBalance > prevBalance ? 'down' : displayBalance < prevBalance ? 'up' : 'neutral';

  useEffect(() => {
    if (displayBalance !== prevBalance && transactions.length > 0) {
      // Determine the type of the last transaction
      const lastTx = transactions[0];
      setLastTransactionType(lastTx.type as 'debit' | 'credit');
      // Reset after animation completes
      const timer = setTimeout(() => setLastTransactionType(null), 1000);
      return () => clearTimeout(timer);
    }
    setPrevBalance(displayBalance);
  }, [displayBalance, transactions]);

  // Animated number helper for smooth counting transition
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

  const animatedBalance = useAnimatedNumber(Math.abs(displayBalance));

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar activePage="customers" />

      <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto">
        <CollapsibleHeader
          title="ملف العميل"
          badge={isLoading ? "..." : badge.label}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="بحث بالتاريخ أو عنوان المعاملة..."
          onMenuClick={() => setIsDrawerOpen(true)}
          primaryAction={{
            label: "تعيين تذكير",
            icon: "notifications",
            onClick: () => setShowReminder(!showReminder),
          }}
          isLoading={isLoading}
          scrollContainerRef={mainRef}
        />

        <div className="px-4 py-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 md:gap-8">
          {/* Heading */}
          {isLoading ? (
            <div className="flex items-end justify-between">
              <div className="w-full max-w-sm">
                <div className="h-8 w-40 bg-slate-100 rounded mb-2 animate-pulse"></div>
                <div className="flex items-center gap-4">
                  <div className="h-4 w-24 bg-slate-100 rounded animate-pulse"></div>
                  <span className="size-1 bg-slate-300 rounded-full" />
                  <div className="h-4 w-28 bg-slate-100 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="h-9 w-28 bg-slate-100 rounded-xl animate-pulse"></div>
            </div>
          ) : (
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900 mb-1">{customer.name}</h3>
                <div className="flex items-center gap-4 text-slate-500">
                  <span className="text-sm">{customer.phone}</span>
                  <span className="size-1 bg-slate-300 rounded-full" />
                  <span className="text-sm">{customer.lastActivity}</span>
                </div>
              </div>
              <button
                onClick={openEditModal}
                className="px-5 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                aria-haspopup="dialog"
              >
                تعديل الملف
              </button>
            </div>
          )}

          {/* Balance + Actions (match supplier profile layout) */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 rounded-xl p-8 bg-slate-100 animate-pulse"></div>
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="h-14 rounded-xl bg-slate-100 animate-pulse"></div>
                <div className="h-14 rounded-xl bg-slate-100 animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Balance card */}
              <div className="lg:col-span-7 rounded-2xl p-6 md:p-8 border border-slate-200 bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-text-muted text-sm font-bold uppercase tracking-wider">الرصيد</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className={`text-text-main tracking-tight text-4xl md:text-5xl font-black leading-tight transition-transform duration-300 ${displayBalance < 0 ? 'text-red-600' : 'text-primary'}`} style={{ direction: 'ltr' }}>
                        {displayBalance > 0 ? '+' : ''}{Math.round(animatedBalance).toLocaleString("en-US")}
                      </p>
                      <span className="text-lg font-bold text-text-muted">ج.س</span>
                      {amountClass && (
                        <span className={`material-symbols-outlined text-2xl ${amountClass} ${currentStatus !== 'clear' ? 'animate-pulse' : ''}`}>
                          {currentStatus === "credit" ? "savings" : currentStatus === "debt" ? "account_balance_wallet" : "check_circle"}
                        </span>
                      )}
                      {balanceDirection === 'up' && (
                        <span className={`material-symbols-outlined text-2xl animate-bounce ${lastTransactionType === 'debit' ? 'text-red-600' : lastTransactionType === 'credit' ? 'text-primary' : amountClass}`}>arrow_upward</span>
                      )}
                      {balanceDirection === 'down' && (
                        <span className={`material-symbols-outlined text-2xl animate-bounce ${lastTransactionType === 'debit' ? 'text-red-600' : lastTransactionType === 'credit' ? 'text-primary' : amountClass}`}>arrow_downward</span>
                      )}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-text-muted">account_balance_wallet</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-muted font-medium mt-3">
                  <span className="material-symbols-outlined text-base">event_repeat</span>
                  <span>آخر معاملة: {customer.lastActivity}</span>
                </div>
              </div>

              {/* Quick actions + WhatsApp bar */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-sm">
                  <p className="text-text-muted text-xs font-bold uppercase tracking-wider mb-3">أوامر سريعة</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => openModal("debit")}
                      className="flex min-w-[140px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-12 md:h-14 px-6 md:px-8 bg-red-500 text-white text-sm md:text-base font-bold leading-normal transition-all active:scale-95 hover:bg-red-600"
                    >
                      <span className="material-symbols-outlined text-lg">upload</span>
                      <span className="truncate">أعطيته (دين جديد)</span>
                    </button>
                    <button
                      onClick={() => openModal("credit")}
                      className="flex min-w-[140px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-12 md:h-14 px-6 md:px-8 bg-primary text-white text-sm md:text-base font-bold leading-normal transition-all active:scale-95 hover:bg-green-600"
                    >
                      <span className="material-symbols-outlined text-lg">download</span>
                      <span className="truncate">قبضت (استلام مبلغ)</span>
                    </button>
                  </div>
                </div>

                <button className="w-full group relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 hover:from-emerald-100 hover:to-emerald-100 border border-green-200 hover:border-green-300 text-green-700 rounded-xl px-5 py-4 flex items-center justify-between font-bold transition-all duration-200 hover:shadow-md hover:shadow-green-200/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">إرسال إشعار بالواتساب</div>
                      <div className="text-[11px] text-green-600/80 font-medium">تذكير العميل بأحدث معاملة</div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-green-600 group-hover:translate-x-0.5 transition-transform">arrow_back</span>
                </button>
              </div>
            </div>
          )}



          {/* Transactions */}
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center gap-3 px-2">
                    <Skeleton className="h-3 w-24" />
                    <div className="h-[1px] flex-1 bg-slate-100" />
                  </div>
                  {[...Array(3)].map((__, ri) => (
                    <ProfileTransactionRowSkeleton key={ri} />
                  ))}
                </div>
              ))}
            </div>
          ) : emptyKind ? (
            <EmptyState
              title={emptyKind === "empty" ? "لا توجد معاملات" : "لم يتم العثور على نتائج"}
              description={emptyKind === "empty" ? "لا توجد معاملات لهذا العميل" : `لم يتم العثور على معاملات مطابقة لـ "${searchQuery}"`}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {Object.entries(
                filtered.reduce<Record<string, TransactionItem[]>>((acc, t) => {
                  acc[t.date] = acc[t.date] ? [...acc[t.date], t] : [t];
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => (a > b ? -1 : 1))
                .map(([date, dateTransactions]) => (
                  <div key={date} className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 px-4">
                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                      <span className="text-sm font-bold text-text-muted">{date}</span>
                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                    </div>

                    <div className="flex flex-col gap-3">
                      {dateTransactions.map((t) => (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransaction({
                              id: t.id,
                              type: t.type === "debit" ? "out" : "in",
                              amount: t.amount,
                              title: t.title,
                              datetime: t.date,
                              paymentMethod: "cash",
                              notes: t.notes || "",
                              receipt: t.receipt,
                            });
                            setShowTransactionDetails(true);
                          }}
                          className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div
                            className={`size-12 rounded-full flex items-center justify-center shrink-0 ${t.type === "debit" ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
                              }`}
                          >
                            <span className="material-symbols-outlined text-2xl">
                              {t.type === "debit" ? "south_west" : "north_east"}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg text-text-main truncate">{t.title}</h3>
                              <span className="text-xs px-2 py-0.5 rounded font-bold bg-slate-100 text-text-muted">كاش</span>
                            </div>
                            <p className="text-sm text-text-muted line-clamp-1">{t.title || "بدون ملاحظة"}</p>
                          </div>

                          <div className="text-left flex flex-col items-end shrink-0">
                            <span className={`text-xl font-black ${t.type === "debit" ? "text-red-500" : "text-primary"}`}>
                              {t.type === "debit" ? "- " : "+ "}
                              {t.amount.toLocaleString("en-US")} ج.س
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

              {/* Opening Balance Row */}
              {(customer.opening_balance || 0) > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 px-4">
                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                    <span className="text-sm font-bold text-text-muted">{customer.created_at?.split('T')[0] || 'بداية التعامل'}</span>
                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 opacity-80">
                      <div className="size-12 rounded-full flex items-center justify-center shrink-0 bg-slate-200 text-slate-500">
                        <span className="material-symbols-outlined text-2xl">account_balance</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-slate-700">رصيد افتتاحي</h3>
                        <p className="text-sm text-slate-500">الرصيد في بداية التعامل</p>
                      </div>
                      <div className="text-left flex flex-col items-end shrink-0">
                        <span className={`text-xl font-black ${customer.opening_balance_direction === 'out' ? 'text-primary' : 'text-red-500'}`}>
                          {customer.opening_balance_direction === 'out' ? '+ ' : '- '}
                          {(customer.opening_balance || 0).toLocaleString("en-US")} ج.س
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-center pt-2">
                <div className="px-4 py-2 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-sm font-bold flex items-center gap-2 animate-fadeInUp">
                  <span className="material-symbols-outlined text-base text-primary">flag</span>
                  <span>وصلت لآخر معاملة</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <TransactionFormModal
        mode={modalMode}
        onCloseAction={closeModal}
        onSaveAction={handleSaveTransaction}
        isLoading={isSaving}
        isEditMode={!!editTransactionId}
        initialData={
          editTransactionId && selectedTransaction
            ? {
              amount: selectedTransaction.amount,
              paymentMethod: selectedTransaction.paymentMethod as any,
              notes: selectedTransaction.notes || "",
              title: selectedTransaction.title,
              occurredAt: selectedTransaction.datetime,
              receiptImage: selectedTransaction.receipt?.url,
            }
            : undefined
        }
      />

      <TransactionDetailsModal
        isOpen={showTransactionDetails}
        transaction={selectedTransaction}
        onClose={() => {
          setShowTransactionDetails(false);
          setSelectedTransaction(null);
        }}
        onEdit={(t) => {
          setEditTransactionId(t.id);
          setModalMode(t.type === "out" ? "debit" : "credit"); // out=debit, in=credit
          setShowTransactionDetails(false);
        }}
        onDelete={(transactionId) => {
          deleteTransaction(transactionId).then(({ error }) => {
            if (error) {
              showToast("فشل حذف المعاملة", "error");
              return;
            }
            setTransactions(transactions.filter((t) => t.id !== transactionId));
            setShowTransactionDetails(false);
            showToast("تم حذف المعاملة بنجاح", "success");
          });
        }}
      />

      {/* Reminder Card */}
      {showReminder && (
        <div className="fixed inset-x-4 top-24 z-50 flex items-start justify-center pointer-events-none">
          <div
            className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-100 pointer-events-auto transform transition-all animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">alarm_add</span>
                تعيين تذكير
              </h3>
              <button
                onClick={() => setShowReminder(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="mb-5">
              <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">موعد سريع</p>
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 7, 30].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleSetQuickReminder(d)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${reminderDate === new Date(Date.now() + d * 86400000).toISOString().split("T")[0]
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-primary hover:text-white"
                      }`}
                  >
                    {d === 0 ? "اليوم" : d === 1 ? "غداً" : d === 2 ? "بعد يومين" : d === 7 ? "بعد أسبوع" : "بعد شهر"}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ مخصص</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">event</span>
                  <input
                    type="date"
                    value={reminderDate || getDefaultReminderDate()}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pr-10 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">ملاحظات إضافية</label>
                <textarea
                  value={reminderNotes}
                  onChange={(e) => setReminderNotes(e.target.value)}
                  placeholder="اكتب تذكيرك هنا..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
                  rows={3}
                />
              </div>
            </div>

            <button
              onClick={handleSaveReminder}
              className="w-full bg-primary hover:bg-green-600 text-white py-3 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
            >
              <span>حفظ التذكير</span>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </button>
          </div>
        </div>
      )}

      <ProfileEditModal
        isOpen={showEditModal}
        onClose={closeEditModal}
        entity={{
          id: customer.id,
          name: customer.name,
          phone: customer.phone || "",
          notes: customer.notes || "",
          avatar_url: customer.avatar_url,
          initials: customer.name.slice(0, 2).toUpperCase(),
        }}
        entityType="customer"
        isSaving={isSaving}
        onSave={async (data) => {
          setEditName(data.name);
          setEditPhone(data.phone);
          setEditNotes(data.notes);
          await handleSaveEditProfile();
        }}
        onDelete={async () => {
          try {
            const { error } = await deleteCustomer(String(customer.id));
            if (error) {
              showToast(`فشل حذف العميل: ${error.message || "خطأ غير معروف"}`, "error");
            } else {
              showToast("تم حذف العميل بنجاح", "success");
              router.replace('/dashboard/customers');
            }
          } catch (err: any) {
            showToast(`حدث خطأ غير متوقع: ${err.message}`, "error");
          }
        }}
        uploadAvatar={async (file) => {
          await handleEditImageChange({ target: { files: [file] } } as any);
        }}
        isUploadingAvatar={isUploadingAvatar}
        editImageUrl={editImageUrl}
      />

      <MobileDrawer open={isDrawerOpen} onCloseAction={() => setIsDrawerOpen(false)} activePage="customers" onOpenProfileAction={() => setIsProfileOpen(true)} />
    </div>
  );
}
