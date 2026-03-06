"use client";

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import TransactionDetailsModal, { Transaction } from "@/components/dashboard/TransactionDetailsModal";
import TransactionFormModal, { TransactionFormData } from "@/components/dashboard/TransactionFormModal";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";
import EmptyState from "@/components/dashboard/EmptyState";
import ProfileEditModal from "@/components/dashboard/ProfileEditModal";
import ProfileTransactionRowSkeleton from "@/components/skeletons/ProfileTransactionRowSkeleton";
import { SummaryCardSkeleton } from "@/components/skeletons/SummaryCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/toast-context";
import { createBrowserClient } from "@/lib/supabase/client";
import { createTransaction, listTransactionsBrowser, updateTransaction, deleteTransaction } from "@/lib/repo/transactions";
import { updateSupplier, deleteSupplier } from "@/lib/repo/suppliers";
import { uploadAvatar, getSignedUrl, uploadReceipt } from "@/lib/storage";
import { replaceTransactionReceipts } from "@/lib/repo/attachments-helper";
import { getTransactionAttachments } from "@/lib/repo/attachments";
import CollapsibleHeader from "@/components/common/CollapsibleHeader";
import type { DashboardSupplier } from "@/mocks/suppliers";

export type TransactionType = "debit" | "credit";
export interface TransactionItem {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  date: string; // ISO: YYYY-MM-DD
  method?: "cash" | "online";
  occurredAt?: string; // Full ISO timestamp for editing
  receipt?: {
    url: string | null;
    filename: string;
    path: string;
  };
}

