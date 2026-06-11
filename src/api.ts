const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';
const ACCEPT_LANGUAGE = import.meta.env.VITE_ACCEPT_LANGUAGE || 'en';

const STORAGE_KEY = 'gymifo_exercises';
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
    const limit = params.limit || 10;
    const search = params.search?.toLowerCase().trim();
    const all = getMockExercises().filter((exercise) => {
      if (!search) return true;
      return exercise.name.toLowerCase().includes(search);
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
    limit: params.limit || 10,
    search: params.search,
    muscleGroup: params.muscleGroup,
    equipment: params.equipment,
    type: params.type,
    difficulty: params.difficulty,
    bodyPart: params.bodyPart,
    isWarmup: params.isWarmup,
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
    limit: Number(response.limit ?? params.limit ?? 10),
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
    method: payload.id ? 'PATCH' : 'POST',
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
