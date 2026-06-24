import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { candidatesFor } from '../../lib/sourcing.js';
import { Button } from '@/components/ui/button';

/**
 * ExerciseDB animation candidates for one exercise. The admin picks one GIF (or
 * marks "none good"). GIF frames keep a white background because the ExerciseDB
 * renders assume a light surface.
 */
export function AnimationPanel({ exercise, dataset, datasetLoading, datasetError, pick, onPick, onToggleNone }) {
  const candidates = useMemo(
    () => candidatesFor(exercise.name, dataset || []),
    [exercise.name, dataset],
  );

  const markedNone = pick === 'none';
  const pickedGif = pick && pick !== 'none' ? pick.gif : null;

  if (datasetLoading) {
    return <p className="px-1 py-10 text-center text-sm text-muted-foreground">Loading ExerciseDB dataset…</p>;
  }
  if (datasetError) {
    return (
      <p className="px-1 py-10 text-center text-sm text-destructive">
        Failed to load the ExerciseDB dataset — check your connection and reload.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {candidates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No close match in the dataset — mark “none good” and source this one manually.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          {candidates.map((c, i) => {
            const selected = pickedGif === c.gif;
            return (
              <div
                key={c.gif}
                className={`flex flex-col overflow-hidden rounded-xl border-2 bg-card transition-colors ${
                  selected ? 'border-primary' : 'border-border'
                }`}
              >
                <div className="relative aspect-square bg-white">
                  <span className="absolute left-1.5 top-1.5 z-[2] flex h-[22px] w-[22px] items-center justify-center rounded-md bg-black/70 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <img loading="lazy" src={c.gif} alt={c.name} className="h-full w-full object-contain" />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2.5">
                  <div className="text-xs capitalize leading-snug text-card-foreground">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {[c.target, c.equipment].filter(Boolean).join(' · ')}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? 'default' : 'secondary'}
                    className="mt-auto w-full"
                    onClick={() => onPick(selected ? null : c)}
                  >
                    {selected ? (
                      <>
                        <Check className="size-3.5" /> Selected
                      </>
                    ) : (
                      'Select'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button type="button" variant={markedNone ? 'default' : 'outline'} onClick={onToggleNone}>
        {markedNone ? '✓ Marked none (undo)' : "Mark 'none good'"}
      </Button>
    </div>
  );
}