interface Props {
  supplier: DashboardSupplier;
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
  const dt = new Date(y, mo - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

function filterTransactions(items: TransactionItem[], query: string) {
  const q = query.trim();
  if (!q) return items;

  // Try date range pattern like "2023-10-01 2023-10-31" or "2023/10/01 - 2023/10/31"
  const tokens = q
    .replace(/[\u0627-\u064a]/g, " ") // strip Arabic letters to simplify
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

export default function SupplierProfileView({ supplier, transactions: initialTransactions, businessId }: Props) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [transactions, setTransactions] = useState(initialTransactions);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const { showToast } = useToast();
  const [showReminder, setShowReminder] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);
  const [reminderDate, setReminderDate] = useState<string>("");
  const [reminderNotes, setReminderNotes] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(supplier.name);
  const [editPhone, setEditPhone] = useState(supplier.phone);
  const [editNotes, setEditNotes] = useState("");
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState("");
  const [originalEditValues, setOriginalEditValues] = useState<{ name: string; phone: string; avatar_url: string | null; notes: string }>({ name: "", phone: "", avatar_url: null, notes: "" });
  const [avatarChanged, setAvatarChanged] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    setIsLoading(true);
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionItem | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const filtered = useMemo(() => filterTransactions(transactions, searchQuery), [transactions, searchQuery]);

  const totalTransactions = transactions.length;
  const hasActiveFilters = searchQuery.trim().length > 0;
  const emptyKind = totalTransactions === 0 ? "empty" : filtered.length === 0 && hasActiveFilters ? "noResults" : null;

  // Modal handlers
  const openModal = useCallback((mode: "debit" | "credit", edit = false) => {
    setIsEditMode(edit);
    setModalMode(mode);
  }, []);

  const closeModal = useCallback(() => {
    setModalMode(null);
    setIsEditMode(false);
    setEditingTransaction(null);
  }, []);

  const handleSaveTransaction = async (data: TransactionFormData) => {
    if (!businessId || !supplier.id) {
      showToast("تعذر حفظ المعاملة: مفقود معرف النشاط", "error");
      return;
    }

    if (isEditMode && editingTransaction) {
      // Check what changed
      const amountChanged = data.amount !== editingTransaction.amount;
      const titleChanged = data.title?.trim() !== editingTransaction.title;
      const methodChanged = data.paymentMethod !== editingTransaction.method;
      const notesChanged = data.notes?.trim() !== "";
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
      const updatedTransaction: TransactionItem = {
        ...editingTransaction,
        amount: data.amount,
        title: data.title?.trim() || editingTransaction.title,
        occurredAt: newOccurredAt,
        date: dt ? dt.toISOString().split("T")[0] : editingTransaction.date,
        method: data.paymentMethod === "cash" || data.paymentMethod === "online" ? data.paymentMethod : "cash",
      };

      setTransactions(transactions.map(t =>
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
        console.error('[SupplierProfileView] Transaction update error:', error);
        showToast("فشل تحديث المعاملة", "error");
        // Revert optimistic update on error
        const { transactions: freshData } = await listTransactionsBrowser({
          businessId,
          entityType: "supplier",
          entityId: String(supplier.id)
        });
        if (freshData && freshData.length > 0) {
          const mapped = freshData.map(t => {
            const hasReceipt = t.receipt_url || t.receipt_path;
            return {
              id: t.id,
              title: t.title || t.notes || "",
              type: t.type === "out" ? "debit" as const : "credit" as const,
              amount: Number(t.amount) || 0,
              date: t.occurred_at ? new Date(t.occurred_at).toLocaleDateString("en-CA") : new Date().toLocaleDateString("en-CA"),
              occurredAt: t.occurred_at || "",
              receipt: hasReceipt
                ? {
                    url: t.receipt_url ?? null,
                    filename: t.receipt_path?.split("/").pop() || "receipt.jpg",
                    path: t.receipt_path || "",
                  }
                : undefined,
            };
          });
          setTransactions(mapped);
        }
        setIsSaving(false);
        return;
      }

      showToast("تم تحديث المعاملة بنجاح", "success");

      // Handle receipt upload/replacement
      if (data.receiptFile) {
        // Delete old receipts first
        await replaceTransactionReceipts(editingTransaction.id, 'receipts');

        // Upload new receipt
        const { error: uploadError } = await uploadReceipt(
          data.receiptFile,
          businessId,
          editingTransaction.id
        );

        if (uploadError) {
          showToast("تم تحديث المعاملة ولكن فشل رفع الإيصال", "error");
        } else {
          showToast("تم تحديث المعاملة والإيصال بنجاح", "success");
        }
      }

      setIsSaving(false);
      return;
    }

    const txType = modalMode === "debit" ? "out" : "in";
    const title = data.notes.trim() || (modalMode === "debit" ? "دين جديد" : "تحصيل");

    const { transaction, error } = await createTransaction({
      businessId,
      entityType: "supplier",
      supplierId: String(supplier.id),
      type: txType,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      title,
      notes: data.notes || undefined,
    });

    if (error || !transaction) {
      showToast("تعذر حفظ المعاملة", "error");
      return;
    }

    const mapped: TransactionItem = {
      id: transaction.id,
      title: transaction.title || transaction.notes || title,
      type: transaction.type === "out" ? "debit" : "credit",
      amount: Number(transaction.amount) || 0,
      date: transaction.occurred_at ? new Date(transaction.occurred_at).toLocaleDateString("en-CA") : new Date().toLocaleDateString("en-CA"),
      method: (transaction.payment_method as "cash" | "online") || "cash",
    };

    setTransactions([mapped, ...transactions]);
    showToast(modalMode === "debit" ? "تم تسجيل الدين" : "تم تسجيل التحصيل", "success");

    // Upload receipt if provided (and update transaction row so it shows immediately)
    if (data.receiptFile) {
      uploadReceipt(data.receiptFile, businessId, transaction.id)
        .then(async ({ path, error: uploadError }) => {
          if (uploadError) {
            showToast("تم حفظ المعاملة ولكن فشل رفع الإيصال", "error");
            return;
          }

          // Generate signed URL for immediate preview
          const { signedUrl } = await getSignedUrl('receipts', path);

          // Persist on transaction record as well (optional but helps queries/UI)
          await updateTransaction(transaction.id, {
            receipt_path: path,
            receipt_url: signedUrl || null,
          });

          // Update local state
          setTransactions(prev => prev.map(t => t.id === transaction.id ? {
            ...t,
            receipt: {
              url: signedUrl || null,
              filename: path.split('/').pop() || 'receipt.jpg',
              path,
            }
          } : t));
        });
    }

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

  // Fetch signed URL for avatar when supplier avatar changes
  useEffect(() => {
    const fetchAvatarUrl = async () => {
      if (supplier.avatar_url && !/^https?:\/\//i.test(supplier.avatar_url)) {
        // This is a storage path, fetch signed URL
        const { signedUrl } = await getSignedUrl('avatars', supplier.avatar_url);
        if (signedUrl) {
          setEditImageUrl(signedUrl);
        } else {
          setEditImageUrl(null);
        }
      } else if (supplier.avatar_url && /^https?:\/\//i.test(supplier.avatar_url)) {
        // Already a public URL
        setEditImageUrl(supplier.avatar_url);
      } else {
        setEditImageUrl(null);
      }
    };

    fetchAvatarUrl();
  }, [supplier.avatar_url]);

  // Lazy load receipts for selected transaction
  useEffect(() => {
    if (showTransactionDetails && selectedTransaction) {
      const fetchReceipt = async () => {
        try {
          const { attachments } = await getTransactionAttachments(selectedTransaction.id);

          if (attachments && attachments.length > 0) {
            const att = attachments[0];
            const { signedUrl } = await getSignedUrl('receipts', att.path);
            if (signedUrl) {
              setSelectedTransaction(prev =>
                prev ? {
                  ...prev,
                  receipt: {
                    url: signedUrl,
                    filename: att.file_name,
                    path: att.path  // Store path for download URL generation
                  }
                } : null
              );
            }
          }
        } catch (e) {
          console.error('Failed to fetch receipt:', e);
        }
      };

      fetchReceipt();
    }
  }, [showTransactionDetails, selectedTransaction?.id]);

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
    setHasReminder(true);
    setShowReminder(false);
    setReminderDate("");
    setReminderNotes("");
  };

  const openEditModal = async () => {
    setEditName(supplier.name);
    setEditPhone(supplier.phone);
    setEditNotes("");
    setEditImagePreview(null);
    setEditFormError("");
    setAvatarChanged(false);
    setOriginalEditValues({
      name: supplier.name,
      phone: supplier.phone || "",
      avatar_url: supplier.avatar_url || null,
      notes: supplier.notes || ""
    });

    // Fetch signed URL for existing avatar
    if (supplier.avatar_url) {
      console.log('[SupplierProfileView] Avatar URL:', supplier.avatar_url);
      if (!/^https?:\/\//i.test(supplier.avatar_url)) {
        // Storage path - fetch signed URL
        const { signedUrl, error } = await getSignedUrl('avatars', supplier.avatar_url);
        console.log('[SupplierProfileView] Signed URL fetched:', signedUrl, 'Error:', error);
        setEditImageUrl(signedUrl || null);
      } else {
        // Already a public URL
        console.log('[SupplierProfileView] Using public URL:', supplier.avatar_url);
        setEditImageUrl(supplier.avatar_url);
      }
    } else {
      console.log('[SupplierProfileView] No avatar URL');
      setEditImageUrl(null);
    }

    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditFormError("");
    setEditImagePreview(null);
  };

  const handleEditImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Enhanced file validation
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      showToast(validation.error || "ملف غير صالح", "error");
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to backend if supplier exists
    if (supplier.id && businessId) {
      setIsUploadingAvatar(true);
      try {
        const { path, error } = await uploadAvatar(
          file,
          businessId,
          'supplier',
          String(supplier.id)
        );

        if (error) {
          console.error('Error uploading avatar:', error);
          showToast("فشل في رفع الصورة", "error");
          setEditImagePreview(null);
          return;
        }

        // IMPORTANT: Update the database with the new avatar path
        const supabase = createBrowserClient();
        const { error: dbError } = await supabase
          .from('suppliers')
          // @ts-ignore
          .update({ avatar_url: path })
          .eq('id', supplier.id)
          .eq('business_id', businessId);

        if (dbError) {
          console.error('Failed to link avatar to supplier:', dbError);
          showToast("فشل حفظ رابط الصورة", "error");
          return;
        }

        // Get signed URL for display
        const { signedUrl } = await getSignedUrl('avatars', path);
        if (signedUrl) {
          setEditImageUrl(signedUrl);
        }

        // Update local state so it reflects immediately
        (supplier as any).avatar_url = path;
        setAvatarChanged(true);
        showToast("تم رفع الصورة بنجاح", "success");
      } catch (error) {
        console.error('Error uploading avatar:', error);
        showToast("فشل في رفع الصورة", "error");
        setEditImagePreview(null);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  // Enhanced file validation function (same as WorkerDetailsModal)
  const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
    // 1. File type validation (MIME type)
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif'
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      return {
        isValid: false,
        error: "نوع الملف غير مدعوم. يُسمح فقط بـ JPEG, PNG, WebP, GIF"
      };
    }

    // 2. File extension validation
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      return {
        isValid: false,
        error: "امتداد الملف غير مدعوم"
      };
    }

    // 3. File size validation (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: "حجم الصورة يجب أن يكون أقل من 5 ميجابايت"
      };
    }

