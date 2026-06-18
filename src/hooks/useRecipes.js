import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  deleteRecipe,
  getRecipe,
  listRecipes,
  listLookups,
  saveRecipe,
  setRecipeActive,
} from '../api.ts';

const recipesKey = (params) => ['recipes', params];
const recipeLookupKey = ['recipe-lookups'];

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

/** Paginated/filtered recipe list. Re-runs whenever params change. */
export function useRecipesQuery(params) {
  return useQuery({
    queryKey: recipesKey(params),
    queryFn: () => listRecipes(params),
    placeholderData: (previous) => previous,
  });
}

/** All recipe lookup categories loaded together as one cache entry. */
export function useRecipeLookupsQuery() {
  return useQuery({
    queryKey: recipeLookupKey,
    queryFn: async () => {
      const [mealTypes, cuisines, dietTypes, difficultyLevels] = await Promise.all([
        listLookups('meal_type'),
        listLookups('cuisine_type'),
        listLookups('diet_type'),
        listLookups('recipe_difficulty'),
      ]);
      return {
        mealTypes: toArray(mealTypes),
        cuisines: toArray(cuisines),
        dietTypes: toArray(dietTypes),
        difficultyLevels: toArray(difficultyLevels),
      };
    },
  });
}

/**
 * Full detail for one recipe (GET /recipes/:id). The list rows may not
 * carry every relation, so the edit form fetches the complete record.
 */
export function useRecipeDetail(id) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: () => getRecipe(id),
    enabled: Boolean(id),
  });
}

const saveToastId = 'save-recipe';

/** Create/update a recipe, then refresh the list. */
export function useSaveRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => saveRecipe(payload),
    onMutate: (payload) => {
      const hasMedia = Boolean(payload.images?.length || payload.video);
      toast.loading(
        hasMedia ? 'Uploading media… this may take a moment.' : 'Saving recipe…',
        { id: saveToastId, duration: Infinity },
      );
    },
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success(payload.id ? 'Recipe updated.' : 'Recipe created.', {
        id: saveToastId,
        duration: 4000,
      });
    },
    onError: () => {
      toast.dismiss(saveToastId);
    },
  });
}

/** Delete a recipe, then refresh the list. */
export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe deleted.');
    },
  });
}

/** Toggle a recipe active/inactive with an optimistic UI update. */
export function useToggleRecipeActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => setRecipeActive(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ['recipes'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['recipes'] });
      snapshots.forEach(([key, data]) => {
        if (!data || !Array.isArray(data.recipes)) return;
        queryClient.setQueryData(key, {
          ...data,
          recipes: data.recipes.map((recipe) =>
            String(recipe.id ?? recipe._id) === String(id) ? { ...recipe, isActive } : recipe,
          ),
        });
      });
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      context?.snapshots?.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (_data, { isActive }) => {
      toast.success(isActive ? 'Recipe activated.' : 'Recipe disabled.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}
