"use client";

import React, { createContext, useContext, useMemo, useRef, useState } from "react";

type LoadingContextValue = {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
  withLoading: <T>(promise: Promise<T>) => Promise<T>;
};

const LoadingContext = createContext<LoadingContextValue | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const timerRef = useRef<number | null>(null);

  const startLoading = () => {
    setCount((c) => c + 1);
    // Clear any pending auto-stop to allow chained asyncs
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopLoading = () => {
    setCount((c) => Math.max(0, c - 1));
  };

  const withLoading = async <T,>(promise: Promise<T>): Promise<T> => {
    startLoading();
    try {
      const result = await promise;
      return result;
    } finally {
      stopLoading();
    }
  };

  const isLoading = count > 0;

  const value = useMemo<LoadingContextValue>(() => ({
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  }), [isLoading]);

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading must be used within LoadingProvider");
  return ctx;
}
