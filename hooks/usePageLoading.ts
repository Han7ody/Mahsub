import { useLoading } from "@/lib/loading-context";

/**
 * Hook to combine local loading state with global loading state
 */
export function usePageLoading(localLoading: boolean): boolean {
  const { isLoading: globalLoading } = useLoading();
  return localLoading || globalLoading;
}