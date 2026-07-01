import { Check, ExternalLink, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function StockPanel({ exercise, entry, pexelsKey, fetching, onFetch, onSearchOthers, onPick, onToggleNone }) {
  const candidates = entry?.candidates;
  const pick = entry?.pick;
  const isNone = pick === 'none';
  const hasPick = pick && pick !== 'none';

  if (!pexelsKey) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
        <Search className="size-8 opacity-30" />
        <p>Paste your Pexels API key in the controls above to search stock footage.</p>
        <a
          href="https://www.pexels.com/api/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          Get a free Pexels API key <ExternalLink className="size-3" />
        </a>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!candidates) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
        <p>No results loaded yet.</p>
        <Button type="button" variant="outline" onClick={onFetch}>
          <Search className="size-4" /> Search Pexels for &ldquo;{exercise.name}&rdquo;
        </Button>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted-foreground">
        <p>No Pexels videos found for &ldquo;{exercise.name}&rdquo;.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={onFetch}>
            <Search className="size-4" /> Retry search
          </Button>
          <Button type="button" variant={isNone ? 'default' : 'outline'} onClick={onToggleNone}>
            {isNone ? (
              <>
                <Check className="size-4" /> No match (undo)
              </>
            ) : (
              'No stock match'
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {candidates.map((v, i) => {
          const selected = hasPick && pick.id === v.id;
          return (
            <div
              key={v.id}
              className={`flex flex-col overflow-hidden rounded-lg border transition-colors ${
                selected ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              <div className="relative aspect-video bg-muted">
                <span className="absolute left-1.5 top-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-background/80 text-xs font-medium">
                  {i + 1}
                </span>
                <img
                  src={v.thumbnail}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-xs text-white">
                  {v.duration}s
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2.5">
                <p className="truncate text-xs text-muted-foreground">
                  by {v.user} ·{' '}
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Pexels ↗
                  </a>
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant={selected ? 'default' : 'secondary'}
                  className="mt-auto w-full"
                  onClick={() => onPick(selected ? null : v)}
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

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={isNone ? 'default' : 'outline'} onClick={onToggleNone}>
          {isNone ? (
            <>
              <Check className="size-4" /> No match (undo)
            </>
          ) : (
            'No stock match'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onSearchOthers}>
          Search others
        </Button>
      </div>
    </div>
  );
}
