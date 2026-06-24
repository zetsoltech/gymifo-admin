import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listExercises } from '../api.ts';
import { fetchExerciseDbDataset } from '../lib/sourcing.js';

function lookupKey(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.key || String(value.id || '');
}

function lookupLabel(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.value || value.key || String(value.id || '');
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * Exercise list from the DB (replaces the prototypes' hardcoded array).
 * Returns the minimal shape sourcing needs: id, name, and whether a FINAL
 * video already exists (so the admin can skip exercises that are done).
 */
export function useSourcingExercises() {
  return useQuery({
    queryKey: ['sourcing-exercises'],
    queryFn: async () => {
      const data = await listExercises({ page: 1, limit: 1000, sortBy: 'name', sortOrder: 'ASC' });
      return toArray(data?.exercises).map((exercise) => {
        const videoUrl =
          exercise.videoUrl ?? exercise.video_url ?? exercise.videoPath ?? exercise.video_path ?? '';
        return {
          id: String(exercise.id ?? exercise._id ?? ''),
          name: exercise.name ?? exercise.exerciseName ?? exercise.title ?? '',
          hasVideo: Boolean(videoUrl),
          muscleGroupKey: lookupKey(exercise.muscleGroup ?? exercise.muscle ?? exercise.targetMuscle),
          equipmentKey: lookupKey(exercise.equipment ?? exercise.equipmentName),
          exerciseTypeKey: lookupKey(exercise.exerciseType ?? exercise.type),
          difficultyKey: lookupKey(exercise.difficultyLevel ?? exercise.difficulty),
          bodyPartKey: lookupKey(exercise.bodyPart),
          muscleGroup: lookupLabel(exercise.muscleGroup ?? exercise.muscle ?? exercise.targetMuscle),
          equipment: lookupLabel(exercise.equipment ?? exercise.equipmentName),
          exerciseType: lookupLabel(exercise.exerciseType ?? exercise.type),
          difficulty: lookupLabel(exercise.difficultyLevel ?? exercise.difficulty),
          bodyPart: lookupLabel(exercise.bodyPart),
          isWarmup: Boolean(exercise.isWarmup),
          isActive: exercise.isActive !== false,
        };
      });
    },
    staleTime: 60_000,
  });
}

/** The ExerciseDB animation dataset — fetched once, cached for the session. */
export function useExerciseDbDataset(enabled = true) {
  return useQuery({
    queryKey: ['exercisedb-dataset'],
    queryFn: fetchExerciseDbDataset,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });
}

/**
 * A localStorage-backed object store keyed by exercise id. Used for both the
 * animation picks ({ [id]: {gif,name,id} | "none" }) and the YouTube entries
 * ({ [id]: { candidates, pick, pageToken, clip } }). Sourcing decisions are
 * interim workflow state — the FINAL mp4 persists to the DB via the exercise
 * upload, not here.
 */
export function usePickStore(storeKey) {
  const [store, setStore] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storeKey) || '{}');
    } catch {
      return {};
    }
  });

  // Set one exercise's entry. `valueOrFn` is either the new value or an updater
  // (prevEntry) => newEntry. Returning undefined deletes the entry.
  const update = useCallback(
    (id, valueOrFn) => {
      setStore((prev) => {
        const next = { ...prev };
        const resolved = typeof valueOrFn === 'function' ? valueOrFn(prev[id]) : valueOrFn;
        if (resolved === undefined) delete next[id];
        else next[id] = resolved;
        try {
          localStorage.setItem(storeKey, JSON.stringify(next));
        } catch {
          /* quota/serialization failure — keep the in-memory copy */
        }
        return next;
      });
    },
    [storeKey],
  );

  const clear = useCallback(() => {
    setStore({});
    try {
      localStorage.removeItem(storeKey);
    } catch {
      /* ignore */
    }
  }, [storeKey]);

  return { store, update, clear };
}
