import { useEffect, useMemo, useRef, useState } from 'react';
import { useExerciseOptions, useLookupsQuery } from '../hooks/useExercises.js';
import { useRecommendationDetail } from '../hooks/useRecommendations.js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Switch } from '@/components/ui/switch';
import { Film, ImagePlus, X } from 'lucide-react';

const emptyForm = {
  name: '',
  isRestDay: false,
  muscleGroupIds: [],
  exerciseIds: [],
  image: null,
  deleteImageUrl: false,
  video: null,
  deleteVideoUrl: false,
  isActive: true,
};

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toText(value) {
  return value === undefined || value === null ? '' : String(value);
}

function mergeCurrentOptions(options, selectedIds, currentItems, getLabel) {
  const next = [...options];
  selectedIds.forEach((id, index) => {
    if (!next.some((item) => String(item.id) === String(id))) {
      next.push({ id, name: getLabel?.(id, index) || id, value: getLabel?.(id, index) || id });
    }
  });
  toArray(currentItems).forEach((item) => {
    const id = toText(item.id ?? item._id);
    if (id && !next.some((option) => String(option.id) === id)) {
      next.push({ id, name: item.name || item.value || id, value: item.value || item.name || id });
    }
  });
  return next;
}

function optionLabel(option) {
  return option?.value || option?.name || option?.label || option?.id || '';
}

