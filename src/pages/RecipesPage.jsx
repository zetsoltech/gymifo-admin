import { useEffect, useMemo, useState } from 'react';
import {
  useDeleteRecipe,
  useRecipeLookupsQuery,
  useRecipesQuery,
  useSaveRecipe,
  useToggleRecipeActive,
} from '../hooks/useRecipes.js';
import { RecipeFormModal } from '../components/RecipeFormModal.jsx';
import { RecipePreviewModal } from '../components/RecipePreviewModal.jsx';
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

function normalizeRecipe(recipe) {
  if (!recipe) return recipe;
  const videoUrl = recipe.videoUrl ?? recipe.video_url ?? recipe.videoPath ?? recipe.video_path ?? '';
  const imageUrls = recipe.imageUrls || (recipe.imageUrl ? [recipe.imageUrl] : []);
  
  let ingredients = [];
  if (Array.isArray(recipe.ingredients)) {
    ingredients = recipe.ingredients.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const qty = item.quantity ?? '';
        const unit = item.unit ?? '';
        const name = item.name ?? '';
        return `${qty}${unit ? ' ' + unit : ''} ${name}`.trim().replace(/\s+/g, ' ');
      }
      return '';
    }).filter(Boolean);
  }

  let instructions = [];
  if (Array.isArray(recipe.instructions)) {
    instructions = recipe.instructions.map(item => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.step || '';
      return '';
    }).filter(Boolean);
  } else if (recipe.instructions && Array.isArray(recipe.instructions.steps)) {
    instructions = recipe.instructions.steps;
  }

  const mealTypeId = recipe.mealTypeId || (typeof recipe.mealTypeLookup === 'object' ? recipe.mealTypeLookup?.id : undefined) || (typeof recipe.mealType === 'object' ? recipe.mealType?.id : recipe.mealType);
  const cuisineId = recipe.cuisineTypeId || recipe.cuisineId || (typeof recipe.cuisineTypeLookup === 'object' ? recipe.cuisineTypeLookup?.id : undefined) || (typeof recipe.cuisineLookup === 'object' ? recipe.cuisineLookup?.id : undefined) || (typeof recipe.cuisineType === 'object' ? recipe.cuisineType?.id : undefined) || (typeof recipe.cuisine === 'object' ? recipe.cuisine?.id : recipe.cuisine);
  const dietTypeId = recipe.dietTypeId || (typeof recipe.dietType === 'object' ? recipe.dietType?.id : recipe.dietType);
  const difficultyLevelId = recipe.difficultyId || recipe.difficultyLevelId || (typeof recipe.difficultyLookup === 'object' ? recipe.difficultyLookup?.id : undefined) || (typeof recipe.difficultyLevel === 'object' ? recipe.difficultyLevel?.id : recipe.difficultyLevel);

  return {
    ...recipe,
    id: recipe.id ?? recipe._id,
    name: recipe.name ?? recipe.recipeName ?? recipe.title ?? '',
    description: recipe.description || '',
    mealType: recipe.mealTypeLookup || recipe.mealType || '',
    cuisine: recipe.cuisineTypeLookup || recipe.cuisineLookup || recipe.cuisineType || recipe.cuisine || '',
    dietType: recipe.dietTypeLookup || recipe.dietType || '',
    difficultyLevel: recipe.difficultyLookup || recipe.difficulty || recipe.difficultyLevel || '',
    mealTypeId,
    cuisineId,
    dietTypeId,
    difficultyLevelId,
    prepTimeMinutes: recipe.prepTimeMinutes ?? recipe.prepTime ?? null,
    cookTimeMinutes: recipe.cookTimeMinutes ?? null,
    servings: recipe.servings ?? null,
    calories: recipe.calories ?? null,
    protein: recipe.protein ?? null,
    carbs: recipe.carbs ?? null,
    fat: recipe.fat ?? null,
    videoUrl,
    imageUrls,
    ingredients,
    instructions,
    tips: recipe.tips || [],
  };
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatMacro(value, unit = '') {
  if (value === null || value === undefined || value === '') return '-';
  return `${value}${unit}`;
}

