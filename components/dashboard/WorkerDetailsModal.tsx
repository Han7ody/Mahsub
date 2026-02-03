"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ConfirmationModal from "@/components/dashboard/ConfirmationModal";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { createWorkerBrowser, updateWorkerBrowser, deleteWorkerBrowser, type Worker } from "@/lib/repo/workers";
import { uploadAvatar, getSignedUrl } from "@/lib/storage";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

interface WorkerDetailsModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  mode: "add" | "edit";
  worker?: Worker;
  onWorkerSaved?: (worker: Worker) => void;
  onWorkerDeleted?: (workerId: string) => void;
}

export default function WorkerDetailsModal({
  isOpen,
  onCloseAction,
  mode,
  worker,
  onWorkerSaved,
  onWorkerDeleted,
}: WorkerDetailsModalProps) {
  const { currentBusiness } = useAuth();
  const { showToast } = useToast();
  const [role, setRole] = useState<"مدير" | "موظف" | "محاسب" | "أخرى">("موظف");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarColor, setAvatarColor] = useState("slate");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isLoadingExistingAvatar, setIsLoadingExistingAvatar] = useState(false);
  const [shouldShowInitials, setShouldShowInitials] = useState(true);
  const [originalValues, setOriginalValues] = useState<{name: string; phone: string; role: string; avatarColor: string; permissions: string[]}>({name: "", phone: "", role: "موظف", avatarColor: "slate", permissions: []});
  const [avatarChanged, setAvatarChanged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Swipe to close state
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const dragStartY = useRef(0);

  // Lock body scroll when modal is open
  useBodyScrollLock(isOpen);

  // Load avatar URL when worker changes - ALWAYS call this hook
  useEffect(() => {
    // Reset states
    setAvatarPreview(null);
    setIsLoadingExistingAvatar(false);
    setShouldShowInitials(false); // Start with no initials
    
    if (worker?.avatar_url && USE_BACKEND && currentBusiness) {
      // Worker has avatar - show loading, never initials
      setIsLoadingExistingAvatar(true);
      
      getSignedUrl('avatars', worker.avatar_url)
        .then(({ signedUrl }) => {
          if (signedUrl) {
            // Preload the image to avoid flash
            const img = new Image();
            img.onload = () => {
              setAvatarPreview(signedUrl);
              setIsLoadingExistingAvatar(false);
            };
            img.onerror = () => {
              setIsLoadingExistingAvatar(false);
              setShouldShowInitials(true); // Only show initials on error
            };
            img.src = signedUrl;
          } else {
            setIsLoadingExistingAvatar(false);
            setShouldShowInitials(true); // Show initials if no signed URL
          }
        })
        .catch(() => {
          setIsLoadingExistingAvatar(false);
          setShouldShowInitials(true); // Show initials on error
        });
    } else {
      // No avatar - show initials after a brief delay to prevent flash
      setTimeout(() => {
        setShouldShowInitials(true);
      }, 100);
    }
  }, [worker?.avatar_url, currentBusiness, worker?.id]);

  // Clear form immediately when modal opens to prevent showing old data
  useEffect(() => {
    if (isOpen) {
      setRole("موظف");
      setName("");
      setPhone("");
      setAvatarColor("slate");
      setPermissions([]);
      setAvatarPreview(null);
      setPhoneError("");
      setIsLoadingExistingAvatar(false);
      setShouldShowInitials(false); // Don't show initials initially
      setDragY(0);
      setIsClosing(false);
      setHasAnimated(false);
      // Mark animation as complete after it finishes
      const timer = setTimeout(() => setHasAnimated(true), 500);
      
      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
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

  // Populate form with worker data after clearing
  useEffect(() => {
    if (isOpen && worker) {
      setRole(worker.role || "موظف");
      setName(worker.name || "");
      setPhone(worker.phone || "");
      setAvatarColor(worker.avatar_color || "slate");
      const workerPermissions = worker.permissions ? Object.keys(worker.permissions).filter(key => worker.permissions[key]) : [];
      setPermissions(workerPermissions);
      setAvatarChanged(false);
      
      // Store original values for comparison
      setOriginalValues({
        name: worker.name || "",
        phone: worker.phone || "",
        role: worker.role || "موظف",
        avatarColor: worker.avatar_color || "slate",
        permissions: workerPermissions
      });
      
      // Only show initials if worker has no avatar
      if (!worker.avatar_url) {
        setShouldShowInitials(true);
      }
    } else if (isOpen && !worker) {
      setAvatarChanged(false);
      // Add mode - show initials after a brief delay to prevent flash
      setTimeout(() => {
        setShouldShowInitials(true);
      }, 50);
    }
  }, [worker, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    // Reset errors
    setPhoneError("");

    // Validation
    if (!name.trim()) {
      showToast("يرجى إدخال اسم العامل", "error");
      return;
    }

    if (!phone.trim()) {
      setPhoneError("رقم الهاتف مطلوب");
      return;
    }

    // Basic phone validation (numbers, spaces, +, -, () allowed)
    const phoneRegex = /^[\d\s+\-()]+$/;
    if (!phoneRegex.test(phone.trim())) {
      setPhoneError("رقم الهاتف غير صحيح");
      return;
    }

    // Permissions validation - at least one permission must be selected
    if (permissions.length === 0) {
      showToast("يجب اختيار صلاحية واحدة على الأقل", "error");
      return;
    }

    if (!currentBusiness) {
      showToast("خطأ في تحديد الشركة", "error");
      return;
    }

    setIsSaving(true);

    try {
      // Convert permissions array to object
      const permissionsObj = permissions.reduce((acc, perm) => {
        acc[perm] = true;
        return acc;
      }, {} as Record<string, boolean>);

      if (USE_BACKEND) {
        if (mode === "add") {
          const { worker: newWorker, error } = await createWorkerBrowser({
            business_id: currentBusiness.id,
            name: name.trim(),
            role,
            phone: phone.trim(),
            avatar_color: avatarColor,
            permissions: permissionsObj,
          });

          if (error) {
            console.error("Error creating worker:", error);
            // Handle phone uniqueness error
            if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
              setPhoneError("رقم الهاتف مستخدم بالفعل");
              return;
            }
            showToast("فشل في إضافة العامل", "error");
            return;
          }

          if (newWorker && onWorkerSaved) {
            onWorkerSaved(newWorker);
          }
          
          // If we have an avatar preview but no worker ID yet (new worker), upload it now
          if (avatarPreview && !worker && newWorker && fileInputRef.current?.files?.[0]) {
            const file = fileInputRef.current.files[0];
            try {
              const { path, error: uploadError } = await uploadAvatar(
                file,
                currentBusiness.id,
                'worker',
                newWorker.id
              );
              if (!uploadError && path) {
                newWorker.avatar_url = path;
                if (onWorkerSaved) {
                  onWorkerSaved(newWorker);
                }
              }
            } catch (error) {
              console.error('Error uploading avatar for new worker:', error);
            }
          }
          
          showToast("تم إضافة العامل بنجاح", "success");
        } else if (worker) {
          // Check what changed in edit mode
          const nameChanged = name.trim() !== originalValues.name;
          const roleChanged = role !== originalValues.role;
          const phoneChanged = phone.trim() !== originalValues.phone;
          const avatarColorChanged = avatarColor !== originalValues.avatarColor;
          const permissionsChanged = JSON.stringify(permissions.sort()) !== JSON.stringify(originalValues.permissions.sort());
          
          const hasChanges = nameChanged || roleChanged || phoneChanged || avatarColorChanged || permissionsChanged || avatarChanged;
          
          // If nothing changed, just close
          if (!hasChanges) {
            handleClose();
            return;
          }
          
          // Build update payload with only changed fields
          const updatePayload: any = {};
          if (nameChanged) updatePayload.name = name.trim();
          if (roleChanged) updatePayload.role = role;
          if (phoneChanged) updatePayload.phone = phone.trim();
          if (avatarColorChanged) updatePayload.avatar_color = avatarColor;
          if (permissionsChanged) {
            updatePayload.permissions = permissions.reduce((acc, perm) => {
              acc[perm] = true;
              return acc;
            }, {} as Record<string, boolean>);
          }
          
          const { worker: updatedWorker, error } = await updateWorkerBrowser(
            worker.id,
            currentBusiness.id,
            updatePayload
          );

          if (error) {
            console.error("Error updating worker:", error);
            // Handle phone uniqueness error
            if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
              setPhoneError("رقم الهاتف مستخدم بالفعل");
              return;
            }
            showToast("فشل في تحديث العامل", "error");
            return;
          }

          if (updatedWorker && onWorkerSaved) {
            onWorkerSaved(updatedWorker);
          }
          showToast("تم تحديث العامل بنجاح", "success");
        }
      } else {
        // Demo mode - just show success message
        showToast(
          mode === "add" ? "تم إضافة العامل بنجاح" : "تم تحديث العامل بنجاح",
          "success"
        );
      }

      handleClose();
    } catch (error) {
      console.error("Error saving worker:", error);
      showToast("حدث خطأ أثناء الحفظ", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!worker || !currentBusiness) return;

    setIsSaving(true);

    try {
      if (USE_BACKEND) {
        const { error } = await deleteWorkerBrowser(worker.id, currentBusiness.id);

        if (error) {
          console.error("Error deleting worker:", error);
          showToast("فشل في حذف العامل", "error");
          return;
        }

        if (onWorkerDeleted) {
          onWorkerDeleted(worker.id);
        }
        showToast("تم حذف العامل بنجاح", "success");
      } else {
        // Demo mode - just show success message
        showToast("تم حذف العامل بنجاح", "success");
      }

      setShowDeleteConfirm(false);
      handleClose();
    } catch (error) {
      console.error("Error deleting worker:", error);
      showToast("حدث خطأ أثناء الحذف", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join(' ').substring(0, 3);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Enhanced security validation
    const securityCheck = validateImageFile(file);
    if (!securityCheck.isValid) {
      showToast(securityCheck.error || "ملف غير صالح", "error");
      // Clear the input to prevent resubmission
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Show preview immediately (after validation)
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to backend if we have a worker ID (edit mode)
    if (USE_BACKEND && worker && currentBusiness) {
      setIsUploadingAvatar(true);
      try {
        const { path, error } = await uploadAvatar(
          file,
          currentBusiness.id,
          'worker',
          worker.id
        );

        if (error) {
          console.error('Error uploading avatar:', error);
          showToast("فشل في رفع الصورة", "error");
          setAvatarPreview(null);
          return;
        }

        // Update local state
        if (worker) {
          worker.avatar_url = path;
        }
        
        setAvatarChanged(true);
        showToast("تم رفع الصورة بنجاح", "success");
      } catch (error) {
        console.error('Error uploading avatar:', error);
        showToast("فشل في رفع الصورة", "error");
        setAvatarPreview(null);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  // Enhanced file validation function
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

    // 2. File extension validation (double-check)
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

    // 4. Minimum file size (prevent empty files)
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      return { 
        isValid: false, 
        error: "حجم الملف صغير جداً" 
      };
    }

    // 5. File name validation (prevent malicious names)
    const dangerousPatterns = [
      /\.\./,           // Directory traversal
      /[<>:"|?*]/,      // Invalid filename characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
      /\.(exe|bat|cmd|scr|pif|com|dll|vbs|js|jar|php|asp|jsp)$/i // Executable extensions
    ];

    if (dangerousPatterns.some(pattern => pattern.test(file.name))) {
      return { 
        isValid: false, 
        error: "اسم الملف غير صالح" 
      };
    }

    // 6. File name length validation
    if (file.name.length > 255) {
      return { 
        isValid: false, 
        error: "اسم الملف طويل جداً" 
      };
    }

    return { isValid: true };
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm ${isClosing ? "animate-fade-out" : "animate-fade-in"}`}
      style={{ opacity: isClosing ? 0 : Math.max(0.4, 1 - dragY / 300) }}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-slate-900 w-full md:max-w-2xl md:rounded-3xl rounded-t-3xl shadow-2xl border-0 md:border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col ${hasAnimated && !isDragging ? 'transition-transform duration-300' : ''} ${isClosing ? "animate-slide-down md:scale-95 md:opacity-0" : !hasAnimated ? "animate-slide-up" : ""}`}
        style={{ transform: hasAnimated ? `translateY(${dragY}px)` : undefined, maxHeight: '90vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Handle - swipe area */}
        <div 
          className="flex justify-center pt-4 pb-2 md:hidden cursor-grab active:cursor-grabbing shrink-0"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">person_add_alt</span>
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-bold text-text-main">
                {mode === "add" ? "إضافة عامل جديد" : "تعديل بيانات العامل"}
              </h2>
              <p className="text-xs md:text-sm text-text-muted hidden md:block">
                {mode === "add"
                  ? "إضافة موظف جديد للنظام"
                  : "تحديث المعلومات والصلاحيات الممنوحة"}
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
        <div className="p-4 md:p-5 space-y-4 md:space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div 
              className="relative w-24 h-24 md:w-28 md:h-28 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-md flex items-center justify-center text-slate-400 text-3xl font-bold overflow-hidden cursor-pointer transition hover:shadow-lg"
              onClick={handleImageClick}
              role="button"
              aria-label="تغيير الصورة"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleImageClick(); }}
            >
              {avatarPreview ? (
                <img 
                  src={avatarPreview} 
                  alt="Worker avatar" 
                  className="w-full h-full object-cover opacity-0 animate-fadeIn"
                  style={{ animation: 'fadeIn 0.3s ease-in-out forwards' }}
                />
              ) : (isUploadingAvatar || isLoadingExistingAvatar) ? (
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : shouldShowInitials ? (
                <span>{name ? getInitials(name) : "ع ج"}</span>
              ) : (
                <div className="flex items-center justify-center">
                  <div className="w-12 h-12 border-4 border-slate-300 border-t-transparent rounded-full animate-spin opacity-50"></div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                className="hidden"
                multiple={false}
              />
            </div>
            <button 
              type="button"
              onClick={handleImageClick}
              disabled={isUploadingAvatar || isLoadingExistingAvatar}
              className="mt-2 text-xs font-semibold text-primary hover:text-green-600 transition-colors disabled:opacity-50"
            >
              {isUploadingAvatar ? "جاري الرفع..." : isLoadingExistingAvatar ? "جاري التحميل..." : "تغيير الصورة"}
            </button>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-main">
                الاسم بالكامل
              </label>
              <input
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-main dark:text-white"
                placeholder="مثلاً: محمد علي حسن"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-text-main">
                رقم الهاتف <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full bg-slate-50 dark:bg-slate-800/50 border ${phoneError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-text-main dark:text-white text-left`}
                dir="ltr"
                placeholder="09xxxxxxx"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError("");
                }}
                required
              />
              {phoneError && (
                <p className="text-red-500 text-sm font-medium">{phoneError}</p>
              )}
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-text-main">
              الدور الوظيفي
            </label>
            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
              <label className="cursor-pointer">
                <input
                  checked={role === "مدير"}
                  className="sr-only peer"
                  name="role"
                  type="radio"
                  value="مدير"
                  onChange={() => setRole("مدير")}
                />
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-text-muted peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-primary peer-checked:shadow-sm font-medium transition-all">
                  <span className="material-symbols-outlined text-lg">
                    admin_panel_settings
                  </span>
                  مدير
                </div>
              </label>
              <label className="cursor-pointer">
                <input
                  checked={role === "موظف"}
                  className="sr-only peer"
                  name="role"
                  type="radio"
                  value="موظف"
                  onChange={() => setRole("موظف")}
                />
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-text-muted peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-primary peer-checked:shadow-sm font-medium transition-all">
                  <span className="material-symbols-outlined text-lg">
                    badge
                  </span>
                  موظف
                </div>
              </label>
              <label className="cursor-pointer">
                <input
                  checked={role === "محاسب"}
                  className="sr-only peer"
                  name="role"
                  type="radio"
                  value="محاسب"
                  onChange={() => setRole("محاسب")}
                />
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-text-muted peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-primary peer-checked:shadow-sm font-medium transition-all">
                  <span className="material-symbols-outlined text-lg">
                    calculate
                  </span>
                  محاسب
                </div>
              </label>
              <label className="cursor-pointer">
                <input
                  checked={role === "أخرى"}
                  className="sr-only peer"
                  name="role"
                  type="radio"
                  value="أخرى"
                  onChange={() => setRole("أخرى")}
                />
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-text-muted peer-checked:bg-white dark:peer-checked:bg-slate-700 peer-checked:text-primary peer-checked:shadow-sm font-medium transition-all">
                  <span className="material-symbols-outlined text-lg">
                    more_horiz
                  </span>
                  أخرى
                </div>
              </label>
            </div>
          </div>

          {/* Permissions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400 text-base">
                  lock_open
                </span>
                الصلاحيات المتاحة
                <span className="text-red-500">*</span>
              </h3>
              <button 
                type="button"
                onClick={() => {
                  const allPermissions = [
                    "عرض العملاء",
                    "إضافة معاملة", 
                    "تعديل معاملة",
                    "حذف معاملة",
                    "عرض الموردين",
                    "الوصول للدفتر الكامل"
                  ];
                  setPermissions(permissions.length === allPermissions.length ? [] : allPermissions);
                }}
                className="text-xs text-primary font-bold hover:text-green-600 transition-colors"
              >
                {permissions.length === 6 ? "إلغاء الكل" : "تحديد الكل"}
              </button>
            </div>
            {permissions.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-600 text-lg">info</span>
                <p className="text-amber-700 text-sm font-medium">
                  يجب اختيار صلاحية واحدة على الأقل للعامل
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {[
                "عرض العملاء",
                "إضافة معاملة",
                "تعديل معاملة",
                "حذف معاملة",
                "عرض الموردين",
                "الوصول للدفتر الكامل",
              ].map((permission, idx) => (
                <label
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                >
                  <span
                    className={`text-sm font-medium ${
                      permission === "حذف معاملة"
                        ? "text-red-500"
                        : "text-text-muted"
                    }`}
                  >
                    {permission}
                  </span>
                  <input
                    className="w-5 h-5 rounded text-primary border-slate-300 focus:ring-primary cursor-pointer"
                    type="checkbox"
                    checked={permissions.includes(permission)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPermissions([...permissions, permission]);
                      } else {
                        setPermissions(permissions.filter(p => p !== permission));
                      }
                    }}
                  />
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* Footer - Sticky */}
        <div className="p-4 md:p-6 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className={`flex items-center gap-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-xl font-bold transition-colors w-full md:w-auto justify-center md:justify-start ${
              mode === "add" ? "hidden md:invisible md:flex" : ""
            }`}
            disabled={isSaving}
          >
            <span className="material-symbols-outlined text-lg">
              delete_outline
            </span>
            {mode === "edit" ? "حذف العامل" : ""}
          </button>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleClose}
              className="flex-1 md:flex-none px-6 py-2.5 font-bold text-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
              disabled={isSaving}
            >
              إلغاء
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 md:flex-none px-8 py-2.5 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:bg-green-600 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <span>{mode === "add" ? "إضافة العامل" : "حفظ التعديلات"}</span>
              )}
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          isOpen={showDeleteConfirm}
          title="هل أنت متأكد من حذف هذا العامل؟"
          message="لن تتمكن من استرجاع البيانات بعد الحذف"
          onConfirmAction={handleDelete}
          onCloseAction={() => setShowDeleteConfirm(false)}
        />
      </div>
    </div>
  );
}