    // 4. Minimum file size
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      return {
        isValid: false,
        error: "الملف صغير جداً"
      };
    }

    // 5. Dangerous filename patterns
    const dangerousPatterns = [
      /\.\./,
      /[<>:"|?*]/,
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,
      /\.(exe|bat|cmd|scr|pif|com|dll|vbs|js|jar|php|asp|jsp)$/i
    ];

    if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
      return {
        isValid: false,
        error: "اسم الملف غير صالح"
      };
    }

    return { isValid: true };
  };

  const handleSaveEditProfile = async () => {
    setEditFormError("");
    const nameStr = editName.trim();
    const phoneStr = editPhone.trim();

    if (!nameStr) {
      setEditFormError("اسم المورد مطلوب");
      return;
    }

    if (phoneStr && !/^[\d\s+\-()]*$/.test(phoneStr)) {
      setEditFormError("رقم الهاتف غير صحيح");
      return;
    }

    // Check what changed
    const nameChanged = nameStr !== originalEditValues.name;
    const phoneChanged = phoneStr !== originalEditValues.phone;
    const notesChanged = editNotes.trim() !== originalEditValues.notes;
    const hasChanges = nameChanged || phoneChanged || notesChanged || avatarChanged;

    // If nothing changed, just close modal
    if (!hasChanges) {
      closeEditModal();
      return;
    }

    setIsSaving(true);

    // Build update payload with only changed fields
    const updatePayload: any = {};
    if (nameChanged) updatePayload.name = nameStr;
    if (phoneChanged) updatePayload.phone = phoneStr || undefined;
    if (notesChanged) updatePayload.notes = editNotes.trim();

    // Call backend if name, phone, or notes changed (avatar already uploaded)
    if (nameChanged || phoneChanged || notesChanged) {
      const { supplier: updatedSupplier, error } = await updateSupplier(String(supplier.id), updatePayload);

      if (error) {
        setEditFormError("فشل حفظ التغييرات");
        showToast("فشل حفظ التغييرات", "error");
        setIsSaving(false);
        return;
      }

      if (updatedSupplier) {
        // Update the supplier object with new data
        if (nameChanged) supplier.name = updatedSupplier.name;
        if (phoneChanged) supplier.phone = updatedSupplier.phone || supplier.phone;
        if (notesChanged) supplier.notes = updatedSupplier.notes;
        if (updatedSupplier.avatar_url) {
          supplier.avatar_url = updatedSupplier.avatar_url;
        }
      }
    }

    showToast("تم حفظ التغييرات بنجاح", "success");
    setIsSaving(false);
    closeEditModal();
  };

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

  // Cashflow convention (same as customers):
  // + = أعطيته (outflow), - = قبضت (inflow)
  const { signedBalance, derivedStatus, derivedAmount } = useMemo(() => {
    const openingBalance = Number((supplier as any).opening_balance ?? supplier.amount ?? 0);
    const openingDir = ((supplier as any).opening_balance_direction || 'in') as 'in' | 'out';
    const openingSigned = openingDir === 'out' ? openingBalance : -openingBalance;

    const transactionsDelta = transactions.reduce((sum, t) => {
      // debit(out) => + , credit(in) => -
      return sum + (t.type === "debit" ? t.amount : -t.amount);
    }, 0);

    const signed = openingSigned + transactionsDelta;
    const status: "debt" | "credit" | "clear" = signed > 0 ? "debt" : signed < 0 ? "credit" : "clear";

    return { signedBalance: signed, derivedStatus: status, derivedAmount: Math.abs(signed) };
  }, [supplier, transactions]);

  const animatedAmountAbs = useAnimatedNumber(derivedAmount);

  // Track direction changes for balance
  const [prevDerivedAmount, setPrevDerivedAmount] = useState(derivedAmount);
  const [lastTransactionType, setLastTransactionType] = useState<'debit' | 'credit' | null>(null);
  const balanceDirection = derivedAmount > prevDerivedAmount ? 'up' : derivedAmount < prevDerivedAmount ? 'down' : 'neutral';

  useEffect(() => {
    if (derivedAmount !== prevDerivedAmount && transactions.length > 0) {
      // Determine the type of the last transaction
      const lastTx = transactions[0];
      setLastTransactionType(lastTx.type as 'debit' | 'credit');
      // Reset after animation completes
      const timer = setTimeout(() => setLastTransactionType(null), 1000);
      return () => clearTimeout(timer);
    }
    setPrevDerivedAmount(derivedAmount);
  }, [derivedAmount, transactions]);

  const amountLabel = derivedStatus === "debt" ? "صافي أعطيته" : derivedStatus === "credit" ? "صافي قبضت" : "الرصيد";

  // Colors in profiles (دفتر العناوين): + => GREEN, - => RED
  const amountClass = derivedStatus === "debt"
    ? "text-green-700 dark:text-green-400"
    : derivedStatus === "credit"
      ? "text-red-600 dark:text-red-400"
      : "text-slate-900 dark:text-white";

  const badge = derivedStatus === "debt"
    ? { label: "صافي أعطيته", bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200/60 dark:border-green-900/30", textClass: "text-green-700 dark:text-green-400" }
    : derivedStatus === "credit"
      ? { label: "صافي قبضت", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200/60 dark:border-red-900/30", textClass: "text-red-600 dark:text-red-400" }
      : { label: "متوازن", bg: "bg-slate-100 dark:bg-slate-700/40", border: "border-slate-200 dark:border-slate-700", textClass: "text-slate-900 dark:text-white" };

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar activePage="suppliers" />

      <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto">
        {/* Collapsible Header */}
        <CollapsibleHeader
          title="ملف المورد"
          badge={isLoading ? "..." : badge.label}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="بحث بالتاريخ أو عنوان المعاملة..."
          onMenuClick={() => setIsDrawerOpen(true)}
          showBackButton
          onBackClick={() => router.back()}
          primaryAction={{
            label: "تعيين تذكير",
            icon: "notifications",
            onClick: () => setShowReminder(!showReminder),
          }}
          isLoading={isLoading}
          scrollContainerRef={mainRef}
        />

        {/* Content */}
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
                <h3 className="text-3xl font-black text-slate-900 mb-1">{supplier.name}</h3>
                <div className="flex items-center gap-4 text-slate-500">
                  <span className="text-sm">{supplier.phone}</span>
                  <span className="size-1 bg-slate-300 rounded-full" />
                  <span className="text-sm">{supplier.lastActivity}</span>
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

          {/* Balance + Actions */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 rounded-xl p-8 bg-slate-100 animate-pulse"></div>
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div className="h-14 rounded-xl bg-slate-100 animate-pulse"></div>
                <div className="h-14 rounded-xl bg-slate-100 animate-pulse"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-4 rounded-xl p-6 md:p-8 border border-slate-200 bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-text-muted text-sm font-bold uppercase tracking-wider">الرصيد</p>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p
                        className={`text-text-main tracking-tight text-4xl md:text-5xl font-black leading-tight transition-transform duration-300 ${
                          signedBalance > 0
                            ? "text-green-700 dark:text-green-400"
                            : signedBalance < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-slate-900 dark:text-white"
                          }`}
                        style={{ direction: 'ltr' }}
                      >
                        {(signedBalance > 0 ? "+" : signedBalance < 0 ? "-" : "")}{Math.round(animatedAmountAbs).toLocaleString("en-US")}
                      </p>
                      <span className="text-lg font-bold text-text-muted">ج.س</span>
                      {balanceDirection === 'up' && (
                        <span className={`material-symbols-outlined text-2xl animate-bounce ${lastTransactionType === 'debit'
                          ? 'text-green-700 dark:text-green-400'
                          : lastTransactionType === 'credit'
                            ? 'text-red-600 dark:text-red-400'
                            : amountClass}`}>arrow_upward</span>
                      )}
                      {balanceDirection === 'down' && (
                        <span className={`material-symbols-outlined text-2xl animate-bounce ${lastTransactionType === 'debit'
                          ? 'text-green-700 dark:text-green-400'
                          : lastTransactionType === 'credit'
                            ? 'text-red-600 dark:text-red-400'
                            : amountClass}`}>arrow_downward</span>
                      )}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-text-muted">account_balance_wallet</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-text-muted font-medium">
                  <span className="material-symbols-outlined text-base">event_repeat</span>
                  <span>آخر معاملة: {supplier.lastActivity}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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

              {/* WhatsApp Notice - separate lightweight bar */}
              <button className="w-full group relative overflow-hidden bg-gradient-to-r from-green-50 to-emerald-50 hover:from-emerald-100 hover:to-emerald-100 border border-green-200 hover:border-green-300 text-green-700 rounded-xl px-5 py-4 flex items-center justify-between font-bold transition-all duration-200 hover:shadow-md hover:shadow-green-200/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">إرسال إشعار بالواتساب</div>
                    <div className="text-[11px] text-green-600/80 font-medium">تذكير العميل أو المورد بأحدث معاملة</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-green-600 group-hover:translate-x-0.5 transition-transform">arrow_back</span>
              </button>
            </div>
          )}

          {/* Transactions */}
          {isLoading ? (
            <div className="flex flex-col gap-6">
              {[...Array(2)].map((_, di) => (
                <div key={di} className="space-y-3">
                  <div className="h-3 w-28 bg-slate-100 rounded ml-1 animate-pulse"></div>
                  {[...Array(3)].map((_, ri) => (
                    <ProfileTransactionRowSkeleton key={ri} />
                  ))}
                </div>
              ))}
            </div>
          ) : emptyKind ? (
            <EmptyState
              title={emptyKind === "empty" ? "لا توجد معاملات" : "لم يتم العثور على نتائج"}
              description={emptyKind === "empty" ? "لا توجد معاملات لهذا المورد" : `لم يتم العثور على معاملات مطابقة لـ "${searchQuery}"`}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {/* Group transactions by date */}
              {Object.entries(
                filtered.reduce<Record<string, TransactionItem[]>>((acc, t) => {
                  acc[t.date] = acc[t.date] ? [...acc[t.date], t] : [t];
                  return acc;
                }, {})
              )
                .sort(([a], [b]) => (a > b ? -1 : 1))
                .map(([date, dateTransactions]) => (
                  <div key={date} className="flex flex-col gap-3">
                    {/* Date Separator */}
                    <div className="flex items-center gap-3 px-4">
                      <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-700"></div>
                      <span className="text-sm font-bold text-text-muted">{date}</span>
                      <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-700"></div>
                    </div>

                    {/* Transaction Rows */}
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
                              paymentMethod: t.method || "cash",
                              notes: "",
                            });
                            setShowTransactionDetails(true);
                          }}
                          className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer"
                        >
                          {/* Diagonal Arrow Icon */}
                          <div
                            className={`size-12 rounded-full flex items-center justify-center shrink-0 ${t.type === "debit"
                              ? "bg-green-500/10 text-green-600"
                              : "bg-red-500/10 text-red-500"
                              }`}
                          >
                            <span className="material-symbols-outlined text-2xl">
                              {/* Debit/Out = Up (call_made). Credit/In = Down (call_received) */}
                              {t.type === "debit" ? "call_made" : "call_received"}
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
                              {t.title || "بدون ملاحظة"}
                            </p>
                          </div>

                          {/* Amount */}
                          <div className="text-left flex flex-col items-end shrink-0">
                            <span
                              className={`text-xl font-black ${t.type === "debit"
                                ? "text-green-700 dark:text-green-400"
                                : "text-red-600 dark:text-red-400"
                                }`}
                            >
                              {t.type === "debit" ? "+ " : "- "}{t.amount.toLocaleString("en-US")} ج.س
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

              {/* Opening Balance Row (Manually Appended) */}
              {false && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 px-4">
                    <div className="h-[1px] flex-1 bg-slate-100"></div>
                    <span className="text-sm font-bold text-text-muted" style={{ direction: 'rtl' }}>بداية التعامل</span>
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
                        <span
                          className={`text-xl font-black ${(supplier as any).opening_balance_direction === 'out'
                            ? 'text-green-700 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                            }`}
                        >
                          {(supplier as any).opening_balance_direction === 'out' ? '+ ' : '- '}
                          {((supplier as any).opening_balance || 0).toLocaleString("en-US")} ج.س
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-center pt-2">
                <div className="px-4 py-2 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 text-sm font-bold flex items-center gap-2 animate-fadeInUp">
                  <span className="material-symbols-outlined text-base text-primary">flag</span>
                  <span>وصلت لآخر معاملة</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Transaction Modal */}
      <TransactionFormModal
        mode={modalMode}
        onCloseAction={closeModal}
        onSaveAction={handleSaveTransaction}
        isLoading={isSaving}
        isEditMode={isEditMode}
        initialData={editingTransaction ? {
          amount: editingTransaction.amount,
          paymentMethod: editingTransaction.method || "cash",
          notes: "",
          title: editingTransaction.title || "",
          occurredAt: editingTransaction.occurredAt || "",
        } : undefined}
      />

      {/* Reminder Card */}
      {showReminder && (
        <div className="fixed inset-x-4 top-24 z-50 flex items-start justify-center pointer-events-none">
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800 pointer-events-auto transform transition-all animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">alarm_add</span>
                تعيين تذكير
              </h3>
              <button
                onClick={() => setShowReminder(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Quick Date Options */}
            <div className="mb-5">
              <p className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">موعد سريع</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleSetQuickReminder(0)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${reminderDate === new Date().toISOString().split("T")[0]
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white"
                    }`}
                >
                  اليوم
                </button>
                <button
                  onClick={() => handleSetQuickReminder(1)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${reminderDate === new Date(Date.now() + 86400000).toISOString().split("T")[0]
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white"
                    }`}
                >
                  غداً
                </button>
                <button
                  onClick={() => handleSetQuickReminder(2)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${reminderDate === new Date(Date.now() + 172800000).toISOString().split("T")[0]
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white"
                    }`}
                >
                  بعد يومين
                </button>
                <button
                  onClick={() => handleSetQuickReminder(7)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${reminderDate === new Date(Date.now() + 604800000).toISOString().split("T")[0]
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white"
                    }`}
                >
                  بعد أسبوع
                </button>
                <button
                  onClick={() => handleSetQuickReminder(30)}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${reminderDate === new Date(Date.now() + 2592000000).toISOString().split("T")[0]
                    ? "bg-primary text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-primary hover:text-white"
                    }`}
                >
                  بعد شهر
                </button>
              </div>
            </div>

            {/* Custom Date and Notes */}
            <div className="space-y-4 mb-5">
              {/* Date Input */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">تاريخ مخصص</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">event</span>
                  <input
                    type="date"
                    value={reminderDate || getDefaultReminderDate()}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pr-10 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2">ملاحظات إضافية</label>
                <textarea
                  value={reminderNotes}
                  onChange={(e) => setReminderNotes(e.target.value)}
                  placeholder="اكتب تذكيرك هنا..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
                  rows={3}
                />
              </div>
            </div>

            {/* Save Button */}
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
          id: supplier.id,
          name: supplier.name,
          phone: supplier.phone || "",
          notes: supplier.notes || "",
          avatar_url: supplier.avatar_url,
          initials: supplier.initials,
        }}
        entityType="supplier"
        isSaving={isSaving}
        onSave={async (data) => {
          setEditName(data.name);
          setEditPhone(data.phone);
          setEditNotes(data.notes);
          // The handleSaveEditProfile function uses these states
          await handleSaveEditProfile();
        }}
        onDelete={async () => {
          try {
            const { error } = await deleteSupplier(String(supplier.id));
            if (error) {
              showToast("فشل حذف المورد", "error");
            } else {
              showToast("تم حذف المورد بنجاح", "success");
              window.history.back();
            }
          } catch (err) {
            console.error(err);
            showToast("حدث خطأ أثناء الحذف", "error");
          }
        }}
        uploadAvatar={async (file) => {
          await handleEditImageChange({ target: { files: [file] } } as any);
        }}
        isUploadingAvatar={isUploadingAvatar}
        editImageUrl={editImageUrl}
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
            openModal(originalTx.type === "debit" ? "debit" : "credit", true);
          }
          setShowTransactionDetails(false);
        }}
        onDelete={(transactionId) => {
          // Delete from backend
          deleteTransaction(transactionId).then(({ error }) => {
            if (error) {
              showToast("فشل حذف المعاملة", "error");
              return;
            }
            // Remove from local state after successful deletion
            setTransactions(transactions.filter((t) => t.id !== transactionId));
            setShowTransactionDetails(false);
            showToast("تم حذف المعاملة بنجاح", "success");
          });
        }}
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        open={isDrawerOpen}
        onCloseAction={() => setIsDrawerOpen(false)}
        onOpenProfileAction={() => setIsProfileOpen(true)}
        activePage="suppliers"
      />
    </div>
  );
}