function formatTime(mins) {
  if (mins === null || mins === undefined || mins === '') return '-';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function lookupOptionValue(item) {
  return String(item.id || item._id || item.key || item.value || '');
}

export function RecipesPage({ showToast }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState({
    mealType: '',
    cuisine: '',
    dietType: '',
    difficulty: '',
    status: '',
    video: '',
  });
  const [page, setPage] = useState(1);
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewRecipe, setPreviewRecipe] = useState(null);

  // Debounce the search box so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const queryParams = {
    page,
    limit: pageSize,
    search: debouncedSearch,
    mealType: filters.mealType,
    cuisine: filters.cuisine,
    dietType: filters.dietType,
    difficulty: filters.difficulty,
    isActive: filters.status === '' ? undefined : filters.status === 'active',
    hasVideo: filters.video === '' ? undefined : filters.video === 'with',
  };

  const recipesQuery = useRecipesQuery(queryParams);
  const lookupsQuery = useRecipeLookupsQuery();
  const saveMutation = useSaveRecipe();
  const deleteMutation = useDeleteRecipe();
  const toggleActiveMutation = useToggleRecipeActive();

  const data = recipesQuery.data;
  const isLoading = recipesQuery.isPending || recipesQuery.isPlaceholderData;
  // Active rows first; inactive sink to the bottom.
  const recipes = useMemo(
    () => toArray(data?.recipes)
      .map(normalizeRecipe)
      .sort((a, b) => Number(a.isActive === false) - Number(b.isActive === false)),
    [data],
  );
  const total = Number(data?.total ?? recipes.length);
  const meta = { total, page: data?.page || page, limit: data?.limit || pageSize };
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  const lookups = lookupsQuery.data ?? {
    mealTypes: [],
    cuisines: [],
    dietTypes: [],
    difficultyLevels: [],
  };

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value === allValue ? '' : value }));
    setPage(1);
  }

  function openCreateModal() {
    setEditingRecipe(null);
    setIsFormOpen(true);
  }

  function openEditModal(recipe) {
    setEditingRecipe(recipe);
    setIsFormOpen(true);
  }

  async function handleSave(payload) {
    const isUpdate = Boolean(payload.id);
    const hasIngredientsPayload = Object.prototype.hasOwnProperty.call(payload, 'ingredients');
    const hasInstructionsPayload = Object.prototype.hasOwnProperty.call(payload, 'instructions');
    const ingredients = Array.isArray(payload.ingredients) ? payload.ingredients : [];
    const instructions = Array.isArray(payload.instructions) ? payload.instructions : [];

    if (!payload.name) {
      showToast('Recipe name is required.', 'error');
      return;
    }
    if ((!isUpdate || hasIngredientsPayload) && !ingredients.length) {
      showToast('At least one ingredient is required.', 'error');
      return;
    }
    if ((!isUpdate || hasInstructionsPayload) && !instructions.length) {
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
    if (!confirm('Delete this recipe?')) return;
    deleteMutation.mutate(id);
  }

  const mealTypes = toArray(lookups.mealTypes);
  const cuisines = toArray(lookups.cuisines);
  const dietTypes = toArray(lookups.dietTypes);
  const difficultyLevels = toArray(lookups.difficultyLevels);

  return (
    <section>
      <div className="mb-[22px] flex flex-col items-start justify-between gap-4 lg:flex-row">
        <div>
          <h1 className="text-2xl font-bold">Recipe Videos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage recipe records, images, and videos from the API.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <Input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search recipes"
            className="sm:w-60"
          />
          <Button type="button" onClick={openCreateModal}>
            + Add Recipe
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={filters.mealType || allValue} onValueChange={(value) => updateFilter('mealType', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Meal type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All meal types</SelectItem>
            {(mealTypes.length ? mealTypes : [
              { key: 'breakfast', value: 'Breakfast' },
              { key: 'lunch', value: 'Lunch' },
              { key: 'dinner', value: 'Dinner' },
              { key: 'snack', value: 'Snack' },
            ]).map((item) => (
              <SelectItem key={lookupOptionValue(item)} value={lookupOptionValue(item)}>
                {item.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.cuisine || allValue} onValueChange={(value) => updateFilter('cuisine', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Cuisine" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All cuisines</SelectItem>
            {(cuisines.length ? cuisines : [
              { key: 'american', value: 'American' },
              { key: 'mediterranean', value: 'Mediterranean' },
              { key: 'asian', value: 'Asian' },
            ]).map((item) => (
              <SelectItem key={lookupOptionValue(item)} value={lookupOptionValue(item)}>
                {item.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.dietType || allValue} onValueChange={(value) => updateFilter('dietType', value)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Diet type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={allValue}>All diet types</SelectItem>
            {(dietTypes.length ? dietTypes : [
              { key: 'high-protein', value: 'High Protein' },
              { key: 'vegan', value: 'Vegan' },
              { key: 'keto', value: 'Keto' },
              { key: 'low-carb', value: 'Low Carb' },
            ]).map((item) => (
              <SelectItem key={lookupOptionValue(item)} value={lookupOptionValue(item)}>
                {item.value}
              </SelectItem>
            ))}
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
            ]).map((item) => (
              <SelectItem key={lookupOptionValue(item)} value={lookupOptionValue(item)}>
                {item.value}
              </SelectItem>
            ))}
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
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Meal Type</TableHead>
                <TableHead>Cuisine</TableHead>
                <TableHead>Diet</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Cal</TableHead>
                <TableHead>Video</TableHead>
                <TableHead>Active</TableHead>
                <TableHead style={{ width: 110 }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize }).map((_, index) => (
                  <TableRow key={`recipe-skeleton-${index}`}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-7 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-9 rounded-full" /></TableCell>
                    <TableCell><div className="flex gap-2"><Skeleton className="size-8 rounded-md" /><Skeleton className="size-8 rounded-md" /></div></TableCell>
                  </TableRow>
                ))
              ) : recipes.length === 0 ? (
                <TableRow><TableCell colSpan="10" className="py-8 text-center text-muted-foreground">No recipes found.</TableCell></TableRow>
              ) : recipes.map((recipe) => (
                <TableRow
                  key={recipe.id}
                  data-inactive={recipe.isActive === false ? '' : undefined}
                  className="data-[inactive]:bg-destructive/10 data-[inactive]:hover:bg-destructive/15"
                >
                  <TableCell className="font-medium">{recipe.name || '-'}</TableCell>
                  <TableCell>{refValue(recipe.mealType)}</TableCell>
                  <TableCell>{refValue(recipe.cuisine)}</TableCell>
                  <TableCell>{refValue(recipe.dietType)}</TableCell>
                  <TableCell>{refValue(recipe.difficultyLevel)}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {recipe.prepTimeMinutes || recipe.cookTimeMinutes
                        ? `${formatTime((recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0))}`
                        : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{formatMacro(recipe.calories, ' kcal')}</span>
                  </TableCell>
                  <TableCell>
                    {recipe.videoUrl ? (
                      <Button type="button" variant="outline" size="sm" onClick={() => setPreviewRecipe(recipe)}>
                        View
                      </Button>
                    ) : (
                      <Badge variant="destructive">No video</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={recipe.isActive !== false}
                      disabled={toggleActiveMutation.isPending}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: recipe.id, isActive: checked })
                      }
                      aria-label={recipe.isActive === false ? 'Activate recipe' : 'Disable recipe'}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => openEditModal(recipe)}
                        aria-label="Edit recipe"
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(recipe.id)}
                        aria-label="Delete recipe"
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
        <RecipeFormModal
          recipe={editingRecipe}
          lookups={lookups}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSave}
        />
      )}

      {previewRecipe && (
        <RecipePreviewModal
          recipe={previewRecipe}
          onClose={() => setPreviewRecipe(null)}
        />
      )}
    </section>
  );
}
