import { useEffect, useMemo, useState } from 'react';
import {
  useDeleteExercise,
  useExercisesQuery,
  useLookupsQuery,
  useSaveExercise,
  useToggleExerciseActive,
} from '../hooks/useExercises.js';
import { ExerciseFormModal } from '../components/ExerciseFormModal.jsx';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2 } from 'lucide-react';

const pageSize = 12;
const allValue = '__all__';

function refValue(value) {
  if (!value) return '-';
  if (typeof value === 'string') return value;
  return value.value || value.key || '-';
}

function refKey(value) {
  if (!value || typeof value === 'string') return '';
  return value.key || '';
}

function normalizeExercise(exercise) {
  const videoUrl = exercise.videoUrl ?? exercise.video_url ?? exercise.videoPath ?? exercise.video_path ?? '';
  return {
    ...exercise,
    id: exercise.id ?? exercise._id,
    name: exercise.name ?? exercise.exerciseName ?? exercise.title ?? '',
    description: exercise.description || '',
    muscleGroup: exercise.muscleGroup ?? exercise.muscle ?? exercise.targetMuscle ?? '',
    equipment: exercise.equipment ?? exercise.equipmentName ?? '',
    videoUrl,
    imageUrls: exercise.imageUrls || [],
    instructions: exercise.instructions || [],
    tips: exercise.tips || [],
  };
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function ExercisesPage({ showToast }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    muscleGroup: '',
    equipment: '',
    type: '',
    difficulty: '',
    bodyPart: '',
    warmup: '',
    status: '',
    video: '',
  });
  const [page, setPage] = useState(1);
  const [editingExercise, setEditingExercise] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewExercise, setPreviewExercise] = useState(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryParams = {
    page,
    limit: pageSize,
    search: debouncedSearch,
    muscleGroup: filters.muscleGroup,
    equipment: filters.equipment,
    type: filters.type,
    difficulty: filters.difficulty,
    bodyPart: filters.bodyPart,
    isWarmup: filters.warmup === '' ? undefined : filters.warmup === 'true',
    isActive: filters.status === '' ? undefined : filters.status === 'active',
    hasVideo: filters.video === '' ? undefined : filters.video === 'with',
  };

  const exercisesQuery = useExercisesQuery(queryParams);
  const lookupsQuery = useLookupsQuery();
  const saveMutation = useSaveExercise();
  const deleteMutation = useDeleteExercise();
  const toggleActiveMutation = useToggleExerciseActive();

  const data = exercisesQuery.data;
  // Show skeletons on first load AND while a new page is being fetched
  // (placeholder data = the previous page still showing while the next loads).
  const isLoading = exercisesQuery.isPending || exercisesQuery.isPlaceholderData;
  // Active rows first; inactive sink to the bottom (stable sort keeps API order within each group).
  const exercises = useMemo(
    () => toArray(data?.exercises)
      .map(normalizeExercise)
      .sort((a, b) => Number(a.isActive === false) - Number(b.isActive === false)),
    [data],
  );
  const total = Number(data?.total ?? exercises.length);
  const meta = { total, page: data?.page || page, limit: data?.limit || pageSize };
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

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

  function openCreateModal() {
    setEditingExercise(null);
    setIsFormOpen(true);
  }

  function openEditModal(exercise) {
    setEditingExercise(exercise);
    setIsFormOpen(true);
  }

  async function handleSave(payload) {
    if (!payload.name || !payload.muscleGroupId || !payload.equipmentId || !payload.exerciseTypeId || !payload.difficultyLevelId) {
      showToast('Name, muscle group, equipment, type, and difficulty are required.', 'error');
      return;
    }
    if (!payload.instructions.length) {
      showToast('At least one instruction is required.', 'error');
      return;
    }
    try {
      await saveMutation.mutateAsync(payload);
      setIsFormOpen(false);
    } catch {
      // Error toast is handled globally by the mutation cache.
    }
  }

  function handleDelete(id) {
    if (!confirm('Delete this exercise?')) return;
    deleteMutation.mutate(id);
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
          <h1 className="text-2xl font-bold">Exercise Videos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage exercise records, images, and videos from the API.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
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
          <Button type="button" onClick={openCreateModal}>
            + Add Exercise
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
        <Select value={filters.warmup || allValue} onValueChange={(value) => updateFilter('warmup', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Warmup" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>Warmup &amp; regular</SelectItem>
            <SelectItem value="true">Warmup only</SelectItem>
            <SelectItem value="false">Non-warmup only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.status || allValue} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All statuses</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.video || allValue} onValueChange={(value) => updateFilter('video', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Video" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>With &amp; without video</SelectItem>
            <SelectItem value="with">With video</SelectItem>
            <SelectItem value="without">Without video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[1120px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Muscle</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Body Part</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Warmup</TableHead>
                <TableHead>Video</TableHead>
                <TableHead>Active</TableHead>
                <TableHead style={{ width: 110 }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`exercise-skeleton-${index}`}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-9 rounded-full" /></TableCell>
                    <TableCell><div className="flex gap-2"><Skeleton className="size-8 rounded-md" /><Skeleton className="size-8 rounded-md" /></div></TableCell>
                  </TableRow>
                ))
              ) : exercises.length === 0 ? (
                <TableRow><TableCell colSpan="10" className="py-8 text-center text-muted-foreground">No exercises found.</TableCell></TableRow>
              ) : exercises.map((exercise) => (
                <TableRow
                  key={exercise.id}
                  data-inactive={exercise.isActive === false ? '' : undefined}
                  className="data-[inactive]:bg-destructive/10 data-[inactive]:hover:bg-destructive/15"
                >
                  <TableCell className="font-medium">{exercise.name || '-'}</TableCell>
                  <TableCell>{refValue(exercise.muscleGroup)}</TableCell>
                  <TableCell>{refValue(exercise.equipment)}</TableCell>
                  <TableCell>{refValue(exercise.bodyPart)}</TableCell>
                  <TableCell>{refValue(exercise.exerciseType)}</TableCell>
                  <TableCell>{refValue(exercise.difficultyLevel)}</TableCell>
                  <TableCell>
                    {exercise.isWarmup ? <Badge variant="secondary">Yes</Badge> : <Badge variant="outline">No</Badge>}
                  </TableCell>
                  <TableCell>
                    {exercise.videoUrl ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setPreviewExercise(exercise)}>
                        View
                      </Button>
                    ) : (
                      <Badge variant="destructive">No video</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={exercise.isActive !== false}
                      disabled={toggleActiveMutation.isPending}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: exercise.id, isActive: checked })
                      }
                      aria-label={exercise.isActive === false ? 'Activate exercise' : 'Disable exercise'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openEditModal(exercise)}
                        aria-label="Edit exercise"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(exercise.id)}
                        aria-label="Delete exercise"
                        title="Delete"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" disabled={isLoading || page <= 1} onClick={() => setPage((current) => current - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
        <Button type="button" variant="outline" size="sm" disabled={isLoading || page >= totalPages} onClick={() => setPage((current) => current + 1)}>
          Next
        </Button>
      </div>

      {isFormOpen && (
        <ExerciseFormModal
          exercise={editingExercise}
          lookups={lookups}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
        />
      )}

      {previewExercise && (
        <VideoPreviewModal
          exercise={previewExercise}
          onClose={() => setPreviewExercise(null)}
        />
      )}
    </section>
  );
}
