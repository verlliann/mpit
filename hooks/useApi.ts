import { useState, useEffect, useCallback } from 'react';
import { ApiError } from '../api/client';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions<T> {
  initialData?: T | null;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
  immediate?: boolean;
}

/**
 * Generic hook for API calls with loading and error states
 */
export function useApi<T, Args extends any[] = []>(
  apiFunction: (...args: Args) => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const { initialData = null, onSuccess, onError, immediate = false } = options;

  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    loading: immediate,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args) => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const data = await apiFunction(...args);
        setState({ data, loading: false, error: null });
        onSuccess?.(data);
        return data;
      } catch (err) {
        const errorMessage = err instanceof ApiError 
          ? err.message 
          : 'An unexpected error occurred';
        
        setState({ data: null, loading: false, error: errorMessage });
        onError?.(errorMessage);
        throw err;
      }
    },
    [apiFunction, onSuccess, onError]
  );

  const reset = useCallback(() => {
    setState({ data: initialData, loading: false, error: null });
  }, [initialData]);

  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args));
    }
  }, [immediate]);

  return {
    ...state,
    execute,
    reset,
    setData: (data: T | null) => setState(prev => ({ ...prev, data })),
  };
}

/**
 * Hook for paginated API calls
 */
export function usePaginatedApi<T, P extends { page?: number } = { page?: number }>(
  apiFunction: (params: P) => Promise<{ items: T[]; total: number; pages: number }>,
  initialParams: P = {} as P
) {
  const [params, setParams] = useState<P>(initialParams);
  const [allData, setAllData] = useState<T[]>([]);

  const { data, loading, error, execute } = useApi(apiFunction, {
    onSuccess: (response) => {
      if (params.page === 1) {
        setAllData(response.items);
      } else {
        setAllData(prev => [...prev, ...response.items]);
      }
    },
  });

  const loadMore = useCallback(() => {
    if (data && params.page && params.page < data.pages) {
      setParams((prev: P) => ({ ...prev, page: (prev.page || 1) + 1 } as P));
    }
  }, [data, params.page]);

  const refresh = useCallback(() => {
    setParams((prev: P) => ({ ...prev, page: 1 } as P));
    setAllData([]);
  }, []);

  useEffect(() => {
    execute(params);
  }, [params]);

  return {
    items: allData,
    total: data?.total || 0,
    pages: data?.pages || 0,
    currentPage: params.page || 1,
    loading,
    error,
    loadMore,
    refresh,
    setParams,
    hasMore: data ? (params.page || 1) < data.pages : false,
  };
}

/**
 * Hook for mutations (create, update, delete)
 */
export function useMutation<T, Args extends any[] = []>(
  mutationFunction: (...args: Args) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
  } = {}
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (...args: Args) => {
      setLoading(true);
      setError(null);

      try {
        const data = await mutationFunction(...args);
        options.onSuccess?.(data);
        return data;
      } catch (err) {
        const errorMessage = err instanceof ApiError 
          ? err.message 
          : 'An unexpected error occurred';
        
        setError(errorMessage);
        options.onError?.(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [mutationFunction, options]
  );

  return {
    mutate,
    loading,
    error,
    reset: () => setError(null),
  };
}


