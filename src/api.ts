const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
const ACCEPT_LANGUAGE = import.meta.env.VITE_ACCEPT_LANGUAGE || 'en';

const STORAGE_KEY = 'gymifo_exercises';
const RECIPES_STORAGE_KEY = 'gymifo_recipes';
const TOKEN_KEY = 'gymifo_token';
const REFRESH_TOKEN_KEY = 'gymifo_refresh_token';
const USER_EMAIL_KEY = 'gymifo_admin_email';

export type LookupRef = {
  id: string;
  key: string;
  value: string;
};

export type Lookup = LookupRef & {
  category: string;
  status?: 'active' | 'inactive';
  imageUrl?: string;
  icon?: string;
  parentId?: string;
  sortOrder?: number;
  isSelectable?: boolean;
};

export type Exercise = {
  id: string | number;
  name: string;
  description?: string;
  muscleGroup?: LookupRef | string;
  equipment?: LookupRef | string;
  bodyPart?: LookupRef | string;
  bodyArea?: LookupRef | string;
  exerciseType?: LookupRef | string;
  difficultyLevel?: LookupRef | string;
  imageUrls?: string[];
  videoUrl?: string;
  instructions?: string[];
  tips?: string[];
  isWarmup?: boolean;
  isActive?: boolean;
  met?: number;
  tier?: number;
  riskLevel?: number;
  environment?: string;
  createdAt?: string;
  _id?: string;
};

export type ListExercisesParams = {
  page?: number;
  limit?: number;
  search?: string;
  muscleGroup?: string;
  equipment?: string;
  type?: string;
  difficulty?: string;
  bodyPart?: string;
  isWarmup?: boolean;
  isActive?: boolean;
  hasVideo?: boolean;
  sortBy?: 'name' | 'met' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
};

export type ExerciseListResponse = {
  exercises: Exercise[];
  total: number;
  page: number;
  limit: number;
};

export type SaveExercisePayload = {
  id?: string | number;
  name: string;
  description?: string;
  muscleGroupId: string;
  secondaryMuscleGroupId?: string;
  equipmentId: string;
  bodyPartId?: string;
  bodyAreaId?: string;
  exerciseTypeId: string;
  difficultyLevelId: string;
  movementPatternId?: string;
  progressionGroupId?: string;
  regressionExerciseId?: string;
  nextProgressionExerciseId?: string;
  set?: string;
  tier?: number | string;
  riskLevel?: number | string;
  environment?: string;
  progressionOrder?: number | string;
  met?: number | string;
  trackability?: boolean;
  suggestedFormat?: string;
  timeInSec?: number | string;
  isWarmup?: boolean;
  isActive?: boolean;
  instructions: string[];
  images?: File[];
  video?: File | null;
  deleteVideoUrl?: string;
  deleteImageUrls?: string[];
};

// ─── Recipe Types ────────────────────────────────────────────────────────────

export type Recipe = {
  id: string | number;
  name: string;
  description?: string;
  mealType?: LookupRef | string;
  cuisine?: LookupRef | string;
  dietType?: LookupRef | string;
  difficultyLevel?: LookupRef | string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUrls?: string[];
  videoUrl?: string;
  ingredients?: string[];
  ingredientsData?: { id?: string; quantity?: string | number | null; unit?: string; name: string }[];
  instructions?: string[];
  tips?: string[];
  isActive?: boolean;
  createdAt?: string;
  _id?: string;
  mealTypeId?: string;
  cuisineId?: string;
  dietTypeId?: string;
  difficultyLevelId?: string;
};

export type ListRecipesParams = {
  page?: number;
  limit?: number;
  search?: string;
  mealType?: string;
  cuisine?: string;
  dietType?: string;
  difficulty?: string;
  isActive?: boolean;
  hasVideo?: boolean;
  sortBy?: 'name' | 'calories' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
};

export type RecipeListResponse = {
  recipes: Recipe[];
  total: number;
  page: number;
  limit: number;
};

export type SaveRecipePayload = {
  id?: string | number;
  name: string;
  description?: string;
  mealTypeId?: string;
  cuisineId?: string;
  dietTypeId?: string;
  difficultyLevelId?: string;
  prepTimeMinutes?: number | string;
  cookTimeMinutes?: number | string;
  servings?: number | string;
  calories?: number | string;
  protein?: number | string;
  carbs?: number | string;
  fat?: number | string;
  isActive?: boolean;
  ingredients?: (string | { quantity?: string | number | null; unit?: string; name: string })[];
  instructions?: string[];
  tips?: string[];
  images?: File[];
  video?: File | null;
  deleteVideoUrl?: string;
  deleteImageUrls?: string[];
};

// ─────────────────────────────────────────────────────────────────────────────

export type DashboardPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

