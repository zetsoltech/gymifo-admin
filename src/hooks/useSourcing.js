import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listExercises } from '../api.ts';
import { fetchExerciseDbDataset } from '../lib/sourcing.js';

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
