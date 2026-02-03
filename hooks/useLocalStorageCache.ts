/**
 * Custom hook for caching data in localStorage with versioning
 * Useful for reducing API calls on return visits
 */

import { useEffect, useState } from 'react';

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 1 hour)
  version?: string; // Cache version to invalidate on schema changes
}

export function useLocalStorageCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { ttl = 60 * 60 * 1000, version = '1' } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = `${key}:data`;
  const versionKey = `${key}:version`;
  const expiryKey = `${key}:expiry`;

  useEffect(() => {
    const loadData = async () => {
      try {
        const now = Date.now();
        const cachedVersion = localStorage.getItem(versionKey);
        const cachedExpiry = localStorage.getItem(expiryKey);
        const cachedData = localStorage.getItem(cacheKey);

        // Check if cache is valid (version matches AND not expired)
        if (
          cachedData &&
          cachedVersion === version &&
          cachedExpiry &&
          parseInt(cachedExpiry) > now
        ) {
          // Use cached data immediately
          setData(JSON.parse(cachedData));
          setError(null);

          // Refresh in background without blocking UI
          try {
            const freshData = await fetchFn();
            setData(freshData);
            localStorage.setItem(cacheKey, JSON.stringify(freshData));
            localStorage.setItem(expiryKey, String(now + ttl));
            localStorage.setItem(versionKey, version);
          } catch (bgError) {
            console.warn('Background refresh failed, using cached data:', bgError);
          }

          setIsLoading(false);
          return;
        }

        // Cache miss or expired - fetch fresh data
        const freshData = await fetchFn();
        setData(freshData);
        localStorage.setItem(cacheKey, JSON.stringify(freshData));
        localStorage.setItem(expiryKey, String(now + ttl));
        localStorage.setItem(versionKey, version);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        // Try to use stale cache if fetch fails
        try {
          const cachedData = localStorage.getItem(cacheKey);
          if (cachedData) {
            setData(JSON.parse(cachedData));
          }
        } catch {
          // Ignore parse errors
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [key, version, ttl, cacheKey, versionKey, expiryKey, fetchFn]);

  const refresh = async () => {
    try {
      setIsLoading(true);
      const freshData = await fetchFn();
      const now = Date.now();
      setData(freshData);
      localStorage.setItem(cacheKey, JSON.stringify(freshData));
      localStorage.setItem(expiryKey, String(now + ttl));
      localStorage.setItem(versionKey, version);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refresh };
}