type LoginResponse = {
  access_token?: string;
  refresh_token?: string;
  token?: string;
  data?: {
    access_token?: string;
    refresh_token?: string;
    token?: string;
  };
};

type RequestErrorPayload = {
  message?: string | string[];
  error?: string;
  data?: unknown;
};

const mockLookups: Lookup[] = [
  { id: 'mg-chest', category: 'muscle_group', key: 'chest', value: 'Chest', status: 'active' },
  { id: 'mg-back', category: 'muscle_group', key: 'back', value: 'Back', status: 'active' },
  { id: 'mg-legs', category: 'muscle_group', key: 'legs', value: 'Legs', status: 'active' },
  { id: 'eq-barbell', category: 'equipment', key: 'barbell', value: 'Barbell', status: 'active' },
  { id: 'eq-dumbbell', category: 'equipment', key: 'dumbbell', value: 'Dumbbell', status: 'active' },
  { id: 'eq-cable', category: 'equipment', key: 'cable', value: 'Cable', status: 'active' },
  { id: 'type-compound', category: 'exercise_type', key: 'compound', value: 'Compound', status: 'active' },
  { id: 'type-isolation', category: 'exercise_type', key: 'isolation', value: 'Isolation', status: 'active' },
  { id: 'diff-beginner', category: 'difficulty_level', key: 'beginner', value: 'Beginner', status: 'active' },
  { id: 'diff-intermediate', category: 'difficulty_level', key: 'intermediate', value: 'Intermediate', status: 'active' },
  { id: 'diff-advanced', category: 'difficulty_level', key: 'advanced', value: 'Advanced', status: 'active' },
  { id: 'bp-chest', category: 'body_part', key: 'chest', value: 'Chest', status: 'active' },
  { id: 'bp-back', category: 'body_part', key: 'back', value: 'Back', status: 'active' },
  
  // Recipe Lookups
  { id: 'breakfast', category: 'meal_type', key: 'breakfast', value: 'Breakfast', status: 'active' },
  { id: 'lunch', category: 'meal_type', key: 'lunch', value: 'Lunch', status: 'active' },
  { id: 'dinner', category: 'meal_type', key: 'dinner', value: 'Dinner', status: 'active' },
  { id: 'snack', category: 'meal_type', key: 'snack', value: 'Snack', status: 'active' },
  { id: 'american', category: 'cuisine_type', key: 'american', value: 'American', status: 'active' },
  { id: 'mediterranean', category: 'cuisine_type', key: 'mediterranean', value: 'Mediterranean', status: 'active' },
  { id: 'asian', category: 'cuisine_type', key: 'asian', value: 'Asian', status: 'active' },
  { id: 'italian', category: 'cuisine_type', key: 'italian', value: 'Italian', status: 'active' },
  { id: 'mexican', category: 'cuisine_type', key: 'mexican', value: 'Mexican', status: 'active' },
  { id: 'high-protein', category: 'diet_type', key: 'high-protein', value: 'High Protein', status: 'active' },
  { id: 'vegan', category: 'diet_type', key: 'vegan', value: 'Vegan', status: 'active' },
  { id: 'keto', category: 'diet_type', key: 'keto', value: 'Keto', status: 'active' },
  { id: 'low-carb', category: 'diet_type', key: 'low-carb', value: 'Low Carb', status: 'active' },
  { id: 'vegetarian', category: 'diet_type', key: 'vegetarian', value: 'Vegetarian', status: 'active' },
  { id: 'beginner', category: 'recipe_difficulty', key: 'beginner', value: 'Beginner', status: 'active' },
  { id: 'intermediate', category: 'recipe_difficulty', key: 'intermediate', value: 'Intermediate', status: 'active' },
  { id: 'advanced', category: 'recipe_difficulty', key: 'advanced', value: 'Advanced', status: 'active' },
];

const seedExercises: Exercise[] = [
  {
    id: 1,
    name: 'Barbell Bench Press',
    description: 'A compound press for chest, shoulders, and triceps.',
    muscleGroup: mockLookups[0],
    equipment: mockLookups[3],
    bodyPart: mockLookups[6],
    exerciseType: { id: 'compound', key: 'compound', value: 'Compound' },
    difficultyLevel: { id: 'intermediate', key: 'intermediate', value: 'Intermediate' },
    instructions: ['Lie on a bench', 'Lower the bar to chest', 'Press upward'],
    tips: ['Keep shoulder blades set'],
    videoUrl: '',
    isWarmup: false,
    isActive: true,
    met: 5,
    createdAt: new Date().toISOString(),
  },
];

