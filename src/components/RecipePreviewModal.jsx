import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Clock, Users, Flame, Dumbbell, Egg, Wheat, Sparkles } from 'lucide-react';

function refValue(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.value || value.key || null;
}

function formatTime(mins) {
  if (mins === null || mins === undefined || mins === '') return '-';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function RecipePreviewModal({ recipe, onClose }) {
  const videoRef = useRef(null);

  function handleClose() {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
    }
    onClose();
  }

  const mealType = refValue(recipe.mealType);
  const cuisine = refValue(recipe.cuisine);
  const dietType = refValue(recipe.dietType);
  const difficulty = refValue(recipe.difficultyLevel);

  const prepTime = Number(recipe.prepTimeMinutes || recipe.prepTime || 0);
  const cookTime = Number(recipe.cookTimeMinutes || 0);
  const totalTime = prepTime + cookTime;

  return (
    <Dialog open onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="no-scrollbar max-h-[92vh] overflow-y-auto sm:max-w-[800px] p-6">
        <DialogHeader className="pb-2">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            {mealType && <Badge variant="secondary" className="capitalize">{mealType}</Badge>}
            {cuisine && <Badge variant="outline" className="capitalize">{cuisine}</Badge>}
            {dietType && <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium capitalize">{dietType}</Badge>}
            {difficulty && <Badge variant="destructive" className="bg-amber-600 hover:bg-amber-700 text-white capitalize">{difficulty}</Badge>}
          </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">{recipe.name}</DialogTitle>
          <DialogDescription className={recipe.description ? "text-sm text-muted-foreground mt-1.5 leading-relaxed" : "sr-only"}>
            {recipe.description || `Details for recipe ${recipe.name}`}
          </DialogDescription>
        </DialogHeader>

        {/* Media Block (Video / Image Banner) */}
        <div className="my-4 overflow-hidden rounded-xl border bg-black shadow-inner">
          {recipe.videoUrl ? (
            <video
              ref={videoRef}
              controls
              src={recipe.videoUrl}
              poster={recipe.imageUrls?.[0]}
              className="w-full max-h-[360px] aspect-video object-contain"
            />
          ) : recipe.imageUrls?.[0] ? (
            <img
              src={recipe.imageUrls[0]}
              alt={recipe.name}
              className="w-full max-h-[300px] object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-gradient-to-br from-card to-accent">
              <Sparkles className="size-8 opacity-40 mb-2" />
              <span className="text-xs">No media preview available</span>
            </div>
          )}
        </div>

        {/* Info Grid: Prep/Cook Time & Macros */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 my-4">
          <div className="flex items-center gap-2.5 rounded-lg border bg-card/50 p-3">
            <Clock className="size-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Time</p>
              <p className="text-sm font-semibold truncate">
                {totalTime ? formatTime(totalTime) : '-'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border bg-card/50 p-3">
            <Users className="size-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Servings</p>
              <p className="text-sm font-semibold truncate">{recipe.servings || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-lg border bg-card/50 p-3 col-span-2">
            <Flame className="size-5 text-orange-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Energy</p>
              <p className="text-sm font-semibold truncate">
                {recipe.calories ? `${recipe.calories} kcal` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Macros Breakdown */}
        {(recipe.protein || recipe.carbs || recipe.fat) && (
          <div className="grid grid-cols-3 gap-2 p-3 border rounded-lg bg-accent/20 my-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <Dumbbell className="size-3.5 text-blue-400" />
                <span>Protein</span>
              </div>
              <span className="text-base font-bold text-blue-500">
                {recipe.protein ? `${recipe.protein}g` : '-'}
              </span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <Wheat className="size-3.5 text-amber-500" />
                <span>Carbs</span>
              </div>
              <span className="text-base font-bold text-amber-600">
                {recipe.carbs ? `${recipe.carbs}g` : '-'}
              </span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mb-0.5">
                <Egg className="size-3.5 text-rose-400" />
                <span>Fat</span>
              </div>
              <span className="text-base font-bold text-rose-500">
                {recipe.fat ? `${recipe.fat}g` : '-'}
              </span>
            </div>
          </div>
        )}

        <hr className="border-t my-5" />

        {/* Ingredients & Instructions columns */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Ingredients */}
          <div>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="inline-flex size-5.5 items-center justify-center rounded bg-primary/10 text-xs text-primary font-bold">1</span>
              Ingredients
            </h3>
            {recipe.ingredients && recipe.ingredients.length > 0 ? (
              <ul className="space-y-2.5">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-foreground/90 bg-muted/30 hover:bg-muted/50 rounded-lg p-2.5 border border-transparent hover:border-border transition-colors">
                    <input
                      type="checkbox"
                      id={`ing-${i}`}
                      className="mt-0.5 size-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                    />
                    <label htmlFor={`ing-${i}`} className="cursor-pointer select-none leading-relaxed flex-1">
                      {ing}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground italic">No ingredients specified.</p>
            )}
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <span className="inline-flex size-5.5 items-center justify-center rounded bg-primary/10 text-xs text-primary font-bold">2</span>
              Instructions
            </h3>
            {recipe.instructions && recipe.instructions.length > 0 ? (
              <ol className="space-y-3">
                {recipe.instructions.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 bg-card rounded-lg p-3 border hover:shadow-sm transition-all duration-200">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-500">
                      {i + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-foreground/90 pt-0.5">{step}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground italic">No instructions specified.</p>
            )}
          </div>
        </div>

        {/* Tips section if available */}
        {recipe.tips && recipe.tips.length > 0 && (
          <>
            <hr className="border-t my-5" />
            <div>
              <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider mb-2">Tips &amp; Notes</h3>
              <ul className="list-disc pl-5 space-y-1.5 text-sm text-muted-foreground leading-relaxed">
                {recipe.tips.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
