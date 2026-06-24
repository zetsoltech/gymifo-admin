import { Check, Download, ExternalLink, RotateCw, Scissors } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * YouTube candidates for one exercise. Embeds up to 6 results (one exercise on
 * screen at a time, so only 6 iframes load). The admin picks one, optionally
 * marks a clip segment, or pages to a fresh set with "Search others".
 */
export function YoutubePanel({
  exercise,
  entry,
  ytKey,
  fetching,
  onFetch,
  onSearchOthers,
  onPick,
  onToggleNone,
  onOpenClip,
}) {
  const candidates = entry?.candidates;
  const pick = entry?.pick;
  const markedNone = pick === 'none';
  const hasPick = pick && pick !== 'none';
  const clip = entry?.clip;

  if (!ytKey) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Paste your YouTube Data API key in the header to fetch videos.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {fetching ? (
        <p className="px-1 py-10 text-center text-sm text-muted-foreground">Fetching videos for “{exercise.name}”…</p>
      ) : !candidates ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">Not fetched yet.</p>
          <Button type="button" onClick={onFetch}>
            <Download className="size-4" /> Fetch videos
          </Button>
        </div>
      ) : candidates.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No results — flag this one for manual sourcing.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {candidates.map((c, i) => {
            const selected = pick === c.url;
            return (
              <div
                key={c.url}
                className={`flex flex-col overflow-hidden rounded-xl border-2 bg-card transition-colors ${
                  selected ? 'border-primary' : 'border-border'
                }`}
              >
                <div className="relative aspect-video bg-black">
                  <span className="absolute left-1.5 top-1.5 z-[2] flex h-[22px] w-[22px] items-center justify-center rounded-md bg-black/70 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <iframe
                    loading="lazy"
                    src={`https://www.youtube.com/embed/${c.videoId}`}
                    title={c.title}
                    allowFullScreen
                    className="h-full w-full border-0"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-2.5">
                  <div className="line-clamp-2 text-xs leading-snug text-card-foreground">{c.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {c.channel} ·{' '}
                    <a
                      href={c.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-primary hover:underline"
                    >
                      YouTube <ExternalLink className="size-3" />
                    </a>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? 'default' : 'secondary'}
                    className="mt-auto w-full"
                    onClick={() => onPick(selected ? null : c.url)}
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

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant={markedNone ? 'default' : 'outline'} onClick={onToggleNone}>
          {markedNone ? '✓ Marked none (undo)' : "Mark 'none good'"}
        </Button>
        {candidates && (
          <Button type="button" variant="outline" onClick={onSearchOthers} disabled={fetching}>
            <RotateCw className="size-4" /> Search others (new 6)
          </Button>
        )}
        {hasPick && (
          <Button type="button" variant={clip ? 'default' : 'outline'} onClick={onOpenClip}>
            <Scissors className="size-4" />
            {clip ? `Clip set (${(clip.end - clip.start).toFixed(1)}s) — edit` : 'Set clip'}
          </Button>
        )}
      </div>
    </div>
  );
}
