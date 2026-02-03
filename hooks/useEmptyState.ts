import { useMemo } from "react";

interface UseEmptyStateOptions {
  totalItems: number;
  filteredItems: number;
  hasActiveFilters: boolean;
}

interface UseEmptyStateReturn {
  emptyKind: "empty" | "noResults" | null;
  hasActiveFilters: boolean;
}

/**
 * Hook to determine empty state type for lists with filtering
 */
export function useEmptyState({
  totalItems,
  filteredItems,
  hasActiveFilters,
}: UseEmptyStateOptions): UseEmptyStateReturn {
  const emptyKind = useMemo(() => {
    if (totalItems === 0) return "empty";
    if (filteredItems === 0 && hasActiveFilters) return "noResults";
    return null;
  }, [totalItems, filteredItems, hasActiveFilters]);

  return {
    emptyKind,
    hasActiveFilters,
  };
}