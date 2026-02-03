"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import DashboardSidebar from "@/components/layout/DashboardSidebar";
import MobileDrawer from "@/components/layout/MobileDrawer";
import WorkerDetailsModal from "@/components/dashboard/WorkerDetailsModal";
import { useAuth } from "@/lib/auth-context";
import { listWorkersBrowser, type Worker } from "@/lib/repo/workers";
import { getSignedUrlsBatch } from "@/lib/storage";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { getInitials } from "@/lib/format";
import EmptyState from "@/components/dashboard/EmptyState";
import WorkerCardSkeleton from "@/components/skeletons/WorkerCardSkeleton";
import CollapsibleHeader from "@/components/common/CollapsibleHeader";
import { useDebounce } from "@/hooks/useDebounce";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useEmptyState } from "@/hooks/useEmptyState";
import { formatCurrencySDG } from "@/lib/format";
import { createBrowserClient } from "@/lib/supabase/client";

const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND === "true";

// Memoized avatar config to prevent recreation
const AVATAR_CONFIGS: Record<string, { bg: string; text: string }> = {
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  slate: {
    bg: "bg-slate-100 dark:bg-slate-700",
    text: "text-slate-500 dark:text-slate-400",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-900/20",
    text: "text-red-400",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  purple: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
  },
};

// Worker Avatar Component with performance optimizations
const WorkerAvatar = React.memo(({ worker, avatarConfig, prefetchedUrl, loadAvatarUrl }: { worker: Worker; avatarConfig: { bg: string; text: string }; prefetchedUrl?: string; loadAvatarUrl?: (id: string, path?: string | null) => void }) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);

  // Use prefetched URL if available
  useEffect(() => {
    if (prefetchedUrl) {
      setIsImageLoading(true);
      setImageLoadError(false);
      // Preload the image
      const img = new Image();
      img.onload = () => {
        setAvatarUrl(prefetchedUrl);
        setIsImageLoading(false);
      };
      img.onerror = () => {
        setImageLoadError(true);
        setIsImageLoading(false);
        setAvatarUrl(null);
      };
      img.src = prefetchedUrl;
    } else {
      setAvatarUrl(null);
      setIsImageLoading(false);
    }
  }, [prefetchedUrl]);

  // Lazy load avatar URL on demand if not prefetched
  useEffect(() => {
    if (!prefetchedUrl && loadAvatarUrl && worker.avatar_url) {
      loadAvatarUrl(worker.id, worker.avatar_url);
    }
  }, [prefetchedUrl, loadAvatarUrl, worker.id, worker.avatar_url]);

  const showImage = avatarUrl && !isImageLoading && !imageLoadError;
  const showLoading = isImageLoading;
  const showInitials = !showImage && !showLoading;

  return (
    <div
      className={`w-20 h-20 rounded-full ${showImage ? 'bg-transparent' : avatarConfig.bg} flex items-center justify-center ring-4 ring-slate-50 dark:ring-slate-900 overflow-hidden transition-all duration-300`}
    >
      {showImage ? (
        <img 
          src={avatarUrl} 
          alt={`${worker.name} avatar`}
          className="w-full h-full object-cover"
        />
      ) : showLoading ? (
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-current border-t-transparent rounded-full animate-spin opacity-60"></div>
        </div>
      ) : showInitials ? (
        <span className={`text-2xl font-bold ${avatarConfig.text}`}>
          {getInitials(worker.name)}
        </span>
      ) : null}
    </div>
  );
});
WorkerAvatar.displayName = 'WorkerAvatar';

// Memoized Worker Card to prevent unnecessary re-renders
const WorkerCard = React.memo(({ 
  worker, 
  index, 
  avatarConfig, 
  onEdit,
  prefetchedAvatarUrl,
  loadAvatarUrl
}: { 
  worker: Worker; 
  index: number; 
  avatarConfig: { bg: string; text: string };
  onEdit: (worker: Worker) => void;
  prefetchedAvatarUrl?: string;
  loadAvatarUrl?: (id: string, path?: string | null) => void;
}) => (
  <div
    className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300 group flex flex-col items-center text-center transform animate-fadeInUp"
    style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
  >
    {/* Avatar */}
    <div className="relative mb-4 group-hover:scale-110 transition-transform duration-300">
      <WorkerAvatar worker={worker} avatarConfig={avatarConfig} prefetchedUrl={prefetchedAvatarUrl} loadAvatarUrl={loadAvatarUrl} />
    </div>

    {/* Name */}
    <h3 className="text-lg font-bold text-text-main mb-3 group-hover:text-primary transition-colors duration-200">
      {worker.name}
    </h3>

    {/* Role Chip */}
    <div className="flex gap-2 mb-6">
      <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 text-[11px] font-bold rounded-full group-hover:bg-primary-soft group-hover:text-primary transition-colors duration-200">
        {worker.role}
      </span>
    </div>

    {/* Action Button */}
    <button
      onClick={() => onEdit(worker)}
      className="w-full py-2.5 border-2 border-slate-100 dark:border-slate-700 hover:border-primary hover:bg-primary hover:text-white dark:hover:border-primary rounded-xl text-slate-500 dark:text-slate-400 font-bold transition-all duration-200 text-sm flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
    >
      <span className="material-symbols-outlined text-sm">edit</span>
      عرض / تعديل
    </button>
  </div>
));
WorkerCard.displayName = 'WorkerCard';

