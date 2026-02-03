"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entity: {
    id: string | number;
    name: string;
    phone?: string;
    notes?: string;
    avatar_url?: string | null;
    initials: string;
  };
  entityType: "customer" | "supplier";
  isSaving: boolean;
  onSave: (data: { name: string; phone: string; notes: string }) => Promise<void>;
  onDelete: () => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  isUploadingAvatar: boolean;
  editImageUrl: string | null;
}

export default function ProfileEditModal({
  isOpen,
  onClose,
  entity,
  entityType,
  isSaving,
  onSave,
  onDelete,
  uploadAvatar,
  isUploadingAvatar,
  editImageUrl,
}: ProfileEditModalProps) {
  const [editName, setEditName] = useState(entity.name);
  const [editPhone, setEditPhone] = useState(entity.phone || "");
  const [editNotes, setEditNotes] = useState(entity.notes || "");
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editFormError, setEditFormError] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setEditName(entity.name);
      setEditPhone(entity.phone || "");
      setEditNotes(entity.notes || "");
      setEditImagePreview(null);
      setEditFormError("");
      setIsClosing(false);
    }
  }, [isOpen, entity]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 350);
  }, [onClose]);

  const handleSave = async () => {
    setEditFormError("");
    const nameStr = editName.trim();
    if (!nameStr) {
      setEditFormError(entityType === "customer" ? "اسم العميل مطلوب" : "اسم المورد مطلوب");
      return;
    }

    // Phone validation
    const phoneStr = editPhone.trim();
    if (phoneStr && !/^[\d\s+\-()]*$/.test(phoneStr)) {
        setEditFormError("رقم الهاتف غير صحيح");
        return;
    }

    try {
        await onSave({ name: nameStr, phone: phoneStr, notes: editNotes.trim() });
        handleClose();
    } catch (err) {
        setEditFormError("حدث خطأ أثناء حفظ التغييرات");
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optional: add validation here (size, type)
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
        await uploadAvatar(file);
    } catch (err) {
        setEditImagePreview(null);
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
        style={{ opacity: isClosing ? 0 : 1 }}
        onClick={handleClose}
      >
        <div
          className={`bg-white dark:bg-slate-900 w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl border-0 md:border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col ${isClosing ? "animate-slide-down md:scale-95 md:opacity-0" : "animate-slide-up"}`}
          style={{ maxHeight: "90vh" }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Drag Handle */}
          <div className="flex justify-center pt-4 pb-2 md:hidden shrink-0">
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">
                  {entityType === "customer" ? "person" : "store"}
                </span>
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-bold text-text-main">
                  {entityType === "customer" ? "تعديل بيانات العميل" : "تعديل الملف الشخصي"}
                </h2>
                <p className="text-xs md:text-sm text-text-muted">
                  {entityType === "customer" ? "تحديث الاسم ورقم الهاتف والصورة" : "تحديث معلومات المورد"}
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

          {/* Content - Scrollable */}
          <div className="p-4 md:p-6 space-y-6 md:space-y-8 overflow-y-auto flex-1 min-h-0">
            {/* Avatar Section - Centered (Modern Style) */}
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center text-slate-400 text-4xl font-bold overflow-hidden transition-all duration-300 relative group">
                  {isUploadingAvatar ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : editImagePreview ? (
                    <img
                      src={editImagePreview}
                      alt="Avatar preview"
                      className="w-full h-full object-cover"
                    />
                  ) : editImageUrl ? (
                    <img
                      src={editImageUrl}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary">{entity.initials}</span>
                  )}
                  
                  {/* Hover overlay for desktop */}
                  {!isUploadingAvatar && (
                    <div 
                        className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                    </div>
                  )}
                </div>
                
                {/* Camera Overlay Button (Mobile Friendly) */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-1 right-1 w-10 h-10 bg-primary text-white rounded-full border-4 border-white dark:border-slate-900 shadow-lg flex items-center justify-center hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10"
                >
                  <span className="material-symbols-outlined text-xl">photo_camera</span>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 text-sm font-semibold text-primary hover:text-green-600 transition-colors"
              >
                تغيير الصورة
              </button>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-main">
                  {entityType === "customer" ? "اسم العميل" : "اسم المورد"} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-xl">
                    {entityType === "customer" ? "badge" : "store"}
                  </span>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-main dark:text-white"
                    placeholder={entityType === "customer" ? "مثال: محمد أحمد" : "أدخل اسم المورد بالكامل"}
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text-main">رقم الهاتف</label>
                <div className="relative">
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-xl">phone_android</span>
                  <input
                    type="tel"
                    dir="ltr"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-right text-text-main dark:text-white"
                    placeholder="0XXXXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* Notes Field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-main">ملاحظات (اختياري)</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-main dark:text-white resize-none"
                rows={3}
                placeholder={entityType === "customer" ? "ملاحظات داخلية عن العميل..." : "أي ملاحظات إضافية حول المورد..."}
              />
            </div>

            {editFormError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl animate-shake">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">error</span>
                <p className="text-red-600 dark:text-red-400 text-sm font-bold">{editFormError}</p>
              </div>
            )}

            {/* Delete Section */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-all active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
                {entityType === "customer" ? "حذف العميل نهائياً" : "حذف المورد نهائياً"}
              </button>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 md:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex flex-col-reverse md:flex-row-reverse gap-3 shrink-0">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-primary hover:bg-green-600 disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {isSaving ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check</span>
                  <span>حفظ التغييرات</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={entityType === "customer" ? "حذف العميل" : "حذف المورد"}
        message={
            entityType === "customer" 
            ? "تحذير: سيتم حذف العميل وكافة سجلاته المالية (الديون والمدفوعات) نهائياً. هذا الإجراء لا يمكن التراجع عنه."
            : "تحذير: سيتم حذف المورد وكافة سجلاته المالية نهائياً. هذا الإجراء لا يمكن التراجع عنه."
        }
        confirmLabel={isDeleting ? "جاري الحذف..." : "حذف"}
        isDestructive
        onCloseAction={() => { if (!isDeleting) setShowDeleteConfirm(false); }}
        onConfirmAction={async () => {
          setIsDeleting(true);
          try {
            await onDelete();
          } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
          }
        }}
      />
    </>
  );
}
