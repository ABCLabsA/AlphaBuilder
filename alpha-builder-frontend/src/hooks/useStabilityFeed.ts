import { useCallback, useEffect, useRef, useState } from 'react';

export interface StabilityItem {
  n: string; // name/symbol
  p: number | string; // price
  spr: number | string; // spread in bps
  md: number | string; // days metric
  st: string; // status e.g. 'green', 'yellow', 'red'
}

export interface StabilityFeedData {
  items: StabilityItem[];
}

interface UseStabilityFeedOptions {
  url?: string;
  intervalMs?: number;
}

export function useStabilityFeed(options: UseStabilityFeedOptions = {}) {
  const { url = '/api/stability/stability_feed_v2.json', intervalMs = 7000 } = options;

  const [data, setData] = useState<StabilityFeedData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const isMountedRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchOnce = useCallback(async () => {
    try {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const json = (await res.json()) as StabilityFeedData;
      if (!isMountedRef.current) return;
      setData(json);
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      if ((err as any)?.name === 'AbortError') return;
      setError(err as Error);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchOnce();
    const id = window.setInterval(fetchOnce, intervalMs);
    return () => {
      isMountedRef.current = false;
      controllerRef.current?.abort();
      window.clearInterval(id);
    };
  }, [fetchOnce, intervalMs]);

  return { data, error, loading, reload: fetchOnce } as const;
}

