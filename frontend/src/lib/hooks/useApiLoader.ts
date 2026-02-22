import { useState, useEffect } from 'react';

interface UseApiLoaderOptions<T> {
  loader: () => Promise<T>;
  deps?: unknown[];
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseApiLoaderResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Custom hook for loading data from API with cancellation support.
 * Handles loading state, error state, and cleanup automatically.
 */
export function useApiLoader<T>({
  loader,
  deps = [],
  onSuccess,
  onError,
}: UseApiLoaderOptions<T>): UseApiLoaderResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await loader();
        if (cancelled) return;

        setData(result);
        onSuccess?.(result);
      } catch (err) {
        if (cancelled) return;

        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [...deps, reloadTrigger]);

  const reload = () => setReloadTrigger(prev => prev + 1);

  return { data, isLoading, error, reload };
}