const mockDashboard = {
  overview: {
    signups: { value: 12847, changePercent: 8.2 },
    activeUsers: { value: 5932, changePercent: 3.1 },
    paidSubscribers: { value: 2408, changePercent: 12.5 },
    churnRate: { value: 2.4, suffix: '%', changePercent: -0.6 },
  },
  signupsTrend: Array.from({ length: 12 }, (_, index) => ({
    date: `M${index + 1}`,
    count: 120 + index * 28,
  })),
  paidVsFree: {
    snapshot: { paid: 2408, free: 10439, total: 12847 },
    trend: Array.from({ length: 12 }, (_, index) => ({
      date: `M${index + 1}`,
      paid: 1200 + index * 110,
      free: 8500 + index * 165,
      total: 9700 + index * 275,
    })),
  },
  revenue: {
    mrr: 23400,
    trend: Array.from({ length: 12 }, (_, index) => ({
      date: `M${index + 1}`,
      revenue: 8000 + index * 1400,
      transactions: 80 + index * 9,
    })),
  },
};

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getMockExercises(): Exercise[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) as Exercise[] : seedExercises;
}

function saveMockExercises(exercises: Exercise[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exercises));
}

const seedRecipes: Recipe[] = [
  {
    id: 1,
    name: 'Grilled Chicken & Quinoa Bowl',
    description: 'A high-protein meal perfect for post-workout recovery.',
    mealType: { id: 'lunch', key: 'lunch', value: 'Lunch' },
    cuisine: { id: 'american', key: 'american', value: 'American' },
    dietType: { id: 'high-protein', key: 'high-protein', value: 'High Protein' },
    difficultyLevel: { id: 'beginner', key: 'beginner', value: 'Beginner' },
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    servings: 2,
    calories: 480,
    protein: 42,
    carbs: 38,
    fat: 14,
    imageUrls: [],
    videoUrl: '',
    ingredients: ['200g chicken breast', '100g quinoa', '1 cup broccoli', 'olive oil', 'salt & pepper'],
    instructions: ['Season chicken and grill for 6 min each side.', 'Cook quinoa per packet instructions.', 'Steam broccoli 5 min.', 'Combine and serve.'],
    tips: ['Rest chicken 3 min before slicing.'],
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

function getMockRecipes(): Recipe[] {
  const saved = localStorage.getItem(RECIPES_STORAGE_KEY);
  return saved ? JSON.parse(saved) as Recipe[] : seedRecipes;
}

function saveMockRecipes(recipes: Recipe[]): void {
  localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(recipes));
}

function normalizeErrorMessage(payload: RequestErrorPayload | null): string {
  if (Array.isArray(payload?.message)) return payload.message.join(', ');
  return payload?.message || payload?.error || 'Request failed';
}

async function parseJsonResponse<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => null) as (T & RequestErrorPayload & { statusCode?: number }) | null;
  if (!res.ok) {
    throw new Error(normalizeErrorMessage(payload));
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data as T;
  }
  return payload as T;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();

  headers.set('Accept-Language', ACCEPT_LANGUAGE);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  return parseJsonResponse<T>(res);
}

function withQuery(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const queryString = query.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function appendArray(formData: FormData, key: string, values?: string[]): void {
  values?.filter(Boolean).forEach((value) => formData.append(key, value));
}

function appendFiles(formData: FormData, key: string, files?: File[]): void {
  files?.forEach((file) => formData.append(key, file));
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object' && Array.isArray((value as { data?: unknown }).data)) {
    return (value as { data: T[] }).data;
  }
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: T[] }).items;
  }
  return [];
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  if (USE_MOCK_API) {
    const accessToken = email && password ? 'demo-token' : '';
    if (!accessToken) throw new Error('Invalid credentials');
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_EMAIL_KEY, email);
    return { access_token: accessToken };
  }

  const data = await request<LoginResponse>('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const accessToken = data.access_token || data.token || data.data?.access_token || data.data?.token || '';
  const refreshToken = data.refresh_token || data.data?.refresh_token || '';
  if (!accessToken) throw new Error('Login response did not include an access token.');
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_EMAIL_KEY, email);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  return data;
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

export function isAuthenticated(): boolean {
  return Boolean(getToken());
}

export function getCurrentUser(): { email: string } {
  return { email: localStorage.getItem(USER_EMAIL_KEY) || '' };
}

export async function listLookups(category: string): Promise<Lookup[]> {
  if (USE_MOCK_API) {
    return mockLookups.filter((lookup) => lookup.category === category);
  }

  const data = await request<Lookup[] | { data?: Lookup[] }>(withQuery('/lookups', { category }));
  return asArray<Lookup>(data);
}

export async function getExercise(id: string | number): Promise<Exercise> {
  if (USE_MOCK_API) {
    const found = getMockExercises().find((item) => String(item.id) === String(id));
    if (!found) throw new Error('Exercise not found');
    return found;
  }

  return request<Exercise>(`/exercises/${id}`);
}

