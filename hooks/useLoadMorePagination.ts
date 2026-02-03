import { useState, useEffect, useMemo } from "react";

interface UseLoadMorePaginationOptions {
  initialCountMobile?: number;
  initialCountDesktop?: number;
  loadMoreCountMobile?: number;
  loadMoreCountDesktop?: number;
  maxLoadMoreClicks?: number;
}

interface UseLoadMorePaginationReturn {
  visibleCount: number;
  loadMoreCount: number;
  isLoadingMore: boolean;
  hasMoreItems: boolean;
  reachedMaxLoads: boolean;
  pageSize: number;
  handleLoadMore: () => void;
}

/**
 * Hook for managing "Load More" pagination with responsive page sizes
 */
export function useLoadMorePagination(
  totalItems: number,
  options: UseLoadMorePaginationOptions = {}
): UseLoadMorePaginationReturn {
  const {
    initialCountMobile = 15,
    initialCountDesktop = 20,
    loadMoreCountMobile = 15,
    loadMoreCountDesktop = 20,
    maxLoadMoreClicks = 4,
  } = options;

  const [pageSize, setPageSize] = useState(initialCountDesktop);
  const [visibleCount, setVisibleCount] = useState(initialCountDesktop);
  const [loadMoreCount, setLoadMoreCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Set page size based on screen width after mount
  useEffect(() => {
    const updatePageSize = () => {
      const isMobile = window.innerWidth < 768;
      const newPageSize = isMobile ? loadMoreCountMobile : loadMoreCountDesktop;
      const newInitialCount = isMobile ? initialCountMobile : initialCountDesktop;
      
      setPageSize(newPageSize);
      // Only update visible count if it's still at initial value
      if (loadMoreCount === 0) {
        setVisibleCount(newInitialCount);
      }
    };
    
    updatePageSize();
    window.addEventListener("resize", updatePageSize);
    return () => window.removeEventListener("resize", updatePageSize);
  }, [initialCountMobile, initialCountDesktop, loadMoreCountMobile, loadMoreCountDesktop, loadMoreCount]);

  const hasMoreItems = totalItems > visibleCount;
  const reachedMaxLoads = loadMoreCount >= maxLoadMoreClicks;

  const handleLoadMore = () => {
    if (reachedMaxLoads || !hasMoreItems) return;
    
    setIsLoadingMore(true);
    // Simulate loading delay for smooth UX
    setTimeout(() => {
      setVisibleCount((prev) => prev + pageSize);
      setLoadMoreCount((prev) => prev + 1);
      setIsLoadingMore(false);
    }, 500);
  };

  return {
    visibleCount,
    loadMoreCount,
    isLoadingMore,
    hasMoreItems,
    reachedMaxLoads,
    pageSize,
    handleLoadMore,
  };
}