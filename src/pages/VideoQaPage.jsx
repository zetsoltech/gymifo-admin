import { useEffect, useMemo, useState } from 'react';
import { Maximize2, Play } from 'lucide-react';
import {
  useExercisesQuery,
  useLookupsQuery,
  useSetExerciseQa,
} from '../hooks/useExercises.js';
import { VideoPreviewModal } from '../components/VideoPreviewModal.jsx';
import { Badge } from '@/components/ui/badge';
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
import { Textarea } from '@/components/ui/textarea';

const pageSize = 10;
const allValue = '__all__';

const QA_STATUS_LABEL = {
  unreviewed: 'Unreviewed',
  pass: 'Pass',
  needs_improvement: 'Needs Improvement',
  wrong: 'Wrong',
};

const QA_BADGE_VARIANT = {
  unreviewed: 'outline',
  pass: 'default', // primary/green-ish per theme
  needs_improvement: 'secondary',
  wrong: 'destructive',
};

const SEVERITY_LABEL = { high: 'High', medium: 'Medium', low: 'Low' };

function refValue(value) {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  return value.value || value.key || '-';
}

function normalizeExercise(exercise) {
  const videoUrl = exercise.videoUrl ?? exercise.video_url ?? exercise.videoPath ?? exercise.video_path ?? '';
  return {
    ...exercise,
    id: exercise.id ?? exercise._id,
    name: exercise.name ?? exercise.exerciseName ?? exercise.title ?? '',
    muscleGroup: exercise.muscleGroup ?? exercise.muscle ?? exercise.targetMuscle ?? '',
    equipment: exercise.equipment ?? exercise.equipmentName ?? '',
    videoUrl,
    qaStatus: exercise.qaStatus || 'unreviewed',
    qaSeverity: exercise.qaSeverity || null,
    qaComment: exercise.qaComment || '',
  };
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function isOptimizedVideoUrl(videoUrl) {
  return typeof videoUrl === 'string' && /(?:^|\/)exercises\/compressed_video\//.test(videoUrl);
}

/** One video card: hover-to-preview, expand-to-modal, the Pass / Needs
 * Improvement (+ severity) / Wrong review controls, and a comment note. */
function VideoQaCard({ exercise, onReview, onCommentSave, onExpand, isSaving }) {
  const [severityOpen, setSeverityOpen] = useState(exercise.qaStatus === 'needs_improvement');
  // Local draft so typing feels instant; only saved on blur (debounced network
  // calls per keystroke would be wasteful on a page meant for rapid review).
  const [commentDraft, setCommentDraft] = useState(exercise.qaComment || '');

  useEffect(() => {
    setSeverityOpen(exercise.qaStatus === 'needs_improvement');
  }, [exercise.qaStatus]);

  // Keep the draft in sync if the row updates from elsewhere (e.g. optimistic
  // rollback), but don't clobber what the reviewer is actively typing.
  useEffect(() => {
    setCommentDraft(exercise.qaComment || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.id]);

  function handleCommentBlur() {
    if (commentDraft !== (exercise.qaComment || '')) {
      onCommentSave(exercise.id, commentDraft);
    }
  }

  function handleHoverStart(event) {
    const video = event.currentTarget;
    video.play().catch(() => {});
  }

  function handleHoverEnd(event) {
    const video = event.currentTarget;
    video.pause();
    video.currentTime = 0;
  }

  return (
    <Card className="overflow-hidden py-0">
      <div
        className="group relative aspect-video w-full cursor-pointer bg-black"
        onClick={() => onExpand(exercise)}
      >
        {exercise.videoUrl ? (
          <video
            src={exercise.videoUrl}
            muted
            loop
            playsInline
            preload="metadata"
            className="h-full w-full object-cover"
            onMouseEnter={handleHoverStart}
            onMouseLeave={handleHoverEnd}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No video
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            className="opacity-0 shadow transition-opacity group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              onExpand(exercise);
            }}
            aria-label="Play full video"
            title="Play full video"
          >
            <Maximize2 className="size-3.5" />
          </Button>
          {isOptimizedVideoUrl(exercise.videoUrl) && <Badge variant="secondary">Optimized</Badge>}
        </div>
        {!exercise.videoUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
            <Play className="size-8" />
          </div>
        )}
      </div>

      <CardContent className="flex flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-sm font-medium leading-tight">{exercise.name || '-'}</p>
          <Badge variant={QA_BADGE_VARIANT[exercise.qaStatus]} className="shrink-0">
            {QA_STATUS_LABEL[exercise.qaStatus]}
            {exercise.qaStatus === 'needs_improvement' && exercise.qaSeverity
              ? ` · ${SEVERITY_LABEL[exercise.qaSeverity]}`
              : ''}
          </Badge>
        </div>

        <div className="flex gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={exercise.qaStatus === 'wrong' ? 'destructive' : 'outline'}
            className="flex-1"
            disabled={isSaving}
            onClick={() => onReview(exercise.id, 'wrong', null)}
          >
            Wrong
          </Button>
          <Button
            type="button"
            size="sm"
            variant={exercise.qaStatus === 'needs_improvement' ? 'secondary' : 'outline'}
            className="flex-1"
            disabled={isSaving}
            onClick={() => setSeverityOpen((open) => !open)}
          >
            Needs Improvement
          </Button>
          <Button
            type="button"
            size="sm"
            variant={exercise.qaStatus === 'pass' ? 'default' : 'outline'}
            className="flex-1"
            disabled={isSaving}
            onClick={() => onReview(exercise.id, 'pass', null)}
          >
            Pass
          </Button>
        </div>

        {severityOpen && (
          <div className="flex gap-1.5 rounded-md border border-dashed border-border p-1.5">
            {(['high', 'medium', 'low']).map((level) => (
              <Button
                key={level}
                type="button"
                size="xs"
                variant={
                  exercise.qaStatus === 'needs_improvement' && exercise.qaSeverity === level
                    ? 'secondary'
                    : 'ghost'
                }
                className="flex-1"
                disabled={isSaving}
                onClick={() => onReview(exercise.id, 'needs_improvement', level)}
              >
                {SEVERITY_LABEL[level]}
              </Button>
            ))}
          </div>
        )}

        <Textarea
          value={commentDraft}
          onChange={(event) => setCommentDraft(event.target.value)}
          onBlur={handleCommentBlur}
          placeholder="Add a note (e.g. what's wrong, timestamp)…"
          rows={2}
          className="min-h-0 resize-none text-xs"
        />
      </CardContent>
    </Card>
  );
}

export function VideoQaPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    muscleGroup: '',
    equipment: '',
    type: '',
    difficulty: '',
    bodyPart: '',
    qaStatus: '',
  });
  const [page, setPage] = useState(1);
  const [previewExercise, setPreviewExercise] = useState(null);

  // Same debounce pattern as ExercisesPage — avoid firing a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  // The QA status filter encodes severity as "needs_improvement:high" etc. so
  // the three severities are separate, selectable dropdown items — decode
  // that back into the two independent params the API already accepts.
  const [qaStatusFilter, qaSeverityFilter] = (filters.qaStatus || '').split(':');

  const queryParams = {
    page,
    limit: pageSize,
    search: debouncedSearch,
    muscleGroup: filters.muscleGroup,
    equipment: filters.equipment,
    type: filters.type,
    difficulty: filters.difficulty,
    bodyPart: filters.bodyPart,
    hasVideo: true, // nothing to QA without a video
    qaStatus: qaStatusFilter || undefined,
    qaSeverity: qaSeverityFilter || undefined,
  };

  const exercisesQuery = useExercisesQuery(queryParams);
  const lookupsQuery = useLookupsQuery();
  const qaMutation = useSetExerciseQa();

  const data = exercisesQuery.data;
  const isLoading = exercisesQuery.isPending || exercisesQuery.isPlaceholderData;
  const exercises = useMemo(
    () => toArray(data?.exercises).map(normalizeExercise),
    [data],
  );
  const total = Number(data?.total ?? exercises.length);
  const totalPages = Math.max(1, Math.ceil(total / (data?.limit || pageSize)));

  const lookups = lookupsQuery.data ?? {
    muscleGroups: [],
    equipment: [],
    exerciseTypes: [],
    difficultyLevels: [],
    bodyParts: [],
  };

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value === allValue ? '' : value }));
    setPage(1);
  }

  function handleReview(id, qaStatus, qaSeverity) {
    qaMutation.mutate({ id, qaStatus, qaSeverity });
  }

  // Comment saves keep the exercise's current status/severity untouched and
  // skip the success toast (it fires on blur, not a deliberate button click).
  function handleCommentSave(id, qaComment) {
    const exercise = exercises.find((item) => item.id === id);
    if (!exercise) return;
    qaMutation.mutate({
      id,
      qaStatus: exercise.qaStatus,
      qaSeverity: exercise.qaSeverity,
      qaComment,
      silent: true,
    });
  }

  const muscleGroups = toArray(lookups.muscleGroups);
  const equipmentItems = toArray(lookups.equipment);
  const exerciseTypes = toArray(lookups.exerciseTypes);
  const difficultyLevels = toArray(lookups.difficultyLevels);
  const bodyParts = toArray(lookups.bodyParts);

  return (
    <section>
      <div className="mb-[22px] flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div>
          <h1 className="text-2xl font-bold">Video QA</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review generated exercise videos and mark Pass, Needs Improvement, or Wrong.
          </p>
        </div>
        <Input
          type="text"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search exercises"
          className="sm:w-60"
        />
      </div>

      {/* Filters — same filter set as the Exercises tab, plus QA status. */}
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
        <Select value={filters.muscleGroup || allValue} onValueChange={(value) => updateFilter('muscleGroup', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Muscle group" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All muscle groups</SelectItem>
            {muscleGroups.map((item) => <SelectItem key={item.id} value={item.key}>{item.value}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.equipment || allValue} onValueChange={(value) => updateFilter('equipment', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Equipment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All equipment</SelectItem>
            {equipmentItems.map((item) => <SelectItem key={item.id} value={item.key}>{item.value}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.type || allValue} onValueChange={(value) => updateFilter('type', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All types</SelectItem>
            {(exerciseTypes.length ? exerciseTypes : [
              { key: 'compound', value: 'Compound' },
              { key: 'isolation', value: 'Isolation' },
            ]).map((item) => <SelectItem key={item.key} value={item.key}>{item.value}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.difficulty || allValue} onValueChange={(value) => updateFilter('difficulty', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Difficulty" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All difficulty</SelectItem>
            {(difficultyLevels.length ? difficultyLevels : [
              { key: 'beginner', value: 'Beginner' },
              { key: 'intermediate', value: 'Intermediate' },
              { key: 'advanced', value: 'Advanced' },
            ]).map((item) => <SelectItem key={item.key} value={item.key}>{item.value}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.bodyPart || allValue} onValueChange={(value) => updateFilter('bodyPart', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Body part" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All body parts</SelectItem>
            {bodyParts.map((item) => <SelectItem key={item.id} value={item.key}>{item.value}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.qaStatus || allValue} onValueChange={(value) => updateFilter('qaStatus', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="QA status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All QA statuses</SelectItem>
            <SelectItem value="unreviewed">Unreviewed</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="needs_improvement">Needs Improvement (any)</SelectItem>
            <SelectItem value="needs_improvement:high">Needs Improvement — High</SelectItem>
            <SelectItem value="needs_improvement:medium">Needs Improvement — Medium</SelectItem>
            <SelectItem value="needs_improvement:low">Needs Improvement — Low</SelectItem>
            <SelectItem value="wrong">Wrong</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: pageSize }).map((_, index) => (
            <Skeleton key={`qa-skeleton-${index}`} className="aspect-video w-full rounded-xl" />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No exercise videos found.</div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {exercises.map((exercise) => (
            <VideoQaCard
              key={exercise.id}
              exercise={exercise}
              onReview={handleReview}
              onCommentSave={handleCommentSave}
              onExpand={setPreviewExercise}
              isSaving={qaMutation.isPending && qaMutation.variables?.id === exercise.id}
            />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isLoading || page <= 1} onClick={() => setPage((current) => current - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button type="button" variant="outline" size="sm" disabled={isLoading || page >= totalPages} onClick={() => setPage((current) => current + 1)}>
          Next
        </Button>
      </div>

      {previewExercise && (
        <VideoPreviewModal
          exercise={previewExercise}
          onClose={() => setPreviewExercise(null)}
        />
      )}
    </section>
  );
}
