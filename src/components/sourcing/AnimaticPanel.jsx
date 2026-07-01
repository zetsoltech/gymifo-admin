import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { candidatesFromAnimatic, fetchAnimaticSlugs, ANIMATIC_BASE_URL } from '../../lib/sourcing.js';

export function AnimaticPanel({ exercise, pick, onPick, onToggleNone }) {
  const [previewSlug, setPreviewSlug] = useState(null);

  const { data: slugs, isLoading, isError } = useQuery({
    queryKey: ['animatic-slugs'],
    queryFn: fetchAnimaticSlugs,
    staleTime: Infinity,
  });

  const candidates = useMemo(
    () => candidatesFromAnimatic(exercise.name, slugs || []),
    [exercise.name, slugs],
  );

  const isNone = pick === 'none';
  const hasPick = pick && pick !== 'none';
  const previewName = previewSlug
    ? (candidates.find((c) => c.slug === previewSlug)?.name || previewSlug.replace(/-/g, ' '))
    : '';

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-10 text-center text-sm text-destructive">
        Failed to load ExerciseAnimatic catalogue — check your connection.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {candidates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            No close match found in the ExerciseAnimatic catalogue — mark &ldquo;no match&rdquo; or{' '}
            <a
              href="https://www.exerciseanimatic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              browse the site manually <ExternalLink className="inline size-3" />
            </a>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {candidates.map((c, i) => {
              const selected = hasPick && pick.slug === c.slug;
              return (
                <div
                  key={c.slug}
                  className={`flex flex-col gap-2 overflow-hidden rounded-lg border p-3 transition-colors ${
                    selected ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <span className="flex size-5 items-center justify-center self-start rounded-full bg-secondary text-xs font-medium">
                    {i + 1}
                  </span>
                  <p className="min-h-[2.5rem] text-xs font-medium capitalize leading-snug">{c.name}</p>
                  <div className="mt-auto flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => setPreviewSlug(c.slug)}
                    >
                      Preview
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={selected ? 'default' : 'secondary'}
                      className="flex-1 text-xs"
                      onClick={() => onPick(selected ? null : c)}
                    >
                      {selected ? (
                        <>
                          <Check className="size-3" /> Picked
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

        <div className="flex flex-wrap gap-2">
          {hasPick && (
            <a href={pick.url} target="_blank" rel="noopener noreferrer">
              <Button type="button" variant="outline" size="sm">
                View on ExerciseAnimatic <ExternalLink className="ml-1 size-3" />
              </Button>
            </a>
          )}
          <Button type="button" variant={isNone ? 'default' : 'outline'} onClick={onToggleNone}>
            {isNone ? (
              <>
                <Check className="size-4" /> No match (undo)
              </>
            ) : (
              'No Animatic match'
            )}
          </Button>
        </div>
      </div>

      {previewSlug && (
        <Dialog open onOpenChange={() => setPreviewSlug(null)}>
          <DialogContent className="flex h-[88vh] max-w-5xl flex-col p-0">
            <DialogHeader className="shrink-0 px-5 pb-2 pt-4">
              <DialogTitle className="text-sm capitalize">{previewName}</DialogTitle>
            </DialogHeader>
            {/* eslint-disable-next-line jsx-a11y/iframe-has-title */}
            <iframe
              src={`${ANIMATIC_BASE_URL}${previewSlug}`}
              className="min-h-0 flex-1 rounded-b-lg border-0"
              title={previewName}
              allow="autoplay; fullscreen"
              loading="lazy"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