export async function listExercises(params: ListExercisesParams = {}): Promise<ExerciseListResponse> {
  if (USE_MOCK_API) {
    const page = params.page || 1;
    const limit = params.limit || 12;
    const search = params.search?.toLowerCase().trim();
    const all = getMockExercises().filter((exercise) => {
      if (search && !exercise.name.toLowerCase().includes(search)) return false;
      if (params.isWarmup !== undefined && Boolean(exercise.isWarmup) !== params.isWarmup) return false;
      if (params.isActive !== undefined && (exercise.isActive !== false) !== params.isActive) return false;
      if (params.hasVideo !== undefined && Boolean(exercise.videoUrl) !== params.hasVideo) return false;
      return true;
    });
    const start = (page - 1) * limit;
    return {
      exercises: all.slice(start, start + limit),
      total: all.length,
      page,
      limit,
    };
  }

  const data = await request<ExerciseListResponse | Exercise[] | { data?: ExerciseListResponse | Exercise[] }>(withQuery('/exercises', {
    page: params.page || 1,
    limit: params.limit || 12,
    includeInactive: true,
    search: params.search,
    muscleGroup: params.muscleGroup,
    equipment: params.equipment,
    type: params.type,
    difficulty: params.difficulty,
    bodyPart: params.bodyPart,
    isWarmup: params.isWarmup,
    isActive: params.isActive,
    hasVideo: params.hasVideo,
    sortBy: params.sortBy || 'createdAt',
    sortOrder: params.sortOrder || 'DESC',
  }));

  if (Array.isArray(data)) {
    return {
      exercises: data,
      total: data.length,
      page: params.page || 1,
      limit: params.limit || data.length || 10,
    };
  }

  const nested = (data as { data?: ExerciseListResponse | Exercise[] }).data;
  if (Array.isArray(nested)) {
    return {
      exercises: nested,
      total: nested.length,
      page: params.page || 1,
      limit: params.limit || nested.length || 10,
    };
  }

  const response = (nested && !Array.isArray(nested) ? nested : data) as Partial<ExerciseListResponse> & {
    items?: Exercise[];
    results?: Exercise[];
    rows?: Exercise[];
  };
  const exercises = asArray<Exercise>(response.exercises || response.items || response.results || response.rows);
  return {
    exercises,
    total: Number(response.total ?? exercises.length),
    page: Number(response.page ?? params.page ?? 1),
    limit: Number(response.limit ?? params.limit ?? 12),
  };
}

export async function saveExercise(payload: SaveExercisePayload): Promise<{ ok: boolean } | unknown> {
  if (USE_MOCK_API) {
    const exercises = getMockExercises();
    const videoUrl = payload.video ? URL.createObjectURL(payload.video) : '';
    const muscleGroup = mockLookups.find((lookup) => lookup.id === payload.muscleGroupId);
    const equipment = mockLookups.find((lookup) => lookup.id === payload.equipmentId);

    if (payload.id) {
      const existing = exercises.find((item) => String(item.id) === String(payload.id));
      if (!existing) throw new Error('Exercise not found');
      Object.assign(existing, {
        name: payload.name,
        description: payload.description,
        muscleGroup,
        equipment,
        exerciseType: { id: payload.exerciseTypeId, key: payload.exerciseTypeId, value: payload.exerciseTypeId },
        difficultyLevel: { id: payload.difficultyLevelId, key: payload.difficultyLevelId, value: payload.difficultyLevelId },
        instructions: payload.instructions,
      });
      if (videoUrl) existing.videoUrl = videoUrl;
      if (payload.deleteVideoUrl) existing.videoUrl = '';
    } else {
      const newId = exercises.length ? Math.max(...exercises.map((item) => Number(item.id))) + 1 : 1;
      exercises.push({
        id: newId,
        name: payload.name,
        description: payload.description,
        muscleGroup,
        equipment,
        exerciseType: { id: payload.exerciseTypeId, key: payload.exerciseTypeId, value: payload.exerciseTypeId },
        difficultyLevel: { id: payload.difficultyLevelId, key: payload.difficultyLevelId, value: payload.difficultyLevelId },
        instructions: payload.instructions,
        videoUrl,
        imageUrls: [],
        isWarmup: false,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }

    saveMockExercises(exercises);
    return { ok: true };
  }

  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('muscleGroupId', payload.muscleGroupId);
  formData.append('equipmentId', payload.equipmentId);
  formData.append('exerciseTypeId', payload.exerciseTypeId);
  formData.append('difficultyLevelId', payload.difficultyLevelId);
  appendArray(formData, 'instructions', payload.instructions);

  // Optional fields — only sent when provided so a partial update
  // doesn't clobber existing values with blanks.
  const appendField = (key: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, String(value));
    }
  };
  appendField('description', payload.description);
  appendField('secondaryMuscleGroupId', payload.secondaryMuscleGroupId);
  appendField('bodyPartId', payload.bodyPartId);
  appendField('bodyAreaId', payload.bodyAreaId);
  appendField('movementPatternId', payload.movementPatternId);
  appendField('progressionGroupId', payload.progressionGroupId);
  appendField('regressionExerciseId', payload.regressionExerciseId);
  appendField('nextProgressionExerciseId', payload.nextProgressionExerciseId);
  appendField('set', payload.set);
  appendField('tier', payload.tier);
  appendField('riskLevel', payload.riskLevel);
  appendField('environment', payload.environment);
  appendField('progressionOrder', payload.progressionOrder);
  appendField('met', payload.met);
  appendField('suggestedFormat', payload.suggestedFormat);
  appendField('timeInSec', payload.timeInSec);
  if (payload.trackability !== undefined) formData.append('trackability', String(payload.trackability));
  if (payload.isWarmup !== undefined) formData.append('isWarmup', String(payload.isWarmup));
  if (payload.isActive !== undefined) formData.append('isActive', String(payload.isActive));

  appendArray(formData, 'deleteImageUrls', payload.deleteImageUrls);
  appendFiles(formData, 'images', payload.images);
  if (payload.video) formData.append('video', payload.video);
  if (payload.deleteVideoUrl) formData.append('deleteVideoUrl', payload.deleteVideoUrl);

  return request(payload.id ? `/exercises/${payload.id}` : '/exercises', {
    method: payload.id ? 'PUT' : 'POST',
    body: formData,
  });
}

