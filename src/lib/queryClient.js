import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner';

/**
 * Single switch for client-side caching.
 *
 *   false → caching OFF. Every query is always stale, never kept in memory,
 *           and refetches fresh on every mount. (current default)
 *   true  → caching ON. Data is reused for `staleTime`, kept for `gcTime`,
 *           and not refetched on remount while still fresh.
 *
 * Flip this one flag to turn caching on/off. You can also override it at
 * runtime with VITE_QUERY_CACHE=on in the .env file.
 */
const envCache = String(import.meta.env.VITE_QUERY_CACHE ?? '').toLowerCase();
export const CACHE_ENABLED = envCache === 'on' || envCache === 'true' || envCache === '1';

const cacheOptions = CACHE_ENABLED
  ? {
      staleTime: 60_000, // data is "fresh" for 1 min
      gcTime: 5 * 60_000, // unused data kept in memory for 5 min
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  : {
      staleTime: 0, // always stale
      gcTime: 0, // never retained
      refetchOnMount: 'always', // always hit the API on mount
      refetchOnWindowFocus: false,
    };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: CACHE_ENABLED ? 1 : 0,
      ...cacheOptions,
    },
    mutations: {
      retry: 0,
    },
  },
  // Toast any failed data load automatically (end-to-end error surfacing).
  queryCache: new QueryCache({
    onError: (error) => {
      toast.error(error?.message || 'Unable to load data.');
    },
  }),
  // Toast any failed mutation automatically.
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(error?.message || 'Action failed.');
    },
  }),
});