export default function WorkersPage() {
  const { currentBusiness } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [isLoading, setIsLoading] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<Worker | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  // Unified avatar loader (lazy strategy)
  const { avatarUrls, loadAvatarUrl } = useAvatarUrls(workers, "lazy");
  const supabase = useMemo(() => createBrowserClient(), []);
  
  // Debounce search query to prevent excessive API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const showLoading = usePageLoading(isLoading);

  // Removed upfront prefetch; avatars load on demand

  // Load workers data with debounced search
  const loadWorkers = useCallback(async () => {
    if (!currentBusiness) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { workers: backendWorkers, error: backendError } = await listWorkersBrowser({
        businessId: currentBusiness.id,
        search: debouncedSearchQuery.trim() || undefined,
      });
      
      if (backendError) {
        setError('فشل في تحميل بيانات العمال');
        setWorkers([]);
      } else {
        setWorkers(backendWorkers);
      }
    } catch (error) {
      console.error('Failed to load workers:', error);
      setError('حدث خطأ في الاتصال بالخادم');
      setWorkers([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentBusiness, debouncedSearchQuery]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  // Real-time: refresh workers list on inserts/updates/deletes
  useEffect(() => {
    if (!currentBusiness) return;

    const channel = supabase.channel(`workers-${currentBusiness.id}`);

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'workers',
        filter: `business_id=eq.${currentBusiness.id}`,
      },
      () => {
        loadWorkers();
      }
    );

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBusiness, loadWorkers, supabase]);

  const handleWorkerSaved = async (worker: Worker) => {
    if (modalMode === "add") {
      setWorkers(prev => [worker, ...prev]);
    } else {
      setWorkers(prev => prev.map(w => w.id === worker.id ? worker : w));
    }
    
    // Refresh avatar URL lazily if needed
    if (worker.avatar_url && USE_BACKEND) {
      loadAvatarUrl(worker.id, worker.avatar_url);
    }
  };

  const handleWorkerDeleted = useCallback((workerId: string) => {
    setWorkers(prev => prev.filter(w => w.id !== workerId));
  }, []);

  const openAddModal = useCallback(() => {
    setSelectedWorker(undefined);
    setModalMode("add");
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((worker: Worker) => {
    setSelectedWorker(worker);
    setModalMode("edit");
    setIsModalOpen(true);
  }, []);

  // Memoized filtered workers to prevent recalculation
  const filteredWorkers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length === 0) return workers;
    
    return workers.filter((w) => (
      w.name.toLowerCase().includes(q) ||
      w.role.toLowerCase().includes(q) ||
      w.phone.includes(q)
    ));
  }, [workers, searchQuery]);

  // Memoized calculations
  const { emptyKind } = useEmptyState({
    totalItems: workers.length,
    filteredItems: filteredWorkers.length,
    hasActiveFilters: searchQuery.trim().length > 0,
  });

  // Memoized avatar config getter
  const getAvatarConfig = useCallback((color: string) => {
    return AVATAR_CONFIGS[color] || AVATAR_CONFIGS.slate;
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar activePage="workers" />

      <main ref={mainRef} className="flex-1 flex flex-col overflow-y-auto">
        {/* Collapsible Header */}
        <CollapsibleHeader
          title="العمال"
          badge={isLoading ? "..." : `${filteredWorkers.length} عامل`}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="بحث بالاسم، الدور، أو الهاتف..."
          onMenuClick={() => setIsDrawerOpen(true)}
          primaryAction={{
            label: "إضافة عامل",
            icon: "https://img.icons8.com/?size=100&id=1501&format=png&color=40C057",
            onClick: openAddModal,
          }}
          isLoading={isLoading}
          scrollContainerRef={mainRef}
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
                  onClick={loadWorkers}
                  className="text-red-600 text-sm hover:text-red-700 underline mt-1"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          )}

          {/* Worker Cards Grid */}
          {showLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <WorkerCardSkeleton key={i} />
              ))}
            </div>
          ) : emptyKind ? (
            <EmptyState 
              title={emptyKind === "empty" ? "لا يوجد موظفين" : "لم يتم العثور على نتائج"}
              description={emptyKind === "empty" ? "ابدأ بإضافة موظف جديد" : `لم يتم العثور على موظفين مطابقين لـ "${searchQuery}"`}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkers.map((worker, index) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  index={index}
                  avatarConfig={getAvatarConfig(worker.avatar_color || 'slate')}
                  onEdit={openEditModal}
                  prefetchedAvatarUrl={avatarUrls[worker.id]}
                  loadAvatarUrl={loadAvatarUrl}
                />
              ))}
            </div>
          )}

          {/* Footer */}
          <footer className="mt-8 py-8 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 text-text-muted text-[11px] font-medium">
            <p>© 2025 محسوب - نظام إدارة الديون والمبيعات</p>
            <div className="flex items-center gap-4">
              <a className="hover:text-primary transition-colors" href="#">
                الشروط والأحكام
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                مركز المساعدة
              </a>
              <a className="hover:text-primary transition-colors" href="#">
                تواصل معنا
              </a>
            </div>
          </footer>
        </div>
      </main>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={isDrawerOpen}
        onCloseAction={() => setIsDrawerOpen(false)}
        onOpenProfileAction={() => {}}
        activePage="workers"
      />


      {/* Worker Details Modal */}
      <WorkerDetailsModal
        isOpen={isModalOpen}
        onCloseAction={() => setIsModalOpen(false)}
        mode={modalMode}
        worker={selectedWorker}
        onWorkerSaved={handleWorkerSaved}
        onWorkerDeleted={handleWorkerDeleted}
      />

      {/* Mobile FAB */}
      {!isModalOpen && (
        <button
          onClick={openAddModal}
          className="md:hidden fixed bottom-6 left-6 size-14 bg-primary text-white rounded-full shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-200 z-50"
        >
          <img src="https://img.icons8.com/?size=100&id=1501&format=png&color=FFFFFF" alt="" className="size-8 object-contain" />
        </button>
      )}
    </div>
  );
}