export async function deleteExercise(id: string | number): Promise<{ ok: boolean } | unknown> {
  if (USE_MOCK_API) {
    saveMockExercises(getMockExercises().filter((item) => String(item.id) !== String(id)));
    return { ok: true };
  }

  return request(`/exercises/${id}`, { method: 'DELETE' });
}

export async function setExerciseActive(id: string | number, isActive: boolean): Promise<{ ok: boolean } | unknown> {
  if (USE_MOCK_API) {
    const exercises = getMockExercises();
    const existing = exercises.find((item) => String(item.id) === String(id));
    if (existing) {
      existing.isActive = isActive;
      saveMockExercises(exercises);
    }
    return { ok: true };
  }

  const formData = new FormData();
  formData.append('isActive', String(isActive));
  return request(`/exercises/${id}`, { method: 'PATCH', body: formData });
}

// ─── Recipes API ─────────────────────────────────────────────────────────────

export function parseIngredientLine(line: string) {
  line = line.trim();
  const regex = /^(\d+(?:\/\d+)?(?:\s+\d+\/\d+)?|\d+\.\d+|\d+)\s*(g|ml|cup|cups|tbsp|tsp|oz|pcs|piece|pieces|slice|slices|can|cans|pinch|pinches|g\b|ml\b)?\s+(.*)$/i;
  const match = line.match(regex);
  if (match) {
    const qtyStr = match[1];
    let quantity = parseFloat(qtyStr);
    if (qtyStr.includes('/')) {
      const parts = qtyStr.split(/\s+/);
      if (parts.length === 2) {
        const integerPart = parseFloat(parts[0]);
        const fracParts = parts[1].split('/');
        quantity = integerPart + parseFloat(fracParts[0]) / parseFloat(fracParts[1]);
      } else {
        const fracParts = parts[0].split('/');
        quantity = parseFloat(fracParts[0]) / parseFloat(fracParts[1]);
      }
    }
    return {
      quantity: isNaN(quantity) ? '' : String(quantity),
      unit: match[2] ? match[2].toLowerCase() : 'pcs',
      name: match[3].trim()
    };
  }
  return {
    quantity: '',
    unit: 'pcs',
    name: line
  };
}

