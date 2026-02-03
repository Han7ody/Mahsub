"use client";
// @ts-nocheck - Next.js TS plugin incorrectly flags client component function props

import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface ConfirmationModalProps {
  isOpen: boolean;
  onCloseAction?: () => void;
  onConfirmAction?: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  onCloseAction = () => { },
  onConfirmAction = () => { },
  title,
  message,
  confirmLabel = "تأكيد",
  cancelLabel = "إلغاء",
  isDestructive = false,
}: ConfirmationModalProps) {
  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] p-0 md:p-4"
      onClick={onCloseAction}
    >
      <div
        className="bg-white dark:bg-slate-900 md:rounded-2xl rounded-t-3xl max-w-md w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="p-6">
          {/* Header with close button */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-2">{message}</p>
            </div>
            <button
              onClick={onCloseAction}
              aria-label="إغلاق"
              className="flex items-center gap-1 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0 mr-2"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse md:flex-row gap-3 mt-6">
            <button
              onClick={onCloseAction}
              className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-bold text-slate-700 dark:text-slate-300"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirmAction();
              }}
              className={`flex-1 px-4 py-3 rounded-xl text-white font-bold transition-colors ${isDestructive
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-primary hover:bg-green-600"
                }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
