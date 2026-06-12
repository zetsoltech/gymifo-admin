import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteExercise,
  getExercise,
  listExercises,
  listLookups,
  saveExercise,
  setExerciseActive,
} from '../api.ts';

const exercisesKey = (params) => ['exercises', params];
const lookupsKey = ['lookups'];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

/** Paginated/filtered exercise list. Re-runs whenever params change. */
export function useExercisesQuery(params) {
  return useQuery({
    queryKey: exercisesKey(params),
    queryFn: () => listExercises(params),
    placeholderData: (previous) => previous, // keep old rows visible while refetching
  });
}

/** All lookup categories loaded together as one cache entry. */
export function useLookupsQuery() {
  return useQuery({
    queryKey: lookupsKey,
    queryFn: async () => {
      const [
        muscleGroups,
        equipment,
        exerciseTypes,
        difficultyLevels,
        bodyParts,
        bodyAreas,
        movementPatterns,
        progressionGroups,
      ] = await Promise.all([
        listLookups('muscle_group'),
        listLookups('equipment'),
        listLookups('exercise_type'),
        listLookups('fitness_level'),
        listLookups('body_part'),
        listLookups('body_area'),
        listLookups('movement_pattern'),
        listLookups('progression_group'),
      ]);
      return {
        muscleGroups: toArray(muscleGroups),
        equipment: toArray(equipment),
        exerciseTypes: toArray(exerciseTypes),
        difficultyLevels: toArray(difficultyLevels),
        bodyParts: toArray(bodyParts),
        bodyAreas: toArray(bodyAreas),
        movementPatterns: toArray(movementPatterns),
        progressionGroups: toArray(progressionGroups),
      };
    },
  });
}

/**
 * Full detail for one exercise (GET /exercises/:id). The list rows may not
 * carry every relation, so the edit form fetches the complete record.
 */
export function useExerciseDetail(id) {
  return useQuery({
    queryKey: ['exercise', id],
    queryFn: () => getExercise(id),
    enabled: Boolean(id),
  });
}

/**
 * Lightweight list of exercises (id + name) used to populate the
 * progression / regression pickers.
 */
export function useExerciseOptions(enabled = true) {
  return useQuery({
    queryKey: ['exercise-options'],
    queryFn: async () => {
      const data = await listExercises({ page: 1, limit: 1000 });
      return toArray(data?.exercises).map((exercise) => ({
        id: exercise.id ?? exercise._id,
        name: exercise.name ?? '',
      }));
    },
    enabled,
  });
}

const saveToastId = 'save-exercise';

/** Create/update an exercise, then refresh the list. */
export function useSaveExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => saveExercise(payload),
    // Keep a loading toast up while the request (and any media upload) runs.
    onMutate: (payload) => {
      const hasMedia = Boolean(payload.images?.length || payload.video);
      toast.loading(
        hasMedia ? 'Uploading media… this may take a moment.' : 'Saving exercise…',
        { id: saveToastId, duration: Infinity },
      );
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success(payload.id ? 'Exercise updated.' : 'Exercise created.', {
        id: saveToastId,
        duration: 4000,
      });
    },
    onError: () => {
      // Drop the loading toast; the error toast is shown globally by the mutation cache.
      toast.dismiss(saveToastId);
    },
  });
}

/** Delete an exercise, then refresh the list. */
export function useDeleteExercise() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
      toast.success('Exercise deleted.');
    },
  });
}

/** Toggle an exercise active/inactive with an optimistic UI update. */
export function useToggleExerciseActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => setExerciseActive(id, isActive),
    // Optimistically flip the row so the switch responds instantly.
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['exercises'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['exercises'] });
      snapshots.forEach(([key, data]) => {
        if (!data || !Array.isArray(data.exercises)) return;
        queryClient.setQueryData(key, {
          ...data,
          exercises: data.exercises.map((exercise) =>
            String(exercise.id ?? exercise._id) === String(id) ? { ...exercise, isActive } : exercise,
          ),
        });
      });
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      // Roll back on failure (the error toast is shown globally).
      context?.snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (_data, { isActive }) => {
      toast.success(isActive ? 'Exercise activated.' : 'Exercise disabled.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}
