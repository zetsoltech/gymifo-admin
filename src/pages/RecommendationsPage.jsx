import { useEffect, useMemo, useState } from 'react';
import { useLookupsQuery } from '../hooks/useExercises.js';
import {
  useDeleteRecommendation,
  useRecommendationsQuery,
  useSaveRecommendation,
  useToggleRecommendationActive,
} from '../hooks/useRecommendations.js';
import { RecommendationFormModal } from '../components/RecommendationFormModal.jsx';
import { RecommendationMediaModal } from '../components/RecommendationMediaModal.jsx';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pencil, Play, Plus, Trash2 } from 'lucide-react';

const pageSize = 12;
const allValue = '__all__';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value) {
  return value === undefined || value === null ? '' : String(value);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function ChipList({ items, empty = '-' }) {
  const list = toArray(items).filter(Boolean);
  if (!list.length) return <span className="text-muted-foreground">{empty}</span>;
  return (
    <div className="flex max-w-md flex-wrap gap-1.5">
      {list.slice(0, 4).map((item) => (
        <Badge key={item} variant="secondary" className="h-auto py-1">
          {item}
        </Badge>
      ))}
      {list.length > 4 ? <Badge variant="outline">+{list.length - 4}</Badge> : null}
    </div>
  );
}

function MuscleFilter({ options, selectedIds, onAdd, onRemove }) {
  const anchor = useComboboxAnchor();
  const items = options.map((item) => String(item.id));
  const labelFor = (id) => {
    const match = options.find((item) => String(item.id) === String(id));
    return match?.value || id;
  };

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={selectedIds}
      onValueChange={(values) => {
        const added = values.find((value) => !selectedIds.includes(value));
        const removed = selectedIds.find((value) => !values.includes(value));
        if (added) onAdd(added);
        if (removed) onRemove(removed);
      }}
      itemToString={(item) => labelFor(String(item))}
    >
      <ComboboxChips ref={anchor}>
        <ComboboxValue>
          {(values) => (
            <>
              {values.map((value) => (
                <ComboboxChip key={value} value={value}>{labelFor(value)}</ComboboxChip>
              ))}
              <ComboboxChipsInput placeholder="Filter by muscle groups" />
            </>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>No muscle groups found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={String(item)} value={String(item)}>
              {labelFor(String(item))}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

export function RecommendationsPage({ showToast }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    restDay: '',
    status: '',
    video: '',
    muscleGroupIds: [],
  });
  const [page, setPage] = useState(1);
  const [editingRecommendation, setEditingRecommendation] = useState(null);
  const [previewRecommendation, setPreviewRecommendation] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryParams = {
    page,
    limit: pageSize,
    search: debouncedSearch,
    isRestDay: filters.restDay === '' ? undefined : filters.restDay === 'true',
    isActive: filters.status === '' || filters.status === 'deleted' ? undefined : filters.status === 'active',
    isDeleted: filters.status === 'deleted' ? true : filters.status === 'inactive' ? false : undefined,
    hasVideo: filters.video === '' ? undefined : filters.video === 'with',
    muscleGroupIds: filters.muscleGroupIds,
  };

  const recommendationsQuery = useRecommendationsQuery(queryParams);
  const lookupsQuery = useLookupsQuery();
  const saveMutation = useSaveRecommendation();
  const deleteMutation = useDeleteRecommendation();
  const toggleActiveMutation = useToggleRecommendationActive();

  const data = recommendationsQuery.data;
  const isLoading = recommendationsQuery.isPending || recommendationsQuery.isPlaceholderData;
  const recommendations = useMemo(
    () => toArray(data?.recommendations)
      .sort((a, b) => Number(a.isActive === false) - Number(b.isActive === false)),
    [data],
  );
  const total = Number(data?.total ?? recommendations.length);
  const meta = { total, page: data?.page || page, limit: data?.limit || pageSize };
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  const muscleGroupOptions = useMemo(
    () => toArray(lookupsQuery.data?.muscleGroups).map((item) => ({
      id: toText(item.id || item._id || item.key),
      value: item.value || item.name || item.key,
    })),
    [lookupsQuery.data],
  );

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value === allValue ? '' : value }));
    setPage(1);
  }

  function addMuscleFilter(value) {
    setFilters((current) => ({
      ...current,
      muscleGroupIds: current.muscleGroupIds.includes(value)
        ? current.muscleGroupIds
        : [...current.muscleGroupIds, value],
    }));
    setPage(1);
  }

  function removeMuscleFilter(value) {
    setFilters((current) => ({
      ...current,
      muscleGroupIds: current.muscleGroupIds.filter((id) => id !== value),
    }));
    setPage(1);
  }

  function openCreateModal() {
    setEditingRecommendation(null);
    setIsFormOpen(true);
  }

  function openEditModal(recommendation) {
    setEditingRecommendation(recommendation);
    setIsFormOpen(true);
  }

  async function handleSave(payload) {
    if (!payload.name) {
      showToast('Recommendation name is required.', 'error');
      return;
    }
    if (!payload.isRestDay && !payload.muscleGroupIds.length) {
      showToast('At least one muscle group is required for exercise day cards.', 'error');
      return;
    }
    if (!payload.isRestDay && !payload.exerciseIds.length) {
      showToast('At least one exercise is required for exercise day cards.', 'error');
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
    if (!confirm('Delete this recommendation?')) return;
    deleteMutation.mutate(id);
  }

  return (
    <section>
      <div className="mb-[22px] flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div>
          <h1 className="text-2xl font-bold">Exercise Recommendations</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage recommendation cards for exercise days and rest days.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search recommendations"
            className="sm:w-64"
          />
          <Button type="button" onClick={openCreateModal}>
            <Plus className="size-4" />
            Add Recommendation
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 lg:grid-cols-4">
        <Select value={filters.restDay || allValue} onValueChange={(value) => updateFilter('restDay', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Card type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>Exercise &amp; rest days</SelectItem>
            <SelectItem value="false">Exercise day only</SelectItem>
            <SelectItem value="true">Rest day only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.status || allValue} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All statuses</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="inactive">Inactive only</SelectItem>
            <SelectItem value="deleted">Deleted only</SelectItem>
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
        <MuscleFilter
          options={muscleGroupOptions}
          selectedIds={filters.muscleGroupIds}
          onAdd={addMuscleFilter}
          onRemove={removeMuscleFilter}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table className="min-w-[1040px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Video</TableHead>
                <TableHead>Muscle Groups</TableHead>
                <TableHead>Exercises</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Active</TableHead>
                <TableHead style={{ width: 150 }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`recommendation-skeleton-${index}`}>
                    <TableCell><Skeleton className="h-4 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-44 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-56 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-9 rounded-full" /></TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Skeleton className="size-8 rounded-md" />
                        <Skeleton className="size-8 rounded-md" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : recommendations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan="8" className="py-8 text-center text-muted-foreground">
                    No recommendations found.
                  </TableCell>
                </TableRow>
              ) : recommendations.map((recommendation) => (
                <TableRow
                  key={recommendation.id}
                  data-inactive={recommendation.isActive === false && !recommendation.isDeleted ? '' : undefined}
                  data-deleted={recommendation.isDeleted ? '' : undefined}
                  className="data-[inactive]:bg-destructive/10 data-[inactive]:hover:bg-destructive/15 data-[deleted]:bg-muted/70 data-[deleted]:text-muted-foreground data-[deleted]:hover:bg-muted"
                >
                  <TableCell className="font-medium">{recommendation.name || '-'}</TableCell>
                  <TableCell>
                    {recommendation.isRestDay ? (
                      <Badge variant="outline">Rest Day</Badge>
                    ) : (
                      <Badge>Exercise Day</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {recommendation.videoUrl ? (
                      <Badge>Has video</Badge>
                    ) : (
                      <Badge variant="secondary">No video</Badge>
                    )}
                  </TableCell>
                  <TableCell><ChipList items={recommendation.muscleGroups} empty={recommendation.isRestDay ? 'Rest day' : '-'} /></TableCell>
                  <TableCell><ChipList items={toArray(recommendation.exercises).map((exercise) => exercise.name || exercise.id)} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(recommendation.updatedAt || recommendation.createdAt)}</TableCell>
                  <TableCell>
                    <Switch
                      checked={recommendation.isActive !== false}
                      disabled={toggleActiveMutation.isPending || recommendation.isDeleted}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: recommendation.id, isActive: checked })
                      }
                      aria-label={recommendation.isActive === false ? 'Activate recommendation' : 'Disable recommendation'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setPreviewRecommendation(recommendation)}
                        aria-label="Preview media"
                        title="Preview video"
                      >
                        <Play className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openEditModal(recommendation)}
                        aria-label="Edit recommendation"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      {!recommendation.isDeleted ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDelete(recommendation.id)}
                          aria-label="Delete recommendation"
                          title="Delete"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : null}
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
        <RecommendationFormModal
          recommendation={editingRecommendation}
          isSaving={saveMutation.isPending}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
        />
      )}

      {previewRecommendation && (
        <RecommendationMediaModal
          recommendation={previewRecommendation}
          onClose={() => setPreviewRecommendation(null)}
        />
      )}
    </section>
  );
}