export function normalizeRecipe(recipe: any): Recipe {
  if (!recipe) return recipe;
  const videoUrl = recipe.videoUrl ?? recipe.video_url ?? recipe.videoPath ?? recipe.video_path ?? '';
  const imageUrls = recipe.imageUrls || (recipe.imageUrl ? [recipe.imageUrl] : []);
  
  let ingredients = [];
  let ingredientsData: { id?: string; quantity?: string | number | null; unit?: string; name: string }[] = [];
  if (Array.isArray(recipe.ingredients)) {
    const isObjectList = recipe.ingredients.length > 0 && typeof recipe.ingredients[0] === 'object';
    if (isObjectList) {
      ingredientsData = recipe.ingredients.map((item: any) => ({
        id: item.id,
        name: item.name || '',
        quantity: item.quantity !== null && item.quantity !== undefined ? String(item.quantity) : '',
        unit: item.unit || ''
      }));
      ingredients = recipe.ingredients.map((item: any) => {
        const qty = item.quantity ?? '';
        const unit = item.unit ?? '';
        const name = item.name ?? '';
        return `${qty}${unit ? ' ' + unit : ''} ${name}`.trim().replace(/\s+/g, ' ');
      }).filter(Boolean);
    } else {
      ingredients = recipe.ingredients;
      ingredientsData = recipe.ingredients.map((line: string) => parseIngredientLine(line));
    }
  }

  let instructions = [];
  if (Array.isArray(recipe.instructions)) {
    instructions = recipe.instructions.map((item: any) => {
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
    ingredientsData,
    instructions,
    tips: recipe.tips || [],
  };
}

export async function getRecipe(id: string | number): Promise<Recipe> {
  if (USE_MOCK_API) {
    const found = getMockRecipes().find((item) => String(item.id) === String(id));
    if (!found) throw new Error('Recipe not found');
    return normalizeRecipe(found);
  }
  const raw = await request<Recipe>(`/recipes/${id}`);
  return normalizeRecipe(raw);
}

export async function listRecipes(params: ListRecipesParams = {}): Promise<RecipeListResponse> {
  if (USE_MOCK_API) {
    const page = params.page || 1;
    const limit = params.limit || 12;
    const search = params.search?.toLowerCase().trim();
    const matchesLookupFilter = (lookup: LookupRef | string | undefined, value: string) => {
      if (!value) return true;
      if (!lookup) return false;
      if (typeof lookup === 'string') return lookup === value;
      return lookup.id === value || lookup.key === value;
    };
    const all = getMockRecipes().filter((recipe) => {
      if (search && !recipe.name.toLowerCase().includes(search)) return false;
      if (params.isActive !== undefined && (recipe.isActive !== false) !== params.isActive) return false;
      if (params.hasVideo !== undefined && Boolean(recipe.videoUrl) !== params.hasVideo) return false;
      
      if (params.mealType && !matchesLookupFilter(recipe.mealType, params.mealType)) return false;
      if (params.cuisine && !matchesLookupFilter(recipe.cuisine, params.cuisine)) return false;
      if (params.dietType && !matchesLookupFilter(recipe.dietType, params.dietType)) return false;
      if (params.difficulty && !matchesLookupFilter(recipe.difficultyLevel, params.difficulty)) return false;
      
      return true;
    });
    const start = (page - 1) * limit;
    return { recipes: all.slice(start, start + limit).map(normalizeRecipe), total: all.length, page, limit };
  }

  const data = await request<RecipeListResponse | Recipe[] | { data?: RecipeListResponse | Recipe[] }>(withQuery('/recipes', {
    page: params.page || 1,
    limit: params.limit || 12,
    includeInactive: true,
    search: params.search,
    mealType: params.mealType,
    cuisine: params.cuisine,
    dietType: params.dietType,
    difficulty: params.difficulty,
    isActive: params.isActive,
    hasVideo: params.hasVideo,
    sortBy: params.sortBy || 'createdAt',
    sortOrder: params.sortOrder || 'DESC',
  }));

  if (Array.isArray(data)) {
    return { recipes: data.map(normalizeRecipe), total: data.length, page: params.page || 1, limit: params.limit || data.length || 10 };
  }

  const nested = (data as { data?: RecipeListResponse | Recipe[] }).data;
  if (Array.isArray(nested)) {
    return { recipes: nested.map(normalizeRecipe), total: nested.length, page: params.page || 1, limit: params.limit || nested.length || 10 };
  }

  const response = (nested && !Array.isArray(nested) ? nested : data) as Partial<RecipeListResponse> & {
    items?: Recipe[];
    results?: Recipe[];
    rows?: Recipe[];
  };
  const recipes = asArray<Recipe>(response.recipes || response.items || response.results || response.rows);
  return {
    recipes: recipes.map(normalizeRecipe),
    total: Number(response.total ?? recipes.length),
    page: Number(response.page ?? params.page ?? 1),
    limit: Number(response.limit ?? params.limit ?? 12),
  };
}

export async function saveRecipe(payload: SaveRecipePayload): Promise<{ ok: boolean } | unknown> {
  if (USE_MOCK_API) {
    const recipes = getMockRecipes();
    const videoUrl = payload.video ? URL.createObjectURL(payload.video) : '';

    const mealType = mockLookups.find((l) => l.id === payload.mealTypeId);
    const cuisine = mockLookups.find((l) => l.id === payload.cuisineId);
    const dietType = mockLookups.find((l) => l.id === payload.dietTypeId);
    const difficultyLevel = mockLookups.find((l) => l.id === payload.difficultyLevelId);

    if (payload.id) {
      const existing = recipes.find((item) => String(item.id) === String(payload.id));
      if (!existing) throw new Error('Recipe not found');
      existing.name = payload.name;
      if (payload.description !== undefined) existing.description = payload.description;
      if (payload.mealTypeId !== undefined) {
        existing.mealTypeId = payload.mealTypeId;
        existing.mealType = mealType ? { id: mealType.id, key: mealType.key, value: mealType.value } : payload.mealTypeId;
      }
      if (payload.cuisineId !== undefined) {
        existing.cuisineId = payload.cuisineId;
        existing.cuisine = cuisine ? { id: cuisine.id, key: cuisine.key, value: cuisine.value } : payload.cuisineId;
      }
      if (payload.dietTypeId !== undefined) {
        existing.dietTypeId = payload.dietTypeId;
        existing.dietType = dietType ? { id: dietType.id, key: dietType.key, value: dietType.value } : payload.dietTypeId;
      }
      if (payload.difficultyLevelId !== undefined) {
        existing.difficultyLevelId = payload.difficultyLevelId;
        existing.difficultyLevel = difficultyLevel ? { id: difficultyLevel.id, key: difficultyLevel.key, value: difficultyLevel.value } : payload.difficultyLevelId;
      }
      if (payload.prepTimeMinutes !== undefined) existing.prepTimeMinutes = Number(payload.prepTimeMinutes);
      if (payload.cookTimeMinutes !== undefined) existing.cookTimeMinutes = Number(payload.cookTimeMinutes);
      if (payload.servings !== undefined) existing.servings = Number(payload.servings);
      if (payload.calories !== undefined) existing.calories = Number(payload.calories);
      if (payload.protein !== undefined) existing.protein = Number(payload.protein);
      if (payload.carbs !== undefined) existing.carbs = Number(payload.carbs);
      if (payload.fat !== undefined) existing.fat = Number(payload.fat);
      if (payload.ingredients !== undefined) existing.ingredients = payload.ingredients as string[];
      if (payload.instructions !== undefined) existing.instructions = payload.instructions;
      if (payload.tips !== undefined) existing.tips = payload.tips;
      if (payload.isActive !== undefined) existing.isActive = payload.isActive;
      if (videoUrl) existing.videoUrl = videoUrl;
      if (payload.deleteVideoUrl) existing.videoUrl = '';
    } else {
      const newId = recipes.length ? Math.max(...recipes.map((item) => Number(item.id))) + 1 : 1;
      recipes.push({
        id: newId,
        name: payload.name,
        description: payload.description,
        mealTypeId: payload.mealTypeId,
        mealType: mealType ? { id: mealType.id, key: mealType.key, value: mealType.value } : payload.mealTypeId,
        cuisineId: payload.cuisineId,
        cuisine: cuisine ? { id: cuisine.id, key: cuisine.key, value: cuisine.value } : payload.cuisineId,
        dietTypeId: payload.dietTypeId,
        dietType: dietType ? { id: dietType.id, key: dietType.key, value: dietType.value } : payload.dietTypeId,
        difficultyLevelId: payload.difficultyLevelId,
        difficultyLevel: difficultyLevel ? { id: difficultyLevel.id, key: difficultyLevel.key, value: difficultyLevel.value } : payload.difficultyLevelId,
        prepTimeMinutes: payload.prepTimeMinutes ? Number(payload.prepTimeMinutes) : undefined,
        cookTimeMinutes: payload.cookTimeMinutes ? Number(payload.cookTimeMinutes) : undefined,
        servings: payload.servings ? Number(payload.servings) : undefined,
        calories: payload.calories ? Number(payload.calories) : undefined,
        protein: payload.protein ? Number(payload.protein) : undefined,
        carbs: payload.carbs ? Number(payload.carbs) : undefined,
        fat: payload.fat ? Number(payload.fat) : undefined,
        ingredients: payload.ingredients,
        instructions: payload.instructions,
        tips: payload.tips || [],
        videoUrl,
        imageUrls: [],
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }

    saveMockRecipes(recipes);
    return { ok: true };
  }

  const isUpdate = Boolean(payload.id);
  const formData = new FormData();

  // ── Helpers ──────────────────────────────────────────────────────────────
  const appendField = (key: string, value: unknown) => {
    if (value !== undefined && value !== null && value !== '') {
      formData.append(key, String(value));
    }
  };

  // ── name is always required (both POST create and PUT update) ────────────
  if (payload.name) {
    formData.append('name', payload.name);
  }

  // Ingredients — only send if provided (non-empty list with at least one named item)
  const hasIngredients = (payload.ingredients || []).some((i) =>
    typeof i === 'object' ? (i as { name?: string }).name?.trim() : String(i).trim(),
  );
  if (!isUpdate || hasIngredients) {
    const ingredientsParsed = (payload.ingredients || []).map((line) => {
      if (line && typeof line === 'object') {
        const qtyVal = parseFloat(String((line as { quantity?: unknown }).quantity));
        return {
          quantity: isNaN(qtyVal) ? 1 : qtyVal,
          unit: (line as { unit?: string }).unit || 'pcs',
          name: ((line as { name?: string }).name || '').trim(),
        };
      }
      const lineStr = String(line || '').trim();
      const regex = /^(\d+(?:\/\d+)?(?:\s+\d+\/\d+)?|\d+\.\d+|\d+)\s*(g|ml|cup|cups|tbsp|tsp|oz|pcs|piece|pieces|slice|slices|can|cans|pinch|pinches|g\b|ml\b)?\s+(.*)$/i;
      const match = lineStr.match(regex);
      if (match) {
        const qtyStr = match[1];
        let quantity = parseFloat(qtyStr);
        if (qtyStr.includes('/')) {
          const parts = qtyStr.split(/\s+/);
          if (parts.length === 2) {
            const intPart = parseFloat(parts[0]);
            const frac = parts[1].split('/');
            quantity = intPart + parseFloat(frac[0]) / parseFloat(frac[1]);
          } else {
            const frac = parts[0].split('/');
            quantity = parseFloat(frac[0]) / parseFloat(frac[1]);
          }
        }
        return {
          quantity: isNaN(quantity) ? 1 : quantity,
          unit: match[2] ? match[2].toLowerCase() : 'pcs',
          name: match[3].trim(),
        };
      }
      return { quantity: 1, unit: 'pcs', name: lineStr };
    });
    formData.append('ingredients', JSON.stringify(ingredientsParsed));
  }

  // Instructions — only send if provided
  const hasInstructions = (payload.instructions || []).some((s) => String(s).trim());
  if (!isUpdate || hasInstructions) {
    formData.append('instructions', JSON.stringify({ steps: payload.instructions || [] }));
  }

  // Optional scalar fields — only appended when non-empty
  appendField('description', payload.description);
  appendField('mealTypeId', payload.mealTypeId);
  appendField('cuisineTypeId', payload.cuisineId);
  appendField('dietTypeId', payload.dietTypeId);
  appendField('difficultyId', payload.difficultyLevelId);
  appendField('prepTime', payload.prepTimeMinutes);
  appendField('cookTime', payload.cookTimeMinutes);
  appendField('servings', payload.servings);
  appendField('calories', payload.calories);
  appendField('protein', payload.protein);
  appendField('carbs', payload.carbs);
  appendField('fat', payload.fat);

  if (payload.isActive !== undefined) {
    formData.append('isActive', String(payload.isActive));
  }

  // Image — only send when a new file is attached or deletion is requested
  if (payload.images && payload.images.length > 0) {
    formData.append('image', payload.images[0]);
  }
  if (payload.deleteImageUrls && payload.deleteImageUrls.length > 0) {
    formData.append('deleteImage', 'true');
  }

  // Video — only send when a new file is attached or deletion is requested
  if (payload.video) {
    formData.append('video', payload.video);
  }
  if (payload.deleteVideoUrl) {
    formData.append('deleteVideo', 'true');
  }

  return request(payload.id ? `/recipes/${payload.id}` : '/recipes', {
    method: payload.id ? 'PUT' : 'POST',
    body: formData,
  });
}

export async function deleteRecipe(id: string | number): Promise<{ ok: boolean } | unknown> {
  if (USE_MOCK_API) {
    saveMockRecipes(getMockRecipes().filter((item) => String(item.id) !== String(id)));
    return { ok: true };
  }
  return request(`/recipes/${id}`, { method: 'DELETE' });
}

export async function setRecipeActive(id: string | number, isActive: boolean): Promise<{ ok: boolean } | unknown> {
  if (USE_MOCK_API) {
    const recipes = getMockRecipes();
    const existing = recipes.find((item) => String(item.id) === String(id));
    if (existing) {
      existing.isActive = isActive;
      saveMockRecipes(recipes);
    }
    return { ok: true };
  }
  const formData = new FormData();
  formData.append('isActive', String(isActive));
  return request(`/recipes/${id}`, { method: 'PATCH', body: formData });
}

// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardOverview(period: DashboardPeriod = 'monthly'): Promise<unknown> {
  if (USE_MOCK_API) return mockDashboard.overview;
  return request(withQuery('/admin/dashboard/overview', { period }));
}

export async function getSignupsTrend(period: DashboardPeriod = 'monthly'): Promise<unknown> {
  if (USE_MOCK_API) return mockDashboard.signupsTrend;
  return request(withQuery('/admin/dashboard/signups-trend', { period }));
}

export async function getPaidVsFree(period: DashboardPeriod = 'monthly'): Promise<unknown> {
  if (USE_MOCK_API) return mockDashboard.paidVsFree;
  return request(withQuery('/admin/dashboard/paid-vs-free', { period }));
}

export async function getRevenue(period: DashboardPeriod = 'monthly'): Promise<unknown> {
  if (USE_MOCK_API) return mockDashboard.revenue;
  return request(withQuery('/admin/dashboard/revenue', { period }));
}
