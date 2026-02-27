"use client";

import { useState, useEffect, useRef } from "react";
import { useDataService } from "@/lib/data-context";
import type { DataService } from "@/lib/data-service";

type DataServiceMethod = {
  [K in keyof DataService]: DataService[K] extends () => Promise<infer R> ? R : never;
};

/** Simple in-memory cache shared across hook instances. */
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30_000; // 30 seconds

interface UseDataResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Fetch data from the active DataService (demo or live).
 * Caches results in memory for 30 seconds to avoid redundant calls on re-renders.
 */
export function useData<K extends keyof DataService>(key: K): UseDataResult<DataServiceMethod[K]> {
  const { service, isDemoMode } = useDataService();
  const [data, setData] = useState<DataServiceMethod[K] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const cacheKey = `${isDemoMode ? "demo" : "live"}:${key}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL && refreshCounter === 0) {
      setData(cached.data as DataServiceMethod[K]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const method = service[key] as () => Promise<DataServiceMethod[K]>;
    method
      .call(service)
      .then((result) => {
        if (!mountedRef.current) return;
        cache.set(cacheKey, { data: result, timestamp: Date.now() });
        setData(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsLoading(false);
      });
  }, [service, key, isDemoMode, refreshCounter]);

  const refresh = () => {
    const cacheKey = `${isDemoMode ? "demo" : "live"}:${key}`;
    cache.delete(cacheKey);
    setRefreshCounter((c) => c + 1);
  };

  return { data, isLoading, error, refresh };
}
