import { useEffect, useMemo, useRef, useState } from 'react';
import { useRecipeDetail } from '../hooks/useRecipes.js';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Film, Plus, X } from 'lucide-react';
import { parseIngredientLine } from '../api.ts';

const emptyForm = {
  name: '',
  description: '',
  mealTypeId: '',
  cuisineId: '',
  dietTypeId: '',
  difficultyLevelId: '',
  prepTimeMinutes: '',
  cookTimeMinutes: '',
  servings: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  isActive: true,
  ingredients: [{ quantity: '', unit: '', name: '' }],
  instructions: [''],
  tipsText: '',
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

function withCurrent(list, currentId, currentObj) {
  if (currentId && !list.some((item) => String(item.id) === String(currentId))) {
    if (currentObj && currentObj.id) {
      return [{ id: currentObj.id, value: currentObj.value || currentObj.key || currentId }, ...list];
    }
  }
  return list;
}

export function RecipeFormModal({ recipe, lookups, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [videoDragOver, setVideoDragOver] = useState(false);
  const [dirtyFields, setDirtyFields] = useState(new Set());
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const detailQuery = useRecipeDetail(recipe?.id);

  const full = useMemo(
    () => ({ ...(recipe || {}), ...(detailQuery.data || {}) }),
    [recipe, detailQuery.data],
  );

  useEffect(() => {
    let initialIngredients = [{ quantity: '', unit: '', name: '' }];
    if (full.ingredientsData && full.ingredientsData.length > 0) {
      initialIngredients = full.ingredientsData.map(item => ({
        quantity: item.quantity !== null && item.quantity !== undefined ? String(item.quantity) : '',
        unit: item.unit || '',
        name: item.name || '',
      }));
    } else if (full.ingredients && full.ingredients.length > 0) {
      initialIngredients = full.ingredients.map(line => {
        if (typeof line === 'string') {
          return parseIngredientLine(line);
        } else if (line && typeof line === 'object') {
          return {
            quantity: line.quantity !== null && line.quantity !== undefined ? String(line.quantity) : '',
            unit: line.unit || '',
            name: line.name || '',
          };
        }
        return { quantity: '', unit: '', name: '' };
      });
    }

    let initialInstructions = [''];
    if (full.instructions && full.instructions.length > 0) {
      initialInstructions = full.instructions.map(item => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.step || '';
        return '';
      }).filter(Boolean);
      if (initialInstructions.length === 0) {
        initialInstructions = [''];
      }
    }

    setForm({
      name: full.name || '',
      description: full.description || '',
      mealTypeId: toText(full.mealTypeId),
      cuisineId: toText(full.cuisineId),
      dietTypeId: toText(full.dietTypeId),
      difficultyLevelId: toText(full.difficultyLevelId),
      prepTimeMinutes: toText(full.prepTimeMinutes),
      cookTimeMinutes: toText(full.cookTimeMinutes),
      servings: toText(full.servings),
      calories: toText(full.calories),
      protein: toText(full.protein),
      carbs: toText(full.carbs),
      fat: toText(full.fat),
      isActive: full.isActive !== false,
      ingredients: initialIngredients,
      instructions: initialInstructions,
      tipsText: (full.tips || []).join('\n'),
      images: [],
      video: null,
      deleteVideoUrl: '',
      deleteImageUrls: [],
    });

    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
    // Reset dirty tracking whenever the original data changes (modal re-open)
    setDirtyFields(new Set());
  }, [full]);

  function markDirty(...fields) {
    setDirtyFields((prev) => {
      const next = new Set(prev);
      fields.forEach((f) => next.add(f));
      return next;
    });
  }

  function updateField(field, value) {
    markDirty(field);
    setForm((current) => ({ ...current, [field]: value }));
  }

  function addIngredientRow() {
    markDirty('ingredients');
    setForm((current) => ({
      ...current,
      ingredients: [...current.ingredients, { quantity: '', unit: '', name: '' }],
    }));
  }

  function removeIngredient(index) {
    markDirty('ingredients');
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, i) => i !== index),
    }));
  }

  function updateIngredient(index, field, value) {
    markDirty('ingredients');
    setForm((current) => {
      const updated = [...current.ingredients];
      updated[index] = { ...updated[index], [field]: value };
      return { ...current, ingredients: updated };
    });
  }

  function addInstructionRow() {
    markDirty('instructions');
    setForm((current) => ({
      ...current,
      instructions: [...current.instructions, ''],
    }));
  }

  function removeInstructionStep(index) {
    markDirty('instructions');
    setForm((current) => ({
      ...current,
      instructions: current.instructions.filter((_, i) => i !== index),
    }));
  }

  function updateInstructionStep(index, value) {
    markDirty('instructions');
    setForm((current) => {
      const updated = [...current.instructions];
      updated[index] = value;
      return { ...current, instructions: updated };
    });
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

  const MAX_IMAGES = 1;

  function addImages(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
    if (!files.length) return;
    markDirty('images');
    setForm((current) => ({
      ...current,
      images: [files[0]],
      deleteImageUrls: [],
    }));
  }

  function removeNewImage() {
    markDirty('images');
    setForm((current) => ({ ...current, images: [] }));
  }

  function clearVideo() {
    updateField('video', null);
    if (videoInputRef.current) videoInputRef.current.value = '';
  }

  function handleImageDrop(event) {
    event.preventDefault();
    setImageDragOver(false);
    addImages(event.dataTransfer.files);
  }

  function setNewVideo(file) {
    if (file) {
      markDirty('video');
      setForm((current) => ({ ...current, video: file, deleteVideoUrl: '' }));
    }
  }

  function handleVideoDrop(event) {
    event.preventDefault();
    setVideoDragOver(false);
    setNewVideo(Array.from(event.dataTransfer.files || []).find((item) => item.type.startsWith('video/')));
  }

  function removeVideo() {
    if (form.video) {
      clearVideo();
    } else if (full.videoUrl) {
      updateField('deleteVideoUrl', full.videoUrl);
    }
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
        deleteImageUrls: exists ? [] : [url],
      };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    const isUpdate = Boolean(recipe?.id);

    // Helper — only include a field in the payload when creating OR when it was dirtied
    const pick = (field, value) => (!isUpdate || dirtyFields.has(field) ? { [field]: value } : {});

    const payload = {
      id: recipe?.id,
      // name is ALWAYS required — include it for both create and update
      name: form.name.trim(),
      ...pick('description', form.description.trim()),
      ...pick('mealTypeId', form.mealTypeId),
      ...pick('cuisineId', form.cuisineId),
      ...pick('dietTypeId', form.dietTypeId),
      ...pick('difficultyLevelId', form.difficultyLevelId),
      ...pick('prepTimeMinutes', form.prepTimeMinutes),
      ...pick('cookTimeMinutes', form.cookTimeMinutes),
      ...pick('servings', form.servings),
      ...pick('calories', form.calories),
      ...pick('protein', form.protein),
      ...pick('carbs', form.carbs),
      ...pick('fat', form.fat),
      ...pick('isActive', form.isActive),
      ...pick('ingredients', (form.ingredients || []).map(ing => ({
        quantity: ing.quantity,
        unit: ing.unit,
        name: ing.name.trim(),
      }))),
      ...pick('instructions', (form.instructions || []).map(step => step.trim()).filter(Boolean)),
      ...((!isUpdate || dirtyFields.has('tipsText')) ? { tips: linesToArray(form.tipsText) } : {}),
      // Media fields — only sent when a new file is attached / deletion requested
      images: form.images,
      video: form.video,
      deleteVideoUrl: form.deleteVideoUrl,
      deleteImageUrls: form.deleteImageUrls,
    };

    onSave(payload);
  }

  const hasExistingVideo = Boolean(full.videoUrl);
  const visibleExistingImages = (full.imageUrls || []).filter((url) => !form.deleteImageUrls.includes(url));
  const emptyImageSlots = Math.max(0, MAX_IMAGES - visibleExistingImages.length - imagePreviews.length);

  const mealTypes = toArray(lookups?.mealTypes);
  const cuisines = toArray(lookups?.cuisines);
  const dietTypes = toArray(lookups?.dietTypes);
  const difficultyLevels = toArray(lookups?.difficultyLevels);

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
          <DialogTitle>{recipe ? 'Edit Recipe' : 'Add Recipe'}</DialogTitle>
          <DialogDescription className="sr-only">
            Provide the details to {recipe ? 'update the' : 'create a new'} recipe.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Name */}
            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="recipeName">Recipe Name</Label>
              <Input id="recipeName" type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="recipeDescription">Description</Label>
              <Textarea
                id="recipeDescription"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Brief description of the recipe"
              />
            </div>

            {/* Lookup selects */}
            {renderLookupSelect('Meal Type', 'mealTypeId', mealTypes, full.mealType)}
            {renderLookupSelect('Cuisine', 'cuisineId', cuisines, full.cuisine)}
            {renderLookupSelect('Diet Type', 'dietTypeId', dietTypes, full.dietType)}
            {renderLookupSelect('Difficulty', 'difficultyLevelId', difficultyLevels, full.difficultyLevel)}

            {/* Time & Servings */}
            <div>
              <Label className="mb-1.5">Prep Time (minutes)</Label>
              <Input type="number" min="0" value={form.prepTimeMinutes} onChange={(e) => updateField('prepTimeMinutes', e.target.value)} placeholder="e.g. 15" />
            </div>
            <div>
              <Label className="mb-1.5">Cook Time (minutes)</Label>
              <Input type="number" min="0" value={form.cookTimeMinutes} onChange={(e) => updateField('cookTimeMinutes', e.target.value)} placeholder="e.g. 30" />
            </div>
            <div>
              <Label className="mb-1.5">Servings</Label>
              <Input type="number" min="1" value={form.servings} onChange={(e) => updateField('servings', e.target.value)} placeholder="e.g. 2" />
            </div>

            {/* Nutritional Info header */}
            <div className="sm:col-span-2 mt-1">
              <p className="text-sm font-semibold text-foreground">Nutritional Info (per serving)</p>
              <p className="text-xs text-muted-foreground">Optional — fill in what you know.</p>
            </div>

            {/* Macros */}
            <div>
              <Label className="mb-1.5">Calories (kcal)</Label>
              <Input type="number" min="0" step="any" value={form.calories} onChange={(e) => updateField('calories', e.target.value)} placeholder="e.g. 480" />
            </div>
            <div>
              <Label className="mb-1.5">Protein (g)</Label>
              <Input type="number" min="0" step="any" value={form.protein} onChange={(e) => updateField('protein', e.target.value)} placeholder="e.g. 42" />
            </div>
            <div>
              <Label className="mb-1.5">Carbs (g)</Label>
              <Input type="number" min="0" step="any" value={form.carbs} onChange={(e) => updateField('carbs', e.target.value)} placeholder="e.g. 38" />
            </div>
            <div>
              <Label className="mb-1.5">Fat (g)</Label>
              <Input type="number" min="0" step="any" value={form.fat} onChange={(e) => updateField('fat', e.target.value)} placeholder="e.g. 14" />
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between gap-3 rounded-lg border p-3 sm:col-span-2">
              <div>
                <Label className="mb-0.5">Active</Label>
                <p className="text-xs text-muted-foreground">Make this recipe visible in the app.</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => updateField('isActive', checked)}
                aria-label="Recipe active"
              />
            </div>

            {/* Ingredients */}
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Ingredients</Label>
              <div className="space-y-2">
                {(form.ingredients || []).map((ing, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Qty"
                      value={ing.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      className="w-20"
                    />
                    <Input
                      type="text"
                      placeholder="Unit (e.g. g, cup)"
                      value={ing.unit}
                      onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      className="w-32"
                    />
                    <Input
                      type="text"
                      placeholder="Ingredient name"
                      value={ing.name}
                      onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      className="flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIngredient(index)}
                      disabled={(form.ingredients || []).length === 1}
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={addIngredientRow}
              >
                + Add Ingredient
              </Button>
            </div>

            {/* Instructions */}
            <div className="sm:col-span-2">
              <Label className="mb-2 block">Instructions</Label>
              <div className="space-y-3">
                {(form.instructions || []).map((step, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="mt-2.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-500">
                      {index + 1}
                    </span>
                    <Textarea
                      placeholder={`Describe step ${index + 1}`}
                      value={step}
                      onChange={(e) => updateInstructionStep(index, e.target.value)}
                      rows={2}
                      className="flex-1 min-h-[50px] resize-y"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInstructionStep(index)}
                      disabled={(form.instructions || []).length === 1}
                      className="mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 text-xs"
                onClick={addInstructionRow}
              >
                + Add Step
              </Button>
            </div>

            {/* Tips */}
            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="recipeTips">Tips <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                id="recipeTips"
                value={form.tipsText}
                onChange={(e) => updateField('tipsText', e.target.value)}
                placeholder="One tip per line"
                rows={3}
              />
            </div>

            {/* Thumbnail */}
            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="recipeImage">Thumbnail</Label>
              <input
                type="file"
                id="recipeImage"
                ref={imageInputRef}
                accept="image/*"
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
                onDragOver={(event) => { event.preventDefault(); setImageDragOver(true); }}
                onDragLeave={() => setImageDragOver(false)}
                onDrop={handleImageDrop}
                className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
                  imageDragOver ? 'border-primary bg-primary/10' : 'border-input hover:border-muted-foreground/60'
                }`}
              >
                {imagePreviews.length > 0 ? (
                  <div className="relative flex items-start gap-3" onClick={(event) => event.stopPropagation()}>
                    <img src={imagePreviews[0].url} alt="New Preview" className="h-28 w-44 shrink-0 rounded-md object-cover border" />
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="truncate pr-8 text-sm font-medium">{imagePreviews[0].file.name}</p>
                      <p className="truncate text-xs text-muted-foreground">New thumbnail upload — replaces current</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeNewImage(); }}
                      aria-label="Remove new image"
                      className="absolute right-0 top-0 rounded-full bg-background/80 p-1 text-foreground hover:bg-destructive hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : visibleExistingImages.length > 0 ? (
                  <div className="relative flex items-start gap-3" onClick={(event) => event.stopPropagation()}>
                    <img src={visibleExistingImages[0]} alt="Current Thumbnail" className="h-28 w-44 shrink-0 rounded-md object-cover border" />
                    <div className="min-w-0 flex-1 pt-1">
                      <p className="truncate pr-8 text-sm font-medium">Current Thumbnail</p>
                      <p className="truncate text-xs text-muted-foreground">{visibleExistingImages[0]}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleDeleteImage(visibleExistingImages[0]); }}
                      aria-label="Remove current image"
                      className="absolute right-0 top-0 rounded-full bg-background/80 p-1 text-foreground hover:bg-destructive hover:text-white"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 py-5 text-muted-foreground">
                    <Plus className="size-6" />
                    <p className="text-sm">Drag &amp; drop a thumbnail image here, or click to browse</p>
                    {form.deleteImageUrls.length > 0 ? (
                      <p className="text-xs text-destructive">
                        Thumbnail will be deleted on save.{' '}
                        <button
                          type="button"
                          className="underline"
                          onClick={(event) => {
                            event.stopPropagation();
                            updateField('deleteImageUrls', []);
                          }}
                        >
                          Undo
                        </button>
                      </p>
                    ) : (
                      <p className="text-xs">One thumbnail image file</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Video */}
            <div className="sm:col-span-2">
              <Label className="mb-1.5" htmlFor="recipeVideo">
                Video File (stored at original quality - no compression)
              </Label>
              <input
                type="file"
                id="recipeVideo"
                ref={videoInputRef}
                accept="video/*"
                hidden
                onChange={(event) => setNewVideo(event.target.files?.[0])}
              />
              {(() => {
                const shown = form.video
                  ? { src: videoPreviewUrl, title: form.video.name, caption: `${formatSize(form.video.size)} · new upload${hasExistingVideo ? ' — replaces current video' : ''}` }
                  : hasExistingVideo && !form.deleteVideoUrl
                    ? { src: full.videoUrl, title: 'Current video', caption: full.videoUrl }
                    : null;
                return (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => videoInputRef.current?.click()}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') videoInputRef.current?.click();
                    }}
                    onDragOver={(event) => { event.preventDefault(); setVideoDragOver(true); }}
                    onDragLeave={() => setVideoDragOver(false)}
                    onDrop={handleVideoDrop}
                    className={`rounded-lg border-2 border-dashed p-3 transition-colors ${
                      videoDragOver ? 'border-primary bg-primary/10' : 'border-input hover:border-muted-foreground/60'
                    }`}
                  >
                    {shown ? (
                      <div className="relative flex items-start gap-3" onClick={(event) => event.stopPropagation()}>
                        <video src={shown.src} controls preload="metadata" className="h-28 w-44 shrink-0 rounded-md bg-black object-contain" />
                        <div className="min-w-0 flex-1 pt-1">
                          <p className="truncate pr-8 text-sm font-medium">{shown.title}</p>
                          <p className="truncate text-xs text-muted-foreground">{shown.caption}</p>
                        </div>
                        <button
                          type="button"
                          onClick={removeVideo}
                          aria-label="Remove video"
                          className="absolute right-0 top-0 rounded-full bg-background/80 p-1 text-foreground hover:bg-destructive hover:text-white"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-5 text-muted-foreground">
                        <Film className="size-6" />
                        <p className="text-sm">Drag &amp; drop a video here, or click to browse</p>
                        {form.deleteVideoUrl ? (
                          <p className="text-xs text-destructive">
                            Current video will be deleted on save.{' '}
                            <button
                              type="button"
                              className="underline"
                              onClick={(event) => {
                                event.stopPropagation();
                                updateField('deleteVideoUrl', '');
                              }}
                            >
                              Undo
                            </button>
                          </p>
                        ) : (
                          <p className="text-xs">One video · preview plays before saving</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
              <p className="mt-1.5 text-xs text-muted-foreground">Uploading a new video replaces the current video on update.</p>
            </div>
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
