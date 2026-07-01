import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Box, ChevronLeft, ChevronRight, Download, Film, Image, Trash2, Video } from 'lucide-react';
import { useSourcingExercises, useExerciseDbDataset, usePickStore } from '../hooks/useSourcing.js';
import { useLookupsQuery } from '../hooks/useExercises.js';
import {
  ANIM_STORE_KEY,
  YT_STORE_KEY,
  MIXAMO_STORE_KEY,
  STOCK_STORE_KEY,
  YT_API_KEY_STORE,
  PEXELS_KEY_STORE,
  candidatesFor,
  searchYouTube,
  ytErrorMessage,
  searchPexels,
  pexelsErrorMessage,
  suggestMixamoName,
  buildUnifiedExport,
  buildBlenderScript,
  downloadTextFile,
} from '../lib/sourcing.js';
import { AnimationPanel } from '../components/sourcing/AnimationPanel.jsx';
import { YoutubePanel } from '../components/sourcing/YoutubePanel.jsx';
import { MixamoPanel } from '../components/sourcing/MixamoPanel.jsx';
import { StockPanel } from '../components/sourcing/StockPanel.jsx';
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

const MODES = [
  { key: 'animation', label: 'Animations', icon: Film },
  { key: 'youtube', label: 'YouTube', icon: Video },
  { key: 'mixamo', label: 'Mixamo 3D', icon: Box },
  { key: 'stock', label: 'Stock', icon: Image },
];

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
  const [mode, setMode] = useState('animation');
  const [ytKey, setYtKey] = useState(() => localStorage.getItem(YT_API_KEY_STORE) || '');
  const [ytMode, setYtMode] = useState('demo'); // 'demo' | 'tutorial'
  const [pexelsKey, setPexelsKey] = useState(() => localStorage.getItem(PEXELS_KEY_STORE) || '');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [dbFilters, setDbFilters] = useState({
    muscleGroup: '', equipment: '', type: '', difficulty: '', bodyPart: '', warmup: '', status: '', video: '',
  });
  const [index, setIndex] = useState(0);
  const [reps, setReps] = useState(3);
  const [fetchingId, setFetchingId] = useState(null);
  const [stockFetchingId, setStockFetchingId] = useState(null);
  const [clipId, setClipId] = useState(null);

  const { data: exercises = [], isLoading, isError } = useSourcingExercises();
  const { data: dataset, isLoading: datasetLoading, isError: datasetError, refetch: refetchDataset } = useExerciseDbDataset(mode === 'animation');
  const lookupsQuery = useLookupsQuery();
  const lookups = lookupsQuery.data ?? { muscleGroups: [], equipment: [], exerciseTypes: [], difficultyLevels: [], bodyParts: [] };
  const toArr = (v) => (Array.isArray(v) ? v : []);

  const animStore = usePickStore(ANIM_STORE_KEY);
  const ytStore = usePickStore(YT_STORE_KEY);
  const mixamoStore = usePickStore(MIXAMO_STORE_KEY);
  const stockStore = usePickStore(STOCK_STORE_KEY);

  // Aggregate status checks all four sources.
  // Picked = at least one confirmed pick from any source.
  // None   = at least one "none" mark with no picks from any source.
  const statusOf = useCallback(
    (id) => {
      const animPick = animStore.store[id];
      const ytEntry = ytStore.store[id];
      const mixamoPick = mixamoStore.store[id];
      const stockEntry = stockStore.store[id];

      const hasPick =
        (animPick && animPick !== 'none') ||
        (ytEntry?.pick && ytEntry.pick !== 'none') ||
        (mixamoPick && mixamoPick !== 'none') ||
        (stockEntry?.pick && stockEntry.pick !== 'none');
      if (hasPick) return 'picked';

      const hasNone =
        animPick === 'none' ||
        ytEntry?.pick === 'none' ||
        mixamoPick === 'none' ||
        stockEntry?.pick === 'none';
      if (hasNone) return 'none';

      return 'pending';
    },
    [animStore.store, ytStore.store, mixamoStore.store, stockStore.store],
  );

  const allValue = '__all__';
  function updateDbFilter(key, value) {
    setDbFilters((prev) => ({ ...prev, [key]: value === allValue ? '' : value }));
    setIndex(0);
  }

  const videoStats = useMemo(
    () => ({ with: exercises.filter((e) => e.hasVideo).length, without: exercises.filter((e) => !e.hasVideo).length }),
    [exercises],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const f = dbFilters;
    return exercises.filter((ex) => {
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      if (hideCompleted && ex.hasVideo) return false;
      if (filter !== 'all' && statusOf(ex.id) !== filter) return false;
      if (f.muscleGroup && ex.muscleGroupKey !== f.muscleGroup) return false;
      if (f.equipment && ex.equipmentKey !== f.equipment) return false;
      if (f.type && ex.exerciseTypeKey !== f.type) return false;
      if (f.difficulty && ex.difficultyKey !== f.difficulty) return false;
      if (f.bodyPart && ex.bodyPartKey !== f.bodyPart) return false;
      if (f.warmup !== '' && ex.isWarmup !== (f.warmup === 'true')) return false;
      if (f.status !== '' && ex.isActive !== (f.status === 'active')) return false;
      if (f.video === 'with' && !ex.hasVideo) return false;
      if (f.video === 'without' && ex.hasVideo) return false;
      return true;
    });
  }, [exercises, search, filter, hideCompleted, statusOf, dbFilters]);

  useEffect(() => {
    setIndex((i) => Math.min(Math.max(0, i), Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  const current = filtered[Math.min(index, Math.max(0, filtered.length - 1))] || null;

  const counts = useMemo(() => {
    const c = { picked: 0, pending: 0, none: 0 };
    exercises.forEach((ex) => { c[statusOf(ex.id)] += 1; });
    return c;
  }, [exercises, statusOf]);

  // ── YouTube fetching ────────────────────────────────────────────────────────
  const fetchYoutube = useCallback(
    async (ex, { force = false } = {}) => {
      if (!ex || !ytKey) return;
      const entry = ytStore.store[ex.id];
      if (!force && entry?.candidates) return;
      setFetchingId(ex.id);
      try {
        const { items, nextPageToken } = await searchYouTube(ytKey, ex.name, undefined, ytMode);
        ytStore.update(ex.id, (prev) => ({
          candidates: items,
          pick: prev?.pick ?? null,
          pageToken: nextPageToken,
          clip: prev?.clip,
          mode: ytMode,
        }));
      } catch (err) {
        showToast?.(ytErrorMessage(err), 'error');
      } finally {
        setFetchingId(null);
      }
    },
    [ytKey, ytMode, ytStore, showToast],
  );

  const searchOthers = useCallback(
    async (ex) => {
      if (!ex || !ytKey) return;
      setFetchingId(ex.id);
      try {
        const token = ytStore.store[ex.id]?.pageToken || undefined;
        let { items, nextPageToken } = await searchYouTube(ytKey, ex.name, token, ytMode);
        if (items.length === 0 && token) {
          ({ items, nextPageToken } = await searchYouTube(ytKey, ex.name, undefined, ytMode));
        }
        ytStore.update(ex.id, () => ({ candidates: items, pick: null, pageToken: nextPageToken, mode: ytMode }));
        showToast?.(items.length ? `New results for ${ex.name}.` : `No more results for ${ex.name}.`, 'info');
      } catch (err) {
        showToast?.(ytErrorMessage(err), 'error');
      } finally {
        setFetchingId(null);
      }
    },
    [ytKey, ytMode, ytStore, showToast],
  );

  useEffect(() => {
    if (mode !== 'youtube' || !current || !ytKey) return;
    const entry = ytStore.store[current.id];
    if (!entry?.candidates && entry?.pick !== 'none') fetchYoutube(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, current?.id, ytKey]);

  // ── Pexels stock fetching ───────────────────────────────────────────────────
  const fetchStock = useCallback(
    async (ex, { force = false } = {}) => {
      if (!ex || !pexelsKey) return;
      const entry = stockStore.store[ex.id];
      if (!force && entry?.candidates) return;
      setStockFetchingId(ex.id);
      try {
        const { items } = await searchPexels(pexelsKey, ex.name, 1);
        stockStore.update(ex.id, (prev) => ({ ...(prev || {}), candidates: items, page: 1 }));
      } catch (err) {
        showToast?.(pexelsErrorMessage(err), 'error');
      } finally {
        setStockFetchingId(null);
      }
    },
    [pexelsKey, stockStore, showToast],
  );

  const searchOthersStock = useCallback(
    async (ex) => {
      if (!ex || !pexelsKey) return;
      setStockFetchingId(ex.id);
      try {
        const nextPage = (stockStore.store[ex.id]?.page || 1) + 1;
        let { items } = await searchPexels(pexelsKey, ex.name, nextPage);
        const page = items.length ? nextPage : 1;
        if (!items.length) ({ items } = await searchPexels(pexelsKey, ex.name, 1));
        stockStore.update(ex.id, () => ({ candidates: items, pick: null, page }));
        showToast?.(items.length ? `New stock results for ${ex.name}.` : `No more results for ${ex.name}.`, 'info');
      } catch (err) {
        showToast?.(pexelsErrorMessage(err), 'error');
      } finally {
        setStockFetchingId(null);
      }
    },
    [pexelsKey, stockStore, showToast],
  );

  useEffect(() => {
    if (mode !== 'stock' || !current || !pexelsKey) return;
    const entry = stockStore.store[current.id];
    if (!entry?.candidates && entry?.pick !== 'none') fetchStock(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, current?.id, pexelsKey]);

  // ── Pick handlers ───────────────────────────────────────────────────────────
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

  const pickMixamo = useCallback(
    (animName) => {
      if (!current) return;
      mixamoStore.update(current.id, { animName, confirmed: true });
    },
    [current, mixamoStore],
  );
  const toggleMixamoNone = useCallback(() => {
    if (!current) return;
    mixamoStore.update(current.id, (prev) => (prev === 'none' ? undefined : 'none'));
  }, [current, mixamoStore]);

  const pickStock = useCallback(
    (video) => {
      if (!current) return;
      stockStore.update(current.id, (prev) => ({ ...(prev || {}), pick: video }));
    },
    [current, stockStore],
  );
  const toggleStockNone = useCallback(() => {
    if (!current) return;
    stockStore.update(current.id, (prev) => {
      const base = prev || {};
      return { ...base, pick: base.pick === 'none' ? null : 'none' };
    });
  }, [current, stockStore]);

  const saveClip = useCallback(
    (clip) => {
      if (!clipId) return;
      ytStore.update(clipId, (prev) => ({ ...prev, clip }));
      setClipId(null);
    },
    [clipId, ytStore],
  );

  // ── Navigation ──────────────────────────────────────────────────────────────
  const goTo = useCallback(
    (i) => {
      setIndex(Math.min(Math.max(0, i), Math.max(0, filtered.length - 1)));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filtered.length],
  );

  const byId = useMemo(() => {
    const m = new Map();
    exercises.forEach((ex) => m.set(ex.id, ex));
    return m;
  }, [exercises]);

  // ── Unified export ──────────────────────────────────────────────────────────
  function handleUnifiedExport() {
    const result = buildUnifiedExport({
      exercises,
      animStore: animStore.store,
      ytStore: ytStore.store,
      mixamoStore: mixamoStore.store,
      stockStore: stockStore.store,
      reps,
    });

    if (!result) {
      showToast?.('No picks to export yet. Select videos from any source first.', 'info');
      return;
    }

    const { sh, json, manifest, mixamoItems, gifItems, ytItems, stockItems } = result;
    downloadTextFile('picks_manifest.json', json);
    downloadTextFile('download_all.sh', sh);
    if (mixamoItems.length) downloadTextFile('render.py', buildBlenderScript(mixamoItems));

    const breakdown = [
      gifItems.length && `${gifItems.length} GIF`,
      ytItems.length && `${ytItems.length} YouTube`,
      mixamoItems.length && `${mixamoItems.length} Mixamo`,
      stockItems.length && `${stockItems.length} Pexels`,
    ].filter(Boolean).join(', ');

    showToast?.(`Exported ${manifest.length} picks (${breakdown}) → run: bash download_all.sh`, 'success');
  }

  function handleClear() {
    const modeLabel = MODES.find((m) => m.key === mode)?.label || mode;
    const store = { animation: animStore, youtube: ytStore, mixamo: mixamoStore, stock: stockStore }[mode];
    if (!confirm(`Clear all ${modeLabel} picks? This cannot be undone.`)) return;
    store?.clear();
    showToast?.(`${modeLabel} picks cleared.`, 'info');
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  const kbd = useRef({});
  kbd.current = {
    mode,
    current,
    dataset,
    clipOpen: Boolean(clipId),
    ytEntry: current ? ytStore.store[current.id] : null,
    stockEntry: current ? stockStore.store[current.id] : null,
    next: () => goTo(index + 1),
    prev: () => goTo(index - 1),
    pickAnimation,
    pickYoutube,
    toggleNone: {
      animation: toggleAnimationNone,
      youtube: toggleYoutubeNone,
      mixamo: toggleMixamoNone,
      stock: toggleStockNone,
    },
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
    fetchStock: () => {
      if (mode !== 'stock' || !current) return;
      stockStore.store[current.id]?.candidates ? searchOthersStock(current) : fetchStock(current);
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
      else if (e.key.toLowerCase() === 'n') k.toggleNone[k.mode]?.();
      else if (k.mode === 'youtube' && e.key.toLowerCase() === 'c') k.openClip();
      else if (k.mode === 'youtube' && e.key.toLowerCase() === 'f') k.fetchYt();
      else if (k.mode === 'stock' && e.key.toLowerCase() === 'f') k.fetchStock();
      else if (e.key >= '1' && e.key <= '8') {
        const n = parseInt(e.key, 10);
        if (k.mode === 'animation') {
          const c = candidatesFor(k.current.name, k.dataset || [])[n - 1];
          if (c) k.pickAnimation(c);
        } else if (k.mode === 'youtube' && n <= 6) {
          const c = k.ytEntry?.candidates?.[n - 1];
          if (c) k.pickYoutube(c.url);
        } else if (k.mode === 'stock' && n <= 6) {
          const c = k.stockEntry?.candidates?.[n - 1];
          if (c) k.pickStock(c); // pickStock not in kbd.current yet — handled below
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Patch pickStock into kbd ref
  kbd.current.pickStock = pickStock;

  // ── Render ──────────────────────────────────────────────────────────────────
  const clipExercise = clipId ? byId.get(clipId) : null;
  const clipEntry = clipId ? ytStore.store[clipId] : null;

  return (
    <div className="space-y-5">
      {/* Header + mode tabs */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sourcing</h1>
          <p className="text-sm text-muted-foreground">
            Pick a reference per exercise across any source, then export a unified download script.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-border p-1">
          {MODES.map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={mode === key ? 'default' : 'ghost'}
              onClick={() => { setMode(key); setIndex(0); }}
            >
              <Icon className="size-4" /> {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="space-y-3 py-4">
          {/* Row 1: search + sourcing-status + video + mode-specific inputs + actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search exercises…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setIndex(0); }}
              className="w-52"
            />
            <Select value={filter} onValueChange={(v) => { setFilter(v); setIndex(0); }}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All picks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="picked">Picked</SelectItem>
                <SelectItem value="none">Marked none</SelectItem>
              </SelectContent>
            </Select>

            {/* Video filter toggle */}
            <div className="inline-flex rounded-lg border border-border text-sm">
              {[
                ['', `All (${exercises.length})`],
                ['with', `Has video (${videoStats.with})`],
                ['without', `No video (${videoStats.without})`],
              ].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateDbFilter('video', v || allValue)}
                  className={`px-3 py-1.5 first:rounded-l-lg last:rounded-r-lg transition-colors ${
                    dbFilters.video === v ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={hideCompleted} onChange={(e) => { setHideCompleted(e.target.checked); setIndex(0); }} />
              Hide with final video
            </label>

            {/* Mode-specific controls */}
            {mode === 'animation' && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Reps per clip
                <Input type="number" min={1} max={10} value={reps} onChange={(e) => setReps(e.target.value)} className="w-16" />
              </label>
            )}
            {mode === 'youtube' && (
              <>
                <Input
                  type="password"
                  placeholder="YouTube Data API key…"
                  value={ytKey}
                  onChange={(e) => { const v = e.target.value.trim(); setYtKey(v); localStorage.setItem(YT_API_KEY_STORE, v); }}
                  className="w-52"
                />
                <div className="inline-flex rounded-md border border-border text-sm">
                  {[['demo', 'Quick demos'], ['tutorial', 'Tutorials']].map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setYtMode(v)}
                      className={`px-2.5 py-1.5 first:rounded-l-md last:rounded-r-md transition-colors ${
                        ytMode === v ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
            {mode === 'stock' && (
              <Input
                type="password"
                placeholder="Pexels API key…"
                value={pexelsKey}
                onChange={(e) => { const v = e.target.value.trim(); setPexelsKey(v); localStorage.setItem(PEXELS_KEY_STORE, v); }}
                className="w-52"
              />
            )}

            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                <b className="text-foreground">{counts.picked}</b> picked ·{' '}
                <b className="text-foreground">{counts.pending}</b> pending ·{' '}
                <b className="text-foreground">{counts.none}</b> none
              </span>
              <Button type="button" variant="outline" onClick={handleUnifiedExport}>
                <Download className="size-4" /> Export all
              </Button>
              <Button type="button" variant="outline" onClick={handleClear}>
                <Trash2 className="size-4" /> Clear
              </Button>
            </div>
          </div>

          {/* Row 2: exercise property filters */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
            <Select value={dbFilters.muscleGroup || allValue} onValueChange={(v) => updateDbFilter('muscleGroup', v)}>
              <SelectTrigger><SelectValue placeholder="Muscle group" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>All muscles</SelectItem>
                {toArr(lookups.muscleGroups).map((item) => <SelectItem key={item.id} value={item.key}>{item.value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dbFilters.equipment || allValue} onValueChange={(v) => updateDbFilter('equipment', v)}>
              <SelectTrigger><SelectValue placeholder="Equipment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>All equipment</SelectItem>
                {toArr(lookups.equipment).map((item) => <SelectItem key={item.id} value={item.key}>{item.value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dbFilters.type || allValue} onValueChange={(v) => updateDbFilter('type', v)}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>All types</SelectItem>
                {(toArr(lookups.exerciseTypes).length ? toArr(lookups.exerciseTypes) : [
                  { key: 'compound', value: 'Compound' },
                  { key: 'isolation', value: 'Isolation' },
                ]).map((item) => <SelectItem key={item.key} value={item.key}>{item.value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dbFilters.difficulty || allValue} onValueChange={(v) => updateDbFilter('difficulty', v)}>
              <SelectTrigger><SelectValue placeholder="Difficulty" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>All difficulty</SelectItem>
                {(toArr(lookups.difficultyLevels).length ? toArr(lookups.difficultyLevels) : [
                  { key: 'beginner', value: 'Beginner' },
                  { key: 'intermediate', value: 'Intermediate' },
                  { key: 'advanced', value: 'Advanced' },
                ]).map((item) => <SelectItem key={item.key} value={item.key}>{item.value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dbFilters.bodyPart || allValue} onValueChange={(v) => updateDbFilter('bodyPart', v)}>
              <SelectTrigger><SelectValue placeholder="Body part" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>All body parts</SelectItem>
                {toArr(lookups.bodyParts).map((item) => <SelectItem key={item.id} value={item.key}>{item.value}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dbFilters.warmup || allValue} onValueChange={(v) => updateDbFilter('warmup', v)}>
              <SelectTrigger><SelectValue placeholder="Warmup" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>Warmup &amp; regular</SelectItem>
                <SelectItem value="true">Warmup only</SelectItem>
                <SelectItem value="false">Regular only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dbFilters.status || allValue} onValueChange={(v) => updateDbFilter('status', v)}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={allValue}>All statuses</SelectItem>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Mode hints */}
      {mode === 'animation' && (
        <p className="text-xs text-muted-foreground">
          Source: ExerciseDB via jsDelivr CDN (no key needed). Verify licensing before commercial launch.
          Shortcuts: ←/→ navigate · 1–8 select · N none.
        </p>
      )}
      {mode === 'youtube' && (
        <p className="text-xs text-muted-foreground">
          The API key is stored in your browser and sent directly to YouTube Data API. Restrict it in Google Cloud to the
          YouTube Data API v3 + HTTP-referrer allowlist. <b>Quick demos</b> searches short (&lt;4 min) clips; <b>Tutorials</b>
          searches longer (4–20 min) ones.
          Shortcuts: ←/→ nav · 1–6 select · C clip · N none · F fetch/refresh.
        </p>
      )}
      {mode === 'mixamo' && (
        <p className="text-xs text-muted-foreground">
          Mixamo has no public API — use the panel below to confirm which animation to download from mixamo.com. Export
          generates a Blender render script (<code>render.py</code>) + a list of FBX files to download.
          Shortcuts: ←/→ navigate · N none.
        </p>
      )}
      {mode === 'stock' && (
        <p className="text-xs text-muted-foreground">
          Free Pexels API (25k req/month) — get your key at pexels.com/api. Videos download via curl in the export
          script. Pexels attribution required if published.
          Shortcuts: ←/→ nav · 1–6 select · N none · F fetch/refresh.
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
                        {i + 1}. {mark}{ex.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                {index + 1} / {filtered.length}
              </span>
            </div>
            <Button type="button" variant="outline" onClick={() => goTo(index + 1)} disabled={index >= filtered.length - 1}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>

          {current && (
            <Card>
              <CardContent className="space-y-4 py-5">
                {/* Exercise title + metadata */}
                <div className="space-y-2 text-center">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="text-xl font-semibold">{current.name}</span>
                    <StatusBadge status={statusOf(current.id)} />
                    {current.hasVideo && (
                      <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground">
                        Has final video
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {current.muscleGroup && <span><span className="font-medium text-foreground/60">Muscle</span> {current.muscleGroup}</span>}
                    {current.equipment && <span><span className="font-medium text-foreground/60">Equipment</span> {current.equipment}</span>}
                    {current.bodyPart && <span><span className="font-medium text-foreground/60">Body part</span> {current.bodyPart}</span>}
                    {current.exerciseType && <span><span className="font-medium text-foreground/60">Type</span> {current.exerciseType}</span>}
                    {current.difficulty && <span><span className="font-medium text-foreground/60">Difficulty</span> {current.difficulty}</span>}
                    <span><span className="font-medium text-foreground/60">Warmup</span> {current.isWarmup ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {/* Source panels */}
                {mode === 'animation' && (
                  <AnimationPanel
                    exercise={current}
                    dataset={dataset}
                    datasetLoading={datasetLoading}
                    datasetError={datasetError}
                    onRetry={refetchDataset}
                    pick={animStore.store[current.id]}
                    onPick={pickAnimation}
                    onToggleNone={toggleAnimationNone}
                  />
                )}
                {mode === 'youtube' && (
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
                {mode === 'mixamo' && (
                  <MixamoPanel
                    exercise={current}
                    pick={mixamoStore.store[current.id]}
                    suggestedName={suggestMixamoName(current.name)}
                    onConfirm={pickMixamo}
                    onToggleNone={toggleMixamoNone}
                  />
                )}
                {mode === 'stock' && (
                  <StockPanel
                    exercise={current}
                    entry={stockStore.store[current.id]}
                    pexelsKey={pexelsKey}
                    fetching={stockFetchingId === current.id}
                    onFetch={() => fetchStock(current)}
                    onSearchOthers={() => searchOthersStock(current)}
                    onPick={pickStock}
                    onToggleNone={toggleStockNone}
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