function ChipComboboxField({ label, placeholder, options, selectedIds, disabled = false, onChange }) {
  const anchor = useComboboxAnchor();
  const items = options.map((option) => String(option.id));
  const labelFor = (id) => optionLabel(options.find((option) => String(option.id) === String(id)) || { id, name: id, value: id });

  return (
    <div>
      <Label className="mb-1.5">{label}</Label>
      <Combobox
        multiple
        autoHighlight
        items={items}
        value={selectedIds}
        onValueChange={onChange}
        itemToString={(item) => labelFor(String(item))}
      >
        <ComboboxChips ref={anchor} className={disabled ? 'bg-muted/40 opacity-70' : undefined}>
          <ComboboxValue>
            {(values) => (
              <>
                {values.map((value) => (
                  <ComboboxChip key={value} value={value}>{labelFor(value)}</ComboboxChip>
                ))}
                <ComboboxChipsInput
                  disabled={disabled}
                  placeholder={disabled ? 'Not needed for rest day cards' : placeholder}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        {!disabled ? (
          <ComboboxContent anchor={anchor}>
            <ComboboxEmpty>No items found.</ComboboxEmpty>
            <ComboboxList>
              {(item) => (
                <ComboboxItem key={String(item)} value={String(item)}>
                  {labelFor(String(item))}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        ) : null}
      </Combobox>
    </div>
  );
}

export function RecommendationFormModal({ recommendation, isSaving = false, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [videoDragOver, setVideoDragOver] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const detailQuery = useRecommendationDetail(recommendation?.id);
  const lookupsQuery = useLookupsQuery();
  const exercisesQuery = useExerciseOptions(true);

  const full = useMemo(
    () => ({ ...(recommendation || {}), ...(detailQuery.data || {}) }),
    [recommendation, detailQuery.data],
  );

  useEffect(() => {
    setForm({
      name: full.name || '',
      isRestDay: Boolean(full.isRestDay),
      muscleGroupIds: toArray(full.muscleGroupIds).map(String),
      exerciseIds: toArray(full.exerciseIds).map(String),
      image: null,
      deleteImageUrl: false,
      video: null,
      deleteVideoUrl: false,
      isActive: full.isActive !== false,
    });
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  }, [full]);

  const muscleGroupOptions = useMemo(() => {
    const base = toArray(lookupsQuery.data?.muscleGroups).map((item) => ({
      id: toText(item.id || item._id || item.key),
      value: item.value || item.name || item.key,
    }));
    return mergeCurrentOptions(base, form.muscleGroupIds, [], (_id, index) => full.muscleGroups?.[index]);
  }, [lookupsQuery.data, form.muscleGroupIds, full.muscleGroups]);

  const exerciseOptions = useMemo(() => {
    const base = toArray(exercisesQuery.data).map((item) => ({
      id: toText(item.id || item._id),
      name: item.name || '',
      muscleGroupIds: toArray(item.muscleGroupIds).map(String),
    }));
    const selectedMuscles = new Set(form.muscleGroupIds.map(String));
    const filtered = form.isRestDay || !selectedMuscles.size
      ? []
      : base.filter((item) => item.muscleGroupIds.some((id) => selectedMuscles.has(String(id))));
    return mergeCurrentOptions(filtered, form.exerciseIds, full.exercises);
  }, [exercisesQuery.data, form.exerciseIds, form.isRestDay, form.muscleGroupIds, full.exercises]);

  useEffect(() => {
    if (form.isRestDay || !form.muscleGroupIds.length || !exercisesQuery.data) return;
    const selectedMuscles = new Set(form.muscleGroupIds.map(String));
    const allowedExerciseIds = new Set(
      toArray(exercisesQuery.data)
        .filter((item) => toArray(item.muscleGroupIds).some((id) => selectedMuscles.has(String(id))))
        .map((item) => String(item.id || item._id)),
    );
    setForm((current) => {
      const exerciseIds = current.exerciseIds.filter((id) => allowedExerciseIds.has(String(id)));
      return exerciseIds.length === current.exerciseIds.length ? current : { ...current, exerciseIds };
    });
  }, [exercisesQuery.data, form.isRestDay, form.muscleGroupIds]);

  const imagePreviewUrl = useMemo(
    () => (form.image ? URL.createObjectURL(form.image) : ''),
    [form.image],
  );
  useEffect(() => () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  const videoPreviewUrl = useMemo(
    () => (form.video ? URL.createObjectURL(form.video) : ''),
    [form.video],
  );
  useEffect(() => () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
  }, [videoPreviewUrl]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setRestDay(isRestDay) {
    setForm((current) => ({
      ...current,
      isRestDay,
      muscleGroupIds: isRestDay ? [] : current.muscleGroupIds,
      exerciseIds: isRestDay ? [] : current.exerciseIds,
    }));
  }

  function setImage(file) {
    if (!file || !file.type.startsWith('image/')) return;
    setForm((current) => ({ ...current, image: file, deleteImageUrl: false }));
  }

  function removeImage() {
    if (form.image) {
      setForm((current) => ({ ...current, image: null }));
      if (imageInputRef.current) imageInputRef.current.value = '';
      return;
    }
    if (full.imageUrl) {
      setForm((current) => ({ ...current, deleteImageUrl: true }));
    }
  }

  function setVideo(file) {
    if (!file || !file.type.startsWith('video/')) return;
    setForm((current) => ({ ...current, video: file, deleteVideoUrl: false }));
  }

  function removeVideo() {
    if (form.video) {
      setForm((current) => ({ ...current, video: null }));
      if (videoInputRef.current) videoInputRef.current.value = '';
      return;
    }
    if (full.videoUrl) {
      setForm((current) => ({ ...current, deleteVideoUrl: true }));
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      id: recommendation?.id,
      name: form.name.trim(),
      isRestDay: form.isRestDay,
      muscleGroupIds: form.isRestDay ? [] : form.muscleGroupIds,
      exerciseIds: form.isRestDay ? [] : form.exerciseIds,
      image: form.image,
      imageUrl: full.imageUrl || '',
      deleteImageUrl: form.deleteImageUrl,
      video: form.video,
      videoUrl: full.videoUrl || '',
      deleteVideoUrl: form.deleteVideoUrl,
      isActive: form.isActive,
    });
  }

  const visibleImageUrl = form.deleteImageUrl ? '' : full.imageUrl;
  const visibleVideoUrl = form.deleteVideoUrl ? '' : full.videoUrl;
  const hasMediaChange = Boolean(form.image || form.video || form.deleteImageUrl || form.deleteVideoUrl);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="no-scrollbar max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{recommendation ? 'Edit Recommendation Exercise' : 'Add Recommendation Exercise'}</DialogTitle>
          <DialogDescription className="sr-only">
            Provide the details to {recommendation ? 'update the' : 'create a new'} recommendation exercise card.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="recommendationName">Name</Label>
              <Input
                id="recommendationName"
                type="text"
                value={form.name}
                onChange={(event) => updateField('name', event.target.value)}
                placeholder="e.g. Leg Day"
                required
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <Label className="mb-0.5">Rest Day</Label>
                <p className="text-xs text-muted-foreground">Rest day cards do not use muscles or exercises.</p>
              </div>
              <Switch
                checked={form.isRestDay}
                onCheckedChange={setRestDay}
                aria-label="Rest day recommendation"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <Label className="mb-0.5">Active</Label>
                <p className="text-xs text-muted-foreground">Make this card visible in the app.</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => updateField('isActive', checked)}
                aria-label="Recommendation active"
              />
            </div>

            <ChipComboboxField
              label="Muscle Groups"
              placeholder={lookupsQuery.isLoading ? 'Loading muscle groups...' : 'Add muscle group'}
              options={muscleGroupOptions}
              selectedIds={form.muscleGroupIds}
              disabled={form.isRestDay}
              onChange={(muscleGroupIds) => updateField('muscleGroupIds', muscleGroupIds)}
            />

            <ChipComboboxField
              label="Exercises"
              placeholder={
                form.muscleGroupIds.length
                  ? exercisesQuery.isLoading ? 'Loading exercises...' : 'Add exercise'
                  : 'Select muscle groups first'
              }
              options={exerciseOptions}
              selectedIds={form.exerciseIds}
              disabled={form.isRestDay || !form.muscleGroupIds.length}
              onChange={(exerciseIds) => updateField('exerciseIds', exerciseIds)}
            />

            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="recommendationImage">Card Image</Label>
              <input
                type="file"
                id="recommendationImage"
                ref={imageInputRef}
                accept="image/*"
                hidden
                onChange={(event) => {
                  setImage(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => imageInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') imageInputRef.current?.click();
                }}
                onDragOver={(event) => { event.preventDefault(); setImageDragOver(true); }}
                onDragLeave={() => setImageDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setImageDragOver(false);
                  setImage(Array.from(event.dataTransfer.files || [])[0]);
                }}
                className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
                  imageDragOver ? 'border-primary bg-primary/10' : 'border-input hover:border-muted-foreground/60'
                }`}
              >
                {imagePreviewUrl || visibleImageUrl ? (
                  <div className="relative flex items-start gap-3" onClick={(event) => event.stopPropagation()}>
                    <img
                      src={imagePreviewUrl || visibleImageUrl}
                      alt="Recommendation"
                      className="h-28 w-44 shrink-0 rounded-md border object-cover"
                    />
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="truncate pr-8 text-sm font-medium">
                        {form.image ? form.image.name : 'Current image'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {form.image ? 'New upload will replace the current image.' : visibleImageUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); removeImage(); }}
                      aria-label="Remove image"
                      className="absolute right-0 top-0 rounded-full bg-background/80 p-1 text-foreground hover:bg-destructive hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-5 text-muted-foreground">
                    <ImagePlus className="size-6" />
                    <p className="text-sm">Drag and drop an image here, or click to browse</p>
                  </div>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="recommendationVideo">Card Video</Label>
              <input
                type="file"
                id="recommendationVideo"
                ref={videoInputRef}
                accept="video/*"
                hidden
                onChange={(event) => {
                  setVideo(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => videoInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') videoInputRef.current?.click();
                }}
                onDragOver={(event) => { event.preventDefault(); setVideoDragOver(true); }}
                onDragLeave={() => setVideoDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setVideoDragOver(false);
                  setVideo(Array.from(event.dataTransfer.files || [])[0]);
                }}
                className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
                  videoDragOver ? 'border-primary bg-primary/10' : 'border-input hover:border-muted-foreground/60'
                }`}
              >
                {videoPreviewUrl || visibleVideoUrl ? (
                  <div className="relative flex items-start gap-3" onClick={(event) => event.stopPropagation()}>
                    <video
                      src={videoPreviewUrl || visibleVideoUrl}
                      className="h-28 w-44 shrink-0 rounded-md border object-cover"
                      controls
                    />
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="truncate pr-8 text-sm font-medium">
                        {form.video ? form.video.name : 'Current video'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {form.video ? 'New upload will replace the current video.' : visibleVideoUrl}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); removeVideo(); }}
                      aria-label="Remove video"
                      className="absolute right-0 top-0 rounded-full bg-background/80 p-1 text-foreground hover:bg-destructive hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-5 text-muted-foreground">
                    <Film className="size-6" />
                    <p className="text-sm">Drag and drop a video here, or click to browse</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (hasMediaChange ? 'Uploading...' : 'Saving...') : 'Save Recommendation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
