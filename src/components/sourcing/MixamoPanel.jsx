import { useEffect, useState } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function MixamoPanel({ exercise, pick, suggestedName, onConfirm, onToggleNone }) {
  const isNone = pick === 'none';
  const confirmed = pick && pick !== 'none' && pick.confirmed;
  const savedAnimName = pick && pick !== 'none' ? pick.animName : null;
  const [animName, setAnimName] = useState(savedAnimName ?? suggestedName ?? '');

  useEffect(() => {
    setAnimName((pick && pick !== 'none' ? pick.animName : null) ?? suggestedName ?? '');
  }, [exercise.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchUrl = `https://www.mixamo.com/#/?query=${encodeURIComponent(animName || exercise.name)}&type=Motion%2CMotionPack&limit=96&offset=0`;
  const fbxFilename = `${exercise.name.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.fbx`;
  const canConfirm = animName.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Animation name + search link */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/30 p-4">
        <span className="min-w-[130px] text-sm font-medium text-muted-foreground">Animation name:</span>
        <Input
          value={animName}
          onChange={(e) => setAnimName(e.target.value)}
          placeholder="e.g. Push Up"
          className="max-w-[260px]"
        />
        <a href={searchUrl} target="_blank" rel="noopener noreferrer">
          <Button type="button" variant="outline" size="sm">
            Search on Mixamo <ExternalLink className="ml-1 size-3" />
          </Button>
        </a>
        {suggestedName && !savedAnimName && (
          <span className="rounded bg-chart-4/15 px-2 py-0.5 text-xs text-chart-4">Auto-matched</span>
        )}
        {!suggestedName && !savedAnimName && (
          <span className="text-xs text-muted-foreground">No auto-match — enter a name manually</span>
        )}
      </div>

      {/* Download steps */}
      <ol className="space-y-1 pl-1 text-sm text-muted-foreground">
        <li>
          <span className="font-medium text-foreground/70">1.</span> Click "Search on Mixamo" above — sign in with a free
          Adobe account
        </li>
        <li>
          <span className="font-medium text-foreground/70">2.</span> Select the animation → click{' '}
          <b>Download</b>
        </li>
        <li>
          <span className="font-medium text-foreground/70">3.</span> Settings: Format <b>FBX Binary</b> · Skin{' '}
          <b>Without Skin</b> · FPS <b>30</b>
        </li>
        <li>
          <span className="font-medium text-foreground/70">4.</span> Rename the file to{' '}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">{fbxFilename}</code> and place it in{' '}
          <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">downloads/mixamo/fbx/</code>
        </li>
        <li>
          <span className="font-medium text-foreground/70">5.</span> Click "Confirm downloaded" below
        </li>
      </ol>

      {confirmed && (
        <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          <Check className="size-4 shrink-0" />
          Confirmed: <b>{pick.animName}</b>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={confirmed ? 'default' : 'secondary'}
          onClick={() => onConfirm(animName.trim() || suggestedName || exercise.name)}
          disabled={!canConfirm}
        >
          {confirmed ? (
            <>
              <Check className="size-4" /> Confirmed (re-save)
            </>
          ) : (
            'Confirm downloaded'
          )}
        </Button>
        <Button type="button" variant={isNone ? 'default' : 'outline'} onClick={onToggleNone}>
          {isNone ? (
            <>
              <Check className="size-4" /> No match (undo)
            </>
          ) : (
            'No Mixamo match'
          )}
        </Button>
      </div>
    </div>
  );
}
