import { useQueries } from '@tanstack/react-query';
import {
  getDashboardOverview,
  getPaidVsFree,
  getRevenue,
  getSignupsTrend,
} from '../api.ts';

/**
 * Loads all four dashboard datasets for a given period.
 * Each is its own cache entry keyed by period, so switching periods
 * reuses previously loaded data when caching is enabled.
 */
export function useDashboard(period) {
  const results = useQueries({
    queries: [
      { queryKey: ['dashboard', 'overview', period], queryFn: () => getDashboardOverview(period) },
      { queryKey: ['dashboard', 'signups-trend', period], queryFn: () => getSignupsTrend(period) },
      { queryKey: ['dashboard', 'paid-vs-free', period], queryFn: () => getPaidVsFree(period) },
      { queryKey: ['dashboard', 'revenue', period], queryFn: () => getRevenue(period) },
    ],
  });

  const [overview, signupsTrend, paidVsFree, revenue] = results;

  return {
    overview: overview.data,
    signupsTrend: signupsTrend.data,
    paidVsFree: paidVsFree.data,
    revenue: revenue.data,
    isLoading: results.some((result) => result.isPending),
    isFetching: results.some((result) => result.isFetching),
    isError: results.some((result) => result.isError),
  };
}
