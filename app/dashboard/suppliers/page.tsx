"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import MobileProfileSlideOver from "@/components/dashboard/MobileProfileSlideOver";
import EntityFormModal, { type CreateEntityPayload } from "@/components/dashboard/EntityFormModal";
import EmptyState from "@/components/dashboard/EmptyState";
import EntityRowSkeleton from "@/components/skeletons/EntityRowSkeleton";
import CollapsibleHeader from "@/components/common/CollapsibleHeader";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { listSuppliersBrowser, createSupplier, type Supplier } from "@/lib/repo/suppliers";
import { createTransaction } from "@/lib/repo/transactions";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useEmptyState } from "@/hooks/useEmptyState";
import { useLoadMorePagination } from "@/hooks/useLoadMorePagination";
import { formatCurrencySDG } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

// Animated number helper
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

// Supplier Avatar
const SupplierAvatar = React.memo(({ supplier, avatarUrl }: { supplier: any; avatarUrl?: string | null }) => {
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  useEffect(() => {
    if (avatarUrl) {
      setIsImageLoading(true);
      setImageLoadError(false);
      const img = new Image();
      img.onload = () => setIsImageLoading(false);
      img.onerror = () => {
        setImageLoadError(true);
        setIsImageLoading(false);
      };
      img.src = avatarUrl;
    } else {
      setIsImageLoading(false);
      setImageLoadError(false);
    }
  }, [avatarUrl]);

  const showImage = avatarUrl && !isImageLoading && !imageLoadError;
  const showLoading = isImageLoading && !imageLoadError;
  const showInitials = !showImage && !showLoading;

  return (
    <div className="size-12 rounded-full overflow-hidden shrink-0 border border-slate-100 dark:border-slate-700 relative">
      {showImage ? (
        <img
          src={avatarUrl || ""}
          alt={supplier.name}
          className="w-full h-full object-cover"
        />
      ) : showLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : showInitials ? (
        <div
          className={`w-full h-full flex items-center justify-center font-bold text-lg ${supplier.status === "clear"
            ? "bg-slate-100 text-slate-900 dark:bg-slate-700/50 dark:text-white"
            : "bg-slate-100 text-slate-500"
            }`}
        >
          {supplier.initials}
        </div>
      ) : null}
    </div>
  );
});
SupplierAvatar.displayName = 'SupplierAvatar';

