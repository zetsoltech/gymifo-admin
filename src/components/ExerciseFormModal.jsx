import { useEffect, useMemo, useRef, useState } from 'react';
import { useExerciseDetail, useExerciseOptions } from '../hooks/useExercises.js';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Film, ImagePlus, Plus, X } from 'lucide-react';

const ENVIRONMENTS = [
  { value: 'gym', label: 'Gym' },
  { value: 'home', label: 'Home' },
  { value: 'both', label: 'Both' },
  { value: 'outdoor', label: 'Outdoor' },
];
const FORMATS = [
  { value: 'reps', label: 'Reps' },
  { value: 'timed', label: 'Timed' },
];
const TIERS = [1, 2, 3, 4];
const RISK_LEVELS = [1, 2, 3, 4, 5];

const emptyForm = {
  name: '',
  description: '',
  muscleGroupId: '',
  secondaryMuscleGroupId: '',
  equipmentId: '',
  bodyPartId: '',
  bodyAreaId: '',
  exerciseTypeId: '',
  difficultyLevelId: '',
  movementPatternId: '',
  progressionGroupId: '',
  regressionExerciseId: '',
  nextProgressionExerciseId: '',
  set: '',
  tier: '',
  riskLevel: '',
  environment: '',
  progressionOrder: '',
  met: '',
  suggestedFormat: '',
  isWarmup: false,
  instructionsText: '',
  images: [],
  video: null,
  deleteVideoUrl: '',
  deleteImageUrls: [],
};

function toText(value) {
  return value === undefined || value === null ? '' : String(value);
}

function linesToArray(value) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

// Ensure the currently-selected id is always an option, even if it isn't in
// the downloaded lookups list — fall back to the record's nested object.
function withCurrent(list, currentId, currentObj) {
  if (currentId && !list.some((item) => String(item.id) === String(currentId))) {
    if (currentObj && currentObj.id) {
      return [{ id: currentObj.id, value: currentObj.value || currentObj.key || currentId }, ...list];
    }
  }
  return list;
}

