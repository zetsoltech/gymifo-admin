import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Download, Film, Trash2, Video } from 'lucide-react';
import { useSourcingExercises, useExerciseDbDataset, usePickStore } from '../hooks/useSourcing.js';
import {
  ANIM_STORE_KEY,
  YT_STORE_KEY,
  YT_API_KEY_STORE,
  candidatesFor,
  searchYouTube,
  ytErrorMessage,
  buildAnimationExport,
  buildYoutubeExport,
  downloadTextFile,
} from '../lib/sourcing.js';
import { AnimationPanel } from '../components/sourcing/AnimationPanel.jsx';
import { YoutubePanel } from '../components/sourcing/YoutubePanel.jsx';
import { ClipEditorModal } from '../components/sourcing/ClipEditorModal.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_STYLES = {
  picked: 'bg-primary/15 text-primary',
  pending: 'bg-chart-4/15 text-chart-4',
  none: 'bg-destructive/15 text-destructive',
};
const STATUS_LABEL = { picked: 'Picked', pending: 'Pending', none: 'None' };

function StatusBadge({ status }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SourcingPage({ showToast }) {
  const [mode, setMode] = useState('animation'); // 'animation' | 'youtube'
  const [ytKey, setYtKey] = useState(() => localStorage.getItem(YT_API_KEY_STORE) || '');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | pending | picked | none
  const [hideCompleted, setHideCompleted] = useState(false);
  const [index, setIndex] = useState(0);
  const [reps, setReps] = useState(3);
  const [fetchingId, setFetchingId] = useState(null);
  const [clipId, setClipId] = useState(null);

  const { data: exercises = [], isLoading, isError } = useSourcingExercises();
  const { data: dataset, isLoading: datasetLoading, isError: datasetError } = useExerciseDbDataset(
    mode === 'animation',
  );
  const animStore = usePickStore(ANIM_STORE_KEY);
  const ytStore = usePickStore(YT_STORE_KEY);

  const activeStore = mode === 'animation' ? animStore : ytStore;

  const statusOf = useCallback(
    (id) => {
      if (mode === 'animation') {
        const p = animStore.store[id];
        if (p === 'none') return 'none';
        return p ? 'picked' : 'pending';
      }
      const e = ytStore.store[id];
      if (e?.pick === 'none') return 'none';
      return e?.pick ? 'picked' : 'pending';
    },
    [mode, animStore.store, ytStore.store],
  );

  // Filtered, ordered list the navigator walks through.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => {
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      if (hideCompleted && ex.hasVideo) return false;
      if (filter !== 'all' && statusOf(ex.id) !== filter) return false;
      return true;
    });
  }, [exercises, search, filter, hideCompleted, statusOf]);

  // Keep the cursor in range as filters change.
  useEffect(() => {
    setIndex((i) => Math.min(Math.max(0, i), Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const current = filtered[Math.min(index, Math.max(0, filtered.length - 1))] || null;

  // Aggregate counts across ALL exercises for the active mode.
  const counts = useMemo(() => {
    const c = { picked: 0, pending: 0, none: 0 };
    exercises.forEach((ex) => {
      c[statusOf(ex.id)] += 1;
    });
    return c;
  }, [exercises, statusOf]);

  // ── YouTube fetching ───────────────────────────────────────────────────────
  const fetchYoutube = useCallback(
    async (ex, { force = false } = {}) => {
      if (!ex || !ytKey) return;
      const entry = ytStore.store[ex.id];
      if (!force && entry?.candidates) return;
      setFetchingId(ex.id);
      try {
        const { items, nextPageToken } = await searchYouTube(ytKey, ex.name);
        ytStore.update(ex.id, (prev) => ({
          candidates: items,
          pick: prev?.pick ?? null,
          pageToken: nextPageToken,
          clip: prev?.clip,
        }));
      } catch (err) {
        showToast?.(ytErrorMessage(err), 'error');
      } finally {
        setFetchingId(null);
      }
    },
    [ytKey, ytStore, showToast],
  );

  const searchOthers = useCallback(
    async (ex) => {
      if (!ex || !ytKey) return;
      setFetchingId(ex.id);
      try {
        const token = ytStore.store[ex.id]?.pageToken || undefined;
        let { items, nextPageToken } = await searchYouTube(ytKey, ex.name, token);
        if (items.length === 0 && token) {
          ({ items, nextPageToken } = await searchYouTube(ytKey, ex.name)); // wrap around
        }
        // New videos → reset the pick (it referenced an old url), keep any clip cleared.
        ytStore.update(ex.id, () => ({ candidates: items, pick: null, pageToken: nextPageToken }));
        showToast?.(items.length ? `New results loaded for ${ex.name}.` : `No more results for ${ex.name}.`, 'info');
      } catch (err) {
        showToast?.(ytErrorMessage(err), 'error');
      } finally {
        setFetchingId(null);
      }
    },
    [ytKey, ytStore, showToast],
  );

  // Auto-fetch the landed exercise's videos in YouTube mode — but not if it's
  // already fetched or explicitly marked "none" (don't waste quota).
  useEffect(() => {
    if (mode !== 'youtube' || !current || !ytKey) return;
    const entry = ytStore.store[current.id];
    if (!entry?.candidates && entry?.pick !== 'none') fetchYoutube(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, current?.id, ytKey]);

  // ── Pick handlers ────────────────────────────────────────────────────────
  const pickAnimation = useCallback(
    (candidate) => {
      if (!current) return;
      animStore.update(current.id, candidate ? { gif: candidate.gif, name: candidate.name, id: candidate.id } : undefined);
    },
    [current, animStore],
  );
  const toggleAnimationNone = useCallback(() => {
    if (!current) return;
    animStore.update(current.id, (prev) => (prev === 'none' ? undefined : 'none'));
  }, [current, animStore]);

  const pickYoutube = useCallback(
    (url) => {
      if (!current) return;
      ytStore.update(current.id, (prev) => ({ ...(prev || { candidates: undefined, pageToken: null }), pick: url ?? null }));
    },
    [current, ytStore],
  );
  const toggleYoutubeNone = useCallback(() => {
    if (!current) return;
    ytStore.update(current.id, (prev) => {
      const base = prev || { candidates: undefined, pageToken: null, pick: null };
      return { ...base, pick: base.pick === 'none' ? null : 'none' };
    });
  }, [current, ytStore]);

  const saveClip = useCallback(
    (clip) => {
      if (!clipId) return;
      ytStore.update(clipId, (prev) => ({ ...prev, clip }));
      setClipId(null);
    },
    [clipId, ytStore],
  );

  // ── Navigation ───────────────────────────────────────────────────────────
  const goTo = useCallback(
    (i) => {
      setIndex(Math.min(Math.max(0, i), Math.max(0, filtered.length - 1)));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filtered.length],
  );

  // ── Export ───────────────────────────────────────────────────────────────
  const byId = useMemo(() => {
    const m = new Map();
    exercises.forEach((ex) => m.set(ex.id, ex));
    return m;
  }, [exercises]);

  function handleExport() {
    if (mode === 'animation') {
      const picks = Object.entries(animStore.store)
        .filter(([, v]) => v && v !== 'none')
        .map(([id, v]) => ({ exercise: byId.get(id)?.name || id, exerciseId: id, ...v }));
      if (!picks.length) {
        showToast?.('No animation picks to export yet.', 'info');
        return;
      }
      const { json, sh, count, reps: r } = buildAnimationExport(picks, reps);
      downloadTextFile('gymifo_anim_picks.json', json);
      downloadTextFile('download.sh', sh);
      showToast?.(`Exported ${count} animation picks (looped to ${r} reps) → run: bash download.sh`, 'success');
    } else {
      const picks = Object.entries(ytStore.store)
        .filter(([, v]) => v?.pick && v.pick !== 'none')
        .map(([id, v]) => {
          const c = (v.candidates || []).find((x) => x.url === v.pick);
          return {
            exercise: byId.get(id)?.name || id,
            exerciseId: id,
            url: v.pick,
            title: c?.title || '',
            channel: c?.channel || '',
            clip: v.clip || null,
          };
        });
      if (!picks.length) {
        showToast?.('No YouTube picks to export yet.', 'info');
        return;
      }
      const { json, sh, count, clipped } = buildYoutubeExport(picks);
      downloadTextFile('gymifo_yt_picks.json', json);
      downloadTextFile('download.sh', sh);
      showToast?.(`Exported ${count} YouTube picks (${clipped} with clips) → run: bash download.sh`, 'success');
    }
  }

  function handleClear() {
    const label = mode === 'animation' ? 'animation' : 'YouTube';
    if (!confirm(`Clear all ${label} picks? This cannot be undone.`)) return;
    activeStore.clear();
    showToast?.(`${label[0].toUpperCase()}${label.slice(1)} picks cleared.`, 'info');
  }

  // ── Keyboard shortcuts (latest-state via ref to avoid heavy re-binding) ──
  const kbd = useRef({});
  kbd.current = {
    mode,
    current,
    dataset,
    clipOpen: Boolean(clipId),
    ytEntry: current ? ytStore.store[current.id] : null,
    next: () => goTo(index + 1),
    prev: () => goTo(index - 1),
    pickAnimation,
    pickYoutube,
    toggleNone: mode === 'animation' ? toggleAnimationNone : toggleYoutubeNone,
    openClip: () => {
      if (mode === 'youtube' && current) {
        const e = ytStore.store[current.id];
        if (e?.pick && e.pick !== 'none') setClipId(current.id);
      }
    },
    fetchYt: () => {
      if (mode !== 'youtube' || !current) return;
      ytStore.store[current.id]?.candidates ? searchOthers(current) : fetchYoutube(current);
    },
  };

  useEffect(() => {
    function onKey(e) {
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      const k = kbd.current;
      if (k.clipOpen || !k.current) return;
      if (e.key === 'ArrowRight') k.next();
      else if (e.key === 'ArrowLeft') k.prev();
      else if (e.key.toLowerCase() === 'n') k.toggleNone();
      else if (k.mode === 'youtube' && e.key.toLowerCase() === 'c') k.openClip();
      else if (k.mode === 'youtube' && e.key.toLowerCase() === 'f') k.fetchYt();
      else if (e.key >= '1' && e.key <= '8') {
        const n = parseInt(e.key, 10);
        if (k.mode === 'animation') {
          const c = candidatesFor(k.current.name, k.dataset || [])[n - 1];
          if (c) k.pickAnimation(c);
        } else if (n <= 6) {
          const c = k.ytEntry?.candidates?.[n - 1];
          if (c) k.pickYoutube(c.url);
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  const clipExercise = clipId ? byId.get(clipId) : null;
  const clipEntry = clipId ? ytStore.store[clipId] : null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sourcing</h1>
          <p className="text-sm text-muted-foreground">
            Pick a reference per exercise, then export a download script. Final videos still upload on the Exercises tab.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-1">
          <Button
            type="button"
            size="sm"
            variant={mode === 'animation' ? 'default' : 'ghost'}
            onClick={() => {
              setMode('animation');
              setIndex(0);
            }}
          >
            <Film className="size-4" /> Animations
          </Button>
          <Button
            type="button"
            size="sm"
            variant={mode === 'youtube' ? 'default' : 'ghost'}
            onClick={() => {
              setMode('youtube');
              setIndex(0);
            }}
          >
            <Video className="size-4" /> YouTube
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <Input
            placeholder="Jump to exercise…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIndex(0);
            }}
            className="w-56"
          />
          <Select
            value={filter}
            onValueChange={(v) => {
              setFilter(v);
              setIndex(0);
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="picked">Picked</SelectItem>
              <SelectItem value="none">Marked none</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => {
                setHideCompleted(e.target.checked);
                setIndex(0);
              }}
            />
            Hide exercises that already have a video
          </label>

          {mode === 'youtube' && (
            <Input
              type="password"
              placeholder="YouTube Data API key…"
              value={ytKey}
              onChange={(e) => {
                const v = e.target.value.trim();
                setYtKey(v);
                localStorage.setItem(YT_API_KEY_STORE, v);
              }}
              className="w-56"
            />
          )}
          {mode === 'animation' && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Reps per clip
              <Input
                type="number"
                min={1}
                max={10}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-16"
              />
            </label>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              <b className="text-foreground">{counts.picked}</b> picked ·{' '}
              <b className="text-foreground">{counts.pending}</b> pending ·{' '}
              <b className="text-foreground">{counts.none}</b> none
            </span>
            <Button type="button" variant="outline" onClick={handleExport}>
              <Download className="size-4" /> Export
            </Button>
            <Button type="button" variant="outline" onClick={handleClear}>
              <Trash2 className="size-4" /> Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {mode === 'youtube' && (
        <p className="text-xs text-muted-foreground">
          The API key is stored in your browser and sent directly to the YouTube Data API. Restrict it in Google Cloud to
          the YouTube Data API v3 + an HTTP-referrer allowlist. Shortcuts: ←/→ nav · 1–6 select · C clip · N none · F
          fetch/refresh.
        </p>
      )}
      {mode === 'animation' && (
        <p className="text-xs text-muted-foreground">
          Source: ExerciseDB via jsDelivr CDN (no key). Verify licensing before commercial launch. Shortcuts: ←/→ nav ·
          1–8 select · N none.
        </p>
      )}

      {/* Navigator + panel */}
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : isError ? (
        <p className="py-10 text-center text-sm text-destructive">Failed to load exercises from the database.</p>
      ) : filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No exercises match this filter.</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => goTo(index - 1)} disabled={index <= 0}>
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <div className="flex flex-1 items-center justify-center gap-3">
              <Select value={String(index)} onValueChange={(v) => goTo(parseInt(v, 10))}>
                <SelectTrigger className="max-w-[320px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filtered.map((ex, i) => {
                    const s = statusOf(ex.id);
                    const mark = s === 'picked' ? '✓ ' : s === 'none' ? '✗ ' : '• ';
                    return (
                      <SelectItem key={ex.id} value={String(i)}>
                        {i + 1}. {mark}
                        {ex.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {index + 1} / {filtered.length}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => goTo(index + 1)}
              disabled={index >= filtered.length - 1}
            >
              Next <ChevronRight className="size-4" />
            </Button>
          </div>

          {current && (
            <Card>
              <CardContent className="space-y-4 py-5">
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xl font-semibold">{current.name}</span>
                  <StatusBadge status={statusOf(current.id)} />
                  {current.hasVideo && (
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                      Has final video
                    </span>
                  )}
                </div>

                {mode === 'animation' ? (
                  <AnimationPanel
                    exercise={current}
                    dataset={dataset}
                    datasetLoading={datasetLoading}
                    datasetError={datasetError}
                    pick={animStore.store[current.id]}
                    onPick={pickAnimation}
                    onToggleNone={toggleAnimationNone}
                  />
                ) : (
                  <YoutubePanel
                    exercise={current}
                    entry={ytStore.store[current.id]}
                    ytKey={ytKey}
                    fetching={fetchingId === current.id}
                    onFetch={() => fetchYoutube(current)}
                    onSearchOthers={() => searchOthers(current)}
                    onPick={pickYoutube}
                    onToggleNone={toggleYoutubeNone}
                    onOpenClip={() => setClipId(current.id)}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {clipId && clipEntry?.pick && (
        <ClipEditorModal
          exerciseName={clipExercise?.name || ''}
          videoUrl={clipEntry.pick}
          initialClip={clipEntry.clip}
          onSave={saveClip}
          onClose={() => setClipId(null)}
        />
      )}
    </div>
  );
}
