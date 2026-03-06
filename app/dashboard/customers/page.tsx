"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import MobileProfileSlideOver from "@/components/dashboard/MobileProfileSlideOver";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import EntityFormModal, { type CreateEntityPayload } from "@/components/dashboard/EntityFormModal";
import EmptyState from "@/components/dashboard/EmptyState";
import EntityRowSkeleton from "@/components/skeletons/EntityRowSkeleton";
import CollapsibleHeader from "@/components/common/CollapsibleHeader";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { listCustomersBrowser, createCustomer, type CustomerWithBalance } from "@/lib/repo/customers";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useEmptyState } from "@/hooks/useEmptyState";
import { useLoadMorePagination } from "@/hooks/useLoadMorePagination";
import { formatCurrencySDG } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";
import { FilterBar, FilterSegmented, FilterSelect } from "@/components/dashboard/FilterBar";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

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

// Customer Avatar Component with loading state
const CustomerAvatar = React.memo(({ customer, avatarUrl }: { customer: any; avatarUrl?: string | null }) => {
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
          alt={customer.name}
          className="w-full h-full object-cover"
        />
      ) : showLoading ? (
        <div className="w-full h-full flex items-center justify-center bg-slate-50">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : showInitials ? (
        <div
          className={`w-full h-full flex items-center justify-center font-bold text-lg ${customer.status === "clear"
            ? "bg-slate-100 text-slate-900 dark:bg-slate-700/50 dark:text-white"
            : "bg-slate-100 text-slate-500"
            }`}
        >
          {customer.initials}
        </div>
      ) : null}
    </div>
  );
});
CustomerAvatar.displayName = 'CustomerAvatar';

