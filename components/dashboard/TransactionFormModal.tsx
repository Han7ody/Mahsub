"use client";
// @ts-nocheck - Next.js TS plugin incorrectly flags client component function props

import { useState, useEffect, useRef } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

export type TransactionMode = "debit" | "credit";
export type PaymentMethod = "cash" | "online";

export interface TransactionFormData {
  amount: number;
  paymentMethod: PaymentMethod;
  notes: string;
  receiptImage: string | null;
  receiptFile?: File | null; // Add file object for upload
  title?: string; // Transaction title
  occurredAt?: string; // Transaction date/time
}

interface TransactionFormModalProps {
  mode: TransactionMode | null;
  onCloseAction?: () => void;
  onSaveAction?: (data: TransactionFormData) => void;
  isLoading?: boolean;
  isEditMode?: boolean;
  initialData?: {
    amount: number;
    paymentMethod: PaymentMethod;
    notes: string;
    title?: string;
    occurredAt?: string;
    receiptImage?: string | null;
  };
}

export default function TransactionFormModal({
  mode,
  onCloseAction = () => { },
  onSaveAction = () => { },
  isLoading = false,
  isEditMode = false,
  initialData,
}: TransactionFormModalProps) {
  const [amount, setAmount] = useState("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [amountError, setAmountError] = useState("");

  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const dragStartY = useRef(0);

  const amountInputRef = useRef<HTMLInputElement>(null);
  const prevModeRef = useRef<TransactionMode | null>(null);

  // Lock body scroll when modal is open
  useBodyScrollLock(!!mode);

  // Reset form when modal opens
  useEffect(() => {
    // Only reset form when modal opens (transition from null to a mode) or when editing data changes
    const modalOpening = prevModeRef.current === null && mode !== null;

    if (modalOpening || (mode && isEditMode && initialData)) {
      if (isEditMode && initialData) {
        setAmount(initialData.amount.toString());
        setDisplayAmount(initialData.amount.toLocaleString("en-US", { maximumFractionDigits: 2 }));
        setPaymentMethod(initialData.paymentMethod);
        setNotes(initialData.notes);
        setTitle(initialData.title || "");
        setOccurredAt(initialData.occurredAt || "");
        setReceiptImage(initialData.receiptImage || null);
      } else if (modalOpening && !isEditMode) {
        // Only reset for new transactions when modal first opens
        setAmount("");
        setDisplayAmount("");
        setPaymentMethod("cash");
        setNotes("");
        setTitle("");
        setOccurredAt("");
        setReceiptImage(null);
      }
      setReceiptFile(null);
      // setReceiptImage(null); // Removed this line as it was overriding the initialData setter above
      setAmountError("");
      setDragY(0);
      setIsClosing(false);
      setHasAnimated(false);
      // Mark animation as complete after it finishes
      setTimeout(() => setHasAnimated(true), 400);
      // Focus amount input
      setTimeout(() => amountInputRef.current?.focus(), 100);
    }

    prevModeRef.current = mode;
  }, [mode, isEditMode, initialData]);

  // ESC key handler
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mode) handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [mode]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setDragY(0);
      setHasAnimated(false);
      onCloseAction();
    }, 300);
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaY = e.touches[0].clientY - dragStartY.current;
    if (deltaY > 0) {
      // Prevent default pull-to-refresh behavior
      if (e.cancelable) {
        e.preventDefault();
      }
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    if (dragY > 80) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  if (!mode) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/,/g, "");
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
      if (value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          setDisplayAmount(numValue.toLocaleString("en-US", { maximumFractionDigits: 2 }));
        } else {
          setDisplayAmount(value);
        }
      } else {
        setDisplayAmount("");
      }
      setAmountError("");
    }
  };

  const handleSave = () => {
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      setAmountError("الرجاء إدخال مبلغ صحيح أكبر من صفر");
      return;
    }
    setAmountError("");

    onSaveAction({
      amount: numAmount,
      paymentMethod,
      receiptFile,
      notes,
      receiptImage,
      title: title.trim() || undefined,
      occurredAt: occurredAt || undefined,
    });

    // Don't close here - let the parent handle closing after async save completes
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 overflow-hidden ${isClosing ? 'opacity-0' : 'animate-fade-in'}`}
      style={{ opacity: isClosing ? 0 : Math.max(0.4, 1 - dragY / 300) }}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-slate-900 w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl border-0 md:border-2 overflow-hidden transition-colors duration-300 flex flex-col max-h-[90vh] ${mode === 'debit' ? 'md:border-red-300 dark:md:border-red-700' : mode === 'credit' ? 'md:border-primary/30 dark:md:border-green-700' : 'md:border-slate-100 dark:md:border-slate-800'} ${hasAnimated && !isDragging ? 'transition-transform duration-300' : ''} ${isClosing ? 'animate-slide-down md:scale-95 md:opacity-0' : !hasAnimated ? 'animate-slide-up' : ''}`}
        style={{ transform: hasAnimated && dragY > 0 ? `translateY(${dragY}px)` : 'translateY(0)', maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle - swipe area */}
        <div
          className="drag-handle flex justify-center pt-4 pb-2 md:hidden cursor-grab active:cursor-grabbing select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ touchAction: 'none', userSelect: 'none' }}
        >
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full pointer-events-none" />
        </div>

        {/* Modal Header */}
        <div className={`flex items-center justify-between p-4 md:p-6 border-b transition-colors duration-300 ${mode === 'debit' ? 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800' : mode === 'credit' ? 'bg-primary-soft dark:bg-green-950 border-primary/20 dark:border-green-800' : 'border-slate-100 dark:border-slate-800'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${mode === 'debit' ? 'bg-red-500/10 text-red-600' : mode === 'credit' ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}`}>
              <span className="material-symbols-outlined">
                {mode === "debit" ? "remove_circle" : "add_circle"}
              </span>
            </div>
            <div>
              <h2 className={`text-lg md:text-xl font-bold transition-colors duration-300 ${mode === 'debit' ? 'text-red-700 dark:text-red-300' : mode === 'credit' ? 'text-primary dark:text-green-300' : 'text-text-main'}`}>
                {isEditMode
                  ? "تعديل المعاملة"
                  : mode === "debit" ? "إضافة دين جديد" : "تسجيل تحصيل"}
              </h2>
              <p className={`text-xs md:text-sm hidden md:block transition-colors duration-300 ${mode === 'debit' ? 'text-red-600 dark:text-red-400' : mode === 'credit' ? 'text-primary dark:text-green-400' : 'text-text-muted'}`}>
                {mode === "debit" ? "أعطيته - خارج" : "قبضت - داخل"}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            aria-label="إغلاق"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors duration-300 disabled:opacity-50 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <span className="material-symbols-outlined text-lg">close</span>
            <span className="text-sm font-bold hidden md:inline">إغلاق</span>
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 touch-pan-y" style={{ WebkitOverflowScrolling: 'touch', maxHeight: 'calc(90vh - 200px)' }}>
          <div className="p-4 md:p-6 space-y-6 md:space-y-8 w-full">
            {/* Amount Field */}
            <div className="flex flex-col gap-2.5">
              <label className="block text-sm font-semibold text-text-main">
                المبلغ
              </label>
              <div className="relative flex items-center">
                <input
                  ref={amountInputRef}
                  className={`w-full rounded-2xl text-text-main dark:text-white focus:outline-none focus:ring-2 border h-12 px-4 pr-16 text-left text-xl font-bold transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${amountError
                    ? "border-red-500 focus:ring-red-500 bg-red-50 dark:bg-red-950/20"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-primary"
                    }`}
                  dir="ltr"
                  placeholder="0"
                  type="text"
                  inputMode="decimal"
                  value={displayAmount}
                  onChange={handleAmountChange}
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <span className="text-sm font-bold text-text-muted dark:text-text-muted-dark">ج.س</span>
                </div>
              </div>
              {amountError && (
                <p className="text-red-500 text-sm font-medium animate-in slide-in-from-top-1 duration-200" role="alert">{amountError}</p>
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="flex flex-col gap-2.5">
              <label className="block text-sm font-semibold text-text-main">
                طريقة الدفع
              </label>
              <div className={`grid grid-cols-2 gap-2 p-1 rounded-2xl border transition-colors duration-300 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700`}>
                <label className="cursor-pointer">
                  <input
                    checked={paymentMethod === "cash"}
                    className="sr-only peer"
                    name="paymentMethod"
                    type="radio"
                    value="cash"
                    onChange={() => setPaymentMethod("cash")}
                    disabled={isLoading}
                  />
                  <div className={`flex items-center justify-center gap-2 h-12 px-4 rounded-xl font-medium transition-all duration-300 ${paymentMethod === "cash"
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                    : "text-text-muted hover:bg-white/50"
                    }`}>
                    <span className="material-symbols-outlined text-base">
                      payments
                    </span>
                    كاش
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    checked={paymentMethod === "online"}
                    className="sr-only peer"
                    name="paymentMethod"
                    type="radio"
                    value="online"
                    onChange={() => setPaymentMethod("online")}
                    disabled={isLoading}
                  />
                  <div className={`flex items-center justify-center gap-2 h-12 px-4 rounded-xl font-medium transition-all duration-300 ${paymentMethod === "online"
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                    : "text-text-muted hover:bg-white/50"
                    }`}>
                    <span className="material-symbols-outlined text-base">
                      account_balance_wallet
                    </span>
                    أونلاين
                  </div>
                </label>
              </div>
            </div>

            {/* Title Input (optional) */}
            <div className="flex flex-col gap-2.5">
              <label className="block text-sm font-semibold text-text-main">
                عنوان المعاملة (اختياري)
              </label>
              <input
                type="text"
                className="w-full h-12 rounded-2xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 placeholder:text-text-muted text-base transition-all disabled:opacity-50"
                placeholder="مثلاً: دفعة أولى، فاتورة رقم 123..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Date/Time Input (optional) */}
            <div className="flex flex-col gap-2.5">
              <label className="block text-sm font-semibold text-text-main">
                تاريخ ووقت المعاملة (اختياري)
              </label>
              <input
                type="datetime-local"
                className="w-full h-12 rounded-2xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 text-base transition-all disabled:opacity-50"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Notes Textarea */}
            <div className="flex flex-col gap-2.5">
              <label className="block text-sm font-semibold text-text-main">
                ملاحظات (اختياري)
              </label>
              <textarea
                className="w-full rounded-2xl text-text-main dark:text-white focus:outline-none focus:ring-2 focus:ring-primary border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 placeholder:text-text-muted text-base resize-none transition-all disabled:opacity-50"
                placeholder="مثلاً: دفعة مقابل بضاعة السكر..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isLoading}
              />
            </div>

            {/* Image Upload */}
            <div className="flex flex-col gap-2.5">
              <label className="block text-sm font-semibold text-text-main">
                إرفاق صورة الإيصال (اختياري)
              </label>
              {receiptImage ? (
                <div className="relative border-2 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                  <img src={receiptImage} alt="معاينة الإيصال" className="w-full h-32 object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptImage(null);
                      setReceiptFile(null);
                    }}
                    disabled={isLoading}
                    className="absolute top-2 left-2 size-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 hover:rotate-90 transition-all duration-200 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              ) : (
                <label className={`border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-primary transition-all ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isLoading}
                  />
                  <span className="material-symbols-outlined text-2xl text-text-muted dark:text-text-muted-dark">add_a_photo</span>
                  <p className="text-sm text-text-muted dark:text-text-muted-dark">اضغط هنا لإرفاق صورة</p>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Sticky */}
        <div className={`p-4 md:p-6 flex flex-col-reverse md:flex-row items-center justify-between gap-3 border-t transition-colors duration-300 ${mode === 'debit' ? 'bg-red-50/50 dark:bg-red-950/30 border-red-100 dark:border-red-800' : mode === 'credit' ? 'bg-primary-soft/50 dark:bg-green-950/30 border-primary/20 dark:border-green-800' : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800'}`}>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 disabled:opacity-50 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'debit' ? 'bg-red-500 text-white hover:bg-red-600 shadow-red-500/20' : mode === 'credit' ? 'bg-primary text-white hover:bg-green-600 shadow-primary/20' : 'bg-primary text-white hover:bg-green-600 shadow-primary/20'}`}
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                جاري الحفظ...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">check_circle</span>
                {isEditMode ? "حفظ التعديلات" : mode === "debit" ? "حفظ الدين" : "حفظ التحصيل"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
