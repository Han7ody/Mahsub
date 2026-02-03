import React, { useEffect, useState, useRef } from "react";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";
import ReceiptViewer from "@/components/dashboard/ReceiptViewer";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

export interface Transaction {
  id: string;
  type: "in" | "out";
  amount: number;
  currency?: string;
  title: string;
  datetime: string; // ISO or formatted
  paymentMethod: "cash" | "online";
  notes?: string;
  receipt?: {
    url: string;
    filename: string;
    path?: string; // Storage path for download URL generation
  };
}

interface TransactionDetailsModalProps {
  isOpen: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transactionId: string) => void;
}

export default function TransactionDetailsModal({
  isOpen,
  transaction,
  onClose,
  onEdit,
  onDelete,
}: TransactionDetailsModalProps) {
  const [isClosing, setIsClosing] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showReceiptViewer, setShowReceiptViewer] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  
  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);
  
  // Swipe to close state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setDragY(0);
      setHasAnimated(false);
      onClose();
    }, 350);
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
      setDragY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 100) {
      handleClose();
    } else {
      setDragY(0);
    }
  };

  // Reset drag state when modal opens
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsClosing(false);
      setHasAnimated(false);
      // Mark animation as complete after it finishes
      const timer = setTimeout(() => setHasAnimated(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  if (!isOpen || !transaction) return null;

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleEdit = () => {
    onEdit?.(transaction);
    handleClose();
  };

  const typeConfig =
    transaction.type === "in"
      ? {
          label: "قبضت (داخل)",
          bgClass: "bg-primary/10",
          borderClass: "border-primary/20",
          textClass: "text-primary",
          icon: "arrow_downward",
        }
      : {
          label: "أعطيته (خارج)",
          bgClass: "bg-red-500/10",
          borderClass: "border-danger/20",
          textClass: "text-danger",
          icon: "arrow_upward",
        };

  return (
    <>
      {/* Transaction Details Modal */}
      <div
        className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
        style={{ opacity: isClosing ? 0 : Math.max(0.4, 1 - dragY / 300) }}
        onClick={handleClose}
      >
        <div
          className={`bg-white dark:bg-slate-900 w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl border-0 md:border border-slate-100 dark:border-slate-800 overflow-hidden ${hasAnimated && !isDragging ? 'transition-transform duration-300' : ''} ${isClosing ? "animate-slide-down md:scale-95 md:opacity-0" : !hasAnimated ? "animate-slide-up" : ""}`}
          style={{ transform: hasAnimated ? `translateY(${dragY}px)` : undefined, maxHeight: '90vh' }}
          onClick={(e) => e.stopPropagation()}
        >
        {/* Mobile Drag Handle - swipe area */}
        <div 
          className="flex justify-center pt-3 pb-1 md:hidden cursor-grab active:cursor-grabbing touch-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-slate-900 dark:text-white">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-2xl">
                receipt_long
              </span>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-text-main">تفاصيل المعاملة</h2>
              <p className="text-xs md:text-sm text-text-muted hidden md:block">
                عرض تفاصيل المعاملة المالية
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="إغلاق"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
            <span className="text-sm font-bold hidden md:inline">إغلاق</span>
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Amount Section */}
          <div className="flex flex-col items-center py-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">
              المبلغ الإجمالي
            </p>
            <h1 className="text-slate-900 dark:text-white text-4xl font-black mb-4">
              {transaction.amount.toLocaleString("en-US")}{" "}
              <span className="text-lg font-bold opacity-70">
                {transaction.currency || "ج.س"}
              </span>
            </h1>
            <div
              className={`flex h-9 items-center justify-center gap-x-2 rounded-full ${typeConfig.bgClass} border ${typeConfig.borderClass} px-5`}
            >
              <span className={`material-symbols-outlined ${typeConfig.textClass} text-lg`}>
                {typeConfig.icon}
              </span>
              <p className={`${typeConfig.textClass} text-sm font-extrabold`}>{typeConfig.label}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-1">
            <div className="flex items-center justify-between p-4 rounded-xl odd:bg-slate-50 dark:odd:bg-slate-800/30 transition-colors">
              <p className="text-slate-500 dark:text-slate-400 font-medium">التاريخ والوقت</p>
              <p className="text-slate-900 dark:text-white font-bold">{transaction.datetime}</p>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl odd:bg-slate-50 dark:odd:bg-slate-800/30 transition-colors">
              <p className="text-slate-500 dark:text-slate-400 font-medium">طريقة الدفع</p>
              <div className={`px-3 py-1.5 rounded-full font-bold text-sm ${
                transaction.paymentMethod === "cash"
                  ? "bg-slate-100 dark:bg-slate-700 text-text-muted"
                  : "bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
              }`}>
                {transaction.paymentMethod === "cash" ? "كاش" : "أونلاين"}
              </div>
            </div>

            {transaction.notes && (
              <div className="p-4 rounded-xl odd:bg-slate-50 dark:odd:bg-slate-800/30 transition-colors">
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-2">ملاحظات</p>
                <p className="text-slate-900 dark:text-white text-sm font-medium leading-relaxed bg-white/50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  {transaction.notes}
                </p>
              </div>
            )}
          </div>

          {/* Receipt Section */}
          <div>
            <p className="text-slate-500 dark:text-slate-400 font-bold mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">image</span>
              <span>الإيصال</span>
            </p>
            {transaction.receipt ? (
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div
                  className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-700 shadow-sm shrink-0 cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center"
                  style={transaction.receipt.url ? { backgroundImage: `url('${transaction.receipt.url}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
                  onClick={() => setShowReceiptViewer(true)}
                >
                  {!transaction.receipt.url && (
                    <span className="material-symbols-outlined text-3xl text-slate-400">receipt</span>
                  )}
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <p className="text-slate-900 dark:text-white text-xs font-bold truncate">
                    {transaction.receipt.filename}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowReceiptViewer(true)}
                      className="flex-1 flex items-center justify-center gap-1 h-8 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-xs font-bold hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">visibility</span>
                      <span>عرض</span>
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = transaction.receipt!.url;
                        link.download = transaction.receipt!.filename;
                        link.click();
                      }}
                      className="flex-1 flex items-center justify-center gap-1 h-8 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-white text-xs font-bold hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      <span>تحميل</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-20 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">لا يوجد إيصال</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-slate-800/30 flex items-center gap-3 border-t border-slate-100 dark:border-slate-800">
          {onEdit && (
            <button
              onClick={handleEdit}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary text-white text-base font-extrabold hover:brightness-105 active:scale-[0.98] transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
              <span>تعديل</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="flex-1 flex items-center justify-center gap-2 h-12 rounded-2xl bg-red-500 text-white text-base font-extrabold hover:bg-red-600 active:scale-[0.98] transition-all shadow-lg shadow-red-500/30"
            >
              <span className="material-symbols-outlined text-[20px]">delete</span>
              <span>حذف</span>
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Delete Confirmation Modal */}
    <ConfirmationModal
      isOpen={showDeleteConfirm}
      title="هل أنت متأكد من حذف هذه المعاملة؟"
      message="لن تتمكن من استرجاع البيانات بعد الحذف"
      onConfirmAction={() => {
        onDelete?.(transaction.id);
        setShowDeleteConfirm(false);
        handleClose();
      }}
      onCloseAction={() => setShowDeleteConfirm(false)}
    />

    {/* Receipt Viewer */}
    <ReceiptViewer
      isOpen={showReceiptViewer}
      onClose={() => setShowReceiptViewer(false)}
      receiptUrl={transaction.receipt?.url || null}
      receiptPath={transaction.receipt?.path}
    />
  </>
  );
}