// Memoized Customer Row Component (List View)
const CustomerRow = React.memo(({
  customer,
  onNavigate,
  prefetchedAvatarUrl,
  isNew = false,
  onCardVisible,
}: {
  customer: any;
  onNavigate: (id: string) => void;
  prefetchedAvatarUrl?: string;
  isNew?: boolean;
  onCardVisible?: (customerId: string) => void;
}) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  // Setup intersection observer for lazy avatar loading
  useEffect(() => {
    if (!rowRef.current || !onCardVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            onCardVisible(customer.id);
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, [customer.id, onCardVisible]);

  const status: 'debt' | 'clear' | 'credit' = customer.status as any;
  const statusConfig = {
    debt: {
      label: t("status_debt"),
      // +ve should be GREEN
      textClass: "text-green-700 dark:text-green-400",
      amountClass: "text-green-700 dark:text-green-400",
      bgClass: "bg-green-50 dark:bg-green-900/20",
    },
    clear: {
      label: t("status_clear"),
      // 0 should be BLACK (or white in dark mode)
      textClass: "text-slate-900 dark:text-white",
      amountClass: "text-slate-900 dark:text-white",
      bgClass: "bg-slate-100 dark:bg-slate-700/40",
    },
    credit: {
      label: t("status_credit"),
      // -ve should be RED
      textClass: "text-red-600 dark:text-red-400",
      amountClass: "text-red-600 dark:text-red-400",
      bgClass: "bg-red-50 dark:bg-red-900/20",
    },
  }[status] || {
    label: t("status_clear"),
    textClass: "text-slate-900 dark:text-white",
    amountClass: "text-slate-900 dark:text-white",
    bgClass: "bg-slate-100 dark:bg-slate-700/40",
  };

  return (
    <div
      ref={rowRef}
      onClick={() => onNavigate(customer.id)}
      className={`flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border hover:shadow-md transition-all cursor-pointer group ${isNew
        ? "border-primary ring-2 ring-primary/30 animate-pulse"
        : "border-slate-100 dark:border-slate-700"
        }`}
    >
      {/* Avatar */}
      <CustomerAvatar customer={customer} avatarUrl={prefetchedAvatarUrl} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-bold text-base text-text-main dark:text-white truncate group-hover:text-primary transition-colors">
            {customer.name}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusConfig.bgClass} ${statusConfig.textClass}`}>
            {statusConfig.label}
          </span>
        </div>
        <p className="text-sm text-text-muted truncate">{customer.phone}</p>
      </div>

      {/* Amount & Arrow */}
      <div className="text-left flex flex-col items-end shrink-0 gap-1">
        <span className={`text-base font-black ${statusConfig.amountClass} whitespace-nowrap`}>
          {formatCurrencySDG(customer.amount)}
        </span>
        <span className="material-symbols-outlined text-slate-300 text-sm group-hover:text-primary group-hover:translate-x-[-2px] transition-all">
          arrow_back_ios
        </span>
      </div>
    </div>
  );
});
CustomerRow.displayName = 'CustomerRow';

export default function CustomersPage() {
  const { currentBusiness } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
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
  const [customers, setCustomers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { avatarUrls, loadAvatarUrl } = useAvatarUrls(customers.map(c => ({ id: c.id, avatar_url: c.avatar_url })), "lazy");
  const [newCustomerId, setNewCustomerId] = useState<string | null>(null);
  const supabase = useMemo(() => createBrowserClient(), []);

  // Clear optimistic state after 3 seconds
  useEffect(() => {
    if (!newCustomerId) return;
    const timer = setTimeout(() => setNewCustomerId(null), 3000);
    return () => clearTimeout(timer);
  }, [newCustomerId]);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 200);
  const showLoading = usePageLoading(isLoading);

  // Load single customer avatar on demand
  const loadCustomerAvatar = useCallback(async (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    await loadAvatarUrl(customerId, customer.avatar_url);
  }, [customers, loadAvatarUrl]);

  const loadCustomers = useCallback(async (forceShowAll = false) => {
    if (!currentBusiness) {
      setCustomers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { customers: data, error: backendError } = await listCustomersBrowser({
        businessId: currentBusiness.id,
        search: forceShowAll ? undefined : debouncedSearchQuery.trim() || undefined,
      });

      if (backendError) {
        console.error('Backend error loading customers:', backendError);
        setError("فشل تحميل العملاء");
        showToast("فشل تحميل العملاء", "error");
        setCustomers([]);
        return;
      }

      const customersWithActivity = data.map((c: CustomerWithBalance) => {
        return {
          id: c.id,
          name: c.name,
          phone: c.phone || "",
          initials: c.name.split(' ').map((n) => n[0]).join(' ').substring(0, 2),
          amount: c.current_balance,
          status: c.status,
          avatar_url: c.avatar_url || null,
          lastActivity: "اليوم",
          createdAt: c.created_at,
        };
      });

      setCustomers(customersWithActivity);
    } catch (err) {
      console.error('Failed to load customers:', err);
      setError('حدث خطأ في الاتصال بالخادم');
      setCustomers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness, debouncedSearchQuery, showToast]);

  useEffect(() => {
    setCustomers([]);
    setError(null);
    loadCustomers();
  }, [loadCustomers, currentBusiness?.id]);

  useEffect(() => {
    if (!currentBusiness) return;

    const channel = supabase.channel(`customers-${currentBusiness.id}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'customers',
        filter: `business_id=eq.${currentBusiness.id}`,
      },
      () => {
        loadCustomers(true);
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBusiness, loadCustomers, supabase]);

  const {
    visibleCount,
    isLoadingMore,
    hasMoreItems,
    reachedMaxLoads,
    handleLoadMore,
  } = useLoadMorePagination(customers.length);

  const totalDebt = customers
    .filter((c) => c.status === "debt")
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const expectedCollectionToday = customers
    .filter((c) => c.status === "credit")
    .reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

  const animatedTotalDebt = useAnimatedNumber(totalDebt);
  const animatedExpectedCollection = useAnimatedNumber(expectedCollectionToday);

  const [prevTotalDebt, setPrevTotalDebt] = useState(totalDebt);
  const [prevExpectedCollection, setPrevExpectedCollection] = useState(expectedCollectionToday);

  useEffect(() => {
    setPrevTotalDebt(totalDebt);
    setPrevExpectedCollection(expectedCollectionToday);
  }, [totalDebt, expectedCollectionToday]);

  const filteredBeforePagination = useMemo(() => {
    let result = customers.filter((c) => {
      const q = searchQuery.trim();
      if (q.length === 0) return true;
      const nameMatch = c.name.includes(q);
      const qDigits = q.replace(/[^0-9]/g, "");
      const phoneDigits = c.phone.replace(/[^0-9]/g, "");
      const phoneMatch = qDigits.length > 0 && phoneDigits.includes(qDigits);
      return nameMatch || phoneMatch;
    });

    if (statusTab !== "all") {
      result = result.filter(c => c.status === statusTab);
    }

    if (selectedDate) {
      result = result.filter(c => c.createdAt && c.createdAt.startsWith(selectedDate));
    }

    return result;
  }, [customers, searchQuery, statusTab, selectedDate]);

  const { emptyKind } = useEmptyState({
    totalItems: customers.length,
    filteredItems: filteredBeforePagination.length,
    hasActiveFilters: searchQuery.trim().length > 0 || statusTab !== "all",
  });

  const handleOpenDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const handleCloseDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const handleOpenProfile = useCallback(() => setIsProfileOpen(true), []);
  const handleCloseProfile = useCallback(() => setIsProfileOpen(false), []);
  const handleOpenEntityModal = useCallback(() => setIsEntityModalOpen(true), []);
  const handleCloseEntityModal = useCallback(() => setIsEntityModalOpen(false), []);

  const handleRetryLoad = useCallback(() => {
    loadCustomers(true);
  }, [loadCustomers]);

  const handleEntitySubmit = useCallback(async (payload: CreateEntityPayload) => {
    if (USE_BACKEND && currentBusiness) {
      const tempId = `temp-${Date.now()}`;
      const optimisticCustomer = {
        id: tempId,
        name: payload.name,
        phone: payload.phone || "",
        initials: payload.name.split(' ').map((n) => n[0]).join(' ').substring(0, 2),
        amount: payload.openingBalance || 0,
        // Cashflow convention: out = + , in = -
        status: payload.openingBalance > 0
          ? (payload.openingBalanceDirection === "out" ? "debt" : "credit")
          : "clear",
        avatar_url: null,
        lastActivity: "الآن",
        createdAt: new Date().toISOString(),
      };

      setCustomers(prev => [optimisticCustomer, ...prev]);
      setNewCustomerId(tempId);
      setIsEntityModalOpen(false);

      const { customer, error } = await createCustomer({
        businessId: currentBusiness.id,
        name: payload.name,
        phone: payload.phone || null,
        openingBalance: payload.openingBalance || undefined,
        openingBalanceDirection: payload.openingBalanceDirection || undefined,
        profileImage: payload.profileImageFile || null,
      });

      if (error) {
        showToast("فشل إضافة العميل", "error");
        setCustomers(prev => prev.filter(c => c.id !== tempId));
        setNewCustomerId(null);
      } else {
        showToast("تم إضافة العميل بنجاح", "success");
        if (customer) {
          let finalStatus = customer.status;
          if (!finalStatus) {
            const opening = customer.opening_balance || 0;
            const direction = customer.opening_balance_direction || 'in';
            // Cashflow convention: out = + , in = -
            const signed = direction === 'out' ? opening : -opening;
            finalStatus = signed > 0 ? 'debt' : signed < 0 ? 'credit' : 'clear';
          }

          setCustomers(prev => prev.map(c =>
            c.id === tempId ? {
              id: customer.id,
              name: customer.name,
              phone: customer.phone || "",
              initials: customer.name.split(' ').map((n) => n[0]).join(' ').substring(0, 2),
              amount: customer.current_balance ?? customer.opening_balance ?? 0,
              status: finalStatus,
              avatar_url: customer.avatar_url || null,
              lastActivity: "اليوم",
              createdAt: customer.created_at,
            } : c
          ));
          setNewCustomerId(customer.id);
          setTimeout(() => setNewCustomerId(null), 3000);
        }
      }
    } else {
      setIsEntityModalOpen(false);
    }
  }, [currentBusiness, showToast]);

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar activePage="customers" />

      <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto">
        {/* Collapsible Header */}
        <CollapsibleHeader
          title={t("customers_title")}
          badge={isLoading ? "..." : `${filteredBeforePagination.length} ${t("customers_title")}`}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={t("search_placeholder")}
          onMenuClick={handleOpenDrawer}
          showBackButton
          onBackClick={() => router.back()}
          primaryAction={emptyKind !== "empty" ? {
            label: t("add_customer"),
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
                  {t("confirm") /* Reusing confirm/retry */}
                </button>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="relative shrink-0">
              <select
                value={statusTab}
                onChange={(e) => setStatusTab(e.target.value as any)}
                className="appearance-none bg-slate-50 dark:bg-slate-700 border-none text-text-main dark:text-white text-sm font-bold rounded-xl h-11 pr-10 pl-8 focus:ring-primary focus:ring-2 cursor-pointer min-w-[140px]"
              >
                <option value="all">{t("filter_all")}</option>
                <option value="debt">{t("status_debt")}</option>
                <option value="clear">{t("status_clear")}</option>
                <option value="credit">{t("status_credit")}</option>
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
              {!selectedDate && (
                <span className="absolute inset-0 flex items-center pr-10 pl-4 text-text-muted text-sm font-bold pointer-events-none">
                  {t("date_format") === "DD/MM/YYYY" ? "التاريخ" : "Date"}
                </span>
              )}
            </div>
          </div>

          {/* Summary Card */}
          {showLoading ? (
            <div className="flex flex-col gap-4 rounded-xl p-4 md:p-6 border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 shadow-sm animate-pulse">
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-12 w-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ) : (
            <div className="rounded-xl p-4 md:p-6 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
              <div className="flex justify-between items-center mb-3 md:mb-4">
                <p className="text-text-muted text-xs md:text-sm font-bold uppercase tracking-wider">{t("summary_customers")}</p>
                <span className="material-symbols-outlined text-text-muted text-lg md:text-xl">account_balance_wallet</span>
              </div>

              <div className="grid grid-cols-2 gap-3 md:gap-6 divide-x divide-x-reverse divide-slate-100 dark:divide-slate-700 mb-4 md:mb-6">
                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-primary text-base md:text-xl">trending_up</span>
                    <p className="text-xs md:text-sm text-primary font-bold">{t("debt_on_them")}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-xl md:text-3xl lg:text-4xl font-black text-primary tracking-tight">
                      {formatCurrencySDG(Math.round(animatedTotalDebt))}
                    </h4>
                  </div>
                  <p className="text-[10px] md:text-xs text-text-muted mt-0.5 md:mt-1">{t("total_receivable")}</p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="material-symbols-outlined text-red-500 text-base md:text-xl">trending_down</span>
                    <p className="text-xs md:text-sm text-red-600 font-bold">{t("credit_for_them")}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-xl md:text-3xl lg:text-4xl font-black text-red-600 tracking-tight">
                      {formatCurrencySDG(Math.round(animatedExpectedCollection))}
                    </h4>
                  </div>
                  <p className="text-[10px] md:text-xs text-text-muted mt-0.5 md:mt-1">{t("total_payable")}</p>
                </div>
              </div>

              {emptyKind !== "empty" && (
                <button
                  onClick={handleOpenEntityModal}
                  className="flex md:hidden w-full px-4 py-3 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-xl transition-colors items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  {t("add_customer")}
                </button>
              )}
            </div>
          )}

          {/* Customer Rows List View */}
          {showLoading ? (
            <div className="flex flex-col gap-3">
              {[...Array(6)].map((_, i) => (
                <EntityRowSkeleton key={i} />
              ))}
            </div>
          ) : emptyKind ? (
            <EmptyState
              title={emptyKind === "empty" ? t("no_customers") : t("no_data")}
              description={emptyKind === "empty" ? "ابدأ بإضافة عميل جديد" : `لم يتم العثور على عملاء مطابقين لـ "${searchQuery}"`}
              actionLabel={emptyKind === "empty" ? t("add_customer") : undefined}
              onAction={emptyKind === "empty" ? handleOpenEntityModal : undefined}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {filteredBeforePagination.map((customer, index) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  onNavigate={(id) => router.push(`/dashboard/customers/${id}`)}
                  prefetchedAvatarUrl={avatarUrls[customer.id]}
                  isNew={customer.id === newCustomerId}
                  onCardVisible={loadCustomerAvatar}
                />
              ))}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-8 py-8 border-t border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4 text-text-muted text-[11px] font-medium">
            <p>© 2025 محسوب - نظام إدارة الديون والمبيعات</p>
            <div className="flex items-center gap-4">
              <a className="hover:text-primary transition-colors" href="#">الشروط والأحكام</a>
            </div>
          </footer>
        </div>
      </main>

      <MobileDrawer
        open={isDrawerOpen}
        onCloseAction={handleCloseDrawer}
        onOpenProfileAction={handleOpenProfile}
        activePage="customers"
      />

      <MobileProfileSlideOver
        isOpen={isProfileOpen}
        onClose={handleCloseProfile}
      />

      <EntityFormModal
        isOpen={isEntityModalOpen}
        entityType="customer"
        onCloseAction={handleCloseEntityModal}
        onSubmitAction={handleEntitySubmit}
      />

      {!isEntityModalOpen && isHeaderCollapsed && customers.length > 0 && emptyKind !== "empty" && (
        <button onClick={handleOpenEntityModal} className="md:hidden fixed bottom-6 left-6 size-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200 z-50 animate-fadeInUp">
          <img src="https://img.icons8.com/?size=100&id=1501&format=png&color=FFFFFF" alt="" className="size-8 object-contain" />
        </button>
      )}
    </div>
  );
}
