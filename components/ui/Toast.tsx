"use client";
// @ts-nocheck - Next.js TS plugin incorrectly flags client component function props

import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ 
  message, 
  type = "success", 
  duration = 3000, 
  onClose 
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const iconMap = {
    success: "check_circle",
    error: "error",
    info: "info",
  };

  const colorMap = {
    success: "bg-primary/10 border-primary/20 text-primary",
    error: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400",
    info: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400",
  };

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 
        flex items-center gap-3 px-6 py-3 rounded-xl border
        ${colorMap[type]}
        shadow-lg backdrop-blur-sm
        animate-in slide-in-from-top-5 duration-300
        max-w-md w-full mx-4
      `}
      role="alert"
    >
      <span className="material-symbols-outlined text-xl flex-shrink-0">
        {iconMap[type]}
      </span>
      <p className="text-sm font-medium flex-1">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="إغلاق"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  );
}