export function ExerciseFormModal({ exercise, lookups, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [videoDragOver, setVideoDragOver] = useState(false);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  // Pull the full record (list rows may omit some relations) and the
  // exercise list for the progression / regression pickers.
  const detailQuery = useExerciseDetail(exercise?.id);
  const optionsQuery = useExerciseOptions();

  const full = useMemo(
    () => ({ ...(exercise || {}), ...(detailQuery.data || {}) }),
    [exercise, detailQuery.data],
  );

  useEffect(() => {
    setForm({
      name: full.name || '',
      description: full.description || '',
      muscleGroupId: toText(full.muscleGroupId),
      secondaryMuscleGroupId: toText(full.secondaryMuscleGroupId),
      equipmentId: toText(full.equipmentId),
      bodyPartId: toText(full.bodyPartId),
      bodyAreaId: toText(full.bodyAreaId),
      exerciseTypeId: toText(full.exerciseTypeId),
      difficultyLevelId: toText(full.difficultyLevelId),
      movementPatternId: toText(full.movementPatternId),
      progressionGroupId: toText(full.progressionGroupId),
      regressionExerciseId: toText(full.regressionExerciseId),
      nextProgressionExerciseId: toText(full.nextProgressionExerciseId),
      set: toText(full.set),
      tier: toText(full.tier),
      riskLevel: toText(full.riskLevel),
      environment: toText(full.environment),
      progressionOrder: toText(full.progressionOrder),
      met: toText(full.met),
      suggestedFormat: toText(full.suggestedFormat),
      isWarmup: Boolean(full.isWarmup),
      instructionsText: (full.instructions || []).join('\n'),
      images: [],
      video: null,
      deleteVideoUrl: '',
      deleteImageUrls: [],
    });

    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  }, [full]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  // Object URLs so newly picked files render as real previews.
  const imagePreviews = useMemo(
    () => form.images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [form.images],
  );
  useEffect(() => () => imagePreviews.forEach((item) => URL.revokeObjectURL(item.url)), [imagePreviews]);

  const videoPreviewUrl = useMemo(
    () => (form.video ? URL.createObjectURL(form.video) : ''),
    [form.video],
  );
  useEffect(() => () => {
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
  }, [videoPreviewUrl]);

  function addImages(fileList) {
    const files = Array.from(fileList || []);
    if (files.length) setForm((current) => ({ ...current, images: [...current.images, ...files] }));
  }

  function removeNewImage(index) {
    setForm((current) => ({ ...current, images: current.images.filter((_, i) => i !== index) }));
  }

  function clearVideo() {
    updateField('video', null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  }

  function handleImageDrop(event) {
    event.preventDefault();
    setImageDragOver(false);
    addImages(Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith('image/')));
  }

  function handleVideoDrop(event) {
    event.preventDefault();
    setVideoDragOver(false);
    const file = Array.from(event.dataTransfer.files || []).find((item) => item.type.startsWith('video/'));
    if (file) updateField('video', file);
  }

  function formatSize(bytes) {
    return bytes >= 1024 * 1024
      ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  function toggleDeleteImage(url) {
    setForm((current) => {
      const exists = current.deleteImageUrls.includes(url);
      return {
        ...current,
        deleteImageUrls: exists
          ? current.deleteImageUrls.filter((item) => item !== url)
          : [...current.deleteImageUrls, url],
      };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      id: exercise?.id,
      name: form.name.trim(),
      description: form.description.trim(),
      muscleGroupId: form.muscleGroupId,
      secondaryMuscleGroupId: form.secondaryMuscleGroupId,
      equipmentId: form.equipmentId,
      bodyPartId: form.bodyPartId,
      bodyAreaId: form.bodyAreaId,
      exerciseTypeId: form.exerciseTypeId,
      difficultyLevelId: form.difficultyLevelId,
      movementPatternId: form.movementPatternId,
      progressionGroupId: form.progressionGroupId,
      regressionExerciseId: form.regressionExerciseId,
      nextProgressionExerciseId: form.nextProgressionExerciseId,
      set: form.set.trim(),
      tier: form.tier,
      riskLevel: form.riskLevel,
      environment: form.environment,
      progressionOrder: form.progressionOrder,
      met: form.met,
      suggestedFormat: form.suggestedFormat,
      isWarmup: form.isWarmup,
      instructions: linesToArray(form.instructionsText),
      images: form.images,
      video: form.video,
      deleteVideoUrl: form.deleteVideoUrl,
      deleteImageUrls: form.deleteImageUrls,
    });
  }

  const hasExistingVideo = Boolean(full.videoUrl);
  const existingImages = full.imageUrls || [];

  const muscleGroups = toArray(lookups?.muscleGroups);
  const equipmentItems = toArray(lookups?.equipment);
  const exerciseTypes = toArray(lookups?.exerciseTypes);
  const difficultyLevels = toArray(lookups?.difficultyLevels);
  const bodyParts = toArray(lookups?.bodyParts);
  const bodyAreas = toArray(lookups?.bodyAreas);
  const movementPatterns = toArray(lookups?.movementPatterns);
  const progressionGroups = toArray(lookups?.progressionGroups);

  // Exercise picker options (exclude self; ensure current value is present).
  const exerciseOptions = useMemo(() => {
    const list = toArray(optionsQuery.data).filter((item) => String(item.id) !== String(exercise?.id));
    const inject = (acc, id, obj) => {
      if (id && !acc.some((item) => String(item.id) === String(id)) && obj?.id) {
        return [{ id: obj.id, name: obj.name || id }, ...acc];
      }
      return acc;
    };
    let result = list;
    result = inject(result, full.regressionExerciseId, full.regressionExercise);
    result = inject(result, full.nextProgressionExerciseId, full.nextProgressionExercise);
    return result;
  }, [optionsQuery.data, exercise, full]);

  const renderLookupSelect = (label, field, items, nested, { required = false } = {}) => (
    <div>
      <Label className="mb-1.5">{label}</Label>
      <Select value={form[field]} onValueChange={(value) => updateField(field, value)} required={required}>
        <SelectTrigger className="w-full"><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {withCurrent(items, form[field], nested).map((item) => (
            <SelectItem key={item.id} value={item.id}>{item.value}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="no-scrollbar max-h-[92vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{exercise ? 'Edit Exercise' : 'Add Exercise'}</DialogTitle>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="exerciseName">Exercise Name</Label>
              <Input id="exerciseName" type="text" value={form.name} onChange={(event) => updateField('name', event.target.value)} required />
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="exerciseDescription">Description</Label>
              <Textarea
                id="exerciseDescription"
                value={form.description}
                onChange={(event) => updateField('description', event.target.value)}
                placeholder="Min 10 characters"
              />
            </div>

            {renderLookupSelect('Muscle Group', 'muscleGroupId', muscleGroups, full.muscleGroup, { required: true })}
            {renderLookupSelect('Secondary Muscle Group', 'secondaryMuscleGroupId', muscleGroups, full.secondaryMuscleGroup)}
            {renderLookupSelect('Equipment', 'equipmentId', equipmentItems, full.equipment, { required: true })}
            {renderLookupSelect('Type', 'exerciseTypeId', exerciseTypes, full.exerciseType, { required: true })}
            {renderLookupSelect('Difficulty', 'difficultyLevelId', difficultyLevels, full.difficultyLevel, { required: true })}
            {renderLookupSelect('Body Part', 'bodyPartId', bodyParts, full.bodyPart)}
            {renderLookupSelect('Body Area', 'bodyAreaId', bodyAreas, full.bodyArea)}
            {renderLookupSelect('Movement Pattern', 'movementPatternId', movementPatterns, full.movementPattern)}
            {renderLookupSelect('Progression Group', 'progressionGroupId', progressionGroups, full.progressionGroup)}

            <div>
              <Label className="mb-1.5">Regression Exercise</Label>
              <Select value={form.regressionExerciseId} onValueChange={(value) => updateField('regressionExerciseId', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select exercise" /></SelectTrigger>
                <SelectContent>
                  {exerciseOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5">Next Progression Exercise</Label>
              <Select value={form.nextProgressionExerciseId} onValueChange={(value) => updateField('nextProgressionExerciseId', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select exercise" /></SelectTrigger>
                <SelectContent>
                  {exerciseOptions.map((item) => (
                    <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5">Environment</Label>
              <Select value={form.environment} onValueChange={(value) => updateField('environment', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select environment" /></SelectTrigger>
                <SelectContent>
                  {ENVIRONMENTS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5">Suggested Format</Label>
              <Select value={form.suggestedFormat} onValueChange={(value) => updateField('suggestedFormat', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select format" /></SelectTrigger>
                <SelectContent>
                  {FORMATS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5">Tier</Label>
              <Select value={form.tier} onValueChange={(value) => updateField('tier', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select tier" /></SelectTrigger>
                <SelectContent>
                  {TIERS.map((tier) => (
                    <SelectItem key={tier} value={String(tier)}>{tier}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5">Risk Level</Label>
              <Select value={form.riskLevel} onValueChange={(value) => updateField('riskLevel', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select risk level" /></SelectTrigger>
                <SelectContent>
                  {RISK_LEVELS.map((level) => (
                    <SelectItem key={level} value={String(level)}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5">Set</Label>
              <Input type="text" value={form.set} onChange={(event) => updateField('set', event.target.value)} placeholder="e.g. elite_core" />
            </div>

            <div>
              <Label className="mb-1.5">Progression Order</Label>
              <Input type="number" value={form.progressionOrder} onChange={(event) => updateField('progressionOrder', event.target.value)} placeholder="99 for no order" />
            </div>

            <div>
              <Label className="mb-1.5">MET</Label>
              <Input type="number" step="0.1" value={form.met} onChange={(event) => updateField('met', event.target.value)} />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:col-span-2">
              <div>
                <Label className="mb-0.5">Warmup Exercise</Label>
                <p className="text-xs text-muted-foreground">Mark this as a warmup movement rather than a main exercise.</p>
              </div>
              <Switch
                checked={form.isWarmup}
                onCheckedChange={(checked) => updateField('isWarmup', checked)}
                aria-label="Warmup exercise"
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="exerciseInstructions">Instructions</Label>
              <Textarea
                id="exerciseInstructions"
                value={form.instructionsText}
                onChange={(event) => updateField('instructionsText', event.target.value)}
                placeholder="One instruction per line"
                required
              />
            </div>

            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="exerciseImages">Images</Label>
              <input
                type="file"
                id="exerciseImages"
                ref={imageInputRef}
                accept="image/*"
                multiple
                hidden
                onChange={(event) => {
                  addImages(event.target.files);
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
                onDragOver={(event) => {
                  event.preventDefault();
                  setImageDragOver(true);
                }}
                onDragLeave={() => setImageDragOver(false)}
                onDrop={handleImageDrop}
                className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
                  imageDragOver ? 'border-primary bg-primary/10' : 'border-input hover:border-muted-foreground/60'
                }`}
              >
                {imagePreviews.length === 0 ? (
                  <div className="flex flex-col items-center gap-1.5 py-5 text-muted-foreground">
                    <ImagePlus className="size-6" />
                    <p className="text-sm">Drag &amp; drop images here, or click to browse</p>
                    <p className="text-xs">Multiple images allowed · click a preview to view full size</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" onClick={(event) => event.stopPropagation()}>
                    {imagePreviews.map(({ file, url }, index) => (
                      <div key={url} className="relative overflow-hidden rounded-lg border">
                        <img
                          src={url}
                          alt={file.name}
                          title="Click to view full size"
                          className="h-24 w-full cursor-zoom-in object-cover"
                          onClick={() => window.open(url, '_blank')}
                        />
                        <button
                          type="button"
                          onClick={() => removeNewImage(index)}
                          aria-label={`Remove ${file.name}`}
                          className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-foreground hover:bg-destructive hover:text-white"
                        >
                          <X className="size-3.5" />
                        </button>
                        <p className="truncate bg-background/80 px-1.5 py-1 text-[11px] text-muted-foreground">
                          {file.name} · {formatSize(file.size)}
                        </p>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex h-full min-h-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      <Plus className="size-5" />
                      <span className="text-xs">Add more</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {existingImages.length > 0 && (
              <div className="sm:col-span-2">
                <Label className="mb-1.5">Existing Images</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {existingImages.map((url) => {
                    const marked = form.deleteImageUrls.includes(url);
                    return (
                      <div key={url} className={`relative overflow-hidden rounded-lg border ${marked ? 'border-destructive' : ''}`}>
                        <img
                          src={url}
                          alt="Exercise"
                          title="Click to view full size"
                          className={`h-24 w-full cursor-zoom-in object-cover ${marked ? 'opacity-40' : ''}`}
                          onClick={() => window.open(url, '_blank')}
                        />
                        {marked && (
                          <span className="absolute inset-x-0 top-1 text-center text-[11px] font-semibold text-destructive">
                            Will be deleted
                          </span>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant={marked ? 'outline' : 'destructive'}
                          className="absolute bottom-1 right-1 h-6 px-2 text-[11px]"
                          onClick={() => toggleDeleteImage(url)}
                        >
                          {marked ? 'Keep' : 'Delete'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="exerciseVideo">
                Video File (stored at original quality - no compression)
              </Label>
              <input
                type="file"
                id="exerciseVideo"
                ref={videoInputRef}
                accept="video/*"
                hidden
                onChange={(event) => updateField('video', event.target.files?.[0] || null)}
              />
              <div
                role="button"
                tabIndex={0}
                onClick={() => videoInputRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') videoInputRef.current?.click();
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setVideoDragOver(true);
                }}
                onDragLeave={() => setVideoDragOver(false)}
                onDrop={handleVideoDrop}
                className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
                  videoDragOver ? 'border-primary bg-primary/10' : 'border-input hover:border-muted-foreground/60'
                }`}
              >
                {!form.video ? (
                  <div className="flex flex-col items-center gap-1.5 py-5 text-muted-foreground">
                    <Film className="size-6" />
                    <p className="text-sm">Drag &amp; drop a video here, or click to browse</p>
                    <p className="text-xs">One video · preview plays before saving</p>
                  </div>
                ) : (
                  <div className="relative flex items-start gap-3" onClick={(event) => event.stopPropagation()}>
                    <video src={videoPreviewUrl} controls preload="metadata" className="h-28 w-44 shrink-0 rounded-md bg-black object-contain" />
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="truncate pr-8 text-sm font-medium">{form.video.name}</p>
                      <p className="text-xs text-muted-foreground">{formatSize(form.video.size)} · new upload</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearVideo}
                      aria-label="Remove video"
                      className="absolute right-0 top-0 rounded-full bg-background/80 p-1 text-foreground hover:bg-destructive hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">Uploading a new video replaces the current video on update.</p>
            </div>

            {hasExistingVideo && (
              <div className="flex items-start gap-3 rounded-lg border p-2 sm:col-span-2">
                <video
                  src={full.videoUrl}
                  controls
                  preload="metadata"
                  className={`h-28 w-44 shrink-0 rounded-md bg-black object-contain ${form.deleteVideoUrl ? 'opacity-40' : ''}`}
                />
                <div className="min-w-0 flex-1 pt-1">
                  <p className="text-sm font-medium">
                    Current video
                    {form.deleteVideoUrl && <span className="text-destructive"> — will be deleted</span>}
                    {!form.deleteVideoUrl && form.video && <span className="text-muted-foreground"> — will be replaced</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{full.videoUrl}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.deleteVideoUrl ? 'outline' : 'destructive'}
                    className="mt-2"
                    onClick={() => updateField('deleteVideoUrl', form.deleteVideoUrl ? '' : full.videoUrl)}
                  >
                    {form.deleteVideoUrl ? 'Keep Video' : 'Delete Video'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
