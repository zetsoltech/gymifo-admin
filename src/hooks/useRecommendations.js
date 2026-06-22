import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteRecommendation,
  getRecommendation,
  listRecommendations,
  saveRecommendation,
  setRecommendationActive,
} from '../api.ts';

const recommendationsKey = (params) => ['recommendations', params];

export function useRecommendationsQuery(params) {
  return useQuery({
    queryKey: recommendationsKey(params),
    queryFn: () => listRecommendations(params),
    placeholderData: (previous) => previous,
  });
}

export function useRecommendationDetail(id) {
  return useQuery({
    queryKey: ['recommendation', id],
    queryFn: () => getRecommendation(id),
    enabled: Boolean(id),
  });
}

const saveToastId = 'save-recommendation';
const deleteToastId = 'delete-recommendation';
const statusToastId = 'recommendation-status';

export function useSaveRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => saveRecommendation(payload),
    onMutate: (payload) => {
      const hasMedia = Boolean(payload.image || payload.video || payload.deleteImageUrl || payload.deleteVideoUrl);
      const action = payload.id ? 'Updating recommendation...' : 'Creating recommendation...';
      toast.loading(
        hasMedia ? 'Uploading media...' : action,
        { id: saveToastId, duration: Infinity },
      );
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      toast.success(payload.id ? 'Recommendation updated.' : 'Recommendation created.', {
        id: saveToastId,
        duration: 4000,
      });
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to save recommendation.', {
        id: saveToastId,
        duration: 6000,
      });
    },
  });
}

export function useDeleteRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteRecommendation(id),
    onMutate: () => {
      toast.loading('Deleting recommendation...', { id: deleteToastId, duration: Infinity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      toast.success('Recommendation deleted.', { id: deleteToastId, duration: 4000 });
    },
    onError: (error) => {
      toast.error(error?.message || 'Unable to delete recommendation.', {
        id: deleteToastId,
        duration: 6000,
      });
    },
  });
}

export function useToggleRecommendationActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => setRecommendationActive(id, isActive),
    onMutate: async ({ id, isActive }) => {
      toast.loading(isActive ? 'Activating recommendation...' : 'Disabling recommendation...', {
        id: statusToastId,
        duration: Infinity,
      });
      await queryClient.cancelQueries({ queryKey: ['recommendations'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['recommendations'] });
      snapshots.forEach(([key, data]) => {
        if (!data || !Array.isArray(data.recommendations)) return;
        queryClient.setQueryData(key, {
          ...data,
          recommendations: data.recommendations.map((recommendation) =>
            String(recommendation.id ?? recommendation._id) === String(id)
              ? { ...recommendation, isActive }
              : recommendation,
          ),
        });
      });
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data));
      toast.error('Unable to update recommendation status.', {
        id: statusToastId,
        duration: 6000,
      });
    },
    onSuccess: (_data, { isActive }) => {
      toast.success(isActive ? 'Recommendation activated.' : 'Recommendation disabled.', {
        id: statusToastId,
        duration: 4000,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    },
  });
}
