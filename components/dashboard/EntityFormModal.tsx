"use client";
// @ts-nocheck - Next.js TS plugin incorrectly flags client component function props

import { useState, useRef, useEffect, useCallback } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

export interface CreateEntityPayload {
  name: string;
  phone: string;
  openingBalance: number;
  openingBalanceDirection: "in" | "out";
  profileImageFile?: File | null;
}

interface EntityFormModalProps {
  isOpen: boolean;
  onCloseAction?: () => void;
  onSubmitAction?: (payload: CreateEntityPayload) => void;
  entityType: "customer" | "supplier";
}

export default function EntityFormModal({
  isOpen,
  onCloseAction = () => {},
  onSubmitAction = () => {},
  entityType,
}: EntityFormModalProps) {
  const [formData, setFormData] = useState<CreateEntityPayload>({
    name: "",
    phone: "",
    openingBalance: 0,
    openingBalanceDirection: "in",
    profileImageFile: null,
  });
  const [displayBalance, setDisplayBalance] = useState("");
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Swipe to close state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const dragStartY = useRef(0);

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Reset form and animation state when modal opens
  useEffect(() => {
    if (isOpen) {
      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
      setFormData({ name: "", phone: "", openingBalance: 0, openingBalanceDirection: "in", profileImageFile: null });
      setDisplayBalance("");
      setProfileImagePreview(null);
      setDragY(0);
      setIsClosing(false);
      setHasAnimated(false);
      // Mark animation as complete after it finishes
      const timer = setTimeout(() => setHasAnimated(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Animated close handler
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      setDragY(0);
      setHasAnimated(false);
      onCloseAction();
    }, 350);
  }, [onCloseAction]);

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitAction({ ...formData, profileImageFile: formData.profileImageFile || null });
    setFormData({ name: "", phone: "", openingBalance: 0, openingBalanceDirection: "in", profileImageFile: null });
    if (profileImagePreview) {
      URL.revokeObjectURL(profileImagePreview);
    }
    setProfileImagePreview(null);
  };

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (profileImagePreview) {
        URL.revokeObjectURL(profileImagePreview);
      }
      setProfileImagePreview(URL.createObjectURL(file));
      setFormData((prev) => ({ ...prev, profileImageFile: file }));
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join(' ').substring(0, 3);
  };

  const entityLabel = entityType === "customer" ? "عميل" : "مورد";
  const entityIcon = entityType === "customer" ? "person_add" : "store";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
      style={{ opacity: isClosing ? 0 : Math.max(0.4, 1 - dragY / 300) }}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-slate-900 w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl border-0 md:border border-slate-100 dark:border-slate-800 overflow-hidden ${hasAnimated && !isDragging ? 'transition-transform duration-300' : ''} ${isClosing ? "animate-slide-down md:scale-95 md:opacity-0" : !hasAnimated ? "animate-slide-up" : ""}`}
        style={{ transform: hasAnimated ? `translateY(${dragY}px)` : undefined, maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle - swipe area */}
        <div 
          className="flex justify-center pt-4 pb-2 md:hidden cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className={`flex items-center justify-between p-4 md:p-6 border-b transition-colors duration-300 ${
          formData.openingBalanceDirection === "out"
            ? "border-red-100 dark:border-red-900/30"
            : "border-slate-100 dark:border-slate-800"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${
              formData.openingBalanceDirection === "out"
                ? "bg-red-100 text-red-600"
                : "bg-primary/10 text-primary"
            }`}>
              <span className="material-symbols-outlined">{entityIcon}</span>
            </div>
            <div>
              <h2 className={`text-lg md:text-xl font-bold transition-colors duration-300 ${
                formData.openingBalanceDirection === "out"
                  ? "text-red-700"
                  : "text-text-main"
              }`}>
                إضافة {entityLabel} جديد
              </h2>
              <p className={`text-xs md:text-sm hidden md:block transition-colors duration-300 ${
                formData.openingBalanceDirection === "out"
                  ? "text-red-500"
                  : "text-text-muted"
              }`}>
                إضافة {entityLabel} جديد للنظام
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            aria-label="إغلاق"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-colors duration-300 ${
              formData.openingBalanceDirection === "out"
                ? "bg-red-100 text-red-600 hover:bg-red-200"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            <span className="material-symbols-outlined text-lg">close</span>
            <span className="text-sm font-bold hidden md:inline">إغلاق</span>
          </button>
        </div>

        {/* Content - Scrollable */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 md:p-6 space-y-6 md:space-y-8 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 180px)' }}>
            {/* Avatar Section */}
            <div className="flex flex-col items-center">
              <div className="relative group">
                <div className={`w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center text-slate-400 text-4xl font-bold overflow-hidden cursor-pointer transition-all duration-200 ${
                  profileImagePreview ? 'border-primary' : 'group-hover:border-primary/50'
                }`}>
                  {profileImagePreview ? (
                    <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span>{formData.name ? getInitials(formData.name) : entityType === "customer" ? "ع ج" : "م ج"}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100"
                >
                  <span className="material-symbols-outlined text-white text-4xl">camera_alt</span>
                </button>
                {profileImagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (profileImagePreview) {
                        URL.revokeObjectURL(profileImagePreview);
                      }
                      setProfileImagePreview(null);
                      setFormData((prev) => ({ ...prev, profileImageFile: null }));
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="absolute -top-2 -right-2 size-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg transition-all"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleProfileImageUpload}
              />
              <p className="text-xs text-text-muted mt-3">اضغط على الصورة لتغييرها</p>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-main">
                  الاسم بالكامل
                </label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-main dark:text-white"
                  placeholder={`مثلاً: ${entityType === "customer" ? "أحمد محمد" : "شركة النور"}`}
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-main">
                  رقم الهاتف
                </label>
                <input
                  className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-main dark:text-white text-left"
                  dir="ltr"
                  placeholder="09xxxxxxx"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Opening Balance */}
            <div className="space-y-2">
              <label className={`block text-sm font-semibold transition-colors duration-300 ${
                formData.openingBalanceDirection === "out"
                  ? "text-red-700"
                  : "text-text-main"
              }`}>
                الرصيد الافتتاحي
              </label>
              <div className="relative flex items-center">
                <input
                  className={`w-full rounded-md focus:outline-none focus:ring-2 border h-14 px-4 pr-16 text-left text-2xl font-black transition-all duration-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                    formData.openingBalanceDirection === "out"
                      ? "text-red-700 border-red-200 bg-red-50 focus:ring-red-500"
                      : "text-text-main dark:text-white border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50 focus:ring-primary"
                  }`}
                  dir="ltr"
                  placeholder="0"
                  type="text"
                  inputMode="decimal"
                  value={displayBalance}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, "");
                    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
                      const numValue = value === "" ? 0 : parseFloat(value);
                      setFormData({ ...formData, openingBalance: numValue });
                      if (value) {
                        const formatted = parseFloat(value).toLocaleString("en-US", { maximumFractionDigits: 2 });
                        setDisplayBalance(formatted);
                      } else {
                        setDisplayBalance("");
                      }
                    }
                  }}
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                  <span className={`text-base font-bold transition-colors duration-300 ${
                    formData.openingBalanceDirection === "out"
                      ? "text-red-600"
                      : "text-text-muted"
                  }`}>ج.س</span>
                </div>
              </div>
            </div>

            {/* Direction Selection */}
            <div className="space-y-3">
              <label className={`block text-sm font-semibold transition-colors duration-300 ${
                formData.openingBalanceDirection === "out"
                  ? "text-red-700"
                  : "text-text-main"
              }`}>
                الاتجاه
              </label>
              <div className={`grid grid-cols-2 gap-3 p-1 rounded-2xl border transition-colors duration-300 ${
                formData.openingBalanceDirection === "out"
                  ? "bg-red-50 border-red-200"
                  : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
              }`}>
                <label className="cursor-pointer">
                  <input
                    checked={formData.openingBalanceDirection === "in"}
                    className="sr-only peer"
                    name="direction"
                    type="radio"
                    value="in"
                    onChange={() => setFormData({ ...formData, openingBalanceDirection: "in" })}
                  />
                  <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    formData.openingBalanceDirection === "in"
                      ? "bg-white dark:bg-slate-700 text-primary shadow-sm scale-105"
                      : "text-text-muted hover:bg-white/50"
                  }`}>
                    <span className={`material-symbols-outlined text-lg transition-colors duration-300 ${
                      formData.openingBalanceDirection === "in" ? "text-primary" : ""
                    }`}>
                      arrow_downward
                    </span>
                    مدين
                  </div>
                </label>
                <label className="cursor-pointer">
                  <input
                    checked={formData.openingBalanceDirection === "out"}
                    className="sr-only peer"
                    name="direction"
                    type="radio"
                    value="out"
                    onChange={() => setFormData({ ...formData, openingBalanceDirection: "out" })}
                  />
                  <div className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                    formData.openingBalanceDirection === "out"
                      ? "bg-white text-red-600 shadow-sm scale-105"
                      : "text-text-muted hover:bg-white/50"
                  }`}>
                    <span className={`material-symbols-outlined text-lg transition-colors duration-300 ${
                      formData.openingBalanceDirection === "out" ? "text-red-600" : ""
                    }`}>
                      arrow_upward
                    </span>
                    دائن
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer - Sticky */}
          <div className={`p-4 md:p-6 flex flex-col-reverse md:flex-row items-center justify-between gap-3 border-t transition-colors duration-300 ${
            formData.openingBalanceDirection === "out"
              ? "bg-red-50/50 border-red-100"
              : "bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800"
          }`}>
            <button
              type="button"
              onClick={handleClose}
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                formData.openingBalanceDirection === "out"
                  ? "bg-red-100 text-red-600 hover:bg-red-200"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg ${
                formData.openingBalanceDirection === "out"
                  ? "bg-red-500 text-white hover:bg-red-600 shadow-red-500/20"
                  : "bg-primary text-white hover:bg-green-600 shadow-primary/20"
              }`}
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              إضافة {entityLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