// Supplier Row Component (List View)
const SupplierRow = React.memo(({
  supplier,
  onNavigate,
  prefetchedAvatarUrl,
  isNew = false,
  onCardVisible,
}: {
  supplier: any;
  onNavigate: (id: string) => void;
  prefetchedAvatarUrl?: string;
  isNew?: boolean;
  onCardVisible?: (supplierId: string) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer for lazy avatar loading
  useEffect(() => {
    if (!rowRef.current || !onCardVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            onCardVisible(supplier.id);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [supplier.id, onCardVisible]);

  const status: 'debt' | 'clear' | 'credit' = supplier.status as any;
  const statusConfig = {
    debt: {
      label: "عليه دين",
      // +ve should be GREEN
      textClass: "text-green-700 dark:text-green-400",
      amountClass: "text-green-700 dark:text-green-400",
      bgClass: "bg-green-50 dark:bg-green-900/20",
    },
    clear: {
      label: "خالص",
      // 0 should be BLACK (or white in dark mode)
      textClass: "text-slate-900 dark:text-white",
      amountClass: "text-slate-900 dark:text-white",
      bgClass: "bg-slate-100 dark:bg-slate-700/40",
    },
    credit: {
      label: "له رصيد",
      // -ve should be RED
      textClass: "text-red-600 dark:text-red-400",
      amountClass: "text-red-600 dark:text-red-400",
      bgClass: "bg-red-50 dark:bg-red-900/20",
    },
  }[status] || {
    label: "خالص",
    textClass: "text-slate-900 dark:text-white",
    amountClass: "text-slate-900 dark:text-white",
    bgClass: "bg-slate-100 dark:bg-slate-700/40",
  };

  return (
    <div
      ref={rowRef}
      onClick={() => onNavigate(supplier.id)}
      className={`flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer group ${isNew
        ? "border-primary ring-2 ring-primary/30 animate-pulse"
        : "border-slate-100 dark:border-slate-700"
        }`}
    >
      {/* Avatar */}
      <SupplierAvatar supplier={supplier} avatarUrl={prefetchedAvatarUrl} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-bold text-base text-text-main dark:text-white truncate group-hover:text-primary transition-colors">
            {supplier.name}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusConfig.bgClass} ${statusConfig.textClass}`}>
            {statusConfig.label}
          </span>
        </div>
        <p className="text-sm text-text-muted truncate">{supplier.phone}</p>
      </div>

      {/* Amount & Arrow */}
      <div className="text-left flex flex-col items-end shrink-0 gap-1">
        <span className={`text-base font-black ${statusConfig.amountClass} whitespace-nowrap`}>
          {formatCurrencySDG(supplier.amount)}
        </span>
        <span className="material-symbols-outlined text-slate-300 text-sm group-hover:text-primary group-hover:translate-x-[-2px] transition-all">
          arrow_back_ios
        </span>
      </div>
    </div>
  );
});
SupplierRow.displayName = 'SupplierRow';

export default function SuppliersPage() {
  const { currentBusiness } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const mainRef = useRef<HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isEntityModalOpen, setIsEntityModalOpen] = useState(false);
  const [statusTab, setStatusTab] = useState<"all" | "debt" | "clear" | "credit">("all");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { avatarUrls, loadAvatarUrl } = useAvatarUrls(suppliers.map(s => ({ id: s.id, avatar_url: s.avatarUrl })), "lazy");
  const [newSupplierId, setNewSupplierId] = useState<string | null>(null);
  const supabase = useMemo(() => createBrowserClient(), []);

  // Clear optimistic state
  useEffect(() => {
    if (!newSupplierId) return;
    const timer = setTimeout(() => setNewSupplierId(null), 3000);
    return () => clearTimeout(timer);
  }, [newSupplierId]);

  // Debounce search
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const showLoading = usePageLoading(isLoading);

  // Load single avatar
  const loadSupplierAvatar = useCallback(async (supplierId: string) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    if (!supplier) return;
    await loadAvatarUrl(supplierId, supplier.avatarUrl);
  }, [suppliers, loadAvatarUrl]);

  const loadSuppliers = useCallback(async (forceShowAll = false) => {
    if (!currentBusiness) {
      setSuppliers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { suppliers: data, error: backendError } = await listSuppliersBrowser({
        businessId: currentBusiness.id,
        search: forceShowAll ? undefined : debouncedSearchQuery.trim() || undefined,
      });

      if (backendError) {
        console.error('Backend error loading suppliers:', backendError);
        setError("فشل تحميل الموردين");
        showToast("فشل تحميل الموردين", "error");
        setSuppliers([]);
        return;
      }

      const suppliersWithActivity = data.map((s: any) => {
        return {
          id: s.id,
          name: s.name,
          phone: s.phone || "",
          initials: s.name.slice(0, 2),
          amount: s.current_balance,
          status: s.status,
          avatarUrl: s.avatar_url || null,
          lastActivity: "اليوم",
          createdAt: s.created_at,
        };
      });

      setSuppliers(suppliersWithActivity);
    } catch (err) {
      console.error('Failed to load suppliers:', err);
      setError('حدث خطأ في الاتصال بالخادم');
      setSuppliers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness, debouncedSearchQuery, showToast]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  // Real-time updates
  useEffect(() => {
    if (!currentBusiness) return;

    const channel = supabase.channel(`suppliers-${currentBusiness.id}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'suppliers',
        filter: `business_id=eq.${currentBusiness.id}`,
      },
      () => {
        loadSuppliers(true);
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBusiness, loadSuppliers, supabase]);

  // Pagination
  const {
    visibleCount,
    isLoadingMore,
    hasMoreItems,
    reachedMaxLoads,
    handleLoadMore,
  } = useLoadMorePagination(suppliers.length);

  const totalDebt = suppliers
    .filter((c) => c.status === "debt")
    .reduce((sum, c) => sum + c.amount, 0);

  const expectedCollectionToday = suppliers
    .filter((c) => c.status === "credit")
    .reduce((sum, c) => sum + c.amount, 0);

  const animatedTotalDebt = useAnimatedNumber(totalDebt);
  const animatedExpectedCollection = useAnimatedNumber(expectedCollectionToday);

  // Filter logic
  const filteredBeforePagination = useMemo(() => {
    let result = suppliers.filter((c) => {
      const q = searchQuery.trim();
      if (q.length === 0) return true;
      const nameMatch = c.name.includes(q);
      const qDigits = q.replace(/[^0-9]/g, "");
      const phoneDigits = c.phone.replace(/[^0-9]/g, "");
      const phoneMatch = qDigits.length > 0 && phoneDigits.includes(qDigits);
      return nameMatch || phoneMatch;
    });

    if (statusTab !== "all") {
      result = result.filter(s => s.status === statusTab);
    }

    if (selectedDate) {
      result = result.filter(s => s.createdAt.startsWith(selectedDate));
    }

    return result;
  }, [suppliers, searchQuery, statusTab, selectedDate]);

  const filteredSuppliers = useMemo(() => {
    return filteredBeforePagination.slice(0, visibleCount);
  }, [filteredBeforePagination, visibleCount]);

  const { emptyKind } = useEmptyState({
    totalItems: suppliers.length,
    filteredItems: filteredBeforePagination.length,
    hasActiveFilters: searchQuery.trim().length > 0 || statusTab !== "all",
  });

  // Handlers
  const handleOpenDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const handleOpenProfile = useCallback(() => setIsProfileOpen(true), []);
  const handleCloseProfile = useCallback(() => setIsProfileOpen(false), []);
  const handleOpenEntityModal = useCallback(() => setIsEntityModalOpen(true), []);
  const handleCloseEntityModal = useCallback(() => setIsEntityModalOpen(false), []);

  const handleRetryLoad = useCallback(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const handleEntitySubmit = useCallback(async (payload: CreateEntityPayload) => {
    if (USE_BACKEND && currentBusiness) {
      const tempId = `temp-${Date.now()}`;
      // Create Blob URL for immediate preview
      const blobUrl = payload.profileImageFile ? URL.createObjectURL(payload.profileImageFile) : null;

      // Calculate signed amount for optimistic UI
      const opening = payload.openingBalance || 0;
      const direction = payload.openingBalanceDirection || 'in';
      // Cashflow convention: out = + , in = -
      const signedOpening = direction === 'out' ? opening : -opening;
      const listStatus = signedOpening > 0 ? 'debt' : signedOpening < 0 ? 'credit' : 'clear';
      const listAmount = Math.abs(signedOpening);

      const optimisticSupplier = {
        id: tempId,
        name: payload.name,
        phone: payload.phone || "",
        initials: payload.name.slice(0, 2),
        amount: listAmount,
        status: listStatus,
        avatarUrl: blobUrl, // Show immediate image
        lastActivity: "الآن",
        createdAt: new Date().toISOString(),
      };

      setSuppliers(prev => [optimisticSupplier, ...prev]);
      setNewSupplierId(tempId);
      setIsEntityModalOpen(false);

      const { supplier, error } = await createSupplier({
        businessId: currentBusiness.id,
        name: payload.name,
        phone: payload.phone || undefined,
        openingBalance: payload.openingBalance || undefined,
        openingBalanceDirection: payload.openingBalanceDirection || undefined,
        profileImage: payload.profileImageFile || undefined,
      });

      if (error) {
        showToast("فشل إضافة المورد", "error");
        setSuppliers(prev => prev.filter(s => s.id !== tempId));
        setNewSupplierId(null);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      } else {
        showToast("تم إضافة المورد بنجاح", "success");
        if (supplier) {
          // If we have a new avatar path, fetch the signed URL immediately
          // so we don't flash a loading state when switching from Blob -> Path
          let finalAvatarUrl = blobUrl;
          if (supplier.avatar_url) {
            const { signedUrl } = await import("@/lib/storage").then(m => m.getSignedUrl("avatars", supplier.avatar_url!));
            if (signedUrl) finalAvatarUrl = signedUrl;
          }

          setSuppliers(prev => prev.map(s =>
            s.id === tempId ? {
              id: supplier.id,
              name: supplier.name,
              phone: supplier.phone || "",
              initials: supplier.name.slice(0, 2),
              amount: supplier.current_balance ?? supplier.opening_balance ?? 0,
              status: (() => {
                if (supplier.status) return supplier.status;
                const opening = supplier.opening_balance || 0;
                const direction = (supplier.opening_balance_direction || 'in') as 'in' | 'out';
                const signed = direction === 'out' ? opening : -opening;
                return signed > 0 ? 'debt' : signed < 0 ? 'credit' : 'clear';
              })(),
              avatarUrl: finalAvatarUrl, // Seamless transition
              lastActivity: "اليوم",
              createdAt: supplier.created_at,
            } : s
          ));
          setNewSupplierId(supplier.id);
          // Auto-clear highlight after animation
          setTimeout(() => setNewSupplierId(null), 3000);
        }
      }
    } else {
      setIsEntityModalOpen(false);
    }
  }, [currentBusiness, showToast]);

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar activePage="suppliers" />

      <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto">
        {/* Collapsible Header */}
        <CollapsibleHeader
          title="الموردون"
          badge={isLoading ? "..." : `${filteredSuppliers.length} مورد`}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="بحث باسم المورد أو رقم هاتفه..."
          onMenuClick={handleOpenDrawer}
          showBackButton
          onBackClick={() => router.back()}
          primaryAction={emptyKind !== "empty" ? {
            label: "إضافة مورد",
            icon: "https://img.icons8.com/?size=100&id=1501&format=png&color=40C057",
            onClick: handleOpenEntityModal,
          } : undefined}
          isLoading={isLoading}
          scrollContainerRef={mainRef}
          onScrollStateChange={(collapsed) => {
            if (emptyKind !== "empty") {
              setIsHeaderCollapsed(collapsed);
            } else {
              setIsHeaderCollapsed(false);
            }
          }}
        />

        {/* Main Content */}
        <div className="px-4 py-4 md:p-6 lg:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6 md:gap-8">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-shake">
              <span className="material-symbols-outlined text-red-500">error</span>
              <div>
                <p className="text-red-700 font-medium">{error}</p>
                <button
                  onClick={handleRetryLoad}
                  className="text-red-600 text-sm hover:text-red-700 underline mt-1"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="relative shrink-0">
              <select
                value={statusTab}
                onChange={(e) => setStatusTab(e.target.value as any)}
                className="appearance-none bg-slate-50 dark:bg-slate-700 border-none text-text-main dark:text-white text-sm font-bold rounded-xl h-11 pr-10 pl-8 focus:ring-primary focus:ring-2 cursor-pointer min-w-[140px]"
              >
                <option value="all">الحالة: الجميع</option>
                <option value="debt">المطالبون (عليه دين)</option>
                <option value="clear">الخالصين</option>
                <option value="credit">الدائنون (له رصيد)</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-text-muted pointer-events-none">filter_list</span>
            </div>

            <div className="relative shrink-0">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="appearance-none bg-slate-50 dark:bg-slate-700 border-none text-text-main dark:text-white text-sm font-bold rounded-xl h-11 pr-10 pl-8 focus:ring-primary focus:ring-2 cursor-pointer min-w-[160px]"
              />
              <span className="material-symbols-outlined absolute right-3 top-2.5 text-text-muted pointer-events-none">calendar_month</span>
            </div>
          </div>

          {/* Summary Card */}
          {showLoading ? (
            <div className="flex flex-col gap-4 rounded-xl p-4 md:p-6 border border-slate-200 bg-white shadow-sm animate-pulse">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-12 w-48 bg-slate-200 rounded"></div>
            </div>
          ) : (
            <div className="rounded-xl p-4 md:p-6 border border-slate-200 bg-white shadow-sm">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <p className="text-text-muted text-xs md:text-sm font-bold uppercase tracking-wider">ملخص الموردين</p>
                <span className="material-symbols-outlined text-text-muted text-lg md:text-xl">account_balance_wallet</span>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-6 divide-x divide-x-reverse divide-slate-100 mb-4 md:mb-6">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-base md:text-xl">trending_up</span>
                    <p className="text-xs md:text-sm text-primary font-bold">عليهم</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-xl md:text-3xl lg:text-4xl font-black text-primary tracking-tight">
                      {formatCurrencySDG(Math.round(animatedTotalDebt))}
                    </h4>
                  </div>
                  <p className="text-[10px] md:text-xs text-text-muted mt-0.5 md:mt-1">الديون على الموردين</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-red-500 text-base md:text-xl">trending_down</span>
                    <p className="text-xs md:text-sm text-red-600 font-bold">لهم</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-xl md:text-3xl lg:text-4xl font-black text-red-600 tracking-tight">
                      {formatCurrencySDG(Math.round(animatedExpectedCollection))}
                    </h4>
                  </div>
                  <p className="text-[10px] md:text-xs text-text-muted mt-0.5 md:mt-1">الرصيد لديهم</p>
                </div>
              </div>

              {emptyKind !== "empty" && (
                <button
                  onClick={handleOpenEntityModal}
                  className="flex md:hidden w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-colors items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  إضافة مورد جديد
                </button>
              )}
            </div>
          )}

          {/* List View */}
          {showLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <EntityRowSkeleton key={i} />
              ))}
            </div>
          ) : emptyKind ? (
            <EmptyState
              title={emptyKind === "empty" ? "لا يوجد موردين" : "لم يتم العثور على نتائج"}
              description={emptyKind === "empty" ? "ابدأ بإضافة مورد جديد" : `لم يتم العثور على موردين مطابقين لـ "${searchQuery}"`}
              actionLabel={emptyKind === "empty" ? "إضافة مورد" : undefined}
              onAction={emptyKind === "empty" ? handleOpenEntityModal : undefined}
            />
          ) : (
            <>
              <div className="flex flex-col gap-3">
                {filteredSuppliers.map((supplier, index) => (
                  <SupplierRow
                    key={supplier.id}
                    supplier={supplier}
                    onNavigate={(id) => router.push(`/dashboard/suppliers/${id}`)}
                    isNew={newSupplierId === supplier.id}
                    prefetchedAvatarUrl={avatarUrls[supplier.id]}
                    onCardVisible={loadSupplierAvatar}
                  />
                ))}
              </div>

              {filteredBeforePagination.length > 0 && (
                <div className="flex justify-center items-center mt-8 mb-8">
                  {isLoadingMore ? (
                    <div className="flex items-center gap-2 text-text-muted">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm font-medium">جاري التحميل...</span>
                    </div>
                  ) : reachedMaxLoads ? (
                    <p className="text-sm text-text-muted font-medium">وصلت لآخر مورد</p>
                  ) : hasMoreItems ? (
                    <button
                      onClick={handleLoadMore}
                      className="px-6 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-colors"
                    >
                      عرض المزيد من الموردين
                    </button>
                  ) : null}
                </div>
              )}
            </>
          )}

          <footer className="mt-8 py-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-text-muted text-[11px] font-medium">
            <p>© 2025 محسوب - نظام إدارة الديون والمبيعات</p>
            <div className="flex items-center gap-4">
              <a className="hover:text-primary transition-colors" href="#">الشروط والأحكام</a>
              <a className="hover:text-primary transition-colors" href="#">مركز المساعدة</a>
              <a className="hover:text-primary transition-colors" href="#">تواصل معنا</a>
            </div>
          </footer>
        </div>
      </main>

      <MobileDrawer
        open={isDrawerOpen}
        onCloseAction={handleCloseDrawer}
        onOpenProfileAction={handleOpenProfile}
        activePage="suppliers"
      />

      <MobileProfileSlideOver
        isOpen={isProfileOpen}
        onClose={handleCloseProfile}
      />

      <EntityFormModal
        isOpen={isEntityModalOpen}
        entityType="supplier"
        onCloseAction={handleCloseEntityModal}
        onSubmitAction={handleEntitySubmit}
      />

      {!isEntityModalOpen && isHeaderCollapsed && suppliers.length > 0 && emptyKind !== "empty" && (
        <button onClick={handleOpenEntityModal} className="md:hidden fixed bottom-6 left-6 size-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200 z-50 animate-fadeInUp">
          <img src="https://img.icons8.com/?size=100&id=1501&format=png&color=FFFFFF" alt="" className="size-8 object-contain" />
        </button>
      )}
    </div>
  );
}
